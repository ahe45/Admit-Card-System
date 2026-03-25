(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeTableActions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const loginNoticeTableFormattingModule = globalThis.AdmitCardLoginNoticeTableFormatting;
  const loginNoticeTableStructureModule = globalThis.AdmitCardLoginNoticeTableStructure;

  if (!loginNoticeTableFormattingModule?.createLoginNoticeTableFormattingController) {
    throw new Error(
      "client/features/system/login-notice-table-formatting.js must be loaded before login-notice-table-actions.js.",
    );
  }

  if (!loginNoticeTableStructureModule?.createLoginNoticeTableStructureController) {
    throw new Error(
      "client/features/system/login-notice-table-structure.js must be loaded before login-notice-table-actions.js.",
    );
  }

  const { createLoginNoticeTableFormattingController } = loginNoticeTableFormattingModule;
  const { createLoginNoticeTableStructureController } = loginNoticeTableStructureModule;

  function createLoginNoticeTableActionController({
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
  }) {
    const loginNoticeTableStructureController = createLoginNoticeTableStructureController({
      appendMergedTemplateCellContent,
      buildTemplateTableCellMap,
      createTemplateTableCell,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getLoginNoticeTableColumnsElement,
      getLoginNoticeTableInsertPanel,
      getLoginNoticeTableRowsElement,
      insertTemplateCellAtAbsoluteColumn,
      isTemplateTableCellEmpty,
      normalizeTemplateEditorTableAppearance,
      setEditorToolbarTableInsertPanelVisibility,
      setLoginNoticeEditorStatus,
    });
    const loginNoticeTableFormattingController = createLoginNoticeTableFormattingController({
      buildTemplateTableCellMap,
      ensureTemplateEditorTableColGroup,
      getLoginNoticeCellShadingElement,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getTemplateEditorMedianValue,
      getTemplateEditorTableLogicalColumnWidth,
      getTemplateEditorTableLogicalRowHeight,
      normalizeTemplateEditorColorValue,
      setLoginNoticeEditorStatus,
      setTemplateEditorTableLogicalRowHeight,
      syncTemplateEditorTableWidth,
    });

    const { getLoginNoticeTableInsertConfig, setLoginNoticeTableInsertPanelVisibility } = loginNoticeTableStructureController;

    function handleLoginNoticeTableAction(action, { colorValue = "" } = {}) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return;
      }

      noticeEditor.focus();
      restoreLoginNoticeEditorSelection();

      let focusCell = null;

      if (action === "insert-row-before") {
        focusCell = loginNoticeTableStructureController.insertLoginNoticeTableRow("before");
      }

      if (action === "insert-row-after") {
        focusCell = loginNoticeTableStructureController.insertLoginNoticeTableRow("after");
      }

      if (action === "insert-column-before") {
        focusCell = loginNoticeTableStructureController.insertLoginNoticeTableColumn("before");
      }

      if (action === "insert-column-after") {
        focusCell = loginNoticeTableStructureController.insertLoginNoticeTableColumn("after");
      }

      if (action === "delete-row") {
        focusCell = loginNoticeTableStructureController.deleteLoginNoticeTableRow();
      }

      if (action === "delete-column") {
        focusCell = loginNoticeTableStructureController.deleteLoginNoticeTableColumn();
      }

      if (action === "merge-selection") {
        focusCell = loginNoticeTableStructureController.mergeLoginNoticeTableSelection();
      }

      if (action === "equalize-column-widths") {
        focusCell = loginNoticeTableFormattingController.equalizeLoginNoticeTableColumnWidths();
      }

      if (action === "equalize-row-heights") {
        focusCell = loginNoticeTableFormattingController.equalizeLoginNoticeTableRowHeights();
      }

      if (action === "apply-cell-shading") {
        focusCell = loginNoticeTableFormattingController.applyLoginNoticeCellShading(colorValue);
      }

      if (!focusCell) {
        return;
      }

      focusLoginNoticeEditorCell(focusCell);
      syncLoginNoticeEditorDraft();
    }

    return Object.freeze({
      getLoginNoticeTableInsertConfig,
      handleLoginNoticeTableAction,
      setLoginNoticeTableInsertPanelVisibility,
    });
  }

  return Object.freeze({
    createLoginNoticeTableActionController,
  });
});
