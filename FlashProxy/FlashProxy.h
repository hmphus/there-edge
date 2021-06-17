#pragma once

using namespace ATL;
using namespace Microsoft::WRL;

void Log(const WCHAR *format, ...);

class FlashProxyModule: public ATL::CAtlDllModuleT<FlashProxyModule>,
                        public IClassFactoryEx,
                        public IQuickActivate,
                        public IConnectionPointContainer,
                        public IConnectionPoint,
                        public IOleObject,
                        public IOleInPlaceObjectWindowless,
                        public IViewObjectEx,
                        public ISupportErrorInfo,
                        public IThereEdgeShockwaveFlash,
                        public ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler,
                        public ICoreWebView2CreateCoreWebView2ControllerCompletedHandler
{
public:
    DECLARE_LIBID(LIBID_FlashProxyLib)
    DECLARE_REGISTRY_APPID_RESOURCEID(IDR_FLASHPROXY, "{682E7C31-6CE3-4FB3-9883-479ED34CB1B9}")

    enum class Identity: UINT32
    {
        Unknown     = 0x00,
        Teleport    = 0x01,
        ShortcutBar = 0x02,
        FunFinder   = 0x04,
        EmotionsBar = 0x08,
        MessageBar  = 0x10,
    };

    static WCHAR g_WindowClassName[];

    FlashProxyModule();
    virtual ~FlashProxyModule();

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

protected:
    virtual HRESULT STDMETHODCALLTYPE CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv) override;
    virtual HRESULT STDMETHODCALLTYPE CreateInstanceWithContext(IUnknown *punkContext, IUnknown *punkOuter, REFIID riid, void **ppv) override;
    virtual HRESULT STDMETHODCALLTYPE LockServer(BOOL fLock) override;
    virtual HRESULT STDMETHODCALLTYPE QuickActivate(QACONTAINER *pQaContainer, QACONTROL *pQaControl) override;
    virtual HRESULT STDMETHODCALLTYPE SetContentExtent(LPSIZEL pSizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetContentExtent(LPSIZEL pSizel) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnectionPoints(IEnumConnectionPoints **ppEnum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP) override;
    virtual HRESULT STDMETHODCALLTYPE GetConnectionInterface(IID *pIID) override;
    virtual HRESULT STDMETHODCALLTYPE GetConnectionPointContainer(IConnectionPointContainer **ppCPC) override;
    virtual HRESULT STDMETHODCALLTYPE Advise(IUnknown *pUnkSink, DWORD *pdwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE Unadvise(DWORD dwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnections(IEnumConnections **ppEnum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetClientSite(IOleClientSite *pClientSite) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetClientSite(IOleClientSite **ppClientSite) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetHostNames(LPCOLESTR szContainerApp, LPCOLESTR szContainerObj) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Close(DWORD dwSaveOption) override;
    virtual HRESULT STDMETHODCALLTYPE SetMoniker(DWORD dwWhichMoniker, IMoniker *pmk) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetMoniker(DWORD dwAssign, DWORD dwWhichMoniker, IMoniker **ppmk) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE InitFromData(IDataObject *pDataObject, BOOL fCreation, DWORD dwReserved) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetClipboardData(DWORD dwReserved, IDataObject **ppDataObject) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect) override;
    virtual HRESULT STDMETHODCALLTYPE EnumVerbs(IEnumOLEVERB **ppEnumOleVerb) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Update() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE IsUpToDate() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetUserClassID(CLSID *pClsid) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetUserType(DWORD dwFormOfType, LPOLESTR *pszUserType) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetExtent(DWORD dwDrawAspect, SIZEL *psizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, SIZEL *psizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Advise(IAdviseSink *pAdvSink, DWORD *pdwConnection) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE EnumAdvise(IEnumSTATDATA **ppenumAdvise) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetMiscStatus(DWORD dwAspect, DWORD *pdwStatus) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetColorScheme(LOGPALETTE *pLogpal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetWindow(HWND *phwnd) override;
    virtual HRESULT STDMETHODCALLTYPE ContextSensitiveHelp(BOOL fEnterMode) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE InPlaceDeactivate() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE UIDeactivate() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect) override;
    virtual HRESULT STDMETHODCALLTYPE ReactivateAndUndo() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetDropTarget(IDropTarget **ppDropTarget) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                           HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                           BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue) override;
    virtual HRESULT STDMETHODCALLTYPE GetColorSet(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                  HDC hicTargetDev, LOGPALETTE **ppColorSet) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Freeze(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DWORD *pdwFreeze) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Unfreeze(DWORD dwFreeze) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetAdvise(DWORD aspects, DWORD advf, IAdviseSink *pAdvSink) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetAdvise(DWORD *pAspects, DWORD *pAdvf, IAdviseSink **ppAdvSink) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, LONG lindex, DVTARGETDEVICE *ptd, LPSIZEL lpsizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetRect(DWORD dwAspect, LPRECTL pRect) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetViewStatus(DWORD *pdwStatus) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult) override;
    virtual HRESULT STDMETHODCALLTYPE QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetNaturalExtent(DWORD dwAspect, LONG lindex, DVTARGETDEVICE *ptd,
                                                       HDC hicTargetDev, DVEXTENTINFO *pExtentInfo, LPSIZEL pSizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE InterfaceSupportsErrorInfo(REFIID riid) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount(UINT *pctinfo) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                             VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_ReadyState(long *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_TotalFrames(long *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Playing(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Playing(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Quality(int *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Quality(int pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_ScaleMode(int *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_ScaleMode(int pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_AlignMode(int *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_AlignMode(int pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_BackgroundColor(long *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_BackgroundColor(long pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Loop(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Loop(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Movie(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Movie(BSTR pVal) override;
    virtual HRESULT STDMETHODCALLTYPE get_FrameNum(long *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_FrameNum(long pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetZoomRect(long left, long top, long right, long bottom) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Zoom(int factor) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Pan(long x, long y, int mode) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Play() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Stop() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Back() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Forward() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Rewind() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE StopPlay() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GotoFrame(long FrameNum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE CurrentFrame(long *FrameNum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE IsPlaying(VARIANT_BOOL *Playing) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE PercentLoaded(long *percent) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE FrameLoaded(long FrameNum, VARIANT_BOOL *loaded) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE FlashVersion(long *version) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_WMode(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_WMode(BSTR pVal) override;
    virtual HRESULT STDMETHODCALLTYPE get_SAlign(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_SAlign(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Menu(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Menu(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Base(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Base(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Scale(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Scale(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_DeviceFont(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_DeviceFont(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_EmbedMovie(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_EmbedMovie(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_BGColor(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_BGColor(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Quality2(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Quality2(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE LoadMovie(int layer, BSTR url) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TGotoFrame(BSTR target, long FrameNum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TGotoLabel(BSTR target, BSTR label) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TCurrentFrame(BSTR target, long *FrameNum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TCurrentLabel(BSTR target, BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TPlay(BSTR target) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TStopPlay(BSTR target) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetVariable(BSTR name, BSTR value) override;
    virtual HRESULT STDMETHODCALLTYPE GetVariable(BSTR name, BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TSetProperty(BSTR target, int property, BSTR value) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TGetProperty(BSTR target, int property, BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TCallFrame(BSTR target, int FrameNum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TCallLabel(BSTR target, BSTR label) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TSetPropertyNum(BSTR target, int property, double value) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TGetPropertyNum(BSTR target, int property, double *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TGetPropertyAsNumber(BSTR target, int property, double *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_SWRemote(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_SWRemote(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_FlashVars(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_FlashVars(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_AllowScriptAccess(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_AllowScriptAccess(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_MovieData(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_MovieData(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_InlineData(IUnknown **ppIUnknown) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_InlineData(IUnknown *ppIUnknown) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_SeamlessTabbing(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_SeamlessTabbing(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE EnforceLocalSecurity() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_Profile(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_Profile(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_ProfileAddress(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_ProfileAddress(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_ProfilePort(long *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_ProfilePort(long pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE CallFunction(BSTR request, BSTR *response) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetReturnValue(BSTR returnValue) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE DisableLocalSecurity() override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_AllowNetworking(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_AllowNetworking(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_AllowFullScreen(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_AllowFullScreen(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_AllowFullScreenInteractive(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_AllowFullScreenInteractive(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_IsDependent(VARIANT_BOOL *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_IsDependent(VARIANT_BOOL pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE get_BrowserZoom(BSTR *pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE put_BrowserZoom(BSTR pVal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Environment *environment) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Controller *controller) override;

protected:
    HRESULT OnWebMessageReceived(ICoreWebView2 *sender, ICoreWebView2WebMessageReceivedEventArgs *args);
    HRESULT OnWebResourceRequested(ICoreWebView2 *sender, ICoreWebView2WebResourceRequestedEventArgs *args);
    HRESULT OnNavigationCompleted(ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args);
    HRESULT Encode(const BSTR in, CComBSTR &out);
    HRESULT Navigate();
    HRESULT SendVariables();
    HRESULT InvokeFlashEvent(const WCHAR *cmd, DISPPARAMS &args, VARIANT *result = nullptr);
    HRESULT SetSize(const SIZE &size);
    HRESULT SetRect(const RECT &rect);
    HRESULT SetMaskRects(WCHAR *text);
    void GuessToolbarVisibility();
    void SetVisibility(UINT32 visibilityMask = ~0);
    BOOL IsToolbar();
    LRESULT BroadcastMessage(UINT Msg, WPARAM wParam, LPARAM lParam);

public:
    static LRESULT APIENTRY ChildWndProc(HWND hWnd, UINT Msg, WPARAM wParam, LPARAM lParam);

protected:
    ULONG                                    m_refCount;
    QACONTAINER                              m_qaContainer;
    QACONTROL                                m_qaControl;
    SIZE                                     m_pos;
    SIZE                                     m_size;
    HWND                                     m_wnd;
    RECT                                     m_maskRects[10];
    LONG                                     m_maskRectCount;
    Identity                                 m_identity;
    CComBSTR                                 m_url;
    CComSafeArray<BSTR>                      m_variables;
    CComPtr<IThereEdgeShockwaveFlashEvents>  m_flashEvents;
    CComPtr<IUnknown>                        m_unknownContext;
    CComPtr<IUnknown>                        m_unknownOuter;
    CComPtr<IServiceProvider>                m_serviceProvider;
    CComPtr<IOleInPlaceSiteWindowless>       m_inplaceSite;
    CComPtr<ICoreWebView2Environment>        m_environment;
    CComPtr<ICoreWebView2Controller2>        m_controller;
    CComPtr<ICoreWebView2>                   m_view;
    EventRegistrationToken                   m_webMessageReceivedToken;
    EventRegistrationToken                   m_webResourceRequestedToken;
    EventRegistrationToken                   m_navigationCompletedToken;
    BOOL                                     m_ready;
    BOOL                                     m_visible;
};
