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
#include "wrl.h"
#include "WebView2.h"
#include "VoiceTrainerProxy.h"

static const GUID IID_IVoiceTrainer = {0x233ACB05, 0x6635, 0x4916, {0x9A, 0x4D, 0x70, 0x27, 0x71, 0x63, 0x05, 0xA5}};
static const GUID IID_IVoiceTrainerEvents = {0xE11C348B, 0xE78C, 0x491E, {0xB9, 0xA9, 0x7B, 0x7F, 0xA7, 0xD9, 0xF7, 0xEE}};

WCHAR VoiceTrainerProxy::g_WindowClassName[] = L"ThereEdgeVoiceTrainer";

VoiceTrainerProxy::VoiceTrainerProxy():
    m_refCount(1),
    m_wnd(nullptr),
    m_voiceTrainer(),
    m_connectionPoint(),
    m_connectionPointID(0)
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

VoiceTrainerProxy::~VoiceTrainerProxy()
{
    if (m_wnd != nullptr)
        DestroyWindow(m_wnd);
}

BOOL VoiceTrainerProxy::Validate(const WCHAR *url)
{
    WCHAR host[40] = {0};
    WCHAR path[1000] = {0};
    URL_COMPONENTS components;
    ZeroMemory(&components, sizeof(components));
    components.dwStructSize = sizeof(components);
    components.lpszHostName = host;
    components.dwHostNameLength = _countof(host);
    components.lpszUrlPath = path;
    components.dwUrlPathLength = _countof(path);

    if (!InternetCrackUrl(url, 0, ICU_DECODE, &components))
        return false;

    if (wcscmp(host, L"webapps.prod.there.com") != 0)
        return false;

    WCHAR *query = wcschr(path, L'?');
    if (query != nullptr)
        *query = 0;

    if (wcscmp(path, L"/VoiceTrainer/Trainer.html") != 0)
        return false;

    return true;
}

HRESULT VoiceTrainerProxy::Init(HWND wnd, ICoreWebView2 *view)
{
    m_wnd = CreateWindow(g_WindowClassName, L"", WS_CHILD, 0, 0, 1, 1, wnd, nullptr, GetModuleHandle(nullptr), nullptr);
    if (m_wnd == nullptr)
        return E_FAIL;

    CComPtr<IUnknown> container;
    CComPtr<IUnknown> control;
    if (FAILED(AtlAxCreateControlEx(L"There.VoiceTrainer", m_wnd, nullptr, &container, &control)) || control == nullptr)
        return E_FAIL;

    CComPtr<IVoiceTrainer> voiceTrainer;
    if (FAILED(control->QueryInterface(IID_IVoiceTrainer, (void**)&voiceTrainer)) || voiceTrainer == nullptr)
        return E_FAIL;

    CComPtr<IConnectionPointContainer> connectionPointContainer;
    if (FAILED(voiceTrainer->QueryInterface(&connectionPointContainer)) || connectionPointContainer == nullptr)
        return E_FAIL;

    CComPtr<IConnectionPoint> connectionPoint;
    if (FAILED(connectionPointContainer->FindConnectionPoint(IID_IVoiceTrainerEvents, &connectionPoint)) || connectionPoint == nullptr)
        return E_FAIL;

    if (FAILED(connectionPoint->Advise(this, &m_connectionPointID)))
        return E_FAIL;

    m_view = view;
    m_voiceTrainer = voiceTrainer;
    m_connectionPoint = connectionPoint;

    return S_OK;
}

HRESULT VoiceTrainerProxy::Close()
{
    if (m_connectionPoint != nullptr)
    {
        m_connectionPoint->Unadvise(m_connectionPointID);
        m_connectionPointID = 0;
        m_connectionPoint.Release();
    }

    if (m_voiceTrainer != nullptr)
    {
        m_voiceTrainer->Cancel();
        m_voiceTrainer.Release();
    }

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::QueryInterface(REFIID riid, void **object)
{
    if (IsEqualIID(riid, IID_IVoiceTrainerEvents))
    {
        AddRef();
        *object = static_cast<IVoiceTrainerEvents*>(this);
        return S_OK;
    }

    *object = nullptr;
    return E_NOINTERFACE;
}

ULONG STDMETHODCALLTYPE VoiceTrainerProxy::AddRef()
{
    return ++m_refCount;
}

ULONG STDMETHODCALLTYPE VoiceTrainerProxy::Release()
{
    ULONG refCount = m_refCount--;

    if (refCount == 0)
        delete this;

    return refCount;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::GetTypeInfoCount(UINT *pctinfo)
{
    *pctinfo = 0;
    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo)
{
    return E_NOTIMPL;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId)
{
    return DISP_E_UNKNOWNNAME;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                                    VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr)
{
    switch (dispIdMember)
    {
        case 1:
            return OnBeginRecord();
        case 2:
            return OnEndRecord();
        case 3:
            return OnLevelChange();
        case 4:
            return OnConfigStateChange();
        case 5:
            return OnConfigMessage();
        case 6:
            return OnConfigError();
        default:
            return E_NOINTERFACE;
    }
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnBeginRecord()
{
    if (m_view == nullptr)
        return E_FAIL;

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onbeginrecord")))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnEndRecord()
{
    if (m_view == nullptr)
        return E_FAIL;

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onendrecord")))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnLevelChange()
{
    if (m_view == nullptr || m_voiceTrainer == nullptr)
        return E_FAIL;

    long value;
    if (FAILED(m_voiceTrainer->get_RecordLevel(&value)))
        return E_FAIL;

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onlevelchange", L"recordLevel", value)))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnConfigStateChange()
{
    if (m_view == nullptr || m_voiceTrainer == nullptr)
        return E_FAIL;

    long value;
    if (FAILED(m_voiceTrainer->get_ConfigState(&value)))
        return E_FAIL;

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onconfigstatechange", L"configState", value)))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnConfigMessage()
{
    if (m_view == nullptr || m_voiceTrainer == nullptr)
        return E_FAIL;

    CComBSTR bvalue;
    {
        WCHAR *value = nullptr;
        if (FAILED(m_voiceTrainer->get_ConfigMessage(&value)))
            return E_FAIL;

        bvalue = value;
        CoTaskMemFree(value);
    }

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onconfigmessage", L"configMessage", bvalue)))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT STDMETHODCALLTYPE VoiceTrainerProxy::OnConfigError()
{
    if (m_view == nullptr || m_voiceTrainer == nullptr)
        return E_FAIL;

    CComBSTR bvalue;
    {
        WCHAR *value = nullptr;
        if (FAILED(m_voiceTrainer->get_ConfigError(&value)))
            return E_FAIL;

        bvalue = value;
        CoTaskMemFree(value);
    }

    WCHAR json[1000];
    if (FAILED(FormatBasicJson(json, _countof(json), L"onconfigerror", L"configError", bvalue)))
        return E_FAIL;

    if (FAILED(m_view->PostWebMessageAsJson(json)))
        return E_FAIL;

    return S_OK;
}

HRESULT VoiceTrainerProxy::ProcessMessage(const WCHAR *path, const WCHAR *query)
{
    if (m_voiceTrainer == nullptr)
        return E_FAIL;

    if (_wcsicmp(path, L"init") == 0)
    {
        if (FAILED(m_voiceTrainer->Init()))
            return E_FAIL;

        return S_OK;
    }

    if (_wcsicmp(path, L"launchrecordingmixer") == 0)
    {
        if (FAILED(m_voiceTrainer->LaunchRecordingMixer()))
            return E_FAIL;

        return S_OK;
    }

    if (_wcsicmp(path, L"put") == 0)
    {
        WCHAR key[100] = {0};
        if (wcscpy_s(key, query) != 0)
            return E_FAIL;

        WCHAR *value = wcschr(key, L'=');
        if (value == nullptr)
            return E_FAIL;

        *value = 0;
        value++;

        if (_wcsicmp(key, L"configstate") == 0)
        {
            if (FAILED(m_voiceTrainer->put_ConfigState(_wtol(value))))
                return E_FAIL;

            return S_OK;
        }

        if (_wcsicmp(key, L"preprocess") == 0)
        {
            if (FAILED(m_voiceTrainer->put_Preprocess(_wtol(value) == 0 ? VARIANT_FALSE : VARIANT_TRUE)))
                return E_FAIL;

            return S_OK;
        }

        return E_FAIL;
    }

    return E_FAIL;
}

HRESULT VoiceTrainerProxy::FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event)
{
    static WCHAR *format = L"{\"name\":\"VoiceTrainer\""
                           L",\"event\":\"%s\""
                           L"}";

    if (swprintf_s(json, size, format, event) < 0)
        return E_FAIL;

    return S_OK;
}

HRESULT VoiceTrainerProxy::FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event, const WCHAR *key, LONG value)
{
    static WCHAR *format = L"{\"name\":\"VoiceTrainer\""
                           L",\"event\":\"%s\""
                           L",\"data\":{\"%s\":%ld}"
                           L"}";

    if (swprintf_s(json, size, format, event, key, value) < 0)
        return E_FAIL;

    return S_OK;
}

HRESULT VoiceTrainerProxy::FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event, const WCHAR *key, const WCHAR *value)
{
    // FIXME: Encode the value

    static WCHAR *format = L"{\"name\": \"VoiceTrainer\""
                           L",\"event\": \"%s\""
                           L",\"data\": {\"%s\": \"%s\"}"
                           L"}";

    if (swprintf_s(json, size, format, event, key, value) < 0)
        return E_FAIL;

    return S_OK;
}