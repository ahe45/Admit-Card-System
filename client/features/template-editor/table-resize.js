(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTableResize = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTableResizeController({
    TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD,
    TEMPLATE_EDITOR_TABLE_MIN_SIZE,
    buildTemplateTableCellMap,
    clearTemplateEditorTableSelection,
    focusTemplateEditorCell,
    getTemplateEditorModal,
    getTemplateEditorSurface,
    getTemplateEditorTableCellTarget,
    getTemplateEditorTableLogicalColumnWidth,
    setTemplateEditorTableLogicalColumnWidth,
    setTemplateEditorTableLogicalRowHeight,
    state,
    syncTemplateEditorContent,
    updateTemplateTableControls,
  }) {
    function clearTemplateEditorTableHoverState() {
      getTemplateEditorSurface()?.classList.remove("is-table-column-hover", "is-table-row-hover");
    }

    function getTemplateEditorTableResizeHit(cell, event) {
      const table = cell?.closest("table");

      if (!table) {
        return null;
      }

      const { entries } = buildTemplateTableCellMap(table);
      const entry = entries.get(cell);

      if (!entry) {
        return null;
      }

      const cellRect = cell.getBoundingClientRect();
      const deltaLeft = Math.abs(cellRect.left - event.clientX);
      const deltaTop = Math.abs(cellRect.top - event.clientY);
      const deltaRight = Math.abs(cellRect.right - event.clientX);
      const deltaBottom = Math.abs(cellRect.bottom - event.clientY);
      const hits = [];

      if (deltaLeft <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD && entry.colIndex > 0) {
        hits.push({ distance: deltaLeft, kind: "column", lineIndex: entry.colIndex - 1 });
      }

      if (deltaRight <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD) {
        hits.push({ distance: deltaRight, kind: "column", lineIndex: entry.colIndex + entry.colSpan - 1 });
      }

      if (deltaTop <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD && entry.rowIndex > 0) {
        hits.push({ distance: deltaTop, kind: "row", lineIndex: entry.rowIndex - 1 });
      }

      if (deltaBottom <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD) {
        hits.push({ distance: deltaBottom, kind: "row", lineIndex: entry.rowIndex + entry.rowSpan - 1 });
      }

      if (hits.length === 0) {
        return null;
      }

      hits.sort((leftHit, rightHit) => leftHit.distance - rightHit.distance);
      const targetHit = hits[0];

      return {
        kind: targetHit.kind,
        table,
        cell,
        lineIndex: targetHit.lineIndex,
      };
    }

    function updateTemplateEditorTableHoverState(event) {
      const templateEditorSurface = getTemplateEditorSurface();
      const templateEditorModal = getTemplateEditorModal();

      if (
        !templateEditorSurface ||
        templateEditorModal?.classList.contains("hidden") ||
        state.templateEditor.tableResizeSession ||
        state.templateEditor.tableSelectionSession ||
        state.templateEditor.imageMoveSession ||
        state.templateEditor.imageResizeSession
      ) {
        clearTemplateEditorTableHoverState();
        return;
      }

      const hoverCell = getTemplateEditorTableCellTarget(event.target);
      const resizeHit = hoverCell ? getTemplateEditorTableResizeHit(hoverCell, event) : null;

      templateEditorSurface.classList.toggle("is-table-column-hover", resizeHit?.kind === "column");
      templateEditorSurface.classList.toggle("is-table-row-hover", resizeHit?.kind === "row");
    }

    function getTemplateEditorTableLineCells(table, kind, lineIndex) {
      const { matrix } = buildTemplateTableCellMap(table);
      const targetCells = new Set();

      if (kind === "column") {
        matrix.forEach((row) => {
          const cell = row?.[lineIndex];

          if (cell) {
            targetCells.add(cell);
          }
        });
      }

      if (kind === "row") {
        (matrix[lineIndex] || []).forEach((cell) => {
          if (cell) {
            targetCells.add(cell);
          }
        });
      }

      return Array.from(targetCells);
    }

    function applyTemplateEditorTableResizeValue(table, kind, lineIndex, nextSize) {
      if (kind === "column") {
        setTemplateEditorTableLogicalColumnWidth(table, lineIndex, nextSize);
        return;
      }

      setTemplateEditorTableLogicalRowHeight(table, lineIndex, nextSize);
    }

    function handleTemplateEditorTableResizeMove(event) {
      const resizeSession = state.templateEditor.tableResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const delta =
        resizeSession.kind === "column" ? event.clientX - resizeSession.startX : event.clientY - resizeSession.startY;
      const nextSize = Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(resizeSession.startSize + delta));

      if (nextSize === resizeSession.lastSize) {
        return;
      }

      resizeSession.lastSize = nextSize;
      resizeSession.didChange = true;
      applyTemplateEditorTableResizeValue(resizeSession.table, resizeSession.kind, resizeSession.lineIndex, nextSize);
      updateTemplateTableControls();
    }

    function releaseTemplateEditorTableResizeSession({ sync = true } = {}) {
      const resizeSession = state.templateEditor.tableResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!resizeSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorTableResizeMove);
      window.removeEventListener("pointerup", handleTemplateEditorTableResizeEnd);
      window.removeEventListener("pointercancel", handleTemplateEditorTableResizeEnd);
      state.templateEditor.tableResizeSession = null;
      templateEditorSurface?.classList.remove("is-table-resizing", "is-table-column-resizing", "is-table-row-resizing");
      clearTemplateEditorTableHoverState();

      if (sync && resizeSession.didChange) {
        focusTemplateEditorCell(resizeSession.cell);
        syncTemplateEditorContent();
        updateTemplateTableControls();
        return;
      }

      updateTemplateTableControls();
    }

    function handleTemplateEditorTableResizeEnd(event) {
      const resizeSession = state.templateEditor.tableResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorTableResizeSession({ sync: true });
    }

    function startTemplateEditorTableResizeSession(resizeHit, event) {
      const templateEditorSurface = getTemplateEditorSurface();
      const targetCells =
        resizeHit.kind === "row" ? getTemplateEditorTableLineCells(resizeHit.table, resizeHit.kind, resizeHit.lineIndex) : [];

      if (resizeHit.kind === "row" && targetCells.length === 0) {
        return false;
      }

      const startSize =
        resizeHit.kind === "column"
          ? getTemplateEditorTableLogicalColumnWidth(resizeHit.table, resizeHit.lineIndex)
          : Math.max(Math.round(resizeHit.cell.getBoundingClientRect().height), TEMPLATE_EDITOR_TABLE_MIN_SIZE);

      clearTemplateEditorTableSelection();
      state.templateEditor.tableResizeSession = {
        pointerId: event.pointerId,
        kind: resizeHit.kind,
        table: resizeHit.table,
        cell: resizeHit.cell,
        lineIndex: resizeHit.lineIndex,
        targetCells,
        startX: event.clientX,
        startY: event.clientY,
        startSize,
        lastSize: startSize,
        didChange: false,
      };

      templateEditorSurface?.classList.add(
        "is-table-resizing",
        resizeHit.kind === "column" ? "is-table-column-resizing" : "is-table-row-resizing",
      );
      clearTemplateEditorTableHoverState();
      window.addEventListener("pointermove", handleTemplateEditorTableResizeMove);
      window.addEventListener("pointerup", handleTemplateEditorTableResizeEnd);
      window.addEventListener("pointercancel", handleTemplateEditorTableResizeEnd);
      return true;
    }

    return Object.freeze({
      clearTemplateEditorTableHoverState,
      getTemplateEditorTableResizeHit,
      releaseTemplateEditorTableResizeSession,
      startTemplateEditorTableResizeSession,
      updateTemplateEditorTableHoverState,
    });
  }

  return Object.freeze({
    createTemplateEditorTableResizeController,
  });
});
