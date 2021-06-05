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
#include "FlashRequestProxy.h"

FlashRequestProxy::FlashRequestProxy(ICoreWebView2Environment *environment, ICoreWebView2WebResourceRequestedEventArgs *args):
    m_refCount(1),
    m_environment(environment),
    m_args(args),
    m_deferral(),
    m_stream(),
    m_binding(),
    m_mimeType(),
    m_contentType(),
    m_size(0)
{
}

FlashRequestProxy::~FlashRequestProxy()
{
    if (m_deferral != nullptr)
        m_deferral->Complete();
}

HRESULT FlashRequestProxy::Init(IServiceProvider *serviceProvider, WCHAR *uri)
{
    if (FAILED(m_args->GetDeferral(&m_deferral)) || m_deferral == nullptr)
        return E_FAIL;

    DetermineContentType(uri);

    CComPtr<IBindHost> bindHost;
    if (FAILED(serviceProvider->QueryService(IID_IBindHost, &bindHost)))
        return E_FAIL;

    CComPtr<IMoniker> moniker;
    if (FAILED(bindHost->CreateMoniker(uri, this, &moniker, 0)))
        return E_FAIL;

    if (FAILED(moniker->BindToStorage(this, nullptr, IID_IStream, (void**)&m_stream)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::QueryInterface(REFIID riid, void **object)
{
    if (IsEqualIID(riid, IID_IBindStatusCallback))
    {
        AddRef();
        *object = static_cast<IBindStatusCallback*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IStream))
    {
        AddRef();
        *object = static_cast<IStream*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IUnknown))
    {
        AddRef();
        *object = static_cast<IStream*>(this);
        return S_OK;
    }

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE FlashRequestProxy::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE FlashRequestProxy::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::GetObjectParam(LPOLESTR pszKey, IUnknown **ppunk)
{
    if (wcscmp(pszKey, L"_BSCB_Holder_") == 0)
    {
        *ppunk = static_cast<IBindStatusCallback*>(this);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::OnStartBinding(DWORD dwReserved, IBinding *pib)
{
    if (pib == nullptr)
        return E_INVALIDARG;

    m_binding = pib;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::OnProgress(ULONG ulProgress, ULONG ulProgressMax, ULONG ulStatusCode, LPCWSTR szStatusText)
{
    switch (ulStatusCode)
    {
        case BINDSTATUS_MIMETYPEAVAILABLE:
        {
            if (szStatusText == nullptr)
                return E_INVALIDARG;

            m_mimeType = szStatusText;
            break;
        }
        default:
            break;
    }

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::OnStopBinding(HRESULT hresult, LPCWSTR szError)
{
    if (FAILED(hresult) || m_deferral != nullptr)
    {
        if (m_environment == nullptr || m_args == nullptr)
            return E_FAIL;

        if (szError == nullptr)
            szError = L"Internal Server Error";

        CComPtr<ICoreWebView2WebResourceResponse> response;
        if (FAILED(m_environment->CreateWebResourceResponse(nullptr, 500, szError, L"", &response)) || response == nullptr)
            return E_FAIL;

        if (FAILED(m_args->put_Response(response)))
            return E_FAIL;

        m_deferral->Complete();
        m_deferral.Release();
    }

    Release();

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::GetBindInfo(DWORD *grfBINDF, BINDINFO *pbindinfo)
{
    if (grfBINDF == nullptr || pbindinfo == nullptr)
        return E_INVALIDARG;

    *grfBINDF = BINDF_ASYNCHRONOUS | BINDF_ASYNCSTORAGE | BINDF_NO_UI | BINDF_SILENTOPERATION;

    pbindinfo->dwBindVerb = BINDVERB_GET;
    pbindinfo->dwOptions = BINDINFO_OPTIONS_ENABLE_UTF8;
    pbindinfo->dwCodePage = CP_UTF8;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::OnDataAvailable(DWORD grfBSCF, DWORD dwSize, FORMATETC *pformatetc, STGMEDIUM *pstgmed)
{
    if (pformatetc == nullptr || pstgmed == nullptr)
        return E_INVALIDARG;

    if ((grfBSCF & BSCF_LASTDATANOTIFICATION) == 0)
        return S_OK;

    if ((grfBSCF & BSCF_DATAFULLYAVAILABLE) == 0)
        return S_OK;

    if (m_mimeType.Length() == 0)
        return E_FAIL;

    if (m_environment == nullptr || m_args == nullptr || m_deferral == nullptr || m_stream == nullptr)
        return E_FAIL;

    if (pformatetc->cfFormat == CF_TEXT)
    {
        m_size = dwSize - 1;
        m_contentType = m_mimeType;
    }
    else
    {
        m_size = dwSize;
    }

    CComPtr<ICoreWebView2WebResourceResponse> response;
    if (FAILED(m_environment->CreateWebResourceResponse(this, 200, L"OK", nullptr, &response)) || response == nullptr)
        return E_FAIL;

    CComPtr<ICoreWebView2HttpResponseHeaders> headers;
    if (FAILED(response->get_Headers(&headers)) || headers == nullptr)
        return E_FAIL;

    if (FAILED(headers->AppendHeader(L"Content-Type", m_contentType)))
        return E_FAIL;

    if (FAILED(m_args->put_Response(response)))
        return E_FAIL;

    m_deferral->Complete();
    m_deferral.Release();

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequestProxy::Read(void *pv, ULONG cb, ULONG *pcbRead)
{
    if (pv == nullptr || pcbRead == nullptr || m_stream == nullptr)
        return E_INVALIDARG;

    HRESULT hr = m_stream->Read(pv, cb, pcbRead);
    if (SUCCEEDED(hr))
    {
        if (*pcbRead > m_size)
            *pcbRead = m_size;

        m_size -= *pcbRead;
    }

    return hr;
}

HRESULT FlashRequestProxy::DetermineContentType(const WCHAR *uri)
{
    const WCHAR *ext = wcsrchr(uri, L'.');
    if (ext == nullptr)
        return E_FAIL;

    ext++;

    if (_wcsicmp(ext, L"css") == 0)
    {
        m_contentType = L"text/css";
        return S_OK;
    }

    if (_wcsicmp(ext, L"html") == 0)
    {
        m_contentType = L"text/html";
        return S_OK;
    }

    if (_wcsicmp(ext, L"js") == 0)
    {
        m_contentType = L"application/javascript";
        return S_OK;
    }

    if (_wcsicmp(ext, L"png") == 0)
    {
        m_contentType = L"image/png";
        return S_OK;
    }

    if (_wcsicmp(ext, L"swf") == 0)
    {
        m_contentType = L"application/vnd.adobe.flash.movie";
        return S_OK;
    }

    if (_wcsicmp(ext, L"wasm") == 0)
    {
        m_contentType = L"application/wasm";
        return S_OK;
    }

    if (_wcsicmp(ext, L"xml") == 0)
    {
        m_contentType = L"text/xml";
        return S_OK;
    }

    //Log(L"Content type unknown for .%s\n", ext);
    return E_FAIL;
}