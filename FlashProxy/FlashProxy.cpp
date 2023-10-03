#define _ATL_APARTMENT_THREADED
#define _ATL_NO_AUTOMATIC_NAMESPACE
#define _ATL_CSTRING_EXPLICIT_CONSTRUCTORS
#define ATL_NO_ASSERT_ON_DESTROY_NONEXISTENT_WINDOW

#pragma warning (disable:26812)
#pragma warning (disable:28251)

#include "platform.h"
#include "resource.h"
#include "shlwapi.h"
#include "shlobj.h"
#include "wininet.h"
#include "atlbase.h"
#include "atlcom.h"
#include "atlctl.h"
#include "atlstr.h"
#include "atlsafe.h"
#include "ocmm.h"
#include "wrl.h"
#include "WebView2.h"
#include "versionhelpers.h"
#include "FlashRequestProxy.h"
#include "FlashProxy_i.h"
#include "FlashProxy.h"

#define WM_FLASHPROXY_SET_VISIBILITY     (WM_USER + 1)
#define WM_FLASHPROXY_REQUEST_VISIBILITY (WM_USER + 2)
#define WM_FLASHPROXY_SET_TELEPORTING    (WM_USER + 3)
#define WM_FLASHPROXY_GET_IDENTITY       (WM_USER + 4)
#define WM_FLASHPROXY_GET_ABOUT          (WM_USER + 5)

FlashProxyModule g_AtlModule;
HINSTANCE g_Instance;
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
    g_Instance = hInstance;
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
    m_proxyWnd(nullptr),
    m_clientWnd(nullptr),
    m_maskRects(),
    m_maskRectCount(0),
    m_encodeBuffer(),
    m_identity(Identity::Unknown),
    m_visibilityMask(0),
    m_port(9999),
    m_url(),
    m_userDataFolder(),
    m_aboutQuery(),
    m_variables(),
    m_flashEvents(),
    m_unknownContext(),
    m_unknownOuter(),
    m_serviceProvider(),
    m_inplaceSite(),
    m_environment(),
    m_controller(),
    m_view(),
    m_webMessageReceivedToken(),
    m_webResourceRequestedToken(),
    m_navigationCompletedToken(),
    m_ready(false),
    m_visible(false),
    m_hidden(false)
{
    SetEnvironmentVariable(L"WEBVIEW2_DEFAULT_BACKGROUND_COLOR", L"0x00000000");

    WNDCLASSEX childClass = {0};
    childClass.cbSize = sizeof(WNDCLASSEX);
    childClass.style = CS_HREDRAW | CS_VREDRAW | CS_DBLCLKS;
    childClass.lpfnWndProc = ChildWndProc;
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
    if (m_view != nullptr)
    {
        m_view->remove_WebMessageReceived(m_webMessageReceivedToken);
        m_view->remove_WebResourceRequested(m_webResourceRequestedToken);
        m_view->remove_NavigationCompleted(m_navigationCompletedToken);
    }

    if (m_controller != nullptr)
        m_controller->Close();

    if (m_proxyWnd != nullptr)
        DestroyWindow(m_proxyWnd);
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

    GuessToolbarVisibility();

    if (m_identity == Identity::Teleport)
        BroadcastMessage(WM_FLASHPROXY_SET_TELEPORTING, 0, 0);

    if (m_proxyWnd != nullptr)
        SetWindowLongPtr(m_proxyWnd, GWL_USERDATA, 0);

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
            if (m_proxyWnd != nullptr)
                return S_OK;

            if (m_environment != nullptr)
                return S_OK;

            if (pActiveSite == nullptr)
                return E_INVALIDARG;

            if (FAILED(pActiveSite->QueryInterface(&m_serviceProvider)))
                return E_FAIL;

            if (FAILED(pActiveSite->QueryInterface(&m_inplaceSite)))
                return E_FAIL;

            if (lprcPosRect == nullptr)
                return E_INVALIDARG;

            SetRect(*lprcPosRect);

            if (hwndParent == nullptr)
                return E_FAIL;

            m_clientWnd = hwndParent;

            RECT bounds;
            GetClientRect(m_clientWnd, &bounds);

            {
                WCHAR value[25];
                _ltow_s(bounds.right - bounds.left, value, _countof(value), 10);
                SetVariable(L"There_WindowWidth", value);
                _ltow_s(bounds.bottom - bounds.top, value, _countof(value), 10);
                SetVariable(L"There_WindowHeight", value);
            }

            {
                HRSRC source = FindResource(g_Instance, MAKEINTRESOURCE(VS_VERSION_INFO), RT_VERSION);
                if (source != nullptr)
                {
                    HGLOBAL resource = LoadResource(g_Instance, source);
                    if (resource != nullptr)
                    {
                        void *data = LockResource(resource);
                        if (data != nullptr)
                        {
                            VS_FIXEDFILEINFO *version = nullptr;
                            UINT size = 0;
                            if (VerQueryValue(data, L"\\", (void**)&version, &size) && version != nullptr && size >= sizeof(VS_FIXEDFILEINFO))
                            {
                                WCHAR value[100];
                                _snwprintf_s(value, _countof(value), L"%u.%u.%u",
                                             version->dwFileVersionMS >> 16 & 0xFFFF,
                                             version->dwFileVersionMS & 0xFFFF,
                                             version->dwFileVersionLS >> 16 & 0xFFFF);
                                SetVariable(L"There_ProxyVersion", value);
                            }
                        }
                    }
                }
            }

            {
                m_proxyWnd = CreateWindowEx(IsWindows8OrGreater() ? WS_EX_TRANSPARENT : 0, g_WindowClassName, L"",
                                            WS_CHILD | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
                                            m_pos.cx, m_pos.cy, max(1, m_size.cx), max(1, m_size.cy),
                                            m_clientWnd, nullptr, GetModuleHandle(nullptr), nullptr);
                if (m_proxyWnd == nullptr)
                    return E_FAIL;

                SetWindowLongPtr(m_proxyWnd, GWL_USERDATA, (LPARAM)this);
            }

            {
                WCHAR userDataFolder[MAX_PATH] = {0};
                if (SUCCEEDED(SHGetFolderPath(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, userDataFolder)) && userDataFolder[0] != 0)
                {
                    if (PathAppend(userDataFolder, L"There"))
                    {
                        CreateDirectory(userDataFolder, nullptr);
                        if (PathAppend(userDataFolder, L"EdgeFlash"))
                        {
                            CreateDirectory(userDataFolder, nullptr);
                            m_userDataFolder = userDataFolder;
                        }
                    }
                }
            }

            if (FAILED(CreateCoreWebView2EnvironmentWithOptions(nullptr, m_userDataFolder, nullptr, this)))
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

    *phwnd = m_proxyWnd;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect)
{
    if (lprcPosRect == nullptr || lprcClipRect == nullptr)
        return E_INVALIDARG;

    SetRect(*lprcClipRect);

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult)
{
    return S_FALSE;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                 HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                 BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    // WebView2 doesn't currently support offscreen rendering, which is how the Flash control works.
    // Additional work is required for positioning and visibility, which would normally be taken care of by the client's renderer.
    // See https://github.com/MicrosoftEdge/WebView2Feedback/issues/20 for details.

    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    if (pHitResult == nullptr)
        return E_INVALIDARG;

    POINT point;
    point.x = ptlLoc.x - m_pos.cx;
    point.y = ptlLoc.y - m_pos.cy;

    if (point.x < 0 || point.y < 0 || point.x >= m_size.cx || point.y >= m_size.cy)
    {
        *pHitResult = HITRESULT_OUTSIDE;
        return S_OK;
    }

    if (!m_visible)
    {
        *pHitResult = HITRESULT_TRANSPARENT;
        return S_OK;
    }

    for (LONG i = 0; i < m_maskRectCount; ++i)
    {
        RECT maskRect = m_maskRects[m_maskRectCount];
        if (point.x >= maskRect.left && point.y >= maskRect.top && point.x < maskRect.right && point.y < maskRect.bottom)
        {
            *pHitResult = HITRESULT_TRANSPARENT;
            return S_OK;
        }
    }

    *pHitResult = HITRESULT_HIT;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetTypeInfoCount(UINT *pctinfo)
{
    *pctinfo = 0;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId)
{
    if (cNames == 1)
    {
        if (wcscmp(rgszNames[0], L"onBeginDragWindow") == 0)
        {
            rgDispId[0] = 1;
            return S_OK;
        }

        if (wcscmp(rgszNames[0], L"onKeyboardFocus") == 0)
        {
            rgDispId[0] = 2;
            return S_OK;
        }
    }

    return DISP_E_UNKNOWNNAME;
}

HRESULT STDMETHODCALLTYPE FlashProxyModule::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                                   VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr)
{
    switch (dispIdMember)
    {
        case 1:
        {
            if (m_proxyWnd != nullptr)
            {
                POINT point;
                GetCursorPos(&point);
                ScreenToClient(m_clientWnd, &point);

                SetCapture(m_proxyWnd);
                SendMessage(m_clientWnd, WM_LBUTTONDOWN, 0, MAKELPARAM(point.x, point.y));
            }

            CComBSTR bcommand = L"beginDragWindow";
            CComBSTR bquery = L"";

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

        case 2:
        {
#if 1
            // Fake a window drag event to workaround the textbox focus issue.
            if (m_proxyWnd != nullptr)
            {
                POINT point = {0, 0};
                ClientToScreen(m_proxyWnd, &point);
                ScreenToClient(m_clientWnd, &point);

                SetCapture(m_proxyWnd);
                SendMessage(m_clientWnd, WM_LBUTTONDOWN, 0, MAKELPARAM(point.x, point.y));

                CComBSTR bcommand = L"beginDragWindow";
                CComBSTR bquery = L"";

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

                SendMessage(m_proxyWnd, WM_MOUSEMOVE, 0, MAKELPARAM(0, 0));
                SendMessage(m_proxyWnd, WM_LBUTTONUP, 0, MAKELPARAM(0, 0));
            }

            if (m_inplaceSite != nullptr)
                m_inplaceSite->SetFocus(true);

            if (m_controller != nullptr)
                m_controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
#else
            if (m_inplaceSite != nullptr)
                m_inplaceSite->SetFocus(true);

            CComBSTR bcommand = L"getKeyboardFocus";
            CComBSTR bquery = L"";

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

            if (m_controller != nullptr)
                m_controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
#endif

            return S_OK;
        }

        default:
            return E_NOTIMPL;
    }
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

    CComBSTR burl;
    if (FAILED(burl.Append(pVal, length)))
        return E_FAIL;

    WCHAR scheme[10] = {0};
    WCHAR host[40] = {0};
    WCHAR path[1000] = {0};
    URL_COMPONENTS components;
    ZeroMemory(&components, sizeof(components));
    components.dwStructSize = sizeof(components);
    components.lpszScheme = scheme;
    components.dwSchemeLength = _countof(scheme);
    components.lpszHostName = host;
    components.dwHostNameLength = _countof(host);
    components.lpszUrlPath = path;
    components.dwUrlPathLength = _countof(path);

    if (!InternetCrackUrl(burl, 0, ICU_DECODE, &components))
        return E_FAIL;

    if (_wcsicmp(scheme, L"http") != 0 || components.nPort < 1024)
        return E_FAIL;

    m_port = components.nPort;

    WCHAR *name = wcsrchr(burl, L'/');
    if (name != nullptr)
    {
        name++;
        if (_wcsicmp(name, L"teleportslideshow") == 0)
            m_identity = Identity::Teleport;
        else if (_wcsicmp(name, L"shortcutbar") == 0)
            m_identity = Identity::ShortcutBar;
        else if (_wcsicmp(name, L"funfinder") == 0)
            m_identity = Identity::FunFinder;
        else if (_wcsicmp(name, L"emotionsbar") == 0)
            m_identity = Identity::EmotionsBar;
        else if (_wcsicmp(name, L"messagebar") == 0)
            m_identity = Identity::MessageBar;
    }

    if (_wcsicmp(host, L"127.0.0.1") == 0 || _wcsicmp(host, L"localhost") == 0)
    {
        if (path[0] == L'/')
        {
            CComBSTR bpath = path + 1;
            if (FAILED(bpath.Append(L"2.html")))
                return E_FAIL;

            if (GetFileAttributes(bpath) != INVALID_FILE_ATTRIBUTES)
            {
                if (FAILED(burl.Append(L"2")))
                    return E_FAIL;
            }
        }
    }

   if (FAILED(burl.Append(L".html")))
        return E_FAIL;

    m_url = burl;

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
    if (name == nullptr)
        return E_INVALIDARG;

    if (!IsWindows8OrGreater() && _wcsicmp(name, L"There_TranslucencyEnabled") == 0)
        value = L"0";

    CComBSTR encName;
    if (FAILED(Encode(name, encName)))
        return E_FAIL;

    CComBSTR encValue;
    if (FAILED(Encode(value == nullptr ? L"" : value, encValue)))
        return E_FAIL;

    CComBSTR uri;
    if (FAILED(uri.Append(L"setVariable?name=")) ||
        FAILED(uri.Append(encName)) ||
        FAILED(uri.Append(L"&value=")) ||
        FAILED(uri.Append(encValue)))
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
    m_environment->CreateCoreWebView2Controller(m_proxyWnd, this);
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

    CComPtr<ICoreWebView2Settings8> settings8;
    if (FAILED(settings->QueryInterface(&settings8)) || settings8 == nullptr)
        return E_FAIL;

    settings8->put_AreDevToolsEnabled(IsDevToolsEnabled());
    settings8->put_AreDefaultContextMenusEnabled(false);
    settings8->put_AreDefaultScriptDialogsEnabled(false);
    settings8->put_IsBuiltInErrorPageEnabled(false);
    settings8->put_IsStatusBarEnabled(false);
    settings8->put_IsZoomControlEnabled(false);
    settings8->put_AreHostObjectsAllowed(true);
    settings8->put_IsScriptEnabled(true);
    settings8->put_IsWebMessageEnabled(true);
    settings8->put_IsReputationCheckingRequired(false);

    RECT bounds;
    GetClientRect(m_proxyWnd, &bounds);
    m_controller->put_Bounds(bounds);

    COREWEBVIEW2_COLOR color = {0, 0, 0, 0};
    m_controller->put_DefaultBackgroundColor(color);

    m_controller->put_ShouldDetectMonitorScaleChanges(false);
    m_controller->put_RasterizationScale(1.0);

    VARIANT hostObject = {};
    hostObject.vt = VT_DISPATCH;
    hostObject.pdispVal = static_cast<IDispatch*>(this);
    m_view->AddHostObjectToScript(L"client", &hostObject);

    WCHAR filterHost[40] = {0};
    _snwprintf_s(filterHost, _countof(filterHost), L"http://127.0.0.1:%u/*", m_port);
    m_view->AddWebResourceRequestedFilter(filterHost, COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
    _snwprintf_s(filterHost, _countof(filterHost), L"http://localhost:%u/*", m_port);
    m_view->AddWebResourceRequestedFilter(filterHost, COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);

    m_view->add_WebMessageReceived(Callback<ICoreWebView2WebMessageReceivedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2WebMessageReceivedEventArgs *args) -> HRESULT
        {
            return OnWebMessageReceived(sender, args);
        }
    ).Get(), &m_webMessageReceivedToken);

    m_view->add_WebResourceRequested(Callback<ICoreWebView2WebResourceRequestedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2WebResourceRequestedEventArgs *args) -> HRESULT
        {
            return OnWebResourceRequested(sender, args);
        }
    ).Get(), &m_webResourceRequestedToken);

    m_view->add_NavigationCompleted(Callback<ICoreWebView2NavigationCompletedEventHandler>(
        [this](ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args) -> HRESULT
        {
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

    if (_wcsicmp(bcommand, L"openDevTools") == 0)
    {
        if (!IsDevToolsEnabled())
            return E_NOTIMPL;

        sender->OpenDevToolsWindow();
        return S_OK;
    }

    if (_wcsicmp(bcommand, L"setMask") == 0)
    {
        CComBSTR bvalue = _wcsnicmp(bquery, L"rects=", 6) == 0 ? bquery + 6 : L"";

        if (FAILED(UrlUnescapeInPlace(bvalue, 0)))
            return E_FAIL;

        if (FAILED(SetMaskRects(bvalue)))
            return E_FAIL;

        return S_OK;
    }

    if (_wcsicmp(bcommand, L"setAbout") == 0)
    {
        m_aboutQuery = bquery;
        return S_OK;
    }

    if (_wcsicmp(bcommand, L"beginDragWindow") == 0)
        return E_NOTIMPL;

    if (_wcsicmp(bcommand, L"getKeyboardFocus") == 0)
        return E_NOTIMPL;

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

    WCHAR scheme[10] = {0};
    WCHAR host[40] = {0};
    WCHAR path[1000] = {0};
    URL_COMPONENTS components;
    ZeroMemory(&components, sizeof(components));
    components.dwStructSize = sizeof(components);
    components.lpszScheme = scheme;
    components.dwSchemeLength = _countof(scheme);
    components.lpszHostName = host;
    components.dwHostNameLength = _countof(host);
    components.lpszUrlPath = path;
    components.dwUrlPathLength = _countof(path);

    if (!InternetCrackUrl(burl, 0, ICU_DECODE, &components))
        return E_FAIL;

    if (_wcsicmp(scheme, L"http") != 0 || components.nPort != m_port)
        return S_FALSE;

    if (_wcsicmp(host, L"127.0.0.1") != 0 && _wcsicmp(host, L"localhost") != 0)
        return S_FALSE;

    if (wcscmp(path, L"/favicon.ico") == 0)
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

        if (IsToolbar())
            BroadcastMessage(WM_FLASHPROXY_REQUEST_VISIBILITY, 0, 0);
        else
            SetVisibility();

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
    DWORD size = _countof(m_encodeBuffer);
    if (SUCCEEDED(UrlEscape(in, m_encodeBuffer, &size, URL_ESCAPE_SEGMENT_ONLY | URL_ESCAPE_PERCENT)))
    {
        out = m_encodeBuffer;
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

    if (m_identity == Identity::Teleport)
    {
        BroadcastMessage(WM_FLASHPROXY_SET_TELEPORTING, 0, 1);
    }
    else
    {
        if (((UINT32)BroadcastMessage(WM_FLASHPROXY_GET_IDENTITY, 0, 0) & (UINT32)Identity::Teleport) != 0)
           SetVariable(L"There_Teleporting", L"1");
    }

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

    LONG width = rect.right - rect.left;
    LONG height = rect.bottom - rect.top;

    if (width == m_size.cx && height == m_size.cy)
        flags |= SWP_NOSIZE;

    if (flags == (SWP_NOMOVE | SWP_NOSIZE))
        return S_OK;

    m_pos.cx = rect.left;
    m_pos.cy = rect.top;

    m_size.cx = width;
    m_size.cy = height;

    if (m_proxyWnd == nullptr)
        return S_OK;

    SetWindowPos(m_proxyWnd, nullptr, m_pos.cx, m_pos.cy, max(1, m_size.cx), max(1, m_size.cy), flags | SWP_NOZORDER | SWP_NOACTIVATE);
    SetVisibility(m_visibilityMask);
    GuessToolbarVisibility();

    if (m_controller != nullptr)
    {
        if ((flags & SWP_NOMOVE) == 0)
            m_controller->NotifyParentWindowPositionChanged();

        if ((flags & SWP_NOSIZE) == 0)
        {
            RECT bounds;
            GetClientRect(m_proxyWnd, &bounds);
            m_controller->put_Bounds(bounds);
        }
    }

    return S_OK;
}

HRESULT FlashProxyModule::SetMaskRects(WCHAR *text)
{
    for (m_maskRectCount = 0; m_maskRectCount < _countof(m_maskRects) && text[0] != 0; ++m_maskRectCount)
    {
        RECT &maskRect = m_maskRects[m_maskRectCount];

        maskRect.left = wcstol(text, &text, 10);
        if (text[0] != ',')
            break;

        maskRect.top = wcstol(text + 1, &text, 10);
        if (text[0] != ',')
            break;

        maskRect.right = maskRect.left + wcstol(text + 1, &text, 10);
        if (text[0] != ',')
            break;

        maskRect.bottom = maskRect.top + wcstol(text + 1, &text, 10);
        if (text[0] == ',')
            ++text;
    }

    return S_OK;
}

void FlashProxyModule::GuessToolbarVisibility()
{
    // Unfortunately, it appears that the There_Visible variable is always true.
    // The actual visibility is handled inside the client since Flash renders during the Draw function.
    // The best we can do is figure out which toolbars are visibile based on the location of the message bar.

    if (m_identity != Identity::MessageBar)
        return;

    RECT bounds;
    GetClientRect(m_clientWnd, &bounds);

    LONG y = bounds.bottom - m_pos.cy - 56;
    UINT32 visibilityMask = 0;

    if (m_ready)
    {
        switch (y)
        {
            case 0:   // Hidden
            {
                visibilityMask = 0;
                break;
            }

            case 24:  // MenuBar MessageBar
            {
                visibilityMask = (UINT32)Identity::MessageBar;
                break;
            }

            case 48:  // MenuBar ShortcutBar MessageBar
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 58:  // MenuBar FunFinder MessageBar
            {
                visibilityMask = (UINT32)Identity::FunFinder | (UINT32)Identity::MessageBar;
                break;
            }

            case 46:  // MenuBar EmotionsBar MessageBar
            {
                visibilityMask = (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 82:  // MenuBar ShortcutBar FunFinder MessageBar
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::FunFinder | (UINT32)Identity::MessageBar;
                break;
            }

            case 70:  // MenuBar ShortcutBar EmotionsBar MessageBar
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 80:  // MenuBar FunFinder EmotionsBar MessageBar
            {
                visibilityMask = (UINT32)Identity::FunFinder | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 104: // MenuBar ShortcutBar FunFinder EmotionsBar MessageBar
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::FunFinder | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 88:  // Hidden SocialGame
            case 99:
            {
                visibilityMask = 0;
                break;
            }

            case 112: // MenuBar SocialGame MessageBar
            case 123:
            {
                visibilityMask = (UINT32)Identity::MessageBar;
                break;
            }

            case 136: // MenuBar ShortcutBar SocialGame MessageBar
            case 147:
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 146: // MenuBar FunFinder SocialGame MessageBar
            case 157:
            {
                visibilityMask = (UINT32)Identity::FunFinder | (UINT32)Identity::MessageBar;
                break;
            }

            case 134: // MenuBar EmotionsBar SocialGame MessageBar
            case 145:
            {
                visibilityMask = (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 170: // MenuBar ShortcutBar FunFinder SocialGame MessageBar
            case 181:
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::FunFinder | (UINT32)Identity::MessageBar;
                break;
            }

            case 158: // MenuBar ShortcutBar EmotionsBar SocialGame MessageBar
            case 169:
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 168: // MenuBar FunFinder EmotionsBar SocialGame MessageBar
            case 179:
            {
                visibilityMask = (UINT32)Identity::FunFinder | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            case 192: // MenuBar ShortcutBar FunFinder EmotionsBar SocialGame MessageBar
            case 203:
            {
                visibilityMask = (UINT32)Identity::ShortcutBar | (UINT32)Identity::FunFinder | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar;
                break;
            }

            default:
                break;
        }
    }

    BroadcastMessage(WM_FLASHPROXY_SET_VISIBILITY, 0, (LPARAM)visibilityMask | (UINT32)Identity::MessageBar);
}

void FlashProxyModule::SetVisibility(UINT32 visibilityMask)
{
    BOOL visible = true;

    m_visibilityMask = visibilityMask;

    if (IsToolbar())
    {
        if (((UINT32)m_identity & visibilityMask) == 0)
            visible = false;
    }

    BOOL hidden = m_size.cx == 0 || m_size.cy == 0;

    if (m_visible == visible && m_hidden == hidden)
        return;

    m_visible = visible;
    m_hidden = hidden;

    if (m_proxyWnd == nullptr)
        return;

    visible = visible && !hidden;

    ShowWindow(m_proxyWnd, visible ? SW_SHOWNA : SW_HIDE);

    if (m_controller != nullptr)
        m_controller->put_IsVisible(visible);

    return;
}

BOOL FlashProxyModule::IsToolbar()
{
    return ((UINT32)m_identity & ((UINT32)Identity::ShortcutBar | (UINT32)Identity::FunFinder | (UINT32)Identity::EmotionsBar | (UINT32)Identity::MessageBar)) != 0;
}


BOOL FlashProxyModule::IsDevToolsEnabled()
{
    WCHAR value[100];
    return (GetEnvironmentVariable(L"THEREEDGE_DEVELOPER_TOOLS", value, _countof(value)) > 0 && wcscmp(value, L"1") == 0);
}

LRESULT FlashProxyModule::BroadcastMessage(UINT Msg, WPARAM wParam, LPARAM lParam)
{
    LRESULT result = 0;

    if (m_proxyWnd != nullptr)
    {
        for (HWND wnd = FindWindowEx(m_clientWnd, nullptr, g_WindowClassName, nullptr); wnd != nullptr; wnd = FindWindowEx(m_clientWnd, wnd, g_WindowClassName, nullptr))
            result |= SendMessage(wnd, Msg, wParam, lParam);
    }

    return result;
}

LRESULT APIENTRY FlashProxyModule::ChildWndProc(HWND hWnd, UINT Msg, WPARAM wParam, LPARAM lParam)
{
    FlashProxyModule *flashProxy = reinterpret_cast<FlashProxyModule*>(GetWindowLongPtr(hWnd, GWL_USERDATA));

    switch (Msg)
    {
        case WM_FLASHPROXY_SET_VISIBILITY:
        {
            if (flashProxy != nullptr)
                flashProxy->SetVisibility((UINT32)lParam);

            return 0;
        }

        case WM_FLASHPROXY_REQUEST_VISIBILITY:
        {
            if (flashProxy != nullptr)
                flashProxy->GuessToolbarVisibility();

            return 0;
        }

        case WM_FLASHPROXY_SET_TELEPORTING:
        {
            if (flashProxy != nullptr)
                flashProxy->SetVariable(L"There_Teleporting", lParam ? L"1" : L"0");

            return 0;
        }

        case WM_FLASHPROXY_GET_IDENTITY:
        {
            if (flashProxy != nullptr)
                return (LRESULT)flashProxy->m_identity;

            return 0;
        }

        case WM_FLASHPROXY_GET_ABOUT:
        {
            LONG length = 0;

            if (flashProxy != nullptr && flashProxy->m_aboutQuery.Length() > 0)
            {
                if (lParam != 0 && wParam > 0)
                {
                    WCHAR *buff = (WCHAR*)lParam;
                    if (wcscpy_s(buff, wParam / sizeof(WCHAR), flashProxy->m_aboutQuery) == 0)
                        length = wcslen(buff);
                }
                else
                    length = flashProxy->m_aboutQuery.Length();
            }

            return length;
        }

        case WM_MOUSEMOVE:
        {
            if (flashProxy != nullptr && GetCapture() == hWnd)
            {
                HWND clientWnd = flashProxy->m_clientWnd;

                POINT point = {GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam)};
                ClientToScreen(hWnd, &point);
                ScreenToClient(clientWnd, &point);

                SendMessage(clientWnd, WM_MOUSEMOVE, 0, MAKELPARAM(point.x, point.y));

                return 0;
            }

            break;
        }

        case WM_LBUTTONUP:
        {
            if (flashProxy != nullptr && GetCapture() == hWnd)
            {
                HWND clientWnd = flashProxy->m_clientWnd;

                POINT point = {GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam)};
                ClientToScreen(hWnd, &point);
                ScreenToClient(clientWnd, &point);

                ReleaseCapture();
                SendMessage(clientWnd, WM_LBUTTONUP, 0, MAKELPARAM(point.x, point.y));

                return 0;
            }

            break;
        }

        case WM_CAPTURECHANGED:
        {
            if (flashProxy != nullptr && flashProxy->m_inplaceSite != nullptr)
                flashProxy->m_inplaceSite->SetCapture(false);

            return 0;
        }
    }

    return DefWindowProc(hWnd, Msg, wParam, lParam);
}