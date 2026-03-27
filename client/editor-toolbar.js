const editorContentModule = globalThis.AdmitCardEditorContentShared;
const editorFormattingStateModule = globalThis.AdmitCardEditorFormattingState;
const editorSharedCommandsModule = globalThis.AdmitCardEditorSharedCommands;
const editorToolbarMarkupModule = globalThis.AdmitCardEditorToolbarMarkup;
const editorToolbarUiModule = globalThis.AdmitCardEditorToolbarUi;

if (!editorContentModule) {
  throw new Error("client/features/editor/content-shared.js must be loaded before client/editor-toolbar.js.");
}

if (!editorToolbarMarkupModule?.createEditorToolbarMarkupRenderer) {
  throw new Error("client/features/editor/toolbar-markup.js must be loaded before client/editor-toolbar.js.");
}

if (!editorFormattingStateModule?.createEditorToolbarFormattingStateController) {
  throw new Error("client/features/editor/formatting-state.js must be loaded before client/editor-toolbar.js.");
}

if (!editorSharedCommandsModule?.createSharedEditorCommandHelpers) {
  throw new Error("client/features/editor/shared-commands.js must be loaded before client/editor-toolbar.js.");
}

if (!editorToolbarUiModule?.createEditorToolbarUiController) {
  throw new Error("client/features/editor/toolbar-ui.js must be loaded before client/editor-toolbar.js.");
}

const {
  normalizeTemplateEditorColorValue,
  normalizeTemplateEditorFontNodes,
  normalizeTemplateEditorInlineFontSizeStyles,
} = editorContentModule;
const { createEditorToolbarFormattingStateController } = editorFormattingStateModule;
const { createSharedEditorCommandHelpers } = editorSharedCommandsModule;

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
  splitCell: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1.5"></rect>
      <path d="M12 5v14"></path>
      <path d="M4 12h16"></path>
      <path d="m9.5 9.5 2.5 2.5-2.5 2.5"></path>
      <path d="m14.5 9.5-2.5 2.5 2.5 2.5"></path>
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
  cellVerticalAlignTop: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="1.5"></rect>
      <path d="M8 8h8"></path>
      <path d="M8 4.5h8"></path>
    </svg>
  `,
  cellVerticalAlignMiddle: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="1.5"></rect>
      <path d="M8 12h8"></path>
      <path d="M8 9.5h8"></path>
      <path d="M8 14.5h8"></path>
    </svg>
  `,
  cellVerticalAlignBottom: `
    <svg class="template-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="1.5"></rect>
      <path d="M8 16h8"></path>
      <path d="M8 19.5h8"></path>
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

const editorToolbarMarkupRenderer = editorToolbarMarkupModule.createEditorToolbarMarkupRenderer({
  EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
  EDITOR_TOOLBAR_FONT_OPTIONS,
  EDITOR_TOOLBAR_FONT_SIZE_OPTIONS,
  EDITOR_TOOLBAR_ICON_MARKUP,
  EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
  isEditorToolbarPresetFontSize,
  normalizeEditorToolbarColorValue,
});

const {
  renderEditorToolbar,
  renderEditorToolbarInner,
} = editorToolbarMarkupRenderer;
const editorToolbarUiController = editorToolbarUiModule.createEditorToolbarUiController({
  isEditorToolbarPresetFontSize,
  normalizeEditorToolbarColorValue,
});
const {
  closeAllEditorToolbarColorPanels,
  closeAllEditorToolbarFontSizeMenus,
  closeAllEditorToolbarTableInsertPanels,
  getEditorToolbarColorPickerElements,
  getEditorToolbarFontSizeComboElements,
  getEditorToolbarFontSizeMenuElement,
  getEditorToolbarTableInsertPopoverElements,
  setEditorToolbarColorPanelVisibility,
  setEditorToolbarFontSizeMenuVisibility,
  setEditorToolbarTableInsertPanelVisibility,
  syncEditorToolbarColorControls,
  syncEditorToolbarFontSizeControls,
  syncEditorToolbarFontSizeMenuSelection,
} = editorToolbarUiController;

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

const editorSharedCommandHelpers = createSharedEditorCommandHelpers({
  EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
  EDITOR_TOOLBAR_FONT_OPTIONS,
  getEditorToolbarColorFallback,
  normalizeEditorToolbarColorValue,
  normalizeTemplateEditorFontNodes,
  normalizeTemplateEditorInlineFontSizeStyles,
  syncEditorToolbarFontSizeControls,
});
const {
  applySharedEditorCommand,
  applySharedEditorFontFamily,
  applySharedEditorFontSize,
} = editorSharedCommandHelpers;
const editorFormattingStateController = createEditorToolbarFormattingStateController({
  EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
  EDITOR_TOOLBAR_FONT_OPTIONS,
  normalizeEditorToolbarColorValue,
  syncEditorToolbarColorControls,
  syncEditorToolbarFontSizeControls,
});
const { updateEditorToolbarFormattingState } = editorFormattingStateController;
