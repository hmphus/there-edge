#pragma once

using namespace ATL;

void Log(const WCHAR *format, ...);

class SettingsRequestHandler: public IUnknown
{
public:
    SettingsRequestHandler(ICoreWebView2Environment *environment);
    virtual ~SettingsRequestHandler();

    static BOOL Validate(const WCHAR *url);

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

public:
    HRESULT HandleRequest(const WCHAR *url, ICoreWebView2WebResourceRequestedEventArgs *args);
    HRESULT ProcessMessage(const WCHAR *path, const WCHAR *query);

protected:
    HRESULT HandleRedirect(const WCHAR *location);
    HRESULT HandleSettings();
    HRESULT GetStartPage(CComSafeArray<BYTE> &mburl, const WCHAR *path = nullptr);
    HRESULT SetStartPage(WCHAR *url);

protected:
    ULONG                                                m_refCount;
    ULONG                                                m_statusCode;
    CComBSTR                                             m_reasonPhrase;
    CComBSTR                                             m_contentType;
    CComBSTR                                             m_location;
    CComPtr<ICoreWebView2Environment>                    m_environment;
    CComPtr<IStream>                                     m_content;
};