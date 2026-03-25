(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeCommands = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const loginNoticeTableActionModule = globalThis.AdmitCardLoginNoticeTableActions;

  if (!loginNoticeTableActionModule?.createLoginNoticeTableActionController) {
    throw new Error("client/features/system/login-notice-table-actions.js must be loaded before login-notice-commands.js.");
  }

  const { createLoginNoticeTableActionController } = loginNoticeTableActionModule;

  function createLoginNoticeCommandController({
    apiRequest,
    appendMergedTemplateCellContent,
    applyLoginNoticePayload,
    applySharedEditorCommand,
    buildTemplateEditorTableMarkup,
    buildTemplateGeneratedObjectMarkup,
    buildTemplateTableCellMap,
    createTemplateTableCell,
    defaultTextColor = "#152033",
    ensureTemplateEditorTableColGroup,
    escapeAttribute,
    focusLoginNoticeEditorCell,
    getLoginNoticeCellShadingElement,
    getLoginNoticeDefaultFontFamily,
    getLoginNoticeDefaultFontSize,
    getLoginNoticeEditorElement,
    getLoginNoticeFontFamilyElement,
    getLoginNoticeFontSizeElement,
    getLoginNoticeSelectedCell,
    getLoginNoticeSelectedCells,
    getLoginNoticeTableColumnsElement,
    getLoginNoticeTableInsertPanel,
    getLoginNoticeTableRowsElement,
    getLoginNoticeTextColorElement,
    getLoginNoticeTextShadingElement,
    getTemplateGeneratedObjectPreviewExamineeProvider,
    getTemplateEditorMedianValue,
    getTemplateEditorTableLogicalColumnWidth,
    getTemplateEditorTableLogicalRowHeight,
    handleAuthenticationFailure,
    insertTemplateCellAtAbsoluteColumn,
    isTemplateTableCellEmpty,
    normalizeTemplateEditorColorValue,
    normalizeTemplateEditorTableAppearance,
    normalizeTemplateEditorTables,
    renderView,
    restoreLoginNoticeEditorSelection,
    setEditorToolbarTableInsertPanelVisibility,
    setLoginNoticeEditorStatus,
    setTemplateEditorTableLogicalRowHeight,
    showToast,
    state,
    syncLoginNoticeEditorDraft,
    syncTemplateEditorTableWidth,
    undoLoginNoticeEditorHistory,
    redoLoginNoticeEditorHistory,
  }) {
    const loginNoticeTableActionController = createLoginNoticeTableActionController({
      appendMergedTemplateCellContent,
      buildTemplateTableCellMap,
      createTemplateTableCell,
      ensureTemplateEditorTableColGroup,
      focusLoginNoticeEditorCell,
      getLoginNoticeCellShadingElement,
      getLoginNoticeEditorElement,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getLoginNoticeTableColumnsElement,
      getLoginNoticeTableInsertPanel,
      getLoginNoticeTableRowsElement,
      getTemplateEditorMedianValue,
      getTemplateEditorTableLogicalColumnWidth,
      getTemplateEditorTableLogicalRowHeight,
      insertTemplateCellAtAbsoluteColumn,
      isTemplateTableCellEmpty,
      normalizeTemplateEditorColorValue,
      normalizeTemplateEditorTableAppearance,
      restoreLoginNoticeEditorSelection,
      setEditorToolbarTableInsertPanelVisibility,
      setLoginNoticeEditorStatus,
      setTemplateEditorTableLogicalRowHeight,
      syncLoginNoticeEditorDraft,
      syncTemplateEditorTableWidth,
    });
    const {
      getLoginNoticeTableInsertConfig,
      handleLoginNoticeTableAction,
      setLoginNoticeTableInsertPanelVisibility,
    } = loginNoticeTableActionController;

    function insertLoginNoticeHtml(markup) {
      const noticeEditor = getLoginNoticeEditorElement();
      const documentElement = getLoginNoticeEditorElement();

      if (!noticeEditor || !documentElement) {
        return;
      }

      noticeEditor.focus();
      restoreLoginNoticeEditorSelection();
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("insertHTML", false, markup);

      if (markup.includes("<table")) {
        normalizeTemplateEditorTables(documentElement);
      }

      syncLoginNoticeEditorDraft();
    }

    function insertLoginNoticeImage(file) {
      if (!file) {
        return;
      }

      const fileReader = new FileReader();

      fileReader.addEventListener("load", () => {
        insertLoginNoticeHtml(`<img src="${fileReader.result}" alt="${escapeAttribute(file.name)}" />`);
      });

      fileReader.readAsDataURL(file);
    }

    function applyLoginNoticeEditorCommand(command, value = "") {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return;
      }

      const normalizedValue =
        command === "hiliteColor" && !String(value || "").trim()
          ? getLoginNoticeTextShadingElement()?.value || "#fff59d"
          : command === "foreColor" && !String(value || "").trim()
            ? getLoginNoticeTextColorElement()?.value || defaultTextColor
            : value;

      applySharedEditorCommand({
        rootElement: noticeEditor,
        focusElement: noticeEditor,
        restoreSelection: restoreLoginNoticeEditorSelection,
        syncContent: syncLoginNoticeEditorDraft,
        onUndo: undoLoginNoticeEditorHistory,
        onRedo: redoLoginNoticeEditorHistory,
        command,
        value: normalizedValue,
        enableStyleWithCss: true,
        fontFamilyElement: getLoginNoticeFontFamilyElement(),
        defaultFontFamily: getLoginNoticeDefaultFontFamily(),
        fontSizeElement: getLoginNoticeFontSizeElement(),
        defaultFontSize: getLoginNoticeDefaultFontSize(),
        setStatus: setLoginNoticeEditorStatus,
      });
    }

    async function saveLoginNoticeContent() {
      syncLoginNoticeEditorDraft();

      try {
        const payload = await apiRequest("/api/login-notice", {
          method: "PUT",
          body: JSON.stringify({
            html: state.loginNotice.draftHtml,
          }),
        });

        applyLoginNoticePayload(payload.html || payload.loginNoticeHtml || state.loginNotice.draftHtml);
        renderView();
        showToast("로그인화면 공지사항을 저장했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        setLoginNoticeEditorStatus(error.message, "warning");
      }
    }

    async function handleLoginNoticeAction(action) {
      if (action === "link") {
        const url = window.prompt("링크 주소를 입력하세요.", "https://");

        if (!url) {
          return;
        }

        applyLoginNoticeEditorCommand("createLink", url);
        return;
      }

      if (action === "save") {
        await saveLoginNoticeContent();
      }
    }

    function handleLoginNoticeInsert(insertType) {
      if (insertType === "table") {
        const tableInsertPanel = getLoginNoticeTableInsertPanel();
        const shouldOpen = tableInsertPanel?.classList.contains("hidden") ?? true;

        setLoginNoticeTableInsertPanelVisibility(shouldOpen);
        if (shouldOpen) {
          getLoginNoticeTableRowsElement()?.focus();
          getLoginNoticeTableRowsElement()?.select();
        }
        return;
      }

      if (insertType === "table-confirm") {
        const tableConfig = getLoginNoticeTableInsertConfig();

        if (!tableConfig) {
          return;
        }

        insertLoginNoticeHtml(buildTemplateEditorTableMarkup(tableConfig.rowCount, tableConfig.columnCount));
        setLoginNoticeTableInsertPanelVisibility(false);
        return;
      }

      if (insertType === "barcode" || insertType === "qrcode") {
        insertLoginNoticeHtml(
          buildTemplateGeneratedObjectMarkup(insertType, {
            getPreviewExaminee: getTemplateGeneratedObjectPreviewExamineeProvider(),
          }),
        );
        setLoginNoticeTableInsertPanelVisibility(false);
        return;
      }

      if (insertType === "rule") {
        insertLoginNoticeHtml("<hr /><p></p>");
        setLoginNoticeTableInsertPanelVisibility(false);
      }
    }

    return Object.freeze({
      applyLoginNoticeEditorCommand,
      handleLoginNoticeAction,
      handleLoginNoticeInsert,
      handleLoginNoticeTableAction,
      insertLoginNoticeImage,
      saveLoginNoticeContent,
    });
  }

  return Object.freeze({
    createLoginNoticeCommandController,
  });
});
