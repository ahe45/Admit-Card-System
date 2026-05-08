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
    getTemplateEditorBorderColorInput,
    getTemplateEditorBorderStyleInput,
    getTemplateEditorBorderTargetInput,
    getTemplateEditorBorderWidthInput,
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

    function normalizeTemplateEditorBorderTarget(rawValue = "") {
      const normalizedValue = String(rawValue || "").trim();
      return ["all", "outside", "inside", "top", "right", "bottom", "left"].includes(normalizedValue)
        ? normalizedValue
        : "all";
    }

    function normalizeTemplateEditorBorderStyle(rawValue = "") {
      const normalizedValue = String(rawValue || "").trim();
      return ["solid", "dashed", "dotted", "double", "none"].includes(normalizedValue) ? normalizedValue : "solid";
    }

    function normalizeTemplateEditorBorderWidth(rawValue = 1) {
      const normalizedValue = String(rawValue ?? "").trim();
      const width = Math.round(Number(normalizedValue === "" ? 1 : normalizedValue));
      return Number.isFinite(width) ? Math.max(0, Math.min(12, width)) : 1;
    }

    function getTemplateEditorBorderConfig(options = {}) {
      const target = normalizeTemplateEditorBorderTarget(options.target || getTemplateEditorBorderTargetInput?.()?.value || "all");
      const style = normalizeTemplateEditorBorderStyle(options.style || getTemplateEditorBorderStyleInput?.()?.value || "solid");
      const rawWidth = normalizeTemplateEditorBorderWidth(options.width ?? getTemplateEditorBorderWidthInput?.()?.value ?? 1);
      const shouldRemoveBorder = rawWidth === 0 || style === "none";
      const width = !shouldRemoveBorder && style === "double" ? Math.max(rawWidth, 3) : rawWidth;
      const color = normalizeTemplateEditorColorValue(
        options.colorValue || options.color || getTemplateEditorBorderColorInput?.()?.value || "#000000",
        "#000000",
      );

      return Object.freeze({
        color,
        target,
        style: shouldRemoveBorder ? "none" : style,
        width,
      });
    }

    function clearTemplateEditorBorderControlDirtyState() {
      [
        getTemplateEditorBorderColorInput?.(),
        getTemplateEditorBorderStyleInput?.(),
        getTemplateEditorBorderTargetInput?.(),
        getTemplateEditorBorderWidthInput?.(),
      ].forEach((element) => {
        if (element?.dataset) {
          delete element.dataset.editorBorderUserValue;
        }
      });
    }

    function getTemplateEditorBorderCssValue(config) {
      if (config.style === "none" || config.width <= 0) {
        return "none";
      }

      return `${config.width}px ${config.style} ${config.color}`;
    }

    function applyTemplateEditorCellBorderSide(cell, side, borderValue) {
      if (!cell?.style) {
        return;
      }

      const propertyName = `border${side[0].toUpperCase()}${side.slice(1)}`;
      cell.style[propertyName] = borderValue;
    }

    function applyTemplateEditorCellSharedBorderSide(
      cell,
      entry,
      side,
      borderValue,
      matrix,
      shouldUpdateNeighbor = () => true,
    ) {
      applyTemplateEditorCellBorderSide(cell, side, borderValue);

      const oppositeSide = getTemplateEditorOppositeBorderSide(side);

      if (!oppositeSide) {
        return;
      }

      getTemplateEditorBorderNeighborCells(entry, side, matrix)
        .filter((neighborCell) => shouldUpdateNeighbor(neighborCell))
        .forEach((neighborCell) => applyTemplateEditorCellBorderSide(neighborCell, oppositeSide, borderValue));
    }

    function getTemplateEditorOppositeBorderSide(side) {
      return {
        top: "bottom",
        right: "left",
        bottom: "top",
        left: "right",
      }[side] || "";
    }

    function buildSelectedTableCellCoordinateSet(tableSelection, targetCells) {
      const table = tableSelection?.table || targetCells[0]?.closest("table") || null;

      if (!table) {
        return { entries: new Map(), matrix: [], selectedCoordinates: new Set() };
      }

      const { entries, matrix } = buildTemplateTableCellMap(table);
      const selectedCoordinates = new Set();

      targetCells.forEach((cell) => {
        const entry = entries.get(cell);

        if (!entry) {
          return;
        }

        for (let rowIndex = entry.rowIndex; rowIndex < entry.rowIndex + entry.rowSpan; rowIndex += 1) {
          for (let colIndex = entry.colIndex; colIndex < entry.colIndex + entry.colSpan; colIndex += 1) {
            selectedCoordinates.add(`${rowIndex}:${colIndex}`);
          }
        }
      });

      return { entries, matrix, selectedCoordinates };
    }

    function getTemplateEditorBorderNeighborCells(entry, side, matrix) {
      if (!entry || !Array.isArray(matrix)) {
        return [];
      }

      const neighborCells = [];
      const neighborCellSet = new Set();
      const addNeighborCell = (rowIndex, colIndex) => {
        const neighborCell = matrix[rowIndex]?.[colIndex] || null;

        if (neighborCell && !neighborCellSet.has(neighborCell)) {
          neighborCellSet.add(neighborCell);
          neighborCells.push(neighborCell);
        }
      };

      if (side === "top" || side === "bottom") {
        const borderRowIndex = side === "top" ? entry.rowIndex - 1 : entry.rowIndex + entry.rowSpan;

        for (let colIndex = entry.colIndex; colIndex < entry.colIndex + entry.colSpan; colIndex += 1) {
          addNeighborCell(borderRowIndex, colIndex);
        }
      }

      if (side === "left" || side === "right") {
        const borderColIndex = side === "left" ? entry.colIndex - 1 : entry.colIndex + entry.colSpan;

        for (let rowIndex = entry.rowIndex; rowIndex < entry.rowIndex + entry.rowSpan; rowIndex += 1) {
          addNeighborCell(rowIndex, borderColIndex);
        }
      }

      return neighborCells;
    }

    function shouldApplyTemplateEditorSelectionBorderSide(entry, side, selectedCoordinates, mode) {
      if (!entry) {
        return false;
      }

      const hasNeighbor = (rowIndex, colIndex) => selectedCoordinates.has(`${rowIndex}:${colIndex}`);

      if (side === "top" || side === "bottom") {
        const borderRowIndex = side === "top" ? entry.rowIndex - 1 : entry.rowIndex + entry.rowSpan;

        for (let colIndex = entry.colIndex; colIndex < entry.colIndex + entry.colSpan; colIndex += 1) {
          const neighborSelected = hasNeighbor(borderRowIndex, colIndex);

          if ((mode === "outside" && !neighborSelected) || (mode === "inside" && neighborSelected)) {
            return true;
          }
        }
      }

      if (side === "left" || side === "right") {
        const borderColIndex = side === "left" ? entry.colIndex - 1 : entry.colIndex + entry.colSpan;

        for (let rowIndex = entry.rowIndex; rowIndex < entry.rowIndex + entry.rowSpan; rowIndex += 1) {
          const neighborSelected = hasNeighbor(rowIndex, borderColIndex);

          if ((mode === "outside" && !neighborSelected) || (mode === "inside" && neighborSelected)) {
            return true;
          }
        }
      }

      return false;
    }

    function applyTemplateEditorCellBorder(options = {}) {
      const tableSelection = getTemplateEditorActiveTableSelection();
      const targetCells = getTemplateEditorTableTargetCells();

      if (targetCells.length === 0) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 테두리를 적용하세요.", "warning");
        return null;
      }

      const config = getTemplateEditorBorderConfig(options);
      const borderValue = getTemplateEditorBorderCssValue(config);
      const sides = ["top", "right", "bottom", "left"];
      const { entries, matrix, selectedCoordinates } = buildSelectedTableCellCoordinateSet(tableSelection, targetCells);
      const selectedCellSet = new Set(targetCells);

      if (config.target === "all") {
        targetCells.forEach((cell) => {
          const entry = entries.get(cell);

          sides.forEach((side) => {
            applyTemplateEditorCellSharedBorderSide(
              cell,
              entry,
              side,
              borderValue,
              matrix,
              config.style === "none" ? () => true : () => false,
            );
          });
        });
        clearTemplateEditorBorderControlDirtyState();
        return targetCells[0] || null;
      }

      if (sides.includes(config.target)) {
        targetCells.forEach((cell) => {
          const entry = entries.get(cell);

          applyTemplateEditorCellSharedBorderSide(
            cell,
            entry,
            config.target,
            borderValue,
            matrix,
            config.style === "none" ? () => true : () => false,
          );
        });
        clearTemplateEditorBorderControlDirtyState();
        return targetCells[0] || null;
      }

      targetCells.forEach((cell) => {
        const entry = entries.get(cell);

        sides.forEach((side) => {
          if (shouldApplyTemplateEditorSelectionBorderSide(entry, side, selectedCoordinates, config.target)) {
            applyTemplateEditorCellSharedBorderSide(
              cell,
              entry,
              side,
              borderValue,
              matrix,
              config.style === "none" && config.target === "outside"
                ? (neighborCell) => !selectedCellSet.has(neighborCell)
                : config.style === "none"
                  ? (neighborCell) => selectedCellSet.has(neighborCell)
                  : () => false,
            );
          }
        });
      });

      clearTemplateEditorBorderControlDirtyState();
      return targetCells[0] || null;
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

      if (action === "apply-cell-border") {
        focusCell = applyTemplateEditorCellBorder(options);
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
