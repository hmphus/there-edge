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

extern HINSTANCE g_Instance;

SettingsRequestHandler::SettingsRequestHandler(ICoreWebView2Environment *environment):
    m_refCount(1),
    m_statusCode(500),
    m_reasonPhrase(),
    m_contentType(),
    m_location(),
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

HRESULT SettingsRequestHandler::HandleRequest(const WCHAR *url, ICoreWebView2WebResourceRequestedEventArgs *args)
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

    if (wcscmp(suffix, L"") == 0 && FAILED(HandleSettings()))
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

HRESULT SettingsRequestHandler::HandleSettings()
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

        DWORD size = token1 - data;
        if (size > 0)
            m_content->Write(data, size, nullptr);

        dsize -= size;
        if (dsize == 0)
            break;

        const CHAR *token2 = (CHAR*)memchr(token1 + 1, '@', dsize - 1);
        if (token2 == nullptr)
            break;

        data = token2 + 1;
        size = token2 - token1 + 1;
        dsize -= size;

        if (strncmp(token1, "@home@", size) == 0)
        {
            CComSafeArray<BYTE> url;
            if (GetStartPage(url) == S_OK && url.m_psa != nullptr)
                m_content->Write(url.m_psa->pvData, url.GetCount(), nullptr);
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

HRESULT SettingsRequestHandler::GetStartPage(CComSafeArray<BYTE> &mburl, const WCHAR *path)
{
    if (path == nullptr)
    {
        if (GetStartPage(mburl, L"Software\\There.com\\There\\Edge\\") == S_OK)
            return S_OK;

        if (GetStartPage(mburl, L"Software\\Microsoft\\Internet Explorer\\Main\\") == S_OK)
            return S_OK;

        return S_FALSE;
    }

    WCHAR url[INTERNET_MAX_URL_LENGTH];
    DWORD size = _countof(url);
    if (RegGetValue(HKEY_CURRENT_USER, path, L"Start Page", RRF_RT_REG_SZ, nullptr, &url, &size) == ERROR_SUCCESS)
    {
        size = (size - 1) / sizeof(WCHAR);
        if (size > 0 && wcscmp(url, L"about:blank") != 0 && wcschr(url, L'"') == nullptr)
        {
            DWORD mbsize = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, url, size, nullptr, 0, nullptr, nullptr);
            if (mbsize > 0 && SUCCEEDED(mburl.Create(mbsize)))
                WideCharToMultiByte(CP_UTF8, 0, url, size, (CHAR*)mburl.m_psa->pvData, mbsize, nullptr, nullptr);
        }

        return S_OK;
    }

    return S_FALSE;
}

HRESULT SettingsRequestHandler::SettingsRequestHandler::SetStartPage(WCHAR *url)
{
    HRESULT result = E_FAIL;

    HKEY key;
    if (RegOpenKeyEx(HKEY_CURRENT_USER, L"Software\\There.com\\There", 0, KEY_WRITE, &key) == ERROR_SUCCESS)
    {
        DWORD size = (wcslen(url) + 1) * sizeof(WCHAR);
        result = RegSetKeyValue(key, L"Edge\\", L"Start Page", REG_SZ, (BYTE*)url, size);
        RegCloseKey(key);
    }

    return result;
}