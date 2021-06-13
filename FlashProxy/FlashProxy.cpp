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
#include "ocmm.h"
#include "wrl.h"
#include "WebView2.h"
#include "FlashRequestProxy.h"
#include "FlashProxy_i.h"
#include "FlashProxy.h"

FlashProxyModule g_AtlModule;
WCHAR FlashProxyModule::g_WindowClassName[] = L"ThereEdgeFlashProxy";

void Log(const WCHAR *format, ...)
{
#ifdef THERE_LOGGING
    va_list args;
    va_start(args, format);

    WCHAR buff[1000];
    _vsnwprintf_s(buff, _countof(buff), format, args);

    FILE *file = nullptr;
    if (fopen_s(&file, "Debug.log", "a") == 0)
    {
        vfwprintf_s(file, format, args);
        fflush(file);
        fclose(file);
    }

    va_end(args);
#endif
}

extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID lpReserved)
{
    return g_AtlModule.DllMain(dwReason, lpReserved);
}

__control_entrypoint(DllExport)
STDAPI DllCanUnloadNow()
{
    return g_AtlModule.DllCanUnloadNow();
}

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID *ppv)
{
    if (IsEqualIID(riid, IID_IClassFactory))
    {
        g_AtlModule.AddRef();
        *ppv = static_cast<IClassFactory*>(&g_AtlModule);
        return S_OK;
    }

    return g_AtlModule.DllGetClassObject(rclsid, riid, ppv);
}

STDAPI DllRegisterServer()
{
    return g_AtlModule.DllRegisterServer();
}

STDAPI DllUnregisterServer()
{
    return g_AtlModule.DllUnregisterServer();
}

STDAPI DllInstall(BOOL bInstall, _In_opt_ LPCWSTR pszCmdLine)
{
    HRESULT hr = E_FAIL;

    if (pszCmdLine != nullptr)
    {
        if (_wcsnicmp(pszCmdLine, L"user", 4) == 0)
            ATL::AtlSetPerUserRegistration(true);
    }

    if (bInstall)
    {
        hr = DllRegisterServer();
        if (FAILED(hr))
            DllUnregisterServer();
    }
    else
    {
        hr = DllUnregisterServer();
    }

    return hr;
}

FlashProxyModule::FlashProxyModule():
    m_refCount(1),
    m_qaContainer(),
    m_qaControl(),
    m_pos(),
    m_size(),
    m_wnd(nullptr),
    m_url(),
    m_variables(),
    m_flashEvents(),
    m_unknownContext(),
    m_unknownOuter(),
    m_serviceProvider(),
    m_inplaceSite(),
    m_timer(),
    m_environment(),
    m_controller(),
    m_view(),
    m_visibilityCount(0),
    m_timerCookie(),
    m_webMessageReceivedToken(),
    m_webResourceRequestedToken(),
    m_navigationCompletedToken(),
    m_ready(false),
    m_visible(false)
{
    WNDCLASSEX childClass = {0};
    childClass.cbSize = sizeof(WNDCLASSEX);
    childClass.style = CS_HREDRAW | CS_VREDRAW | CS_DBLCLKS;
    childClass.lpfnWndProc = DefWindowProc;
    childClass.cbClsExtra = 0;
    childClass.cbWndExtra = 0;
    childClass.hInstance = GetModuleHandle(nullptr);
    childClass.hIcon = nullptr;
    childClass.hIconSm = nullptr;
    childClass.hCursor = LoadCursor(nullptr, IDC_ARROW);
    childClass.hbrBackground = nullptr;
    childClass.lpszMenuName = nullptr;
    childClass.lpszClassName = g_WindowClassName;
    RegisterClassEx(&childClass);
}

FlashProxyModule::~FlashProxyModule()
{
    if (m_timer != nullptr && m_timerCookie > 0)
        m_timer->Unadvise(m_timerCookie);

    if (m_view != nullptr)
    {
        m_view->remove_WebMessageReceived(m_webMessageReceivedToken);
        m_view->remove_WebResourceRequested(m_webResourceRequestedToken);
        m_view->remove_NavigationCompleted(m_navigationCompletedToken);
    }

    if (m_controller != nullptr)
        m_controller->Close();

    if (m_wnd != nullptr)
        DestroyWindow(m_wnd);
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::QueryInterface(REFIID riid, void **object)
{
    if (IsEqualIID(riid, IID_IClassFactory))
    {
        AddRef();
        *object = static_cast<IClassFactory*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IClassFactoryEx))
    {
        AddRef();
        *object = static_cast<IClassFactoryEx*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IQuickActivate))
    {
        AddRef();
        *object = static_cast<IQuickActivate*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IConnectionPointContainer))
    {
        AddRef();
        *object = static_cast<IConnectionPointContainer*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IOleObject))
    {
        AddRef();
        *object = static_cast<IOleObject*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IOleInPlaceObject))
    {
        AddRef();
        *object = static_cast<IOleInPlaceObject*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IOleInPlaceObjectWindowless))
    {
        AddRef();
        *object = static_cast<IOleInPlaceObjectWindowless*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IViewObjectEx))
    {
        AddRef();
        *object = static_cast<IViewObjectEx*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_ISupportErrorInfo))
    {
        AddRef();
        *object = static_cast<ISupportErrorInfo*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IDispatch))
    {
        AddRef();
        *object = static_cast<IDispatch*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IThereEdgeShockwaveFlash))
    {
        AddRef();
        *object = static_cast<IThereEdgeShockwaveFlash*>(this);
        return S_OK;
    }

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE FlashProxyModule::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE FlashProxyModule::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv)
{
    if (IsEqualIID(riid, IID_IQuickActivate))
    {
        auto module = new FlashProxyModule();
        if (module == nullptr)
            return E_FAIL;

        *ppv = static_cast<IQuickActivate*>(module);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::CreateInstanceWithContext(IUnknown *punkContext, IUnknown *punkOuter, REFIID riid, void **ppv)
{
    if (IsEqualIID(riid, IID_IUnknown))
    {
        auto module = new FlashProxyModule();
        if (module == nullptr)
            return E_FAIL;

        module->m_unknownContext = punkContext;
        module->m_unknownOuter = punkOuter;

        *ppv = static_cast<IClassFactoryEx*>(module);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::LockServer(BOOL fLock)
{
    if (fLock)
        m_nLockCnt++;
    else
        m_nLockCnt--;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::QuickActivate(QACONTAINER *pQaContainer, QACONTROL *pQaControl)
{
    m_qaContainer = *pQaContainer;
    m_qaControl = *pQaControl;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::SetContentExtent(LPSIZEL pSizel)
{
    if (pSizel != nullptr)
        SetSize(*pSizel);

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetContentExtent(LPSIZEL pSizel)
{
    if (pSizel != nullptr)
        *pSizel = m_size;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP)
{
    if (IsEqualIID(riid, DIID_IThereEdgeShockwaveFlashEvents))
    {
        AddRef();
        *ppCP = static_cast<IConnectionPoint*>(this);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetConnectionInterface(IID *pIID)
{
    *pIID = DIID_IThereEdgeShockwaveFlashEvents;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetConnectionPointContainer(IConnectionPointContainer **ppCPC)
{
    AddRef();
    *ppCPC = static_cast<IConnectionPointContainer*>(this);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Advise(IUnknown *pUnkSink, DWORD *pdwCookie)
{
    if (pUnkSink == nullptr || pdwCookie == nullptr)
        return E_INVALIDARG;

    if (SUCCEEDED(pUnkSink->QueryInterface(&m_flashEvents)))
    {
        *pdwCookie = (DWORD)&m_flashEvents;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Unadvise(DWORD dwCookie)
{
    if (dwCookie == (DWORD)&m_flashEvents && m_flashEvents != nullptr)
    {
        m_flashEvents.Release();
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Close(DWORD dwSaveOption)
{
    m_ready = false;

    if (m_timer != nullptr && m_timerCookie > 0)
    {
        m_timer->Unadvise(m_timerCookie);
        m_timerCookie = 0;
    }

    if (m_controller != nullptr)
        m_controller->Close();

    Release();
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect)
{
    switch (iVerb)
    {
        case OLEIVERB_INPLACEACTIVATE:
        {
            if (m_wnd != nullptr)
                return S_OK;

            if (m_environment != nullptr)
                return S_OK;

            if (pActiveSite == nullptr)
                return E_INVALIDARG;

            if (FAILED(pActiveSite->QueryInterface(&m_serviceProvider)))
                return E_FAIL;

            if (FAILED(pActiveSite->QueryInterface(&m_inplaceSite)))
                return E_FAIL;

            CComPtr<ITimerService> timerService;
            if (FAILED(pActiveSite->QueryInterface(&timerService)))
                return E_FAIL;

            if (FAILED(timerService->CreateTimer(nullptr, &m_timer)))
                return E_FAIL;

            VARIANT timeMin;
            if (FAILED(m_timer->GetTime(&timeMin)) || timeMin.vt != VT_I4)
                return E_FAIL;

            VARIANT timeMax;
            timeMax.vt = VT_I4;
            timeMax.lVal = 0;
            VARIANT timeInterval;
            timeInterval.vt = VT_I4;
            timeInterval.lVal = 100;
            timeMin.lVal += timeInterval.lVal;
            if (FAILED(m_timer->Advise(timeMin, timeMax, timeInterval, 0, static_cast<ITimerSink*>(this), &m_timerCookie)))
                return E_FAIL;

            if (lprcPosRect == nullptr)
                return E_INVALIDARG;

            SetRect(*lprcPosRect);

            if (hwndParent == nullptr)
                return E_FAIL;

            RECT bounds;
            GetClientRect(hwndParent, &bounds);

            WCHAR value[25];
            _ltow_s(bounds.right - bounds.left, value, _countof(value), 10);
            SetVariable(L"There_WindowWidth", value);
            _ltow_s(bounds.bottom - bounds.top, value, _countof(value), 10);
            SetVariable(L"There_WindowHeight", value);

            m_wnd = CreateWindowEx(WS_EX_TRANSPARENT, g_WindowClassName, L"",
                                   WS_CHILD | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
                                   m_pos.cx, m_pos.cy, m_size.cx, m_size.cy,
                                   hwndParent, nullptr, GetModuleHandle(nullptr), nullptr);
            if (m_wnd == nullptr)
                return E_FAIL;

            if (FAILED(CreateCoreWebView2Environment(this)))
                return E_FAIL;

            return S_OK;
        }
        default:
            return E_NOTIMPL;
    }
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetWindow(HWND *phwnd)
{
    if (phwnd == nullptr)
        return E_INVALIDARG;

    *phwnd = m_wnd;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect)
{
    if (lprcPosRect == nullptr || lprcClipRect == nullptr)
        return E_INVALIDARG;

    SetRect(*lprcClipRect);

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                 HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                 BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    // WebView2 doesn't currently support offscreen rendering, which is how the Flash control works.
    // Additional work is required for positioning and visibility, which would normally be taken care of by the client's renderer.
    // See https://github.com/MicrosoftEdge/WebView2Feedback/issues/20 for details.

    if (m_ready)
    {
        m_visibilityCount = 3;
        SetVisibility(true);
    }

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    //Log(L"QueryHitPoint\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult)
{
    //Log(L"QueryHitRect\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::OnTimer(VARIANT vtimeAdvise)
{
    if (m_ready)
    {
        if (m_visibilityCount > 0)
        {
            m_visibilityCount--;
            if (m_visibilityCount == 0)
                SetVisibility(false);
        }

        RECT rect;
        rect.left = m_pos.cx;
        rect.top = m_pos.cy;
        rect.right = m_pos.cx + m_size.cx;
        rect.bottom = m_pos.cy + m_size.cy;
        m_inplaceSite->InvalidateRect(&rect, false);
    }

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::put_Movie(BSTR pVal)
{
    if (m_url.Length() > 0)
        return E_FAIL;

    LONG length = (LONG)wcslen(pVal) - 4;
    if (length < 0)
        return E_FAIL;

    if (wcscmp(pVal + length, L".swf") != 0)
        return E_FAIL;

    CComBSTR url;
    if (FAILED(url.Append(pVal, length)) || FAILED(url.Append(L".html")))
        return E_FAIL;

    m_url = url;

    if (FAILED(Navigate()))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::put_WMode(BSTR pVal)
{
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::SetVariable(BSTR name, BSTR value)
{
    CComBSTR escName;
    if (FAILED(Encode(name, escName)))
        return E_FAIL;

    CComBSTR escValue;
    if (FAILED(Encode(value, escValue)))
        return E_FAIL;

    CComBSTR uri;
    if (FAILED(uri.Append(L"setVariable?name=")) ||
        FAILED(uri.Append(escName)) ||
        FAILED(uri.Append(L"&value=")) ||
        FAILED(uri.Append(escValue)))
        return E_FAIL;

    if (FAILED(m_variables.Add(uri)))
        return E_FAIL;

    if (FAILED(SendVariables()))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Invoke(HRESULT errorCode, ICoreWebView2Environment *environment)
{
    if (environment == nullptr)
        return E_INVALIDARG;

    m_environment = environment;
    m_environment->CreateCoreWebView2Controller(m_wnd, this);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Invoke(HRESULT errorCode, ICoreWebView2Controller *controller)
{
    if (controller == nullptr)
        return E_INVALIDARG;

    if (FAILED(controller->QueryInterface(&m_controller)) || m_controller == nullptr)
        return E_FAIL;

    if (FAILED(m_controller->get_CoreWebView2(&m_view)) || m_view == nullptr)
        return E_FAIL;

    CComPtr<ICoreWebView2Settings> settings;
    if (FAILED(m_view->get_Settings(&settings)) || settings == nullptr)
        return E_FAIL;

#ifndef THERE_DEVTOOLS
    settings->put_AreDevToolsEnabled(false);
#endif
    settings->put_AreDefaultContextMenusEnabled(false);
    settings->put_AreDefaultScriptDialogsEnabled(false);
    settings->put_IsBuiltInErrorPageEnabled(false);
    settings->put_IsStatusBarEnabled(false);
    settings->put_IsZoomControlEnabled(false);
    settings->put_AreHostObjectsAllowed(false);
    settings->put_IsScriptEnabled(true);
    settings->put_IsWebMessageEnabled(true);

    RECT bounds;
    GetClientRect(m_wnd, &bounds);
    m_controller->put_Bounds(bounds);

    COREWEBVIEW2_COLOR color = {0, 0, 0, 0};
    m_controller->put_DefaultBackgroundColor(color);

    m_view->AddWebResourceRequestedFilter(L"http://127.0.0.1:9999/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
    m_view->AddWebResourceRequestedFilter(L"http://localhost:9999/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);

    m_view->add_WebMessageReceived(Callback<ICoreWebView2WebMessageReceivedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2WebMessageReceivedEventArgs *args) -> HRESULT {
            return OnWebMessageReceived(sender, args);
        }
    ).Get(), &m_webMessageReceivedToken);

    m_view->add_WebResourceRequested(Callback<ICoreWebView2WebResourceRequestedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2WebResourceRequestedEventArgs *args) -> HRESULT {
            return OnWebResourceRequested(sender, args);
        }
    ).Get(), &m_webResourceRequestedToken);

    m_view->add_NavigationCompleted(Callback<ICoreWebView2NavigationCompletedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args) -> HRESULT {
            return OnNavigationCompleted(sender, args);
        }
    ).Get(), &m_navigationCompletedToken);

    if (FAILED(Navigate()))
        return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::OnWebMessageReceived(ICoreWebView2 *sender, ICoreWebView2WebMessageReceivedEventArgs *args)
{
    if (sender == nullptr || args == nullptr)
        return E_INVALIDARG;

    CComBSTR bcommand;
    CComBSTR bquery;
    {
        WCHAR *command = nullptr;
        if (FAILED(args->TryGetWebMessageAsString(&command)) || command == nullptr)
            return E_FAIL;

        WCHAR *query = wcschr(command, L'?');
        if (query != nullptr)
        {
            *query = 0;
             query++;
        }
        else
        {
            query = command + wcslen(command);
        }

        bcommand = command;
        bquery = query;
        CoTaskMemFree(command);
    }

#ifdef THERE_DEVTOOLS
    if (_wcsicmp(bcommand, L"devtools") == 0)
    {
        if (sender != nullptr)
            sender->OpenDevToolsWindow();

        return S_OK;
    }
#endif

    if (_wcsicmp(bcommand, L"beginDragWindow") == 0)
    {
        if (m_wnd != nullptr)
        {
            ReleaseCapture();
            SendMessage(GetParent(m_wnd), WM_LBUTTONDOWN, 0, 0);
        }
    }

    if (_wcsicmp(bcommand, L"endDragWindow") == 0)
    {
        if (m_inplaceSite != nullptr)
            m_inplaceSite->SetCapture(false);

        return S_OK;
    }

    VARIANTARG vargs[2];
    vargs[0].vt = VT_BSTR;
    vargs[0].bstrVal = bquery;
    vargs[1].vt = VT_BSTR;
    vargs[1].bstrVal = bcommand;

    DISPPARAMS params;
    params.rgvarg = vargs;
    params.cArgs = _countof(vargs);
    params.cNamedArgs = 0;

    if (FAILED(InvokeFlashEvent(L"FSCommand", params)))
        return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::OnWebResourceRequested(ICoreWebView2 *sender, ICoreWebView2WebResourceRequestedEventArgs *args)
{
    if (sender == nullptr || args == nullptr)
        return E_INVALIDARG;

    ICoreWebView2WebResourceRequest *request = nullptr;
    if (FAILED(args->get_Request(&request)) || request == nullptr)
        return E_FAIL;

    CComBSTR burl;
    {
        WCHAR *url = nullptr;
        if (FAILED(request->get_Uri(&url)) || url == nullptr)
            return E_FAIL;

        burl = url;
        CoTaskMemFree(url);
    }

    if (_wcsnicmp(burl, L"http://127.0.0.1:9999/", 22) != 0 && _wcsnicmp(burl, L"http://localhost:9999/", 22) != 0)
        return S_FALSE;

    if (wcscmp(burl + 22, L"favicon.ico") == 0)
    {
        CComPtr<ICoreWebView2WebResourceResponse> response;
        if (FAILED(m_environment->CreateWebResourceResponse(nullptr, 404, L"Not Found", L"", &response)) || response == nullptr)
            return E_FAIL;

        if (FAILED(args->put_Response(response)))
            return E_FAIL;

        return S_OK;
    }

    CComPtr<FlashRequestProxy> flashRequestProxy(new FlashRequestProxy(m_environment, args));
    if (flashRequestProxy == nullptr)
        return E_FAIL;

    if (FAILED(flashRequestProxy->Init(m_serviceProvider, burl)))
        return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::OnNavigationCompleted(ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args)
{
    if (sender == nullptr || args == nullptr)
        return E_INVALIDARG;

    BOOL success = false;
    args->get_IsSuccess(&success);

    if (success)
    {
        m_ready = true;

        SendVariables();

        VARIANTARG vargs[1];
        vargs[0].vt = VT_I4;
        vargs[0].lVal = 3;

        DISPPARAMS params;
        params.rgvarg = vargs;
        params.cArgs = _countof(vargs);
        params.cNamedArgs = 0;

        InvokeFlashEvent(L"OnReadyStateChange", params);
    }

    return S_OK;
}

HRESULT FlashProxyModule::Encode(const BSTR in, CComBSTR &out)
{
    WCHAR buffer[INTERNET_MAX_URL_LENGTH];
    DWORD size = INTERNET_MAX_URL_LENGTH;
    if (SUCCEEDED(UrlEscape(in, buffer, &size, URL_ESCAPE_SEGMENT_ONLY | URL_ESCAPE_PERCENT)))
    {
        out = buffer;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT FlashProxyModule::Navigate()
{
    if (m_url.Length() == 0)
        return S_OK;

    if (m_view == nullptr)
        return S_OK;

    if (FAILED(m_view->Navigate(m_url)))
        return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::SendVariables()
{
    if (!m_ready)
        return S_OK;

    if (m_view == nullptr)
        return S_OK;

    for (LONG i = 0; i < (LONG)m_variables.GetCount(); ++i)
    {
        if (FAILED(m_view->PostWebMessageAsString(m_variables.GetAt(i))))
            return E_FAIL;
    }

    if (FAILED(m_variables.Resize((ULONG)0)))
        return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::InvokeFlashEvent(const WCHAR *cmd, DISPPARAMS &params, VARIANT *result)
{
    if (m_flashEvents == nullptr)
        return E_FAIL;

    DISPID id;
    if (FAILED(m_flashEvents->GetIDsOfNames(DIID_IThereEdgeShockwaveFlashEvents, (LPOLESTR*)&cmd, 1, LOCALE_SYSTEM_DEFAULT, &id)))
        return E_FAIL;

    if (FAILED(m_flashEvents->Invoke(id, DIID_IThereEdgeShockwaveFlashEvents, LOCALE_SYSTEM_DEFAULT, DISPATCH_METHOD, &params, result, nullptr, nullptr)))
       return E_FAIL;

    return S_OK;
}

HRESULT FlashProxyModule::SetSize(const SIZE &size)
{
    RECT rect;
    rect.left = m_pos.cx;
    rect.top = m_pos.cy;
    rect.right = rect.left + size.cx;
    rect.bottom = rect.top + size.cy;

    return SetRect(rect);
}

HRESULT FlashProxyModule::SetRect(const RECT &rect)
{
    UINT flags = 0;

    if (rect.left == m_pos.cx && rect.top == m_pos.cy)
        flags |= SWP_NOMOVE;

    LONG width = rect.right > rect.left ? rect.right - rect.left : 1;
    LONG height = rect.bottom > rect.top ? rect.bottom - rect.top : 1;

    if (width == m_size.cx && height == m_size.cy)
        flags |= SWP_NOSIZE;

    if (flags == (SWP_NOMOVE | SWP_NOSIZE))
        return S_OK;

    m_pos.cx = rect.left;
    m_pos.cy = rect.top;

    m_size.cx = width;
    m_size.cy = height;

    if (m_wnd == nullptr)
        return S_OK;

    SetWindowPos(m_wnd, nullptr, m_pos.cx, m_pos.cy, m_size.cx, m_size.cy, flags | SWP_NOZORDER | SWP_NOACTIVATE);

    if (m_controller != nullptr)
    {
        if ((flags & SWP_NOMOVE) == 0)
            m_controller->NotifyParentWindowPositionChanged();

        if ((flags & SWP_NOSIZE) == 0)
        {
            RECT bounds;
            GetClientRect(m_wnd, &bounds);
            m_controller->put_Bounds(bounds);
        }
    }

    return S_OK;
}

HRESULT FlashProxyModule::SetVisibility(BOOL visible)
{
    if (visible == m_visible)
        return S_OK;

    m_visible = visible;

    if (m_wnd == nullptr)
        return S_OK;

    ShowWindow(m_wnd, visible ? SW_SHOWNA : SW_HIDE);

    if (m_controller != NULL)
        m_controller->put_IsVisible(visible);

    return S_OK;
}