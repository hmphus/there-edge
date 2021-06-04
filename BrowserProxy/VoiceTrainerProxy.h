#pragma once

using namespace ATL;
using namespace Microsoft::WRL;

void Log(const WCHAR *format, ...);

class IVoiceTrainer: public IDispatch
{
public:
    virtual HRESULT STDMETHODCALLTYPE Init() = 0;
    virtual HRESULT STDMETHODCALLTYPE put_ConfigState(long Config) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_ConfigState(long *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_RecordLevel(long *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_ConfigMessage(BSTR *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_ConfigError(BSTR *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE Cancel() = 0;
    virtual HRESULT STDMETHODCALLTYPE get_Preprocess(long *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE put_Preprocess(long pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE get_SupportsPreprocess(VARIANT_BOOL *pVal) = 0;
    virtual HRESULT STDMETHODCALLTYPE LaunchRecordingMixer() = 0;
};

class IVoiceTrainerEvents: public IDispatch
{
public:
    virtual HRESULT STDMETHODCALLTYPE OnBeginRecord() = 0;
    virtual HRESULT STDMETHODCALLTYPE OnEndRecord() = 0;
    virtual HRESULT STDMETHODCALLTYPE OnLevelChange() = 0;
    virtual HRESULT STDMETHODCALLTYPE OnConfigStateChange() = 0;
    virtual HRESULT STDMETHODCALLTYPE OnConfigMessage() = 0;
    virtual HRESULT STDMETHODCALLTYPE OnConfigError() = 0;
};

class VoiceTrainerProxy: public IVoiceTrainerEvents
{
public:
    static WCHAR g_WindowClassName[];

    VoiceTrainerProxy();
    virtual ~VoiceTrainerProxy();

    static BOOL Validate(const WCHAR *url);

    HRESULT Init(HWND wnd, ICoreWebView2 *view);
    HRESULT Close();

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

protected:
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount(UINT *pctinfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                             VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr) override;
    virtual HRESULT STDMETHODCALLTYPE OnBeginRecord() override;
    virtual HRESULT STDMETHODCALLTYPE OnEndRecord() override;
    virtual HRESULT STDMETHODCALLTYPE OnLevelChange() override;
    virtual HRESULT STDMETHODCALLTYPE OnConfigStateChange() override;
    virtual HRESULT STDMETHODCALLTYPE OnConfigMessage() override;
    virtual HRESULT STDMETHODCALLTYPE OnConfigError() override;

public:
    HRESULT ProcessMessage(const WCHAR *path, const WCHAR *query);

protected:
    HRESULT FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event);
    HRESULT FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event, const WCHAR *key, LONG value);
    HRESULT FormatBasicJson(WCHAR *json, size_t size, const WCHAR *event, const WCHAR *key, const WCHAR *value);

protected:
    ULONG                     m_refCount;
    HWND                      m_wnd;
    CComPtr<ICoreWebView2>    m_view;
    CComPtr<IVoiceTrainer>    m_voiceTrainer;
    CComPtr<IConnectionPoint> m_connectionPoint;
    DWORD                     m_connectionPointID;
};