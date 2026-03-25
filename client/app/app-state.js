(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAppState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAppStateController({
    AVAILABLE_VIEWS,
    DEFAULT_VIEW,
    HEADER_FILTER_STORAGE_KEY,
    createAccountEditorState,
    createAuthState,
    createBatchPrintState,
    createExamineeDetailState,
    createHeaderFilters,
    createLoginNoticeState,
    createLookupFilters,
    createPdfGenerationState,
    createSystemDataDeletionState,
    createSystemSettingsState,
    createTableState,
    createTemplateCardEditorState,
    createTemplateEditorState,
    createTemplatePreviewState,
    createToastState,
    createUploadState,
    getViewFromPathname,
    isLoginRoutePath,
    loadStoredHeaderFilters,
    normalizeRoutePath,
  }) {
    function getCurrentRoutePath() {
      return normalizeRoutePath(window.location.pathname || "/");
    }

    function isLoginPage() {
      return isLoginRoutePath(getCurrentRoutePath());
    }

    function getRequestedViewFromLocation() {
      return getViewFromPathname(getCurrentRoutePath()) || "";
    }

    function loadCurrentViewFromLocation() {
      const requestedView = getRequestedViewFromLocation();
      return AVAILABLE_VIEWS.has(requestedView) ? requestedView : DEFAULT_VIEW;
    }

    const state = {
      currentView: loadCurrentViewFromLocation(),
      headerFilters: loadStoredHeaderFilters({
        HEADER_FILTER_STORAGE_KEY,
        createHeaderFilters,
      }),
      lookupFilters: createLookupFilters(),
      composingInputId: "",
      examineeDetail: createExamineeDetailState(),
      templateCards: [],
      templateCardEditor: createTemplateCardEditorState(),
      templateEditor: createTemplateEditorState(),
      templatePreview: createTemplatePreviewState(),
      batchPrint: createBatchPrintState(),
      pdfGeneration: createPdfGenerationState(),
      accountEditor: createAccountEditorState(),
      auth: createAuthState(),
      systemSettings: createSystemSettingsState(),
      systemDataDeletion: createSystemDataDeletionState(),
      bootstrap: {
        isLoading: true,
        error: "",
        serverDate: "",
      },
      metrics: {
        registeredExaminees: 0,
        todayPrints: 0,
        totalPrints: 0,
      },
      upload: createUploadState(),
      toast: createToastState(),
      loginNotice: createLoginNoticeState(),
      tableSettings: {
        examineeRegistrationGrid: createTableState({
          defaultSortRules: [{ key: "examineeNo", direction: "asc" }],
        }),
        admitCardLookupGrid: createTableState({
          defaultSortRules: [{ key: "examineeNo", direction: "asc" }],
        }),
        printHistoryGrid: createTableState({
          defaultSortRules: [{ key: "printedAt", direction: "desc" }],
        }),
        accountManagementGrid: createTableState({
          defaultSortRules: [{ key: "id", direction: "asc" }],
        }),
      },
    };

    function applyLoginNoticePayload(html = "") {
      state.loginNotice = createLoginNoticeState(html);
    }

    return Object.freeze({
      applyLoginNoticePayload,
      getCurrentRoutePath,
      getRequestedViewFromLocation,
      isLoginPage,
      loadCurrentViewFromLocation,
      state,
    });
  }

  return Object.freeze({
    createAppStateController,
  });
});
