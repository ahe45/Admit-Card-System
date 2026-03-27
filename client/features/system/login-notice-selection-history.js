(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeSelectionHistory = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createLoginNoticeSelectionHistoryController({
    LOGIN_NOTICE_EDITOR_HISTORY_LIMIT,
    buildLoginNoticeEditorMarkup,
    createLoginNoticeSelectionSnapshot,
    decorateTemplateGeneratedObjectImage,
    getLoginNoticeEditorElement,
    getLoginNoticeEditorEmptyMarkup,
    getLoginNoticeMarkup,
    getLoginNoticePreviewElement,
    getTemplateGeneratedObjectPreviewExamineeProvider,
    getLoginNoticeSerializedHtml,
    normalizeTemplateEditorFontNodes,
    normalizeTemplateEditorTables,
    placeCaretAtEndOfLoginNoticeEditor,
    restoreLoginNoticeSelectionSnapshot,
    setLoginNoticeEditorStatus,
    state,
    updateLoginNoticeEditorActiveCell,
    updateLoginNoticeFormattingControls,
  }) {
    function getActiveNoticeScopeLabel() {
      return state.noticeManagement?.activeScope === "applicant" ? "접수화면" : "로그인화면";
    }

    function syncLoginNoticePreview() {
      const previewElement = getLoginNoticePreviewElement();

      if (!previewElement) {
        return;
      }

      previewElement.innerHTML = getLoginNoticeMarkup(state.loginNotice.draftHtml);
    }

    function recordLoginNoticeHistorySnapshot({ force = false } = {}) {
      if (!getLoginNoticeEditorElement() || state.loginNotice.isRestoringHistory) {
        return;
      }

      const snapshot = {
        html: getLoginNoticeSerializedHtml(),
        selection: createLoginNoticeSelectionSnapshot(),
      };
      const currentSnapshot = state.loginNotice.historyEntries[state.loginNotice.historyIndex];

      if (!force && currentSnapshot?.html === snapshot.html) {
        if (currentSnapshot) {
          currentSnapshot.selection = snapshot.selection;
        }
        return;
      }

      state.loginNotice.historyEntries = state.loginNotice.historyEntries.slice(0, state.loginNotice.historyIndex + 1);
      state.loginNotice.historyEntries.push(snapshot);

      if (state.loginNotice.historyEntries.length > LOGIN_NOTICE_EDITOR_HISTORY_LIMIT) {
        state.loginNotice.historyEntries.shift();
      }

      state.loginNotice.historyIndex = state.loginNotice.historyEntries.length - 1;
    }

    function restoreLoginNoticeHistorySnapshot(index) {
      const noticeEditor = getLoginNoticeEditorElement();
      const documentElement = getLoginNoticeEditorElement();
      const snapshot = state.loginNotice.historyEntries[index];

      if (!noticeEditor || !documentElement || !snapshot) {
        return;
      }

      state.loginNotice.isRestoringHistory = true;
      state.loginNotice.historyIndex = index;
      state.loginNotice.draftHtml = snapshot.html || "";
      state.loginNotice.selectionSnapshot = snapshot.selection || null;

      documentElement.innerHTML = snapshot.html || getLoginNoticeEditorEmptyMarkup();
      normalizeTemplateEditorFontNodes(documentElement);
      syncLoginNoticePreview();
      setLoginNoticeEditorStatus(`${getActiveNoticeScopeLabel()} 공지사항을 편집 중입니다.`);

      noticeEditor.focus();

      if (!restoreLoginNoticeSelectionSnapshot(snapshot.selection)) {
        placeCaretAtEndOfLoginNoticeEditor();
      }

      state.loginNotice.isRestoringHistory = false;
      updateLoginNoticeEditorActiveCell();
      updateLoginNoticeFormattingControls();
    }

    function undoLoginNoticeEditorHistory() {
      if (state.loginNotice.historyIndex <= 0) {
        return;
      }

      restoreLoginNoticeHistorySnapshot(state.loginNotice.historyIndex - 1);
    }

    function redoLoginNoticeEditorHistory() {
      if (state.loginNotice.historyIndex >= state.loginNotice.historyEntries.length - 1) {
        return;
      }

      restoreLoginNoticeHistorySnapshot(state.loginNotice.historyIndex + 1);
    }

    function syncLoginNoticeEditorDraft({ forceHistory = false } = {}) {
      const documentElement = getLoginNoticeEditorElement();

      if (!documentElement) {
        return;
      }

      normalizeTemplateEditorFontNodes(documentElement);
      normalizeTemplateEditorTables(documentElement);
      documentElement.querySelectorAll("img[data-template-object-type]").forEach((imageElement) => {
        decorateTemplateGeneratedObjectImage(imageElement, {
          getPreviewExaminee: getTemplateGeneratedObjectPreviewExamineeProvider(),
        });
      });
      state.loginNotice.draftHtml = getLoginNoticeSerializedHtml();
      state.loginNotice.selectionSnapshot = createLoginNoticeSelectionSnapshot();
      recordLoginNoticeHistorySnapshot({ force: forceHistory });
      setLoginNoticeEditorStatus(`${getActiveNoticeScopeLabel()} 공지사항을 편집 중입니다.`);
      updateLoginNoticeEditorActiveCell();
      updateLoginNoticeFormattingControls();
      syncLoginNoticePreview();
    }

    return Object.freeze({
      buildLoginNoticeEditorMarkup,
      redoLoginNoticeEditorHistory,
      syncLoginNoticeEditorDraft,
      syncLoginNoticePreview,
      undoLoginNoticeEditorHistory,
    });
  }

  return Object.freeze({
    createLoginNoticeSelectionHistoryController,
  });
});
