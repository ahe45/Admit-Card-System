(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorToolbarState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorToolbarStateController({
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    getTemplateEditorActiveTableSelection,
    getTemplateEditorCellShadingElement,
    getTemplateEditorCellShadingValue,
    getTemplateEditorCellWidthElement,
    getTemplateEditorFontFamilyElement,
    getTemplateEditorFontSizeElement,
    getTemplateEditorModal,
    getTemplateEditorPixelValue,
    getTemplateEditorRowHeightElement,
    getTemplateEditorSelectedCell,
    getTemplateEditorSelectionNode,
    getTemplateEditorSurface,
    getTemplateEditorTextColorElement,
    getTemplateEditorTextShadingElement,
    syncEditorToolbarColorControls,
    updateEditorToolbarFormattingState,
  }) {
    function getTemplateEditorFormattingTargetCells() {
      const tableSelection = getTemplateEditorActiveTableSelection();
      const templateEditorSurface = getTemplateEditorSurface();

      if (!tableSelection?.selectedCells?.length || !templateEditorSurface) {
        return [];
      }

      return tableSelection.selectedCells.filter((cell) => templateEditorSurface.contains(cell));
    }

    function updateTemplateEditorFormattingControls() {
      const templateEditorSurface = getTemplateEditorSurface();
      const templateEditorModal = getTemplateEditorModal();
      const templateEditorFontFamily = getTemplateEditorFontFamilyElement();
      const templateEditorFontSize = getTemplateEditorFontSizeElement();
      const templateEditorTextColor = getTemplateEditorTextColorElement();
      const templateEditorTextShading = getTemplateEditorTextShadingElement();

      if (
        !templateEditorSurface ||
        !templateEditorModal ||
        templateEditorModal.classList.contains("hidden") ||
        document.activeElement === templateEditorFontFamily ||
        document.activeElement === templateEditorFontSize ||
        document.activeElement === templateEditorTextColor ||
        document.activeElement === templateEditorTextShading
      ) {
        return;
      }

      const selectionNode = getTemplateEditorSelectionNode();
      const contextElement = getTemplateEditorFormattingTargetCells()[0] || getTemplateEditorSelectedCell();

      updateEditorToolbarFormattingState({
        rootElement: templateEditorSurface,
        commandAttributeName: "data-template-command",
        fontFamilyElement: templateEditorFontFamily,
        fontSizeElement: templateEditorFontSize,
        textColorElement: templateEditorTextColor,
        textShadingElement: templateEditorTextShading,
        selectionNode,
        contextElement,
        defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
        defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
      });
    }

    function updateTemplateTableControls() {
      const templateEditorModal = getTemplateEditorModal();
      const templateEditorCellWidth = getTemplateEditorCellWidthElement();
      const templateEditorRowHeight = getTemplateEditorRowHeightElement();
      const templateEditorCellShading = getTemplateEditorCellShadingElement();

      if (
        !templateEditorModal ||
        templateEditorModal.classList.contains("hidden") ||
        document.activeElement === templateEditorCellWidth ||
        document.activeElement === templateEditorRowHeight ||
        document.activeElement === templateEditorCellShading
      ) {
        return;
      }

      const selectedCell = getTemplateEditorSelectedCell();

      if (templateEditorCellWidth) {
        templateEditorCellWidth.value = getTemplateEditorPixelValue(selectedCell, "width");
      }

      if (templateEditorRowHeight) {
        templateEditorRowHeight.value = getTemplateEditorPixelValue(selectedCell, "height");
      }

      if (templateEditorCellShading) {
        syncEditorToolbarColorControls({
          colorInputElement: templateEditorCellShading,
          colorValue: getTemplateEditorCellShadingValue(selectedCell),
          fallbackValue: "#ffffff",
        });
      }
    }

    return Object.freeze({
      getTemplateEditorFormattingTargetCells,
      updateTemplateEditorFormattingControls,
      updateTemplateTableControls,
    });
  }

  return Object.freeze({
    createTemplateEditorToolbarStateController,
  });
});
