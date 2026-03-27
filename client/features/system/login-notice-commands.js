(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      loginNoticeTableActionModule: require("./login-notice-table-actions"),
      toolbarControlsModule: require("../editor/toolbar-controls"),
    });
    return;
  }

  globalScope.AdmitCardLoginNoticeCommands = factory({
    loginNoticeTableActionModule: globalScope.AdmitCardLoginNoticeTableActions,
    toolbarControlsModule: globalScope.AdmitCardEditorToolbarControls,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({ loginNoticeTableActionModule, toolbarControlsModule }) => {
  if (!toolbarControlsModule) {
    throw new Error("client/features/editor/toolbar-controls.js must be loaded before login-notice-commands.js.");
  }

  if (!loginNoticeTableActionModule?.createLoginNoticeTableActionController) {
    throw new Error("client/features/system/login-notice-table-actions.js must be loaded before login-notice-commands.js.");
  }

  const {
    getEditorToolbarCellSplitConfig,
    getEditorToolbarTableInsertConfig,
    setEditorToolbarManagedPanelVisibility,
  } = toolbarControlsModule;
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
    getLoginNoticeCellSplitCountElement,
    getLoginNoticeCellSplitPanel,
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
    function getActiveNoticeScope() {
      return state.noticeManagement?.activeScope === "applicant" ? "applicant" : "login";
    }

    function getActiveNoticeScopeLabel() {
      return getActiveNoticeScope() === "applicant" ? "접수화면" : "로그인화면";
    }

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
    const { handleLoginNoticeTableAction } = loginNoticeTableActionController;

    function setLoginNoticeTableInsertPanelVisibility(isVisible) {
      setEditorToolbarManagedPanelVisibility({
        panelId: "loginNoticeTableInsertPanel",
        isVisible,
        getPanelElement: getLoginNoticeTableInsertPanel,
        setEditorToolbarTableInsertPanelVisibility,
      });
    }

    function setLoginNoticeCellSplitPanelVisibility(isVisible) {
      setEditorToolbarManagedPanelVisibility({
        panelId: "loginNoticeCellSplitPanel",
        isVisible,
        getPanelElement: getLoginNoticeCellSplitPanel,
        setEditorToolbarTableInsertPanelVisibility,
      });
    }

    function getLoginNoticeTableInsertConfig() {
      return getEditorToolbarTableInsertConfig({
        rowInputElement: getLoginNoticeTableRowsElement(),
        columnInputElement: getLoginNoticeTableColumnsElement(),
        setStatus: setLoginNoticeEditorStatus,
      });
    }

    function getLoginNoticeCellSplitConfig() {
      return getEditorToolbarCellSplitConfig({
        countInputElement: getLoginNoticeCellSplitCountElement(),
        axisName: "loginNoticeCellSplitAxis",
        axisFallbackId: "loginNoticeCellSplitAxisColumn",
        setStatus: setLoginNoticeEditorStatus,
      });
    }

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
      const activeScope = getActiveNoticeScope();
      const activeScopeLabel = getActiveNoticeScopeLabel();

      try {
        const payload = await apiRequest("/api/login-notice", {
          method: "PUT",
          body: JSON.stringify({
            scope: activeScope,
            html: state.loginNotice.draftHtml,
          }),
        });

        applyLoginNoticePayload(payload.html || payload.loginNoticeHtml || payload.applicantNoticeHtml || state.loginNotice.draftHtml, {
          scope: activeScope,
        });
        renderView();
        showToast(`${activeScopeLabel} 공지사항을 저장했습니다.`);
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
      getLoginNoticeCellSplitConfig,
      handleLoginNoticeAction,
      handleLoginNoticeInsert,
      handleLoginNoticeTableAction,
      insertLoginNoticeImage,
      saveLoginNoticeContent,
      setLoginNoticeCellSplitPanelVisibility,
      setLoginNoticeTableInsertPanelVisibility,
    });
  }

  return Object.freeze({
    createLoginNoticeCommandController,
  });
});
