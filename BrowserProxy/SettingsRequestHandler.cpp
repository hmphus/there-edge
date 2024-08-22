#define _ATL_APARTMENT_THREADED
#define _ATL_NO_AUTOMATIC_NAMESPACE
#define _ATL_CSTRING_EXPLICIT_CONSTRUCTORS
#define ATL_NO_ASSERT_ON_DESTROY_NONEXISTENT_WINDOW

#pragma warning (disable:26812)
#pragma warning (disable:28251)

#include "platform.h"
#include "resource.h"
#include "shlwapi.h"
#include "wininet.h"
#include "atlbase.h"
#include "atlcom.h"
#include "atlctl.h"
#include "atlstr.h"
#include "atlsafe.h"
#include "WebView2.h"
#include "SettingsRequestHandler.h"

#define WM_FLASHPROXY_GET_ABOUT          (WM_USER + 5)

extern HINSTANCE g_Instance;

SettingsRequestHandler::SettingsRequestHandler(ICoreWebView2Environment *environment, const WCHAR *proxyVersion):
    m_refCount(1),
    m_statusCode(500),
    m_reasonPhrase(),
    m_contentType(),
    m_location(),
    m_proxyVersion(proxyVersion),
    m_environment(environment),
    m_content()
{
}

SettingsRequestHandler::~SettingsRequestHandler()
{
}

BOOL SettingsRequestHandler::Validate(const WCHAR *url)
{
    WCHAR host[40] = {0};
    WCHAR path[1000] = {0};
    URL_COMPONENTS components;
    ZeroMemory(&components, sizeof(components));
    components.dwStructSize = sizeof(components);
    components.lpszHostName = host;
    components.dwHostNameLength = _countof(host);
    components.lpszUrlPath = path;
    components.dwUrlPathLength = _countof(path);

    if (!InternetCrackUrl(url, 0, ICU_DECODE, &components))
        return false;

    if (wcscmp(host, L"webapps.prod.there.com") != 0)
        return false;

    WCHAR *query = wcschr(path, L'?');
    if (query != nullptr)
        *query = 0;

    if (wcsncmp(path, L"/edge", 5) != 0)
        return false;

    return true;
}

HRESULT STDMETHODCALLTYPE SettingsRequestHandler::QueryInterface(REFIID riid, void **object)
{
    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE SettingsRequestHandler::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE SettingsRequestHandler::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT SettingsRequestHandler::HandleRequest(const WCHAR *url, ICoreWebView2WebResourceRequestedEventArgs *args, HWND wnd)
{
    WCHAR path[1000] = {0};
    URL_COMPONENTS components;
    ZeroMemory(&components, sizeof(components));
    components.dwStructSize = sizeof(components);
    components.lpszUrlPath = path;
    components.dwUrlPathLength = _countof(path);

    if (!InternetCrackUrl(url, 0, ICU_DECODE, &components))
        return E_FAIL;

    WCHAR *query = wcschr(path, L'?');
    if (query != nullptr)
        *query = 0;

    if (m_content != nullptr)
        m_content.Release();

    m_statusCode = 404;
    m_reasonPhrase = L"Not Found";
    m_contentType = L"";
    m_location = L"";

    const WCHAR *suffix = path + 5;

    if (wcscmp(suffix, L"/") == 0 && FAILED(HandleRedirect(L"/edge")))
        return E_FAIL;

    if (wcscmp(suffix, L"") == 0 && FAILED(HandleSettings(wnd)))
        return E_FAIL;

    CComPtr<ICoreWebView2WebResourceResponse> response;
    if (FAILED(m_environment->CreateWebResourceResponse(m_content, m_statusCode, m_reasonPhrase, L"", &response)) || response == nullptr)
        return E_FAIL;

    CComPtr<ICoreWebView2HttpResponseHeaders> headers;
    if (FAILED(response->get_Headers(&headers)) || headers == nullptr)
        return E_FAIL;

    if (m_contentType.Length() > 0 && FAILED(headers->AppendHeader(L"Content-Type", m_contentType)))
        return E_FAIL;

    if (m_location.Length() > 0 && FAILED(headers->AppendHeader(L"Location", m_location)))
        return E_FAIL;

    if (FAILED(args->put_Response(response)))
        return E_FAIL;

    return S_OK;
}

HRESULT SettingsRequestHandler::HandleRedirect(const WCHAR *location)
{
    m_statusCode = 301;
    m_reasonPhrase = L"Moved Permanently";
    m_location = location;

    return S_OK;
}

HRESULT SettingsRequestHandler::HandleSettings(HWND wnd)
{
    HRSRC source = FindResource(g_Instance, MAKEINTRESOURCE(IDR_SETTINGS), MAKEINTRESOURCE(TEXTFILE));
    if (source == nullptr)
        return E_FAIL;

    DWORD dsize = SizeofResource(g_Instance, source);
    if (dsize == 0)
        return E_FAIL;

    HGLOBAL resource = LoadResource(g_Instance, source);
    if (resource == nullptr)
        return E_FAIL;

    const CHAR *data = static_cast<CHAR*>(LockResource(resource));
    if (data == nullptr)
        return E_FAIL;

    m_content = SHCreateMemStream(nullptr, 0);
    if (m_content == nullptr)
        return E_FAIL;

    while (dsize > 0)
    {
        const CHAR *token1 = (CHAR*)memchr(data, '@', dsize);
        if (token1 == nullptr)
        {
            m_content->Write(data, dsize, nullptr);
            break;
        }

        DWORD size = (DWORD)(token1 - data);
        if (size > 0)
            m_content->Write(data, size, nullptr);

        dsize -= size;
        if (dsize == 0)
            break;

        const CHAR *token2 = (CHAR*)memchr(token1 + 1, '@', dsize - 1);
        if (token2 == nullptr)
            break;

        data = token2 + 1;
        size = (DWORD)(token2 - token1 + 1);
        dsize -= size;

        if (strncmp(token1, "@home@", size) == 0)
        {
            WriteHome();
            continue;
        }

        if (strncmp(token1, "@about@", size) == 0)
        {
            WriteAbout(wnd);
            continue;
        }
    }

    m_statusCode = 200;
    m_reasonPhrase = L"OK";
    m_contentType = L"text/html";

    return S_OK;
}

HRESULT SettingsRequestHandler::ProcessMessage(const WCHAR *path, const WCHAR *query)
{
    if (_wcsicmp(path, L"put") == 0)
    {
        WCHAR key[INTERNET_MAX_URL_LENGTH + 10] = {0};
        if (wcscpy_s(key, query) != 0)
            return E_FAIL;

        WCHAR *value = wcschr(key, L'=');
        if (value == nullptr)
            return E_FAIL;

        *value = 0;
        value++;

        if (_wcsicmp(key, L"home") == 0)
        {
            if (FAILED(SetStartPage(value)))
                return E_FAIL;

            return S_OK;
        }

        return E_FAIL;
    }

    return E_FAIL;
}

HRESULT SettingsRequestHandler::WriteHome()
{
    CHAR mburl[INTERNET_MAX_URL_LENGTH];
    DWORD mblength;
    if (GetStartPage(mburl, mblength) == S_OK && mblength > 0)
        m_content->Write(mburl, mblength, nullptr);

    return S_OK;
}

HRESULT SettingsRequestHandler::WriteAbout(HWND wnd)
{
    CComSafeArray<BSTR> entries;
    EnumThreadWindows(GetWindowThreadProcessId(wnd, nullptr), InspectThreadWindow, (LPARAM)&entries);

    for (LONG i = 0; i < (LONG)entries.GetCount(); ++i)
    {
        CComBSTR btitle;
        CComBSTR bversion;
        CComBSTR bauthor;
        CComBSTR btype;
        DWORD type = 0;

        WCHAR *query = entries.GetAt(i);
        while (query != nullptr && query[0] != 0)
        {
            WCHAR key[INTERNET_MAX_URL_LENGTH] = {0};
            WCHAR *amp = wcschr(query, L'&');
            if (amp != nullptr)
            {
                wcsncat_s(key, query, amp - query);
                query = amp + 1;
            }
            else
            {
                wcscpy_s(key, query);
                query = nullptr;
            }

            WCHAR *value;
            WCHAR *equal = wcschr(key, L'=');
            if (equal != nullptr)
            {
                *equal = 0;
                value = equal + 1;
            }
            else
            {
                value = L"";
            }

            if (FAILED(UrlUnescapeSpacesInPlace(value)))
                continue;

            if (FAILED(UrlUnescapeInPlace(value, 0)))
                continue;

            if (wcscmp(key, L"title") == 0)
                btitle = value;
            else if (wcscmp(key, L"version") == 0)
                bversion = value;
            else if (wcscmp(key, L"author") == 0)
                bauthor = value;
            else if (wcscmp(key, L"type") == 0)
                type = _wtoi(value);
        }

        if (type == 2)
            btype = L"Legacy";
        else if (type == 1)
            btype = L"Custom";
        else
        {
            bversion = m_proxyVersion;
            bauthor = L"Hmph!";
            btype = L"Standard";
        }

        m_content->Write("<tr><td>", 8, nullptr);
        WriteEscapedContent(btitle);
        m_content->Write("</td><td>", 9, nullptr);
        WriteEscapedContent(btype);
        m_content->Write("</td><td>", 9, nullptr);
        WriteEscapedContent(bversion);
        m_content->Write("</td><td>", 9, nullptr);
        WriteEscapedContent(bauthor);
        m_content->Write("</td></tr>\n", 11, nullptr);
    }

    return S_OK;
}

HRESULT SettingsRequestHandler::GetStartPage(CHAR *mburl, DWORD &mblength, const WCHAR *path)
{
    if (path == nullptr)
    {
        if (GetStartPage(mburl, mblength, L"Software\\There.com\\There\\Edge\\") == S_OK)
            return S_OK;

        if (GetStartPage(mburl, mblength, L"Software\\Microsoft\\Internet Explorer\\Main\\") == S_OK)
            return S_OK;

        return S_FALSE;
    }

    WCHAR url[INTERNET_MAX_URL_LENGTH];
    DWORD length = _countof(url);
    if (RegGetValue(HKEY_CURRENT_USER, path, L"Start Page", RRF_RT_REG_SZ, nullptr, &url, &length) == ERROR_SUCCESS)
    {
        length = (length - 1) / sizeof(WCHAR);
        if (length > 0 && wcscmp(url, L"about:blank") != 0 && wcschr(url, L'"') == nullptr)
            mblength = WideCharToMultiByte(CP_UTF8, 0, url, length, mburl, mblength, nullptr, nullptr);
        else
            mblength = 0;

        return S_OK;
    }

    return S_FALSE;
}

HRESULT SettingsRequestHandler::SettingsRequestHandler::SetStartPage(const WCHAR *url)
{
    HRESULT result = E_FAIL;

    HKEY key;
    if (RegOpenKeyEx(HKEY_CURRENT_USER, L"Software\\There.com\\There", 0, KEY_WRITE, &key) == ERROR_SUCCESS)
    {
        DWORD length = (DWORD)((wcslen(url) + 1) * sizeof(WCHAR));
        result = RegSetKeyValue(key, L"Edge\\", L"Start Page", REG_SZ, (BYTE*)url, length);
        RegCloseKey(key);
    }

    return result;
}

HRESULT SettingsRequestHandler::UrlUnescapeSpacesInPlace(WCHAR *text)
{
    for (DWORD i = 0; text[i] != 0;i++)
    {
        if (text[i] == L'+')
            text[i] = L' ';
    }

    return S_OK;
}

HRESULT SettingsRequestHandler::WriteEscapedContent(const WCHAR *text)
{
    WCHAR etext[250];
    DWORD elength = _countof(etext);
    {
        DWORD t, e;
        for (t = 0, e = 0; text[t] != 0 && e < elength; t++, e++)
        {
            if (text[t] == L'&')
            {
                if (e + 5 > elength)
                    break;

                etext[e++] = L'&';
                etext[e++] = L'a';
                etext[e++] = L'm';
                etext[e++] = L'p';
                etext[e] = L';';
                continue;
            }

            if (text[t] == L'<')
            {
                if (e + 4 > elength)
                    break;

                etext[e++] = L'&';
                etext[e++] = L'l';
                etext[e++] = L't';
                etext[e] = L';';
                continue;
            }

            if (text[t] == L'>')
            {
                if (e + 4 > elength)
                    break;

                etext[e++] = L'&';
                etext[e++] = L'g';
                etext[e++] = L't';
                etext[e] = L';';
                continue;
            }

            etext[e] = text[t];
        }
        elength = e;
    }

    CHAR mbtext[250];
    DWORD mblength = WideCharToMultiByte(CP_UTF8, 0, etext, elength, mbtext, _countof(mbtext), nullptr, nullptr);

    return m_content->Write(mbtext, mblength, nullptr);
}

BOOL CALLBACK SettingsRequestHandler::InspectThreadWindow(HWND wnd, LPARAM lParam)
{
    WCHAR name[100];
    if (GetClassName(wnd, name, _countof(name)) > 0)
    {
        if (wcscmp(name, L"ThereTopLevelMdiWindowClass") == 0)
        {
            EnumChildWindows(wnd, InspectChildWindow, lParam);
            return false;
        }
    }

    return true;
}

BOOL CALLBACK SettingsRequestHandler::InspectChildWindow(HWND wnd, LPARAM lParam)
{
    WCHAR name[100];
    if (GetClassName(wnd, name, _countof(name)) > 0)
    {
        if (wcscmp(name, L"ThereEdgeFlashProxy") == 0)
        {
            WCHAR query[INTERNET_MAX_URL_LENGTH];
            if (SendMessage(wnd, WM_FLASHPROXY_GET_ABOUT, _countof(query), (LPARAM)query) > 0)
            {
                CComSafeArray<BSTR> &entries = *static_cast<CComSafeArray<BSTR>*>((void*)lParam);
                entries.Add(query);
            }
        }
    }

    return true;
}