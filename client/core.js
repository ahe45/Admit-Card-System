const HEADER_FILTER_STORAGE_KEY = "admitcard.headerFilters";
const LOGIN_NOTICE_STORAGE_KEY = "admitcard.loginNoticeHtml";
const FLASH_TOAST_STORAGE_KEY = "admitcard.flashToast";
const DEFAULT_SYSTEM_INITIAL_PASSWORD = "1111";
const DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES = 0;
const MAX_SYSTEM_AUTO_LOGOUT_MINUTES = 1440;
const appConfig = globalThis.AdmitCardAppConfig;

if (!appConfig) {
  throw new Error("shared/app-config.js must be loaded before client/core.js.");
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

function createHeaderFilters() {
  return {
    track: "",
    admission: "",
    date: "",
    time: "",
  };
}

function createLookupFilters() {
  return {
    date: "",
    time: "",
    track: "",
    admission: "",
    unit: "",
    major: "",
    building: "",
    room: "",
    examineeNo: "",
    examineeName: "",
  };
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

function normalizeSystemInitialPassword(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || DEFAULT_SYSTEM_INITIAL_PASSWORD;
}

function normalizeSystemAutoLogoutMinutes(value) {
  const normalizedValue = Math.round(Number(value));

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    return DEFAULT_SYSTEM_AUTO_LOGOUT_MINUTES;
  }

  return Math.min(MAX_SYSTEM_AUTO_LOGOUT_MINUTES, normalizedValue);
}

function normalizeSystemSettingsPayload(payload = {}) {
  return {
    initialPassword: normalizeSystemInitialPassword(payload.initialPassword),
    autoLogoutMinutes: String(normalizeSystemAutoLogoutMinutes(payload.autoLogoutMinutes)),
  };
}

function createSystemSettingsState() {
  return {
    ...normalizeSystemSettingsPayload(),
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

function getDefaultLoginNoticeHtml(initialPassword = DEFAULT_SYSTEM_INITIAL_PASSWORD) {
  return [
    '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">계정 안내</span></p>',
    "<p><strong>ID : 계정 관리에 등록된 계정 ID</strong></p>",
    `<p><strong>PW : ${initialPassword}(초기 비밀번호)</strong></p>`,
    "<p>최초 로그인 시 비밀번호를 변경해야 서비스를 사용할 수 있습니다.</p>",
  ].join("");
}

function loadStoredLoginNoticeHtml() {
  try {
    const storedValue = window.localStorage.getItem(LOGIN_NOTICE_STORAGE_KEY);

    return storedValue !== null ? String(storedValue) : getDefaultLoginNoticeHtml();
  } catch (error) {
    return getDefaultLoginNoticeHtml();
  }
}

function createLoginNoticeState() {
  const storedHtml = loadStoredLoginNoticeHtml();

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
  headerFilters: loadStoredHeaderFilters(),
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

const appShell = document.getElementById("appShell");
const viewRoot = document.getElementById("viewRoot");
const pageShell = document.getElementById("pageShell");
const topbar = document.getElementById("topbar");
const pageTitle = document.getElementById("pageTitle");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const uploadModal = document.getElementById("uploadModal");
const passwordSetupModal = document.getElementById("passwordSetupModal");
const accountCreateModal = document.getElementById("accountCreateModal");
const examineeDetailModal = document.getElementById("examineeDetailModal");
const examineeDetailCloseConfirmModal = document.getElementById("examineeDetailCloseConfirmModal");
const templatePreviewModal = document.getElementById("templatePreviewModal");
const templateEditorModal = document.getElementById("templateEditorModal");
const brandHome = document.getElementById("brandHome");
const currentUserRole = document.getElementById("currentUserRole");
const currentUserId = document.getElementById("currentUserId");
const logoutButton = document.getElementById("logoutButton");
const autoLogoutCountdown = document.getElementById("autoLogoutCountdown");
const autoLogoutCountdownValue = document.getElementById("autoLogoutCountdownValue");
const uploadFileInput = document.getElementById("uploadFileInput");
const uploadFileName = document.getElementById("uploadFileName");
const uploadPhotoArchiveInput = document.getElementById("uploadPhotoArchiveInput");
const uploadPhotoArchiveName = document.getElementById("uploadPhotoArchiveName");
const registeredExamineeCount = document.getElementById("registeredExamineeCount");
const todayPrintCount = document.getElementById("todayPrintCount");
const totalPrintCount = document.getElementById("totalPrintCount");
const examineeDetailSaveButton = document.getElementById("examineeDetailSaveButton");
const examineeDetailBody = document.getElementById("examineeDetailBody");
const examineeDetailCloseConfirmMessage = document.getElementById("examineeDetailCloseConfirmMessage");
const examineeDetailCloseConfirmSummary = document.getElementById("examineeDetailCloseConfirmSummary");
const templatePreviewTitle = document.getElementById("templatePreviewTitle");
const templatePreviewMeta = document.getElementById("templatePreviewMeta");
const templatePreviewStage = document.getElementById("templatePreviewStage");
const templateEditorTitle = document.getElementById("templateEditorTitle");
const templateEditorName = document.getElementById("templateEditorName");
const templateEditorDescription = document.getElementById("templateEditorDescription");
let templateEditorFontFamily = null;
let templateEditorFontSize = null;
let templateEditorBlockType = null;
let templateEditorCellWidth = null;
let templateEditorRowHeight = null;
let templateEditorSizeScope = null;
let templateEditorTextColor = null;
let templateEditorCellShading = null;
let templateEditorTextShading = null;
let templateEditorTableInsertPanel = null;
let templateEditorTableRows = null;
let templateEditorTableColumns = null;
const templateEditorSurface = document.getElementById("templateEditorSurface");
const templateEditorStatus = document.getElementById("templateEditorStatus");
let templateEditorImageInput = null;
const passwordSetupDescription = document.getElementById("passwordSetupDescription");
const passwordSetupForm = document.getElementById("passwordSetupForm");
const passwordSetupNext = document.getElementById("passwordSetupNext");
const passwordSetupConfirm = document.getElementById("passwordSetupConfirm");
const passwordSetupError = document.getElementById("passwordSetupError");
const accountCreateForm = document.getElementById("accountCreateForm");
const accountCreateDescription = document.getElementById("accountCreateDescription");
const accountCreateId = document.getElementById("accountCreateId");
const accountCreateName = document.getElementById("accountCreateName");
const accountCreateRole = document.getElementById("accountCreateRole");
const accountCreateError = document.getElementById("accountCreateError");
const toastRoot = document.getElementById("toastRoot");
const pdfGenerationOverlay = document.getElementById("pdfGenerationOverlay");
const pdfGenerationMessage = document.getElementById("pdfGenerationMessage");
const pdfGenerationProgress = document.getElementById("pdfGenerationProgress");
const pdfGenerationProgressLabel = document.getElementById("pdfGenerationProgressLabel");
const pdfGenerationProgressValue = document.getElementById("pdfGenerationProgressValue");
const pdfGenerationProgressBar = document.getElementById("pdfGenerationProgressBar");
const pdfGenerationProgressFill = document.getElementById("pdfGenerationProgressFill");
const uploadOverlay = document.getElementById("uploadOverlay");
const uploadOverlayTitle = document.getElementById("uploadOverlayTitle");
const uploadOverlayMessage = document.getElementById("uploadOverlayMessage");
const uploadOverlayProgress = document.getElementById("uploadOverlayProgress");
const uploadOverlayProgressLabel = document.getElementById("uploadOverlayProgressLabel");
const uploadOverlayProgressValue = document.getElementById("uploadOverlayProgressValue");
const uploadOverlayProgressBar = document.getElementById("uploadOverlayProgressBar");
const uploadOverlayProgressFill = document.getElementById("uploadOverlayProgressFill");

function refreshTemplateEditorToolbarElements() {
  templateEditorFontFamily = document.getElementById("templateEditorFontFamily");
  templateEditorFontSize = document.getElementById("templateEditorFontSize");
  templateEditorBlockType = document.getElementById("templateEditorBlockType");
  templateEditorCellWidth = document.getElementById("templateEditorCellWidth");
  templateEditorRowHeight = document.getElementById("templateEditorRowHeight");
  templateEditorSizeScope = document.getElementById("templateEditorSizeScope");
  templateEditorTextColor = document.getElementById("templateEditorTextColor");
  templateEditorCellShading = document.getElementById("templateEditorCellShading");
  templateEditorTextShading = document.getElementById("templateEditorTextShading");
  templateEditorTableInsertPanel = document.getElementById("templateEditorTableInsertPanel");
  templateEditorTableRows = document.getElementById("templateEditorTableRows");
  templateEditorTableColumns = document.getElementById("templateEditorTableColumns");
  templateEditorImageInput = document.getElementById("templateEditorImageInput");
}

refreshTemplateEditorToolbarElements();
let templateEditorImageOverlay = null;
let isRouteNavigating = false;
let toastTimerId = 0;
let autoLogoutTimerId = 0;
let autoLogoutCountdownIntervalId = 0;
let autoLogoutDeadlineAt = 0;
let loginAutofocusTimerId = 0;
const MIN_UPLOAD_OVERLAY_DISPLAY_MS = 1000;
const BATCH_PRINT_STATUS_POLL_INTERVAL_MS = 400;
const BATCH_PRINT_JOB_TIMEOUT_MS = 1000 * 60 * 30;
const titles = pageTitles;

syncAccountCreateDescription();

function navigateToPath(pathname, { replace = false } = {}) {
  const targetPath = normalizeRoutePath(pathname);
  const currentPath = getCurrentRoutePath();

  if (targetPath === currentPath) {
    return false;
  }

  isRouteNavigating = true;

  if (replace) {
    window.location.replace(targetPath);
    return true;
  }

  window.location.assign(targetPath);
  return true;
}

function navigateToView(view, options = {}) {
  return navigateToPath(getViewRoutePath(view), options);
}

function navigateToLogin(options = {}) {
  return navigateToPath(LOGIN_ROUTE_PATH, options);
}

function syncCurrentViewFromLocation() {
  state.currentView = loadCurrentViewFromLocation();
  return state.currentView;
}

function redirectToAccessibleRouteIfNeeded({ replace = true } = {}) {
  if (!isUserAuthenticated() || isLoginPage()) {
    return false;
  }

  const requestedView = getRequestedViewFromLocation();

  if (!requestedView || isViewAccessible(requestedView)) {
    return false;
  }

  return navigateToView(getDefaultAccessibleView(), { replace });
}

function queueFlashToast(message, type = "success", duration = 3200) {
  const normalizedMessage = String(message || "").trim();

  if (!normalizedMessage) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      FLASH_TOAST_STORAGE_KEY,
      JSON.stringify({
        message: normalizedMessage,
        type: type || "success",
        duration: Number(duration) || 3200,
      }),
    );
  } catch (error) {
    // Ignore session storage failures and continue without cross-page toast delivery.
  }
}

function consumeFlashToast() {
  try {
    const storedValue = window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    window.sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);
    const payload = JSON.parse(storedValue);
    showToast(payload?.message || "", payload?.type || "success", payload?.duration || 3200);
  } catch (error) {
    // Ignore invalid session storage data.
  }
}

let examineeGridRows = [];
let printHistoryRows = [];
let accountGridRows = [];
const headerFilterFields = [
  { id: "headerTrack", key: "track" },
  { id: "headerAdmission", key: "admission" },
  { id: "headerExamDate", key: "date" },
  { id: "headerTime", key: "time" },
];
const lookupSelectFields = [
  { id: "searchDate", key: "date" },
  { id: "searchTime", key: "time" },
  { id: "searchTrack", key: "track" },
  { id: "searchAdmission", key: "admission" },
  { id: "searchUnit", key: "unit" },
  { id: "searchMajor", key: "major" },
  { id: "searchBuilding", key: "building" },
  { id: "searchRoom", key: "room" },
];
const lookupSelectKeys = lookupSelectFields.map((field) => field.key);
const lookupTextFields = [
  { id: "searchExamineeNo", key: "examineeNo" },
  { id: "searchExamineeName", key: "examineeName" },
];
const resultGridColumns = [
  { key: "date", label: "날짜", sortable: true, filterable: true },
  { key: "time", label: "시간", sortable: true, filterable: true },
  { key: "track", label: "모집시기", sortable: true, filterable: true },
  { key: "admission", label: "전형", sortable: true, filterable: true },
  { key: "unit", label: "모집단위", sortable: true, filterable: true },
  { key: "major", label: "전공", sortable: true, filterable: true },
  { key: "building", label: "고사건물", sortable: true, filterable: true },
  { key: "room", label: "고사실", sortable: true, filterable: true },
  { key: "group", label: "조", sortable: true, filterable: true },
  { key: "examineeNo", label: "수험번호", sortable: true, filterable: true },
  { key: "name", label: "이름", sortable: true, filterable: true },
  { key: "birth", label: "생년월일", sortable: true, filterable: true },
];
const admitCardLookupGridColumns = resultGridColumns.map((column) => (
  column.key === "date"
    ? { ...column, label: "시험날짜" }
    : column
));
const examineeRegistrationGridColumns = resultGridColumns.map((column) => (
  column.key === "date"
    ? { ...column, label: "시험날짜" }
    : column
));
const examineePhotoColumn = { key: "hasPhoto", label: "사진", sortable: true, filterable: true };
const printHistoryGridColumns = [
  ...resultGridColumns.map((column) => (
    column.key === "date"
      ? { ...column, label: "시험날짜" }
      : column
  )),
  { key: "printedAt", label: "출력시각", sortable: true, filterable: true },
];
const accountGridColumns = [
  { key: "id", label: "ID", sortable: true, filterable: true },
  { key: "name", label: "이름", sortable: true, filterable: true },
  { key: "role", label: "권한", sortable: true, filterable: true },
  { key: "recentAccess", label: "최근 접속", sortable: true, filterable: true },
  { key: "editAction", label: "수정", sortable: false, filterable: false },
  { key: "resetAction", label: "초기화", sortable: false, filterable: false },
  { key: "deleteAction", label: "삭제", sortable: false, filterable: false },
];
function getApiBaseUrl() {
  const explicitBaseUrl = window.localStorage.getItem("admitcard.apiBaseUrl");

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const currentOrigin = window.location.origin;

  if (currentOrigin === "http://localhost:3000" || currentOrigin === "http://127.0.0.1:3000") {
    return currentOrigin;
  }

  return "http://localhost:3000";
}

function buildApiUrl(resource) {
  if (/^https?:\/\//i.test(resource)) {
    return resource;
  }

  return new URL(resource, `${getApiBaseUrl()}/`).toString();
}

async function apiRequest(resource, options = {}) {
  const requestOptions = {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  };
  const response = await fetch(buildApiUrl(resource), requestOptions);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(payload?.error || payload || "요청 처리 중 오류가 발생했습니다.");
    error.status = response.status;
    error.code = payload?.code || "";
    throw error;
  }

  return payload;
}

function parseApiPayload(contentType, responseText) {
  if (!String(contentType || "").includes("application/json")) {
    return responseText;
  }

  return responseText ? JSON.parse(responseText) : {};
}

function apiRequestWithUploadProgress(resource, options = {}, callbacks = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const requestHeaders = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const requestUrl = buildApiUrl(resource);
    let didNotifyUploadComplete = false;

    const notifyUploadComplete = () => {
      if (didNotifyUploadComplete) {
        return;
      }

      didNotifyUploadComplete = true;
      callbacks.onUploadComplete?.();
    };

    xhr.open(options.method || "GET", requestUrl, true);
    xhr.withCredentials = options.credentials === "include";

    Object.entries(requestHeaders).forEach(([headerName, headerValue]) => {
      xhr.setRequestHeader(headerName, headerValue);
    });

    xhr.addEventListener("load", () => {
      notifyUploadComplete();

      try {
        const contentType = xhr.getResponseHeader("content-type") || "";
        const payload = parseApiPayload(contentType, xhr.responseText || "");

        if (xhr.status < 200 || xhr.status >= 300) {
          const error = new Error(payload?.error || payload || "요청 처리 중 오류가 발생했습니다.");
          error.status = xhr.status;
          error.code = payload?.code || "";
          reject(error);
          return;
        }

        resolve(payload);
      } catch (error) {
        reject(error);
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("요청 처리 중 네트워크 오류가 발생했습니다."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("요청이 중단되었습니다."));
    });

    if (xhr.upload) {
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          return;
        }

        callbacks.onProgress?.({
          loaded: event.loaded,
          total: event.total,
          percent: event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      });

      xhr.upload.addEventListener("load", notifyUploadComplete);
    }

    xhr.send(options.body || null);
  });
}

function apiRequestForBlobWithProgress(resource, options = {}, callbacks = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const requestHeaders = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const requestUrl = buildApiUrl(resource);
    let didNotifyResponseStart = false;

    const notifyResponseStart = () => {
      if (didNotifyResponseStart) {
        return;
      }

      didNotifyResponseStart = true;
      callbacks.onResponseStart?.();
    };

    xhr.open(options.method || "GET", requestUrl, true);
    xhr.responseType = "blob";
    xhr.withCredentials = options.credentials === "include";

    Object.entries(requestHeaders).forEach(([headerName, headerValue]) => {
      xhr.setRequestHeader(headerName, headerValue);
    });

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
        notifyResponseStart();
      }
    });

    xhr.addEventListener("progress", (event) => {
      notifyResponseStart();
      callbacks.onProgress?.({
        loaded: event.loaded,
        total: event.total,
        lengthComputable: event.lengthComputable,
        percent: event.lengthComputable && event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0,
      });
    });

    xhr.addEventListener("load", async () => {
      notifyResponseStart();

      try {
        const contentType = xhr.getResponseHeader("content-type") || "";
        const responseBlob = xhr.response instanceof Blob ? xhr.response : new Blob();

        if (xhr.status < 200 || xhr.status >= 300) {
          const responseText = await responseBlob.text();
          const payload = parseApiPayload(contentType, responseText);
          const error = new Error(payload?.error || payload || "요청 처리 중 오류가 발생했습니다.");
          error.status = xhr.status;
          error.code = payload?.code || "";
          reject(error);
          return;
        }

        resolve({
          blob: responseBlob,
          contentType,
        });
      } catch (error) {
        reject(error);
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("요청 처리 중 네트워크 오류가 발생했습니다."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("요청이 중단되었습니다."));
    });

    xhr.send(options.body || null);
  });
}

function normalizeAuthAccount(record = {}) {
  if (!record) {
    return null;
  }

  return {
    id: String(record.id || ""),
    name: String(record.name || ""),
    role: String(record.role || "조회용"),
  };
}

function isUserAuthenticated() {
  return state.auth.status === "authenticated";
}

function getSystemInitialPassword() {
  return normalizeSystemInitialPassword(state.systemSettings.initialPassword);
}

function getSystemAutoLogoutMinutes() {
  return normalizeSystemAutoLogoutMinutes(state.systemSettings.autoLogoutMinutes);
}

function getSystemSettingsStatusElement() {
  return document.getElementById("systemSettingsStatus");
}

function syncLoginFormAutofocus() {
  if (loginAutofocusTimerId) {
    window.clearTimeout(loginAutofocusTimerId);
    loginAutofocusTimerId = 0;
  }

  if (state.auth.status !== "logged_out" || state.auth.isSubmittingLogin) {
    return;
  }

  loginAutofocusTimerId = window.setTimeout(() => {
    loginAutofocusTimerId = 0;

    const preferredInputId = String(state.auth.loginForm.id || "").trim() ? "loginPassword" : "loginAccountId";
    const preferredInput = document.getElementById(preferredInputId);
    const fallbackInput = document.getElementById("loginAccountId");
    const focusTarget =
      preferredInput instanceof HTMLInputElement && !preferredInput.disabled
        ? preferredInput
        : fallbackInput instanceof HTMLInputElement && !fallbackInput.disabled
          ? fallbackInput
          : null;

    if (!focusTarget) {
      return;
    }

    focusTarget.focus();

    if (typeof focusTarget.setSelectionRange === "function") {
      const cursorPosition = focusTarget.value.length;
      focusTarget.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, 0);
}

function getSystemDataDeletionStatusElement() {
  return document.getElementById("systemDataDeletionStatus");
}

function getSystemAutoLogoutInputElement() {
  return document.getElementById("systemSettingsAutoLogoutMinutes");
}

function setSystemSettingsStatus(message = "", type = "") {
  state.systemSettings.statusMessage = String(message || "");
  state.systemSettings.statusType = type;

  const statusElement = getSystemSettingsStatusElement();

  if (!statusElement) {
    return;
  }

  statusElement.textContent = state.systemSettings.statusMessage;
  statusElement.classList.toggle("hidden", !state.systemSettings.statusMessage);
  statusElement.classList.toggle("warning", type === "warning");
}

function setSystemDataDeletionStatus(message = "", type = "") {
  state.systemDataDeletion.statusMessage = String(message || "");
  state.systemDataDeletion.statusType = type;

  const statusElement = getSystemDataDeletionStatusElement();

  if (!statusElement) {
    return;
  }

  statusElement.textContent = state.systemDataDeletion.statusMessage;
  statusElement.classList.toggle("hidden", !state.systemDataDeletion.statusMessage);
  statusElement.classList.toggle("warning", type === "warning");
}

function syncAccountCreateDescription() {
  if (!accountCreateDescription) {
    return;
  }

  accountCreateDescription.textContent = `새 계정을 추가하면 초기 비밀번호는 ${getSystemInitialPassword()}로 설정됩니다.`;
}

function clearAutoLogoutTimer() {
  if (!autoLogoutTimerId) {
    return;
  }

  window.clearTimeout(autoLogoutTimerId);
  autoLogoutTimerId = 0;
}

function clearAutoLogoutCountdownInterval() {
  if (!autoLogoutCountdownIntervalId) {
    return;
  }

  window.clearInterval(autoLogoutCountdownIntervalId);
  autoLogoutCountdownIntervalId = 0;
}

function formatAutoLogoutRemainingTime(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

function syncAutoLogoutCountdown() {
  const shouldShowCountdown =
    isUserAuthenticated() &&
    getSystemAutoLogoutMinutes() > 0 &&
    Number.isFinite(autoLogoutDeadlineAt) &&
    autoLogoutDeadlineAt > 0;

  if (autoLogoutCountdown) {
    autoLogoutCountdown.classList.toggle("hidden", !shouldShowCountdown);
  }

  if (!shouldShowCountdown) {
    if (autoLogoutCountdownValue) {
      autoLogoutCountdownValue.textContent = "00:00";
    }

    if (autoLogoutCountdown) {
      autoLogoutCountdown.title = "활동이 없으면 자동 로그아웃됩니다.";
    }

    return;
  }

  const remainingMs = Math.max(0, autoLogoutDeadlineAt - Date.now());
  const formattedRemainingTime = formatAutoLogoutRemainingTime(remainingMs);

  if (autoLogoutCountdownValue) {
    autoLogoutCountdownValue.textContent = formattedRemainingTime;
  }

  if (autoLogoutCountdown) {
    autoLogoutCountdown.title = `활동이 없으면 ${formattedRemainingTime} 후 자동 로그아웃됩니다.`;
  }
}

function syncAutoLogoutTimer() {
  clearAutoLogoutTimer();
  clearAutoLogoutCountdownInterval();
  autoLogoutDeadlineAt = 0;
  syncAutoLogoutCountdown();

  if (!isUserAuthenticated()) {
    return;
  }

  const autoLogoutMinutes = getSystemAutoLogoutMinutes();

  if (autoLogoutMinutes <= 0) {
    return;
  }

  const timeoutMs = autoLogoutMinutes * 60 * 1000;
  autoLogoutDeadlineAt = Date.now() + timeoutMs;
  autoLogoutTimerId = window.setTimeout(() => {
    handleAutoLogoutTimeout(autoLogoutMinutes);
  }, timeoutMs);
  autoLogoutCountdownIntervalId = window.setInterval(syncAutoLogoutCountdown, 1000);
  syncAutoLogoutCountdown();
}

function recordAutoLogoutActivity() {
  if (!isUserAuthenticated() || getSystemAutoLogoutMinutes() <= 0) {
    return;
  }

  syncAutoLogoutTimer();
}

async function handleAutoLogoutTimeout(autoLogoutMinutes = getSystemAutoLogoutMinutes()) {
  clearAutoLogoutTimer();
  clearAutoLogoutCountdownInterval();
  autoLogoutDeadlineAt = 0;
  syncAutoLogoutCountdown();

  if (!isUserAuthenticated()) {
    return;
  }

  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore logout request failures and clear the local state anyway.
  }

  queueFlashToast(`${autoLogoutMinutes}분 동안 활동이 없어 자동 로그아웃되었습니다.`, "error", 4200);
  setLoggedOutState({
    preserveLoginId: true,
    message: "",
  });
  updateAuthChrome();
  renderView();
  navigateToLogin({ replace: true });
}

function applySystemSettingsPayload(payload = {}, options = {}) {
  const nextSettings = normalizeSystemSettingsPayload(payload);

  state.systemSettings.initialPassword = nextSettings.initialPassword;
  state.systemSettings.autoLogoutMinutes = nextSettings.autoLogoutMinutes;

  if (!options.preserveStatus) {
    state.systemSettings.statusMessage = "";
    state.systemSettings.statusType = "";
  }

  syncAccountCreateDescription();
  syncAutoLogoutTimer();
}

function changeSystemAutoLogoutMinutes(delta) {
  const normalizedDelta = Number(delta);

  if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    return;
  }

  const nextValue = Math.min(
    MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
    Math.max(0, normalizeSystemAutoLogoutMinutes(state.systemSettings.autoLogoutMinutes) + normalizedDelta),
  );

  state.systemSettings.autoLogoutMinutes = String(nextValue);

  if (state.systemSettings.statusMessage) {
    setSystemSettingsStatus("");
  }

  const inputElement = getSystemAutoLogoutInputElement();

  if (inputElement) {
    inputElement.value = state.systemSettings.autoLogoutMinutes;
    inputElement.focus();
  }
}

function getValidatedSystemSettingsPayload() {
  const initialPassword = String(state.systemSettings.initialPassword ?? "").trim();
  const autoLogoutMinutes = Math.round(Number(state.systemSettings.autoLogoutMinutes));

  if (!initialPassword) {
    throw new Error("초기 비밀번호를 입력하세요.");
  }

  if (initialPassword.length < 4) {
    throw new Error("초기 비밀번호는 4자 이상이어야 합니다.");
  }

  if (initialPassword.length > 100) {
    throw new Error("초기 비밀번호는 100자 이하여야 합니다.");
  }

  if (!Number.isFinite(autoLogoutMinutes) || autoLogoutMinutes < 0 || autoLogoutMinutes > MAX_SYSTEM_AUTO_LOGOUT_MINUTES) {
    throw new Error(`자동 로그아웃 시간은 0분 이상 ${MAX_SYSTEM_AUTO_LOGOUT_MINUTES}분 이하로 입력하세요.`);
  }

  return {
    initialPassword,
    autoLogoutMinutes,
  };
}

function resetBootstrapData() {
  clearAutoLogoutTimer();
  clearAutoLogoutCountdownInterval();
  autoLogoutDeadlineAt = 0;
  examineeGridRows = [];
  printHistoryRows = [];
  accountGridRows = [];
  state.templateCards = [];
  state.systemDataDeletion = createSystemDataDeletionState();
  state.metrics = {
    registeredExaminees: 0,
    todayPrints: 0,
    totalPrints: 0,
  };
  state.pdfGeneration = createPdfGenerationState();
  state.bootstrap.error = "";
  state.bootstrap.isLoading = false;
  state.bootstrap.serverDate = "";
  state.examineeDetail = createExamineeDetailState();
  state.accountEditor = createAccountEditorState();
  state.templatePreview = createTemplatePreviewState();
  updateMetricBadges();
  syncPdfGenerationOverlay();
  syncAutoLogoutCountdown();
}

function syncPasswordSetupModal() {
  if (!passwordSetupModal) {
    return;
  }

  const isOpen = state.auth.status === "password_setup";
  const passwordSetupSubmitButton = passwordSetupForm?.querySelector("[data-password-setup-submit]");
  const passwordSetupCloseButtons = Array.from(passwordSetupModal.querySelectorAll("[data-password-setup-close]"));

  passwordSetupModal.classList.toggle("hidden", !isOpen);
  passwordSetupModal.setAttribute("aria-hidden", isOpen ? "false" : "true");

  if (passwordSetupDescription) {
    const accountName = state.auth.currentUser?.name || state.auth.currentUser?.id || "선택한 계정";
    passwordSetupDescription.textContent = `${accountName} 계정은 초기 비밀번호를 변경해야 관리자 페이지를 사용할 수 있습니다.`;
  }

  if (passwordSetupError) {
    const message = state.auth.passwordSetup.error || "";
    passwordSetupError.textContent = message;
    passwordSetupError.classList.toggle("hidden", !message);
  }

  if (passwordSetupNext && passwordSetupNext.value !== state.auth.passwordSetup.password) {
    passwordSetupNext.value = state.auth.passwordSetup.password;
  }

  if (passwordSetupConfirm && passwordSetupConfirm.value !== state.auth.passwordSetup.passwordConfirm) {
    passwordSetupConfirm.value = state.auth.passwordSetup.passwordConfirm;
  }

  if (passwordSetupSubmitButton) {
    passwordSetupSubmitButton.disabled = !isOpen || state.auth.isSubmittingPasswordSetup;
    passwordSetupSubmitButton.textContent = state.auth.isSubmittingPasswordSetup ? "설정 중..." : "비밀번호 설정";
  }

  passwordSetupCloseButtons.forEach((button) => {
    button.disabled = !isOpen || state.auth.isSubmittingPasswordSetup;
  });

  if (
    isOpen &&
    passwordSetupNext &&
    document.activeElement !== passwordSetupNext &&
    document.activeElement !== passwordSetupConfirm
  ) {
    window.setTimeout(() => {
      passwordSetupNext.focus();
    }, 0);
  }
}

function syncLoginErrorMessage() {
  const loginError = document.getElementById("loginError");

  if (!loginError) {
    return;
  }

  const message = state.auth.error || "";
  loginError.textContent = message;
  loginError.classList.toggle("hidden", !message);
}

function syncToast() {
  if (!toastRoot) {
    return;
  }

  const shouldShow = state.toast.visible && state.toast.message;
  toastRoot.classList.toggle("has-toast", Boolean(shouldShow));
  toastRoot.replaceChildren();

  if (!shouldShow) {
    return;
  }

  const toastMessage = document.createElement("div");
  toastMessage.className = `toast-message toast-${state.toast.type || "success"}`;
  toastMessage.setAttribute("role", "status");
  toastMessage.textContent = state.toast.message;
  toastRoot.appendChild(toastMessage);
}

function hideToast() {
  if (toastTimerId) {
    window.clearTimeout(toastTimerId);
    toastTimerId = 0;
  }

  state.toast.visible = false;
  state.toast.message = "";
  state.toast.type = "success";
  syncToast();
}

function showToast(message, type = "success", duration = 3200) {
  if (toastTimerId) {
    window.clearTimeout(toastTimerId);
    toastTimerId = 0;
  }

  state.toast.visible = true;
  state.toast.message = String(message || "").trim();
  state.toast.type = type || "success";
  syncToast();

  if (!state.toast.message) {
    return;
  }

  toastTimerId = window.setTimeout(() => {
    hideToast();
  }, duration);
}

function isPdfGenerationActive() {
  return Boolean(state.pdfGeneration?.isActive);
}

function isUploadActive() {
  return Boolean(state.upload?.isActive);
}

function isBusyOverlayActive() {
  return isPdfGenerationActive() || isUploadActive();
}

function buildBusyOverlayMessage(message = "") {
  const headline = String(message || "").trim();

  return headline
    ? `${headline}\n잠시만 기다려 주세요.`
    : "잠시만\n기다려 주세요.";
}

function buildPdfGenerationMessage(message = "") {
  return buildBusyOverlayMessage(message);
}

function buildUploadOverlayMessage(message = "") {
  return buildBusyOverlayMessage(message);
}

function normalizeProgressValue(value) {
  const normalizedValue = Math.round(Number(value));

  if (!Number.isFinite(normalizedValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, normalizedValue));
}

function syncAppBusyState() {
  document.body.classList.toggle("app-busy", isBusyOverlayActive());
}

function syncPdfGenerationOverlay() {
  const isActive = isPdfGenerationActive();
  const progressMode = state.pdfGeneration?.progressMode || "hidden";
  const hasProgress = isActive && progressMode !== "hidden";
  const progressValue = normalizeProgressValue(state.pdfGeneration?.progressValue);

  if (pdfGenerationOverlay) {
    pdfGenerationOverlay.classList.toggle("hidden", !isActive);
    pdfGenerationOverlay.setAttribute("aria-hidden", isActive ? "false" : "true");
  }

  if (pdfGenerationMessage) {
    pdfGenerationMessage.textContent = state.pdfGeneration?.message || buildPdfGenerationMessage();
  }

  if (pdfGenerationProgress) {
    pdfGenerationProgress.classList.toggle("hidden", !hasProgress);
    pdfGenerationProgress.setAttribute("aria-hidden", hasProgress ? "false" : "true");
  }

  if (pdfGenerationProgressLabel) {
    pdfGenerationProgressLabel.textContent = state.pdfGeneration?.progressLabel || "PDF 생성 진행률";
  }

  if (pdfGenerationProgressValue) {
    pdfGenerationProgressValue.textContent = progressMode === "determinate" ? `${progressValue}%` : "진행 중";
  }

  if (pdfGenerationProgressBar) {
    pdfGenerationProgressBar.classList.toggle("is-indeterminate", progressMode === "indeterminate");
  }

  if (pdfGenerationProgressFill) {
    pdfGenerationProgressFill.style.width = progressMode === "determinate" ? `${progressValue}%` : "";
  }

  syncAppBusyState();
}

function setPdfGenerationState({
  isActive = state.pdfGeneration?.isActive,
  message = "",
  progressMode = state.pdfGeneration?.progressMode || "hidden",
  progressValue = state.pdfGeneration?.progressValue || 0,
  progressLabel = state.pdfGeneration?.progressLabel || "",
} = {}) {
  const nextIsActive = Boolean(isActive);

  state.pdfGeneration = {
    ...createPdfGenerationState(),
    ...state.pdfGeneration,
    isActive: nextIsActive,
    message: nextIsActive ? buildPdfGenerationMessage(message) : "",
    progressMode: nextIsActive ? progressMode : "hidden",
    progressValue: nextIsActive ? normalizeProgressValue(progressValue) : 0,
    progressLabel: nextIsActive ? String(progressLabel || "") : "",
  };
  syncPdfGenerationOverlay();
}

function resetPdfGenerationState() {
  state.pdfGeneration = createPdfGenerationState();
  syncPdfGenerationOverlay();
}

async function runWithPdfGenerationLock(message, task, options = {}) {
  if (isPdfGenerationActive()) {
    return null;
  }

  setPdfGenerationState({
    isActive: true,
    message,
    progressMode: options.progressMode || "hidden",
    progressLabel: options.progressLabel || "",
  });

  try {
    return await task();
  } finally {
    resetPdfGenerationState();
  }
}

function syncUploadOverlay() {
  const isActive = isUploadActive();
  const progressMode = state.upload?.progressMode || "hidden";
  const hasProgress = isActive && progressMode !== "hidden";
  const progressValue = normalizeProgressValue(state.upload?.progressValue);

  if (uploadOverlay) {
    uploadOverlay.classList.toggle("hidden", !isActive);
    uploadOverlay.setAttribute("aria-hidden", isActive ? "false" : "true");
  }

  if (uploadOverlayTitle) {
    uploadOverlayTitle.textContent = state.upload?.title || "수험생 데이터 업로드 중";
  }

  if (uploadOverlayMessage) {
    uploadOverlayMessage.textContent = state.upload?.message || buildUploadOverlayMessage();
  }

  if (uploadOverlayProgress) {
    uploadOverlayProgress.classList.toggle("hidden", !hasProgress);
    uploadOverlayProgress.setAttribute("aria-hidden", hasProgress ? "false" : "true");
  }

  if (uploadOverlayProgressLabel) {
    uploadOverlayProgressLabel.textContent = state.upload?.progressLabel || "업로드 진행률";
  }

  if (uploadOverlayProgressValue) {
    uploadOverlayProgressValue.textContent = progressMode === "determinate" ? `${progressValue}%` : "진행 중";
  }

  if (uploadOverlayProgressBar) {
    uploadOverlayProgressBar.classList.toggle("is-indeterminate", progressMode === "indeterminate");
  }

  if (uploadOverlayProgressFill) {
    uploadOverlayProgressFill.style.width = progressMode === "determinate" ? `${progressValue}%` : "";
  }

  syncAppBusyState();
}

function setUploadOverlayState({
  isActive = state.upload?.isActive,
  title = state.upload?.title,
  message = "",
  progressMode = state.upload?.progressMode || "hidden",
  progressValue = state.upload?.progressValue || 0,
  progressLabel = state.upload?.progressLabel || "",
} = {}) {
  const nextIsActive = Boolean(isActive);
  const wasActive = Boolean(state.upload?.isActive);
  const activatedAt = nextIsActive
    ? wasActive && state.upload?.activatedAt
      ? state.upload.activatedAt
      : Date.now()
    : 0;

  state.upload = {
    ...createUploadState(),
    ...state.upload,
    isActive: nextIsActive,
    activatedAt,
    title: String(title || state.upload?.title || createUploadState().title),
    message: nextIsActive ? buildUploadOverlayMessage(message) : "",
    progressMode: nextIsActive ? progressMode : "hidden",
    progressValue: nextIsActive ? normalizeProgressValue(progressValue) : 0,
    progressLabel: nextIsActive ? String(progressLabel || "") : "",
  };
  syncUploadOverlay();
}

function resetUploadState() {
  state.upload = createUploadState();
  syncUploadOverlay();
}

async function closeUploadOverlayWithToast(message, type = "success", duration = 3200) {
  const activatedAt = Number(state.upload?.activatedAt || 0);
  const elapsedMs = activatedAt > 0 ? Date.now() - activatedAt : 0;
  const remainingMs = Math.max(0, MIN_UPLOAD_OVERLAY_DISPLAY_MS - elapsedMs);

  if (remainingMs > 0) {
    await wait(remainingMs);
  }

  resetUploadState();
  showToast(message, type, duration);
}

function showUploadFailureAlert(message) {
  const normalizedMessage = String(message || "").trim();

  if (!normalizedMessage) {
    return;
  }

  hideToast();
  window.alert(normalizedMessage);
}

async function closeUploadOverlayWithAlert(message) {
  const activatedAt = Number(state.upload?.activatedAt || 0);
  const elapsedMs = activatedAt > 0 ? Date.now() - activatedAt : 0;
  const remainingMs = Math.max(0, MIN_UPLOAD_OVERLAY_DISPLAY_MS - elapsedMs);

  if (remainingMs > 0) {
    await wait(remainingMs);
  }

  resetUploadState();
  showUploadFailureAlert(message);
}

function getDefaultAccountRole() {
  return accountRoleOptions.includes("관리자") ? "관리자" : String(accountRoleOptions[0] || "조회용");
}

function syncAccountCreateRoleOptions(selectedRole = getDefaultAccountRole()) {
  if (!accountCreateRole) {
    return;
  }

  const optionElements = accountRoleOptions.map((role) => {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = role;
    option.selected = role === selectedRole;
    return option;
  });

  accountCreateRole.replaceChildren(...optionElements);
  accountCreateRole.value = selectedRole;
}

function setAccountCreateError(message = "") {
  if (!accountCreateError) {
    return;
  }

  const normalizedMessage = String(message || "").trim();
  accountCreateError.textContent = normalizedMessage;
  accountCreateError.classList.toggle("hidden", !normalizedMessage);
}

function syncAccountCreateSubmitButton(isSubmitting = false) {
  const submitButton = accountCreateForm?.querySelector("[data-account-create-submit]");

  if (!submitButton) {
    return;
  }

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "등록 중..." : "등록";
}

function resetAccountCreateFormState() {
  accountCreateForm?.reset();

  if (accountCreateId) {
    accountCreateId.value = "";
  }

  if (accountCreateName) {
    accountCreateName.value = "";
  }

  syncAccountCreateRoleOptions();
  setAccountCreateError("");
  syncAccountCreateSubmitButton(false);
}

function prepareAccountCreateModal() {
  if (!accountCreateModal) {
    return;
  }

  resetAccountCreateFormState();
  window.setTimeout(() => {
    accountCreateId?.focus();
  }, 0);
}

async function submitAccountCreate() {
  const accountId = String(accountCreateId?.value || "").trim();
  const name = String(accountCreateName?.value || "").trim();
  const role = String(accountCreateRole?.value || "").trim();

  if (!accountId) {
    setAccountCreateError("계정 ID를 입력하세요.");
    accountCreateId?.focus();
    return;
  }

  if (!name) {
    setAccountCreateError("계정 이름을 입력하세요.");
    accountCreateName?.focus();
    return;
  }

  if (!accountRoleOptions.includes(role)) {
    setAccountCreateError("계정 권한을 선택하세요.");
    accountCreateRole?.focus();
    return;
  }

  setAccountCreateError("");
  syncAccountCreateSubmitButton(true);

  try {
    const createdAccount = await apiRequest("/api/accounts", {
      method: "POST",
      body: JSON.stringify({
        id: accountId,
        name,
        role,
      }),
    });

    accountGridRows = [...accountGridRows, normalizeAccountRecord(createdAccount)];

    if (typeof getTableState === "function") {
      const tableState = getTableState("accountManagementGrid");
      const sortedRows = typeof getGridRows === "function" ? getGridRows("accountManagementGrid") : accountGridRows;
      const createdIndex = sortedRows.findIndex((row) => row.id === createdAccount.id);

      if (tableState && createdIndex >= 0) {
        tableState.page = Math.floor(createdIndex / tableState.pageSize) + 1;
      }
    }

    closeModal("accountCreateModal");
    renderView();
    showToast(`계정을 등록했습니다. 초기 비밀번호는 ${getSystemInitialPassword()}입니다.`);
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    setAccountCreateError(error.message);
  } finally {
    syncAccountCreateSubmitButton(false);
  }
}

async function saveSystemSettings() {
  let nextSettings;

  try {
    nextSettings = getValidatedSystemSettingsPayload();
  } catch (error) {
    setSystemSettingsStatus(error.message, "warning");
    return;
  }

  state.systemSettings.isSaving = true;
  setSystemSettingsStatus("");
  renderView();

  try {
    const savedSettings = await apiRequest("/api/system-settings", {
      method: "PUT",
      body: JSON.stringify(nextSettings),
    });

    applySystemSettingsPayload(savedSettings, { preserveStatus: true });
    setSystemSettingsStatus("시스템 설정을 저장했습니다.");
    showToast("시스템 설정을 저장했습니다.");
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    setSystemSettingsStatus(error.message, "warning");
  } finally {
    state.systemSettings.isSaving = false;
    renderView();
  }
}

function buildSystemDataDeletionSuccessMessage(result = {}) {
  const scope = String(result.scope || "").trim();
  const deletedExaminees = Number(result.deletedExaminees || 0);
  const deletedPhotos = Number(result.deletedPhotos || 0);
  const deletedPrintHistory = Number(result.deletedPrintHistory || 0);

  if (scope === "all") {
    return `전체 데이터를 삭제했습니다. 수험생 ${deletedExaminees}건, 사진 ${deletedPhotos}건, 출력 이력 ${deletedPrintHistory}건이 정리되었습니다.`;
  }

  if (scope === "photos") {
    return `사진 데이터 ${deletedPhotos}건을 삭제했습니다.`;
  }

  return `수험표 출력 이력 ${deletedPrintHistory}건을 삭제했습니다.`;
}

async function deleteSystemDataAction(scope) {
  const normalizedScope = String(scope || "").trim();
  const config = SYSTEM_DATA_DELETE_CONFIG[normalizedScope];

  if (!config || state.systemDataDeletion.isDeleting) {
    return;
  }

  if (!window.confirm(config.confirmMessage)) {
    return;
  }

  state.systemDataDeletion.isDeleting = true;
  state.systemDataDeletion.activeScope = normalizedScope;
  setSystemDataDeletionStatus("");
  renderView();

  try {
    const result = await apiRequest(`/api/system-data/${encodeURIComponent(normalizedScope)}`, {
      method: "DELETE",
    });

    await loadBootstrapData({ showLoading: false });

    const successMessage = buildSystemDataDeletionSuccessMessage(result);
    setSystemDataDeletionStatus(successMessage);
    showToast(successMessage);
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    setSystemDataDeletionStatus(error.message, "warning");
  } finally {
    state.systemDataDeletion.isDeleting = false;
    state.systemDataDeletion.activeScope = "";
    renderView();
  }
}

function updateAuthChrome() {
  const isAuthenticated = isUserAuthenticated();

  appShell?.classList.toggle("auth-locked", !isAuthenticated);
  pageShell?.classList.toggle("auth-only", !isAuthenticated);
  sidebar?.classList.toggle("hidden", !isAuthenticated);
  topbar?.classList.toggle("hidden", !isAuthenticated);

  if (logoutButton) {
    logoutButton.disabled = !isAuthenticated;
  }

  if (currentUserRole) {
    currentUserRole.textContent = state.auth.currentUser?.role || "로그인 필요";
  }

  if (currentUserId) {
    currentUserId.textContent = state.auth.currentUser?.id || "-";
  }

  syncAutoLogoutCountdown();
  syncNavigationVisibility();
  syncPasswordSetupModal();
}

function applyAuthPayload(payload = {}) {
  const account = normalizeAuthAccount(payload.account);

  state.auth.currentUser = account;
  state.auth.error = "";

  if (payload.authenticated && account) {
    state.auth.status = "authenticated";
    state.auth.passwordSetup.error = "";
    return;
  }

  if (payload.requiresPasswordChange && account) {
    state.auth.status = "password_setup";
    return;
  }

  state.auth.status = "logged_out";
}

function resetAuthFormState() {
  state.auth.isSubmittingLogin = false;
  state.auth.isSubmittingPasswordSetup = false;
  state.auth.loginForm.password = "";
  state.auth.passwordSetup = {
    password: "",
    passwordConfirm: "",
    error: "",
  };

  if (passwordSetupForm) {
    passwordSetupForm.reset();
  }
}

function setLoggedOutState({ preserveLoginId = true, message = "" } = {}) {
  const nextLoginId = preserveLoginId ? state.auth.loginForm.id : "";

  if (typeof closeAllModals === "function") {
    closeAllModals();
  }

  hideToast();
  resetBootstrapData();
  state.auth = createAuthState();
  state.auth.status = "logged_out";
  state.auth.loginForm.id = nextLoginId;
  state.auth.error = message;
}

function handleAuthenticationFailure(error) {
  if (!error || (error.code !== "AUTH_REQUIRED" && error.code !== "PASSWORD_SETUP_REQUIRED")) {
    return false;
  }

  if (error.code === "PASSWORD_SETUP_REQUIRED") {
    clearAutoLogoutTimer();
    state.auth.status = "password_setup";
    state.auth.passwordSetup.error = "초기 비밀번호를 먼저 설정하세요.";
    updateAuthChrome();
    renderView();

    if (!isLoginPage()) {
      navigateToLogin({ replace: true });
    }

    return true;
  }

  if (isLoginPage()) {
    showToast("세션이 만료되었습니다. 다시 로그인하세요.", "error", 4200);
  } else {
    queueFlashToast("세션이 만료되었습니다. 다시 로그인하세요.", "error", 4200);
  }
  setLoggedOutState({
    preserveLoginId: false,
    message: "",
  });
  updateAuthChrome();
  renderView();

  if (!isLoginPage()) {
    navigateToLogin({ replace: true });
  }

  return true;
}

async function loadAuthSession() {
  clearAutoLogoutTimer();
  syncCurrentViewFromLocation();
  let didNavigate = false;
  state.auth.status = "loading";
  state.auth.error = "";
  updateAuthChrome();
  renderView();

  try {
    const payload = await apiRequest("/api/auth/session");
    applyAuthPayload(payload);
    syncCurrentViewFromLocation();

    if (state.auth.status === "authenticated") {
      if (isLoginPage()) {
        didNavigate = navigateToView(getDefaultAccessibleView(state.auth.currentUser?.role), { replace: true }) || didNavigate;
        return;
      }

      if (redirectToAccessibleRouteIfNeeded()) {
        didNavigate = true;
        return;
      }

      await loadBootstrapData({ showLoading: false });
    } else {
      resetBootstrapData();

      if (!isLoginPage()) {
        didNavigate = navigateToLogin({ replace: true }) || didNavigate;
        return;
      }
    }
  } catch (error) {
    setLoggedOutState({
      preserveLoginId: false,
      message: isLoginPage() ? error.message : "",
    });

    if (!isLoginPage()) {
      queueFlashToast(error.message, "error", 4200);
      didNavigate = navigateToLogin({ replace: true }) || didNavigate;
      return;
    }
  } finally {
    updateAuthChrome();
    renderView();

    if (!didNavigate && !isRouteNavigating) {
      consumeFlashToast();
    }
  }
}

async function submitLogin() {
  const accountId = String(state.auth.loginForm.id || "").trim();
  const password = String(state.auth.loginForm.password || "");

  if (!accountId || !password) {
    state.auth.error = "계정 ID와 비밀번호를 모두 입력하세요.";
    renderView();
    return;
  }

  state.auth.error = "";
  state.auth.isSubmittingLogin = true;
  renderView();

  try {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        id: accountId,
        password,
      }),
    });

    applyAuthPayload(payload);
    state.auth.loginForm.password = "";
    state.auth.passwordSetup.error = "";

    if (state.auth.status === "authenticated") {
      navigateToView(getDefaultAccessibleView(state.auth.currentUser?.role), { replace: true });
      return;
    } else {
      resetBootstrapData();
    }
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    state.auth.error = error.message;
  } finally {
    state.auth.isSubmittingLogin = false;
    updateAuthChrome();
    renderView();
  }
}

async function closePasswordSetupPrompt() {
  if (state.auth.status !== "password_setup" || state.auth.isSubmittingPasswordSetup) {
    return;
  }

  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore logout failures and clear the local password-setup state anyway.
  }

  setLoggedOutState({
    preserveLoginId: true,
    message: "",
  });
  updateAuthChrome();
  renderView();

  if (!isLoginPage()) {
    navigateToLogin({ replace: true });
  }
}

async function submitPasswordSetup() {
  const nextPassword = String(state.auth.passwordSetup.password || "");
  const passwordConfirm = String(state.auth.passwordSetup.passwordConfirm || "");

  state.auth.passwordSetup.error = "";

  if (!nextPassword || !passwordConfirm) {
    state.auth.passwordSetup.error = "새 비밀번호와 확인 값을 모두 입력하세요.";
    syncPasswordSetupModal();
    return;
  }

  state.auth.isSubmittingPasswordSetup = true;
  syncPasswordSetupModal();

  try {
    const payload = await apiRequest("/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({
        password: nextPassword,
        passwordConfirm,
      }),
    });

    applyAuthPayload(payload);
    resetAuthFormState();

    if (state.auth.status === "authenticated") {
      queueFlashToast("변경된 비밀번호로 로그인에 성공했습니다.");
      navigateToView(getDefaultAccessibleView(state.auth.currentUser?.role), { replace: true });
      return;
    }
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    state.auth.passwordSetup.error = error.message;
  } finally {
    state.auth.isSubmittingPasswordSetup = false;
    updateAuthChrome();
    renderView();
  }
}

async function logoutCurrentUser() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Ignore logout request failures and clear the local state anyway.
  }

  setLoggedOutState({
    preserveLoginId: false,
    message: "",
  });
  updateAuthChrome();
  renderView();
  navigateToLogin({ replace: true });
}

function loadStoredHeaderFilters() {
  const defaultFilters = createHeaderFilters();

  try {
    const storedValue = window.localStorage.getItem(HEADER_FILTER_STORAGE_KEY);

    if (!storedValue) {
      return defaultFilters;
    }

    const parsedValue = JSON.parse(storedValue);

    const nextFilters = Object.keys(defaultFilters).reduce((filters, key) => {
      filters[key] = parsedValue?.[key] ?? defaultFilters[key];
      return filters;
    }, {});

    if (!nextFilters.admission && parsedValue?.exam) {
      nextFilters.admission = parsedValue.exam;
    }

    return nextFilters;
  } catch (error) {
    return defaultFilters;
  }
}

function getCurrentUserRole() {
  return String(state.auth.currentUser?.role || "").trim();
}

function getVisibleMenuViewsForRole(role = getCurrentUserRole()) {
  return new Set(getVisibleMenuViewsForRoleConfig(role));
}

function getAccessibleViewsForRole(role = getCurrentUserRole()) {
  return new Set(getAccessibleViewsForRoleConfig(role));
}

function getDefaultAccessibleView(role = getCurrentUserRole()) {
  return getDefaultAccessibleViewForRole(role);
}

function isViewAccessible(view, role = getCurrentUserRole()) {
  return isViewAccessibleForRole(String(view || "").trim(), role);
}

function syncNavigationVisibility() {
  const visibleViews = isUserAuthenticated() ? getVisibleMenuViewsForRole() : new Set();
  const navigationItems = Array.from(document.querySelectorAll(".nav-item[data-view]"));

  navigationItems.forEach((item) => {
    const isVisible = visibleViews.has(item.dataset.view);
    item.classList.toggle("hidden", !isVisible);
    item.disabled = !isVisible;
    item.setAttribute("aria-hidden", isVisible ? "false" : "true");
  });
}

function persistLoginNoticeHtml() {
  try {
    window.localStorage.setItem(LOGIN_NOTICE_STORAGE_KEY, state.loginNotice.savedHtml);
  } catch (error) {
    // Ignore storage failures and keep the in-memory state.
  }
}

function persistHeaderFilters() {
  try {
    const headerFilterKeys = Object.keys(createHeaderFilters());
    const persistedFilters = headerFilterKeys.reduce((filters, key) => {
      filters[key] = state.headerFilters[key] || "";
      return filters;
    }, {});

    window.localStorage.setItem(HEADER_FILTER_STORAGE_KEY, JSON.stringify(persistedFilters));
  } catch (error) {
    // Ignore storage failures and keep the in-memory state.
  }
}

function resetGridPages() {
  Object.values(state.tableSettings).forEach((tableState) => {
    tableState.page = 1;
  });
}

function clearHeaderFilters() {
  state.headerFilters = createHeaderFilters();
  reconcileLookupFilters();
  persistHeaderFilters();
  resetGridPages();
  renderView();
}

function updateMetricBadges() {
  if (registeredExamineeCount) {
    registeredExamineeCount.textContent = `${state.metrics.registeredExaminees}명`;
  }

  if (todayPrintCount) {
    todayPrintCount.textContent = `${state.metrics.todayPrints}건`;
  }

  if (totalPrintCount) {
    totalPrintCount.textContent = `${state.metrics.totalPrints}건`;
  }
}

const EXAMINEE_DETAIL_FIELD_KEYS = Object.freeze([
  "date",
  "time",
  "track",
  "admission",
  "unit",
  "major",
  "building",
  "room",
  "group",
  "examineeNo",
  "name",
  "birth",
]);

function normalizeExamineeRecord(record = {}) {
  const time = String(record.time ?? record.session ?? "");
  const track = String(record.track ?? "");
  const admission = String(record.admission ?? record.exam ?? "");
  const unit = String(record.unit ?? "");
  const group = String(record.group ?? "");
  const examineeNo = String(record.examineeNo ?? "");

  return {
    ...record,
    time,
    session: time,
    track,
    admission,
    exam: admission,
    unit,
    group,
    examineeNo,
    hasPhoto: record.hasPhoto === true || record.hasPhoto === "true" || Number(record.hasPhoto) === 1,
    photoVersion: Number(record.photoVersion || 0),
  };
}

function buildExamineeDetailDraft(record = {}) {
  const normalizedRecord = normalizeExamineeRecord(record);

  return EXAMINEE_DETAIL_FIELD_KEYS.reduce((draft, fieldKey) => {
    draft[fieldKey] = String(normalizedRecord?.[fieldKey] ?? "");
    return draft;
  }, {});
}

function areExamineeDetailDraftsEqual(leftRecord = null, rightRecord = null) {
  if (!leftRecord || !rightRecord) {
    return false;
  }

  return EXAMINEE_DETAIL_FIELD_KEYS.every((fieldKey) => String(leftRecord[fieldKey] ?? "") === String(rightRecord[fieldKey] ?? ""));
}

function reconcileExamineeDetailState() {
  const selectedExamineeNo = String(state.examineeDetail?.selectedExamineeNo || state.examineeDetail?.originalExamineeNo || "").trim();

  if (!selectedExamineeNo) {
    state.examineeDetail = createExamineeDetailState();
    return;
  }

  const matchedRow =
    examineeGridRows.find((row) => row.examineeNo === selectedExamineeNo) ||
    examineeGridRows.find((row) => row.examineeNo === state.examineeDetail.originalExamineeNo) ||
    null;

  if (!matchedRow) {
    state.examineeDetail = createExamineeDetailState();
    return;
  }

  const nextBaseRecord = buildExamineeDetailDraft(matchedRow);
  const hasUnsavedChanges =
    state.examineeDetail.draftRecord &&
    state.examineeDetail.baseRecord &&
    !areExamineeDetailDraftsEqual(state.examineeDetail.draftRecord, state.examineeDetail.baseRecord);

  state.examineeDetail = {
    ...state.examineeDetail,
    selectedExamineeNo: matchedRow.examineeNo,
    originalExamineeNo: matchedRow.examineeNo,
    baseRecord: nextBaseRecord,
    draftRecord: hasUnsavedChanges ? state.examineeDetail.draftRecord : nextBaseRecord,
  };
}

function applyBootstrapPayload(payload) {
  applySystemSettingsPayload(payload.systemSettings);
  examineeGridRows = Array.isArray(payload.examinees) ? payload.examinees.map(normalizeExamineeRecord) : [];
  printHistoryRows = Array.isArray(payload.printHistory) ? payload.printHistory.map(normalizeExamineeRecord) : [];
  accountGridRows = Array.isArray(payload.accounts) ? payload.accounts.map(normalizeAccountRecord) : [];
  state.templateCards = Array.isArray(payload.templates) ? payload.templates : [];
  state.bootstrap.serverDate = String(payload.serverDate || "").trim();
  state.metrics = {
    registeredExaminees: Number(payload.summary?.registeredExaminees || examineeGridRows.length),
    todayPrints: Number(payload.summary?.todayPrints || 0),
    totalPrints: Number(payload.summary?.totalPrints || printHistoryRows.length),
  };

  reconcileExamineeDetailState();

  if (state.accountEditor.editingId && !accountGridRows.some((row) => row.id === state.accountEditor.editingId)) {
    cancelAccountEdit();
  }

  if (state.auth.currentUser?.id) {
    const currentAccount = accountGridRows.find((row) => row.id === state.auth.currentUser.id);

    if (currentAccount) {
      state.auth.currentUser = {
        ...state.auth.currentUser,
        name: currentAccount.name,
        role: currentAccount.role,
      };
    }
  }

  if (redirectToAccessibleRouteIfNeeded()) {
    return;
  }

  reconcileHeaderFilters();
  reconcileLookupFilters();
  persistHeaderFilters();
  updateMetricBadges();
}

function normalizeAccountRecord(record = {}) {
  return {
    id: String(record.id || ""),
    name: String(record.name || ""),
    role: String(record.role || "조회용"),
    recentAccess: String(record.recentAccess || "-"),
  };
}

async function loadBootstrapData({ showLoading = true } = {}) {
  if (!isUserAuthenticated()) {
    state.bootstrap.isLoading = false;
    state.bootstrap.error = "";
    return;
  }

  state.bootstrap.error = "";

  if (showLoading) {
    state.bootstrap.isLoading = true;
    renderView();
  }

  try {
    const payload = await apiRequest("/api/bootstrap");
    applyBootstrapPayload(payload);
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    state.bootstrap.error = error.message;
  } finally {
    state.bootstrap.isLoading = false;
    updateAuthChrome();
    renderView();
  }
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    window.setTimeout(resolve, 0);
  });
}

function wait(delayMs) {
  const normalizedDelay = Math.max(0, Math.round(Number(delayMs) || 0));

  if (normalizedDelay === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, normalizedDelay);
  });
}

function readFileAsArrayBuffer(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0,
      });
    });
    reader.addEventListener("load", () => {
      onProgress?.({
        loaded: file?.size || 0,
        total: file?.size || 0,
        percent: 100,
      });
      resolve(reader.result);
    });
    reader.addEventListener("error", () => reject(new Error("파일을 읽는 중 오류가 발생했습니다.")));
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

async function readUploadFileAsBase64(
  file,
  {
    readingMessage,
    encodingMessage,
    progressLabel,
    encodingProgressLabel = progressLabel,
  } = {},
) {
  if (!file) {
    return "";
  }

  setUploadOverlayState({
    isActive: true,
    message: readingMessage,
    progressMode: "determinate",
    progressValue: 0,
    progressLabel,
  });

  const buffer = await readFileAsArrayBuffer(file, {
    onProgress: ({ percent }) => {
      setUploadOverlayState({
        isActive: true,
        message: readingMessage,
        progressMode: "determinate",
        progressValue: percent,
        progressLabel,
      });
    },
  });

  setUploadOverlayState({
    isActive: true,
    message: encodingMessage,
    progressMode: "indeterminate",
    progressLabel: encodingProgressLabel,
  });
  await waitForNextFrame();
  return arrayBufferToBase64(buffer);
}

function clearSelectedUploadFiles() {
  if (uploadFileInput) {
    uploadFileInput.value = "";
  }
  if (uploadFileName) {
    uploadFileName.textContent = "선택된 데이터 파일이 없습니다.";
  }
  if (uploadPhotoArchiveInput) {
    uploadPhotoArchiveInput.value = "";
  }
  if (uploadPhotoArchiveName) {
    uploadPhotoArchiveName.textContent = "선택된 사진 ZIP이 없습니다.";
  }
}

function buildUploadSummaryMessage(result = {}, { hasPhotoArchive = false } = {}) {
  const processed = Number(result.processed || 0);
  const photoUploaded = Number(result.photoUploaded || 0);
  const photoSkipped = Number(result.photoSkipped || 0);
  const messages = [];

  if (processed > 0) {
    messages.push(`${processed}건의 수험생 데이터를 저장했습니다.`);
  }

  if (photoUploaded > 0 || hasPhotoArchive) {
    messages.push(`사진 ${photoUploaded}건을 매칭했습니다.`);
  }

  if (photoSkipped > 0) {
    messages.push(`${photoSkipped}건은 파일명 불일치 또는 미등록 수험번호로 건너뛰었습니다.`);
  }

  return messages.join(" ") || "업로드를 완료했습니다.";
}

async function downloadExamineeTemplate() {
  try {
    const response = await fetch(buildApiUrl("/api/examinees/template.xlsx"));
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      throw new Error(payload?.error || payload || "XLSX 템플릿을 다운로드할 수 없습니다.");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = "수험생 데이터 업로드 양식.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    showToast(error.message, "error", 4200);
  }
}

async function downloadExamineeGridWorkbook() {
  const filteredRows =
    typeof getGridRows === "function"
      ? getGridRows("examineeRegistrationGrid")
      : [];

  if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
    showToast("필터링된 데이터가 없습니다.", "error", 4200);
    return;
  }

  try {
    const response = await fetch(buildApiUrl("/api/examinees/export.xlsx"), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: filteredRows,
      }),
    });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      throw new Error(payload?.error || payload || "수험생 데이터 XLSX를 다운로드할 수 없습니다.");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = "수험생 등록 데이터.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    showToast(error.message, "error", 4200);
  }
}

async function downloadPrintHistoryGridWorkbook() {
  const filteredRows =
    typeof getGridRows === "function"
      ? getGridRows("printHistoryGrid")
      : [];
  const summaryExaminees =
    typeof getPrintHistorySummaryExamineeRows === "function"
      ? getPrintHistorySummaryExamineeRows()
      : [];

  if ((!Array.isArray(filteredRows) || filteredRows.length === 0) && (!Array.isArray(summaryExaminees) || summaryExaminees.length === 0)) {
    showToast("필터링된 데이터가 없습니다.", "error", 4200);
    return;
  }

  try {
    const response = await fetch(buildApiUrl("/api/print-history/export.xlsx"), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: filteredRows,
        summaryExaminees,
      }),
    });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      throw new Error(payload?.error || payload || "출력 이력 XLSX를 다운로드할 수 없습니다.");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = "수험표 출력 이력.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    showToast(error.message, "error", 4200);
  }
}

async function uploadSelectedExamineeFile() {
  const file = uploadFileInput?.files?.[0];
  const photoArchiveFile = uploadPhotoArchiveInput?.files?.[0];

  if (!file && !photoArchiveFile) {
    showUploadFailureAlert("XLSX 파일 또는 사진 ZIP 파일을 먼저 선택하세요.");
    return;
  }

  if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
    showUploadFailureAlert("현재는 XLSX 업로드만 지원합니다.");
    return;
  }

  if (photoArchiveFile && !photoArchiveFile.name.toLowerCase().endsWith(".zip")) {
    showUploadFailureAlert("수험생 사진은 ZIP 파일로 업로드해야 합니다.");
    return;
  }

  if (isUploadActive()) {
    return;
  }

  try {
    const hasXlsx = Boolean(file);
    const hasPhotoArchive = Boolean(photoArchiveFile);
    const fileContentBase64 = file
      ? await readUploadFileAsBase64(file, {
          readingMessage: "XLSX 파일을 읽는 중입니다.",
          encodingMessage: "XLSX 파일을 업로드 형식으로 준비하고 있습니다.",
          progressLabel: "XLSX 읽기",
          encodingProgressLabel: "XLSX 준비",
        })
      : "";
    const photoArchiveContentBase64 = photoArchiveFile
      ? await readUploadFileAsBase64(photoArchiveFile, {
          readingMessage: "사진 ZIP을 읽는 중입니다.",
          encodingMessage: "사진 ZIP을 업로드 형식으로 준비하고 있습니다.",
          progressLabel: "사진 ZIP 읽기",
          encodingProgressLabel: "사진 ZIP 준비",
        })
      : "";
    const requestBody = JSON.stringify({
      fileName: file?.name || "",
      fileContentBase64,
      photoArchiveName: photoArchiveFile?.name || "",
      photoArchiveContentBase64,
    });
    const uploadProgressLabel = hasPhotoArchive ? "사진 ZIP 전송" : "업로드 전송";
    const serverProcessingLabel = hasPhotoArchive ? "사진 매칭 및 저장" : "수험생 데이터 저장";

    setUploadOverlayState({
      isActive: true,
      message: "업로드 파일을 서버로 전송하고 있습니다.",
      progressMode: "determinate",
      progressValue: 0,
      progressLabel: uploadProgressLabel,
    });

    const result = await apiRequestWithUploadProgress("/api/examinees/import", {
      method: "POST",
      body: requestBody,
    }, {
      onProgress: ({ percent }) => {
        setUploadOverlayState({
          isActive: true,
          message: "업로드 파일을 서버로 전송하고 있습니다.",
          progressMode: "determinate",
          progressValue: percent,
          progressLabel: uploadProgressLabel,
        });
      },
      onUploadComplete: () => {
        setUploadOverlayState({
          isActive: true,
          message: "업로드 데이터를 MariaDB에 반영하고 있습니다.",
          progressMode: "indeterminate",
          progressLabel: serverProcessingLabel,
        });
      },
    });

    setUploadOverlayState({
      isActive: true,
      message: "업로드 결과를 화면에 반영하고 있습니다.",
      progressMode: "indeterminate",
      progressLabel: "목록 새로고침",
    });
    await loadBootstrapData({ showLoading: false });
    clearSelectedUploadFiles();
    setUploadOverlayState({
      isActive: true,
      message: "업로드를 마무리하고 있습니다.",
      progressMode: "determinate",
      progressValue: 100,
      progressLabel: "업로드 완료",
    });
    await closeUploadOverlayWithToast(buildUploadSummaryMessage(result, { hasPhotoArchive }), "success", 4200);
  } catch (error) {
    if (isUploadActive()) {
      const currentProgressMode = state.upload?.progressMode || "hidden";
      setUploadOverlayState({
        isActive: true,
        message: "업로드 처리를 정리하고 있습니다.",
        progressMode: currentProgressMode,
        progressValue: currentProgressMode === "determinate" ? state.upload?.progressValue || 0 : 0,
        progressLabel: state.upload?.progressLabel || "",
      });
      await closeUploadOverlayWithAlert(error.message);
      return;
    }

    showUploadFailureAlert(error.message);
  }
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

function getSelectedAdmitCardExaminees() {
  if (
    typeof getGridRows !== "function" ||
    typeof getGridRowId !== "function" ||
    typeof getGridSelectedRowIds !== "function"
  ) {
    return [];
  }

  const selectedRowIds = new Set(getGridSelectedRowIds("admitCardLookupGrid"));

  return getGridRows("admitCardLookupGrid").filter((row) =>
    selectedRowIds.has(getGridRowId("admitCardLookupGrid", row)),
  );
}

function getSelectedAdmitCardExamineeCount() {
  return getSelectedAdmitCardExaminees().length;
}

async function fetchExamineeAdmitCardPdfUrl(examineeNo) {
  const response = await fetch(buildApiUrl(`/api/examinees/${encodeURIComponent(examineeNo)}/admit-card.pdf`));
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    throw new Error(payload?.error || payload || "수험표 PDF를 생성할 수 없습니다.");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function openPdfWindow(pdfUrl, { shouldPrint = false } = {}) {
  const normalizedUrl = String(pdfUrl || "").trim();

  if (!normalizedUrl) {
    return null;
  }

  const previewWindow = window.open(normalizedUrl, "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    return null;
  }

  previewWindow.focus();

  if (shouldPrint) {
    window.setTimeout(() => {
      try {
        previewWindow.print();
      } catch (error) {
        // Ignore print invocation failures and keep the viewer open.
      }
    }, 400);
  }

  return previewWindow;
}

function printPdfUrl(pdfUrl) {
  const normalizedUrl = String(pdfUrl || "").trim();

  if (!normalizedUrl) {
    return Promise.reject(new Error("인쇄할 PDF 문서가 없습니다."));
  }

  return new Promise((resolve, reject) => {
    const printFrame = document.createElement("iframe");
    let hasCompleted = false;
    let fallbackTimerId = 0;
    let printTimerId = 0;

    const finalize = (error) => {
      if (hasCompleted) {
        return;
      }

      hasCompleted = true;
      window.clearTimeout(fallbackTimerId);
      window.clearTimeout(printTimerId);
      window.setTimeout(() => {
        printFrame.remove();
      }, 1000);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    const triggerPrint = () => {
      try {
        if (!printFrame.contentWindow) {
          throw new Error("PDF 인쇄 프레임을 열 수 없습니다.");
        }

        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        finalize();
      } catch (error) {
        finalize(error);
      }
    };

    printFrame.setAttribute("aria-hidden", "true");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";
    printFrame.onload = () => {
      printTimerId = window.setTimeout(triggerPrint, 400);
    };
    fallbackTimerId = window.setTimeout(triggerPrint, 1600);
    printFrame.src = normalizedUrl;
    document.body.appendChild(printFrame);
  });
}

function normalizeExamineeNoList(examineeNos) {
  const list = Array.isArray(examineeNos) ? examineeNos : [examineeNos];

  return Array.from(
    new Set(
      list
        .map((examineeNo) => String(examineeNo || "").trim())
        .filter(Boolean),
    ),
  );
}

async function recordExamineePrint(examineeNos) {
  const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

  if (normalizedExamineeNos.length === 0) {
    return;
  }

  try {
    await apiRequest("/api/print-history", {
      method: "POST",
      body: JSON.stringify(
        normalizedExamineeNos.length === 1
          ? { examineeNo: normalizedExamineeNos[0] }
          : { examineeNos: normalizedExamineeNos },
      ),
    });
    await loadBootstrapData({ showLoading: false });
  } catch (error) {
    state.bootstrap.error = error.message;
    renderView();
  }
}

function normalizeBatchPrintCount(value) {
  const normalizedValue = Math.round(Number(value));

  if (!Number.isFinite(normalizedValue)) {
    return 0;
  }

  return Math.max(0, normalizedValue);
}

function getBatchPrintProgressState(completedCount, totalCount) {
  const normalizedCompleted = normalizeBatchPrintCount(completedCount);
  const normalizedTotal = normalizeBatchPrintCount(totalCount);
  const total = normalizedTotal > 0 ? normalizedTotal : normalizedCompleted;
  const completed = total > 0 ? Math.min(total, normalizedCompleted) : 0;

  return {
    completed,
    total,
    percent: total > 0 ? normalizeProgressValue((completed / total) * 100) : 0,
  };
}

function buildBatchPrintProgressLabel(completedCount, totalCount) {
  const { completed, total } = getBatchPrintProgressState(completedCount, totalCount);

  return `${completed}/${total}명 처리 완료`;
}

function buildBatchPrintPhaseMessage(phase, totalCount) {
  const normalizedTotal = normalizeBatchPrintCount(totalCount);

  switch (String(phase || "")) {
    case "preparing":
      return `선택한 ${normalizedTotal}명의 출력 대상을 준비하고 있습니다.`;
    case "finalizing":
      return `${normalizedTotal}명의 수험표를 하나의 PDF로 생성하고 있습니다.`;
    case "ready":
      return `${normalizedTotal}명의 수험표 PDF를 준비했습니다.`;
    case "rendering":
    default:
      return `선택한 ${normalizedTotal}명의 수험표를 생성하고 있습니다.`;
  }
}

function syncBatchPrintOverlayFromJob(jobPayload = {}) {
  const { completed, total, percent } = getBatchPrintProgressState(jobPayload.completedCount, jobPayload.totalCount);

  setPdfGenerationState({
    isActive: true,
    message: buildBatchPrintPhaseMessage(jobPayload.phase, total),
    progressMode: "determinate",
    progressValue: percent,
    progressLabel: buildBatchPrintProgressLabel(completed, total),
  });
}

async function waitForBatchAdmitCardJobCompletion(jobId) {
  const normalizedJobId = String(jobId || "").trim();
  const startedAt = Date.now();

  if (!normalizedJobId) {
    throw new Error("배치 출력 작업 ID가 올바르지 않습니다.");
  }

  while (true) {
    const jobPayload = await apiRequest(`/api/examinees/admit-card-jobs/${encodeURIComponent(normalizedJobId)}`);

    syncBatchPrintOverlayFromJob(jobPayload);

    if (jobPayload.status === "completed") {
      return jobPayload;
    }

    if (jobPayload.status === "failed") {
      const error = new Error(jobPayload.error || "수험표 PDF를 생성할 수 없습니다.");
      error.code = jobPayload.errorCode || "";
      throw error;
    }

    if (Date.now() - startedAt >= BATCH_PRINT_JOB_TIMEOUT_MS) {
      throw new Error("수험표 PDF 생성 시간이 너무 오래 걸리고 있습니다. 잠시 후 다시 시도하세요.");
    }

    await wait(BATCH_PRINT_STATUS_POLL_INTERVAL_MS);
  }
}

async function printExamineeAdmitCard(examineeNo) {
  const examinee = examineeGridRows.find((row) => row.examineeNo === examineeNo);

  if (!examinee) {
    return;
  }

  await runWithPdfGenerationLock(
    `${examinee.name} 수험표 PDF를 생성하고 있습니다.`,
    async () => {
      let pdfUrl = "";

      try {
        pdfUrl = await fetchExamineeAdmitCardPdfUrl(examineeNo);

        try {
          await printPdfUrl(pdfUrl);
        } catch (error) {
          const popupWindow = openPdfWindow(pdfUrl, { shouldPrint: true });

          if (!popupWindow) {
            throw new Error("브라우저에서 PDF 인쇄 창을 열지 못했습니다. 팝업 허용 후 다시 시도하세요.");
          }
        }

        await recordExamineePrint(examineeNo);
        showToast(`${examinee.name} 수험표 인쇄를 시작했습니다.`);
      } catch (error) {
        showToast(error.message, "error", 4200);
      } finally {
        if (pdfUrl) {
          window.setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 60000);
        }
      }
    },
  );
}

async function batchPrintSelectedExaminees() {
  const selectedExaminees = getSelectedAdmitCardExaminees();
  const examineeNos = normalizeExamineeNoList(
    selectedExaminees.map((examinee) => examinee.examineeNo),
  );

  if (examineeNos.length === 0) {
    showToast("일괄 인쇄할 수험생을 먼저 선택하세요.", "error");
    return;
  }

  state.batchPrint.isLoading = true;
  renderView();

  const downloadMessage = `선택한 ${examineeNos.length}명의 수험표 PDF를 다운로드하고 있습니다.`;
  const printPreparationMessage = `${examineeNos.length}명의 수험표 인쇄 창을 준비하고 있습니다.`;

  await runWithPdfGenerationLock(
    buildBatchPrintPhaseMessage("preparing", examineeNos.length),
    async () => {
      let pdfUrl = "";

      try {
        const batchJob = await apiRequest("/api/examinees/admit-card-jobs", {
          method: "POST",
          body: JSON.stringify({ examineeNos }),
        });
        const completedJob = await waitForBatchAdmitCardJobCompletion(batchJob.jobId);
        const completedProgressLabel = buildBatchPrintProgressLabel(
          completedJob.completedCount,
          completedJob.totalCount,
        );

        setPdfGenerationState({
          isActive: true,
          message: downloadMessage,
          progressMode: "determinate",
          progressValue: 100,
          progressLabel: completedProgressLabel,
        });

        const { blob } = await apiRequestForBlobWithProgress(
          `/api/examinees/admit-card-jobs/${encodeURIComponent(batchJob.jobId)}/pdf`,
          {
            credentials: "same-origin",
          },
          {
            onResponseStart: () => {
              setPdfGenerationState({
                isActive: true,
                message: downloadMessage,
                progressMode: "determinate",
                progressValue: 100,
                progressLabel: completedProgressLabel,
              });
            },
          },
        );

        pdfUrl = URL.createObjectURL(blob);
        setPdfGenerationState({
          isActive: true,
          message: printPreparationMessage,
          progressMode: "determinate",
          progressValue: 100,
          progressLabel: completedProgressLabel,
        });

        try {
          await printPdfUrl(pdfUrl);
        } catch (error) {
          const popupWindow = openPdfWindow(pdfUrl, { shouldPrint: true });

          if (!popupWindow) {
            throw new Error("브라우저에서 PDF 인쇄 창을 열지 못했습니다. 팝업 허용 후 다시 시도하세요.");
          }
        }

        await recordExamineePrint(examineeNos);
        showToast(`${examineeNos.length}명의 수험표 PDF를 생성해 인쇄를 시작했습니다.`);
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error.message, "error", 4200);
      } finally {
        if (pdfUrl) {
          window.setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 60000);
        }
      }
    },
    {
      progressMode: "determinate",
      progressValue: 0,
      progressLabel: buildBatchPrintProgressLabel(0, examineeNos.length),
    },
  );

  state.batchPrint.isLoading = false;
  renderView();
}

