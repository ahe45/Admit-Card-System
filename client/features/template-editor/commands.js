(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorCommands = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorCommandController({
    buildTemplateEditorTableMarkup,
    buildTemplateGeneratedObjectMarkup,
    buildTemplateTokenHtml,
    escapeAttribute,
    getTemplateEditorSurface,
    getTemplateEditorTableColumnsInput,
    getTemplateEditorTableInsertPanel,
    getTemplateEditorTableRowsInput,
    getTemplatePreviewExaminee,
    placeCaretAtEnd,
    restoreTemplateEditorSelection,
    setEditorToolbarTableInsertPanelVisibility,
    setTemplateEditorStatus,
    state,
    syncTemplateEditorContent,
  }) {
    function setTemplateEditorTableInsertPanelVisibility(isVisible) {
      const templateEditorTableInsertPanel = getTemplateEditorTableInsertPanel();

      if (typeof setEditorToolbarTableInsertPanelVisibility === "function") {
        setEditorToolbarTableInsertPanelVisibility("templateEditorTableInsertPanel", Boolean(isVisible));
        return;
      }

      templateEditorTableInsertPanel?.classList.toggle("hidden", !isVisible);
    }

    function getTemplateEditorTableInsertConfig() {
      const templateEditorTableRows = getTemplateEditorTableRowsInput();
      const templateEditorTableColumns = getTemplateEditorTableColumnsInput();
      const rowCount = Math.round(Number(templateEditorTableRows?.value || 0));
      const columnCount = Math.round(Number(templateEditorTableColumns?.value || 0));

      if (!Number.isFinite(rowCount) || rowCount < 1 || rowCount > 20) {
        setTemplateEditorStatus("표 행 수는 1개 이상 20개 이하로 입력하세요.", "warning");
        templateEditorTableRows?.focus();
        return null;
      }

      if (!Number.isFinite(columnCount) || columnCount < 1 || columnCount > 8) {
        setTemplateEditorStatus("표 열 수는 1개 이상 8개 이하로 입력하세요.", "warning");
        templateEditorTableColumns?.focus();
        return null;
      }

      return {
        rowCount,
        columnCount,
      };
    }

    function insertTemplateHtml(html) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      restoreTemplateEditorSelection();
      const selection = window.getSelection();
      const activeRange =
        selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : state.templateEditor.savedRange?.cloneRange();

      if (!activeRange) {
        placeCaretAtEnd(templateEditorSurface);
        return;
      }

      const markup = String(html || "").trim();
      const fragment = activeRange.createContextualFragment(markup);
      const lastInsertedNode = fragment.lastChild;

      activeRange.deleteContents();
      activeRange.insertNode(fragment);

      if (selection) {
        const nextRange = document.createRange();

        if (lastInsertedNode) {
          nextRange.setStartAfter(lastInsertedNode);
        } else {
          nextRange.selectNodeContents(templateEditorSurface);
          nextRange.collapse(false);
        }

        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        state.templateEditor.savedRange = nextRange.cloneRange();
      }

      syncTemplateEditorContent();
    }

    function insertTemplateTag(tag) {
      if (!tag) {
        return;
      }

      insertTemplateHtml(buildTemplateTokenHtml(tag));
    }

    function insertTemplateImage(file) {
      if (!file) {
        return;
      }

      const fileReader = new FileReader();

      fileReader.addEventListener("load", () => {
        insertTemplateHtml(`<img src="${fileReader.result}" alt="${escapeAttribute(file.name)}" />`);
      });

      fileReader.readAsDataURL(file);
    }

    function handleTemplateEditorInsert(insertType) {
      const templateEditorTableInsertPanel = getTemplateEditorTableInsertPanel();
      const templateEditorTableRows = getTemplateEditorTableRowsInput();

      if (insertType === "table") {
        const shouldOpen = templateEditorTableInsertPanel?.classList.contains("hidden") ?? true;
        setTemplateEditorTableInsertPanelVisibility(shouldOpen);

        if (shouldOpen) {
          templateEditorTableRows?.focus();
          templateEditorTableRows?.select();
        }
        return;
      }

      if (insertType === "table-confirm") {
        const tableInsertConfig = getTemplateEditorTableInsertConfig();

        if (!tableInsertConfig) {
          return;
        }

        window.setTimeout(() => {
          insertTemplateHtml(buildTemplateEditorTableMarkup(tableInsertConfig.rowCount, tableInsertConfig.columnCount));
          setTemplateEditorTableInsertPanelVisibility(false);
        }, 0);
        return;
      }

      if (insertType === "rule") {
        insertTemplateHtml("<hr /><p></p>");
        setTemplateEditorTableInsertPanelVisibility(false);
        return;
      }

      if (insertType === "barcode" || insertType === "qrcode") {
        insertTemplateHtml(buildTemplateGeneratedObjectMarkup(insertType, { getPreviewExaminee: getTemplatePreviewExaminee }));
        setTemplateEditorTableInsertPanelVisibility(false);
      }
    }

    return Object.freeze({
      getTemplateEditorTableInsertConfig,
      handleTemplateEditorInsert,
      insertTemplateHtml,
      insertTemplateImage,
      insertTemplateTag,
      setTemplateEditorTableInsertPanelVisibility,
    });
  }

  return Object.freeze({
    createTemplateEditorCommandController,
  });
});
