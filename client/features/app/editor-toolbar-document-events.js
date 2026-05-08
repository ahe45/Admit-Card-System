(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardEditorToolbarDocumentEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarDocumentEventHandlers({
    applyEditorToolbarBorderSelectOption,
    applyEditorToolbarColorTrigger,
    applyLoginNoticeEditorCommand,
    closeAllEditorToolbarBorderSelectMenus,
    closeAllEditorToolbarColorPanels,
    closeAllEditorToolbarFontSizeMenus,
    closeAllEditorToolbarTableInsertPanels,
    getEditorToolbarBorderSelectElements,
    getEditorToolbarColorPickerElements,
    setEditorToolbarBorderSelectMenuVisibility,
    setEditorToolbarColorPanelVisibility,
    setEditorToolbarFontSizeMenuVisibility,
  }) {
    function prepareClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const tableInsertPopoverTrigger = target?.closest(".template-toolbar-table-insert-popover") || null;
      const fontSizeComboTrigger = target?.closest(".template-toolbar-font-size-combo") || null;
      const colorPickerTrigger = target?.closest(".template-toolbar-color-picker") || null;
      const borderSelectTrigger = target?.closest(".template-toolbar-icon-select") || null;

      if (!tableInsertPopoverTrigger) {
        closeAllEditorToolbarTableInsertPanels();
      }

      if (!fontSizeComboTrigger) {
        closeAllEditorToolbarFontSizeMenus();
      }

      if (!colorPickerTrigger) {
        closeAllEditorToolbarColorPanels();
      }

      if (!borderSelectTrigger) {
        closeAllEditorToolbarBorderSelectMenus?.();
      }
    }

    function handleClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const fontSizeToggleTrigger = target?.closest("[data-editor-font-size-toggle]") || null;
      const fontSizeOptionTrigger = target?.closest("[data-editor-font-size-option]") || null;
      const borderSelectToggleTrigger = target?.closest("[data-editor-border-select-toggle]") || null;
      const borderSelectOptionTrigger = target?.closest("[data-editor-border-select-option]") || null;
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

      if (borderSelectToggleTrigger) {
        const inputId = borderSelectToggleTrigger.dataset.editorBorderSelectToggle || "";
        const { menuElement } = getEditorToolbarBorderSelectElements?.(inputId) || {};
        const nextOpen = menuElement?.classList.contains("hidden") ?? true;

        setEditorToolbarBorderSelectMenuVisibility?.(inputId, nextOpen);
        return true;
      }

      if (borderSelectOptionTrigger) {
        const comboMenu = borderSelectOptionTrigger.closest(".template-toolbar-icon-select-menu");
        const inputId = comboMenu?.dataset.editorBorderSelectMenuFor || "";
        const value = borderSelectOptionTrigger.dataset.editorBorderSelectOption || "";

        if (inputId && value) {
          applyEditorToolbarBorderSelectOption?.(inputId, value);
        }

        setEditorToolbarBorderSelectMenuVisibility?.(inputId, false);
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
        closeAllEditorToolbarBorderSelectMenus?.() ||
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
