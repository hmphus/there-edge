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
    m_flashEvents(nullptr),
    m_punkContext(nullptr),
    m_punkOuter(nullptr),
    m_qaContainer(),
    m_qaControl(),
    m_size()
{
}

CThereEdgeModule::~CThereEdgeModule()
{
    if (m_flashEvents)
        m_flashEvents->Release();

    if (m_punkContext)
        m_punkContext->Release();

    if (m_punkOuter)
        m_punkOuter->Release();
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

    //Log(L"QueryInterface: %08lx-%04x-%04x-%02x%02x-%02x%02x%02x%02x%02x%02x\n",
    //    riid.Data1, riid.Data2, riid.Data3, riid.Data4[0], riid.Data4[1],
    //    riid.Data4[2], riid.Data4[3], riid.Data4[4],
    //    riid.Data4[5], riid.Data4[6], riid.Data4[7]);

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
    if (IsEqualIID(riid, DIID__IShockwaveFlashEvents))
    {
        AddRef();
        *ppCP = static_cast<IConnectionPoint*>(this);
        return S_OK;
    }

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
            Log(L"DoVerb OLEIVERB_INPLACEACTIVATE\n");
            break;
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

HRESULT STDMETHODCALLTYPE CThereEdgeModule::OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult)
{
    Log(L"OnWindowMessage\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                 HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                                 BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue)
{
    Log(L"Draw\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Freeze(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DWORD *pdwFreeze)
{
    Log(L"Freeze\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::Unfreeze(DWORD dwFreeze)
{
    Log(L"Unfreeze\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetExtent(DWORD dwDrawAspect, LONG lindex, DVTARGETDEVICE *ptd, LPSIZEL lpsizel)
{
    Log(L"GetExtent\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetRect(DWORD dwAspect, LPRECTL pRect)
{
    Log(L"GetRect\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::GetViewStatus(DWORD *pdwStatus)
{
    Log(L"GetViewStatus\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult)
{
    Log(L"QueryHitPoint\n");
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE CThereEdgeModule::QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult)
{
    Log(L"QueryHitRect\n");
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