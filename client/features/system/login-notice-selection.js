(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeSelection = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const loginNoticeSelectionHistoryModule = globalThis.AdmitCardLoginNoticeSelectionHistory;
  const loginNoticeSelectionRangeModule = globalThis.AdmitCardLoginNoticeSelectionRange;

  if (!loginNoticeSelectionHistoryModule?.createLoginNoticeSelectionHistoryController) {
    throw new Error("client/features/system/login-notice-selection-history.js must be loaded before client/features/system/login-notice-selection.js.");
  }

  if (!loginNoticeSelectionRangeModule?.createLoginNoticeSelectionRangeController) {
    throw new Error("client/features/system/login-notice-selection-range.js must be loaded before client/features/system/login-notice-selection.js.");
  }

  const { createLoginNoticeSelectionHistoryController } = loginNoticeSelectionHistoryModule;
  const { createLoginNoticeSelectionRangeController } = loginNoticeSelectionRangeModule;

  function createLoginNoticeSelectionController({
    LOGIN_NOTICE_EDITOR_HISTORY_LIMIT,
    TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND,
    decorateTemplateGeneratedObjectImage,
    getLoginNoticeCellShadingElement,
    getLoginNoticeDefaultFontFamily,
    getLoginNoticeDefaultFontSize,
    getLoginNoticeEditorElement,
    getLoginNoticeEditorEmptyMarkup,
    getLoginNoticeFontFamilyElement,
    getLoginNoticeFontSizeElement,
    getLoginNoticeMarkup,
    getLoginNoticePreviewElement,
    getLoginNoticeTextColorElement,
    getLoginNoticeTextShadingElement,
    getTemplateGeneratedObjectPreviewExamineeProvider,
    isLoginNoticeMeaningfulHtml,
    normalizeTemplateEditorFontNodes,
    normalizeTemplateEditorTables,
    state,
    stripTemplateEditorTransientState,
    syncEditorToolbarColorControls,
    updateEditorToolbarFormattingState,
  }) {
    function syncLoginNoticeTableVerticalAlignButtons(selectedCell, noticeEditor) {
      if (!noticeEditor) {
        return;
      }

      const activeValue = selectedCell
        ? (() => {
            const computedValue = String(selectedCell.style.verticalAlign || window.getComputedStyle(selectedCell).verticalAlign || "")
              .trim()
              .toLowerCase();
            return computedValue === "bottom" ? "bottom" : computedValue === "middle" ? "middle" : "top";
          })()
        : "";

      noticeEditor
        .querySelectorAll("[data-notice-table-action^='cell-vertical-align-']")
        .forEach((buttonElement) => {
          const buttonValue = String(buttonElement.dataset.noticeTableAction || "").replace("cell-vertical-align-", "");
          const isActive = activeValue !== "" && buttonValue === activeValue;

          buttonElement.classList.toggle("is-active", isActive);
          buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function buildLoginNoticeEditorMarkup(rawHtml) {
      const container = document.createElement("div");

      container.innerHTML = String(rawHtml || "").trim() || getLoginNoticeEditorEmptyMarkup();
      stripTemplateEditorTransientState(container);
      normalizeTemplateEditorFontNodes(container);
      normalizeTemplateEditorTables(container);
      return container.innerHTML;
    }

    const loginNoticeSelectionRangeController = createLoginNoticeSelectionRangeController({
      getLoginNoticeEditorElement,
      getLoginNoticeEditorEmptyMarkup,
      state,
      updateLoginNoticeEditorActiveCell: (...args) => updateLoginNoticeEditorActiveCell(...args),
      updateLoginNoticeFormattingControls: (...args) => updateLoginNoticeFormattingControls(...args),
    });
    const {
      captureLoginNoticeEditorSelection,
      createLoginNoticeSelectionSnapshot,
      focusLoginNoticeEditorCell,
      getClosestLoginNoticeElement,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getLoginNoticeSelectionNode,
      placeCaretAtEndOfLoginNoticeEditor,
      restoreLoginNoticeEditorSelection,
      restoreLoginNoticeSelectionSnapshot,
    } = loginNoticeSelectionRangeController;

    function clearLoginNoticeEditorActiveCell() {
      getLoginNoticeEditorElement()
        ?.querySelectorAll(".is-active-cell")
        .forEach((cell) => cell.classList.remove("is-active-cell"));
    }

    function updateLoginNoticeEditorActiveCell() {
      clearLoginNoticeEditorActiveCell();

      const activeCell = getLoginNoticeSelectedCell();

      if (activeCell) {
        activeCell.classList.add("is-active-cell");
      }
    }

    function updateLoginNoticeFormattingControls() {
      const noticeEditor = getLoginNoticeEditorElement();
      const fontFamilyElement = getLoginNoticeFontFamilyElement();
      const fontSizeElement = getLoginNoticeFontSizeElement();
      const textColorElement = getLoginNoticeTextColorElement();
      const textShadingElement = getLoginNoticeTextShadingElement();
      const cellShadingElement = getLoginNoticeCellShadingElement();

      if (
        !noticeEditor ||
        state.currentView !== "loginNoticeSettings" ||
        document.activeElement === fontFamilyElement ||
        document.activeElement === fontSizeElement ||
        document.activeElement === textColorElement ||
        document.activeElement === cellShadingElement ||
        document.activeElement === textShadingElement
      ) {
        return;
      }

      const selectionNode = getLoginNoticeSelectionNode();
      const contextElement = getLoginNoticeSelectedCell();

      updateEditorToolbarFormattingState({
        rootElement: noticeEditor,
        commandAttributeName: "data-notice-command",
        fontFamilyElement,
        fontSizeElement,
        textColorElement,
        textShadingElement,
        selectionNode,
        contextElement,
        defaultFontFamily: getLoginNoticeDefaultFontFamily(),
        defaultFontSize: getLoginNoticeDefaultFontSize(),
      });

      if (cellShadingElement) {
        const selectedCell = getLoginNoticeSelectedCell();
        const fallbackValue =
          selectedCell?.tagName === "TH" && typeof TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND === "string"
            ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND
            : "#ffffff";

        syncEditorToolbarColorControls({
          colorInputElement: cellShadingElement,
          colorValue: selectedCell?.style.backgroundColor || window.getComputedStyle(selectedCell || noticeEditor).backgroundColor,
          fallbackValue,
        });
      }

      syncLoginNoticeTableVerticalAlignButtons(getLoginNoticeSelectedCell(), noticeEditor);
    }

    function getLoginNoticeSerializedHtml() {
      const documentElement = getLoginNoticeEditorElement();

      if (!documentElement) {
        return state.loginNotice.draftHtml;
      }

      const clone = documentElement.cloneNode(true);

      stripTemplateEditorTransientState(clone);
      normalizeTemplateEditorFontNodes(clone);
      normalizeTemplateEditorTables(clone);

      const html = clone.innerHTML.trim();
      return isLoginNoticeMeaningfulHtml(html) ? html : "";
    }

    function setLoginNoticeEditorStatus(message, type = "") {
      state.loginNotice.statusMessage = message;
      state.loginNotice.statusType = type;
    }

    const loginNoticeSelectionHistoryController = createLoginNoticeSelectionHistoryController({
      LOGIN_NOTICE_EDITOR_HISTORY_LIMIT,
      buildLoginNoticeEditorMarkup,
      createLoginNoticeSelectionSnapshot,
      decorateTemplateGeneratedObjectImage,
      getLoginNoticeEditorElement,
      getLoginNoticeEditorEmptyMarkup,
      getLoginNoticeMarkup,
      getLoginNoticePreviewElement,
      getTemplateGeneratedObjectPreviewExamineeProvider,
      getLoginNoticeSerializedHtml,
      normalizeTemplateEditorFontNodes,
      normalizeTemplateEditorTables,
      placeCaretAtEndOfLoginNoticeEditor,
      restoreLoginNoticeSelectionSnapshot,
      setLoginNoticeEditorStatus,
      state,
      updateLoginNoticeEditorActiveCell,
      updateLoginNoticeFormattingControls,
    });
    const {
      redoLoginNoticeEditorHistory,
      syncLoginNoticeEditorDraft,
      undoLoginNoticeEditorHistory,
    } = loginNoticeSelectionHistoryController;

    return Object.freeze({
      buildLoginNoticeEditorMarkup,
      captureLoginNoticeEditorSelection,
      focusLoginNoticeEditorCell,
      getClosestLoginNoticeElement,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getLoginNoticeSelectionNode,
      getLoginNoticeSerializedHtml,
      redoLoginNoticeEditorHistory,
      restoreLoginNoticeEditorSelection,
      setLoginNoticeEditorStatus,
      syncLoginNoticeEditorDraft,
      undoLoginNoticeEditorHistory,
      updateLoginNoticeEditorActiveCell,
      updateLoginNoticeFormattingControls,
    });
  }

  return Object.freeze({
    createLoginNoticeSelectionController,
  });
});
