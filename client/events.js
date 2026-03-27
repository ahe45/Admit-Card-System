const navItems = Array.from(document.querySelectorAll(".nav-item"));
const appDocumentEventsModule = globalThis.AdmitCardAppDocumentEvents;
const loginNoticeEventsModule = globalThis.AdmitCardLoginNoticeEvents;
const gridInteractionModule = globalThis.AdmitCardGridInteraction;
const examineeDetailEventsModule = globalThis.AdmitCardExamineeDetailEvents;
const templateEditorEventsModule = globalThis.AdmitCardTemplateEditorEvents;

if (!gridInteractionModule?.createGridInteractionController) {
  throw new Error("AdmitCardGridInteraction.createGridInteractionController is required before loading events.js");
}

if (!appDocumentEventsModule?.createAppDocumentEventHandlers) {
  throw new Error("AdmitCardAppDocumentEvents.createAppDocumentEventHandlers is required before loading events.js");
}

if (!loginNoticeEventsModule?.createLoginNoticeEventHandlers) {
  throw new Error("AdmitCardLoginNoticeEvents.createLoginNoticeEventHandlers is required before loading events.js");
}

if (!examineeDetailEventsModule?.createExamineeDetailEventHandlers) {
  throw new Error("AdmitCardExamineeDetailEvents.createExamineeDetailEventHandlers is required before loading events.js");
}

if (!templateEditorEventsModule?.createTemplateEditorEventHandlers) {
  throw new Error("AdmitCardTemplateEditorEvents.createTemplateEditorEventHandlers is required before loading events.js");
}

const { createGridInteractionController } = gridInteractionModule;
const { createAppDocumentEventHandlers } = appDocumentEventsModule;
const { createLoginNoticeEventHandlers } = loginNoticeEventsModule;
const { createExamineeDetailEventHandlers } = examineeDetailEventsModule;
const { createTemplateEditorEventHandlers } = templateEditorEventsModule;

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetView = String(item.dataset.view || "").trim();

    if (!targetView) {
      return;
    }

    if (!navigateToView(targetView)) {
      sidebar?.classList.remove("open");
    }
  });
});

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });
}

if (brandHome) {
  brandHome.addEventListener("click", () => {
    if (!navigateToView(getDefaultAccessibleView())) {
      sidebar?.classList.remove("open");
    }
  });
}

const gridInteractionController = createGridInteractionController({
  refreshAdmitCardLookupView,
  renderView,
  state,
});

const {
  handleGridCellTooltipMouseOut,
  handleGridCellTooltipMouseOver,
  handleGridCellTooltipResize,
  handleGridCellTooltipScroll,
  hideGridCellTooltip,
  rerenderGridInteraction,
  rerenderLookupViewInteraction,
} = gridInteractionController;

let applicantFieldDragSourceId = "";
let applicantFieldIgnoreClickUntil = 0;

function clearApplicantFieldDragIndicators() {
  document.querySelectorAll(".applicant-field-card.is-dragging, .applicant-field-card.is-drop-target-before, .applicant-field-card.is-drop-target-after")
    .forEach((element) => {
      element.classList.remove("is-dragging", "is-drop-target-before", "is-drop-target-after");
    });
}

function getUploadDropzoneState(inputId = "") {
  const normalizedInputId = String(inputId || "").trim();

  if (normalizedInputId === "applicantUnitUploadFileInput") {
    return {
      inputElement: applicantUnitUploadFileInput,
      labelElement: applicantUnitUploadFileName,
      emptyLabel: "선택된 데이터 파일이 없습니다.",
    };
  }

  if (normalizedInputId === "uploadFileInput") {
    return {
      inputElement: uploadFileInput,
      labelElement: uploadFileName,
      emptyLabel: "선택된 데이터 파일이 없습니다.",
    };
  }

  if (normalizedInputId === "uploadPhotoArchiveInput") {
    return {
      inputElement: uploadPhotoArchiveInput,
      labelElement: uploadPhotoArchiveName,
      emptyLabel: "선택된 사진 ZIP이 없습니다.",
    };
  }

  return {
    inputElement: null,
    labelElement: null,
    emptyLabel: "",
  };
}

function syncUploadDropzoneLabel(inputId = "") {
  const { inputElement, labelElement, emptyLabel } = getUploadDropzoneState(inputId);

  if (!inputElement || !labelElement) {
    return;
  }

  labelElement.textContent = inputElement.files?.[0]?.name || emptyLabel;
}

function isAcceptedUploadFile(inputElement, file) {
  const acceptedTypes = String(inputElement?.accept || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (acceptedTypes.length === 0 || !file) {
    return true;
  }

  const fileName = String(file.name || "").toLowerCase();
  const mimeType = String(file.type || "").toLowerCase();

  return acceptedTypes.some((acceptedType) => {
    if (acceptedType.startsWith(".")) {
      return fileName.endsWith(acceptedType);
    }

    if (acceptedType.endsWith("/*")) {
      return mimeType.startsWith(acceptedType.slice(0, -1));
    }

    return mimeType === acceptedType;
  });
}

function assignDroppedFileToUploadInput(inputId = "", fileList = []) {
  const { inputElement } = getUploadDropzoneState(inputId);
  const nextFile = Array.from(fileList || []).find(Boolean) || null;

  if (!inputElement || !nextFile) {
    return;
  }

  if (!isAcceptedUploadFile(inputElement, nextFile)) {
    showToast("허용되지 않는 파일 형식입니다.", "error", 3200);
    return;
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(nextFile);
  inputElement.files = dataTransfer.files;
  inputElement.dispatchEvent(new Event("change", { bubbles: true }));
}

function handleApplicantAdminClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const tabTrigger = target?.closest("[data-template-management-tab]") || null;
  const settingsSectionTrigger = target?.closest("[data-applicant-settings-section]") || null;
  const submissionToggleTrigger = target?.closest("[data-applicant-submission-toggle]") || null;
  const submissionPhotoUploadTrigger = target?.closest("[data-applicant-submission-photo-upload-trigger]") || null;
  const submissionPromoteTrigger = target?.closest("[data-applicant-submission-promote]") || null;
  const submissionDataDownloadTrigger = target?.closest("[data-download-applicant-submission-data]") || null;
  const submissionPhotoDownloadTrigger = target?.closest("[data-download-applicant-submission-photos]") || null;
  const recruitmentSelectTrigger = target?.closest("[data-applicant-recruitment-select]") || null;
  const recruitmentDeleteTrigger = target?.closest("[data-applicant-recruitment-delete]") || null;
  const recruitmentDownloadTrigger = target?.closest("[data-download-applicant-recruitment]") || null;
  const recruitmentDownloadTemplateTrigger = target?.closest("[data-applicant-recruitment-download-template]") || null;
  const recruitmentUploadTrigger = target?.closest("[data-upload-applicant-recruitment]") || null;
  const fieldAddTrigger = target?.closest("[data-applicant-field-add]") || null;
  const fieldPreviewTrigger = target?.closest("[data-applicant-field-preview]") || null;
  const fieldEditTrigger = target?.closest("[data-applicant-field-edit]") || null;
  const fieldDeleteTrigger = target?.closest("[data-applicant-field-delete]") || null;
  const fieldMoveTrigger = target?.closest("[data-applicant-field-move]") || null;
  const fieldOptionAddTrigger = target?.closest("[data-applicant-field-option-add]") || null;
  const fieldOptionRemoveTrigger = target?.closest("[data-applicant-field-option-remove]") || null;
  const fieldResetTrigger = target?.closest("[data-applicant-field-reset]") || null;
  const fieldSelectTrigger = target?.closest("[data-applicant-field-select]") || null;

  if (tabTrigger) {
    setApplicantManagerTab(tabTrigger.dataset.templateManagementTab);
    return true;
  }

  if (settingsSectionTrigger) {
    setApplicantSettingsSection(settingsSectionTrigger.dataset.applicantSettingsSection);
    return true;
  }

  if (submissionToggleTrigger) {
    toggleApplicantSubmissionDetail(submissionToggleTrigger.dataset.applicantSubmissionToggle);
    return true;
  }

  if (submissionPhotoUploadTrigger) {
    const photoInput =
      submissionPhotoUploadTrigger
        .closest(".applicant-submission-detail-photo-panel")
        ?.querySelector("[data-applicant-submission-photo-input='true']") || null;

    if (photoInput instanceof HTMLInputElement) {
      photoInput.click();
      return true;
    }
  }

  if (submissionPromoteTrigger) {
    void promoteApplicantSubmissionAction(submissionPromoteTrigger.dataset.applicantSubmissionPromote);
    return true;
  }

  if (recruitmentSelectTrigger) {
    startApplicantRecruitmentUnitEdit(recruitmentSelectTrigger.dataset.applicantRecruitmentSelect);
    return true;
  }

  if (recruitmentDeleteTrigger) {
    void deleteApplicantRecruitmentUnit(recruitmentDeleteTrigger.dataset.applicantRecruitmentDelete);
    return true;
  }

  if (submissionDataDownloadTrigger) {
    void downloadApplicantSubmissions();
    return true;
  }

  if (submissionPhotoDownloadTrigger) {
    void downloadApplicantSubmissionPhotos();
    return true;
  }

  if (recruitmentDownloadTrigger) {
    void downloadApplicantRecruitmentUnits();
    return true;
  }

  if (recruitmentDownloadTemplateTrigger) {
    void downloadApplicantRecruitmentUnitTemplate();
    return true;
  }

  if (recruitmentUploadTrigger) {
    void uploadApplicantRecruitmentUnitFile();
    return true;
  }

  if (fieldAddTrigger) {
    activateApplicantFieldCreation();
    return true;
  }

  if (fieldPreviewTrigger) {
    openApplicantFieldPreview();
    return true;
  }

  if (fieldEditTrigger) {
    startApplicantFieldEdit(fieldEditTrigger.dataset.applicantFieldEdit);
    return true;
  }

  if (fieldDeleteTrigger) {
    void deleteApplicantField(fieldDeleteTrigger.dataset.applicantFieldDelete);
    return true;
  }

  if (fieldMoveTrigger) {
    void moveApplicantField(fieldMoveTrigger.dataset.applicantFieldMove, fieldMoveTrigger.dataset.applicantFieldDirection);
    return true;
  }

  if (fieldOptionAddTrigger) {
    addApplicantFieldOption();
    return true;
  }

  if (fieldOptionRemoveTrigger) {
    removeApplicantFieldOption(fieldOptionRemoveTrigger.dataset.applicantFieldOptionRemove);
    return true;
  }

  if (fieldSelectTrigger) {
    if (Date.now() < applicantFieldIgnoreClickUntil) {
      return true;
    }

    startApplicantFieldEdit(fieldSelectTrigger.dataset.applicantFieldSelect);
    return true;
  }

  if (fieldResetTrigger) {
    resetApplicantFieldEditor();
    return true;
  }

  return false;
}

function syncApplicantAdminInputValue(event) {
  const target = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement
    ? event.target
    : null;

  if (!target) {
    return false;
  }

  if (target.dataset.applicantFieldInput) {
    updateApplicantFieldEditorField(
      target.dataset.applicantFieldInput,
      target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value,
    );
    return true;
  }

  if (target.dataset.applicantRecruitmentInput) {
    updateApplicantRecruitmentUnitEditorField(target.dataset.applicantRecruitmentInput, target.value);
    return true;
  }

  if (target.dataset.applicantSettingsInput) {
    updateApplicantSettingsField(target.dataset.applicantSettingsInput, target.value);
    return true;
  }

  return false;
}

async function handleApplicantAdminChange(event) {
  const target = event.target instanceof HTMLInputElement ? event.target : null;

  if (!target || target.dataset.applicantSubmissionPhotoInput !== "true") {
    return false;
  }

  const selectedFile = target.files?.[0] || null;
  const submissionId = target.dataset.applicantSubmissionId || "";
  target.value = "";

  if (!selectedFile) {
    return true;
  }

  await uploadApplicantSubmissionPhoto(selectedFile, submissionId);
  return true;
}

async function handleApplicantAdminSubmit(event) {
  const form = event.target instanceof HTMLFormElement ? event.target : null;

  if (!form) {
    return false;
  }

  if (form.matches("[data-applicant-field-form]")) {
    event.preventDefault();
    await saveApplicantFieldEditor();
    return true;
  }

  if (form.matches("[data-applicant-recruitment-form]")) {
    event.preventDefault();
    await saveApplicantRecruitmentUnit();
    return true;
  }

  if (form.matches("[data-applicant-settings-form]")) {
    event.preventDefault();
    await saveApplicantSettings();
    return true;
  }

  return false;
}

function applyEditorToolbarColorTrigger(triggerElement) {
  if (!(triggerElement instanceof Element)) {
    return;
  }

  const inputId = String(triggerElement.dataset.editorColorInput || "").trim();
  const colorCommand = String(triggerElement.dataset.editorColorCommand || "").trim();
  const colorTableAction = String(triggerElement.dataset.editorColorTableAction || "").trim();
  const fallbackValue = getEditorToolbarColorFallback(colorCommand, colorTableAction);
  const inputElement =
    (inputId ? document.getElementById(inputId) : null) ||
    triggerElement.closest(".template-toolbar-color-picker")?.querySelector(".template-toolbar-color") ||
    null;
  const rawColorValue = String(triggerElement.dataset.editorColorPreset || triggerElement.dataset.editorColorValue || inputElement?.value || "");
  const normalizedColorValue = syncEditorToolbarColorControls({
    colorInputElement: inputElement,
    colorValue: rawColorValue,
    fallbackValue,
  });

  if (colorCommand) {
    if (triggerElement.closest(".login-notice-editor-toolbar")) {
      applyLoginNoticeEditorCommand(colorCommand, normalizedColorValue);
    } else {
      applyTemplateEditorCommand(colorCommand, normalizedColorValue);
    }
    return;
  }

  if (!colorTableAction) {
    return;
  }

  if (triggerElement.closest(".login-notice-editor-toolbar")) {
    handleLoginNoticeTableAction(colorTableAction, { colorValue: normalizedColorValue });
  } else {
    handleTemplateTableAction(colorTableAction, { colorValue: normalizedColorValue });
  }
}

const loginNoticeEventHandlers = createLoginNoticeEventHandlers({
  applyLoginNoticeEditorCommand,
  captureLoginNoticeEditorSelection,
  getLoginNoticeCellSplitConfig,
  getLoginNoticeCellSplitCountInputElement: () => document.getElementById("loginNoticeCellSplitCount"),
  getLoginNoticeCellSplitPanelElement: () => document.getElementById("loginNoticeCellSplitPanel"),
  getLoginNoticeEditorElement,
  getLoginNoticeImageInputElement,
  handleLoginNoticeAction,
  handleLoginNoticeInsert,
  handleLoginNoticeTableAction,
  insertLoginNoticeImage,
  redoLoginNoticeEditorHistory,
  renderView,
  setNoticeManagementScope,
  setLoginNoticeCellSplitPanelVisibility,
  setLoginNoticeTableInsertPanelVisibility,
  state,
  syncEditorToolbarFontSizeMenuSelection,
  syncLoginNoticeEditorDraft,
  undoLoginNoticeEditorHistory,
  updateLoginNoticeEditorActiveCell,
  updateLoginNoticeFormattingControls,
});

const examineeDetailEventHandlers = createExamineeDetailEventHandlers({
  closeExamineeDetailCloseConfirmModal,
  renderView,
  resetExamineeDetailEditor,
  saveExamineeDetail,
  updateExamineeDetailField,
  uploadExamineeDetailPhoto,
});

const templateEditorEventHandlers = createTemplateEditorEventHandlers({
  addTemplateCard,
  applyTemplateCard,
  applyTemplateEditorCommand,
  applyTemplateEditorFontFamily,
  applyTemplateEditorFontSize,
  applyTemplateTableSize,
  clearTemplateEditorImageSelection,
  clearTemplateEditorTableHoverState,
  clearTemplateEditorTableSelection,
  closeTemplateCardMetaEditor,
  deleteTemplateCard,
  getTemplateEditorCellSplitConfig: () => getTemplateEditorCellSplitConfig(),
  getTemplateEditorCellSplitCountInput: () => templateEditorCellSplitCount,
  getTemplateEditorCellSplitPanel: () => templateEditorCellSplitPanel,
  getTemplateEditorImageInput: () => templateEditorImageInput,
  getTemplateEditorImageTarget,
  getTemplateEditorModal: () => templateEditorModal,
  getTemplateEditorSurface: () => templateEditorSurface,
  getTemplateEditorTableInsertPanel: () => templateEditorTableInsertPanel,
  handleTemplateEditorInsert,
  handleTemplateEditorTablePointerDown,
  handleTemplateEditorTokenDeletion,
  handleTemplateTableAction,
  insertTemplateImage,
  insertTemplateTag,
  openTemplateCardMetaEditor,
  openTemplateEditor,
  openTemplatePreview,
  printTemplatePreview,
  redoTemplateEditorHistory,
  saveTemplateCardMetaEditor,
  saveTemplateEditor,
  saveTemplateEditorSelection,
  selectTemplateEditorImage,
  setEditorToolbarFontSizeMenuVisibility,
  setTemplateEditorCellSplitPanelVisibility,
  setTemplateEditorTableInsertPanelVisibility,
  startTemplateEditorImageMoveSession,
  state,
  syncEditorToolbarFontSizeMenuSelection,
  syncTemplateEditorContent,
  undoTemplateEditorHistory,
  updateTemplateCardMetaEditorDraft,
  updateTemplateEditorActiveCell,
  updateTemplateEditorFormattingControls,
  updateTemplateEditorImageSelectionOverlay,
  updateTemplateEditorTableHoverState,
  updateTemplateTableControls,
});

const appDocumentEventHandlers = createAppDocumentEventHandlers({
  applyEditorToolbarColorTrigger,
  applyLoginNoticeEditorCommand,
  batchPrintSelectedExaminees,
  cancelAccountEdit,
  changeSystemAutoLogoutMinutes,
  clearAllGridFilters,
  clearGridFilter,
  clearHeaderFilters,
  clampPage,
  closeAllEditorToolbarColorPanels,
  closeAllEditorToolbarFontSizeMenus,
  closeAllEditorToolbarTableInsertPanels,
  closeAllGridFilterMenus,
  closeAllHeaderCombos,
  closeAllPageSizeMenus,
  closeGridFilterMenu,
  closePasswordSetupPrompt,
  createLookupFilters,
  deleteAccountAction,
  deleteSystemDataAction,
  downloadExamineeGridWorkbook,
  downloadExamineeTemplate,
  downloadPrintHistoryGridWorkbook,
  examineeDetailEventHandlers,
  filterGridFilterOptionValues,
  getEditorToolbarColorPickerElements,
  getGridFilterOptionValues,
  getGridFilterSelectionState,
  getGridPage,
  getGridRows,
  getHeaderComboElement,
  getSidebar: () => sidebar,
  getTableState,
  getTotalPages,
  headerFilterFields,
  hideGridCellTooltip,
  handleGridRowClickSelection,
  isBusyOverlayActive,
  loadBootstrapData,
  loginNoticeEventHandlers,
  logoutCurrentUser,
  lookupSelectFields,
  lookupTextFields,
  openModal,
  persistHeaderFilters,
  printExamineeAdmitCard,
  recordAutoLogoutActivity,
  refreshAdmitCardLookupGrid,
  refreshGridFilterMenu,
  reconcileHeaderFilters,
  reconcileLookupFilters,
  removeGridFilterValue,
  renderView,
  requestCloseAllModals,
  requestCloseModal,
  rerenderGridInteraction,
  rerenderLookupViewInteraction,
  resetAccountPasswordAction,
  resetGridPages,
  saveAccountEdit,
  saveSystemSettings,
  setAccountCreateError,
  setEditorToolbarColorPanelVisibility,
  setEditorToolbarFontSizeMenuVisibility,
  setGridFilterValues,
  setHeaderComboOpen,
  setSystemSettingsStatus,
  startAccountEdit,
  state,
  submitAccountCreate,
  submitLogin,
  submitPasswordSetup,
  syncLoginErrorMessage,
  syncPasswordSetupModal,
  templateEditorEventHandlers,
  toggleGridFilterMenu,
  toggleGridFilterValue,
  toggleGridRowSelection,
  toggleGridSelectAll,
  toggleGridSort,
  updateAccountEditorField,
  updateLookupTextFilter,
  uploadSelectedExamineeFile,
});

const {
  handleChange: handleAppDocumentChange,
  handleClick: handleAppDocumentClick,
  handleCompositionEnd: handleAppDocumentCompositionEnd,
  handleCompositionStart: handleAppDocumentCompositionStart,
  handleInput: handleAppDocumentInput,
  handleKeydown: handleAppDocumentKeydown,
  handleSubmit: handleAppDocumentSubmit,
} = appDocumentEventHandlers;

document.addEventListener("click", async (event) => {
  if (handleApplicantAdminClick(event)) {
    return;
  }

  await handleAppDocumentClick(event);
});

document.addEventListener("keydown", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const fieldSelectTrigger = target?.closest("[data-applicant-field-select]") || null;
  const recruitmentSelectTrigger = target?.closest("[data-applicant-recruitment-select]") || null;
  const optionDraftInput = target?.closest("[data-applicant-field-option-draft]") || null;

  if (
    fieldSelectTrigger &&
    (event.key === "Enter" || event.key === " ") &&
    !(target instanceof HTMLButtonElement) &&
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    event.preventDefault();
    startApplicantFieldEdit(fieldSelectTrigger.dataset.applicantFieldSelect);
    return;
  }

  if (optionDraftInput && event.key === "Enter") {
    event.preventDefault();
    addApplicantFieldOption();
    return;
  }

  if (
    recruitmentSelectTrigger &&
    (event.key === "Enter" || event.key === " ") &&
    !(target instanceof HTMLButtonElement) &&
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    event.preventDefault();
    startApplicantRecruitmentUnitEdit(recruitmentSelectTrigger.dataset.applicantRecruitmentSelect);
    return;
  }

  await handleAppDocumentKeydown(event);
});

document.addEventListener("submit", async (event) => {
  if (await handleApplicantAdminSubmit(event)) {
    return;
  }

  await handleAppDocumentSubmit(event);
});

document.addEventListener("pointerdown", (event) => {
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  hideGridCellTooltip();
  recordAutoLogoutActivity();
  if (loginNoticeEventHandlers.handlePointerDown(event)) {
    return;
  }
});

document.addEventListener("pointerdown", (event) => {
  hideGridCellTooltip();
  templateEditorEventHandlers.handlePointerDown(event);
});

document.addEventListener("dragstart", (event) => {
  if (templateEditorEventHandlers.handleDragStart(event)) {
    return;
  }
});

document.addEventListener("mouseover", (event) => {
  handleGridCellTooltipMouseOver(event);
});

document.addEventListener("mouseout", (event) => {
  handleGridCellTooltipMouseOut(event);
});

if (templateEditorSurface) {
  templateEditorSurface.addEventListener("pointermove", (event) => {
    templateEditorEventHandlers.handleSurfacePointerMove(event);
  });

  templateEditorSurface.addEventListener("pointerleave", () => {
    templateEditorEventHandlers.handleSurfacePointerLeave();
  });

  templateEditorSurface.addEventListener("scroll", () => {
    templateEditorEventHandlers.handleSurfaceScroll();
  });
}

window.addEventListener("resize", () => {
  handleGridCellTooltipResize();
  updateTemplateEditorImageSelectionOverlay();
  syncOpenGridFilterMenuPosition?.();
});

document.addEventListener("scroll", () => {
  handleGridCellTooltipScroll();
  syncOpenGridFilterMenuPosition?.();
}, true);

document.addEventListener("dragstart", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-applicant-field-draggable]") : null;

  if (!target) {
    return;
  }

  applicantFieldDragSourceId = String(target.dataset.applicantFieldDraggable || "").trim();

  if (!applicantFieldDragSourceId) {
    return;
  }

  clearApplicantFieldDragIndicators();
  target.classList.add("is-dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", applicantFieldDragSourceId);
  }
});

document.addEventListener("dragover", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-applicant-field-draggable]") : null;

  if (!applicantFieldDragSourceId || !target) {
    return;
  }

  const targetFieldId = String(target.dataset.applicantFieldDraggable || "").trim();

  if (!targetFieldId || targetFieldId === applicantFieldDragSourceId) {
    return;
  }

  event.preventDefault();
  clearApplicantFieldDragIndicators();
  const escapedFieldId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(applicantFieldDragSourceId)
      : applicantFieldDragSourceId.replaceAll('"', '\\"');
  document.querySelector(`[data-applicant-field-draggable="${escapedFieldId}"]`)?.classList.add("is-dragging");

  const targetBounds = target.getBoundingClientRect();
  const placement = event.clientY > targetBounds.top + targetBounds.height / 2 ? "after" : "before";

  target.classList.add(placement === "after" ? "is-drop-target-after" : "is-drop-target-before");

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
});

document.addEventListener("drop", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-applicant-field-draggable]") : null;

  if (!applicantFieldDragSourceId || !target) {
    clearApplicantFieldDragIndicators();
    applicantFieldDragSourceId = "";
    return;
  }

  const targetFieldId = String(target.dataset.applicantFieldDraggable || "").trim();

  if (!targetFieldId || targetFieldId === applicantFieldDragSourceId) {
    clearApplicantFieldDragIndicators();
    applicantFieldDragSourceId = "";
    return;
  }

  event.preventDefault();
  const targetBounds = target.getBoundingClientRect();
  const placement = event.clientY > targetBounds.top + targetBounds.height / 2 ? "after" : "before";
  applicantFieldIgnoreClickUntil = Date.now() + 250;
  void reorderApplicantField(applicantFieldDragSourceId, targetFieldId, placement);
  clearApplicantFieldDragIndicators();
  applicantFieldDragSourceId = "";
});

document.addEventListener("dragend", () => {
  clearApplicantFieldDragIndicators();
  applicantFieldDragSourceId = "";
});

if (uploadFileInput && uploadFileName) {
  uploadFileInput.addEventListener("change", () => {
    syncUploadDropzoneLabel("uploadFileInput");
  });
}

if (applicantUnitUploadFileInput && applicantUnitUploadFileName) {
  applicantUnitUploadFileInput.addEventListener("change", () => {
    syncUploadDropzoneLabel("applicantUnitUploadFileInput");
  });
}

if (uploadPhotoArchiveInput && uploadPhotoArchiveName) {
  uploadPhotoArchiveInput.addEventListener("change", () => {
    syncUploadDropzoneLabel("uploadPhotoArchiveInput");
  });
}

document.querySelectorAll("[data-upload-dropzone]").forEach((dropzone) => {
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  });

  dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone.addEventListener("dragleave", (event) => {
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;

    if (relatedTarget && dropzone.contains(relatedTarget)) {
      return;
    }

    dropzone.classList.remove("is-dragover");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    assignDroppedFileToUploadInput(dropzone.dataset.uploadDropzone, event.dataTransfer?.files || []);
  });
});

document.addEventListener("change", async (event) => {
  if (await handleApplicantAdminChange(event)) {
    return;
  }

  if (syncApplicantAdminInputValue(event)) {
    return;
  }

  await handleAppDocumentChange(event);
});

document.addEventListener("compositionstart", (event) => {
  handleAppDocumentCompositionStart(event);
});

document.addEventListener("compositionend", (event) => {
  handleAppDocumentCompositionEnd(event);
});

document.addEventListener("input", (event) => {
  if (syncApplicantAdminInputValue(event)) {
    return;
  }

  handleAppDocumentInput(event);
});

document.addEventListener("selectionchange", () => {
  loginNoticeEventHandlers.handleSelectionChange();
  templateEditorEventHandlers.handleSelectionChange();
});

document.addEventListener("paste", (event) => {
  if (loginNoticeEventHandlers.handlePaste(event)) {
    return;
  }

  templateEditorEventHandlers.handlePaste(event);
});

document.addEventListener("touchstart", () => {
  recordAutoLogoutActivity();
}, { passive: true });

loadAuthSession();

