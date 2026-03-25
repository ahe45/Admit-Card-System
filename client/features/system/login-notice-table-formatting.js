(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeTableFormatting = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createLoginNoticeTableFormattingController({
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
  }) {
    function getLoginNoticeEqualizeColumnIndexes(table, selectedCell, selectedCells) {
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [];
      }

      if (selectedCells.length > 1) {
        const indexes = new Set();

        selectedCells.forEach((cell) => {
          const entry = entries.get(cell);

          if (!entry) {
            return;
          }

          for (let columnIndex = entry.colIndex; columnIndex < entry.colIndex + entry.colSpan; columnIndex += 1) {
            indexes.add(columnIndex);
          }
        });

        return Array.from(indexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
      }

      return (matrix[selectedEntry.rowIndex] || [])
        .map((cell, columnIndex) => (cell ? columnIndex : null))
        .filter((columnIndex) => columnIndex !== null);
    }

    function getLoginNoticeEqualizeRowIndexes(table, selectedCell, selectedCells) {
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        return [];
      }

      if (selectedCells.length > 1) {
        const indexes = new Set();

        selectedCells.forEach((cell) => {
          const entry = entries.get(cell);

          if (!entry) {
            return;
          }

          for (let rowIndex = entry.rowIndex; rowIndex < entry.rowIndex + entry.rowSpan; rowIndex += 1) {
            indexes.add(rowIndex);
          }
        });

        return Array.from(indexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
      }

      return matrix
        .map((row, rowIndex) => (row?.[selectedEntry.colIndex] ? rowIndex : null))
        .filter((rowIndex) => rowIndex !== null);
    }

    function equalizeLoginNoticeTableColumnWidths() {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열 너비를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetColumnIndexes = getLoginNoticeEqualizeColumnIndexes(table, selectedCell, getLoginNoticeSelectedCells());

      if (targetColumnIndexes.length === 0) {
        setLoginNoticeEditorStatus("같은 너비로 맞출 열을 찾을 수 없습니다.", "warning");
        return selectedCell;
      }

      const medianWidth = getTemplateEditorMedianValue(
        targetColumnIndexes.map((columnIndex) => getTemplateEditorTableLogicalColumnWidth(table, columnIndex)),
      );
      const { columns } = ensureTemplateEditorTableColGroup(table);

      targetColumnIndexes.forEach((columnIndex) => {
        const columnElement = columns[columnIndex];

        if (columnElement) {
          columnElement.style.width = `${medianWidth}px`;
        }
      });

      syncTemplateEditorTableWidth(table, columns);
      return selectedCell;
    }

    function equalizeLoginNoticeTableRowHeights() {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행 높이를 맞추세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const targetRowIndexes = getLoginNoticeEqualizeRowIndexes(table, selectedCell, getLoginNoticeSelectedCells());

      if (targetRowIndexes.length === 0) {
        setLoginNoticeEditorStatus("같은 높이로 맞출 행을 찾을 수 없습니다.", "warning");
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

    function applyLoginNoticeCellShading(colorValue = "") {
      const selectedCells = getLoginNoticeSelectedCells();
      const selectedCell = selectedCells[0] || null;

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 음영을 적용하세요.", "warning");
        return null;
      }

      const shadingValue = normalizeTemplateEditorColorValue(colorValue || getLoginNoticeCellShadingElement()?.value || "", "#ffffff");

      selectedCells.forEach((cell) => {
        cell.style.backgroundColor = shadingValue;
      });

      return selectedCell;
    }

    return Object.freeze({
      applyLoginNoticeCellShading,
      equalizeLoginNoticeTableColumnWidths,
      equalizeLoginNoticeTableRowHeights,
    });
  }

  return Object.freeze({
    createLoginNoticeTableFormattingController,
  });
});
