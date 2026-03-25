(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorRuntime = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorRuntimeController({
    EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    applySharedEditorCommand,
    applySharedEditorFontFamily,
    applySharedEditorFontSize,
    applyTemplateEditorTableSelectionCommand,
    applyTemplateEditorTableSelectionFontFamily,
    applyTemplateEditorTableSelectionFontSize,
    getTemplateEditorBlockTypeElement,
    getTemplateEditorFontFamilyElement,
    getTemplateEditorFontSizeElement,
    getTemplateEditorSurface,
    getTemplateEditorTextColorElement,
    getTemplateEditorTextShadingElement,
    redoTemplateEditorHistory,
    restoreTemplateEditorSelection,
    saveTemplateEditorSelection,
    setTemplateEditorStatus,
    syncTemplateEditorContent,
    undoTemplateEditorHistory,
    updateTemplateEditorActiveCell,
  }) {
    function applyTemplateEditorCommand(command, value = "") {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      const normalizedValue =
        command === "hiliteColor" && !String(value || "").trim()
          ? getTemplateEditorTextShadingElement()?.value || "#fff59d"
          : command === "foreColor" && !String(value || "").trim()
            ? getTemplateEditorTextColorElement()?.value || EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR
            : value;

      applySharedEditorCommand({
        rootElement: templateEditorSurface,
        focusElement: templateEditorSurface,
        restoreSelection: restoreTemplateEditorSelection,
        syncContent: syncTemplateEditorContent,
        onUndo: undoTemplateEditorHistory,
        onRedo: redoTemplateEditorHistory,
        applyTableSelectionCommand: applyTemplateEditorTableSelectionCommand,
        command,
        value: normalizedValue,
        fontFamilyElement: getTemplateEditorFontFamilyElement(),
        defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
        fontSizeElement: getTemplateEditorFontSizeElement(),
        defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
        setStatus: setTemplateEditorStatus,
        syncOptions: { preserveSelection: true, focusEditor: true },
        onFormatBlockApplied: (nextValue) => {
          const blockTypeElement = getTemplateEditorBlockTypeElement();

          if (blockTypeElement && nextValue) {
            blockTypeElement.value = nextValue;
          }
        },
      });
    }

    function applyTemplateEditorFontFamily(rawFontFamily) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      applySharedEditorFontFamily({
        rootElement: templateEditorSurface,
        focusElement: templateEditorSurface,
        restoreSelection: restoreTemplateEditorSelection,
        syncContent: syncTemplateEditorContent,
        applyTableSelectionFontFamily: applyTemplateEditorTableSelectionFontFamily,
        rawFontFamily,
        fontFamilyElement: getTemplateEditorFontFamilyElement(),
        defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
        syncOptions: { preserveSelection: true, focusEditor: true },
      });
    }

    function applyTemplateEditorFontSize(rawFontSize) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return;
      }

      applySharedEditorFontSize({
        rootElement: templateEditorSurface,
        focusElement: templateEditorSurface,
        restoreSelection: restoreTemplateEditorSelection,
        syncContent: syncTemplateEditorContent,
        applyTableSelectionFontSize: applyTemplateEditorTableSelectionFontSize,
        rawFontSize,
        fontSizeElement: getTemplateEditorFontSizeElement(),
        defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
        setStatus: setTemplateEditorStatus,
        syncOptions: { preserveSelection: true, focusEditor: true },
      });
    }

    function getTemplateEditorDocumentElement() {
      return getTemplateEditorSurface()?.querySelector(".template-doc") || null;
    }

    function getTemplateEditorImageOverlayContainer() {
      return getTemplateEditorDocumentElement() || getTemplateEditorSurface()?.closest(".template-editor-page") || null;
    }

    function placeCaretAtEnd(element) {
      if (!element) {
        return;
      }

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      saveTemplateEditorSelection();
      updateTemplateEditorActiveCell();
    }

    return Object.freeze({
      applyTemplateEditorCommand,
      applyTemplateEditorFontFamily,
      applyTemplateEditorFontSize,
      getTemplateEditorDocumentElement,
      getTemplateEditorImageOverlayContainer,
      placeCaretAtEnd,
    });
  }

  return Object.freeze({
    createTemplateEditorRuntimeController,
  });
});
