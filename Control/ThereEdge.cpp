#define _ATL_APARTMENT_THREADED
#define _ATL_NO_AUTOMATIC_NAMESPACE
#define _ATL_CSTRING_EXPLICIT_CONSTRUCTORS
#define ATL_NO_ASSERT_ON_DESTROY_NONEXISTENT_WINDOW

#include "platform.h"
#include "resource.h"
#include "atlbase.h"
#include "atlcom.h"
#include "atlctl.h"
#include "ThereEdge_i.h"
#include "ThereEdge.h"

#pragma warning (disable:28251)

using namespace ATL;

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
    m_punkContext(nullptr),
    m_punkOuter(nullptr),
    m_flashEvents(nullptr),
    m_qaContainer(),
    m_qaControl(),
    m_size()
{
}

CThereEdgeModule::~CThereEdgeModule()
{
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

    *object = NULL;

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

    Log(L"CreateInstance: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
        riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
        riid.Data4[2], riid.Data4[3], riid.Data4[4],
        riid.Data4[5], riid.Data4[6], riid.Data4[7]);

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

    Log(L"CreateInstanceWithContext: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
        riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
        riid.Data4[2], riid.Data4[3], riid.Data4[4],
        riid.Data4[5], riid.Data4[6], riid.Data4[7]);

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
    Log(L"SetContentExtent %ld %ld\n", pSizel->cx, pSizel->cy);
    m_size = *pSizel;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetContentExtent(LPSIZEL pSizel)
{
    *pSizel = m_size;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::EnumConnectionPoints(IEnumConnectionPoints **ppEnum)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP)
{
    if (IsEqualIID(riid, DIID__IShockwaveFlashEvents))
    {
        AddRef();
        *ppCP = static_cast<IConnectionPoint*>(this);
        return S_OK;
    }

    Log(L"FindConnectionPoint: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
        riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
        riid.Data4[2], riid.Data4[3], riid.Data4[4],
        riid.Data4[5], riid.Data4[6], riid.Data4[7]);

    return E_NOINTERFACE;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetConnectionInterface(IID *pIID)
{
    *pIID = DIID__IShockwaveFlashEvents;
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
    if (SUCCEEDED(pUnkSink->QueryInterface(DIID__IShockwaveFlashEvents, (void**)&m_flashEvents)))
    {
        m_flashEvents->AddRef();
        *pdwCookie = (DWORD)&m_flashEvents;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Unadvise(DWORD dwCookie)
{
    if (dwCookie == (DWORD)&m_flashEvents && m_flashEvents != nullptr)
    {
        m_flashEvents->Release();
        m_flashEvents = nullptr;
        return S_OK;
    }

    return E_FAIL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::EnumConnections(IEnumConnections **ppEnum)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetClientSite(IOleClientSite *pClientSite)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetClientSite(IOleClientSite **ppClientSite)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetHostNames(LPCOLESTR szContainerApp, LPCOLESTR szContainerObj)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Close(DWORD dwSaveOption)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetMoniker(DWORD dwWhichMoniker, IMoniker *pmk)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetMoniker(DWORD dwAssign, DWORD dwWhichMoniker, IMoniker **ppmk)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::InitFromData(IDataObject *pDataObject, BOOL fCreation, DWORD dwReserved)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetClipboardData(DWORD dwReserved, IDataObject **ppDataObject)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::EnumVerbs( IEnumOLEVERB **ppEnumOleVerb)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Update()
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::IsUpToDate()
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetUserClassID(CLSID *pClsid)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetUserType(DWORD dwFormOfType, LPOLESTR *pszUserType)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetExtent(DWORD dwDrawAspect, SIZEL *psizel)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetExtent(DWORD dwDrawAspect, SIZEL *psizel)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Advise(IAdviseSink *pAdvSink, DWORD *pdwConnection)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::EnumAdvise(IEnumSTATDATA **ppenumAdvise)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetMiscStatus(DWORD dwAspect, DWORD *pdwStatus)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetColorScheme(LOGPALETTE *pLogpal)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetWindow(HWND *phwnd)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::ContextSensitiveHelp(BOOL fEnterMode)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::InPlaceDeactivate()
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::UIDeactivate()
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::ReactivateAndUndo()
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetDropTarget(IDropTarget **ppDropTarget)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                 HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                 BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetColorSet(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd, HDC hicTargetDev, LOGPALETTE **ppColorSet)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Freeze(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DWORD *pdwFreeze)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Unfreeze(DWORD dwFreeze)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetAdvise(DWORD aspects, DWORD advf, IAdviseSink *pAdvSink)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetAdvise(DWORD *pAspects, DWORD *pAdvf, IAdviseSink **ppAdvSink)
{
    return E_NOTIMPL;
}    

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetExtent(DWORD dwDrawAspect, LONG lindex, DVTARGETDEVICE *ptd, LPSIZEL lpsizel)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetRect(DWORD dwAspect, LPRECTL pRect)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetViewStatus(DWORD *pdwStatus)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetNaturalExtent(DWORD dwAspect, LONG lindex, DVTARGETDEVICE *ptd, HDC hicTargetDev, DVEXTENTINFO *pExtentInfo, LPSIZEL pSizel)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetTypeInfoCount(UINT *pctinfo)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                                   VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::put_Movie(BSTR pVal)
{
    Log(L"Movie %s\n", pVal);

    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::put_WMode(BSTR pVal)
{
    Log(L"WMode %s\n", pVal);

    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::SetVariable(BSTR name, BSTR value)
{
    Log(L"SetVariable %s %s\n", name, value);

    return E_NOTIMPL;
}