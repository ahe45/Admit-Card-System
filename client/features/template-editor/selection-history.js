(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorSelectionHistory = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorSelectionHistoryController({
    TEMPLATE_EDITOR_HISTORY_LIMIT,
    clearTemplateEditorImageSelection,
    clearTemplateEditorTableSelection,
    createTemplateEditorSelectionSnapshot,
    decorateTemplateEditorImages,
    getTemplateEditorActiveTableSelection,
    getTemplateEditorSerializedHtml,
    getTemplateEditorSurface,
    normalizeTemplateEditorFontNodes,
    normalizeTemplateEditorTables,
    normalizeTemplateTagNodes,
    placeCaretAtTemplateEditorEnd,
    releaseTemplateEditorTableResizeSession,
    releaseTemplateEditorTableSelectionSession,
    restoreTemplateEditorSelectionSnapshot,
    saveTemplateEditorSelection,
    setTemplateEditorStatus,
    state,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateEditorImageSelectionOverlay,
    updateTemplateTableControls,
  }) {
    function recordTemplateEditorHistorySnapshot({ force = false } = {}) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface || state.templateEditor.isRestoringHistory) {
        return;
      }

      const snapshot = {
        html: getTemplateEditorSerializedHtml(),
        selection: createTemplateEditorSelectionSnapshot(),
      };
      const currentSnapshot = state.templateEditor.historyEntries[state.templateEditor.historyIndex];

      if (!force && currentSnapshot?.html === snapshot.html) {
        if (currentSnapshot) {
          currentSnapshot.selection = snapshot.selection;
        }
        return;
      }

      state.templateEditor.historyEntries = state.templateEditor.historyEntries.slice(0, state.templateEditor.historyIndex + 1);
      state.templateEditor.historyEntries.push(snapshot);

      if (state.templateEditor.historyEntries.length > TEMPLATE_EDITOR_HISTORY_LIMIT) {
        state.templateEditor.historyEntries.shift();
      }

      state.templateEditor.historyIndex = state.templateEditor.historyEntries.length - 1;
    }

    function initializeTemplateEditorHistory() {
      state.templateEditor.historyEntries = [];
      state.templateEditor.historyIndex = -1;
      recordTemplateEditorHistorySnapshot({ force: true });
    }

    function applyTemplateEditorHistorySnapshot(snapshot) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface || !snapshot) {
        return;
      }

      state.templateEditor.isRestoringHistory = true;
      clearTemplateEditorImageSelection();
      releaseTemplateEditorTableResizeSession({ sync: false });
      releaseTemplateEditorTableSelectionSession({ keepSelection: false });
      clearTemplateEditorTableSelection();
      templateEditorSurface.innerHTML = snapshot.html;
      decorateTemplateEditorImages(templateEditorSurface);
      syncTemplateEditorContent();

      if (!restoreTemplateEditorSelectionSnapshot(snapshot.selection)) {
        placeCaretAtTemplateEditorEnd();
      }

      state.templateEditor.isRestoringHistory = false;
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
      updateTemplateTableControls();
    }

    function undoTemplateEditorHistory() {
      if (state.templateEditor.historyIndex <= 0) {
        return;
      }

      state.templateEditor.historyIndex -= 1;
      applyTemplateEditorHistorySnapshot(state.templateEditor.historyEntries[state.templateEditor.historyIndex]);
    }

    function redoTemplateEditorHistory() {
      if (state.templateEditor.historyIndex >= state.templateEditor.historyEntries.length - 1) {
        return;
      }

      state.templateEditor.historyIndex += 1;
      applyTemplateEditorHistorySnapshot(state.templateEditor.historyEntries[state.templateEditor.historyIndex]);
    }

    function isTemplateEditorOverflow() {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return false;
      }

      const heightOverflow = templateEditorSurface.scrollHeight - templateEditorSurface.clientHeight;
      const widthOverflow = templateEditorSurface.scrollWidth - templateEditorSurface.clientWidth;

      return heightOverflow > 12 || widthOverflow > 12;
    }

    function syncTemplateEditorContent(options = {}) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      const preserveSelection = Boolean(options.preserveSelection);
      const focusEditor = Boolean(options.focusEditor);
      const selectionSnapshot = preserveSelection ? createTemplateEditorSelectionSnapshot() : null;

      normalizeTemplateEditorFontNodes(templateEditorSurface);
      normalizeTemplateTagNodes(templateEditorSurface);
      normalizeTemplateEditorTables(templateEditorSurface);
      decorateTemplateEditorImages(templateEditorSurface);

      if (!getTemplateEditorActiveTableSelection()) {
        clearTemplateEditorTableSelection();
      }

      const serializedHtml = getTemplateEditorSerializedHtml();
      state.templateEditor.draftHtml = serializedHtml;
      state.templateEditor.hasOverflow = isTemplateEditorOverflow();

      if (state.templateEditor.hasOverflow) {
        setTemplateEditorStatus("A4 영역을 초과했습니다. 편집은 가능하지만 저장 전 내용 길이를 줄여야 합니다.", "warning");
      } else {
        state.templateEditor.lastValidHtml = serializedHtml;
        setTemplateEditorStatus("A4 영역 안에서 편집 중입니다.");
      }

      if (selectionSnapshot && focusEditor) {
        templateEditorSurface.focus();
      }

      if (!(selectionSnapshot && restoreTemplateEditorSelectionSnapshot(selectionSnapshot))) {
        saveTemplateEditorSelection();
      }

      recordTemplateEditorHistorySnapshot();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();

      if (
        state.templateEditor.selectedImageElement &&
        !templateEditorSurface.contains(state.templateEditor.selectedImageElement)
      ) {
        clearTemplateEditorImageSelection();
      } else {
        updateTemplateEditorImageSelectionOverlay();
      }
    }

    return Object.freeze({
      initializeTemplateEditorHistory,
      redoTemplateEditorHistory,
      syncTemplateEditorContent,
      undoTemplateEditorHistory,
    });
  }

  return Object.freeze({
    createTemplateEditorSelectionHistoryController,
  });
});
