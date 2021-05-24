#define _ATL_APARTMENT_THREADED
#define _ATL_NO_AUTOMATIC_NAMESPACE
#define _ATL_CSTRING_EXPLICIT_CONSTRUCTORS
#define ATL_NO_ASSERT_ON_DESTROY_NONEXISTENT_WINDOW

#pragma warning (disable:26812)
#pragma warning (disable:28251)

#include "platform.h"
#include "resource.h"
#include "atlbase.h"
#include "atlcom.h"
#include "atlctl.h"
#include "WebView2.h"
#include "ThereEdge_i.h"
#include "ThereEdge.h"

CThereEdgeModule _AtlModule;

void Log(const WCHAR *format, ...)
{
    va_list args;
    va_start(args, format);

    WCHAR buff[1000];
    _vsnwprintf_s(buff, 1000, format, args);

    FILE *file = nullptr;
    if (fopen_s(&file, "C:\\Local\\Projects\\ThereEdge\\debug.txt", "a") == 0)
    {
        vfwprintf_s(file, format, args);
        fflush(file);
        fclose(file);
    }

    va_end(args);
}

extern "C" BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID lpReserved)
{
    return _AtlModule.DllMain(dwReason, lpReserved);
}

__control_entrypoint(DllExport)
STDAPI DllCanUnloadNow()
{
    return _AtlModule.DllCanUnloadNow();
}

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID *ppv)
{
    if (IsEqualIID(riid, IID_IClassFactory))
    {
        _AtlModule.AddRef();
        *ppv = static_cast<IClassFactory*>(&_AtlModule);
        return S_OK;
    }

    return _AtlModule.DllGetClassObject(rclsid, riid, ppv);
}

STDAPI DllRegisterServer()
{
    return _AtlModule.DllRegisterServer();
}

STDAPI DllUnregisterServer()
{
    return _AtlModule.DllUnregisterServer();
}

STDAPI DllInstall(BOOL bInstall, _In_opt_ LPCWSTR pszCmdLine)
{
    HRESULT hr = E_FAIL;
    static const wchar_t szUserSwitch[] = L"user";

    if (pszCmdLine != nullptr)
    {
        if (_wcsnicmp(pszCmdLine, szUserSwitch, _countof(szUserSwitch)) == 0)
        {
            ATL::AtlSetPerUserRegistration(true);
        }
    }

    if (bInstall)
    {
        hr = DllRegisterServer();
        if (FAILED(hr))
        {
            DllUnregisterServer();
        }
    }
    else
    {
        hr = DllUnregisterServer();
    }

    return hr;
}

CThereEdgeModule::CThereEdgeModule():
    m_refCount(1),
    m_flashEvents(),
    m_punkContext(),
    m_punkOuter(),
    m_qaContainer(),
    m_qaControl(),
    m_size(),
    m_wnd(nullptr),
    m_environment(),
    m_controller(),
    m_view(),
    m_webMessageReceivedToken(),
    m_webResourceRequestedToken(),
    m_navigationCompletedToken()
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
    childClass.lpszClassName = L"ThereEdge";
    RegisterClassEx(&childClass);
}

CThereEdgeModule::~CThereEdgeModule()
{
    if (m_view != nullptr)
    {
        m_view->remove_WebMessageReceived(m_webMessageReceivedToken);
        m_view->remove_WebResourceRequested(m_webResourceRequestedToken);
        m_view->remove_NavigationCompleted(m_navigationCompletedToken);
        m_view.Release();
    }

    m_controller.Release();
    m_environment.Release();
    m_punkContext.Release();
    m_punkOuter.Release();
    m_flashEvents.Release();
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryInterface(REFIID riid, void **object)
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

    if (IsEqualIID(riid, IID_IDispatch))
    {
        AddRef();
        *object = static_cast<IDispatch*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IShockwaveFlash))
    {
        AddRef();
        *object = static_cast<IShockwaveFlash*>(this);
        return S_OK;
    }

    Log(L"QueryInterface: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
        riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
        riid.Data4[2], riid.Data4[3], riid.Data4[4],
        riid.Data4[5], riid.Data4[6], riid.Data4[7]);

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE CThereEdgeModule::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE CThereEdgeModule::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv)
{
    if (IsEqualIID(riid, IID_IQuickActivate))
    {
        auto module = new CThereEdgeModule();
        if (module == nullptr)
            return E_FAIL;

        *ppv = static_cast<IQuickActivate*>(module);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::CreateInstanceWithContext(IUnknown *punkContext, IUnknown *punkOuter, REFIID riid, void **ppv)
{
    if (IsEqualIID(riid, IID_IUnknown))
    {
        auto module = new CThereEdgeModule();
        if (module == nullptr)
            return E_FAIL;

        module->m_punkContext = punkContext;
        if (punkContext != nullptr)
            punkContext->AddRef();

        module->m_punkOuter = punkOuter;
        if (punkOuter != nullptr)
            punkOuter->AddRef();

        *ppv = static_cast<IClassFactoryEx*>(module);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::LockServer(BOOL fLock)
{
    if (fLock)
        m_nLockCnt++;
    else
        m_nLockCnt--;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QuickActivate(QACONTAINER *pQaContainer, QACONTROL *pQaControl)
{
    m_qaContainer = *pQaContainer;
    m_qaControl = *pQaControl;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetContentExtent(LPSIZEL pSizel)
{
    m_size = *pSizel;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetContentExtent(LPSIZEL pSizel)
{
    *pSizel = m_size;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP)
{
    if (IsEqualIID(riid, DIID_IShockwaveFlashEvents))
    {
        AddRef();
        *ppCP = static_cast<IConnectionPoint*>(this);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetConnectionInterface(IID *pIID)
{
    *pIID = DIID_IShockwaveFlashEvents;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetConnectionPointContainer(IConnectionPointContainer **ppCPC)
{
    AddRef();
    *ppCPC = static_cast<IConnectionPointContainer*>(this);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Advise(IUnknown *pUnkSink, DWORD *pdwCookie)
{
    if (SUCCEEDED(pUnkSink->QueryInterface(&m_flashEvents)))
    {
        *pdwCookie = (DWORD)&m_flashEvents;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Unadvise(DWORD dwCookie)
{
    if (dwCookie == (DWORD)&m_flashEvents && m_flashEvents != nullptr)
    {
        m_flashEvents.Release();
        m_flashEvents = nullptr;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Close(DWORD dwSaveOption)
{
    Log(L"Close\n");
    if (m_wnd != nullptr)
        ShowWindow(m_wnd, SW_HIDE);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect)
{
    switch (iVerb)
    {
        case OLEIVERB_PRIMARY:
            Log(L"DoVerb OLEIVERB_PRIMARY\n");
            break;
        case OLEIVERB_SHOW:
            Log(L"DoVerb OLEIVERB_SHOW\n");
            break;
        case OLEIVERB_OPEN:
            Log(L"DoVerb OLEIVERB_OPEN\n");
            break;
        case OLEIVERB_HIDE:
            Log(L"DoVerb OLEIVERB_HIDE\n");
            break;
        case OLEIVERB_UIACTIVATE:
            Log(L"DoVerb OLEIVERB_UIACTIVATE\n");
            break;
        case OLEIVERB_INPLACEACTIVATE:
        {
            if (m_wnd != nullptr)
            {
                ShowWindow(m_wnd, SW_SHOWNA);
                return S_OK;
            }

            if (m_environment != nullptr)
                return S_OK;

            if (lprcPosRect == nullptr)
                return E_INVALIDARG;

            LONG width = lprcPosRect->right > lprcPosRect->left ? lprcPosRect->right - lprcPosRect->left : 1;
            LONG height = lprcPosRect->bottom > lprcPosRect->top ? lprcPosRect->bottom - lprcPosRect->top : 1;

            m_wnd = CreateWindowEx(WS_EX_TRANSPARENT, L"ThereEdge", L"", WS_CHILD | WS_CLIPCHILDREN | WS_VISIBLE,
                                   lprcPosRect->left, lprcPosRect->top, width, height,
                                   hwndParent, nullptr, GetModuleHandle(nullptr), nullptr);

            return CreateCoreWebView2Environment(this);
        }
        case OLEIVERB_DISCARDUNDOSTATE:
            Log(L"DoVerb OLEIVERB_DISCARDUNDOSTATE\n");
            break;
        default:
            Log(L"DoVerb %ld\n", iVerb);
            break;
    }

    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetWindow(HWND *phwnd)
{
    Log(L"GetWindow\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::InPlaceDeactivate()
{
    Log(L"InPlaceDeactivate\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::UIDeactivate()
{
    Log(L"UIDeactivate\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect)
{
    // Log(L"SetObjectRects\n");
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult)
{
    Log(L"OnWindowMessage\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                 HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                 BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    // Log(L"Draw\n");
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    // Log(L"QueryHitPoint\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult)
{
    // Log(L"QueryHitRect\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetTypeInfoCount(UINT *pctinfo)
{
    *pctinfo = 0;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId)
{
    if (cNames == 1)
    {
        if (wcscmp(rgszNames[0], L"onDragMouseDown") == 0)
        {
            rgDispId[0] = 1;
            return S_OK;
        }
    }

    return DISP_E_UNKNOWNNAME;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                                   VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr)
{
    if (dispIdMember == 1)
    {
        ReleaseCapture();
        SendMessage(m_wnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
        return S_OK;
    }

    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::put_Movie(BSTR pVal)
{
    Log(L"put_Movie %s\n", pVal);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::put_WMode(BSTR pVal)
{
    Log(L"put_WMode %s\n", pVal);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetVariable(BSTR name, BSTR value)
{
    Log(L"SetVariable %s %s\n", name, value);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(HRESULT errorCode, ICoreWebView2Environment *environment)
{
    if (environment == nullptr)
        return E_FAIL;

    m_environment = environment;
    m_environment->CreateCoreWebView2Controller(m_wnd, this);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(HRESULT errorCode, ICoreWebView2Controller *controller)
{
    if (controller == nullptr)
        return E_FAIL;

    if (controller->QueryInterface(&m_controller) != S_OK || m_controller == nullptr)
        return E_FAIL;

    if (m_controller->get_CoreWebView2(&m_view) != S_OK || m_view == nullptr)
        return E_FAIL;

    ICoreWebView2Settings *settings = nullptr;
    if (m_view->get_Settings(&settings) != S_OK || settings == nullptr)
        return E_FAIL;

    settings->put_AreDefaultContextMenusEnabled(false);
    settings->put_AreDefaultScriptDialogsEnabled(false);
    settings->put_AreDevToolsEnabled(false);
    settings->put_AreHostObjectsAllowed(true);
    settings->put_IsBuiltInErrorPageEnabled(true);
    settings->put_IsScriptEnabled(true);
    settings->put_IsStatusBarEnabled(false);
    settings->put_IsWebMessageEnabled(true);
    settings->put_IsZoomControlEnabled(false);

    RECT bounds;
    GetClientRect(m_wnd, &bounds);
    m_controller->put_Bounds(bounds);
    Log(L"Bounds %lu %lu %lu %lu\n", bounds.right - bounds.left, bounds.bottom - bounds.top, m_size.cx, m_size.cy);

    COREWEBVIEW2_COLOR color = {0, 0, 0, 0};
    m_controller->put_DefaultBackgroundColor(color);

    VARIANT hostObject = {};
    hostObject.vt = VT_DISPATCH;
    hostObject.pdispVal = this;
    m_view->AddHostObjectToScript(L"client", &hostObject);

    m_view->AddWebResourceRequestedFilter(L"http://127.0.0.1:9999/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
    m_view->AddWebResourceRequestedFilter(L"http://localhost:9999/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);

    m_view->add_WebMessageReceived(this, &m_webMessageReceivedToken);
    m_view->add_WebResourceRequested(this, &m_webResourceRequestedToken);
    m_view->add_NavigationCompleted(this, &m_navigationCompletedToken);

    if (m_view->Navigate(L"http://127.0.0.1:9999/resources/changeme/changeme_network.html")!= S_OK)
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(ICoreWebView2 *sender, ICoreWebView2WebMessageReceivedEventArgs *args)
{
    if (args == nullptr)
        return E_FAIL;

    WCHAR *command = nullptr;
    if (args->TryGetWebMessageAsString(&command) != S_OK || command == nullptr)
        return E_FAIL;

    WCHAR *params = wcsstr(command, L"?");
    if (params != nullptr)
    {
        *params = 0;
         params++;
    }
    else
    {
        params = command + wcslen(command);
    }

    Log(L"FSCommand: %s %s\n", command, params);

    CoTaskMemFree(command);

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(ICoreWebView2 *sender, ICoreWebView2WebResourceRequestedEventArgs *args)
{
    if (args == nullptr)
        return E_FAIL;

    ICoreWebView2WebResourceRequest *request = nullptr;
    if (args->get_Request(&request) != S_OK || request == nullptr)
        return E_FAIL;

    WCHAR *uri = nullptr;
    if (request->get_Uri(&uri) != S_OK || uri == nullptr)
        return E_FAIL;

    if (_wcsnicmp(uri, L"http://127.0.0.1:9999/", 22) == 0 || _wcsnicmp(uri, L"http://localhost:9999/", 22) == 0)
    {
        uri += 22;

        ICoreWebView2Deferral *deferral;
        if (args->GetDeferral(&deferral) != S_OK || deferral == nullptr)
            return E_FAIL;

        args->AddRef();

        if (_wcsnicmp(uri, L"resources/", 10) == 0)
        {
            Log(L"TFS: %s\n", uri);

            IStream *content = nullptr;
            if (SUCCEEDED(SHCreateStreamOnFileEx(uri, STGM_READ | STGM_SHARE_DENY_NONE, FILE_ATTRIBUTE_NORMAL, false, nullptr, &content)))
            {
                ICoreWebView2WebResourceResponse *response = nullptr;
                if (SUCCEEDED(m_environment->CreateWebResourceResponse(content, 200, L"OK", L"", &response)) && response != nullptr)
                {
                    args->put_Response(response);
                    response->Release();
                }

                content->Release();
            }
            else
            {
                ICoreWebView2WebResourceResponse *response = nullptr;
                if (SUCCEEDED(m_environment->CreateWebResourceResponse(nullptr, 404, L"Not Found", L"", &response)) && response != nullptr)
                {
                    args->put_Response(response);
                    response->Release();
                }
            }
        }
        else
        {
            Log(L"Service: %s\n", uri);

            ICoreWebView2WebResourceResponse *response = nullptr;
            if (SUCCEEDED(m_environment->CreateWebResourceResponse(nullptr, 404, L"Not Found", L"", &response)) && response != nullptr)
            {
                args->put_Response(response);
                response->Release();
            }
        }

        args->Release();

        deferral->Complete();
        deferral->Release();
    }

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args)
{
    if (args == nullptr)
        return E_FAIL;

    BOOL success = false;
    args->get_IsSuccess(&success);

    if (success)
        m_view->PostWebMessageAsString(L"setVariable?name=Testing&value=123");

    return S_OK;
}
