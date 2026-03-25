(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeTableStructure = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createLoginNoticeTableStructureController({
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
  }) {
    function setLoginNoticeTableInsertPanelVisibility(isVisible) {
      if (typeof setEditorToolbarTableInsertPanelVisibility === "function") {
        setEditorToolbarTableInsertPanelVisibility("loginNoticeTableInsertPanel", Boolean(isVisible));
        return;
      }

      getLoginNoticeTableInsertPanel()?.classList.toggle("hidden", !isVisible);
    }

    function getLoginNoticeTableInsertConfig() {
      const rowCount = Math.round(Number(getLoginNoticeTableRowsElement()?.value || 0));
      const columnCount = Math.round(Number(getLoginNoticeTableColumnsElement()?.value || 0));

      if (!Number.isFinite(rowCount) || rowCount < 1 || rowCount > 20) {
        setLoginNoticeEditorStatus("표 행 수는 1개 이상 20개 이하로 입력하세요.", "warning");
        getLoginNoticeTableRowsElement()?.focus();
        return null;
      }

      if (!Number.isFinite(columnCount) || columnCount < 1 || columnCount > 8) {
        setLoginNoticeEditorStatus("표 열 수는 1개 이상 8개 이하로 입력하세요.", "warning");
        getLoginNoticeTableColumnsElement()?.focus();
        return null;
      }

      return {
        rowCount,
        columnCount,
      };
    }

    function mergeLoginNoticeTableSelection() {
      const selectedCells = getLoginNoticeSelectedCells();
      const selectedCell = selectedCells[0] || null;

      if (!selectedCell || selectedCells.length < 2) {
        setLoginNoticeEditorStatus("병합할 셀 범위를 드래그로 선택하세요.", "warning");
        return selectedCell;
      }

      const table = selectedCell.closest("table");
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntries = selectedCells.map((cell) => entries.get(cell)).filter(Boolean);
      const startRowIndex = Math.min(...selectedEntries.map((entry) => entry.rowIndex));
      const endRowIndex = Math.max(...selectedEntries.map((entry) => entry.rowIndex + entry.rowSpan - 1));
      const startColIndex = Math.min(...selectedEntries.map((entry) => entry.colIndex));
      const endColIndex = Math.max(...selectedEntries.map((entry) => entry.colIndex + entry.colSpan - 1));
      const targetCell = matrix[startRowIndex]?.[startColIndex] || selectedCell;
      const selectionCellSet = new Set(selectedCells);

      for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
        for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex += 1) {
          const cell = matrix[rowIndex]?.[colIndex];

          if (!cell || !selectionCellSet.has(cell)) {
            setLoginNoticeEditorStatus("병합 범위에 빈 셀이나 겹치는 셀이 있어 병합할 수 없습니다.", "warning");
            return selectedCell;
          }
        }
      }

      targetCell.rowSpan = endRowIndex - startRowIndex + 1;
      targetCell.colSpan = endColIndex - startColIndex + 1;

      selectedCells
        .filter((cell) => cell !== targetCell)
        .forEach((cell) => {
          appendMergedTemplateCellContent(targetCell, cell);
          cell.remove();
        });

      if (isTemplateTableCellEmpty(targetCell)) {
        targetCell.innerHTML = "<br />";
      }

      return targetCell;
    }

    function insertLoginNoticeTableRow(position) {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행을 추가하세요.", "warning");
        return null;
      }

      const sourceRow = selectedCell.parentElement;
      const nextRow = document.createElement("tr");

      Array.from(sourceRow.children).forEach((cell) => {
        const nextTagName = position === "before" && cell.tagName === "TH" ? "TH" : "TD";
        nextRow.appendChild(createTemplateTableCell(nextTagName, cell));
      });

      if (position === "before") {
        sourceRow.before(nextRow);
      } else {
        sourceRow.after(nextRow);
      }

      normalizeTemplateEditorTableAppearance(selectedCell.closest("table"));
      return nextRow.children[Math.min(selectedCell.cellIndex, nextRow.children.length - 1)] || nextRow.firstElementChild;
    }

    function insertLoginNoticeTableColumn(position) {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열을 추가하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        setLoginNoticeEditorStatus("선택한 셀 위치를 계산할 수 없습니다.", "warning");
        return null;
      }

      const targetColumnIndex = position === "before" ? selectedEntry.colIndex : selectedEntry.colIndex + selectedEntry.colSpan;
      const adjustedCells = new Set();
      let focusCell = null;

      matrix.forEach((rowCells, rowIndex) => {
        const row = table.rows[rowIndex];

        if (!row) {
          return;
        }

        const coveringCell = rowCells?.[targetColumnIndex] || null;
        const coveringEntry = coveringCell ? entries.get(coveringCell) : null;

        if (coveringEntry && coveringEntry.colIndex < targetColumnIndex) {
          if (!adjustedCells.has(coveringCell)) {
            coveringCell.colSpan = coveringEntry.colSpan + 1;
            adjustedCells.add(coveringCell);
          }
          return;
        }

        const referenceCell =
          Array.from(row.cells).find((existingCell) => {
            const entry = entries.get(existingCell);
            return entry && entry.colIndex >= targetColumnIndex;
          }) || null;
        const styleSourceCell = referenceCell || row.cells[row.cells.length - 1] || selectedCell;
        const tagName = referenceCell?.tagName || (Array.from(row.cells).every((cell) => cell.tagName === "TH") ? "TH" : "TD");
        const nextCell = createTemplateTableCell(tagName, styleSourceCell);

        insertTemplateCellAtAbsoluteColumn(row, targetColumnIndex, nextCell);

        if (row === selectedCell.parentElement) {
          focusCell = nextCell;
        }
      });

      normalizeTemplateEditorTableAppearance(table);
      return focusCell;
    }

    function deleteLoginNoticeTableRow() {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행을 삭제하세요.", "warning");
        return null;
      }

      const sourceRow = selectedCell.parentElement;
      const siblingRows = Array.from(sourceRow.parentElement.children).filter((element) => element.tagName === "TR");

      if (siblingRows.length <= 1) {
        setLoginNoticeEditorStatus("표에는 최소 한 개의 행이 필요합니다.", "warning");
        return selectedCell;
      }

      const fallbackRow = sourceRow.nextElementSibling || sourceRow.previousElementSibling;
      const fallbackCell =
        fallbackRow?.children[Math.min(selectedCell.cellIndex, fallbackRow.children.length - 1)] || fallbackRow?.firstElementChild;

      sourceRow.remove();
      return fallbackCell || null;
    }

    function deleteLoginNoticeTableColumn() {
      const selectedCell = getLoginNoticeSelectedCell();

      if (!selectedCell) {
        setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열을 삭제하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const rows = Array.from(table.rows).filter((row) => row.cells.length > 0);
      const maxColumnCount = Math.max(...rows.map((row) => row.cells.length));

      if (maxColumnCount <= 1) {
        setLoginNoticeEditorStatus("표에는 최소 한 개의 열이 필요합니다.", "warning");
        return selectedCell;
      }

      let focusCell = null;

      rows.forEach((row) => {
        const targetCell = row.cells[selectedCell.cellIndex];

        if (!targetCell) {
          return;
        }

        const fallbackCell = row.cells[selectedCell.cellIndex + 1] || row.cells[selectedCell.cellIndex - 1] || row.cells[0];
        targetCell.remove();

        if (row === selectedCell.parentElement) {
          focusCell =
            (fallbackCell && fallbackCell !== targetCell ? fallbackCell : null) ||
            row.cells[Math.max(selectedCell.cellIndex - 1, 0)] ||
            row.cells[0] ||
            null;
        }
      });

      return focusCell;
    }

    return Object.freeze({
      deleteLoginNoticeTableColumn,
      deleteLoginNoticeTableRow,
      getLoginNoticeTableInsertConfig,
      insertLoginNoticeTableColumn,
      insertLoginNoticeTableRow,
      mergeLoginNoticeTableSelection,
      setLoginNoticeTableInsertPanelVisibility,
    });
  }

  return Object.freeze({
    createLoginNoticeTableStructureController,
  });
});
