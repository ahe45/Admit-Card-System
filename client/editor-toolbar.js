const EDITOR_TOOLBAR_FONT_OPTIONS = Object.freeze([
  Object.freeze({ label: "기본", value: "'Noto Sans KR', sans-serif" }),
  Object.freeze({ label: "맑은 고딕", value: "'Malgun Gothic', sans-serif" }),
  Object.freeze({ label: "나눔고딕", value: "'Nanum Gothic', sans-serif" }),
  Object.freeze({ label: "나눔명조", value: "'Nanum Myeongjo', serif" }),
  Object.freeze({ label: "바탕", value: "'Batang', serif" }),
]);

const EDITOR_TOOLBAR_FONT_SIZE_OPTIONS = Object.freeze([
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  32,
  36,
  40,
  48,
  56,
  64,
  72,
]);

const EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR = "#152033";
const EDITOR_TOOLBAR_TEXT_COLOR_PRESETS = Object.freeze([
  Object.freeze({ label: "기본 검정", value: "#152033" }),
  Object.freeze({ label: "차콜", value: "#334155" }),
  Object.freeze({ label: "파랑", value: "#1d4ed8" }),
  Object.freeze({ label: "청록", value: "#0f766e" }),
  Object.freeze({ label: "초록", value: "#15803d" }),
  Object.freeze({ label: "황토", value: "#a16207" }),
  Object.freeze({ label: "주황", value: "#c2410c" }),
  Object.freeze({ label: "빨강", value: "#b91c1c" }),
  Object.freeze({ label: "보라", value: "#7c3aed" }),
  Object.freeze({ label: "흰색", value: "#ffffff" }),
]);

const EDITOR_TOOLBAR_ICON_MARKUP = Object.freeze({
  unorderedList: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="7" r="1.25" fill="currentColor" stroke="none"></circle>
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none"></circle>
      <circle cx="6" cy="17" r="1.25" fill="currentColor" stroke="none"></circle>
      <path d="M10 7h10"></path>
      <path d="M10 12h10"></path>
      <path d="M10 17h10"></path>
    </svg>
  `,
  justifyLeft: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h12"></path>
      <path d="M4 11h16"></path>
      <path d="M4 15h12"></path>
      <path d="M4 19h16"></path>
    </svg>
  `,
  justifyCenter: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 7h12"></path>
      <path d="M4 11h16"></path>
      <path d="M6 15h12"></path>
      <path d="M4 19h16"></path>
    </svg>
  `,
  justifyRight: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7h12"></path>
      <path d="M4 11h16"></path>
      <path d="M8 15h12"></path>
      <path d="M4 19h16"></path>
    </svg>
  `,
  justifyFull: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M4 11h16"></path>
      <path d="M4 15h16"></path>
      <path d="M4 19h16"></path>
    </svg>
  `,
  insertRowBefore: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="7" width="14" height="12" rx="1.5"></rect>
      <path d="M5 13h14"></path>
      <path d="M12 3v4"></path>
      <path d="M10 5h4"></path>
    </svg>
  `,
  insertRowAfter: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="14" height="12" rx="1.5"></rect>
      <path d="M5 11h14"></path>
      <path d="M12 17v4"></path>
      <path d="M10 19h4"></path>
    </svg>
  `,
  insertColumnBefore: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="5" width="12" height="14" rx="1.5"></rect>
      <path d="M13 5v14"></path>
      <path d="M3 12h4"></path>
      <path d="M5 10v4"></path>
    </svg>
  `,
  insertColumnAfter: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="12" height="14" rx="1.5"></rect>
      <path d="M11 5v14"></path>
      <path d="M17 12h4"></path>
      <path d="M19 10v4"></path>
    </svg>
  `,
  deleteRow: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1.5"></rect>
      <path d="M5 10h14"></path>
      <path d="M9 3h6"></path>
    </svg>
  `,
  deleteColumn: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1.5"></rect>
      <path d="M10 5v14"></path>
      <path d="M17 9v6"></path>
    </svg>
  `,
  mergeSelection: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5"></rect>
      <path d="M3.5 8.5h17"></path>
      <path d="M3.5 15.5h17"></path>
      <path d="M12 3.5v5"></path>
      <path d="M12 15.5v5"></path>
      <path d="M8 12h8"></path>
      <path d="m9.5 10.5-2.5 1.5 2.5 1.5"></path>
      <path d="m14.5 10.5 2.5 1.5-2.5 1.5"></path>
    </svg>
  `,
  equalizeColumnWidths: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="1.5"></rect>
      <path d="M10 6v12"></path>
      <path d="M14 6v12"></path>
      <path d="M3 12h4"></path>
      <path d="M17 12h4"></path>
    </svg>
  `,
  equalizeRowHeights: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="1.5"></rect>
      <path d="M6 10h12"></path>
      <path d="M6 14h12"></path>
      <path d="M12 3v4"></path>
      <path d="M12 17v4"></path>
    </svg>
  `,
  insertTable: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1.5"></rect>
      <path d="M4 10h16"></path>
      <path d="M10 5v14"></path>
      <path d="M16 5v14"></path>
    </svg>
  `,
  openImage: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2"></rect>
      <circle cx="9" cy="10" r="1.5"></circle>
      <path d="m8 16 3-3 2 2 3-4 2 5"></path>
    </svg>
  `,
  barcode: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6v12"></path>
      <path d="M8 6v12"></path>
      <path d="M11 8v8"></path>
      <path d="M13 6v12"></path>
      <path d="M16 8v8"></path>
      <path d="M19 6v12"></path>
    </svg>
  `,
  qrcode: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="5" height="5" rx="0.8"></rect>
      <rect x="15" y="4" width="5" height="5" rx="0.8"></rect>
      <rect x="4" y="15" width="5" height="5" rx="0.8"></rect>
      <path d="M13 13h2"></path>
      <path d="M15 13v2"></path>
      <path d="M17 15h3"></path>
      <path d="M13 17h4"></path>
      <path d="M18 18h2"></path>
      <path d="M14 19h1"></path>
    </svg>
  `,
  rule: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h16"></path>
    </svg>
  `,
});

function escapeEditorToolbarHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeEditorToolbarAttribute(value) {
  return escapeEditorToolbarHtml(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEditorToolbarAttribute(attributeName, attributeValue) {
  if (!attributeName) {
    return "";
  }

  return ` ${attributeName}="${escapeEditorToolbarAttribute(attributeValue)}"`;
}

function renderEditorToolbarIconButton({
  attributeName = "",
  attributeValue = "",
  label = "",
  title = label,
  iconMarkup = "",
  extraClassName = "",
}) {
  const className = ["template-tool-button", "icon-only", extraClassName].filter(Boolean).join(" ");

  return `
    <button class="${className}"${renderEditorToolbarAttribute(attributeName, attributeValue)} type="button" aria-label="${escapeEditorToolbarAttribute(label)}" title="${escapeEditorToolbarAttribute(title)}">
      ${iconMarkup}
      <span class="sr-only">${escapeEditorToolbarHtml(label)}</span>
    </button>
  `;
}

function renderEditorToolbarTextButton({
  attributeName = "",
  attributeValue = "",
  label = "",
  title = label,
  textContent = "",
}) {
  return `
    <button class="template-tool-button type-emphasis icon-only"${renderEditorToolbarAttribute(attributeName, attributeValue)} type="button" aria-label="${escapeEditorToolbarAttribute(label)}" title="${escapeEditorToolbarAttribute(title)}">
      <span aria-hidden="true">${escapeEditorToolbarHtml(textContent)}</span>
      <span class="sr-only">${escapeEditorToolbarHtml(label)}</span>
    </button>
  `;
}

function renderEditorToolbarFontOptions(selectedValue = "") {
  const normalizedSelectedValue = String(selectedValue || "").trim();

  return EDITOR_TOOLBAR_FONT_OPTIONS.map((option) => `
    <option value="${escapeEditorToolbarAttribute(option.value)}"${option.value === normalizedSelectedValue ? " selected" : ""}>${escapeEditorToolbarHtml(option.label)}</option>
  `).join("");
}

function isEditorToolbarPresetFontSize(fontSize) {
  return EDITOR_TOOLBAR_FONT_SIZE_OPTIONS.includes(Number(fontSize));
}

function normalizeEditorToolbarColorValue(rawValue, fallbackValue = "#ffffff") {
  if (typeof normalizeTemplateEditorColorValue === "function") {
    return normalizeTemplateEditorColorValue(rawValue, fallbackValue);
  }

  const normalizedValue = String(rawValue || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
    return normalizedValue.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(normalizedValue)) {
    const [, shortHex = ""] = normalizedValue.match(/^#([0-9a-f]{3})$/i) || [];
    return `#${shortHex.split("").map((value) => value.repeat(2)).join("").toLowerCase()}`;
  }

  const rgbMatch = normalizedValue.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);

  if (rgbMatch) {
    const [, red = "255", green = "255", blue = "255"] = rgbMatch;
    return `#${[red, green, blue]
      .map((value) => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return fallbackValue;
}

function getEditorToolbarColorFallback(command = "", tableAction = "") {
  if (String(tableAction || "").trim() === "apply-cell-shading") {
    return "#ffffff";
  }

  if (String(command || "").trim() === "foreColor") {
    return EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR;
  }

  return "#fff59d";
}

function isEditorToolbarTransparentColor(rawValue) {
  const normalizedValue = String(rawValue || "").trim().toLowerCase().replace(/\s+/g, "");
  return !normalizedValue || normalizedValue === "transparent" || normalizedValue === "rgba(0,0,0,0)";
}

function getEditorToolbarTextColor(contextElement = null, fallbackValue = EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR) {
  const baseElement = contextElement?.nodeType === Node.ELEMENT_NODE ? contextElement : contextElement?.parentElement || null;

  if (!baseElement) {
    return fallbackValue;
  }

  return normalizeEditorToolbarColorValue(baseElement.style.color || window.getComputedStyle(baseElement).color, fallbackValue);
}

function getEditorToolbarPrimaryFontFamily(fontFamilyValue = "") {
  return String(fontFamilyValue || "")
    .split(",")[0]
    .replace(/["']/g, "")
    .trim()
    .toLowerCase();
}

function resolveEditorToolbarFontFamilyValue(fontFamilyValue = "", defaultFontFamily = EDITOR_TOOLBAR_FONT_OPTIONS[0].value) {
  const normalizedFontFamily = String(fontFamilyValue || "").trim().toLowerCase();
  const primaryFontFamily = getEditorToolbarPrimaryFontFamily(fontFamilyValue);

  for (const option of EDITOR_TOOLBAR_FONT_OPTIONS) {
    const optionPrimaryFontFamily = getEditorToolbarPrimaryFontFamily(option.value);

    if (
      optionPrimaryFontFamily &&
      (primaryFontFamily === optionPrimaryFontFamily || normalizedFontFamily.includes(optionPrimaryFontFamily))
    ) {
      return option.value;
    }
  }

  return defaultFontFamily;
}

function parseEditorToolbarFontWeight(fontWeightValue = "") {
  const normalizedFontWeight = String(fontWeightValue || "").trim().toLowerCase();

  if (normalizedFontWeight === "bold") {
    return 700;
  }

  const numericFontWeight = Number(normalizedFontWeight);
  return Number.isFinite(numericFontWeight) ? numericFontWeight : 400;
}

function resolveEditorToolbarTextAlign(textAlignValue = "") {
  const normalizedTextAlign = String(textAlignValue || "").trim().toLowerCase();

  if (normalizedTextAlign.includes("justify")) {
    return "justifyFull";
  }

  if (normalizedTextAlign.includes("center")) {
    return "justifyCenter";
  }

  if (normalizedTextAlign.includes("right") || normalizedTextAlign.includes("end")) {
    return "justifyRight";
  }

  return "justifyLeft";
}

function getEditorToolbarSelectionContextElement(rootElement = null, selectionNode = null, preferredElement = null) {
  if (!rootElement) {
    return null;
  }

  const preferredBaseElement =
    preferredElement?.nodeType === Node.ELEMENT_NODE ? preferredElement : preferredElement?.parentElement || null;

  if (preferredBaseElement && rootElement.contains(preferredBaseElement)) {
    return preferredBaseElement;
  }

  const selectionBaseElement =
    selectionNode?.nodeType === Node.ELEMENT_NODE ? selectionNode : selectionNode?.parentElement || null;

  if (selectionBaseElement && rootElement.contains(selectionBaseElement)) {
    return selectionBaseElement;
  }

  return null;
}

function getEditorToolbarTextHighlightColor(contextElement = null, rootElement = null, fallbackValue = "#fff59d") {
  let currentElement =
    contextElement?.nodeType === Node.ELEMENT_NODE ? contextElement : contextElement?.parentElement || null;

  while (currentElement && rootElement?.contains(currentElement)) {
    const tagName = String(currentElement.tagName || "").toUpperCase();

    if (!["TD", "TH", "TR", "TABLE", "TBODY", "THEAD", "TFOOT", "COLGROUP", "COL"].includes(tagName)) {
      const rawBackgroundColor = currentElement.style.backgroundColor || window.getComputedStyle(currentElement).backgroundColor;

      if (!isEditorToolbarTransparentColor(rawBackgroundColor)) {
        return normalizeEditorToolbarColorValue(rawBackgroundColor, fallbackValue);
      }
    }

    if (currentElement === rootElement) {
      break;
    }

    currentElement = currentElement.parentElement;
  }

  return fallbackValue;
}

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
    pickerElement.classList.remove("open");
    toggleElement?.setAttribute("aria-expanded", "false");
    closedAnyPanel = true;
  });

  return closedAnyPanel;
}

function setEditorToolbarColorPanelVisibility(colorInputId = "", nextVisible = false) {
  const { inputElement, pickerElement, toggleElement, panelElement } = getEditorToolbarColorPickerElements(colorInputId);

  if (!inputElement || !panelElement) {
    return false;
  }

  if (nextVisible) {
    closeAllEditorToolbarColorPanels(colorInputId);
    closeAllEditorToolbarTableInsertPanels();
  }

  panelElement.classList.toggle("hidden", !nextVisible);
  pickerElement.classList.toggle("open", nextVisible);
  toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");
  return true;
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

function setEditorToolbarTableInsertPanelVisibility(panelId = "", nextVisible = false) {
  const { panelElement, popoverElement, toggleElement } = getEditorToolbarTableInsertPopoverElements(panelId);

  if (!panelElement || !popoverElement) {
    return false;
  }

  if (nextVisible) {
    closeAllEditorToolbarTableInsertPanels(panelId);
    closeAllEditorToolbarColorPanels();
    closeAllEditorToolbarFontSizeMenus();
  }

  panelElement.classList.toggle("hidden", !nextVisible);
  popoverElement.classList.toggle("open", nextVisible);
  toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");
  return true;
}

function setEditorToolbarCommandButtonState(toolbarElement = null, attributeName = "", attributeValue = "", isActive = false) {
  if (!toolbarElement || !attributeName || !attributeValue) {
    return;
  }

  const buttonElement = toolbarElement.querySelector(`button[${attributeName}="${attributeValue}"]`);

  if (!buttonElement) {
    return;
  }

  buttonElement.classList.toggle("is-active", Boolean(isActive));
  buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
}

function updateEditorToolbarFormattingState({
  rootElement = null,
  toolbarElement = null,
  commandAttributeName = "",
  fontFamilyElement = null,
  fontSizeElement = null,
  textColorElement = null,
  textShadingElement = null,
  selectionNode = null,
  contextElement = null,
  defaultFontFamily = EDITOR_TOOLBAR_FONT_OPTIONS[0].value,
  defaultFontSize = 14,
  defaultTextColor = EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
  defaultTextShading = "#fff59d",
} = {}) {
  if (!rootElement) {
    return false;
  }

  const resolvedContextElement = getEditorToolbarSelectionContextElement(rootElement, selectionNode, contextElement);

  if (!resolvedContextElement) {
    return false;
  }

  const formattingElement =
    resolvedContextElement.nodeType === Node.ELEMENT_NODE ? resolvedContextElement : resolvedContextElement.parentElement || null;

  if (!formattingElement) {
    return false;
  }

  const computedStyle = window.getComputedStyle(formattingElement);
  const resolvedFontFamily = resolveEditorToolbarFontFamilyValue(computedStyle.fontFamily, defaultFontFamily);
  const resolvedFontSize = Math.round(parseFloat(computedStyle.fontSize) || defaultFontSize);
  const resolvedTextColor = getEditorToolbarTextColor(formattingElement, textColorElement?.value || defaultTextColor);
  const resolvedHighlightColor = getEditorToolbarTextHighlightColor(
    formattingElement,
    rootElement,
    textShadingElement?.value || defaultTextShading,
  );
  const isBold = parseEditorToolbarFontWeight(computedStyle.fontWeight) >= 600;
  const isItalic = String(computedStyle.fontStyle || "").toLowerCase().includes("italic");
  const textDecorationValue = `${computedStyle.textDecorationLine || ""} ${computedStyle.textDecoration || ""}`.toLowerCase();
  const isUnderline = textDecorationValue.includes("underline");
  const closestList = formattingElement.closest("ul");
  const hasUnorderedList = Boolean(
    (closestList && rootElement.contains(closestList)) ||
    (/^(TD|TH)$/i.test(String(formattingElement.tagName || "")) && formattingElement.querySelector("ul")),
  );
  const activeAlignmentCommand = resolveEditorToolbarTextAlign(computedStyle.textAlign);
  const resolvedToolbarElement = toolbarElement || fontFamilyElement?.closest(".editor-toolbar") || fontSizeElement?.closest(".editor-toolbar");

  if (fontFamilyElement) {
    fontFamilyElement.value = resolvedFontFamily;
  }

  if (fontSizeElement) {
    syncEditorToolbarFontSizeControls({
      fontSizeElement,
      fontSize: resolvedFontSize,
      defaultFontSize,
    });
  }

  if (textColorElement) {
    syncEditorToolbarColorControls({
      colorInputElement: textColorElement,
      colorValue: resolvedTextColor,
      fallbackValue: defaultTextColor,
    });
  }

  if (textShadingElement) {
    syncEditorToolbarColorControls({
      colorInputElement: textShadingElement,
      colorValue: resolvedHighlightColor,
      fallbackValue: defaultTextShading,
    });
  }

  if (!resolvedToolbarElement || !commandAttributeName) {
    return true;
  }

  setEditorToolbarCommandButtonState(resolvedToolbarElement, commandAttributeName, "bold", isBold);
  setEditorToolbarCommandButtonState(resolvedToolbarElement, commandAttributeName, "italic", isItalic);
  setEditorToolbarCommandButtonState(resolvedToolbarElement, commandAttributeName, "underline", isUnderline);
  setEditorToolbarCommandButtonState(resolvedToolbarElement, commandAttributeName, "insertUnorderedList", hasUnorderedList);
  setEditorToolbarCommandButtonState(
    resolvedToolbarElement,
    commandAttributeName,
    "justifyLeft",
    activeAlignmentCommand === "justifyLeft",
  );
  setEditorToolbarCommandButtonState(
    resolvedToolbarElement,
    commandAttributeName,
    "justifyCenter",
    activeAlignmentCommand === "justifyCenter",
  );
  setEditorToolbarCommandButtonState(
    resolvedToolbarElement,
    commandAttributeName,
    "justifyRight",
    activeAlignmentCommand === "justifyRight",
  );
  setEditorToolbarCommandButtonState(
    resolvedToolbarElement,
    commandAttributeName,
    "justifyFull",
    activeAlignmentCommand === "justifyFull",
  );

  return true;
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
  const activeValue = Number.isFinite(normalizedFontSize) && isEditorToolbarPresetFontSize(normalizedFontSize)
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

function setEditorToolbarFontSizeMenuVisibility(fontSizeInputId = "", nextVisible = false) {
  const { inputElement, comboElement, toggleElement, menuElement } = getEditorToolbarFontSizeComboElements(fontSizeInputId);

  if (!inputElement || !comboElement || !menuElement) {
    return false;
  }

  if (nextVisible) {
    closeAllEditorToolbarFontSizeMenus(fontSizeInputId);
    syncEditorToolbarFontSizeMenuSelection(inputElement, inputElement.value);
    closeAllEditorToolbarTableInsertPanels();
  }

  menuElement.classList.toggle("hidden", !nextVisible);
  comboElement.classList.toggle("open", nextVisible);
  toggleElement?.setAttribute("aria-expanded", nextVisible ? "true" : "false");

  return true;
}

function renderEditorToolbarFontSizeOptionButtons(selectedValue = 14) {
  const normalizedSelectedValue = Math.round(Number(selectedValue));
  const activeValue = Number.isFinite(normalizedSelectedValue) && isEditorToolbarPresetFontSize(normalizedSelectedValue)
    ? String(normalizedSelectedValue)
    : "";

  return EDITOR_TOOLBAR_FONT_SIZE_OPTIONS.map((fontSize) => {
    const fontSizeValue = String(fontSize);
    const isActive = fontSizeValue === activeValue;

    return `
      <button
        class="template-toolbar-combo-option${isActive ? " active" : ""}"
        data-editor-font-size-option="${escapeEditorToolbarAttribute(fontSizeValue)}"
        type="button"
        role="option"
        aria-selected="${isActive ? "true" : "false"}"
      >
        ${escapeEditorToolbarHtml(fontSizeValue)}px
      </button>
    `;
  }).join("");
}

function renderEditorToolbarColorPresetButtons({
  inputId = "",
  inputValue = "#ffffff",
  presetColors = [],
  colorCommand = "",
  colorTableAction = "",
  fallbackValue = "#ffffff",
}) {
  const normalizedSelectedValue = normalizeEditorToolbarColorValue(inputValue, fallbackValue);

  return presetColors
    .map((preset) => {
      const normalizedPresetValue = normalizeEditorToolbarColorValue(preset.value, fallbackValue);
      const isActive = normalizedPresetValue === normalizedSelectedValue;

      return `
        <button
          class="template-toolbar-color-swatch${isActive ? " active" : ""}"
          data-editor-color-input="${escapeEditorToolbarAttribute(inputId)}"
          data-editor-color-preset="${escapeEditorToolbarAttribute(normalizedPresetValue)}"
          ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
          ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
          type="button"
          aria-label="${escapeEditorToolbarAttribute(preset.label)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeEditorToolbarAttribute(preset.label)}"
          style="--editor-toolbar-swatch-color: ${escapeEditorToolbarAttribute(normalizedPresetValue)};"
        >
          <span class="sr-only">${escapeEditorToolbarHtml(preset.label)}</span>
        </button>
      `;
    })
    .join("");
}

function renderEditorToolbarColorPickerSection({
  sectionLabel = "색상",
  inputId = "",
  inputValue = "#ffffff",
  presetColors = [],
  colorCommand = "",
  colorTableAction = "",
  fallbackValue = "#ffffff",
  sectionClassName = "",
  pickerClassName = "",
  triggerLabel = "선택",
} = {}) {
  const panelId = `${inputId}Panel`;
  const normalizedInputValue = normalizeEditorToolbarColorValue(inputValue, fallbackValue);
  const sectionClassNames = ["template-toolbar-section", sectionClassName].filter(Boolean).join(" ");
  const pickerClassNames = ["template-toolbar-color-picker", pickerClassName].filter(Boolean).join(" ");

  return `
    <div class="${escapeEditorToolbarAttribute(sectionClassNames)}">
      <span class="template-toolbar-section-label">${escapeEditorToolbarHtml(sectionLabel)}</span>
      <div class="template-toolbar-group-controls">
        <div
          class="${escapeEditorToolbarAttribute(pickerClassNames)}"
          data-editor-color-picker="${escapeEditorToolbarAttribute(inputId)}"
          style="--editor-toolbar-current-color: ${escapeEditorToolbarAttribute(normalizedInputValue)};"
        >
          <button
            class="template-toolbar-color-trigger"
            data-editor-color-toggle="${escapeEditorToolbarAttribute(inputId)}"
            type="button"
            aria-expanded="false"
            aria-controls="${escapeEditorToolbarAttribute(panelId)}"
          >
            <span class="template-toolbar-color-trigger-swatch" aria-hidden="true"></span>
            <span class="template-toolbar-color-trigger-label">${escapeEditorToolbarHtml(triggerLabel)}</span>
            <span class="template-toolbar-color-trigger-caret" aria-hidden="true"></span>
          </button>
          <div class="template-toolbar-color-panel hidden" id="${escapeEditorToolbarAttribute(panelId)}">
            <div class="template-toolbar-color-presets" role="group" aria-label="${escapeEditorToolbarAttribute(`${sectionLabel} 프리셋`)}">
            ${renderEditorToolbarColorPresetButtons({
              inputId,
              inputValue: normalizedInputValue,
              presetColors,
              colorCommand,
              colorTableAction,
              fallbackValue,
            })}
          </div>
            <div class="template-toolbar-color-panel-actions">
              <button
                class="template-toolbar-color-direct-button"
                data-editor-color-direct="true"
                data-editor-color-input="${escapeEditorToolbarAttribute(inputId)}"
                ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
                ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
                type="button"
              >
                <span class="template-toolbar-color-direct-swatch" aria-hidden="true"></span>
                <span>직접 선택</span>
              </button>
            </div>
            <input
              class="template-toolbar-color template-toolbar-color-input-hidden"
              id="${escapeEditorToolbarAttribute(inputId)}"
              ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
              ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
              type="color"
              value="${escapeEditorToolbarAttribute(normalizedInputValue)}"
              tabindex="-1"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditorToolbarTableInsertPopover({
  insertAttr = "",
  panelId = "",
  rowsId = "",
  columnsId = "",
} = {}) {
  return `
    <div
      class="template-toolbar-table-insert-popover"
      data-editor-table-insert-popover="${escapeEditorToolbarAttribute(panelId)}"
    >
      <button
        class="template-tool-button icon-only template-toolbar-table-insert-toggle"
        ${renderEditorToolbarAttribute(insertAttr, "table")}
        ${renderEditorToolbarAttribute("data-editor-table-insert-toggle", panelId)}
        type="button"
        aria-label="표 삽입"
        title="표 삽입"
        aria-expanded="false"
        aria-controls="${escapeEditorToolbarAttribute(panelId)}"
      >
        ${EDITOR_TOOLBAR_ICON_MARKUP.insertTable}
        <span class="sr-only">표 삽입</span>
      </button>
      <div
        class="template-table-insert-panel hidden"
        id="${escapeEditorToolbarAttribute(panelId)}"
        role="group"
        aria-label="표 삽입 설정"
      >
        <label class="template-toolbar-subfield" for="${escapeEditorToolbarAttribute(rowsId)}">
          <span>행</span>
          <input class="template-toolbar-number" id="${escapeEditorToolbarAttribute(rowsId)}" type="number" min="1" max="20" step="1" value="3" />
        </label>
        <label class="template-toolbar-subfield" for="${escapeEditorToolbarAttribute(columnsId)}">
          <span>열</span>
          <input class="template-toolbar-number" id="${escapeEditorToolbarAttribute(columnsId)}" type="number" min="1" max="8" step="1" value="2" />
        </label>
        <button class="template-tool-button"${renderEditorToolbarAttribute(insertAttr, "table-confirm")} type="button">표 추가</button>
      </div>
    </div>
  `;
}

function renderEditorToolbarInner({
  commandAttr = "",
  commandSelectAttr = "",
  tableActionAttr = "",
  insertAttr = "",
  openImageAttr = "",
  fontFamilyId = "",
  fontFamilyValue = EDITOR_TOOLBAR_FONT_OPTIONS[0].value,
  fontSizeId = "",
  fontSizeValue = 14,
  textColorId = "",
  textColorValue = EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
  textShadingId = "",
  textShadingValue = "#fff59d",
  cellShadingId = "",
  cellShadingValue = "#ffffff",
  tableInsertPanelId = "",
  tableRowsId = "",
  tableColumnsId = "",
  imageInputId = "",
}) {
  const resolvedFontSizeMenuId = `${fontSizeId}Menu`;

  return `
    <div class="template-toolbar-group">
      <span class="template-toolbar-group-label">서식</span>
      <div class="template-toolbar-section-row template-toolbar-section-row-dual">
        <div class="template-toolbar-section template-toolbar-section-compact">
          <span class="template-toolbar-section-label">글꼴</span>
          <div class="template-toolbar-group-controls">
            <span class="template-toolbar-select-wrap">
              <select class="template-toolbar-select template-toolbar-select-wide" id="${escapeEditorToolbarAttribute(fontFamilyId)}"${renderEditorToolbarAttribute(commandSelectAttr, "fontName")}>
                ${renderEditorToolbarFontOptions(fontFamilyValue)}
              </select>
              <span class="template-toolbar-select-caret" aria-hidden="true"></span>
            </span>
          </div>
        </div>
        <div class="template-toolbar-section template-toolbar-section-compact">
          <span class="template-toolbar-section-label">크기</span>
          <div class="template-toolbar-group-controls template-toolbar-font-size-controls">
            <div class="template-toolbar-font-size-combo" data-editor-font-size-combo="${escapeEditorToolbarAttribute(fontSizeId)}">
              <input
                class="template-toolbar-number template-toolbar-font-size-input"
                id="${escapeEditorToolbarAttribute(fontSizeId)}"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                value="${escapeEditorToolbarAttribute(String(fontSizeValue))}"
                aria-label="글꼴 크기 직접 입력"
              />
              <button
                class="template-toolbar-combo-toggle"
                data-editor-font-size-toggle="${escapeEditorToolbarAttribute(fontSizeId)}"
                type="button"
                aria-label="글꼴 크기 목록 열기"
                aria-expanded="false"
                aria-controls="${escapeEditorToolbarAttribute(resolvedFontSizeMenuId)}"
              >
                <span class="template-toolbar-combo-caret" aria-hidden="true"></span>
              </button>
              <div
                class="template-toolbar-combo-menu hidden"
                id="${escapeEditorToolbarAttribute(resolvedFontSizeMenuId)}"
                data-editor-font-size-menu-for="${escapeEditorToolbarAttribute(fontSizeId)}"
                role="listbox"
                aria-label="글꼴 크기 목록"
              >
                ${renderEditorToolbarFontSizeOptionButtons(fontSizeValue)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">스타일</span>
        <div class="template-toolbar-group-controls">
          ${renderEditorToolbarTextButton({
            attributeName: commandAttr,
            attributeValue: "bold",
            label: "굵게",
            textContent: "B",
          })}
          ${renderEditorToolbarTextButton({
            attributeName: commandAttr,
            attributeValue: "italic",
            label: "기울임",
            textContent: "I",
          })}
          ${renderEditorToolbarTextButton({
            attributeName: commandAttr,
            attributeValue: "underline",
            label: "밑줄",
            textContent: "U",
          })}
          ${renderEditorToolbarIconButton({
            attributeName: commandAttr,
            attributeValue: "insertUnorderedList",
            label: "목록",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.unorderedList,
          })}
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">정렬</span>
        <div class="template-toolbar-group-controls">
          ${renderEditorToolbarIconButton({
            attributeName: commandAttr,
            attributeValue: "justifyLeft",
            label: "왼쪽 정렬",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyLeft,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: commandAttr,
            attributeValue: "justifyCenter",
            label: "가운데 정렬",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyCenter,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: commandAttr,
            attributeValue: "justifyRight",
            label: "오른쪽 정렬",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyRight,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: commandAttr,
            attributeValue: "justifyFull",
            label: "배분정렬",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyFull,
          })}
        </div>
      </div>
      <div class="template-toolbar-section-row template-toolbar-section-row-dual">
        ${renderEditorToolbarColorPickerSection({
          sectionLabel: "글자색",
          inputId: textColorId,
          inputValue: textColorValue,
          presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
          colorCommand: "foreColor",
          fallbackValue: EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
          sectionClassName: "template-toolbar-section-compact",
          pickerClassName: "template-toolbar-color-picker-compact",
        })}
        ${renderEditorToolbarColorPickerSection({
          sectionLabel: "음영",
          inputId: textShadingId,
          inputValue: textShadingValue,
          presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
          colorCommand: "hiliteColor",
          fallbackValue: "#fff59d",
          sectionClassName: "template-toolbar-section-compact",
          pickerClassName: "template-toolbar-color-picker-compact template-toolbar-color-picker-align-end",
        })}
      </div>
    </div>
    <div class="template-toolbar-group">
      <span class="template-toolbar-group-label">표</span>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">추가</span>
        <div class="template-toolbar-group-controls">
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "insert-row-before",
            label: "위에 행 추가",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertRowBefore,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "insert-row-after",
            label: "아래에 행 추가",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertRowAfter,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "insert-column-before",
            label: "왼쪽에 열 추가",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertColumnBefore,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "insert-column-after",
            label: "오른쪽에 열 추가",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertColumnAfter,
          })}
        </div>
      </div>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">삭제</span>
        <div class="template-toolbar-group-controls">
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "delete-row",
            label: "행 삭제",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.deleteRow,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: tableActionAttr,
            attributeValue: "delete-column",
            label: "열 삭제",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.deleteColumn,
          })}
        </div>
      </div>
      <div class="template-toolbar-section-row template-toolbar-section-row-dual">
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">병합</span>
          <div class="template-toolbar-group-controls">
            ${renderEditorToolbarIconButton({
              attributeName: tableActionAttr,
              attributeValue: "merge-selection",
              label: "선택한 셀 병합",
              iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.mergeSelection,
            })}
          </div>
        </div>
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">맞춤</span>
          <div class="template-toolbar-group-controls">
            ${renderEditorToolbarIconButton({
              attributeName: tableActionAttr,
              attributeValue: "equalize-column-widths",
              label: "열 너비 맞춤",
              iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.equalizeColumnWidths,
            })}
            ${renderEditorToolbarIconButton({
              attributeName: tableActionAttr,
              attributeValue: "equalize-row-heights",
              label: "행 높이 맞춤",
              iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.equalizeRowHeights,
            })}
          </div>
        </div>
      </div>
      ${renderEditorToolbarColorPickerSection({
        sectionLabel: "음영",
        inputId: cellShadingId,
        inputValue: cellShadingValue,
        presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
        colorTableAction: "apply-cell-shading",
        fallbackValue: "#ffffff",
      })}
    </div>
    <div class="template-toolbar-group">
      <span class="template-toolbar-group-label">삽입</span>
      <div class="template-toolbar-section">
        <span class="template-toolbar-section-label">개체</span>
        <div class="template-toolbar-group-controls">
          ${renderEditorToolbarTableInsertPopover({
            insertAttr,
            panelId: tableInsertPanelId,
            rowsId: tableRowsId,
            columnsId: tableColumnsId,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: openImageAttr,
            attributeValue: "true",
            label: "이미지 삽입",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.openImage,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: insertAttr,
            attributeValue: "barcode",
            label: "바코드 삽입",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.barcode,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: insertAttr,
            attributeValue: "qrcode",
            label: "QR코드 삽입",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.qrcode,
          })}
          ${renderEditorToolbarIconButton({
            attributeName: insertAttr,
            attributeValue: "rule",
            label: "구분선",
            iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.rule,
          })}
        </div>
      </div>
    </div>
    <input class="upload-file-input" id="${escapeEditorToolbarAttribute(imageInputId)}" type="file" accept="image/*" />
  `;
}

function renderEditorToolbar({
  toolbarClassName = "",
  ariaLabel = "편집 도구",
  ...options
}) {
  const className = ["editor-toolbar", toolbarClassName].filter(Boolean).join(" ");

  return `
    <div class="${escapeEditorToolbarAttribute(className)}" role="toolbar" aria-label="${escapeEditorToolbarAttribute(ariaLabel)}">
      ${renderEditorToolbarInner(options)}
    </div>
  `;
}

function applySharedEditorCommand({
  rootElement = null,
  focusElement = null,
  restoreSelection = null,
  syncContent = null,
  onUndo = null,
  onRedo = null,
  applyTableSelectionCommand = null,
  command = "",
  value = "",
  enableStyleWithCss = false,
  fontFamilyElement = null,
  defaultFontFamily = EDITOR_TOOLBAR_FONT_OPTIONS[0].value,
  fontSizeElement = null,
  defaultFontSize = 14,
  setStatus = null,
  syncOptions = undefined,
  onFormatBlockApplied = null,
}) {
  if (!rootElement || !command) {
    return;
  }

  if (command === "undo") {
    onUndo?.();
    return;
  }

  if (command === "redo") {
    onRedo?.();
    return;
  }

  if (applyTableSelectionCommand?.(command, value)) {
    return;
  }

  focusElement?.focus?.();
  restoreSelection?.();

  const shouldUseStyleWithCss =
    enableStyleWithCss ||
    command === "fontName" ||
    command === "fontSizePx" ||
    command === "hiliteColor" ||
    command === "foreColor";

  if (shouldUseStyleWithCss) {
    document.execCommand("styleWithCSS", false, true);
  }

  if (command === "fontSizePx") {
    const fontSize = Math.round(Number(value));

    if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 72) {
      setStatus?.("글자 크기는 8px 이상 72px 이하로 입력하세요.", "warning");
      syncEditorToolbarFontSizeControls({
        fontSizeElement,
        fontSize: defaultFontSize,
        defaultFontSize,
      });
      return;
    }

    document.execCommand("fontSize", false, "7");
    normalizeTemplateEditorFontNodes(rootElement, { appliedFontSizePx: fontSize });
    normalizeTemplateEditorInlineFontSizeStyles(rootElement, fontSize);

    syncEditorToolbarFontSizeControls({
      fontSizeElement,
      fontSize,
      defaultFontSize,
    });
  } else {
    const commandValue =
      command === "fontName"
        ? String(value || defaultFontFamily).trim()
        : command === "hiliteColor" || command === "foreColor"
          ? normalizeEditorToolbarColorValue(value || "", getEditorToolbarColorFallback(command))
        : command === "formatBlock" && value
          ? `<${value}>`
          : value;

    document.execCommand(command, false, commandValue);

    if (command === "fontName") {
      normalizeTemplateEditorFontNodes(rootElement);

      if (fontFamilyElement) {
        fontFamilyElement.value = commandValue;
      }
    }

    if (command === "formatBlock" && value) {
      onFormatBlockApplied?.(value);
    }
  }

  syncContent?.(syncOptions);
}

function applySharedEditorFontFamily({
  rootElement = null,
  focusElement = null,
  restoreSelection = null,
  syncContent = null,
  applyTableSelectionFontFamily = null,
  rawFontFamily = "",
  fontFamilyElement = null,
  defaultFontFamily = EDITOR_TOOLBAR_FONT_OPTIONS[0].value,
  syncOptions = undefined,
}) {
  if (!rootElement) {
    return;
  }

  const fontFamily = String(rawFontFamily || "").trim() || defaultFontFamily;

  if (applyTableSelectionFontFamily?.(fontFamily)) {
    if (fontFamilyElement) {
      fontFamilyElement.value = fontFamily;
    }
    return;
  }

  applySharedEditorCommand({
    rootElement,
    focusElement,
    restoreSelection,
    syncContent,
    command: "fontName",
    value: fontFamily,
    enableStyleWithCss: true,
    fontFamilyElement,
    defaultFontFamily,
    syncOptions,
  });
}

function applySharedEditorFontSize({
  rootElement = null,
  focusElement = null,
  restoreSelection = null,
  syncContent = null,
  applyTableSelectionFontSize = null,
  rawFontSize = "",
  fontSizeElement = null,
  defaultFontSize = 14,
  setStatus = null,
  syncOptions = undefined,
}) {
  if (!rootElement) {
    return;
  }

  const fontSize = Math.round(Number(rawFontSize));

  if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 72) {
    setStatus?.("글자 크기는 8px 이상 72px 이하로 입력하세요.", "warning");
    syncEditorToolbarFontSizeControls({
      fontSizeElement,
      fontSize: defaultFontSize,
      defaultFontSize,
    });
    return;
  }

  if (applyTableSelectionFontSize?.(fontSize)) {
    syncEditorToolbarFontSizeControls({
      fontSizeElement,
      fontSize,
      defaultFontSize,
    });
    return;
  }

  applySharedEditorCommand({
    rootElement,
    focusElement,
    restoreSelection,
    syncContent,
    command: "fontSizePx",
    value: fontSize,
    fontSizeElement,
    defaultFontSize,
    setStatus,
    syncOptions,
  });
}
