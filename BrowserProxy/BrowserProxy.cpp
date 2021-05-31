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
#include "exdispid.h"
#include "WebView2.h"
#include "BrowserProxy_i.h"
#include "BrowserProxy.h"

BrowserProxyModule g_AtlModule;

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

BrowserProxyModule::BrowserProxyModule():
    m_refCount(1),
    m_size(),
    m_wnd(nullptr),
    m_url(),
    m_browserEvents(),
    m_unknownSite(),
    m_clientSite(),
    m_environment(),
    m_controller(),
    m_view(),
    m_navigationStartingToken(),
    m_navigationCompletedToken(),
    m_ready(false),
    m_visible(true)
{
}

BrowserProxyModule::~BrowserProxyModule()

{
    if (m_view != nullptr)
    {
        m_view->remove_NavigationStarting(m_navigationStartingToken);
        m_view->remove_NavigationCompleted(m_navigationCompletedToken);
    }

    if (m_controller != nullptr)
        m_controller->Close();
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::QueryInterface(REFIID riid, void **object)
{
    if (IsEqualIID(riid, IID_IUnknown))
    {
        AddRef();
        *object = static_cast<IClassFactory*>(this);
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

    if (IsEqualIID(riid, IID_IObjectWithSite))
    {
        AddRef();
        *object = static_cast<IObjectWithSite*>(this);
        return S_OK;
    }

    if (IsEqualIID(riid, IID_IOleInPlaceActiveObject))
    {
        AddRef();
        *object = static_cast<IOleInPlaceActiveObject*>(this);
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

    if (IsEqualIID(riid, IID_IThereEdgeWebBrowser2))
    {
        AddRef();
        *object = static_cast<IThereEdgeWebBrowser2*>(this);
        return S_OK;
    }

    Log(L"QueryInterface: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
        riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
        riid.Data4[2], riid.Data4[3], riid.Data4[4],
        riid.Data4[5], riid.Data4[6], riid.Data4[7]);

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE BrowserProxyModule::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE BrowserProxyModule::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv)
{
    if (IsEqualIID(riid, IID_IUnknown))
    {
        auto module = new BrowserProxyModule();
        if (module == nullptr)
            return E_FAIL;

        *ppv = static_cast<IClassFactoryEx*>(module);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::LockServer(BOOL fLock)
{
    if (fLock)
        m_nLockCnt++;
    else
        m_nLockCnt--;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP)
{
    if (IsEqualIID(riid, DIID_IThereEdgeWebBrowserEvents2))
    {
        AddRef();
        *ppCP = static_cast<IConnectionPoint*>(this);
        return S_OK;
    }

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Advise(IUnknown *pUnkSink, DWORD *pdwCookie)
{
    if (pUnkSink == nullptr || pdwCookie == nullptr)
        return E_INVALIDARG;

    if (SUCCEEDED(pUnkSink->QueryInterface(&m_browserEvents)))
    {
        *pdwCookie = (DWORD)&m_browserEvents;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Unadvise(DWORD dwCookie)
{
    if (dwCookie == (DWORD)&m_browserEvents && m_browserEvents != nullptr)
    {
        m_browserEvents.Release();
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::SetClientSite(IOleClientSite *pClientSite)
{
    m_clientSite = pClientSite;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetClientSite(IOleClientSite **ppClientSite)
{
    if (ppClientSite == nullptr)
        return E_INVALIDARG;

    if (FAILED(m_clientSite.CopyTo(ppClientSite)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::SetHostNames(LPCOLESTR szContainerApp, LPCOLESTR szContainerObj)
{
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Close(DWORD dwSaveOption)
{
    if (m_controller != nullptr)
        m_controller->Close();

    Release();
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect)
{
    switch (iVerb)
    {
        case OLEIVERB_INPLACEACTIVATE:
        {
            if (m_environment != nullptr)
                return S_OK;

            if (hwndParent == nullptr)
                return E_INVALIDARG;

            if (pActiveSite == nullptr)
                return E_INVALIDARG;

            if (lprcPosRect == nullptr)
                return E_INVALIDARG;

            m_wnd = hwndParent;

            SetRect(*lprcPosRect);

            if (FAILED(CreateCoreWebView2Environment(this)))
                return E_FAIL;

            return S_OK;
        }
        default:
            return E_NOTIMPL;
    }
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::SetExtent(DWORD dwDrawAspect, SIZEL *psizel)
{
    if (dwDrawAspect != DVASPECT_CONTENT || psizel == nullptr)
        return E_INVALIDARG;

    SetSize(*psizel);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetExtent(DWORD dwDrawAspect, SIZEL *psizel)
{
    if (dwDrawAspect != DVASPECT_CONTENT || psizel == nullptr)
        return E_INVALIDARG;

    *psizel = m_size;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetMiscStatus(DWORD dwAspect, DWORD *pdwStatus)
{
    if (dwAspect != DVASPECT_CONTENT || pdwStatus == nullptr)
        return E_INVALIDARG;

    *pdwStatus = 0;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::SetSite(IUnknown *pUnkSite)
{
    if (pUnkSite == nullptr)
        return E_INVALIDARG;

    m_unknownSite = pUnkSite;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetSite(REFIID riid, void **ppvSite)
{
    if (ppvSite == nullptr)
        return E_INVALIDARG;

    if (FAILED(m_unknownSite.CopyTo((IUnknown**)ppvSite)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetWindow(HWND *phwnd)
{
    if (phwnd == nullptr)
        return E_INVALIDARG;

    *phwnd = m_wnd;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::TranslateAccelerator(LPMSG lpmsg)
{
    Log(L"TranslateAccelerator\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::OnFrameWindowActivate(BOOL fActivate)
{
    Log(L"OnFrameWindowActivate\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::OnDocWindowActivate(BOOL fActivate)
{
    Log(L"OnDocWindowActivate\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::ResizeBorder(LPCRECT prcBorder, IOleInPlaceUIWindow *pUIWindow, BOOL fFrameWindow)
{
    Log(L"ResizeBorder\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::EnableModeless(BOOL fEnable)
{
    Log(L"EnableModeless\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                   HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                   BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    Log(L"Draw\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetColorSet(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                          HDC hicTargetDev, LOGPALETTE **ppColorSet)
{
    Log(L"GetColorSet\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    Log(L"QueryHitPoint\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult)
{
    Log(L"QueryHitRect\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetTypeInfoCount(UINT *pctinfo)
{
    Log(L"GetTypeInfoCount\n");
    *pctinfo = 0;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo)
{
    Log(L"GetTypeInfo\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId)
{
    Log(L"GetIDsOfNames\n");
    return DISP_E_UNKNOWNNAME;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                                     VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr)
{
    Log(L"Invoke\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GoBack()
{
    Log(L"GoBack\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GoForward()
{
    Log(L"GoForward\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GoHome()
{
    Log(L"GoHome\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GoSearch()
{
    Log(L"GoSearch\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Navigate(BSTR URL, VARIANT *Flags, VARIANT *TargetFrameName, VARIANT *PostData, VARIANT *Headers)
{
    Log(L"Navigate\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Refresh()
{
    Log(L"Refresh\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Refresh2(VARIANT *Level)
{
    Log(L"Refresh2\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Stop()
{
    Log(L"Stop\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Application(IDispatch **ppDisp)
{
    Log(L"get_Application\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Parent(IDispatch **ppDisp)
{
    Log(L"get_Parent\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Container(IDispatch **ppDisp)
{
    Log(L"get_Container\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Document(IDispatch **ppDisp)
{
    Log(L"get_Document\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_TopLevelContainer(VARIANT_BOOL *pBool)
{
    Log(L"get_TopLevelContainer\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Type(BSTR *Type)
{
    Log(L"get_Type\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Left(long *pl)
{
    Log(L"get_Left\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Left(long Left)
{
    Log(L"put_Left\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Top(long *pl)
{
    Log(L"get_Top\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Top(long Top)
{
    Log(L"put_Top\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Width(long *pl)
{
    Log(L"get_Width\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Width(long Width)
{
    Log(L"put_Width\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Height(long *pl)
{
    Log(L"get_Height\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Height(long Height)
{
    Log(L"put_Height\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_LocationName(BSTR *LocationName)
{
    Log(L"get_LocationName\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_LocationURL(BSTR *LocationURL)
{
    Log(L"get_LocationURL\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Busy(VARIANT_BOOL *pBool)
{
    Log(L"get_Busy\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Quit()
{
    Log(L"Quit\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::ClientToWindow(int *pcx, int *pcy)
{
    Log(L"ClientToWindow\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::PutProperty(BSTR Property, VARIANT vtValue)
{
    Log(L"PutProperty\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::GetProperty(BSTR Property, VARIANT *pvtValue)
{
    Log(L"GetProperty\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Name(BSTR *Name)
{
    Log(L"get_Name\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_HWND(SHANDLE_PTR *pHWND)
{
    Log(L"get_HWND\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_FullName(BSTR *FullName)
{
    Log(L"get_FullName\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Path(BSTR *Path)
{
    Log(L"get_Path\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Visible(VARIANT_BOOL *pBool)
{
    if (pBool == nullptr)
        return E_INVALIDARG;

    *pBool = m_visible ? VARIANT_TRUE : VARIANT_FALSE;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Visible(VARIANT_BOOL Value)
{
    if (FAILED(SetVisibility(Value != VARIANT_FALSE)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_StatusBar(VARIANT_BOOL *pBool)
{
    Log(L"get_StatusBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_StatusBar(VARIANT_BOOL Value)
{
    Log(L"put_StatusBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_StatusText(BSTR *StatusText)
{
    Log(L"get_StatusText\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_StatusText(BSTR StatusText)
{
    Log(L"put_StatusText\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_ToolBar(int *Value)
{
    Log(L"get_ToolBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_ToolBar(int Value)
{
    Log(L"put_ToolBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_MenuBar(VARIANT_BOOL *Value)
{
    Log(L"get_MenuBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_MenuBar(VARIANT_BOOL Value)
{
    Log(L"put_MenuBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_FullScreen(VARIANT_BOOL *pbFullScreen)
{
    Log(L"get_FullScreen\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_FullScreen(VARIANT_BOOL bFullScreen)
{
    Log(L"put_FullScreen\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Navigate2(VARIANT *URL, VARIANT *Flags, VARIANT *TargetFrameName, VARIANT *PostData, VARIANT *Headers)
{
    if (URL == nullptr || URL->vt != VT_BSTR)
        return E_INVALIDARG;

    m_url = URL->bstrVal;

    if (FAILED(Navigate()))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::QueryStatusWB(OLECMDID cmdID, OLECMDF *pcmdf)
{
    Log(L"QueryStatusWB\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::ExecWB(OLECMDID cmdID, OLECMDEXECOPT cmdexecopt, VARIANT *pvaIn, VARIANT *pvaOut)
{
    Log(L"ExecWB\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::ShowBrowserBar(VARIANT *pvaClsid, VARIANT *pvarShow, VARIANT *pvarSize)
{
    Log(L"ShowBrowserBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_ReadyState(READYSTATE *plReadyState)
{
    Log(L"get_ReadyState\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Offline(VARIANT_BOOL *pbOffline)
{
    Log(L"get_Offline\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Offline(VARIANT_BOOL bOffline)
{
    Log(L"put_Offline\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Silent(VARIANT_BOOL *pbSilent)
{
    Log(L"get_Silent\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Silent(VARIANT_BOOL bSilent)
{
    Log(L"put_Silent\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_RegisterAsBrowser(VARIANT_BOOL *pbRegister)
{
    Log(L"get_RegisterAsBrowser\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_RegisterAsBrowser(VARIANT_BOOL bRegister)
{
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_RegisterAsDropTarget(VARIANT_BOOL *pbRegister)
{
    Log(L"get_RegisterAsDropTarget\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_RegisterAsDropTarget(VARIANT_BOOL bRegister)
{
    Log(L"put_RegisterAsDropTarget\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_TheaterMode(VARIANT_BOOL *pbRegister)
{
    Log(L"get_TheaterMode\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_TheaterMode(VARIANT_BOOL bRegister)
{
    Log(L"put_TheaterMode\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_AddressBar(VARIANT_BOOL *Value)
{
    Log(L"get_AddressBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_AddressBar(VARIANT_BOOL Value)
{
    Log(L"put_AddressBar\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::get_Resizable(VARIANT_BOOL *Value)
{
    Log(L"get_Resizable\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::put_Resizable(VARIANT_BOOL Value)
{
    Log(L"put_Resizable\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Invoke(HRESULT errorCode, ICoreWebView2Environment *environment)
{
    if (environment == nullptr)
        return E_INVALIDARG;

    m_environment = environment;
    m_environment->CreateCoreWebView2Controller(m_wnd, this);
    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Invoke(HRESULT errorCode, ICoreWebView2Controller *controller)
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

    settings->put_AreDevToolsEnabled(true);
    settings->put_AreDefaultContextMenusEnabled(true);
    settings->put_AreDefaultScriptDialogsEnabled(true);
    settings->put_IsBuiltInErrorPageEnabled(true);
    settings->put_IsStatusBarEnabled(false);
    settings->put_IsZoomControlEnabled(false);
    settings->put_AreHostObjectsAllowed(false);
    settings->put_IsScriptEnabled(true);
    settings->put_IsWebMessageEnabled(false);

    RECT bounds;
    GetClientRect(m_wnd, &bounds);
    m_controller->put_Bounds(bounds);

    m_controller->put_IsVisible(m_visible);

    m_view->add_NavigationStarting(this, &m_navigationStartingToken);
    m_view->add_NavigationCompleted(this, &m_navigationCompletedToken);

    if (FAILED(Navigate()))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Invoke(ICoreWebView2 *sender,  ICoreWebView2NavigationStartingEventArgs *args)
{
    if (args == nullptr)
        return E_INVALIDARG;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE BrowserProxyModule::Invoke(ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args)
{
    if (args == nullptr)
        return E_INVALIDARG;

    BOOL success = false;
    args->get_IsSuccess(&success);

    if (success)
    {
        m_ready = true;

        VARIANT vurl;
        vurl.vt = VT_BSTR;
        vurl.bstrVal = m_url;

        VARIANTARG vargs[2];
        vargs[0].vt = VT_VARIANT | VT_BYREF;
        vargs[0].pvarVal = &vurl;
        vargs[1].vt = VT_DISPATCH;
        vargs[1].pdispVal = static_cast<IDispatch*>(this);

        DISPPARAMS params;
        params.rgvarg = vargs;
        params.cArgs = 2;
        params.cNamedArgs = 0;

        if (FAILED(InvokeBrowserEvent(DISPID_NAVIGATECOMPLETE2, params)))
            return E_FAIL;
    }

    return S_OK;
}

HRESULT BrowserProxyModule::Navigate()
{
    if (m_url.Length() == 0)
        return S_OK;

    if (m_view == nullptr)
        return S_OK;

    if (FAILED(m_view->Navigate(m_url)))
        return E_FAIL;

    return S_OK;
}

HRESULT BrowserProxyModule::InvokeBrowserEvent(DISPID id, DISPPARAMS &params, VARIANT *result)
{
    if (m_browserEvents == nullptr)
        return E_FAIL;

    if (FAILED(m_browserEvents->Invoke(id, DIID_IThereEdgeWebBrowserEvents2, LOCALE_SYSTEM_DEFAULT, DISPATCH_METHOD, &params, result, nullptr, nullptr)))
       return E_FAIL;

    return S_OK;
}

HRESULT BrowserProxyModule::SetSize(const SIZE &size)
{
    RECT rect;
    rect.left = 0;
    rect.top = 0;
    rect.right = rect.left + size.cx;
    rect.bottom = rect.top + size.cy;

    return SetRect(rect);
}

HRESULT BrowserProxyModule::SetRect(const RECT &rect)
{
    UINT flags = SWP_NOMOVE;

    LONG width = rect.right > rect.left ? rect.right - rect.left : 1;
    LONG height= rect.bottom > rect.top ? rect.bottom - rect.top : 1;

    if (width == m_size.cx && height == m_size.cy)
        flags |= SWP_NOSIZE;

    if (flags == (SWP_NOMOVE | SWP_NOSIZE))
        return S_OK;

    m_size.cx = width;
    m_size.cy = height;

    if (m_wnd == nullptr)
        return S_OK;

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

HRESULT BrowserProxyModule::SetVisibility(BOOL visible)
{
    if (visible == m_visible)
        return S_OK;

    m_visible = visible;

    if (m_controller != NULL)
        m_controller->put_IsVisible(visible);

    return S_OK;
}
