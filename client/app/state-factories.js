(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardStateFactories = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createHeaderFilters(fields = []) {
    return (Array.isArray(fields) ? fields : []).reduce((filters, field) => {
      if (field?.key) {
        filters[field.key] = "";
      }
      return filters;
    }, {});
  }

  function createLookupFilters(selectFields = [], textFields = []) {
    return [...(Array.isArray(selectFields) ? selectFields : []), ...(Array.isArray(textFields) ? textFields : [])].reduce(
      (filters, field) => {
        if (field?.key) {
          filters[field.key] = "";
        }
        return filters;
      },
      {},
    );
  }

  function normalizeGridSortDirection(direction) {
    return direction === "desc" ? "desc" : "asc";
  }

  function normalizeGridSortRules(rawRules) {
    if (!Array.isArray(rawRules)) {
      return [];
    }

    const sortRules = [];

    rawRules.forEach((rule) => {
      const key = String(rule?.key || "").trim();

      if (!key || sortRules.some((entry) => entry.key === key)) {
        return;
      }

      sortRules.push({
        key,
        direction: normalizeGridSortDirection(rule?.direction),
      });
    });

    return sortRules;
  }

  function buildInitialGridSortRules(options = {}) {
    if (Array.isArray(options.defaultSortRules)) {
      return normalizeGridSortRules(options.defaultSortRules);
    }

    if (options.defaultSortKey) {
      return normalizeGridSortRules([
        {
          key: options.defaultSortKey,
          direction: options.defaultSortDirection,
        },
      ]);
    }

    return [];
  }

  function createTableState(options = {}) {
    const defaultSortRules = buildInitialGridSortRules(options);

    return {
      page: 1,
      pageSize: 20,
      pageSizeMenuOpen: false,
      defaultSortRules,
      sortRules: normalizeGridSortRules(defaultSortRules),
      filterMenuKey: "",
      filterMenuSearch: "",
      filters: {},
      selectedRowIds: [],
      selectionAnchorRowId: "",
    };
  }

  function createTemplateEditorState() {
    return {
      activeTemplateId: "",
      name: "",
      description: "",
      version: "",
      draftHtml: "",
      lastValidHtml: "",
      hasOverflow: false,
      savedRange: null,
      historyEntries: [],
      historyIndex: -1,
      isRestoringHistory: false,
      statusMessage: "A4 영역 안에서 편집 중입니다.",
      statusType: "",
      selectedImageElement: null,
      tableSelection: null,
      tableSelectionSession: null,
      tableResizeSession: null,
      imageMoveSession: null,
      imageResizeSession: null,
    };
  }

  function createTemplateCardEditorState() {
    return {
      activeTemplateId: "",
      field: "",
      draftValue: "",
      isSaving: false,
    };
  }

  function createTemplatePreviewState() {
    return {
      activeTemplateId: "",
      renderedHtml: "",
      examineeLabel: "",
      examineeNo: "",
    };
  }

  function createExamineeDetailState() {
    return {
      selectedExamineeNo: "",
      originalExamineeNo: "",
      baseRecord: null,
      draftRecord: null,
      isSaving: false,
      isPhotoUploading: false,
      statusMessage: "",
      statusType: "",
    };
  }

  function createAuthState() {
    return {
      status: "loading",
      currentUser: null,
      error: "",
      isSubmittingLogin: false,
      isSubmittingPasswordSetup: false,
      loginForm: {
        id: "",
        password: "",
      },
      passwordSetup: {
        password: "",
        passwordConfirm: "",
        error: "",
      },
    };
  }

  function normalizeSystemInitialPassword(value, defaultValue = "1111") {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || defaultValue;
  }

  function normalizeSystemAutoLogoutMinutes(value, { defaultValue = 0, maxValue = 1440 } = {}) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      return defaultValue;
    }

    return Math.min(maxValue, normalizedValue);
  }

  function normalizeSystemSettingsPayload(payload = {}, options = {}) {
    return {
      initialPassword: normalizeSystemInitialPassword(payload.initialPassword, options.defaultPassword),
      autoLogoutMinutes: String(
        normalizeSystemAutoLogoutMinutes(payload.autoLogoutMinutes, {
          defaultValue: options.defaultAutoLogoutMinutes,
          maxValue: options.maxAutoLogoutMinutes,
        }),
      ),
    };
  }

  function createSystemSettingsState(payload = {}, options = {}) {
    return {
      ...normalizeSystemSettingsPayload(payload, options),
      isSaving: false,
      statusMessage: "",
      statusType: "",
    };
  }

  function createSystemDataDeletionState() {
    return {
      isDeleting: false,
      activeScope: "",
      statusMessage: "",
      statusType: "",
    };
  }

  function createToastState() {
    return {
      visible: false,
      message: "",
      type: "success",
    };
  }

  function createUploadState() {
    return {
      isActive: false,
      activatedAt: 0,
      title: "수험생 데이터 업로드 중",
      message: "",
      progressMode: "hidden",
      progressValue: 0,
      progressLabel: "",
    };
  }

  function getDefaultLoginNoticeHtml(initialPassword = "1111") {
    return [
      '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">계정 안내</span></p>',
      "<p><strong>ID : 계정 관리에 등록된 계정 ID</strong></p>",
      `<p><strong>PW : ${initialPassword}(초기 비밀번호)</strong></p>`,
      "<p>최초 로그인 시 비밀번호를 변경해야 서비스를 사용할 수 있습니다.</p>",
    ].join("");
  }

  function normalizeLoginNoticeHtml(html = "", { fallbackHtml = "" } = {}) {
    const normalizedHtml = String(html || "");
    const resolvedFallback = String(fallbackHtml || getDefaultLoginNoticeHtml()).trim() || getDefaultLoginNoticeHtml();
    return normalizedHtml.trim() ? normalizedHtml : resolvedFallback;
  }

  function createLoginNoticeState(initialHtml = "", { fallbackHtml = "", defaultHtml = "" } = {}) {
    const resolvedDefaultHtml = String(defaultHtml || getDefaultLoginNoticeHtml()).trim() || getDefaultLoginNoticeHtml();
    const storedHtml = normalizeLoginNoticeHtml(initialHtml || resolvedDefaultHtml, {
      fallbackHtml: fallbackHtml || resolvedDefaultHtml,
    });

    return {
      savedHtml: storedHtml,
      draftHtml: storedHtml,
      selectionSnapshot: null,
      historyEntries: [
        {
          html: storedHtml,
          selection: null,
        },
      ],
      historyIndex: 0,
      isRestoringHistory: false,
      statusMessage: "로그인화면 공지사항을 편집 중입니다.",
      statusType: "",
    };
  }

  function createBatchPrintState() {
    return {
      isLoading: false,
    };
  }

  function createPdfGenerationState() {
    return {
      isActive: false,
      message: "",
      progressMode: "hidden",
      progressValue: 0,
      progressLabel: "",
    };
  }

  function createAccountEditorState() {
    return {
      editingId: "",
      draftName: "",
      draftRole: "관리자",
    };
  }

  return {
    buildInitialGridSortRules,
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
    getDefaultLoginNoticeHtml,
    normalizeGridSortDirection,
    normalizeGridSortRules,
    normalizeLoginNoticeHtml,
    normalizeSystemAutoLogoutMinutes,
    normalizeSystemInitialPassword,
    normalizeSystemSettingsPayload,
  };
});
