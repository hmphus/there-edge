#pragma once

using namespace ATL;

void Log(const WCHAR *format, ...);

class BrowserProxyModule: public ATL::CAtlDllModuleT<BrowserProxyModule>,
                          public IClassFactoryEx,
                          public IConnectionPointContainer,
                          public IConnectionPoint,
                          public IOleObject,
                          public IObjectWithSite,
                          public IOleInPlaceActiveObject,
                          public IViewObjectEx,
                          public ISupportErrorInfo,
                          public IThereEdgeWebBrowser2,
                          public ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler,
                          public ICoreWebView2CreateCoreWebView2ControllerCompletedHandler,
                          public ICoreWebView2NavigationStartingEventHandler,
                          public ICoreWebView2NavigationCompletedEventHandler
{
public:
    DECLARE_LIBID(LIBID_BrowserProxyLib)
    DECLARE_REGISTRY_APPID_RESOURCEID(IDR_BROWSERPROXY, "{E792F884-FF4C-4563-92FE-ADAEA759F2EA}")

    BrowserProxyModule();
    virtual ~BrowserProxyModule();

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;

protected:
    virtual HRESULT STDMETHODCALLTYPE CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv) override;
    virtual HRESULT STDMETHODCALLTYPE CreateInstanceWithContext(IUnknown *punkContext, IUnknown *punkOuter, REFIID riid, void **ppv) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE LockServer(BOOL fLock) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnectionPoints(IEnumConnectionPoints **ppEnum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP) override;
    virtual HRESULT STDMETHODCALLTYPE GetConnectionInterface(IID *pIID) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetConnectionPointContainer(IConnectionPointContainer **ppCPC) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Advise(IUnknown *pUnkSink, DWORD *pdwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE Unadvise(DWORD dwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnections(IEnumConnections **ppEnum) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetClientSite(IOleClientSite *pClientSite) override;
    virtual HRESULT STDMETHODCALLTYPE GetClientSite(IOleClientSite **ppClientSite) override;
    virtual HRESULT STDMETHODCALLTYPE SetHostNames(LPCOLESTR szContainerApp, LPCOLESTR szContainerObj) override;
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
    virtual HRESULT STDMETHODCALLTYPE SetExtent(DWORD dwDrawAspect, SIZEL *psizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, SIZEL *psizel) override;
    virtual HRESULT STDMETHODCALLTYPE Advise(IAdviseSink *pAdvSink, DWORD *pdwConnection) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE EnumAdvise(IEnumSTATDATA **ppenumAdvise) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetMiscStatus(DWORD dwAspect, DWORD *pdwStatus) override;
    virtual HRESULT STDMETHODCALLTYPE SetColorScheme(LOGPALETTE *pLogpal) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetSite(IUnknown *pUnkSite) override;
    virtual HRESULT STDMETHODCALLTYPE GetSite(REFIID riid, void **ppvSite) override;
    virtual HRESULT STDMETHODCALLTYPE GetWindow(HWND *phwnd) override;
    virtual HRESULT STDMETHODCALLTYPE ContextSensitiveHelp(BOOL fEnterMode) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE TranslateAccelerator(LPMSG lpmsg) override;
    virtual HRESULT STDMETHODCALLTYPE OnFrameWindowActivate(BOOL fActivate) override;
    virtual HRESULT STDMETHODCALLTYPE OnDocWindowActivate(BOOL fActivate) override;
    virtual HRESULT STDMETHODCALLTYPE ResizeBorder(LPCRECT prcBorder, IOleInPlaceUIWindow *pUIWindow, BOOL fFrameWindow) override;
    virtual HRESULT STDMETHODCALLTYPE EnableModeless(BOOL fEnable) override;
    virtual HRESULT STDMETHODCALLTYPE Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                           HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                           BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue) override;
    virtual HRESULT STDMETHODCALLTYPE GetColorSet(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                                  HDC hicTargetDev, LOGPALETTE **ppColorSet) override;
    virtual HRESULT STDMETHODCALLTYPE Freeze(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DWORD *pdwFreeze) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE Unfreeze(DWORD dwFreeze) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE SetAdvise(DWORD aspects, DWORD advf, IAdviseSink *pAdvSink) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetAdvise(DWORD *pAspects, DWORD *pAdvf, IAdviseSink **ppAdvSink) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, LONG lindex, DVTARGETDEVICE *ptd, LPSIZEL lpsizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetRect(DWORD dwAspect, LPRECTL pRect) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetViewStatus(DWORD *pdwStatus) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult) override;
    virtual HRESULT STDMETHODCALLTYPE QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult) override;
    virtual HRESULT STDMETHODCALLTYPE GetNaturalExtent(DWORD dwAspect, LONG lindex, DVTARGETDEVICE *ptd,
                                                       HDC hicTargetDev, DVEXTENTINFO *pExtentInfo, LPSIZEL pSizel) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE InterfaceSupportsErrorInfo(REFIID riid) override {return E_NOTIMPL;}
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount(UINT *pctinfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                             VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr) override;
    virtual HRESULT STDMETHODCALLTYPE GoBack() override;
    virtual HRESULT STDMETHODCALLTYPE GoForward() override;
    virtual HRESULT STDMETHODCALLTYPE GoHome() override;
    virtual HRESULT STDMETHODCALLTYPE GoSearch() override;
    virtual HRESULT STDMETHODCALLTYPE Navigate(BSTR URL, VARIANT *Flags, VARIANT *TargetFrameName, VARIANT *PostData, VARIANT *Headers) override;
    virtual HRESULT STDMETHODCALLTYPE Refresh() override;
    virtual HRESULT STDMETHODCALLTYPE Refresh2(VARIANT *Level) override;
    virtual HRESULT STDMETHODCALLTYPE Stop() override;
    virtual HRESULT STDMETHODCALLTYPE get_Application(IDispatch **ppDisp) override;
    virtual HRESULT STDMETHODCALLTYPE get_Parent(IDispatch **ppDisp) override;
    virtual HRESULT STDMETHODCALLTYPE get_Container(IDispatch **ppDisp) override;
    virtual HRESULT STDMETHODCALLTYPE get_Document(IDispatch **ppDisp) override;
    virtual HRESULT STDMETHODCALLTYPE get_TopLevelContainer(VARIANT_BOOL *pBool) override;
    virtual HRESULT STDMETHODCALLTYPE get_Type(BSTR *Type) override;
    virtual HRESULT STDMETHODCALLTYPE get_Left(long *pl) override;
    virtual HRESULT STDMETHODCALLTYPE put_Left(long Left) override;
    virtual HRESULT STDMETHODCALLTYPE get_Top(long *pl) override;
    virtual HRESULT STDMETHODCALLTYPE put_Top(long Top) override;
    virtual HRESULT STDMETHODCALLTYPE get_Width(long *pl) override;
    virtual HRESULT STDMETHODCALLTYPE put_Width(long Width) override;
    virtual HRESULT STDMETHODCALLTYPE get_Height(long *pl) override;
    virtual HRESULT STDMETHODCALLTYPE put_Height(long Height) override;
    virtual HRESULT STDMETHODCALLTYPE get_LocationName(BSTR *LocationName) override;
    virtual HRESULT STDMETHODCALLTYPE get_LocationURL(BSTR *LocationURL) override;
    virtual HRESULT STDMETHODCALLTYPE get_Busy(VARIANT_BOOL *pBool) override;
    virtual HRESULT STDMETHODCALLTYPE Quit() override;
    virtual HRESULT STDMETHODCALLTYPE ClientToWindow(int *pcx, int *pcy) override;
    virtual HRESULT STDMETHODCALLTYPE PutProperty(BSTR Property, VARIANT vtValue) override;
    virtual HRESULT STDMETHODCALLTYPE GetProperty(BSTR Property, VARIANT *pvtValue) override;
    virtual HRESULT STDMETHODCALLTYPE get_Name(BSTR *Name) override;
    virtual HRESULT STDMETHODCALLTYPE get_HWND(SHANDLE_PTR *pHWND) override;
    virtual HRESULT STDMETHODCALLTYPE get_FullName(BSTR *FullName) override;
    virtual HRESULT STDMETHODCALLTYPE get_Path(BSTR *Path) override;
    virtual HRESULT STDMETHODCALLTYPE get_Visible(VARIANT_BOOL *pBool) override;
    virtual HRESULT STDMETHODCALLTYPE put_Visible(VARIANT_BOOL Value) override;
    virtual HRESULT STDMETHODCALLTYPE get_StatusBar(VARIANT_BOOL *pBool) override;
    virtual HRESULT STDMETHODCALLTYPE put_StatusBar(VARIANT_BOOL Value) override;
    virtual HRESULT STDMETHODCALLTYPE get_StatusText(BSTR *StatusText) override;
    virtual HRESULT STDMETHODCALLTYPE put_StatusText(BSTR StatusText) override;
    virtual HRESULT STDMETHODCALLTYPE get_ToolBar(int *Value) override;
    virtual HRESULT STDMETHODCALLTYPE put_ToolBar(int Value) override;
    virtual HRESULT STDMETHODCALLTYPE get_MenuBar(VARIANT_BOOL *Value) override;
    virtual HRESULT STDMETHODCALLTYPE put_MenuBar(VARIANT_BOOL Value) override;
    virtual HRESULT STDMETHODCALLTYPE get_FullScreen(VARIANT_BOOL *pbFullScreen) override;
    virtual HRESULT STDMETHODCALLTYPE put_FullScreen(VARIANT_BOOL bFullScreen) override;
    virtual HRESULT STDMETHODCALLTYPE Navigate2(VARIANT *URL, VARIANT *Flags, VARIANT *TargetFrameName, VARIANT *PostData, VARIANT *Headers) override;
    virtual HRESULT STDMETHODCALLTYPE QueryStatusWB(OLECMDID cmdID, OLECMDF *pcmdf) override;
    virtual HRESULT STDMETHODCALLTYPE ExecWB(OLECMDID cmdID, OLECMDEXECOPT cmdexecopt, VARIANT *pvaIn, VARIANT *pvaOut) override;
    virtual HRESULT STDMETHODCALLTYPE ShowBrowserBar(VARIANT *pvaClsid, VARIANT *pvarShow, VARIANT *pvarSize) override;
    virtual HRESULT STDMETHODCALLTYPE get_ReadyState(READYSTATE *plReadyState) override;
    virtual HRESULT STDMETHODCALLTYPE get_Offline(VARIANT_BOOL *pbOffline) override;
    virtual HRESULT STDMETHODCALLTYPE put_Offline(VARIANT_BOOL bOffline) override;
    virtual HRESULT STDMETHODCALLTYPE get_Silent(VARIANT_BOOL *pbSilent) override;
    virtual HRESULT STDMETHODCALLTYPE put_Silent(VARIANT_BOOL bSilent) override;
    virtual HRESULT STDMETHODCALLTYPE get_RegisterAsBrowser(VARIANT_BOOL *pbRegister) override;
    virtual HRESULT STDMETHODCALLTYPE put_RegisterAsBrowser(VARIANT_BOOL bRegister) override;
    virtual HRESULT STDMETHODCALLTYPE get_RegisterAsDropTarget(VARIANT_BOOL *pbRegister) override;
    virtual HRESULT STDMETHODCALLTYPE put_RegisterAsDropTarget(VARIANT_BOOL bRegister) override;
    virtual HRESULT STDMETHODCALLTYPE get_TheaterMode(VARIANT_BOOL *pbRegister) override;
    virtual HRESULT STDMETHODCALLTYPE put_TheaterMode(VARIANT_BOOL bRegister) override;
    virtual HRESULT STDMETHODCALLTYPE get_AddressBar(VARIANT_BOOL *Value) override;
    virtual HRESULT STDMETHODCALLTYPE put_AddressBar(VARIANT_BOOL Value) override;
    virtual HRESULT STDMETHODCALLTYPE get_Resizable(VARIANT_BOOL *Value) override;
    virtual HRESULT STDMETHODCALLTYPE put_Resizable(VARIANT_BOOL Value) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Environment *environment) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Controller *controller) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2 *sender,  ICoreWebView2NavigationStartingEventArgs *args) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2 *sender, ICoreWebView2NavigationCompletedEventArgs *args) override;

protected:
    HRESULT Navigate();
    HRESULT InvokeBrowserEvent(DISPID id, DISPPARAMS &args, VARIANT *result = nullptr);
    HRESULT SetSize(const SIZE &size);
    HRESULT SetRect(const RECT &rect);
    HRESULT SetVisibility(BOOL visible);

protected:
    ULONG                                 m_refCount;
    SIZE                                  m_size;
    HWND                                  m_wnd;
    CComBSTR                              m_url;
    CComPtr<IThereEdgeWebBrowserEvents2>  m_browserEvents;
    CComPtr<IUnknown>                     m_unknownSite;
    CComPtr<IOleClientSite>               m_clientSite;
    CComPtr<ICoreWebView2Environment>     m_environment;
    CComPtr<ICoreWebView2Controller2>     m_controller;
    CComPtr<ICoreWebView2>                m_view;
    EventRegistrationToken                m_navigationStartingToken;
    EventRegistrationToken                m_navigationCompletedToken;
    BOOL                                  m_ready;
    BOOL                                  m_visible;
};
