(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeSelectionRange = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createLoginNoticeSelectionRangeController({
    getLoginNoticeEditorElement,
    getLoginNoticeEditorEmptyMarkup,
    state,
    updateLoginNoticeEditorActiveCell,
    updateLoginNoticeFormattingControls,
  }) {
    function getLoginNoticeSelectionNode() {
      const noticeEditor = getLoginNoticeEditorElement();
      const selection = window.getSelection();
      const activeNode = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
      const baseElement = activeNode?.nodeType === Node.ELEMENT_NODE ? activeNode : activeNode?.parentElement;

      if (baseElement && noticeEditor?.contains(baseElement)) {
        return activeNode;
      }

      return null;
    }

    function getClosestLoginNoticeElement(node, selector) {
      const noticeEditor = getLoginNoticeEditorElement();
      const baseElement = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

      if (!baseElement || !noticeEditor?.contains(baseElement)) {
        return null;
      }

      return baseElement.closest(selector);
    }

    function getLoginNoticeSelectedCell() {
      return getClosestLoginNoticeElement(getLoginNoticeSelectionNode(), "td, th");
    }

    function getLoginNoticeSelectedCells() {
      const selectedCell = getLoginNoticeSelectedCell();
      const selection = window.getSelection();
      const noticeEditor = getLoginNoticeEditorElement();
      const table = selectedCell?.closest("table");

      if (!selectedCell || !selection || selection.rangeCount === 0 || !table || !noticeEditor?.contains(selection.anchorNode)) {
        return selectedCell ? [selectedCell] : [];
      }

      const range = selection.getRangeAt(0);
      const selectedCells = Array.from(table.querySelectorAll("td, th")).filter((cell) => {
        try {
          return range.intersectsNode(cell);
        } catch (error) {
          return false;
        }
      });

      return selectedCells.length > 0 ? selectedCells : [selectedCell];
    }

    function focusLoginNoticeEditorCell(cell) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return;
      }

      if (!cell) {
        placeCaretAtEndOfLoginNoticeEditor();
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
      captureLoginNoticeEditorSelection();
      updateLoginNoticeEditorActiveCell();
      updateLoginNoticeFormattingControls();
    }

    function getLoginNoticeNodePath(node) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor || !node) {
        return null;
      }

      const path = [];
      let currentNode = node;

      while (currentNode && currentNode !== noticeEditor) {
        const parentNode = currentNode.parentNode;

        if (!parentNode) {
          return null;
        }

        path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
        currentNode = parentNode;
      }

      return currentNode === noticeEditor ? path : null;
    }

    function resolveLoginNoticeNodePath(path) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor || !Array.isArray(path)) {
        return null;
      }

      let currentNode = noticeEditor;

      for (const index of path) {
        currentNode = currentNode?.childNodes?.[index] || null;

        if (!currentNode) {
          return null;
        }
      }

      return currentNode;
    }

    function getLoginNoticeNodeMaxOffset(node) {
      if (!node) {
        return 0;
      }

      return node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
    }

    function createLoginNoticeSelectionSnapshot() {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return null;
      }

      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0 && noticeEditor.contains(selection.anchorNode)
          ? selection.getRangeAt(0)
          : null;

      if (!range) {
        return state.loginNotice.selectionSnapshot;
      }

      const startPath = getLoginNoticeNodePath(range.startContainer);
      const endPath = getLoginNoticeNodePath(range.endContainer);

      if (!startPath || !endPath) {
        return null;
      }

      return {
        startPath,
        startOffset: range.startOffset,
        endPath,
        endOffset: range.endOffset,
      };
    }

    function restoreLoginNoticeSelectionSnapshot(snapshot) {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor || !snapshot) {
        return false;
      }

      const startNode = resolveLoginNoticeNodePath(snapshot.startPath);
      const endNode = resolveLoginNoticeNodePath(snapshot.endPath);

      if (!startNode || !endNode) {
        return false;
      }

      const range = document.createRange();
      const selection = window.getSelection();

      try {
        range.setStart(startNode, Math.min(snapshot.startOffset, getLoginNoticeNodeMaxOffset(startNode)));
        range.setEnd(endNode, Math.min(snapshot.endOffset, getLoginNoticeNodeMaxOffset(endNode)));
      } catch (error) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);
      state.loginNotice.selectionSnapshot = createLoginNoticeSelectionSnapshot();
      return true;
    }

    function captureLoginNoticeEditorSelection() {
      const snapshot = createLoginNoticeSelectionSnapshot();

      if (snapshot) {
        state.loginNotice.selectionSnapshot = snapshot;
      }
    }

    function placeCaretAtEndOfLoginNoticeEditor() {
      const documentElement = getLoginNoticeEditorElement();
      const selection = window.getSelection();

      if (!documentElement || !selection) {
        return;
      }

      if (!String(documentElement.innerHTML || "").trim()) {
        documentElement.innerHTML = getLoginNoticeEditorEmptyMarkup();
      }

      const range = document.createRange();

      range.selectNodeContents(documentElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      captureLoginNoticeEditorSelection();
    }

    function restoreLoginNoticeEditorSelection() {
      const noticeEditor = getLoginNoticeEditorElement();

      if (!noticeEditor) {
        return;
      }

      if (restoreLoginNoticeSelectionSnapshot(state.loginNotice.selectionSnapshot)) {
        return;
      }

      noticeEditor.focus();
      placeCaretAtEndOfLoginNoticeEditor();
    }

    return Object.freeze({
      captureLoginNoticeEditorSelection,
      createLoginNoticeSelectionSnapshot,
      focusLoginNoticeEditorCell,
      getClosestLoginNoticeElement,
      getLoginNoticeSelectedCell,
      getLoginNoticeSelectedCells,
      getLoginNoticeSelectionNode,
      placeCaretAtEndOfLoginNoticeEditor,
      restoreLoginNoticeEditorSelection,
      restoreLoginNoticeSelectionSnapshot,
    });
  }

  return Object.freeze({
    createLoginNoticeSelectionRangeController,
  });
});
