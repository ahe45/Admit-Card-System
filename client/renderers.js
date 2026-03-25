const editorContentModule = globalThis.AdmitCardEditorContentShared;
const editorTableUtilsModule = globalThis.AdmitCardEditorTableUtils;
const templateGeneratedObjectModule = globalThis.AdmitCardTemplateGeneratedObjects;
const authRenderers = globalThis.AdmitCardAuthRenderers;
const loginNoticeEditorModule = globalThis.AdmitCardLoginNoticeEditor;
const systemRenderers = globalThis.AdmitCardSystemRenderers;
const accountRenderers = globalThis.AdmitCardAccountRenderers;
const accountActionsModule = globalThis.AdmitCardAccountActions;
const htmlUtilsModule = globalThis.AdmitCardHtmlUtils;
const gridRuntimeModule = globalThis.AdmitCardGridRuntime;
const modalControllerModule = globalThis.AdmitCardModalController;
const viewShellModule = globalThis.AdmitCardViewShell;
const examineePhotoUtilsModule = globalThis.AdmitCardExamineePhotoUtils;
const examineeDetailModalModule = globalThis.AdmitCardExamineeDetailModal;
const examineePageRenderers = globalThis.AdmitCardExamineePageRenderers;
const printHistoryRenderers = globalThis.AdmitCardPrintHistoryRenderers;
const templateManagementRenderers = globalThis.AdmitCardTemplateManagementRenderers;
const dashboardRenderers = globalThis.AdmitCardDashboardRenderers;

if (!editorContentModule) {
  throw new Error("client/features/editor/content-shared.js must be loaded before client/renderers.js.");
}

if (!templateGeneratedObjectModule) {
  throw new Error("client/features/template-editor/generated-objects.js must be loaded before client/renderers.js.");
}

if (!editorTableUtilsModule) {
  throw new Error("client/features/editor/table-utils.js must be loaded before client/renderers.js.");
}

if (!authRenderers) {
  throw new Error("client/features/auth/renderers.js must be loaded before client/renderers.js.");
}

if (!loginNoticeEditorModule) {
  throw new Error("client/features/system/login-notice-editor.js must be loaded before client/renderers.js.");
}

if (!systemRenderers) {
  throw new Error("client/features/system/renderers.js must be loaded before client/renderers.js.");
}

if (!accountRenderers) {
  throw new Error("client/features/accounts/renderers.js must be loaded before client/renderers.js.");
}

if (!accountActionsModule?.createAccountActionController) {
  throw new Error("client/features/accounts/actions.js must be loaded before client/renderers.js.");
}

if (!htmlUtilsModule) {
  throw new Error("client/app/html-utils.js must be loaded before client/renderers.js.");
}

if (!gridRuntimeModule?.createGridRuntimeController) {
  throw new Error("client/features/grids/runtime.js must be loaded before client/renderers.js.");
}

if (!modalControllerModule?.createModalController) {
  throw new Error("client/features/modals/controller.js must be loaded before client/renderers.js.");
}

if (!viewShellModule?.createViewShellController) {
  throw new Error("client/app/view-shell.js must be loaded before client/renderers.js.");
}

if (!examineePhotoUtilsModule) {
  throw new Error("client/features/examinees/photo-utils.js must be loaded before client/renderers.js.");
}

if (!examineeDetailModalModule) {
  throw new Error("client/features/examinees/detail-modal.js must be loaded before client/renderers.js.");
}

if (!examineePageRenderers) {
  throw new Error("client/features/examinees/renderers.js must be loaded before client/renderers.js.");
}

if (!printHistoryRenderers) {
  throw new Error("client/features/print-history/renderers.js must be loaded before client/renderers.js.");
}

if (!templateManagementRenderers) {
  throw new Error("client/features/templates/renderers.js must be loaded before client/renderers.js.");
}

if (!dashboardRenderers?.createDashboardRenderer) {
  throw new Error("client/features/dashboard/renderers.js must be loaded before client/renderers.js.");
}

const {
  TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
  TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
  TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND,
  buildTemplateEditorTableMarkup,
  normalizeTemplateEditorColorValue,
  normalizeTemplateEditorFontNodes,
} = editorContentModule;

const {
  buildTemplateTableCellMap,
  ensureTemplateEditorTableColGroup,
  normalizeTemplateEditorTableAppearance,
  normalizeTemplateEditorTables,
  syncTemplateEditorTableWidth,
} = editorTableUtilsModule;

const { buildTemplateGeneratedObjectMarkup, decorateTemplateGeneratedObjectImage } = templateGeneratedObjectModule;

const { getLoginNoticeMarkup, renderLoginScreen } = authRenderers;
const { renderLoginNoticeEditorToolbar, renderLoginNoticeSettings, renderSystemSettings } = systemRenderers;
const { renderAccountManagement, renderAccountRoleOptions } = accountRenderers;
const { createAccountActionController } = accountActionsModule;
const { escapeAttribute, escapeHtml, escapeRegExp } = htmlUtilsModule;
const { createGridRuntimeController } = gridRuntimeModule;
const { createModalController } = modalControllerModule;
const { createViewShellController } = viewShellModule;
const { renderAdmitCardLookup, renderAdmitCardLookupGridSection, renderExamineeRegistration } = examineePageRenderers;
const { renderPrintHistory } = printHistoryRenderers;
const { renderTemplateManagement } = templateManagementRenderers;
const { createDashboardRenderer } = dashboardRenderers;
const { buildExamineePhotoUrl } = examineePhotoUtilsModule;

let viewShellController = null;
const renderView = (...args) => viewShellController?.renderView(...args);
const refreshAdmitCardLookupView = (...args) => viewShellController?.refreshAdmitCardLookupView(...args);
const refreshAdmitCardLookupGrid = (...args) => viewShellController?.refreshAdmitCardLookupGrid(...args);

const loginNoticeEditorController = loginNoticeEditorModule.createLoginNoticeEditorController({
  LOGIN_NOTICE_EDITOR_HISTORY_LIMIT,
  TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
  TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
  TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND,
  apiRequest,
  appendMergedTemplateCellContent,
  applyLoginNoticePayload,
  applySharedEditorCommand,
  buildTemplateEditorTableMarkup,
  buildTemplateGeneratedObjectMarkup,
  buildTemplateTableCellMap,
  createTemplateTableCell,
  decorateTemplateGeneratedObjectImage,
  defaultTextColor: typeof EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR === "string" ? EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR : "#152033",
  ensureTemplateEditorTableColGroup,
  escapeAttribute,
  getLoginNoticeMarkup,
  getTemplateEditorMedianValue,
  getTemplateEditorTableLogicalColumnWidth,
  getTemplateEditorTableLogicalRowHeight,
  getTemplatePreviewExaminee: typeof getTemplatePreviewExaminee === "function" ? getTemplatePreviewExaminee : null,
  handleAuthenticationFailure,
  insertTemplateCellAtAbsoluteColumn,
  isTemplateTableCellEmpty,
  normalizeTemplateEditorColorValue,
  normalizeTemplateEditorFontNodes,
  normalizeTemplateEditorTables,
  normalizeTemplateEditorTableAppearance,
  renderView,
  setEditorToolbarTableInsertPanelVisibility,
  setTemplateEditorTableLogicalRowHeight,
  showToast,
  state,
  stripTemplateEditorTransientState,
  syncEditorToolbarColorControls,
  syncTemplateEditorTableWidth,
  updateEditorToolbarFormattingState,
});

const {
  applyLoginNoticeEditorCommand,
  buildLoginNoticeEditorMarkup,
  captureLoginNoticeEditorSelection,
  getLoginNoticeDefaultFontFamily,
  getLoginNoticeDefaultFontSize,
  getLoginNoticeEditorElement,
  getLoginNoticeImageInputElement,
  handleLoginNoticeAction,
  handleLoginNoticeInsert,
  handleLoginNoticeTableAction,
  insertLoginNoticeImage,
  redoLoginNoticeEditorHistory,
  restoreLoginNoticeEditorSelection,
  saveLoginNoticeContent,
  syncLoginNoticeEditorDraft,
  undoLoginNoticeEditorHistory,
  updateLoginNoticeEditorActiveCell,
  updateLoginNoticeFormattingControls,
} = loginNoticeEditorController;

const examineeDetailModalController = examineeDetailModalModule.createExamineeDetailModalController({
  EXAMINEE_DETAIL_FIELDS,
  EXAMINEE_DETAIL_FIELD_KEYS,
  apiRequest,
  areExamineeDetailDraftsEqual,
  arrayBufferToBase64,
  buildExamineePhotoUrl: (examinee) => buildExamineePhotoUrl(examinee, { buildApiUrl }),
  buildExamineeDetailDraft,
  createExamineeDetailState,
  escapeAttribute,
  escapeHtml,
  getExamineeDetailBody: () => examineeDetailBody,
  getExamineeDetailCloseConfirmMessage: () => examineeDetailCloseConfirmMessage,
  getExamineeDetailCloseConfirmModal: () => examineeDetailCloseConfirmModal,
  getExamineeDetailCloseConfirmSummary: () => examineeDetailCloseConfirmSummary,
  getExamineeDetailSaveButton: () => examineeDetailSaveButton,
  getExamineeGridRows: () => examineeGridRows,
  handleAuthenticationFailure,
  loadBootstrapData,
  normalizeExamineeRecord,
  openModal,
  readFileAsArrayBuffer,
  renderView,
  showToast,
  state,
});

const {
  closeExamineeDetailCloseConfirmModal,
  getDirtyExamineeDetailFieldLabels,
  getSelectedExamineeDetailRow,
  isExamineeDetailDirty,
  openExamineeDetail,
  promptExamineeDetailCloseAction,
  resetExamineeDetailEditor,
  saveExamineeDetail,
  syncExamineeDetailCloseConfirmModal,
  syncExamineeDetailModal,
  updateExamineeDetailField,
  uploadExamineeDetailPhoto,
} = examineeDetailModalController;

const accountActionController = createAccountActionController({
  apiRequest,
  createAccountEditorState,
  getAccountGridRows: () => accountGridRows,
  getSystemInitialPassword,
  handleAuthenticationFailure,
  logoutCurrentUser,
  normalizeAccountRecord,
  renderView,
  setAccountGridRows: (rows) => {
    accountGridRows = Array.isArray(rows) ? rows : [];
  },
  state,
});

const {
  cancelAccountEdit,
  deleteAccountAction,
  resetAccountPasswordAction,
  saveAccountEdit,
  startAccountEdit,
  updateAccountEditorField,
} = accountActionController;
let modalController = null;

modalController = createModalController({
  TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
  TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
  clearSelectedUploadFiles,
  clearTemplateEditorActiveCell,
  clearTemplateEditorImageSelection,
  clearTemplateEditorTableHoverState,
  clearTemplateEditorTableSelection,
  closeExamineeDetailCloseConfirmModal,
  createTemplateEditorState,
  createTemplatePreviewState,
  getAccountCreateModal: () => accountCreateModal,
  getExamineeDetailCloseConfirmModal: () => examineeDetailCloseConfirmModal,
  getExamineeDetailModal: () => examineeDetailModal,
  getTemplateEditorDescription: () => templateEditorDescription,
  getTemplateEditorFontFamily: () => templateEditorFontFamily,
  getTemplateEditorFontSize: () => templateEditorFontSize,
  getTemplateEditorModal: () => templateEditorModal,
  getTemplateEditorName: () => templateEditorName,
  getTemplateEditorTableColumns: () => templateEditorTableColumns,
  getTemplateEditorTableRows: () => templateEditorTableRows,
  getTemplatePreviewModal: () => templatePreviewModal,
  getTemplatePreviewStage: () => templatePreviewStage,
  getUploadModal: () => uploadModal,
  isExamineeDetailDirty,
  prepareAccountCreateModal,
  promptExamineeDetailCloseAction,
  releaseTemplateEditorTableResizeSession,
  releaseTemplateEditorTableSelectionSession,
  resetAccountCreateFormState,
  resetUploadState,
  saveExamineeDetail,
  setTemplateEditorTableInsertPanelVisibility,
  state,
  syncEditorToolbarFontSizeControls,
});
const gridRuntimeController = createGridRuntimeController({
  accountGridColumns,
  admitCardLookupGridColumns,
  createTableState,
  escapeAttribute,
  escapeHtml,
  examineePhotoColumn,
  examineeRegistrationGridColumns,
  getAccountGridRows: () => accountGridRows,
  getExamineeGridRows: () => examineeGridRows,
  getPrintHistoryRows: () => printHistoryRows,
  getSelectedAdmitCardExamineeCount,
  headerFilterFields,
  lookupSelectKeys,
  normalizeGridSortRules,
  openExamineeDetail,
  printHistoryGridColumns,
  renderAccountRoleOptions,
  renderView,
  resultGridColumns,
  state,
});
const {
  buildOptionMarkup,
  clampPage,
  clearAllGridFilters,
  clearGridFilter,
  closeAllHeaderCombos,
  closeAllGridFilterMenus,
  closeAllPageSizeMenus,
  closeGridFilterMenu,
  decorateSelectFields,
  filterGridFilterOptionValues,
  getActiveGridFilters,
  getActiveGridSortRules,
  getFilteredLookupRows,
  getGridColumns,
  getGridFilterOptionValues,
  getGridFilterSelectionState,
  getGridPage,
  getGridRowId,
  getGridRows,
  getGridSelectableRowIds,
  getGridSelectedRowIds,
  getGridSelectionState,
  getHeaderFilteredRows,
  getLookupOptionMap,
  getTableState,
  getTotalPages,
  getVisiblePageNumbers,
  handleGridRowClickSelection,
  hasGridFilter,
  isGridRowClickable,
  isGridRowHighlighted,
  isGridRowSelected,
  reconcileHeaderFilters,
  reconcileLookupFilters,
  refreshGridFilterMenu,
  removeGridFilterValue,
  renderBatchPrintButton,
  renderExamineeResultTable,
  renderGridHeaderActions,
  renderUploadHeaderAction,
  rerenderWithFocus,
  setGridFilterValues,
  setHeaderComboOpen,
  syncGridSelectionIndicators,
  syncHeaderSelectOptions,
  syncOpenGridFilterMenuPosition,
  toggleGridFilterMenu,
  toggleGridFilterValue,
  toggleGridRowSelection,
  toggleGridSelectAll,
  toggleGridSort,
  updateLookupTextFilter,
} = gridRuntimeController;
const dashboardRendererController = createDashboardRenderer({
  escapeHtml,
  getCurrentUserRole: (...args) => (typeof getCurrentUserRole === "function" ? getCurrentUserRole(...args) : ""),
  getExamineeGridRows: () => examineeGridRows,
  getHeaderFilteredRows: (...args) => getHeaderFilteredRows(...args),
  getPrintHistoryRows: () => printHistoryRows,
  state,
});
const { renderDashboard } = dashboardRendererController;
const renderers = {
  dashboard: renderDashboard,
  examineeRegistration: renderExamineeRegistration,
  admitCardLookup: renderAdmitCardLookup,
  printHistory: renderPrintHistory,
  templateManagement: renderTemplateManagement,
  accountManagement: renderAccountManagement,
  loginNoticeSettings: renderLoginNoticeSettings,
  systemSettings: renderSystemSettings,
};
viewShellController = createViewShellController({
  DEFAULT_VIEW,
  decorateSelectFields,
  escapeHtml,
  getViewRenderer: (viewKey) => renderers[viewKey] || renderDashboard,
  isLoginPage,
  isUserAuthenticated,
  pageTitle,
  renderAdmitCardLookup,
  renderAdmitCardLookupGridSection,
  renderLoginScreen,
  state,
  syncCurrentViewFromLocation,
  syncExamineeDetailModal: (...args) => (typeof syncExamineeDetailModal === "function" ? syncExamineeDetailModal(...args) : undefined),
  syncGridSelectionIndicators,
  syncHeaderSelectOptions,
  syncLoginFormAutofocus,
  syncOpenGridFilterMenuPosition,
  syncPdfGenerationOverlay,
  syncUploadOverlay,
  titles,
  updateAuthChrome,
  updateMetricBadges,
  viewRoot,
  navItems,
});

Object.assign(globalThis, {
  getGridRowId,
  getGridRows,
  getGridSelectedRowIds,
  getTableState,
  renderView,
  refreshAdmitCardLookupGrid,
  refreshAdmitCardLookupView,
});

function openModal(modalId) {
  return modalController?.openModal(modalId);
}

async function requestCloseModal(modalId) {
  return modalController?.requestCloseModal(modalId) ?? false;
}

function closeModal(modalId) {
  return modalController?.closeModal(modalId);
}

function closeAllModals() {
  return modalController?.closeAllModals();
}

async function requestCloseAllModals() {
  return modalController?.requestCloseAllModals() ?? true;
}
