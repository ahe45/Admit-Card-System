(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      editorTableUtilsModule: require("../editor/table-utils"),
      templateTableActionModule: require("../template-editor/table-actions"),
    });
    return;
  }

  globalScope.AdmitCardLoginNoticeTableActions = factory({
    editorTableUtilsModule: globalScope.AdmitCardEditorTableUtils,
    templateTableActionModule: globalScope.AdmitCardTemplateEditorTableActions,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({
  editorTableUtilsModule,
  templateTableActionModule,
}) => {
  if (!editorTableUtilsModule?.TEMPLATE_EDITOR_TABLE_MIN_SIZE || !editorTableUtilsModule?.parseTemplateEditorPixelStyle) {
    throw new Error("client/features/editor/table-utils.js must be loaded before login-notice-table-actions.js.");
  }

  if (!templateTableActionModule?.createTemplateEditorTableActionController) {
    throw new Error("client/features/template-editor/table-actions.js must be loaded before login-notice-table-actions.js.");
  }

  const {
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    parseTemplateEditorPixelStyle,
  } = editorTableUtilsModule;
  const { createTemplateEditorTableActionController } = templateTableActionModule;

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
    getTemplateEditorMedianValue,
    getTemplateEditorTableLogicalColumnWidth,
    getTemplateEditorTableLogicalRowHeight,
    insertTemplateCellAtAbsoluteColumn,
    isTemplateTableCellEmpty,
    normalizeTemplateEditorColorValue,
    normalizeTemplateEditorTableAppearance,
    restoreLoginNoticeEditorSelection,
    setLoginNoticeEditorStatus,
    setTemplateEditorTableLogicalRowHeight,
    syncLoginNoticeEditorDraft,
    syncTemplateEditorTableWidth,
  }) {
    function getLoginNoticeActiveTableSelection() {
      const anchorCell = getLoginNoticeSelectedCell();
      const table = anchorCell?.closest("table");
      const selectedCells = Array.from(new Set(getLoginNoticeSelectedCells().filter(Boolean)));

      if (!anchorCell || !table || selectedCells.length === 0) {
        return null;
      }

      const { entries } = buildTemplateTableCellMap(table);
      const selectedEntries = selectedCells.map((cell) => entries.get(cell)).filter(Boolean);

      if (selectedEntries.length === 0) {
        return null;
      }

      return Object.freeze({
        anchorCell,
        endColIndex: Math.max(...selectedEntries.map((entry) => entry.colIndex + entry.colSpan - 1)),
        endRowIndex: Math.max(...selectedEntries.map((entry) => entry.rowIndex + entry.rowSpan - 1)),
        selectedCells,
        startColIndex: Math.min(...selectedEntries.map((entry) => entry.colIndex)),
        startRowIndex: Math.min(...selectedEntries.map((entry) => entry.rowIndex)),
        table,
      });
    }

    function getLoginNoticeTableMaxWidth(table) {
      const noticeEditor = getLoginNoticeEditorElement();
      const documentElement = table?.closest(".login-notice-editor-surface") || noticeEditor;

      if (!documentElement) {
        return Number.MAX_SAFE_INTEGER;
      }

      const elementWidth = Math.floor(documentElement.clientWidth);

      if (elementWidth > 0) {
        return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, elementWidth);
      }

      return Number.MAX_SAFE_INTEGER;
    }

    function getLoginNoticeClampedColumnGroupWidth(table, columns, columnIndexes, requestedTotalWidth) {
      const normalizedIndexes = Array.from(
        new Set((columnIndexes || []).filter((index) => Number.isInteger(index) && index >= 0)),
      ).sort((leftIndex, rightIndex) => leftIndex - rightIndex);

      if (normalizedIndexes.length === 0) {
        return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(requestedTotalWidth));
      }

      const minTotalWidth = TEMPLATE_EDITOR_TABLE_MIN_SIZE * normalizedIndexes.length;
      const safeRequestedWidth = Math.max(minTotalWidth, Math.round(requestedTotalWidth));
      const currentWidths = columns.map((columnElement) =>
        Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, parseTemplateEditorPixelStyle(columnElement.style.width, TEMPLATE_EDITOR_TABLE_MIN_SIZE)),
      );
      const currentTableWidth = currentWidths.reduce((widthSum, columnWidth) => widthSum + columnWidth, 0);
      const currentTargetWidth = normalizedIndexes.reduce(
        (widthSum, columnIndex) => widthSum + (currentWidths[columnIndex] || TEMPLATE_EDITOR_TABLE_MIN_SIZE),
        0,
      );
      const tableMaxWidth = getLoginNoticeTableMaxWidth(table);

      if (safeRequestedWidth <= currentTargetWidth) {
        return safeRequestedWidth;
      }

      const maxExpandableWidth =
        currentTableWidth > tableMaxWidth ? currentTargetWidth : currentTargetWidth + Math.max(0, tableMaxWidth - currentTableWidth);

      return Math.min(safeRequestedWidth, Math.max(minTotalWidth, maxExpandableWidth));
    }

    function setLoginNoticeTableLogicalColumnWidth(table, columnIndex, width) {
      const { columns } = ensureTemplateEditorTableColGroup(table);
      const columnElement = columns[columnIndex];

      if (!columnElement) {
        return false;
      }

      const safeWidth = getLoginNoticeClampedColumnGroupWidth(table, columns, [columnIndex], width);
      columnElement.style.width = `${safeWidth}px`;
      syncTemplateEditorTableWidth(table, columns);
      return true;
    }

    const templateTableActionController = createTemplateEditorTableActionController({
      TEMPLATE_EDITOR_TABLE_MIN_SIZE,
      buildTemplateTableCellMap,
      createTemplateTableCell,
      ensureTemplateEditorTableColGroup,
      focusTemplateEditorCell: focusLoginNoticeEditorCell,
      getTemplateEditorActiveTableSelection: getLoginNoticeActiveTableSelection,
      getTemplateEditorCellShadingInput: getLoginNoticeCellShadingElement,
      getTemplateEditorCellWidthInput: () => null,
      getTemplateEditorClampedColumnGroupWidth: getLoginNoticeClampedColumnGroupWidth,
      getTemplateEditorRowHeightInput: () => null,
      getTemplateEditorSelectedCell: getLoginNoticeSelectedCell,
      getTemplateEditorSizeScopeInput: () => ({ value: "cell" }),
      getTemplateEditorTableLogicalColumnWidth,
      getTemplateEditorTableLogicalRowHeight,
      normalizeTemplateEditorColorValue,
      normalizeTemplateEditorTableAppearance,
      restoreTemplateEditorSelection: restoreLoginNoticeEditorSelection,
      setTemplateEditorStatus: setLoginNoticeEditorStatus,
      setTemplateEditorTableLogicalColumnWidth: setLoginNoticeTableLogicalColumnWidth,
      setTemplateEditorTableLogicalRowHeight,
      syncTemplateEditorContent: syncLoginNoticeEditorDraft,
      updateTemplateTableControls: () => {},
    });

    function handleLoginNoticeTableAction(action, options = {}) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return false;
      }

      noticeEditor.focus();
      return templateTableActionController.handleTemplateTableAction(action, options);
    }

    return Object.freeze({
      getTemplateEditorMedianValue:
        typeof getTemplateEditorMedianValue === "function"
          ? (...args) => getTemplateEditorMedianValue(...args)
          : undefined,
      handleLoginNoticeTableAction,
    });
  }

  return Object.freeze({
    createLoginNoticeTableActionController,
  });
});
