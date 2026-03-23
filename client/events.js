const navItems = Array.from(document.querySelectorAll(".nav-item"));

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

function rerenderGridInteraction(gridKey = "") {
  hideGridCellTooltip();

  if (state.currentView === "admitCardLookup" && gridKey === "admitCardLookupGrid") {
    refreshAdmitCardLookupView();
    return;
  }

  renderView();
}

function rerenderLookupViewInteraction() {
  hideGridCellTooltip();

  if (state.currentView === "admitCardLookup") {
    refreshAdmitCardLookupView();
    return;
  }

  renderView();
}

const GRID_CELL_TOOLTIP_DELAY_MS = 1000;
let gridCellTooltipTimerId = 0;
let gridCellTooltipActiveTarget = null;

function getGridCellTooltipElement() {
  return document.getElementById("tableCellTooltip");
}

function clearGridCellTooltipTimer() {
  if (gridCellTooltipTimerId) {
    window.clearTimeout(gridCellTooltipTimerId);
    gridCellTooltipTimerId = 0;
  }
}

function resetGridCellTooltipPosition(tooltipElement) {
  if (!(tooltipElement instanceof HTMLElement)) {
    return;
  }

  tooltipElement.style.removeProperty("left");
  tooltipElement.style.removeProperty("top");
}

function hideGridCellTooltip() {
  clearGridCellTooltipTimer();
  gridCellTooltipActiveTarget = null;

  const tooltipElement = getGridCellTooltipElement();

  if (!(tooltipElement instanceof HTMLElement)) {
    return;
  }

  tooltipElement.classList.add("hidden");
  tooltipElement.setAttribute("aria-hidden", "true");
  tooltipElement.textContent = "";
  resetGridCellTooltipPosition(tooltipElement);
}

function getGridCellTooltipTarget(target) {
  return target instanceof Element ? target.closest("[data-grid-cell-text]") : null;
}

function isGridCellTooltipOverflowing(targetElement) {
  return targetElement instanceof HTMLElement && targetElement.scrollWidth > targetElement.clientWidth + 1;
}

function positionGridCellTooltip(targetElement) {
  const tooltipElement = getGridCellTooltipElement();

  if (!(tooltipElement instanceof HTMLElement) || !(targetElement instanceof HTMLElement) || tooltipElement.classList.contains("hidden")) {
    return;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const viewportPadding = 12;
  const offset = 10;
  const tooltipRect = tooltipElement.getBoundingClientRect();
  let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  let top = targetRect.bottom + offset;

  if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
    left = window.innerWidth - tooltipRect.width - viewportPadding;
  }

  if (left < viewportPadding) {
    left = viewportPadding;
  }

  if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
    top = targetRect.top - tooltipRect.height - offset;
  }

  if (top < viewportPadding) {
    top = viewportPadding;
  }

  tooltipElement.style.left = `${Math.round(left)}px`;
  tooltipElement.style.top = `${Math.round(top)}px`;
}

function showGridCellTooltip(targetElement) {
  if (!(targetElement instanceof HTMLElement) || !document.body.contains(targetElement) || !isGridCellTooltipOverflowing(targetElement)) {
    hideGridCellTooltip();
    return;
  }

  const tooltipElement = getGridCellTooltipElement();
  const fullText = String(targetElement.dataset.gridCellFullText || "").trim();

  if (!(tooltipElement instanceof HTMLElement) || !fullText) {
    hideGridCellTooltip();
    return;
  }

  tooltipElement.textContent = fullText;
  tooltipElement.classList.remove("hidden");
  tooltipElement.setAttribute("aria-hidden", "false");
  gridCellTooltipActiveTarget = targetElement;
  positionGridCellTooltip(targetElement);
}

function scheduleGridCellTooltip(targetElement) {
  if (!(targetElement instanceof HTMLElement)) {
    return;
  }

  clearGridCellTooltipTimer();
  gridCellTooltipActiveTarget = targetElement;

  if (!isGridCellTooltipOverflowing(targetElement)) {
    return;
  }

  gridCellTooltipTimerId = window.setTimeout(() => {
    if (gridCellTooltipActiveTarget !== targetElement) {
      return;
    }

    showGridCellTooltip(targetElement);
  }, GRID_CELL_TOOLTIP_DELAY_MS);
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

document.addEventListener("click", async (event) => {
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  hideGridCellTooltip();

  const noticeCommandTrigger = event.target.closest("button[data-notice-command]");
  const noticeActionTrigger = event.target.closest("button[data-notice-action]");
  const noticeInsertTrigger = event.target.closest("button[data-notice-insert]");
  const noticeTableActionTrigger = event.target.closest("button[data-notice-table-action]");
  const noticeOpenImageTrigger = event.target.closest("button[data-notice-open-image]");
  const noticeTableInsertPanelTrigger = event.target.closest("#loginNoticeTableInsertPanel");
  const fontSizeComboTrigger = event.target.closest(".template-toolbar-font-size-combo");
  const fontSizeToggleTrigger = event.target.closest("[data-editor-font-size-toggle]");
  const fontSizeOptionTrigger = event.target.closest("[data-editor-font-size-option]");
  const colorPickerTrigger = event.target.closest(".template-toolbar-color-picker");
  const colorToggleTrigger = event.target.closest("[data-editor-color-toggle]");
  const colorDirectTrigger = event.target.closest("[data-editor-color-direct]");
  const colorPresetTrigger = event.target.closest("[data-editor-color-preset]");
  const colorApplyTrigger = event.target.closest("[data-editor-color-apply]");
  const headerComboTrigger = event.target.closest("[data-header-combo-trigger]");
  const headerComboOptionTrigger = event.target.closest("[data-header-combo-option]");
  const pageSizeTrigger = event.target.closest("[data-page-size-trigger]");
  const pageSizeOption = event.target.closest("[data-page-size-option]");
  const pageTrigger = event.target.closest("[data-grid-page], [data-grid-nav]");
  const gridSelectionTrigger = event.target.closest("[data-grid-select-all], [data-grid-select-row]");
  const gridRowTrigger = event.target.closest("[data-grid-row-clickable]");
  const sortTrigger = event.target.closest("[data-grid-sort]");
  const filterTrigger = event.target.closest("[data-grid-filter]");
  const filterOptionTrigger = event.target.closest("[data-grid-filter-option]");
  const filterClearTrigger = event.target.closest("[data-grid-filter-clear]");
  const filterCloseTrigger = event.target.closest("[data-grid-filter-close]");
  const filterChipTrigger = event.target.closest("[data-grid-filter-chip]");
  const filterClearAllTrigger = event.target.closest("[data-grid-filter-clear-all]");
  const resetHeaderFiltersTrigger = event.target.closest("[data-reset-header-filters]");
  const filterMenu = event.target.closest(".table-filter-menu");
  const openModalTrigger = event.target.closest("[data-open-modal]");
  const passwordSetupCloseTrigger = event.target.closest("[data-password-setup-close]");
  const closeTrigger = event.target.closest("[data-close-modal]");
  const examineeDetailCloseDismissTrigger = event.target.closest("[data-examinee-detail-close-dismiss]");
  const examineeDetailCloseActionTrigger = event.target.closest("[data-examinee-detail-close-action]");
  const lookupResetTrigger = event.target.closest("[data-reset-lookup]");
  const refreshTrigger = event.target.closest("[data-refresh-grid]");
  const addTemplateTrigger = event.target.closest("[data-add-template]");
  const templatePreviewTrigger = event.target.closest("[data-template-preview]");
  const templateCardEditTrigger = event.target.closest("[data-template-card-edit]");
  const templateCardSaveTrigger = event.target.closest("[data-template-card-save]");
  const templateCardCancelTrigger = event.target.closest("[data-template-card-cancel]");
  const templateEditTrigger = event.target.closest("[data-template-edit]");
  const templateDeleteTrigger = event.target.closest("[data-template-delete]");
  const templateCommandTrigger = event.target.closest("[data-template-command]");
  const templateBlockTrigger = event.target.closest("[data-template-block]");
  const templateTableActionTrigger = event.target.closest("[data-template-table-action]");
  const templateTableSizeTrigger = event.target.closest("[data-template-table-size]");
  const templateInsertTrigger = event.target.closest("[data-template-insert]");
  const templateTableInsertPanelTrigger = event.target.closest("#templateEditorTableInsertPanel");
  const templateTagTrigger = event.target.closest("[data-template-tag]");
  const templateOpenImageTrigger = event.target.closest("[data-template-open-image]");
  const templateSaveTrigger = event.target.closest("[data-save-template-editor]");
  const templatePrintTrigger = event.target.closest("[data-print-template-preview]");
  const templateApplyTrigger = event.target.closest("[data-template-apply]");
  const downloadExamineesTrigger = event.target.closest("[data-download-examinees]");
  const downloadPrintHistoryTrigger = event.target.closest("[data-download-print-history]");
  const uploadExamineesTrigger = event.target.closest("[data-upload-examinees]");
  const batchPrintTrigger = event.target.closest("[data-batch-print]");
  const examineePrintTrigger = event.target.closest("[data-print-examinee]");
  const authLogoutTrigger = event.target.closest("[data-auth-logout]");
  const accountEditTrigger = event.target.closest("[data-account-edit]");
  const accountSaveTrigger = event.target.closest("[data-account-save]");
  const accountCancelTrigger = event.target.closest("[data-account-cancel]");
  const accountResetTrigger = event.target.closest("[data-account-reset]");
  const accountDeleteTrigger = event.target.closest("[data-account-delete]");
  const systemSettingsActionTrigger = event.target.closest("[data-system-settings-action]");
  const systemSettingsStepTrigger = event.target.closest("[data-system-settings-step]");
  const systemDataDeleteTrigger = event.target.closest("[data-system-data-delete]");
  const examineeDetailSaveTrigger = event.target.closest("[data-examinee-detail-save]");
  const examineeDetailResetTrigger = event.target.closest("[data-examinee-detail-reset]");
  const examineeDetailPhotoUploadTrigger = event.target.closest("[data-examinee-detail-photo-upload]");

  if (
    templateEditorTableInsertPanel &&
    !templateInsertTrigger &&
    !templateTableInsertPanelTrigger &&
    !templateEditorTableInsertPanel.classList.contains("hidden")
  ) {
    setTemplateEditorTableInsertPanelVisibility(false);
  }

  const noticeTableInsertPanel = getLoginNoticeTableInsertPanel?.();

  if (
    noticeTableInsertPanel &&
    !noticeInsertTrigger &&
    !noticeTableInsertPanelTrigger &&
    !noticeTableInsertPanel.classList.contains("hidden")
  ) {
    setLoginNoticeTableInsertPanelVisibility(false);
  }

  if (!fontSizeComboTrigger) {
    closeAllEditorToolbarFontSizeMenus();
  }

  if (!colorPickerTrigger) {
    closeAllEditorToolbarColorPanels();
  }

  if (headerComboTrigger) {
    const selectId = String(headerComboTrigger.dataset.headerComboTrigger || "").trim();
    const comboElement = getHeaderComboElement(selectId);
    const nextOpen = !(comboElement?.classList.contains("is-open"));

    closeAllHeaderCombos(nextOpen ? selectId : "");
    setHeaderComboOpen(selectId, nextOpen);
    return;
  }

  if (headerComboOptionTrigger) {
    const selectId = String(headerComboOptionTrigger.dataset.headerComboOption || "").trim();
    const selectElement = document.getElementById(selectId);

    if (selectElement instanceof HTMLSelectElement) {
      closeAllHeaderCombos();
      selectElement.value = String(headerComboOptionTrigger.dataset.headerComboValue || "");
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      closeAllHeaderCombos();
    }

    return;
  }

  if (gridSelectionTrigger) {
    return;
  }

  if (resetHeaderFiltersTrigger) {
    clearHeaderFilters();
    return;
  }

  if (noticeCommandTrigger) {
    applyLoginNoticeEditorCommand(noticeCommandTrigger.dataset.noticeCommand);
    return;
  }

  if (noticeActionTrigger) {
    handleLoginNoticeAction(noticeActionTrigger.dataset.noticeAction);
    return;
  }

  if (noticeInsertTrigger) {
    handleLoginNoticeInsert(noticeInsertTrigger.dataset.noticeInsert);
    return;
  }

  if (noticeTableActionTrigger) {
    handleLoginNoticeTableAction(noticeTableActionTrigger.dataset.noticeTableAction);
    return;
  }

  if (noticeOpenImageTrigger) {
    getLoginNoticeImageInputElement?.()?.click();
    return;
  }

  if (fontSizeToggleTrigger) {
    const inputId = fontSizeToggleTrigger.dataset.editorFontSizeToggle;
    const comboElement = fontSizeToggleTrigger.closest(".template-toolbar-font-size-combo");
    const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu");
    const nextOpen = menuElement?.classList.contains("hidden") ?? true;

    setEditorToolbarFontSizeMenuVisibility(inputId, nextOpen);
    return;
  }

  if (fontSizeOptionTrigger) {
    const comboMenu = fontSizeOptionTrigger.closest(".template-toolbar-combo-menu");
    const inputId = comboMenu?.dataset.editorFontSizeMenuFor || "";
    const fontSize = fontSizeOptionTrigger.dataset.editorFontSizeOption || "";

    if (!inputId || !fontSize) {
      return;
    }

    const inputElement = document.getElementById(inputId);

    if (inputElement) {
      inputElement.value = fontSize;
    }

    if (inputId === "templateEditorFontSize") {
      applyTemplateEditorFontSize(fontSize);
    }

    if (inputId === "loginNoticeFontSize") {
      applyLoginNoticeEditorCommand("fontSizePx", fontSize);
    }

    setEditorToolbarFontSizeMenuVisibility(inputId, false);
    return;
  }

  if (colorToggleTrigger) {
    const inputId = colorToggleTrigger.dataset.editorColorToggle || "";
    const { panelElement } = getEditorToolbarColorPickerElements(inputId);
    const nextVisible = panelElement?.classList.contains("hidden") ?? true;

    setEditorToolbarColorPanelVisibility(inputId, nextVisible);
    return;
  }

  if (colorDirectTrigger) {
    const inputId = colorDirectTrigger.dataset.editorColorInput || "";
    const { inputElement } = getEditorToolbarColorPickerElements(inputId);

    if (inputElement?.showPicker) {
      inputElement.showPicker();
      return;
    }

    inputElement?.click();
    return;
  }

  if (colorPresetTrigger) {
    applyEditorToolbarColorTrigger(colorPresetTrigger);
    closeAllEditorToolbarColorPanels();
    return;
  }

  if (colorApplyTrigger) {
    applyEditorToolbarColorTrigger(colorApplyTrigger);
    closeAllEditorToolbarColorPanels();
    return;
  }

  if (addTemplateTrigger) {
    await addTemplateCard();
    return;
  }

  if (templatePreviewTrigger) {
    openTemplatePreview(templatePreviewTrigger.dataset.templatePreview);
    return;
  }

  if (templateCardEditTrigger) {
    openTemplateCardMetaEditor(templateCardEditTrigger.dataset.templateCardEdit, templateCardEditTrigger.dataset.templateCardField);
    return;
  }

  if (templateCardSaveTrigger) {
    await saveTemplateCardMetaEditor(templateCardSaveTrigger.dataset.templateCardSave, templateCardSaveTrigger.dataset.templateCardField);
    return;
  }

  if (templateCardCancelTrigger) {
    closeTemplateCardMetaEditor();
    return;
  }

  if (templateEditTrigger) {
    openTemplateEditor(templateEditTrigger.dataset.templateEdit);
    return;
  }

  if (templateDeleteTrigger) {
    await deleteTemplateCard(templateDeleteTrigger.dataset.templateDelete);
    return;
  }

  if (templateCommandTrigger) {
    applyTemplateEditorCommand(templateCommandTrigger.dataset.templateCommand);
    return;
  }

  if (templateBlockTrigger) {
    applyTemplateEditorCommand("formatBlock", templateBlockTrigger.dataset.templateBlock);
    return;
  }

  if (templateTableActionTrigger) {
    handleTemplateTableAction(templateTableActionTrigger.dataset.templateTableAction);
    return;
  }

  if (templateTableSizeTrigger) {
    applyTemplateTableSize();
    return;
  }

  if (templateInsertTrigger) {
    handleTemplateEditorInsert(templateInsertTrigger.dataset.templateInsert);
    return;
  }

  if (templateTagTrigger) {
    insertTemplateTag(templateTagTrigger.dataset.templateTag);
    return;
  }

  if (templateOpenImageTrigger) {
    setTemplateEditorTableInsertPanelVisibility(false);
    templateEditorImageInput?.click();
    return;
  }

  if (templateSaveTrigger) {
    await saveTemplateEditor();
    return;
  }

  if (templatePrintTrigger) {
    await printTemplatePreview();
    return;
  }

  if (templateApplyTrigger) {
    await applyTemplateCard(templateApplyTrigger.dataset.templateApply);
    return;
  }

  if (downloadExamineesTrigger) {
    await downloadExamineeGridWorkbook();
    return;
  }

  if (downloadPrintHistoryTrigger) {
    await downloadPrintHistoryGridWorkbook();
    return;
  }

  if (uploadExamineesTrigger) {
    await uploadSelectedExamineeFile();
    return;
  }

  if (batchPrintTrigger) {
    await batchPrintSelectedExaminees();
    return;
  }

  if (examineePrintTrigger) {
    await printExamineeAdmitCard(examineePrintTrigger.dataset.printExaminee);
    return;
  }

  if (authLogoutTrigger) {
    await logoutCurrentUser();
    return;
  }

  if (accountEditTrigger) {
    startAccountEdit(accountEditTrigger.dataset.accountEdit);
    renderView();
    return;
  }

  if (accountSaveTrigger) {
    await saveAccountEdit(accountSaveTrigger.dataset.accountSave);
    return;
  }

  if (accountCancelTrigger) {
    cancelAccountEdit();
    renderView();
    return;
  }

  if (accountResetTrigger) {
    await resetAccountPasswordAction(accountResetTrigger.dataset.accountReset);
    return;
  }

  if (accountDeleteTrigger) {
    await deleteAccountAction(accountDeleteTrigger.dataset.accountDelete);
    return;
  }

  if (systemSettingsActionTrigger?.dataset.systemSettingsAction === "save") {
    await saveSystemSettings();
    return;
  }

  if (systemSettingsStepTrigger) {
    changeSystemAutoLogoutMinutes(systemSettingsStepTrigger.dataset.systemSettingsStep === "down" ? -1 : 1);
    return;
  }

  if (systemDataDeleteTrigger) {
    await deleteSystemDataAction(systemDataDeleteTrigger.dataset.systemDataDelete);
    return;
  }

  if (examineeDetailSaveTrigger) {
    await saveExamineeDetail();
    return;
  }

  if (examineeDetailResetTrigger) {
    resetExamineeDetailEditor();
    renderView();
    return;
  }

  if (examineeDetailPhotoUploadTrigger) {
    document.getElementById("examineeDetailPhotoInput")?.click();
    return;
  }

  if (gridRowTrigger) {
    closeAllPageSizeMenus();
    closeAllGridFilterMenus();

    if (
      handleGridRowClickSelection(gridRowTrigger.dataset.gridKey, gridRowTrigger.dataset.gridRowId, {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      })
    ) {
      rerenderGridInteraction(gridRowTrigger.dataset.gridKey);
    }

    return;
  }

  if (pageSizeTrigger) {
    const tableState = getTableState(pageSizeTrigger.dataset.gridKey);
    const nextOpen = !tableState.pageSizeMenuOpen;

    closeAllPageSizeMenus(nextOpen ? pageSizeTrigger.dataset.gridKey : "");
    closeAllGridFilterMenus();
    tableState.pageSizeMenuOpen = nextOpen;
    rerenderGridInteraction(pageSizeTrigger.dataset.gridKey);
    return;
  }

  if (pageSizeOption) {
    const tableState = getTableState(pageSizeOption.dataset.gridKey);
    tableState.pageSize = Number(pageSizeOption.dataset.pageSizeOption) || 10;
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    closeAllPageSizeMenus(pageSizeOption.dataset.gridKey);
    closeAllGridFilterMenus();
    rerenderGridInteraction(pageSizeOption.dataset.gridKey);
    return;
  }

  if (pageTrigger) {
    const tableState = getTableState(pageTrigger.dataset.gridKey);
    const totalPages = getTotalPages(getGridRows(pageTrigger.dataset.gridKey).length, tableState.pageSize);
    const currentPage = getGridPage(pageTrigger.dataset.gridKey, totalPages);

    if (pageTrigger.dataset.gridNav === "prev") {
      tableState.page = Math.max(1, currentPage - 1);
    }

    if (pageTrigger.dataset.gridNav === "next") {
      tableState.page = Math.min(totalPages, currentPage + 1);
    }

    if (pageTrigger.dataset.gridPage) {
      tableState.page = clampPage(pageTrigger.dataset.gridPage, totalPages);
    }

    tableState.pageSizeMenuOpen = false;
    closeAllGridFilterMenus();
    rerenderGridInteraction(pageTrigger.dataset.gridKey);
    return;
  }

  if (sortTrigger) {
    toggleGridSort(sortTrigger.dataset.gridKey, sortTrigger.dataset.gridSort);
    rerenderGridInteraction(sortTrigger.dataset.gridKey);
    return;
  }

  if (filterTrigger) {
    toggleGridFilterMenu(filterTrigger.dataset.gridKey, filterTrigger.dataset.gridFilter);
    rerenderGridInteraction(filterTrigger.dataset.gridKey);
    return;
  }

  if (filterOptionTrigger) {
    toggleGridFilterValue(
      filterOptionTrigger.dataset.gridKey,
      filterOptionTrigger.dataset.gridFilterOption,
      filterOptionTrigger.dataset.gridFilterValue,
    );
    rerenderGridInteraction(filterOptionTrigger.dataset.gridKey);
    return;
  }

  if (filterClearTrigger) {
    clearGridFilter(filterClearTrigger.dataset.gridKey, filterClearTrigger.dataset.gridFilterClear);
    rerenderGridInteraction(filterClearTrigger.dataset.gridKey);
    return;
  }

  if (filterCloseTrigger) {
    closeGridFilterMenu(filterCloseTrigger.dataset.gridKey, filterCloseTrigger.dataset.gridFilterClose);
    rerenderGridInteraction(filterCloseTrigger.dataset.gridKey);
    return;
  }

  if (filterChipTrigger) {
    removeGridFilterValue(
      filterChipTrigger.dataset.gridKey,
      filterChipTrigger.dataset.gridFilterChip,
      filterChipTrigger.dataset.gridFilterValue,
    );
    rerenderGridInteraction(filterChipTrigger.dataset.gridKey);
    return;
  }

  if (filterClearAllTrigger) {
    clearAllGridFilters(filterClearAllTrigger.dataset.gridKey);
    rerenderGridInteraction(filterClearAllTrigger.dataset.gridKey);
    return;
  }

  if (lookupResetTrigger) {
    state.lookupFilters = createLookupFilters();
    getTableState("admitCardLookupGrid").page = 1;
    rerenderLookupViewInteraction();
    return;
  }

  if (refreshTrigger) {
    const tableState = getTableState(refreshTrigger.dataset.refreshGrid);
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    await loadBootstrapData({ showLoading: false });
    return;
  }

  if (filterMenu) {
    return;
  }

  closeAllHeaderCombos();
  const didCloseMenus = closeAllPageSizeMenus();
  const didCloseFilterMenus = closeAllGridFilterMenus();
  const downloadTrigger = event.target.closest("[data-download-template]");

  if (downloadTrigger) {
    await downloadExamineeTemplate();
    return;
  }

  if (openModalTrigger) {
    openModal(openModalTrigger.dataset.openModal);
    return;
  }

  if (passwordSetupCloseTrigger) {
    await closePasswordSetupPrompt();
    return;
  }

  if (examineeDetailCloseDismissTrigger) {
    closeExamineeDetailCloseConfirmModal("cancel");
    return;
  }

  if (examineeDetailCloseActionTrigger) {
    closeExamineeDetailCloseConfirmModal(examineeDetailCloseActionTrigger.dataset.examineeDetailCloseAction);
    return;
  }

  if (closeTrigger) {
    await requestCloseModal(closeTrigger.closest(".modal")?.id);
    return;
  }

  if (didCloseMenus || didCloseFilterMenus) {
    rerenderGridInteraction("admitCardLookupGrid");
  }
});

document.addEventListener("keydown", async (event) => {
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  recordAutoLogoutActivity();
  const loginNoticeEditor = getLoginNoticeEditorElement?.();
  const loginNoticeTableInsertPanel = getLoginNoticeTableInsertPanel?.();
  const isTemplateEditorShortcutTarget =
    !templateEditorModal?.classList.contains("hidden") &&
    (event.target === templateEditorSurface || templateEditorSurface?.contains(event.target));
  const isLoginNoticeShortcutTarget =
    state.currentView === "loginNoticeSettings" &&
    loginNoticeEditor &&
    (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target));
  const isModifierPressed = event.ctrlKey || event.metaKey;
  const normalizedKey = String(event.key || "").toLowerCase();
  const isTemplateTableInsertField =
    event.target?.id === "templateEditorTableRows" || event.target?.id === "templateEditorTableColumns";
  const isLoginNoticeTableInsertField = event.target?.id === "loginNoticeTableRows" || event.target?.id === "loginNoticeTableColumns";
  const isTemplateEditorFontSizeField = event.target?.id === "templateEditorFontSize";
  const isLoginNoticeFontSizeField = event.target?.id === "loginNoticeFontSize";
  const isTemplateCardMetaField = event.target?.matches?.("[data-template-card-input]") ?? false;

  if (isTemplateCardMetaField && event.key === "Enter") {
    event.preventDefault();
    void saveTemplateCardMetaEditor(event.target.dataset.templateCardInput, event.target.dataset.templateCardField);
    return;
  }

  if (isTemplateCardMetaField && event.key === "Escape") {
    event.preventDefault();
    closeTemplateCardMetaEditor();
    return;
  }

  if (isLoginNoticeShortcutTarget && isModifierPressed && !event.altKey) {
    if (normalizedKey === "z" && event.shiftKey) {
      event.preventDefault();
      redoLoginNoticeEditorHistory();
      return;
    }

    if (normalizedKey === "z") {
      event.preventDefault();
      undoLoginNoticeEditorHistory();
      return;
    }

    if (normalizedKey === "y") {
      event.preventDefault();
      redoLoginNoticeEditorHistory();
      return;
    }
  }

  if (isTemplateEditorShortcutTarget && isModifierPressed && !event.altKey) {
    if (normalizedKey === "z" && event.shiftKey) {
      event.preventDefault();
      redoTemplateEditorHistory();
      return;
    }

    if (normalizedKey === "z") {
      event.preventDefault();
      undoTemplateEditorHistory();
      return;
    }

    if (normalizedKey === "y") {
      event.preventDefault();
      redoTemplateEditorHistory();
      return;
    }
  }

  if (isTemplateEditorShortcutTarget && !isModifierPressed && (event.key === "Backspace" || event.key === "Delete")) {
    if (handleTemplateEditorTokenDeletion(event)) {
      return;
    }
  }

  if (
    isLoginNoticeTableInsertField &&
    event.key === "Enter" &&
    loginNoticeTableInsertPanel &&
    !loginNoticeTableInsertPanel.classList.contains("hidden")
  ) {
    event.preventDefault();
    handleLoginNoticeInsert("table-confirm");
    return;
  }

  if (
    !templateEditorModal?.classList.contains("hidden") &&
    isTemplateTableInsertField &&
    event.key === "Enter" &&
    !templateEditorTableInsertPanel?.classList.contains("hidden")
  ) {
    event.preventDefault();
    handleTemplateEditorInsert("table-confirm");
    return;
  }

  if (isTemplateEditorFontSizeField && event.key === "Enter") {
    event.preventDefault();
    applyTemplateEditorFontSize(event.target.value);
    return;
  }

  if (isLoginNoticeFontSizeField && event.key === "Enter") {
    event.preventDefault();
    applyLoginNoticeEditorCommand("fontSizePx", event.target.value);
    return;
  }

  if (event.key === "Escape" && closeAllEditorToolbarFontSizeMenus()) {
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && closeAllEditorToolbarColorPanels()) {
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && closeAllHeaderCombos()) {
    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && state.auth.status === "password_setup") {
    event.preventDefault();
    void closePasswordSetupPrompt();
    return;
  }

  if (event.key === "Escape" && !examineeDetailCloseConfirmModal?.classList.contains("hidden")) {
    event.preventDefault();
    closeExamineeDetailCloseConfirmModal("cancel");
    return;
  }

  if (event.key === "Escape") {
    const didCloseModals = await requestCloseAllModals();

    if (didCloseModals === false) {
      return;
    }

    if (closeAllPageSizeMenus() || closeAllGridFilterMenus()) {
      renderView();
    }
    sidebar?.classList.remove("open");
  }
});

document.addEventListener("submit", async (event) => {
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  if (event.target.id === "loginForm") {
    event.preventDefault();
    await submitLogin();
    return;
  }

  if (event.target.id === "passwordSetupForm") {
    event.preventDefault();
    await submitPasswordSetup();
    return;
  }

  if (event.target.id === "accountCreateForm") {
    event.preventDefault();
    await submitAccountCreate();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  hideGridCellTooltip();
  recordAutoLogoutActivity();
  const noticeToolbarTrigger = event.target.closest(
    "button[data-notice-command], button[data-notice-action], button[data-notice-insert], button[data-notice-table-action], button[data-notice-open-image], button[data-editor-color-preset], button[data-editor-color-apply], button[data-editor-color-toggle], button[data-editor-color-direct]",
  );
  const noticeFontSizeTrigger = event.target.closest(
    ".login-notice-editor-toolbar [data-editor-font-size-toggle], .login-notice-editor-toolbar [data-editor-font-size-option]",
  );
  const noticeToolbarSelectionControl = event.target.closest(
    "#loginNoticeFontFamily, #loginNoticeFontSize, #loginNoticeTextColor, #loginNoticeTextShading, #loginNoticeCellShading",
  );

  if (noticeToolbarTrigger || noticeFontSizeTrigger) {
    captureLoginNoticeEditorSelection();
    event.preventDefault();
    return;
  }

  if (noticeToolbarSelectionControl) {
    captureLoginNoticeEditorSelection();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (templateEditorModal?.classList.contains("hidden")) {
    return;
  }

  hideGridCellTooltip();
  const toolbarTrigger = event.target.closest(
    "[data-template-command], [data-template-table-action], [data-template-insert], [data-template-open-image], [data-template-tag], [data-save-template-editor], [data-editor-color-preset], [data-editor-color-apply], [data-editor-color-toggle], [data-editor-color-direct]",
  );
  const templateFontSizeTrigger = event.target.closest(
    "#templateEditorModal [data-editor-font-size-toggle], #templateEditorModal [data-editor-font-size-option]",
  );
  const toolbarSelectionControl = event.target.closest(
    "#templateEditorBlockType, #templateEditorFontFamily, #templateEditorFontSize, #templateEditorTextColor, #templateEditorTextShading, #templateEditorCellShading",
  );

  if (toolbarTrigger || templateFontSizeTrigger) {
    saveTemplateEditorSelection();
    event.preventDefault();
    return;
  }

  if (toolbarSelectionControl) {
    saveTemplateEditorSelection();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!templateEditorSurface || templateEditorModal?.classList.contains("hidden")) {
    return;
  }

  hideGridCellTooltip();
  if (
    event.button !== 0 ||
    state.templateEditor.imageResizeSession ||
    state.templateEditor.imageMoveSession ||
    state.templateEditor.tableResizeSession ||
    state.templateEditor.tableSelectionSession
  ) {
    return;
  }

  if (handleTemplateEditorTablePointerDown(event)) {
    return;
  }

  const selectedImage = getTemplateEditorImageTarget(event.target);

  if (selectedImage) {
    event.preventDefault();
    clearTemplateEditorTableSelection();
    clearTemplateEditorTableHoverState();
    selectTemplateEditorImage(selectedImage);
    startTemplateEditorImageMoveSession(selectedImage, event);
    return;
  }

  if (event.target instanceof Element && templateEditorSurface.contains(event.target)) {
    clearTemplateEditorImageSelection();
    clearTemplateEditorTableSelection();
    clearTemplateEditorTableHoverState();
  }
});

document.addEventListener("dragstart", (event) => {
  if (getTemplateEditorImageTarget(event.target)) {
    event.preventDefault();
  }
});

document.addEventListener("mouseover", (event) => {
  const nextTarget = getGridCellTooltipTarget(event.target);

  if (!(nextTarget instanceof HTMLElement)) {
    return;
  }

  const previousTarget = getGridCellTooltipTarget(event.relatedTarget);

  if (previousTarget === nextTarget) {
    return;
  }

  scheduleGridCellTooltip(nextTarget);
});

document.addEventListener("mouseout", (event) => {
  const previousTarget = getGridCellTooltipTarget(event.target);

  if (!(previousTarget instanceof HTMLElement)) {
    return;
  }

  const nextTarget = getGridCellTooltipTarget(event.relatedTarget);

  if (previousTarget === nextTarget) {
    return;
  }

  hideGridCellTooltip();
});

if (templateEditorSurface) {
  templateEditorSurface.addEventListener("pointermove", (event) => {
    updateTemplateEditorTableHoverState(event);
  });

  templateEditorSurface.addEventListener("pointerleave", () => {
    clearTemplateEditorTableHoverState();
  });

  templateEditorSurface.addEventListener("scroll", () => {
    clearTemplateEditorTableHoverState();
    updateTemplateEditorImageSelectionOverlay();
  });
}

window.addEventListener("resize", () => {
  if (gridCellTooltipActiveTarget instanceof HTMLElement) {
    positionGridCellTooltip(gridCellTooltipActiveTarget);
  }

  updateTemplateEditorImageSelectionOverlay();
  syncOpenGridFilterMenuPosition?.();
});

document.addEventListener("scroll", () => {
  hideGridCellTooltip();
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
  if (isBusyOverlayActive()) {
    event.preventDefault();
    return;
  }

  const lookupSelectField = lookupSelectFields.find((field) => field.id === event.target.id);
  const headerFilterField = headerFilterFields.find((field) => field.id === event.target.id);
  const gridSelectAllTrigger = event.target.closest("[data-grid-select-all]");
  const gridSelectRowTrigger = event.target.closest("[data-grid-select-row]");
  const examineeDetailField = event.target.closest("[data-examinee-detail-field]");
  const filterSelectAllTrigger = event.target.matches("[data-grid-filter-select-all]") ? event.target : null;
  const filterOptionInput = event.target.matches("[data-grid-filter-option-input]") ? event.target : null;
  const accountField = event.target.closest("[data-account-field]");
  const noticeCommandSelect = event.target.matches("select[data-notice-command]") ? event.target : null;
  const toolbarColorInput = event.target.matches(".template-toolbar-color") ? event.target : null;

  if (event.target.id === "loginNoticeImageInput") {
    insertLoginNoticeImage(event.target.files?.[0]);
    event.target.value = "";
    return;
  }

  if (event.target.id === "templateEditorImageInput") {
    insertTemplateImage(event.target.files?.[0]);
    event.target.value = "";
    return;
  }

  if (event.target.id === "examineeDetailPhotoInput") {
    const selectedPhotoFile = event.target.files?.[0];
    event.target.value = "";

    if (selectedPhotoFile) {
      await uploadExamineeDetailPhoto(selectedPhotoFile);
    }

    return;
  }

  if (event.target.id === "templateEditorBlockType") {
    applyTemplateEditorCommand("formatBlock", event.target.value || "p");
    return;
  }

  if (event.target.id === "templateEditorFontFamily") {
    applyTemplateEditorFontFamily(event.target.value);
    return;
  }

  if (event.target.id === "templateEditorFontSize") {
    applyTemplateEditorFontSize(event.target.value);
    return;
  }

  if (toolbarColorInput) {
    applyEditorToolbarColorTrigger(toolbarColorInput);
    closeAllEditorToolbarColorPanels();
    return;
  }

  if (examineeDetailField?.dataset.examineeDetailField) {
    updateExamineeDetailField(examineeDetailField.dataset.examineeDetailField, event.target.value);
    return;
  }

  if (gridSelectAllTrigger) {
    toggleGridSelectAll(gridSelectAllTrigger.dataset.gridKey);
    rerenderGridInteraction(gridSelectAllTrigger.dataset.gridKey);
    return;
  }

  if (gridSelectRowTrigger) {
    toggleGridRowSelection(gridSelectRowTrigger.dataset.gridKey, gridSelectRowTrigger.dataset.gridSelectRow);
    rerenderGridInteraction(gridSelectRowTrigger.dataset.gridKey);
    return;
  }

  if (filterSelectAllTrigger) {
    const gridKey = filterSelectAllTrigger.dataset.gridKey || "";
    const columnKey = filterSelectAllTrigger.dataset.gridFilterSelectAll || "";
    const optionValues = getGridFilterOptionValues(gridKey, columnKey);
    const visibleOptions = filterGridFilterOptionValues(optionValues, getTableState(gridKey).filterMenuSearch);
    const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
    const selectedValueSet = new Set(selectionState.selectedValues);

    visibleOptions.forEach((value) => {
      if (filterSelectAllTrigger.checked) {
        selectedValueSet.add(value);
      } else {
        selectedValueSet.delete(value);
      }
    });

    setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
    rerenderGridInteraction(gridKey);
    return;
  }

  if (filterOptionInput) {
    const gridKey = filterOptionInput.dataset.gridKey || "";
    const columnKey = filterOptionInput.dataset.gridFilterOptionInput || "";
    const optionValues = getGridFilterOptionValues(gridKey, columnKey);
    const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
    const selectedValueSet = new Set(selectionState.selectedValues);
    const optionValue = filterOptionInput.dataset.gridFilterValue || "";

    if (filterOptionInput.checked) {
      selectedValueSet.add(optionValue);
    } else {
      selectedValueSet.delete(optionValue);
    }

    setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
    rerenderGridInteraction(gridKey);
    return;
  }

  if (accountField?.dataset.accountField === "role") {
    updateAccountEditorField("draftRole", event.target.value);
    return;
  }

  if (event.target.id === "accountCreateRole") {
    setAccountCreateError("");
    return;
  }

  if (event.target.id === "loginNoticeFontSize") {
    if (!event.target.value) {
      return;
    }

    applyLoginNoticeEditorCommand("fontSizePx", event.target.value);
    return;
  }

  if (noticeCommandSelect) {
    if (!noticeCommandSelect.value) {
      return;
    }

    applyLoginNoticeEditorCommand(noticeCommandSelect.dataset.noticeCommand, noticeCommandSelect.value);
    return;
  }

  if (lookupSelectField) {
    state.lookupFilters[lookupSelectField.key] = event.target.value;
    reconcileLookupFilters();
    getTableState("admitCardLookupGrid").page = 1;
    rerenderLookupViewInteraction();
    return;
  }

  if (headerFilterField) {
    state.headerFilters[headerFilterField.key] = event.target.value;
    reconcileHeaderFilters();
    reconcileLookupFilters();
    persistHeaderFilters();
    resetGridPages();
    renderView();
    return;
  }
});

document.addEventListener("compositionstart", (event) => {
  if (lookupTextFields.some((field) => field.id === event.target.id)) {
    state.composingInputId = event.target.id;
  }
});

document.addEventListener("compositionend", (event) => {
  const textField = lookupTextFields.find((field) => field.id === event.target.id);

  if (!textField) {
    return;
  }

  state.composingInputId = "";
  updateLookupTextFilter(textField.key, event.target.value);
  refreshAdmitCardLookupGrid();
});

document.addEventListener("input", (event) => {
  const accountField = event.target.closest("[data-account-field]");
  const examineeDetailField = event.target.closest("[data-examinee-detail-field]");
  const loginNoticeEditor = getLoginNoticeEditorElement?.();
  const gridFilterSearchInput = event.target.matches("[data-grid-filter-search-input]") ? event.target : null;
  const toolbarColorInput = event.target.matches(".template-toolbar-color") ? event.target : null;

  if (loginNoticeEditor && (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target))) {
    captureLoginNoticeEditorSelection();
    syncLoginNoticeEditorDraft();
    return;
  }

  if (gridFilterSearchInput) {
    const gridKey = gridFilterSearchInput.dataset.gridKey || "";
    const tableState = getTableState(gridKey);

    tableState.filterMenuSearch = gridFilterSearchInput.value;
    refreshGridFilterMenu(gridFilterSearchInput.closest(".table-filter-menu"));
    return;
  }

  if (toolbarColorInput) {
    applyEditorToolbarColorTrigger(toolbarColorInput);
    return;
  }

  if (event.target.matches('input[data-notice-command="foreColor"], input[data-notice-command="hiliteColor"]')) {
    applyLoginNoticeEditorCommand(event.target.dataset.noticeCommand, event.target.value);
    return;
  }

  if (event.target.id === "templateEditorFontSize") {
    syncEditorToolbarFontSizeMenuSelection(event.target, event.target.value);
    return;
  }

  if (event.target.id === "loginNoticeFontSize") {
    syncEditorToolbarFontSizeMenuSelection(event.target, event.target.value);
    return;
  }

  if (event.target.id === "loginAccountId") {
    state.auth.loginForm.id = event.target.value;
    if (state.auth.error) {
      state.auth.error = "";
      syncLoginErrorMessage();
    }
    return;
  }

  if (event.target.id === "loginPassword") {
    state.auth.loginForm.password = event.target.value;
    if (state.auth.error) {
      state.auth.error = "";
      syncLoginErrorMessage();
    }
    return;
  }

  if (event.target.id === "passwordSetupNext") {
    state.auth.passwordSetup.password = event.target.value;
    if (state.auth.passwordSetup.error) {
      state.auth.passwordSetup.error = "";
      syncPasswordSetupModal();
    }
    return;
  }

  if (event.target.id === "passwordSetupConfirm") {
    state.auth.passwordSetup.passwordConfirm = event.target.value;
    if (state.auth.passwordSetup.error) {
      state.auth.passwordSetup.error = "";
      syncPasswordSetupModal();
    }
    return;
  }

  if (event.target.id === "systemSettingsInitialPassword") {
    state.systemSettings.initialPassword = event.target.value;
    if (state.systemSettings.statusMessage) {
      setSystemSettingsStatus("");
    }
    return;
  }

  if (event.target.id === "systemSettingsAutoLogoutMinutes") {
    state.systemSettings.autoLogoutMinutes = event.target.value;
    if (state.systemSettings.statusMessage) {
      setSystemSettingsStatus("");
    }
    return;
  }

  if (event.target.id === "accountCreateId" || event.target.id === "accountCreateName") {
    setAccountCreateError("");
    return;
  }

  if (event.target.id === "templateEditorSurface") {
    syncTemplateEditorContent();
    return;
  }

  if (event.target.matches("[data-template-card-input]")) {
    updateTemplateCardMetaEditorDraft(event.target.dataset.templateCardInput, event.target.dataset.templateCardField, event.target.value);
    return;
  }

  if (examineeDetailField?.dataset.examineeDetailField) {
    updateExamineeDetailField(examineeDetailField.dataset.examineeDetailField, event.target.value);
    return;
  }

  if (accountField?.dataset.accountField === "name") {
    updateAccountEditorField("draftName", event.target.value);
    return;
  }

  const textField = lookupTextFields.find((field) => field.id === event.target.id);

  if (!textField || state.composingInputId === event.target.id) {
    return;
  }

  updateLookupTextFilter(textField.key, event.target.value);
  refreshAdmitCardLookupGrid();
});

document.addEventListener("selectionchange", () => {
  captureLoginNoticeEditorSelection();
  updateLoginNoticeEditorActiveCell();
  updateLoginNoticeFormattingControls();
  saveTemplateEditorSelection();
  updateTemplateEditorActiveCell();
  updateTemplateEditorFormattingControls();
  updateTemplateTableControls();
});

document.addEventListener("paste", (event) => {
  const loginNoticeEditor = getLoginNoticeEditorElement?.();

  if (loginNoticeEditor && (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target))) {
    window.setTimeout(() => {
      captureLoginNoticeEditorSelection();
      syncLoginNoticeEditorDraft();
    }, 0);
    return;
  }

  if (event.target.id === "templateEditorSurface") {
    window.setTimeout(() => {
      syncTemplateEditorContent();
    }, 0);
  }
});

document.addEventListener("touchstart", () => {
  recordAutoLogoutActivity();
}, { passive: true });

loadAuthSession();

