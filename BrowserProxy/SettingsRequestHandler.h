#pragma once

using namespace ATL;

void Log(const WCHAR *format, ...);

class SettingsRequestHandler: public IUnknown
{
public:
    SettingsRequestHandler(ICoreWebView2Environment *environment, const WCHAR *proxyVersion);
    virtual ~SettingsRequestHandler();

    static BOOL Validate(const WCHAR *url);

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

public:
    HRESULT HandleRequest(const WCHAR *url, ICoreWebView2WebResourceRequestedEventArgs *args, HWND wnd);
    HRESULT ProcessMessage(const WCHAR *path, const WCHAR *query);

protected:
    HRESULT HandleRedirect(const WCHAR *location);
    HRESULT HandleSettings(HWND wnd);
    HRESULT WriteHome();
    HRESULT WriteAbout(HWND wnd);
    HRESULT GetStartPage(CHAR *mburl, DWORD &mblength, const WCHAR *path = nullptr);
    HRESULT SetStartPage(const WCHAR *url);
    HRESULT UrlUnescapeSpacesInPlace(WCHAR *text);
    HRESULT WriteEscapedContent(const WCHAR *text);

protected:
    static BOOL CALLBACK InspectThreadWindow(HWND wnd, LPARAM lParam);
    static BOOL CALLBACK InspectChildWindow(HWND wnd, LPARAM lParam);

protected:
    ULONG                                                m_refCount;
    ULONG                                                m_statusCode;
    CComBSTR                                             m_reasonPhrase;
    CComBSTR                                             m_contentType;
    CComBSTR                                             m_location;
    CComBSTR                                             m_proxyVersion;
    CComPtr<ICoreWebView2Environment>                    m_environment;
    CComPtr<IStream>                                     m_content;
};