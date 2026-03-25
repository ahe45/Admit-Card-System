(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createLoginNoticeEventHandlers({
    applyLoginNoticeEditorCommand,
    captureLoginNoticeEditorSelection,
    getLoginNoticeEditorElement,
    getLoginNoticeImageInputElement,
    handleLoginNoticeAction,
    handleLoginNoticeInsert,
    handleLoginNoticeTableAction,
    insertLoginNoticeImage,
    redoLoginNoticeEditorHistory,
    state,
    syncEditorToolbarFontSizeMenuSelection,
    syncLoginNoticeEditorDraft,
    undoLoginNoticeEditorHistory,
    updateLoginNoticeEditorActiveCell,
    updateLoginNoticeFormattingControls,
  }) {
    async function handleClick(event) {
      const noticeCommandTrigger = event.target.closest("button[data-notice-command]");
      const noticeActionTrigger = event.target.closest("button[data-notice-action]");
      const noticeInsertTrigger = event.target.closest("button[data-notice-insert]");
      const noticeTableActionTrigger = event.target.closest("button[data-notice-table-action]");
      const noticeOpenImageTrigger = event.target.closest("button[data-notice-open-image]");

      if (noticeCommandTrigger) {
        applyLoginNoticeEditorCommand(noticeCommandTrigger.dataset.noticeCommand);
        return true;
      }

      if (noticeActionTrigger) {
        await handleLoginNoticeAction(noticeActionTrigger.dataset.noticeAction);
        return true;
      }

      if (noticeInsertTrigger) {
        handleLoginNoticeInsert(noticeInsertTrigger.dataset.noticeInsert);
        return true;
      }

      if (noticeTableActionTrigger) {
        handleLoginNoticeTableAction(noticeTableActionTrigger.dataset.noticeTableAction);
        return true;
      }

      if (noticeOpenImageTrigger) {
        getLoginNoticeImageInputElement?.()?.click();
        return true;
      }

      return false;
    }

    function handlePointerDown(event) {
      const noticeToolbarTrigger = event.target.closest(
        "button[data-notice-command], button[data-notice-action], button[data-notice-insert], button[data-notice-table-action], button[data-notice-open-image], button[data-editor-color-preset], button[data-editor-color-apply], button[data-editor-color-toggle], button[data-editor-color-direct]",
      );
      const noticeFontSizeTrigger = event.target.closest(
        ".login-notice-editor-toolbar [data-editor-font-size-toggle], .login-notice-editor-toolbar [data-editor-font-size-option]",
      );
      const noticeToolbarSelectionControl = event.target.closest(
        "#loginNoticeFontFamily, #loginNoticeFontSize, #loginNoticeTextColor, #loginNoticeTextShading, #loginNoticeCellShading, #loginNoticeTableRows, #loginNoticeTableColumns",
      );

      if (noticeToolbarTrigger || noticeFontSizeTrigger) {
        captureLoginNoticeEditorSelection();
        event.preventDefault();
        return true;
      }

      if (noticeToolbarSelectionControl) {
        captureLoginNoticeEditorSelection();
        return true;
      }

      return false;
    }

    function handleKeydown(event) {
      const loginNoticeEditor = getLoginNoticeEditorElement?.();
      const loginNoticeTableInsertPanel = document.getElementById("loginNoticeTableInsertPanel");
      const isLoginNoticeShortcutTarget =
        state.currentView === "loginNoticeSettings" &&
        loginNoticeEditor &&
        (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target));
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const normalizedKey = String(event.key || "").toLowerCase();
      const isLoginNoticeTableInsertField = event.target?.id === "loginNoticeTableRows" || event.target?.id === "loginNoticeTableColumns";
      const isLoginNoticeFontSizeField = event.target?.id === "loginNoticeFontSize";

      if (isLoginNoticeShortcutTarget && isModifierPressed && !event.altKey) {
        if (normalizedKey === "z" && event.shiftKey) {
          event.preventDefault();
          redoLoginNoticeEditorHistory();
          return true;
        }

        if (normalizedKey === "z") {
          event.preventDefault();
          undoLoginNoticeEditorHistory();
          return true;
        }

        if (normalizedKey === "y") {
          event.preventDefault();
          redoLoginNoticeEditorHistory();
          return true;
        }
      }

      if (
        isLoginNoticeTableInsertField &&
        event.key === "Enter" &&
        loginNoticeTableInsertPanel &&
        !loginNoticeTableInsertPanel.classList.contains("hidden")
      ) {
        event.preventDefault();
        handleLoginNoticeInsert("table-confirm");
        return true;
      }

      if (isLoginNoticeFontSizeField && event.key === "Enter") {
        event.preventDefault();
        applyLoginNoticeEditorCommand("fontSizePx", event.target.value);
        return true;
      }

      return false;
    }

    async function handleChange(event) {
      const noticeCommandSelect = event.target.matches("select[data-notice-command]") ? event.target : null;

      if (event.target.id === "loginNoticeImageInput") {
        insertLoginNoticeImage(event.target.files?.[0]);
        event.target.value = "";
        return true;
      }

      if (event.target.id === "loginNoticeFontSize") {
        if (!event.target.value) {
          return true;
        }

        applyLoginNoticeEditorCommand("fontSizePx", event.target.value);
        return true;
      }

      if (noticeCommandSelect) {
        if (!noticeCommandSelect.value) {
          return true;
        }

        applyLoginNoticeEditorCommand(noticeCommandSelect.dataset.noticeCommand, noticeCommandSelect.value);
        return true;
      }

      return false;
    }

    function handleInput(event) {
      const loginNoticeEditor = getLoginNoticeEditorElement?.();

      if (loginNoticeEditor && (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target))) {
        captureLoginNoticeEditorSelection();
        syncLoginNoticeEditorDraft();
        return true;
      }

      if (event.target.matches('input[data-notice-command="foreColor"], input[data-notice-command="hiliteColor"]')) {
        applyLoginNoticeEditorCommand(event.target.dataset.noticeCommand, event.target.value);
        return true;
      }

      if (event.target.id === "loginNoticeFontSize") {
        syncEditorToolbarFontSizeMenuSelection(event.target, event.target.value);
        return true;
      }

      return false;
    }

    function handleSelectionChange() {
      captureLoginNoticeEditorSelection();
      updateLoginNoticeEditorActiveCell();
      updateLoginNoticeFormattingControls();
    }

    function handlePaste(event) {
      const loginNoticeEditor = getLoginNoticeEditorElement?.();

      if (loginNoticeEditor && (event.target === loginNoticeEditor || loginNoticeEditor.contains(event.target))) {
        window.setTimeout(() => {
          captureLoginNoticeEditorSelection();
          syncLoginNoticeEditorDraft();
        }, 0);
        return true;
      }

      return false;
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleInput,
      handleKeydown,
      handlePaste,
      handlePointerDown,
      handleSelectionChange,
    });
  }

  return Object.freeze({
    createLoginNoticeEventHandlers,
  });
});
