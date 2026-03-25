(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableSizing = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableSizingController({
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
  }) {
    function getTemplateEditorSizeScopeCells(selectedCell, scope) {
      const table = selectedCell?.closest("table");

      if (!table || !selectedCell) {
        return [];
      }

      if (scope === "cell") {
        return [selectedCell];
      }

      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [selectedCell];
      }

      const targetCells = new Set();

      if (scope === "row") {
        (matrix[selectedEntry.rowIndex] || []).forEach((cell) => {
          if (cell) {
            targetCells.add(cell);
          }
        });
      }

      if (scope === "column") {
        matrix.forEach((row) => {
          const cell = row?.[selectedEntry.colIndex];

          if (cell) {
            targetCells.add(cell);
          }
        });
      }

      if (scope === "table") {
        entries.forEach((entry) => {
          targetCells.add(entry.cell);
        });
      }

      return Array.from(targetCells);
    }

    function getTemplateEditorSizeScopeColumnIndexes(selectedCell, scope) {
      const table = selectedCell?.closest("table");

      if (!table || !selectedCell) {
        return [];
      }

      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [];
      }

      const columnIndexes = new Set();
      const addColumnRange = (startIndex, span) => {
        for (let columnIndex = startIndex; columnIndex < startIndex + span; columnIndex += 1) {
          columnIndexes.add(columnIndex);
        }
      };

      if (scope === "cell" || scope === "column") {
        addColumnRange(selectedEntry.colIndex, selectedEntry.colSpan);
      }

      if (scope === "row") {
        (matrix[selectedEntry.rowIndex] || []).forEach((cell, columnIndex) => {
          if (cell) {
            columnIndexes.add(columnIndex);
          }
        });
      }

      if (scope === "table") {
        const columnCount = matrix.reduce((maxCount, row) => Math.max(maxCount, Array.isArray(row) ? row.length : 0), 0);

        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          columnIndexes.add(columnIndex);
        }
      }

      return Array.from(columnIndexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
    }

    function applyTemplateEditorTableCellWidth(cell, width) {
      const table = cell?.closest("table");

      if (!table || !cell) {
        return false;
      }

      const { entries } = buildTemplateTableCellMap(table);
      const entry = entries.get(cell);

      if (!entry) {
        return false;
      }

      const { columns } = ensureTemplateEditorTableColGroup(table);
      const targetColumnIndexes = Array.from({ length: entry.colSpan }, (_, offset) => entry.colIndex + offset);
      const safeWidth = getTemplateEditorClampedColumnGroupWidth(table, columns, targetColumnIndexes, width);
      const baseWidth = Math.floor(safeWidth / entry.colSpan);
      const remainder = safeWidth - baseWidth * entry.colSpan;

      for (let offset = 0; offset < entry.colSpan; offset += 1) {
        const nextWidth = baseWidth + (offset === entry.colSpan - 1 ? remainder : 0);
        setTemplateEditorTableLogicalColumnWidth(table, entry.colIndex + offset, nextWidth);
      }

      cell.style.width = `${safeWidth}px`;
      return true;
    }

    function getTemplateEditorMedianValue(values) {
      if (!Array.isArray(values) || values.length === 0) {
        return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
      }

      const sortedValues = [...values]
        .filter((value) => Number.isFinite(value))
        .sort((leftValue, rightValue) => leftValue - rightValue);

      if (sortedValues.length === 0) {
        return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
      }

      const middleIndex = Math.floor(sortedValues.length / 2);

      if (sortedValues.length % 2 === 1) {
        return Math.round(sortedValues[middleIndex]);
      }

      return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
    }

    function getTemplateEditorEqualizeColumnIndexes(table, selectedCell) {
      const tableSelection = getTemplateEditorActiveTableSelection();

      if (tableSelection?.table === table) {
        return Array.from(
          { length: tableSelection.endColIndex - tableSelection.startColIndex + 1 },
          (_, index) => tableSelection.startColIndex + index,
        );
      }

      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [];
      }

      return (matrix[selectedEntry.rowIndex] || [])
        .map((cell, columnIndex) => (cell ? columnIndex : null))
        .filter((columnIndex) => columnIndex !== null);
    }

    function getTemplateEditorEqualizeRowIndexes(table, selectedCell) {
      const tableSelection = getTemplateEditorActiveTableSelection();

      if (tableSelection?.table === table) {
        return Array.from(
          { length: tableSelection.endRowIndex - tableSelection.startRowIndex + 1 },
          (_, index) => tableSelection.startRowIndex + index,
        );
      }

      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [];
      }

      return matrix
        .map((row, rowIndex) => (row?.[selectedEntry.colIndex] ? rowIndex : null))
        .filter((rowIndex) => rowIndex !== null);
    }

    function equalizeTemplateTableColumnWidths() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열 너비를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetColumnIndexes = getTemplateEditorEqualizeColumnIndexes(table, selectedCell);

      if (targetColumnIndexes.length === 0) {
        setTemplateEditorStatus("같은 너비로 맞출 열을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      const medianWidth = getTemplateEditorMedianValue(
        targetColumnIndexes.map((columnIndex) => getTemplateEditorTableLogicalColumnWidth(table, columnIndex)),
      );

      targetColumnIndexes.forEach((columnIndex) => {
        setTemplateEditorTableLogicalColumnWidth(table, columnIndex, medianWidth);
      });

      return selectedCell;
    }

    function equalizeTemplateTableRowHeights() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행 높이를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetRowIndexes = getTemplateEditorEqualizeRowIndexes(table, selectedCell);

      if (targetRowIndexes.length === 0) {
        setTemplateEditorStatus("같은 높이로 맞출 행을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      const medianHeight = getTemplateEditorMedianValue(
        targetRowIndexes.map((rowIndex) => getTemplateEditorTableLogicalRowHeight(table, rowIndex)),
      );

      targetRowIndexes.forEach((rowIndex) => {
        setTemplateEditorTableLogicalRowHeight(table, rowIndex, medianHeight);
      });

      return selectedCell;
    }

    function getTemplateEditorShadingTargetCells(selectedCell) {
      const tableSelection = getTemplateEditorActiveTableSelection();

      if (tableSelection?.selectedCells?.length) {
        return tableSelection.selectedCells;
      }

      return selectedCell ? [selectedCell] : [];
    }

    function applyTemplateEditorCellShading(colorValue = "") {
      const selectedCell = getTemplateEditorSelectedCell() || getTemplateEditorActiveTableSelection()?.anchorCell || null;

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 음영을 적용하세요.", "warning");
        return null;
      }

      const shadingValue = normalizeTemplateEditorColorValue(
        colorValue || getTemplateEditorCellShadingInput()?.value || "",
        "#ffffff",
      );
      const targetCells = getTemplateEditorShadingTargetCells(selectedCell);

      if (targetCells.length === 0) {
        setTemplateEditorStatus("음영을 적용할 셀을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      targetCells.forEach((cell) => {
        cell.style.backgroundColor = shadingValue;
      });

      syncTemplateEditorContent();
      updateTemplateTableControls();
      return selectedCell;
    }

    function applyTemplateTableSize() {
      restoreTemplateEditorSelection();

      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 크기를 조정하세요.", "warning");
        return;
      }

      const scope = String(getTemplateEditorSizeScopeInput()?.value || "cell");
      const targetCells = getTemplateEditorSizeScopeCells(selectedCell, scope);

      if (targetCells.length === 0) {
        setTemplateEditorStatus("적용할 셀을 찾을 수 없습니다.", "warning");
        return;
      }

      const widthInput = String(getTemplateEditorCellWidthInput()?.value || "").trim();
      const heightInput = String(getTemplateEditorRowHeightInput()?.value || "").trim();
      const widthValue = widthInput ? Number(widthInput) : null;
      const heightValue = heightInput ? Number(heightInput) : null;

      if (widthValue === null && heightValue === null) {
        setTemplateEditorStatus("셀 가로 또는 세로 값을 입력하세요.", "warning");
        return;
      }

      if (widthValue !== null) {
        if (!Number.isFinite(widthValue) || widthValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
          setTemplateEditorStatus(`셀 가로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
          return;
        }

        if (scope === "cell") {
          applyTemplateEditorTableCellWidth(selectedCell, widthValue);
        } else {
          const targetColumnIndexes = getTemplateEditorSizeScopeColumnIndexes(selectedCell, scope);

          if (targetColumnIndexes.length === 0) {
            setTemplateEditorStatus("적용할 열을 찾을 수 없습니다.", "warning");
            return;
          }

          targetColumnIndexes.forEach((columnIndex) => {
            setTemplateEditorTableLogicalColumnWidth(selectedCell.closest("table"), columnIndex, widthValue);
          });
        }
      }

      if (heightValue !== null) {
        if (!Number.isFinite(heightValue) || heightValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
          setTemplateEditorStatus(`셀 세로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
          return;
        }

        targetCells.forEach((cell) => {
          cell.style.height = `${heightValue}px`;
          if (cell.parentElement) {
            cell.parentElement.style.height = `${heightValue}px`;
          }
        });
      }

      focusTemplateEditorCell(selectedCell);
      syncTemplateEditorContent();
      updateTemplateTableControls();
    }

    return Object.freeze({
      applyTemplateEditorCellShading,
      applyTemplateTableSize,
      equalizeTemplateTableColumnWidths,
      equalizeTemplateTableRowHeights,
      getTemplateEditorMedianValue,
    });
  }

  return Object.freeze({
    createTemplateEditorTableSizingController,
  });
});
