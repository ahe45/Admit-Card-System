(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      toolbarControlsModule: require("../editor/toolbar-controls"),
    });
    return;
  }

  globalScope.AdmitCardTemplateEditorCommands = factory({
    toolbarControlsModule: globalScope.AdmitCardEditorToolbarControls,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({ toolbarControlsModule }) => {
  if (!toolbarControlsModule) {
    throw new Error("client/features/editor/toolbar-controls.js must be loaded before commands.js.");
  }

  const {
    getEditorToolbarCellSplitConfig,
    getEditorToolbarTableInsertConfig,
    setEditorToolbarManagedPanelVisibility,
  } = toolbarControlsModule;

  function createTemplateEditorCommandController({
    buildTemplateEditorTableMarkup,
    buildTemplateGeneratedObjectMarkup,
    buildTemplateTokenHtml,
    escapeAttribute,
    getTemplateEditorCellSplitCountInput,
    getTemplateEditorCellSplitPanel,
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
      setEditorToolbarManagedPanelVisibility({
        panelId: "templateEditorTableInsertPanel",
        isVisible,
        getPanelElement: getTemplateEditorTableInsertPanel,
        setEditorToolbarTableInsertPanelVisibility,
      });
    }

    function setTemplateEditorCellSplitPanelVisibility(isVisible) {
      setEditorToolbarManagedPanelVisibility({
        panelId: "templateEditorCellSplitPanel",
        isVisible,
        getPanelElement: getTemplateEditorCellSplitPanel,
        setEditorToolbarTableInsertPanelVisibility,
      });
    }

    function getTemplateEditorTableInsertConfig() {
      return getEditorToolbarTableInsertConfig({
        rowInputElement: getTemplateEditorTableRowsInput(),
        columnInputElement: getTemplateEditorTableColumnsInput(),
        setStatus: setTemplateEditorStatus,
      });
    }

    function getTemplateEditorCellSplitConfig() {
      return getEditorToolbarCellSplitConfig({
        countInputElement: getTemplateEditorCellSplitCountInput(),
        axisName: "templateEditorCellSplitAxis",
        axisFallbackId: "templateEditorCellSplitAxisColumn",
        setStatus: setTemplateEditorStatus,
      });
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
      getTemplateEditorCellSplitConfig,
      getTemplateEditorTableInsertConfig,
      handleTemplateEditorInsert,
      insertTemplateHtml,
      insertTemplateImage,
      insertTemplateTag,
      setTemplateEditorCellSplitPanelVisibility,
      setTemplateEditorTableInsertPanelVisibility,
    });
  }

  return Object.freeze({
    createTemplateEditorCommandController,
  });
});
