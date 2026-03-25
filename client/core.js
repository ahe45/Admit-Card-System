const HEADER_FILTER_STORAGE_KEY = "admitcard.headerFilters";
const FLASH_TOAST_STORAGE_KEY = "admitcard.flashToast";
const DEFAULT_SYSTEM_INITIAL_PASSWORD = "1111";
const DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES = 0;
const MAX_SYSTEM_AUTO_LOGOUT_MINUTES = 1440;
const appConfig = globalThis.AdmitCardAppConfig;
const clientExamineeConfig = globalThis.AdmitCardClientExamineeConfig;
const stateFactories = globalThis.AdmitCardStateFactories;
const apiClient = globalThis.AdmitCardApiClient;
const domElementsModule = globalThis.AdmitCardDomElements;
const appStateModule = globalThis.AdmitCardAppState;
const gridRowStoreModule = globalThis.AdmitCardGridRowStore;
const bootstrapDataModule = globalThis.AdmitCardBootstrapData;
const bootstrapLoaderModule = globalThis.AdmitCardBootstrapLoader;
const accountSystemRuntimeModule = globalThis.AdmitCardAccountSystemRuntime;
const workflowRuntimeModule = globalThis.AdmitCardWorkflowRuntime;
const navigationModule = globalThis.AdmitCardAppNavigation;
const busyOverlayModule = globalThis.AdmitCardBusyOverlays;
const autoLogoutModule = globalThis.AdmitCardAutoLogout;
const authAccountStateModule = globalThis.AdmitCardAuthAccountState;
const authUiStateModule = globalThis.AdmitCardAuthUiState;
const authSessionModule = globalThis.AdmitCardAuthSession;
const admitCardWorkflowModule = globalThis.AdmitCardWorkflow;
const examineeFileTransfer = globalThis.AdmitCardExamineeFileTransfer;
const uploadWorkflowModule = globalThis.AdmitCardExamineeUploadWorkflow;
const accountCreateModule = globalThis.AdmitCardAccountCreate;
const systemSettingsModule = globalThis.AdmitCardSystemSettings;

if (!appConfig) {
  throw new Error("shared/app-config.js must be loaded before client/core.js.");
}

if (!clientExamineeConfig) {
  throw new Error("client/features/examinees/config.js must be loaded before client/core.js.");
}

if (!stateFactories) {
  throw new Error("client/app/state-factories.js must be loaded before client/core.js.");
}

if (!apiClient) {
  throw new Error("client/app/api-client.js must be loaded before client/core.js.");
}

if (!domElementsModule?.createDomElementRegistry) {
  throw new Error("client/app/dom-elements.js must be loaded before client/core.js.");
}

if (!appStateModule?.createAppStateController) {
  throw new Error("client/app/app-state.js must be loaded before client/core.js.");
}

if (!gridRowStoreModule?.createGridRowStoreController) {
  throw new Error("client/app/grid-row-store.js must be loaded before client/core.js.");
}

if (!bootstrapDataModule?.createBootstrapDataController || !bootstrapDataModule?.loadStoredHeaderFilters) {
  throw new Error("client/app/bootstrap-data.js must be loaded before client/core.js.");
}

if (!bootstrapLoaderModule?.createBootstrapLoaderController) {
  throw new Error("client/app/bootstrap-loader.js must be loaded before client/core.js.");
}

if (!accountSystemRuntimeModule?.createAccountSystemRuntimeController) {
  throw new Error("client/app/account-system-runtime.js must be loaded before client/core.js.");
}

if (!workflowRuntimeModule?.createWorkflowRuntimeController) {
  throw new Error("client/app/workflow-runtime.js must be loaded before client/core.js.");
}

if (!navigationModule?.createNavigationController) {
  throw new Error("client/app/navigation.js must be loaded before client/core.js.");
}

if (!busyOverlayModule?.createBusyOverlayController) {
  throw new Error("client/features/app/busy-overlays.js must be loaded before client/core.js.");
}

if (!autoLogoutModule?.createAutoLogoutController) {
  throw new Error("client/features/auth/auto-logout.js must be loaded before client/core.js.");
}

if (!authAccountStateModule?.createAuthAccountStateController) {
  throw new Error("client/features/auth/account-state.js must be loaded before client/core.js.");
}

if (!authUiStateModule?.createAuthUiController) {
  throw new Error("client/features/auth/ui-state.js must be loaded before client/core.js.");
}

if (!authSessionModule?.createAuthSessionController) {
  throw new Error("client/features/auth/session.js must be loaded before client/core.js.");
}

if (!admitCardWorkflowModule?.createAdmitCardWorkflowController) {
  throw new Error("client/features/admit-cards/workflow.js must be loaded before client/core.js.");
}

if (!examineeFileTransfer) {
  throw new Error("client/features/examinees/file-transfer.js must be loaded before client/core.js.");
}

if (!uploadWorkflowModule?.createExamineeUploadWorkflowController) {
  throw new Error("client/features/examinees/upload-workflow.js must be loaded before client/core.js.");
}

if (!accountCreateModule?.createAccountCreateController) {
  throw new Error("client/features/accounts/create-modal.js must be loaded before client/core.js.");
}

if (!systemSettingsModule?.createSystemSettingsController) {
  throw new Error("client/features/system/settings.js must be loaded before client/core.js.");
}

const {
  accountRoleOptions,
  availableViews,
  defaultView: DEFAULT_VIEW,
  getDefaultAccessibleView: getDefaultAccessibleViewForRole,
  getViewFromPathname,
  getViewRoutePath,
  getAccessibleViewsForRole: getAccessibleViewsForRoleConfig,
  getVisibleMenuViewsForRole: getVisibleMenuViewsForRoleConfig,
  isLoginRoutePath,
  isViewAccessibleForRole,
  loginRoutePath: LOGIN_ROUTE_PATH,
  normalizeRoutePath,
  pageTitles,
  templateTagDefinitions,
} = appConfig;
const {
  headerFilterFields,
  lookupSelectFields,
  lookupSelectKeys,
  lookupTextFields,
  resultGridColumns,
  admitCardLookupGridColumns,
  examineeRegistrationGridColumns,
  printHistoryGridColumns,
  examineeDetailFields: EXAMINEE_DETAIL_FIELDS,
  examineeDetailFieldKeys: EXAMINEE_DETAIL_FIELD_KEYS,
  examineePhotoColumn,
} = clientExamineeConfig;
const SYSTEM_DATA_DELETE_CONFIG = Object.freeze({
  all: Object.freeze({
    confirmMessage:
      "전체 데이터를 삭제하시겠습니까?\n\n수험생 데이터, 사진 데이터, 수험표 출력 이력이 모두 삭제되며 복구할 수 없습니다.",
  }),
  photos: Object.freeze({
    confirmMessage: "사진 데이터를 삭제하시겠습니까?\n\n업로드된 사진 파일과 사진 데이터가 모두 삭제되며 복구할 수 없습니다.",
  }),
  "print-history": Object.freeze({
    confirmMessage: "수험표 출력 이력을 삭제하시겠습니까?\n\n출력 이력 데이터가 모두 삭제되며 복구할 수 없습니다.",
  }),
});
const AVAILABLE_VIEWS = new Set(availableViews);
const TEMPLATE_EDITOR_HISTORY_LIMIT = 120;
const LOGIN_NOTICE_EDITOR_HISTORY_LIMIT = 120;
const TEMPLATE_EDITOR_IMAGE_MIN_SIZE = 32;
const {
  createAccountEditorState,
  createAuthState,
  createBatchPrintState,
  createExamineeDetailState,
  createPdfGenerationState,
  createSystemDataDeletionState,
  createTableState,
  createTemplateCardEditorState,
  createTemplateEditorState,
  createTemplatePreviewState,
  createToastState,
  createUploadState,
} = stateFactories;
const createHeaderFilters = () => stateFactories.createHeaderFilters(headerFilterFields);
const createLookupFilters = () => stateFactories.createLookupFilters(lookupSelectFields, lookupTextFields);
const normalizeSystemInitialPassword = (value) =>
  stateFactories.normalizeSystemInitialPassword(value, DEFAULT_SYSTEM_INITIAL_PASSWORD);
const normalizeSystemAutoLogoutMinutes = (value) =>
  stateFactories.normalizeSystemAutoLogoutMinutes(value, {
    defaultValue: DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES,
    maxValue: MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
  });
const normalizeGridSortRules = (rules) => stateFactories.normalizeGridSortRules(rules);
const normalizeSystemSettingsPayload = (payload = {}) =>
  stateFactories.normalizeSystemSettingsPayload(payload, {
    defaultPassword: DEFAULT_SYSTEM_INITIAL_PASSWORD,
    defaultAutoLogoutMinutes: DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES,
    maxAutoLogoutMinutes: MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
  });
const createSystemSettingsState = (payload = {}) =>
  stateFactories.createSystemSettingsState(payload, {
    defaultPassword: DEFAULT_SYSTEM_INITIAL_PASSWORD,
    defaultAutoLogoutMinutes: DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES,
    maxAutoLogoutMinutes: MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
  });
const {
  apiRequest,
  apiRequestForBlobWithProgress,
  apiRequestWithUploadProgress,
  buildApiUrl,
} = apiClient;
const { createDomElementRegistry } = domElementsModule;
const { createAppStateController } = appStateModule;
const { createGridRowStoreController } = gridRowStoreModule;
const { createBootstrapDataController, loadStoredHeaderFilters } = bootstrapDataModule;
const { createBootstrapLoaderController } = bootstrapLoaderModule;
const { createAccountSystemRuntimeController } = accountSystemRuntimeModule;
const { createWorkflowRuntimeController } = workflowRuntimeModule;
const { createNavigationController } = navigationModule;
const { createBusyOverlayController } = busyOverlayModule;
const { createAutoLogoutController } = autoLogoutModule;
const { createAuthAccountStateController } = authAccountStateModule;
const { createAuthUiController } = authUiStateModule;
const { createAuthSessionController } = authSessionModule;
const { createAdmitCardWorkflowController } = admitCardWorkflowModule;
const { createAccountCreateController } = accountCreateModule;
const { createExamineeUploadWorkflowController } = uploadWorkflowModule;
const { createSystemSettingsController } = systemSettingsModule;
const {
  arrayBufferToBase64,
  buildUploadSummaryMessage,
  clearSelectedUploadFiles,
  downloadExamineeGridWorkbook,
  downloadExamineeTemplate,
  downloadPrintHistoryGridWorkbook,
  mergeUploadResult,
  readFileAsArrayBuffer,
  wait,
  waitForNextFrame,
} = examineeFileTransfer;
const getDefaultLoginNoticeHtml = (initialPassword = DEFAULT_SYSTEM_INITIAL_PASSWORD) =>
  stateFactories.getDefaultLoginNoticeHtml(initialPassword);
const DEFAULT_LOGIN_NOTICE_HTML = getDefaultLoginNoticeHtml(DEFAULT_SYSTEM_INITIAL_PASSWORD);
const normalizeLoginNoticeHtml = (html = "") =>
  stateFactories.normalizeLoginNoticeHtml(html, {
    fallbackHtml: DEFAULT_LOGIN_NOTICE_HTML,
  });
const createLoginNoticeState = (initialHtml = getDefaultLoginNoticeHtml()) =>
  stateFactories.createLoginNoticeState(initialHtml, {
    defaultHtml: DEFAULT_LOGIN_NOTICE_HTML,
    fallbackHtml: DEFAULT_LOGIN_NOTICE_HTML,
  });

const appStateController = createAppStateController({
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
});
const {
  applyLoginNoticePayload,
  getCurrentRoutePath,
  getRequestedViewFromLocation,
  isLoginPage,
  loadCurrentViewFromLocation,
  state,
} = appStateController;

const domElementRegistry = createDomElementRegistry(document);
const {
  accountCreateDescription,
  accountCreateError,
  accountCreateForm,
  accountCreateId,
  accountCreateModal,
  accountCreateName,
  accountCreateRole,
  appShell,
  autoLogoutCountdown,
  autoLogoutCountdownValue,
  brandHome,
  currentUserId,
  currentUserRole,
  examineeDetailBody,
  examineeDetailCloseConfirmMessage,
  examineeDetailCloseConfirmModal,
  examineeDetailCloseConfirmSummary,
  examineeDetailModal,
  examineeDetailSaveButton,
  logoutButton,
  menuToggle,
  pageShell,
  pageTitle,
  passwordSetupConfirm,
  passwordSetupDescription,
  passwordSetupError,
  passwordSetupForm,
  passwordSetupModal,
  passwordSetupNext,
  pdfGenerationMessage,
  pdfGenerationOverlay,
  pdfGenerationProgress,
  pdfGenerationProgressBar,
  pdfGenerationProgressFill,
  pdfGenerationProgressLabel,
  pdfGenerationProgressValue,
  registeredExamineeCount,
  sidebar,
  templateEditorDescription,
  templateEditorModal,
  templateEditorName,
  templateEditorStatus,
  templateEditorSurface,
  templateEditorTitle,
  templatePreviewMeta,
  templatePreviewModal,
  templatePreviewStage,
  templatePreviewTitle,
  toastRoot,
  todayPrintCount,
  topbar,
  totalPrintCount,
  uploadFileInput,
  uploadFileName,
  uploadModal,
  uploadOverlay,
  uploadOverlayMessage,
  uploadOverlayProgress,
  uploadOverlayProgressBar,
  uploadOverlayProgressFill,
  uploadOverlayProgressLabel,
  uploadOverlayProgressValue,
  uploadOverlayTitle,
  uploadPhotoArchiveInput,
  uploadPhotoArchiveName,
  viewRoot,
} = domElementRegistry;
let templateEditorBlockType = null;
let templateEditorCellSplitCount = null;
let templateEditorCellSplitPanel = null;
let templateEditorCellShading = null;
let templateEditorCellWidth = null;
let templateEditorFontFamily = null;
let templateEditorFontSize = null;
let templateEditorImageInput = null;
let templateEditorRowHeight = null;
let templateEditorSizeScope = null;
let templateEditorTableColumns = null;
let templateEditorTableInsertPanel = null;
let templateEditorTableRows = null;
let templateEditorTextColor = null;
let templateEditorTextShading = null;
const gridRowStoreController = createGridRowStoreController();
const {
  appendAccountGridRow,
  getAccountGridColumns,
  getAccountGridRows,
  getExamineeGridRows,
  getPrintHistoryRows,
  setAccountGridRows,
  setExamineeGridRows,
  setPrintHistoryRows,
} = gridRowStoreController;
const accountGridColumns = getAccountGridColumns();

function refreshTemplateEditorToolbarElements() {
  ({
    templateEditorBlockType,
    templateEditorCellSplitCount,
    templateEditorCellSplitPanel,
    templateEditorCellShading,
    templateEditorCellWidth,
    templateEditorFontFamily,
    templateEditorFontSize,
    templateEditorImageInput,
    templateEditorRowHeight,
    templateEditorSizeScope,
    templateEditorTableColumns,
    templateEditorTableInsertPanel,
    templateEditorTableRows,
    templateEditorTextColor,
    templateEditorTextShading,
  } = domElementRegistry.getTemplateEditorToolbarElements());
}

refreshTemplateEditorToolbarElements();
let templateEditorImageOverlay = null;
const MIN_UPLOAD_OVERLAY_DISPLAY_MS = 1000;
const BATCH_PRINT_STATUS_POLL_INTERVAL_MS = 400;
const BATCH_PRINT_JOB_TIMEOUT_MS = 1000 * 60 * 30;
const titles = pageTitles;
const authAccountStateController = createAuthAccountStateController({
  accountCreateDescription,
  normalizeSystemAutoLogoutMinutes,
  normalizeSystemInitialPassword,
  state,
});
const {
  getSystemAutoLogoutMinutes,
  getSystemInitialPassword,
  isUserAuthenticated,
  normalizeAuthAccount,
  syncAccountCreateDescription,
} = authAccountStateController;
syncAccountCreateDescription();
const navigationController = createNavigationController({
  getAccessibleViewsForRoleConfig,
  getCurrentRoutePath,
  getDefaultAccessibleViewForRole,
  getRequestedViewFromLocation,
  getViewRoutePath,
  getVisibleMenuViewsForRoleConfig,
  isLoginPage,
  isUserAuthenticated,
  isViewAccessibleForRole,
  loadCurrentViewFromLocation,
  loginRoutePath: LOGIN_ROUTE_PATH,
  normalizeRoutePath,
  state,
});
const {
  getAccessibleViewsForRole,
  getDefaultAccessibleView,
  getVisibleMenuViewsForRole,
  isRouteNavigating,
  isViewAccessible,
  navigateToLogin,
  navigateToPath,
  navigateToView,
  redirectToAccessibleRouteIfNeeded,
  syncCurrentViewFromLocation,
  syncNavigationVisibility,
} = navigationController;
const authUiController = createAuthUiController({
  FLASH_TOAST_STORAGE_KEY,
  getLoginAccountInput: () => document.getElementById("loginAccountId"),
  getLoginErrorElement: () => document.getElementById("loginError"),
  getLoginPasswordInput: () => document.getElementById("loginPassword"),
  passwordSetupConfirm,
  passwordSetupDescription,
  passwordSetupError,
  passwordSetupForm,
  passwordSetupModal,
  passwordSetupNext,
  state,
  toastRoot,
});
const {
  consumeFlashToast,
  hideToast,
  queueFlashToast,
  showToast,
  syncLoginErrorMessage,
  syncLoginFormAutofocus,
  syncPasswordSetupModal,
  syncToast,
} = authUiController;
const autoLogoutController = createAutoLogoutController({
  apiRequest,
  autoLogoutCountdown,
  autoLogoutCountdownValue,
  getSystemAutoLogoutMinutes,
  isUserAuthenticated,
  navigateToLogin,
  queueFlashToast,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  setLoggedOutState: (...args) => {
    if (typeof setLoggedOutState === "function") {
      return setLoggedOutState(...args);
    }

    return undefined;
  },
  updateAuthChrome: (...args) => {
    if (typeof updateAuthChrome === "function") {
      return updateAuthChrome(...args);
    }

    return undefined;
  },
});
const {
  clearAutoLogoutCountdownInterval,
  clearAutoLogoutTimer,
  recordAutoLogoutActivity,
  syncAutoLogoutCountdown,
  syncAutoLogoutTimer,
} = autoLogoutController;

const bootstrapDataController = createBootstrapDataController({
  EXAMINEE_DETAIL_FIELD_KEYS,
  HEADER_FILTER_STORAGE_KEY,
  applyLoginNoticePayload,
  applySystemSettingsPayload: (...args) => applySystemSettingsPayload(...args),
  cancelAccountEdit: (...args) => {
    if (typeof cancelAccountEdit === "function") {
      return cancelAccountEdit(...args);
    }

    return undefined;
  },
  clearAutoLogoutCountdownInterval,
  clearAutoLogoutTimer,
  createAccountEditorState,
  createExamineeDetailState,
  createHeaderFilters,
  createPdfGenerationState,
  createSystemDataDeletionState,
  createTemplatePreviewState,
  getAccountGridRows,
  getExamineeGridRows,
  getPrintHistoryRows,
  reconcileHeaderFilters: (...args) => {
    if (typeof reconcileHeaderFilters === "function") {
      return reconcileHeaderFilters(...args);
    }

    return undefined;
  },
  reconcileLookupFilters: (...args) => {
    if (typeof reconcileLookupFilters === "function") {
      return reconcileLookupFilters(...args);
    }

    return undefined;
  },
  redirectToAccessibleRouteIfNeeded,
  registeredExamineeCount,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  setAccountGridRows,
  setExamineeGridRows,
  setPrintHistoryRows,
  setTemplateCards: (cards) => {
    state.templateCards = Array.isArray(cards) ? cards : [];
  },
  state,
  syncAutoLogoutCountdown,
  syncPdfGenerationOverlay: (...args) => {
    if (typeof syncPdfGenerationOverlay === "function") {
      return syncPdfGenerationOverlay(...args);
    }

    return undefined;
  },
  todayPrintCount,
  totalPrintCount,
});
const {
  applyBootstrapPayload,
  areExamineeDetailDraftsEqual,
  buildExamineeDetailDraft,
  clearHeaderFilters,
  getCurrentUserRole,
  normalizeAccountRecord,
  normalizeExamineeRecord,
  persistHeaderFilters,
  reconcileExamineeDetailState,
  resetBootstrapData,
  resetGridPages,
  updateMetricBadges,
} = bootstrapDataController;
const bootstrapLoaderController = createBootstrapLoaderController({
  apiRequest,
  applyBootstrapPayload,
  applyLoginNoticePayload,
  handleAuthenticationFailure: (...args) => {
    if (typeof handleAuthenticationFailure === "function") {
      return handleAuthenticationFailure(...args);
    }

    return false;
  },
  isUserAuthenticated,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  state,
  updateAuthChrome: (...args) => {
    if (typeof updateAuthChrome === "function") {
      return updateAuthChrome(...args);
    }

    return undefined;
  },
});
const { loadBootstrapData, loadLoginNoticeData } = bootstrapLoaderController;

const authSessionController = createAuthSessionController({
  apiRequest,
  appShell,
  clearAutoLogoutTimer,
  consumeFlashToast,
  createAuthState,
  currentUserId,
  currentUserRole,
  getDefaultAccessibleView,
  hideToast,
  isLoginPage,
  isRouteNavigating: () => isRouteNavigating,
  isUserAuthenticated,
  loadBootstrapData,
  loadLoginNoticeData,
  logoutButton,
  navigateToLogin,
  navigateToView,
  normalizeAuthAccount,
  pageShell,
  passwordSetupForm,
  queueFlashToast,
  redirectToAccessibleRouteIfNeeded,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  resetBootstrapData,
  showToast,
  sidebar,
  state,
  syncAutoLogoutCountdown,
  syncCurrentViewFromLocation,
  syncNavigationVisibility,
  syncPasswordSetupModal,
  topbar,
});
const {
  applyAuthPayload,
  closePasswordSetupPrompt,
  handleAuthenticationFailure,
  loadAuthSession,
  logoutCurrentUser,
  resetAuthFormState,
  setLoggedOutState,
  submitLogin,
  submitPasswordSetup,
  updateAuthChrome,
} = authSessionController;
const accountSystemRuntimeController = createAccountSystemRuntimeController({
  MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
  SYSTEM_DATA_DELETE_CONFIG,
  accountCreateError,
  accountCreateForm,
  accountCreateId,
  accountCreateModal,
  accountCreateName,
  accountCreateRole,
  accountRoleOptions,
  apiRequest,
  appendAccountRecord: appendAccountGridRow,
  closeModal: (...args) => {
    if (typeof globalThis.closeModal === "function") {
      return globalThis.closeModal(...args);
    }

    return undefined;
  },
  createAccountCreateController,
  createSystemSettingsController,
  getSortedAccountRows: () => {
    if (typeof globalThis.getGridRows === "function") {
      return globalThis.getGridRows("accountManagementGrid");
    }

    return getAccountGridRows();
  },
  getSystemAutoLogoutInputElement: () => document.getElementById("systemSettingsAutoLogoutMinutes"),
  getSystemInitialPassword,
  getTableState: (...args) => {
    if (typeof globalThis.getTableState === "function") {
      return globalThis.getTableState(...args);
    }

    return null;
  },
  handleAuthenticationFailure,
  loadBootstrapData,
  normalizeAccountRecord,
  normalizeSystemAutoLogoutMinutes,
  normalizeSystemSettingsPayload,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  showToast,
  state,
  syncAccountCreateDescription,
  syncAutoLogoutTimer,
});
const {
  applySystemSettingsPayload,
  changeSystemAutoLogoutMinutes,
  deleteSystemDataAction,
  getDefaultAccountRole,
  getSystemDataDeletionStatusElement,
  getSystemSettingsStatusElement,
  getValidatedSystemSettingsPayload,
  prepareAccountCreateModal,
  resetAccountCreateFormState,
  saveSystemSettings,
  setAccountCreateError,
  setSystemDataDeletionStatus,
  setSystemSettingsStatus,
  submitAccountCreate,
  syncAccountCreateRoleOptions,
  syncAccountCreateSubmitButton,
} = accountSystemRuntimeController;
const workflowRuntimeController = createWorkflowRuntimeController({
  BATCH_PRINT_JOB_TIMEOUT_MS,
  BATCH_PRINT_STATUS_POLL_INTERVAL_MS,
  MIN_UPLOAD_OVERLAY_DISPLAY_MS,
  apiRequest,
  apiRequestForBlobWithProgress,
  apiRequestWithUploadProgress,
  arrayBufferToBase64,
  buildApiUrl,
  buildUploadSummaryMessage,
  clearSelectedUploadFiles,
  createAdmitCardWorkflowController,
  createBusyOverlayController,
  createExamineeUploadWorkflowController,
  createPdfGenerationState,
  createUploadState,
  getDocumentBody: () => document.body,
  getExamineeGridRows,
  getGridRowId: (...args) => (typeof getGridRowId === "function" ? getGridRowId(...args) : ""),
  getGridRows: (...args) => (typeof getGridRows === "function" ? getGridRows(...args) : []),
  getGridSelectedRowIds: (...args) => (typeof getGridSelectedRowIds === "function" ? getGridSelectedRowIds(...args) : []),
  getPdfGenerationElements: () => ({
    overlay: pdfGenerationOverlay,
    messageElement: pdfGenerationMessage,
    progressElement: pdfGenerationProgress,
    progressLabelElement: pdfGenerationProgressLabel,
    progressValueElement: pdfGenerationProgressValue,
    progressBarElement: pdfGenerationProgressBar,
    progressFillElement: pdfGenerationProgressFill,
  }),
  getUploadFileInput: () => uploadFileInput,
  getUploadOverlayElements: () => ({
    overlay: uploadOverlay,
    titleElement: uploadOverlayTitle,
    messageElement: uploadOverlayMessage,
    progressElement: uploadOverlayProgress,
    progressLabelElement: uploadOverlayProgressLabel,
    progressValueElement: uploadOverlayProgressValue,
    progressBarElement: uploadOverlayProgressBar,
    progressFillElement: uploadOverlayProgressFill,
  }),
  getUploadPhotoArchiveInput: () => uploadPhotoArchiveInput,
  handleAuthenticationFailure,
  hideToast,
  loadBootstrapData,
  mergeUploadResult,
  readFileAsArrayBuffer,
  renderView: (...args) => {
    if (typeof globalThis.renderView === "function") {
      return globalThis.renderView(...args);
    }

    return undefined;
  },
  setUploadOverlayStateFallback: (...args) => {
    if (typeof setUploadOverlayState === "function") {
      return setUploadOverlayState(...args);
    }

    return undefined;
  },
  showToast,
  state,
  wait,
  waitForNextFrame,
});
const {
  batchPrintSelectedExaminees,
  buildBusyOverlayMessage,
  buildPdfGenerationMessage,
  buildUploadOverlayMessage,
  closeUploadOverlayWithAlert,
  closeUploadOverlayWithToast,
  fetchExamineeAdmitCardPdfUrl,
  getSelectedAdmitCardExamineeCount,
  getSelectedAdmitCardExaminees,
  isBusyOverlayActive,
  isPdfGenerationActive,
  isUploadActive,
  normalizeExamineeNoList,
  normalizeProgressValue,
  openPdfWindow,
  printExamineeAdmitCard,
  printPdfUrl,
  readUploadFileAsBase64,
  recordExamineePrint,
  resetPdfGenerationState,
  resetUploadState,
  runWithPdfGenerationLock,
  setPdfGenerationState,
  setUploadOverlayState,
  showUploadFailureAlert,
  syncAppBusyState,
  syncPdfGenerationOverlay,
  syncUploadOverlay,
  uploadPhotoArchiveFile,
  uploadSelectedExamineeFile,
} = workflowRuntimeController;

