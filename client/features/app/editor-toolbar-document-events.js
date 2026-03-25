(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardEditorToolbarDocumentEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarDocumentEventHandlers({
    applyEditorToolbarColorTrigger,
    applyLoginNoticeEditorCommand,
    closeAllEditorToolbarColorPanels,
    closeAllEditorToolbarFontSizeMenus,
    closeAllEditorToolbarTableInsertPanels,
    getEditorToolbarColorPickerElements,
    setEditorToolbarColorPanelVisibility,
    setEditorToolbarFontSizeMenuVisibility,
  }) {
    function prepareClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const tableInsertPopoverTrigger = target?.closest(".template-toolbar-table-insert-popover") || null;
      const fontSizeComboTrigger = target?.closest(".template-toolbar-font-size-combo") || null;
      const colorPickerTrigger = target?.closest(".template-toolbar-color-picker") || null;

      if (!tableInsertPopoverTrigger) {
        closeAllEditorToolbarTableInsertPanels();
      }

      if (!fontSizeComboTrigger) {
        closeAllEditorToolbarFontSizeMenus();
      }

      if (!colorPickerTrigger) {
        closeAllEditorToolbarColorPanels();
      }
    }

    function handleClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const fontSizeToggleTrigger = target?.closest("[data-editor-font-size-toggle]") || null;
      const fontSizeOptionTrigger = target?.closest("[data-editor-font-size-option]") || null;
      const colorToggleTrigger = target?.closest("[data-editor-color-toggle]") || null;
      const colorDirectTrigger = target?.closest("[data-editor-color-direct]") || null;
      const colorPresetTrigger = target?.closest("[data-editor-color-preset]") || null;
      const colorApplyTrigger = target?.closest("[data-editor-color-apply]") || null;

      if (fontSizeToggleTrigger) {
        const inputId = fontSizeToggleTrigger.dataset.editorFontSizeToggle;
        const comboElement = fontSizeToggleTrigger.closest(".template-toolbar-font-size-combo");
        const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu");
        const nextOpen = menuElement?.classList.contains("hidden") ?? true;

        setEditorToolbarFontSizeMenuVisibility(inputId, nextOpen);
        return true;
      }

      if (fontSizeOptionTrigger) {
        const comboMenu = fontSizeOptionTrigger.closest(".template-toolbar-combo-menu");
        const inputId = comboMenu?.dataset.editorFontSizeMenuFor || "";
        const fontSize = fontSizeOptionTrigger.dataset.editorFontSizeOption || "";

        if (!inputId || !fontSize) {
          return true;
        }

        const inputElement = document.getElementById(inputId);

        if (inputElement) {
          inputElement.value = fontSize;
        }

        if (inputId === "loginNoticeFontSize") {
          applyLoginNoticeEditorCommand("fontSizePx", fontSize);
        }

        setEditorToolbarFontSizeMenuVisibility(inputId, false);
        return true;
      }

      if (colorToggleTrigger) {
        const inputId = colorToggleTrigger.dataset.editorColorToggle || "";
        const { panelElement } = getEditorToolbarColorPickerElements(inputId);
        const nextVisible = panelElement?.classList.contains("hidden") ?? true;

        setEditorToolbarColorPanelVisibility(inputId, nextVisible);
        return true;
      }

      if (colorDirectTrigger) {
        const inputId = colorDirectTrigger.dataset.editorColorInput || "";
        const { inputElement } = getEditorToolbarColorPickerElements(inputId);

        if (inputElement?.showPicker) {
          inputElement.showPicker();
          return true;
        }

        inputElement?.click();
        return true;
      }

      if (colorPresetTrigger || colorApplyTrigger) {
        applyEditorToolbarColorTrigger(colorPresetTrigger || colorApplyTrigger);
        closeAllEditorToolbarColorPanels();
        return true;
      }

      return false;
    }

    function handleEscape() {
      return (
        closeAllEditorToolbarFontSizeMenus() ||
        closeAllEditorToolbarColorPanels() ||
        closeAllEditorToolbarTableInsertPanels()
      );
    }

    function handleChange(event) {
      const target = event.target instanceof Element ? event.target : null;
      const toolbarColorInput = target?.matches(".template-toolbar-color") ? target : null;

      if (!toolbarColorInput) {
        return false;
      }

      applyEditorToolbarColorTrigger(toolbarColorInput);
      closeAllEditorToolbarColorPanels();
      return true;
    }

    function handleInput(event) {
      const target = event.target instanceof Element ? event.target : null;
      const toolbarColorInput = target?.matches(".template-toolbar-color") ? target : null;

      if (!toolbarColorInput) {
        return false;
      }

      applyEditorToolbarColorTrigger(toolbarColorInput);
      return true;
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleEscape,
      handleInput,
      prepareClick,
    });
  }

  return Object.freeze({
    createEditorToolbarDocumentEventHandlers,
  });
});
