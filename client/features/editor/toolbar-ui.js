(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardEditorToolbarUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarUiController(deps) {
    const { isEditorToolbarPresetFontSize, normalizeEditorToolbarColorValue } = deps;

    function getEditorToolbarColorPickerElements(colorInputId = "") {
      const normalizedColorInputId = String(colorInputId || "").trim();
      const inputElement = normalizedColorInputId ? document.getElementById(normalizedColorInputId) : null;
      const pickerElement =
        inputElement?.closest(".template-toolbar-color-picker") ||
        (normalizedColorInputId
          ? document.querySelector(`.template-toolbar-color-picker[data-editor-color-picker="${normalizedColorInputId}"]`)
          : null);
      const toggleElement = pickerElement?.querySelector("[data-editor-color-toggle]") || null;
      const panelElement = pickerElement?.querySelector(".template-toolbar-color-panel") || null;

      return { inputElement, pickerElement, toggleElement, panelElement };
    }

    function getEditorToolbarFloatingPanelBoundaryRect(anchorElement) {
      const viewportRect = {
        top: 0,
        bottom: window.innerHeight || document.documentElement.clientHeight || 0,
      };
      let currentElement = anchorElement?.parentElement || null;

      while (currentElement && currentElement !== document.body && currentElement !== document.documentElement) {
        const computedStyle = window.getComputedStyle(currentElement);
        const overflowValue = `${computedStyle.overflow || ""} ${computedStyle.overflowY || ""}`;

        if (/(auto|scroll|hidden|clip)/i.test(overflowValue)) {
          const rect = currentElement.getBoundingClientRect();

          return {
            top: Math.max(viewportRect.top, rect.top),
            bottom: Math.min(viewportRect.bottom, rect.bottom),
          };
        }

        currentElement = currentElement.parentElement;
      }

      return viewportRect;
    }

    function updateEditorToolbarFloatingPanelPlacement(anchorElement, panelElement, gap = 8) {
      if (!(anchorElement instanceof HTMLElement) || !(panelElement instanceof HTMLElement)) {
        return "down";
      }

      anchorElement.classList.remove("open-up", "open-down");

      if (panelElement.classList.contains("hidden")) {
        return "down";
      }

      const anchorRect = anchorElement.getBoundingClientRect();
      const panelRect = panelElement.getBoundingClientRect();
      const boundaryRect = getEditorToolbarFloatingPanelBoundaryRect(anchorElement);
      const spaceBelow = boundaryRect.bottom - anchorRect.bottom;
      const spaceAbove = anchorRect.top - boundaryRect.top;
      const shouldOpenUp = spaceBelow < panelRect.height + gap && spaceAbove > spaceBelow;

      anchorElement.classList.toggle("open-up", shouldOpenUp);
      anchorElement.classList.toggle("open-down", !shouldOpenUp);
      return shouldOpenUp ? "up" : "down";
    }

    function syncEditorToolbarColorControls({
      colorInputElement = null,
      colorValue = "",
      fallbackValue = "#ffffff",
    } = {}) {
      const inputElement =
        colorInputElement instanceof HTMLInputElement
          ? colorInputElement
          : typeof colorInputElement === "string" && colorInputElement
            ? document.getElementById(colorInputElement)
            : null;

      if (!inputElement) {
        return fallbackValue;
      }

      const normalizedColorValue = normalizeEditorToolbarColorValue(colorValue || inputElement.value || "", fallbackValue);
      inputElement.value = normalizedColorValue;

      const pickerElement = inputElement.closest(".template-toolbar-color-picker");

      if (!pickerElement) {
        return normalizedColorValue;
      }

      pickerElement.style.setProperty("--editor-toolbar-current-color", normalizedColorValue);

      pickerElement.querySelectorAll("[data-editor-color-preset]").forEach((buttonElement) => {
        const presetValue = normalizeEditorToolbarColorValue(buttonElement.dataset.editorColorPreset || "", fallbackValue);
        const isActive = presetValue === normalizedColorValue;

        buttonElement.classList.toggle("active", isActive);
        buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      return normalizedColorValue;
    }

    function closeAllEditorToolbarColorPanels(exceptColorInputId = "") {
      let closedAnyPanel = false;

      Array.from(document.querySelectorAll(".template-toolbar-color-picker")).forEach((pickerElement) => {
        const inputElement = pickerElement.querySelector(".template-toolbar-color");
        const toggleElement = pickerElement.querySelector("[data-editor-color-toggle]");
        const panelElement = pickerElement.querySelector(".template-toolbar-color-panel");
        const shouldKeepOpen =
          exceptColorInputId &&
          inputElement?.id === exceptColorInputId &&
          panelElement &&
          !panelElement.classList.contains("hidden");

        if (!panelElement || shouldKeepOpen || panelElement.classList.contains("hidden")) {
          return;
        }

        panelElement.classList.add("hidden");
        pickerElement.classList.remove("open", "open-up", "open-down");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyPanel = true;
      });

      return closedAnyPanel;
    }

    function getEditorToolbarTableInsertPopoverElements(panelId = "") {
      const normalizedPanelId = String(panelId || "").trim();
      const panelElement = normalizedPanelId ? document.getElementById(normalizedPanelId) : null;
      const popoverElement =
        panelElement?.closest(".template-toolbar-table-insert-popover") ||
        (normalizedPanelId
          ? document.querySelector(`.template-toolbar-table-insert-popover[data-editor-table-insert-popover="${normalizedPanelId}"]`)
          : null);
      const toggleElement = popoverElement?.querySelector("[data-editor-table-insert-toggle]") || null;

      return { panelElement, popoverElement, toggleElement };
    }

    function closeAllEditorToolbarTableInsertPanels(exceptPanelId = "") {
      let closedAnyPanel = false;

      Array.from(document.querySelectorAll(".template-toolbar-table-insert-popover")).forEach((popoverElement) => {
        const panelElement = popoverElement.querySelector(".template-table-insert-panel");
        const toggleElement = popoverElement.querySelector("[data-editor-table-insert-toggle]");
        const shouldKeepOpen =
          exceptPanelId &&
          panelElement?.id === exceptPanelId &&
          panelElement &&
          !panelElement.classList.contains("hidden");

        if (!panelElement || shouldKeepOpen || panelElement.classList.contains("hidden")) {
          return;
        }

        panelElement.classList.add("hidden");
        popoverElement.classList.remove("open");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyPanel = true;
      });

      return closedAnyPanel;
    }

    function getEditorToolbarFontSizeMenuElement(fontSizeElement = null) {
      return fontSizeElement?.closest(".template-toolbar-font-size-combo")?.querySelector(".template-toolbar-combo-menu") || null;
    }

    function syncEditorToolbarFontSizeMenuSelection(fontSizeElement = null, rawFontSize = "") {
      const menuElement = getEditorToolbarFontSizeMenuElement(fontSizeElement);

      if (!menuElement) {
        return;
      }

      const normalizedFontSize = Math.round(Number(rawFontSize));
      const activeValue =
        Number.isFinite(normalizedFontSize) && isEditorToolbarPresetFontSize(normalizedFontSize)
          ? String(normalizedFontSize)
          : "";

      Array.from(menuElement.querySelectorAll("[data-editor-font-size-option]")).forEach((optionButton) => {
        const isActive = optionButton.dataset.editorFontSizeOption === activeValue;

        optionButton.classList.toggle("active", isActive);
        optionButton.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function syncEditorToolbarFontSizeControls({
      fontSizeElement = null,
      fontSize = "",
      defaultFontSize = 14,
    } = {}) {
      const normalizedFontSize = Math.round(Number(fontSize));
      const resolvedFontSize = Number.isFinite(normalizedFontSize) ? normalizedFontSize : defaultFontSize;

      if (fontSizeElement) {
        fontSizeElement.value = String(resolvedFontSize);
      }

      syncEditorToolbarFontSizeMenuSelection(fontSizeElement, resolvedFontSize);
    }

    function getEditorToolbarFontSizeComboElements(fontSizeInputId = "") {
      const inputElement = document.getElementById(String(fontSizeInputId || "").trim());
      const comboElement = inputElement?.closest(".template-toolbar-font-size-combo") || null;
      const toggleElement = comboElement?.querySelector("[data-editor-font-size-toggle]") || null;
      const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu") || null;

      return { inputElement, comboElement, toggleElement, menuElement };
    }

    function closeAllEditorToolbarFontSizeMenus(exceptFontSizeInputId = "") {
      let closedAnyMenu = false;

      Array.from(document.querySelectorAll(".template-toolbar-font-size-combo")).forEach((comboElement) => {
        const inputElement = comboElement.querySelector(".template-toolbar-font-size-input");
        const toggleElement = comboElement.querySelector("[data-editor-font-size-toggle]");
        const menuElement = comboElement.querySelector(".template-toolbar-combo-menu");
        const shouldKeepOpen =
          exceptFontSizeInputId &&
          inputElement?.id === exceptFontSizeInputId &&
          menuElement &&
          !menuElement.classList.contains("hidden");

        if (!menuElement || shouldKeepOpen || menuElement.classList.contains("hidden")) {
          return;
        }

        menuElement.classList.add("hidden");
        comboElement.classList.remove("open");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyMenu = true;
      });

      return closedAnyMenu;
    }

    function getEditorToolbarBorderSelectElements(inputId = "") {
      const normalizedInputId = String(inputId || "").trim();
      const selectElement = normalizedInputId ? document.getElementById(normalizedInputId) : null;
      const selectWrapper =
        selectElement?.closest(".template-toolbar-icon-select") ||
        (normalizedInputId ? document.querySelector(`.template-toolbar-icon-select[data-editor-border-select="${normalizedInputId}"]`) : null);
      const toggleElement = selectWrapper?.querySelector("[data-editor-border-select-toggle]") || null;
      const menuElement = selectWrapper?.querySelector(".template-toolbar-icon-select-menu") || null;

      return { menuElement, selectElement, selectWrapper, toggleElement };
    }

    function syncEditorToolbarBorderSelectControl(selectInput = null, value = "") {
      const selectElement =
        selectInput instanceof HTMLSelectElement
          ? selectInput
          : typeof selectInput === "string" && selectInput
            ? document.getElementById(selectInput)
            : null;

      if (!selectElement) {
        return "";
      }

      const { menuElement, selectWrapper } = getEditorToolbarBorderSelectElements(selectElement.id);
      const optionButtons = Array.from(menuElement?.querySelectorAll("[data-editor-border-select-option]") || []);
      const nextValue = String(value || selectElement.value || "").trim();

      if (nextValue) {
        selectElement.value = nextValue;
      }

      const activeButton =
        optionButtons.find((buttonElement) => buttonElement.dataset.editorBorderSelectOption === selectElement.value) ||
        optionButtons[0] ||
        null;

      if (!activeButton) {
        return selectElement.value;
      }

      selectElement.value = activeButton.dataset.editorBorderSelectOption || selectElement.value;

      const selectedLabelElement = selectWrapper?.querySelector("[data-editor-border-select-label]");
      const selectedIconElement = selectWrapper?.querySelector("[data-editor-border-select-current-icon]");
      const optionLabelElement = activeButton.querySelector(".template-toolbar-icon-select-option-label");
      const optionIconElement = activeButton.querySelector("[data-editor-border-select-option-icon]");

      if (selectedLabelElement) {
        selectedLabelElement.textContent = optionLabelElement?.textContent?.trim() || activeButton.textContent.trim();
      }

      if (selectedIconElement) {
        selectedIconElement.innerHTML = optionIconElement?.innerHTML || "";
      }

      optionButtons.forEach((buttonElement) => {
        const isActive = buttonElement === activeButton;

        buttonElement.classList.toggle("active", isActive);
        buttonElement.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      return selectElement.value;
    }

    function closeAllEditorToolbarBorderSelectMenus(exceptInputId = "") {
      let closedAnyMenu = false;

      Array.from(document.querySelectorAll(".template-toolbar-icon-select")).forEach((selectWrapper) => {
        const selectElement = selectWrapper.querySelector(".template-toolbar-border-native-select");
        const toggleElement = selectWrapper.querySelector("[data-editor-border-select-toggle]");
        const menuElement = selectWrapper.querySelector(".template-toolbar-icon-select-menu");
        const shouldKeepOpen =
          exceptInputId &&
          selectElement?.id === exceptInputId &&
          menuElement &&
          !menuElement.classList.contains("hidden");

        if (!menuElement || shouldKeepOpen || menuElement.classList.contains("hidden")) {
          return;
        }

        menuElement.classList.add("hidden");
        selectWrapper.classList.remove("open", "open-up", "open-down");
        toggleElement?.setAttribute("aria-expanded", "false");
        closedAnyMenu = true;
      });

      return closedAnyMenu;
    }

    function setEditorToolbarBorderSelectMenuVisibility(inputId = "", nextVisible = false) {
      const { menuElement, selectElement, selectWrapper, toggleElement } = getEditorToolbarBorderSelectElements(inputId);

      if (!selectElement || !menuElement || !selectWrapper) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarBorderSelectMenus(inputId);
        closeAllEditorToolbarTableInsertPanels();
        closeAllEditorToolbarFontSizeMenus();
        closeAllEditorToolbarColorPanels();
        syncEditorToolbarBorderSelectControl(selectElement);
      }

      menuElement.classList.toggle("hidden", !nextVisible);
      selectWrapper.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

      if (nextVisible) {
        updateEditorToolbarFloatingPanelPlacement(selectWrapper, menuElement, 6);
      } else {
        selectWrapper.classList.remove("open-up", "open-down");
      }

      return true;
    }

    function applyEditorToolbarBorderSelectOption(inputId = "", value = "") {
      const { selectElement } = getEditorToolbarBorderSelectElements(inputId);

      if (!selectElement) {
        return false;
      }

      syncEditorToolbarBorderSelectControl(selectElement, value);
      selectElement.dataset.editorBorderUserValue = "true";
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    function setEditorToolbarColorPanelVisibility(colorInputId = "", nextVisible = false) {
      const { inputElement, pickerElement, toggleElement, panelElement } = getEditorToolbarColorPickerElements(colorInputId);

      if (!inputElement || !panelElement) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarColorPanels(colorInputId);
        closeAllEditorToolbarTableInsertPanels();
        closeAllEditorToolbarFontSizeMenus();
        closeAllEditorToolbarBorderSelectMenus();
      }

      panelElement.classList.toggle("hidden", !nextVisible);
      pickerElement.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

      if (nextVisible) {
        updateEditorToolbarFloatingPanelPlacement(pickerElement, panelElement, 8);
      } else {
        pickerElement.classList.remove("open-up", "open-down");
      }

      return true;
    }

    function setEditorToolbarTableInsertPanelVisibility(panelId = "", nextVisible = false) {
      const { panelElement, popoverElement, toggleElement } = getEditorToolbarTableInsertPopoverElements(panelId);

      if (!panelElement || !popoverElement) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarTableInsertPanels(panelId);
        closeAllEditorToolbarColorPanels();
        closeAllEditorToolbarFontSizeMenus();
        closeAllEditorToolbarBorderSelectMenus();
      }

      panelElement.classList.toggle("hidden", !nextVisible);
      popoverElement.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");
      return true;
    }

    function setEditorToolbarFontSizeMenuVisibility(fontSizeInputId = "", nextVisible = false) {
      const { inputElement, comboElement, toggleElement, menuElement } = getEditorToolbarFontSizeComboElements(fontSizeInputId);

      if (!inputElement || !comboElement || !menuElement) {
        return false;
      }

      if (nextVisible) {
        closeAllEditorToolbarFontSizeMenus(fontSizeInputId);
        syncEditorToolbarFontSizeMenuSelection(inputElement, inputElement.value);
        closeAllEditorToolbarTableInsertPanels();
        closeAllEditorToolbarColorPanels();
        closeAllEditorToolbarBorderSelectMenus();
      }

      menuElement.classList.toggle("hidden", !nextVisible);
      comboElement.classList.toggle("open", nextVisible);
      toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

      return true;
    }

    return Object.freeze({
      applyEditorToolbarBorderSelectOption,
      closeAllEditorToolbarBorderSelectMenus,
      closeAllEditorToolbarColorPanels,
      closeAllEditorToolbarFontSizeMenus,
      closeAllEditorToolbarTableInsertPanels,
      getEditorToolbarBorderSelectElements,
      getEditorToolbarColorPickerElements,
      getEditorToolbarFontSizeComboElements,
      getEditorToolbarFontSizeMenuElement,
      getEditorToolbarTableInsertPopoverElements,
      setEditorToolbarBorderSelectMenuVisibility,
      setEditorToolbarColorPanelVisibility,
      setEditorToolbarFontSizeMenuVisibility,
      setEditorToolbarTableInsertPanelVisibility,
      syncEditorToolbarBorderSelectControl,
      syncEditorToolbarColorControls,
      syncEditorToolbarFontSizeControls,
      syncEditorToolbarFontSizeMenuSelection,
    });
  }

  return Object.freeze({
    createEditorToolbarUiController,
  });
});
