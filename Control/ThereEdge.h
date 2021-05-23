#pragma once

class CThereEdgeModule: public ATL::CAtlDllModuleT<CThereEdgeModule>,
                        public IClassFactoryEx,
                        public IQuickActivate,
                        public IConnectionPointContainer,
                        public IConnectionPoint,
                        public IOleObject,
                        public IOleInPlaceObjectWindowless,
                        public IViewObjectEx,
						public IShockwaveFlash
{
public:
	DECLARE_LIBID(LIBID_ThereEdgeLib)
	DECLARE_REGISTRY_APPID_RESOURCEID(IDR_THEREEDGE, "{D27CDB6B-AE6D-11CF-96B8-444553540000}")

    CThereEdgeModule();
    virtual ~CThereEdgeModule();

    virtual HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void **object) override;
    virtual ULONG STDMETHODCALLTYPE AddRef() override;
    virtual ULONG STDMETHODCALLTYPE Release() override;
    virtual HRESULT STDMETHODCALLTYPE CreateInstance(IUnknown *pUnkOuter, REFIID riid, void **ppv) override;
    virtual HRESULT STDMETHODCALLTYPE CreateInstanceWithContext(IUnknown *punkContext, IUnknown *punkOuter, REFIID riid, void **ppv) override;
    virtual HRESULT STDMETHODCALLTYPE LockServer(BOOL fLock) override;
    virtual HRESULT STDMETHODCALLTYPE QuickActivate(QACONTAINER *pQaContainer, QACONTROL *pQaControl) override;
    virtual HRESULT STDMETHODCALLTYPE SetContentExtent(LPSIZEL pSizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetContentExtent(LPSIZEL pSizel) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnectionPoints(IEnumConnectionPoints **ppEnum) override;
    virtual HRESULT STDMETHODCALLTYPE FindConnectionPoint(REFIID riid, IConnectionPoint **ppCP) override;
    virtual HRESULT STDMETHODCALLTYPE GetConnectionInterface(IID *pIID) override;
    virtual HRESULT STDMETHODCALLTYPE GetConnectionPointContainer(IConnectionPointContainer **ppCPC) override;
    virtual HRESULT STDMETHODCALLTYPE Advise(IUnknown *pUnkSink, DWORD *pdwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE Unadvise(DWORD dwCookie) override;
    virtual HRESULT STDMETHODCALLTYPE EnumConnections(IEnumConnections **ppEnum) override;
    virtual HRESULT STDMETHODCALLTYPE SetClientSite(IOleClientSite *pClientSite) override;
    virtual HRESULT STDMETHODCALLTYPE GetClientSite(IOleClientSite **ppClientSite) override;
    virtual HRESULT STDMETHODCALLTYPE SetHostNames(LPCOLESTR szContainerApp, LPCOLESTR szContainerObj) override;
    virtual HRESULT STDMETHODCALLTYPE Close(DWORD dwSaveOption) override;
    virtual HRESULT STDMETHODCALLTYPE SetMoniker(DWORD dwWhichMoniker, IMoniker *pmk) override;
    virtual HRESULT STDMETHODCALLTYPE GetMoniker(DWORD dwAssign, DWORD dwWhichMoniker, IMoniker **ppmk) override;
    virtual HRESULT STDMETHODCALLTYPE InitFromData(IDataObject *pDataObject, BOOL fCreation, DWORD dwReserved) override;
    virtual HRESULT STDMETHODCALLTYPE GetClipboardData(DWORD dwReserved, IDataObject **ppDataObject) override;
    virtual HRESULT STDMETHODCALLTYPE DoVerb(LONG iVerb, LPMSG lpmsg, IOleClientSite *pActiveSite, LONG lindex, HWND hwndParent, LPCRECT lprcPosRect) override;
    virtual HRESULT STDMETHODCALLTYPE EnumVerbs( IEnumOLEVERB **ppEnumOleVerb) override;
    virtual HRESULT STDMETHODCALLTYPE Update() override;
    virtual HRESULT STDMETHODCALLTYPE IsUpToDate() override;
    virtual HRESULT STDMETHODCALLTYPE GetUserClassID(CLSID *pClsid) override;
    virtual HRESULT STDMETHODCALLTYPE GetUserType(DWORD dwFormOfType, LPOLESTR *pszUserType) override;
    virtual HRESULT STDMETHODCALLTYPE SetExtent(DWORD dwDrawAspect, SIZEL *psizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, SIZEL *psizel) override;
    virtual HRESULT STDMETHODCALLTYPE Advise(IAdviseSink *pAdvSink, DWORD *pdwConnection) override;
    virtual HRESULT STDMETHODCALLTYPE EnumAdvise(IEnumSTATDATA **ppenumAdvise) override;
    virtual HRESULT STDMETHODCALLTYPE GetMiscStatus(DWORD dwAspect, DWORD *pdwStatus) override;
    virtual HRESULT STDMETHODCALLTYPE SetColorScheme(LOGPALETTE *pLogpal) override;
    virtual HRESULT STDMETHODCALLTYPE GetWindow(HWND *phwnd) override;
    virtual HRESULT STDMETHODCALLTYPE ContextSensitiveHelp(BOOL fEnterMode) override;
    virtual HRESULT STDMETHODCALLTYPE InPlaceDeactivate() override;
    virtual HRESULT STDMETHODCALLTYPE UIDeactivate() override;
    virtual HRESULT STDMETHODCALLTYPE SetObjectRects(LPCRECT lprcPosRect, LPCRECT lprcClipRect) override;
    virtual HRESULT STDMETHODCALLTYPE ReactivateAndUndo() override;
    virtual HRESULT STDMETHODCALLTYPE OnWindowMessage(UINT msg, WPARAM wParam, LPARAM lParam, LRESULT *plResult) override;
    virtual HRESULT STDMETHODCALLTYPE GetDropTarget(IDropTarget **ppDropTarget) override;
    virtual HRESULT STDMETHODCALLTYPE Draw(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd,
                                           HDC hdcTargetDev, HDC hdcDraw, LPCRECTL lprcBounds, LPCRECTL lprcWBounds,
                                           BOOL (STDMETHODCALLTYPE *pfnContinue)(ULONG_PTR dwContinue), ULONG_PTR dwContinue) override;
    virtual HRESULT STDMETHODCALLTYPE GetColorSet(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DVTARGETDEVICE *ptd, HDC hicTargetDev, LOGPALETTE **ppColorSet) override;
    virtual HRESULT STDMETHODCALLTYPE Freeze(DWORD dwDrawAspect, LONG lindex, void *pvAspect, DWORD *pdwFreeze) override;
    virtual HRESULT STDMETHODCALLTYPE Unfreeze(DWORD dwFreeze) override;
    virtual HRESULT STDMETHODCALLTYPE SetAdvise(DWORD aspects, DWORD advf, IAdviseSink *pAdvSink) override;
    virtual HRESULT STDMETHODCALLTYPE GetAdvise(DWORD *pAspects, DWORD *pAdvf, IAdviseSink **ppAdvSink) override;
    virtual HRESULT STDMETHODCALLTYPE GetExtent(DWORD dwDrawAspect, LONG lindex, DVTARGETDEVICE *ptd, LPSIZEL lpsizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetRect(DWORD dwAspect, LPRECTL pRect) override;
    virtual HRESULT STDMETHODCALLTYPE GetViewStatus(DWORD *pdwStatus) override;
    virtual HRESULT STDMETHODCALLTYPE QueryHitPoint(DWORD dwAspect, LPCRECT pRectBounds, POINT ptlLoc, LONG lCloseHint, DWORD *pHitResult) override;
    virtual HRESULT STDMETHODCALLTYPE QueryHitRect(DWORD dwAspect, LPCRECT pRectBounds, LPCRECT pRectLoc, LONG lCloseHint, DWORD *pHitResult) override;
    virtual HRESULT STDMETHODCALLTYPE GetNaturalExtent(DWORD dwAspect, LONG lindex, DVTARGETDEVICE *ptd, HDC hicTargetDev, DVEXTENTINFO *pExtentInfo, LPSIZEL pSizel) override;
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount(UINT *pctinfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfo(UINT iTInfo, LCID lcid, ITypeInfo **ppTInfo) override;
    virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames(REFIID riid, LPOLESTR *rgszNames, UINT cNames, LCID lcid, DISPID *rgDispId) override;
    virtual HRESULT STDMETHODCALLTYPE Invoke(DISPID dispIdMember, REFIID riid, LCID lcid, WORD wFlags, DISPPARAMS *pDispParams,
                                             VARIANT *pVarResult, EXCEPINFO *pExcepInfo, UINT *puArgErr) override;
    virtual HRESULT STDMETHODCALLTYPE put_Movie(BSTR pVal) override;
    virtual HRESULT STDMETHODCALLTYPE put_WMode(BSTR pVal) override;
    virtual HRESULT STDMETHODCALLTYPE SetVariable(BSTR name, BSTR value) override;

    ULONG m_refCount;
    IUnknown *m_punkContext;
    IUnknown *m_punkOuter;
    _IShockwaveFlashEvents *m_flashEvents;
    QACONTAINER m_qaContainer;
    QACONTROL m_qaControl;
    SIZEL m_size;
};

extern class CThereEdgeModule _AtlModule;
