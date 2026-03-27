(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableActions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const tableSizingModule = globalThis.AdmitCardTemplateEditorTableSizing;
  const tableStructureModule = globalThis.AdmitCardTemplateEditorTableStructure;

  if (!tableSizingModule?.createTemplateEditorTableSizingController) {
    throw new Error("client/features/template-editor/table-sizing.js must be loaded before table-actions.js.");
  }

  if (!tableStructureModule?.createTemplateEditorTableStructureController) {
    throw new Error("client/features/template-editor/table-structure.js must be loaded before table-actions.js.");
  }

  const { createTemplateEditorTableSizingController } = tableSizingModule;
  const { createTemplateEditorTableStructureController } = tableStructureModule;

  function createTemplateEditorTableActionController({
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    buildTemplateTableCellMap,
    createTemplateTableCell,
    ensureTemplateEditorTableColGroup,
    focusTemplateEditorCell,
    getTemplateEditorClampedColumnGroupWidth,
    getTemplateEditorActiveTableSelection,
    getTemplateEditorCellShadingInput,
    getTemplateEditorCellWidthInput,
    getTemplateEditorRowHeightInput,
    getTemplateEditorSelectedCell,
    getTemplateEditorSizeScopeInput,
    getTemplateEditorTableLogicalColumnWidth,
    getTemplateEditorTableLogicalRowHeight,
    normalizeTemplateEditorColorValue,
    normalizeTemplateEditorTableAppearance,
    restoreTemplateEditorSelection,
    setTemplateEditorStatus,
    setTemplateEditorTableLogicalColumnWidth,
    setTemplateEditorTableLogicalRowHeight,
    syncTemplateEditorContent,
    updateTemplateTableControls,
  }) {
    const tableSizingController = createTemplateEditorTableSizingController({
      TEMPLATE_EDITOR_TABLE_MIN_SIZE,
      buildTemplateTableCellMap,
      ensureTemplateEditorTableColGroup,
      focusTemplateEditorCell,
      getTemplateEditorClampedColumnGroupWidth,
      getTemplateEditorActiveTableSelection,
      getTemplateEditorCellShadingInput,
      getTemplateEditorCellWidthInput,
      getTemplateEditorRowHeightInput,
      getTemplateEditorSelectedCell,
      getTemplateEditorSizeScopeInput,
      getTemplateEditorTableLogicalColumnWidth,
      getTemplateEditorTableLogicalRowHeight,
      normalizeTemplateEditorColorValue,
      restoreTemplateEditorSelection,
      setTemplateEditorStatus,
      setTemplateEditorTableLogicalColumnWidth,
      setTemplateEditorTableLogicalRowHeight,
      syncTemplateEditorContent,
      updateTemplateTableControls,
    });
    const tableStructureController = createTemplateEditorTableStructureController({
      buildTemplateTableCellMap,
      createTemplateTableCell,
      getTemplateEditorActiveTableSelection,
      getTemplateEditorSelectedCell,
      ensureTemplateEditorTableColGroup,
      normalizeTemplateEditorTableAppearance,
      setTemplateEditorStatus,
    });
    const {
      appendMergedTemplateCellContent,
      deleteTemplateTableColumn,
      deleteTemplateTableRow,
      insertTemplateCellAtAbsoluteColumn,
      insertTemplateTableColumn,
      insertTemplateTableRow,
      isTemplateTableCellEmpty,
      mergeTemplateTableCell,
      mergeTemplateTableSelection,
      splitTemplateTableCell,
    } = tableStructureController;
    const {
      applyTemplateEditorCellShading,
      applyTemplateTableSize,
      equalizeTemplateTableColumnWidths,
      equalizeTemplateTableRowHeights,
      getTemplateEditorMedianValue,
    } = tableSizingController;

    function getTemplateEditorTableTargetCells() {
      const tableSelection = getTemplateEditorActiveTableSelection();

      if (tableSelection?.selectedCells?.length) {
        return Array.from(new Set(tableSelection.selectedCells.filter(Boolean)));
      }

      const selectedCell = getTemplateEditorSelectedCell();
      return selectedCell ? [selectedCell] : [];
    }

    function applyTemplateEditorCellVerticalAlign(verticalAlign = "top") {
      const targetCells = getTemplateEditorTableTargetCells();

      if (targetCells.length === 0) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 배치를 설정하세요.", "warning");
        return null;
      }

      const normalizedVerticalAlign = ["top", "middle", "bottom"].includes(String(verticalAlign || "").trim())
        ? String(verticalAlign || "").trim()
        : "top";

      targetCells.forEach((cell) => {
        cell.style.verticalAlign = normalizedVerticalAlign;
      });

      return targetCells[0] || null;
    }

    function handleTemplateTableAction(action, options = {}) {
      const { colorValue = "" } = options;
      restoreTemplateEditorSelection();

      let focusCell = null;

      if (action === "insert-row-before") {
        focusCell = insertTemplateTableRow("before");
      }

      if (action === "insert-row-after") {
        focusCell = insertTemplateTableRow("after");
      }

      if (action === "insert-column-before") {
        focusCell = insertTemplateTableColumn("before");
      }

      if (action === "insert-column-after") {
        focusCell = insertTemplateTableColumn("after");
      }

      if (action === "delete-row") {
        focusCell = deleteTemplateTableRow();
      }

      if (action === "delete-column") {
        focusCell = deleteTemplateTableColumn();
      }

      if (action === "merge-selection") {
        focusCell = mergeTemplateTableSelection();
      }

      if (action === "equalize-column-widths") {
        focusCell = equalizeTemplateTableColumnWidths();
      }

      if (action === "equalize-row-heights") {
        focusCell = equalizeTemplateTableRowHeights();
      }

      if (action === "apply-cell-shading") {
        applyTemplateEditorCellShading(colorValue);
        return true;
      }

      if (action === "cell-vertical-align-top") {
        focusCell = applyTemplateEditorCellVerticalAlign("top");
      }

      if (action === "cell-vertical-align-middle") {
        focusCell = applyTemplateEditorCellVerticalAlign("middle");
      }

      if (action === "cell-vertical-align-bottom") {
        focusCell = applyTemplateEditorCellVerticalAlign("bottom");
      }

      if (action === "merge-right") {
        focusCell = mergeTemplateTableCell("right");
      }

      if (action === "merge-down") {
        focusCell = mergeTemplateTableCell("down");
      }

      if (action === "split-cell") {
        focusCell = splitTemplateTableCell(options);
      }

      if (!focusCell) {
        return false;
      }

      focusTemplateEditorCell(focusCell);
      syncTemplateEditorContent();
      updateTemplateTableControls();
      return true;
    }

    return Object.freeze({
      appendMergedTemplateCellContent,
      applyTemplateTableSize,
      getTemplateEditorMedianValue,
      handleTemplateTableAction,
      insertTemplateCellAtAbsoluteColumn,
      isTemplateTableCellEmpty,
    });
  }

  return Object.freeze({
    createTemplateEditorTableActionController,
  });
});
