#pragma once

using namespace ATL;

void Log(const WCHAR *format, ...);

class FlashRequest: public IBindCtx,
                    public IBindStatusCallback
{
public:
    FlashRequest(ICoreWebView2Environment *environment, ICoreWebView2WebResourceRequestedEventArgs *args);
    virtual ~FlashRequest();

    HRESULT STDMETHODCALLTYPE Init(IServiceProvider *serviceProvider, WCHAR *uri);

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

protected:
    virtual HRESULT STDMETHODCALLTYPE RegisterObjectBound(IUnknown *punk) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE RevokeObjectBound(IUnknown *punk) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE ReleaseBoundObjects() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetBindOptions(BIND_OPTS *pbindopts) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetBindOptions(BIND_OPTS *pbindopts) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetRunningObjectTable(IRunningObjectTable **pprot) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE RegisterObjectParam(LPOLESTR pszKey, IUnknown *punk) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetObjectParam(LPOLESTR pszKey, IUnknown **ppunk) override;
    virtual HRESULT STDMETHODCALLTYPE EnumObjectParam(IEnumString **ppenum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE RevokeObjectParam(LPOLESTR pszKey) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE OnStartBinding(DWORD dwReserved, IBinding *pib) override;
    virtual HRESULT STDMETHODCALLTYPE GetPriority(LONG *pnPriority) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE OnLowResource(DWORD reserved) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE OnProgress(ULONG ulProgress, ULONG ulProgressMax, ULONG ulStatusCode, LPCWSTR szStatusText) override;
    virtual HRESULT STDMETHODCALLTYPE OnStopBinding(HRESULT hresult, LPCWSTR szError) override;
    virtual HRESULT STDMETHODCALLTYPE GetBindInfo(DWORD *grfBINDF, BINDINFO *pbindinfo) override;
    virtual HRESULT STDMETHODCALLTYPE OnDataAvailable(DWORD grfBSCF, DWORD dwSize, FORMATETC *pformatetc, STGMEDIUM *pstgmed) override;
    virtual HRESULT STDMETHODCALLTYPE OnObjectAvailable(REFIID riid, IUnknown *punk) override {return E_NOTIMPL;}

protected:
    ULONG                                                m_refCount;
    CComPtr<ICoreWebView2Environment>                    m_environment;
    CComPtr<ICoreWebView2WebResourceRequestedEventArgs>  m_args;
    CComPtr<ICoreWebView2Deferral>                       m_deferral;
    CComPtr<IStream>                                     m_stream;
    CComPtr<IBinding>                                    m_binding;
    CComBSTR                                             m_mimeType;
};