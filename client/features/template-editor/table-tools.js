(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableTools = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const tableActionModule = globalThis.AdmitCardTemplateEditorTableActions;
  const tableInteractionModule = globalThis.AdmitCardTemplateEditorTableInteraction;

  if (!tableActionModule?.createTemplateEditorTableActionController) {
    throw new Error("client/features/template-editor/table-actions.js must be loaded before table-tools.js.");
  }

  if (!tableInteractionModule?.createTemplateEditorTableInteractionController) {
    throw new Error("client/features/template-editor/table-interaction.js must be loaded before table-tools.js.");
  }

  const { createTemplateEditorTableActionController } = tableActionModule;
  const { createTemplateEditorTableInteractionController } = tableInteractionModule;

  function createTemplateEditorTableController({
    TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND,
    TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD,
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    TEMPLATE_EDITOR_TABLE_SELECTION_DRAG_THRESHOLD,
    applyTemplateTableCellPresentation,
    buildTemplateTableCellMap,
    clearTemplateEditorImageSelection,
    ensureTemplateEditorTableColGroup,
    getClosestTemplateEditorElement,
    getTemplateEditorDocumentElement,
    getTemplateEditorSelectionNode,
    getTemplateEditorSurface,
    getTemplateEditorModal,
    getTemplateEditorCellShadingInput,
    getTemplateEditorCellWidthInput,
    getTemplateEditorRowHeightInput,
    getTemplateEditorSizeScopeInput,
    getTemplateEditorMeasuredColumnWidth,
    getTemplateEditorTableColumnCount,
    normalizeTemplateEditorColorValue,
    normalizeTemplateEditorTableAppearance,
    parseTemplateEditorPixelStyle,
    placeCaretAtEnd,
    restoreTemplateEditorSelection,
    setTemplateEditorStatus,
    state,
    syncTemplateEditorContent,
    syncTemplateEditorTableWidth,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateTableControls,
  }) {
    function getTemplateEditorPixelValue(element, property) {
      if (!element) {
        return "";
      }

      const rect = element.getBoundingClientRect();
      const pixelValue = property === "height" ? rect.height : rect.width;

      if (!Number.isFinite(pixelValue) || pixelValue <= 0) {
        return "";
      }

      return String(Math.round(pixelValue));
    }

    function getTemplateEditorCellShadingValue(cell) {
      if (!cell) {
        return "#ffffff";
      }

      const fallbackValue = cell.tagName === "TH" ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND : "#ffffff";
      return normalizeTemplateEditorColorValue(cell.style.backgroundColor || window.getComputedStyle(cell).backgroundColor, fallbackValue);
    }

    function focusTemplateEditorCell(cell) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      if (!cell) {
        placeCaretAtEnd(templateEditorSurface);
        return;
      }

      if (!String(cell.innerHTML || "").trim()) {
        cell.innerHTML = "<br />";
      }

      const selection = window.getSelection();
      const range = document.createRange();

      range.selectNodeContents(cell);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      state.templateEditor.savedRange = range.cloneRange();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
    }

    function createTemplateTableCell(tagName, sourceCell = null) {
      const cell = document.createElement(tagName.toLowerCase());
      cell.innerHTML = tagName.toUpperCase() === "TH" ? "제목" : "<br />";
      applyTemplateTableCellPresentation(cell, sourceCell);
      return cell;
    }

    function getTemplateEditorTableMaxWidth(table) {
      const templateEditorSurface = getTemplateEditorSurface();
      const documentElement = table?.closest(".template-doc") || getTemplateEditorDocumentElement();

      if (documentElement) {
        const documentWidth = Math.floor(documentElement.clientWidth);

        if (documentWidth > 0) {
          return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, documentWidth);
        }
      }

      if (templateEditorSurface) {
        const surfaceStyle = window.getComputedStyle(templateEditorSurface);
        const horizontalPadding =
          parseTemplateEditorPixelStyle(surfaceStyle.paddingLeft, 0) + parseTemplateEditorPixelStyle(surfaceStyle.paddingRight, 0);
        const availableWidth = Math.floor(templateEditorSurface.clientWidth - horizontalPadding);

        if (availableWidth > 0) {
          return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, availableWidth);
        }
      }

      return Number.MAX_SAFE_INTEGER;
    }

    function getTemplateEditorClampedColumnGroupWidth(table, columns, columnIndexes, requestedTotalWidth) {
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
      const tableMaxWidth = getTemplateEditorTableMaxWidth(table);

      if (safeRequestedWidth <= currentTargetWidth) {
        return safeRequestedWidth;
      }

      const maxExpandableWidth =
        currentTableWidth > tableMaxWidth ? currentTargetWidth : currentTargetWidth + Math.max(0, tableMaxWidth - currentTableWidth);

      return Math.min(safeRequestedWidth, Math.max(minTotalWidth, maxExpandableWidth));
    }

    function getTemplateEditorTableLogicalColumnWidth(table, columnIndex) {
      const { columns, cellMap } = ensureTemplateEditorTableColGroup(table);
      const columnElement = columns[columnIndex];
      const configuredWidth = parseTemplateEditorPixelStyle(columnElement?.style.width, 0);

      if (configuredWidth >= TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
        return configuredWidth;
      }

      return getTemplateEditorMeasuredColumnWidth(cellMap, columnIndex);
    }

    function setTemplateEditorTableLogicalColumnWidth(table, columnIndex, width) {
      const { columns } = ensureTemplateEditorTableColGroup(table);
      const columnElement = columns[columnIndex];

      if (!columnElement) {
        return false;
      }

      const safeWidth = getTemplateEditorClampedColumnGroupWidth(table, columns, [columnIndex], width);
      columnElement.style.width = `${safeWidth}px`;
      syncTemplateEditorTableWidth(table, columns);
      return true;
    }

    function getTemplateEditorTableLogicalRowHeight(table, rowIndex) {
      const targetRow = table?.rows?.[rowIndex];

      if (!targetRow) {
        return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
      }

      const configuredHeight = parseTemplateEditorPixelStyle(targetRow.style.height, 0);

      if (configuredHeight >= TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
        return configuredHeight;
      }

      return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(targetRow.getBoundingClientRect().height));
    }

    function setTemplateEditorTableLogicalRowHeight(table, rowIndex, height) {
      const targetRow = table?.rows?.[rowIndex];

      if (!targetRow) {
        return false;
      }

      const safeHeight = Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(height));
      const { matrix, entries } = buildTemplateTableCellMap(table);
      const rowCells = new Set();

      (matrix[rowIndex] || []).forEach((cell) => {
        const entry = cell ? entries.get(cell) : null;

        if (entry && entry.rowIndex === rowIndex) {
          rowCells.add(cell);
        }
      });

      targetRow.style.height = `${safeHeight}px`;
      rowCells.forEach((cell) => {
        cell.style.height = `${safeHeight}px`;
      });

      return true;
    }

    const tableInteractionController = createTemplateEditorTableInteractionController({
      TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD,
      TEMPLATE_EDITOR_TABLE_MIN_SIZE,
      TEMPLATE_EDITOR_TABLE_SELECTION_DRAG_THRESHOLD,
      buildTemplateTableCellMap,
      clearTemplateEditorImageSelection,
      focusTemplateEditorCell,
      getClosestTemplateEditorElement,
      getTemplateEditorModal,
      getTemplateEditorSelectionNode,
      getTemplateEditorSurface,
      getTemplateEditorTableLogicalColumnWidth,
      setTemplateEditorTableLogicalColumnWidth,
      setTemplateEditorTableLogicalRowHeight,
      state,
      syncTemplateEditorContent,
      updateTemplateTableControls,
    });

    const {
      clearTemplateEditorTableHoverState,
      clearTemplateEditorTableSelection,
      getTemplateEditorActiveTableSelection,
      getTemplateEditorSelectedCell,
      getTemplateEditorSelectedTable,
      handleTemplateEditorTablePointerDown,
      releaseTemplateEditorTableResizeSession,
      releaseTemplateEditorTableSelectionSession,
      updateTemplateEditorTableHoverState,
    } = tableInteractionController;
    const tableActionController = createTemplateEditorTableActionController({
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
    });

    const {
      appendMergedTemplateCellContent,
      applyTemplateTableSize,
      getTemplateEditorMedianValue,
      handleTemplateTableAction,
      insertTemplateCellAtAbsoluteColumn,
      isTemplateTableCellEmpty,
    } = tableActionController;

    return Object.freeze({
      appendMergedTemplateCellContent,
      applyTemplateTableSize,
      clearTemplateEditorTableHoverState,
      clearTemplateEditorTableSelection,
      createTemplateTableCell,
      focusTemplateEditorCell,
      getTemplateEditorActiveTableSelection,
      getTemplateEditorCellShadingValue,
      getTemplateEditorMedianValue,
      getTemplateEditorPixelValue,
      getTemplateEditorSelectedCell,
      getTemplateEditorSelectedTable,
      getTemplateEditorTableLogicalColumnWidth,
      getTemplateEditorTableLogicalRowHeight,
      handleTemplateEditorTablePointerDown,
      handleTemplateTableAction,
      isTemplateTableCellEmpty,
      insertTemplateCellAtAbsoluteColumn,
      releaseTemplateEditorTableResizeSession,
      releaseTemplateEditorTableSelectionSession,
      setTemplateEditorTableLogicalRowHeight,
      updateTemplateEditorTableHoverState,
    });
  }

  return Object.freeze({
    createTemplateEditorTableController,
  });
});
