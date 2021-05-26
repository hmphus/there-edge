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
#include "FlashRequest.h"

FlashRequest::FlashRequest(ICoreWebView2Environment *environment, ICoreWebView2WebResourceRequestedEventArgs *args):
    m_refCount(1),
    m_environment(environment),
    m_args(args),
    m_deferral(),
    m_stream(),
    m_binding()
{
}

FlashRequest::~FlashRequest()
{
    if (m_deferral != nullptr)
        m_deferral->Complete();
}

HRESULT STDMETHODCALLTYPE FlashRequest::Init(IServiceProvider *serviceProvider, WCHAR *uri)
{
    if (FAILED(m_args->GetDeferral(&m_deferral)) || m_deferral == nullptr)
        return E_FAIL;

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

HRESULT STDMETHODCALLTYPE FlashRequest::QueryInterface(REFIID riid, void **object)
{
    if (IsEqualIID(riid, IID_IBindStatusCallback))
    {
        AddRef();
        *object = static_cast<IBindStatusCallback*>(this);
        return S_OK;
    }

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE FlashRequest::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE FlashRequest::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE FlashRequest::GetObjectParam(LPOLESTR pszKey, IUnknown **ppunk)
{
    if (wcscmp(pszKey, L"_BSCB_Holder_") == 0)
    {
        *ppunk = static_cast<IBindStatusCallback*>(this);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE FlashRequest::OnStartBinding(DWORD dwReserved, IBinding *pib)
{
    if (pib == nullptr)
        return E_INVALIDARG;

    m_binding = pib;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequest::OnProgress(ULONG ulProgress, ULONG ulProgressMax, ULONG ulStatusCode, LPCWSTR szStatusText)
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

HRESULT STDMETHODCALLTYPE FlashRequest::OnStopBinding(HRESULT hresult, LPCWSTR szError)
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

HRESULT STDMETHODCALLTYPE FlashRequest::GetBindInfo(DWORD *grfBINDF, BINDINFO *pbindinfo)
{
    if (grfBINDF == nullptr || pbindinfo == nullptr)
        return E_INVALIDARG;

    *grfBINDF = BINDF_ASYNCHRONOUS | BINDF_ASYNCSTORAGE | BINDF_NO_UI | BINDF_SILENTOPERATION;

    pbindinfo->dwBindVerb = BINDVERB_GET;
    pbindinfo->dwOptions = BINDINFO_OPTIONS_ENABLE_UTF8;
    pbindinfo->dwCodePage = CP_UTF8;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashRequest::OnDataAvailable(DWORD grfBSCF, DWORD dwSize, FORMATETC *pformatetc, STGMEDIUM *pstgmed)
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

    CComPtr<ICoreWebView2WebResourceResponse> response;
    if (FAILED(m_environment->CreateWebResourceResponse(m_stream, 200, L"OK", L"", &response)) || response == nullptr)
        return E_FAIL;

    CComPtr<ICoreWebView2HttpResponseHeaders> headers;
    if (FAILED(response->get_Headers(&headers)) || headers == nullptr)
        return E_FAIL;

    /* FIXME: The returned content type isn't correct
    if (FAILED(headers->AppendHeader(L"Content-Type", m_mimeType)))
        return E_FAIL;
    */

    if (FAILED(m_args->put_Response(response)))
        return E_FAIL;

    m_deferral->Complete();
    m_deferral.Release();

    return S_OK;
}