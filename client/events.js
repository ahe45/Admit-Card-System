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
  getLoginNoticeEditorElement,
  getLoginNoticeImageInputElement,
  handleLoginNoticeAction,
  handleLoginNoticeInsert,
  handleLoginNoticeTableAction,
  insertLoginNoticeImage,
  redoLoginNoticeEditorHistory,
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
  await handleAppDocumentClick(event);
});

document.addEventListener("keydown", async (event) => {
  await handleAppDocumentKeydown(event);
});

document.addEventListener("submit", async (event) => {
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

if (uploadFileInput && uploadFileName) {
  uploadFileInput.addEventListener("change", () => {
    uploadFileName.textContent = uploadFileInput.files?.[0]?.name || "선택된 데이터 파일이 없습니다.";
  });
}

if (uploadPhotoArchiveInput && uploadPhotoArchiveName) {
  uploadPhotoArchiveInput.addEventListener("change", () => {
    uploadPhotoArchiveName.textContent = uploadPhotoArchiveInput.files?.[0]?.name || "선택된 사진 ZIP이 없습니다.";
  });
}

document.addEventListener("change", async (event) => {
  await handleAppDocumentChange(event);
});

document.addEventListener("compositionstart", (event) => {
  handleAppDocumentCompositionStart(event);
});

document.addEventListener("compositionend", (event) => {
  handleAppDocumentCompositionEnd(event);
});

document.addEventListener("input", (event) => {
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

