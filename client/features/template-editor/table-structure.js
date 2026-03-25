(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableStructure = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableStructureController({
    buildTemplateTableCellMap,
    createTemplateTableCell,
    getTemplateEditorActiveTableSelection,
    getTemplateEditorSelectedCell,
    normalizeTemplateEditorTableAppearance,
    setTemplateEditorStatus,
  }) {
    function isTemplateTableCellEmpty(cell) {
      if (!cell) {
        return true;
      }

      const normalizedHtml = String(cell.innerHTML || "")
        .replace(/<br\s*\/?>/gi, "")
        .replace(/&nbsp;/gi, "")
        .trim();

      return normalizedHtml === "" && !cell.querySelector("img, table, hr, [data-template-tag-value]");
    }

    function appendMergedTemplateCellContent(targetCell, sourceCell) {
      if (!targetCell || !sourceCell || isTemplateTableCellEmpty(sourceCell)) {
        return;
      }

      if (isTemplateTableCellEmpty(targetCell)) {
        targetCell.innerHTML = "";
      } else {
        targetCell.appendChild(document.createElement("br"));
      }

      Array.from(sourceCell.childNodes).forEach((node) => {
        targetCell.appendChild(node);
      });
    }

    function mergeTemplateTableSelection() {
      const tableSelection = getTemplateEditorActiveTableSelection();

      if (!tableSelection || tableSelection.selectedCells.length < 2) {
        setTemplateEditorStatus("병합할 셀 범위를 드래그로 선택하세요.", "warning");
        return getTemplateEditorSelectedCell();
      }

      const { matrix, entries } = buildTemplateTableCellMap(tableSelection.table);
      const targetCell = matrix[tableSelection.startRowIndex]?.[tableSelection.startColIndex] || tableSelection.selectedCells[0];
      const targetEntry = entries.get(targetCell);

      if (!targetEntry) {
        setTemplateEditorStatus("선택한 셀 범위를 병합할 수 없습니다.", "warning");
        return tableSelection.anchorCell;
      }

      const selectionCellSet = new Set(tableSelection.selectedCells);

      for (let rowIndex = tableSelection.startRowIndex; rowIndex <= tableSelection.endRowIndex; rowIndex += 1) {
        for (let colIndex = tableSelection.startColIndex; colIndex <= tableSelection.endColIndex; colIndex += 1) {
          const cell = matrix[rowIndex]?.[colIndex];

          if (!cell || !selectionCellSet.has(cell)) {
            setTemplateEditorStatus("병합 범위에 빈 셀이나 겹치는 셀이 있어 병합할 수 없습니다.", "warning");
            return tableSelection.anchorCell;
          }
        }
      }

      targetCell.rowSpan = tableSelection.endRowIndex - tableSelection.startRowIndex + 1;
      targetCell.colSpan = tableSelection.endColIndex - tableSelection.startColIndex + 1;

      tableSelection.selectedCells
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

    function insertTemplateCellAtAbsoluteColumn(row, targetColumnIndex, cell) {
      const table = row.closest("table");
      const { entries } = buildTemplateTableCellMap(table);
      const referenceCell =
        Array.from(row.cells).find((existingCell) => {
          const entry = entries.get(existingCell);
          return entry && entry.colIndex >= targetColumnIndex;
        }) || null;

      row.insertBefore(cell, referenceCell);
    }

    function mergeTemplateTableCell(direction) {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 병합하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        setTemplateEditorStatus("선택한 셀 정보를 읽을 수 없습니다.", "warning");
        return null;
      }

      let siblingCell = null;
      let siblingEntry = null;

      if (direction === "right") {
        siblingCell = matrix[selectedEntry.rowIndex]?.[selectedEntry.colIndex + selectedEntry.colSpan] || null;
        siblingEntry = siblingCell ? entries.get(siblingCell) : null;

        if (!siblingEntry || siblingEntry.rowIndex !== selectedEntry.rowIndex || siblingEntry.rowSpan !== selectedEntry.rowSpan) {
          setTemplateEditorStatus("오른쪽에 같은 높이의 병합 가능한 셀이 없습니다.", "warning");
          return selectedCell;
        }

        selectedCell.colSpan = selectedEntry.colSpan + siblingEntry.colSpan;
      }

      if (direction === "down") {
        siblingCell = matrix[selectedEntry.rowIndex + selectedEntry.rowSpan]?.[selectedEntry.colIndex] || null;
        siblingEntry = siblingCell ? entries.get(siblingCell) : null;

        if (!siblingEntry || siblingEntry.colIndex !== selectedEntry.colIndex || siblingEntry.colSpan !== selectedEntry.colSpan) {
          setTemplateEditorStatus("아래에 같은 폭의 병합 가능한 셀이 없습니다.", "warning");
          return selectedCell;
        }

        selectedCell.rowSpan = selectedEntry.rowSpan + siblingEntry.rowSpan;
      }

      appendMergedTemplateCellContent(selectedCell, siblingCell);
      siblingCell?.remove();

      if (isTemplateTableCellEmpty(selectedCell)) {
        selectedCell.innerHTML = "<br />";
      }

      return selectedCell;
    }

    function splitTemplateTableCell() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 분할하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const { entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        setTemplateEditorStatus("선택한 셀 정보를 읽을 수 없습니다.", "warning");
        return null;
      }

      if (selectedEntry.rowSpan === 1 && selectedEntry.colSpan === 1) {
        setTemplateEditorStatus("현재 셀은 이미 분할된 상태입니다.", "warning");
        return selectedCell;
      }

      const originalRowSpan = selectedEntry.rowSpan;
      const originalColSpan = selectedEntry.colSpan;
      const sourceTagName = selectedCell.tagName;

      selectedCell.rowSpan = 1;
      selectedCell.colSpan = 1;

      for (let rowOffset = 0; rowOffset < originalRowSpan; rowOffset += 1) {
        const row = table.rows[selectedEntry.rowIndex + rowOffset];

        for (let colOffset = 0; colOffset < originalColSpan; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          insertTemplateCellAtAbsoluteColumn(
            row,
            selectedEntry.colIndex + colOffset,
            createTemplateTableCell(sourceTagName),
          );
        }
      }

      if (isTemplateTableCellEmpty(selectedCell)) {
        selectedCell.innerHTML = "<br />";
      }

      return selectedCell;
    }

    function insertTemplateTableRow(position) {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행을 추가하세요.", "warning");
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

    function insertTemplateTableColumn(position) {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열을 추가하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const selectedEntry = entries.get(selectedCell);

      if (!selectedEntry) {
        setTemplateEditorStatus("선택한 셀 위치를 계산할 수 없습니다.", "warning");
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

    function deleteTemplateTableRow() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행을 삭제하세요.", "warning");
        return null;
      }

      const sourceRow = selectedCell.parentElement;
      const siblingRows = Array.from(sourceRow.parentElement.children).filter((element) => element.tagName === "TR");

      if (siblingRows.length <= 1) {
        setTemplateEditorStatus("표에는 최소 한 개의 행이 필요합니다.", "warning");
        return selectedCell;
      }

      const fallbackRow = sourceRow.nextElementSibling || sourceRow.previousElementSibling;
      const fallbackCell =
        fallbackRow?.children[Math.min(selectedCell.cellIndex, fallbackRow.children.length - 1)] || fallbackRow?.firstElementChild;

      sourceRow.remove();
      return fallbackCell || null;
    }

    function deleteTemplateTableColumn() {
      const selectedCell = getTemplateEditorSelectedCell();

      if (!selectedCell) {
        setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열을 삭제하세요.", "warning");
        return null;
      }

      const table = selectedCell.closest("table");
      const rows = Array.from(table.rows).filter((row) => row.cells.length > 0);
      const maxColumnCount = Math.max(...rows.map((row) => row.cells.length));

      if (maxColumnCount <= 1) {
        setTemplateEditorStatus("표에는 최소 한 개의 열이 필요합니다.", "warning");
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
    });
  }

  return Object.freeze({
    createTemplateEditorTableStructureController,
  });
});
