(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorKitManifest = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const css = Object.freeze([
    "styles/base.css",
    "styles/features/templates.css",
    "styles/features/template-editor.css",
    "client/template-editor-kit/template-editor-kit.css",
  ]);

  const requiredScripts = Object.freeze([
    "client/features/editor/content-shared.js",
    "client/features/editor/formatting-state.js",
    "client/features/editor/shared-commands.js",
    "client/features/editor/table-utils.js",
    "client/features/editor/toolbar-markup.js",
    "client/features/editor/toolbar-ui.js",
    "client/features/editor/toolbar-controls.js",
    "client/editor-toolbar.js",
    "client/features/template-editor/generated-objects.js",
    "client/features/template-editor/page-settings.js",
    "client/features/template-editor/preview.js",
    "client/features/template-editor/image-selection.js",
    "client/features/template-editor/image-session.js",
    "client/features/template-editor/image-tools.js",
    "client/features/template-editor/commands.js",
    "client/features/template-editor/token-content.js",
    "client/features/template-editor/selection-range.js",
    "client/features/template-editor/selection-tokens.js",
    "client/features/template-editor/selection-state.js",
    "client/features/template-editor/selection-history.js",
    "client/features/template-editor/selection.js",
    "client/features/template-editor/runtime.js",
    "client/features/template-editor/table-selection.js",
    "client/features/template-editor/table-resize.js",
    "client/features/template-editor/table-structure.js",
    "client/features/template-editor/table-sizing.js",
    "client/features/template-editor/table-actions.js",
    "client/features/template-editor/table-interaction.js",
    "client/features/template-editor/table-tools.js",
    "client/features/template-editor/table-formatting.js",
    "client/features/template-editor/toolbar-state.js",
    "client/template-editor-kit/template-editor-kit.js",
  ]);

  const optionalPresetScripts = Object.freeze([
    "shared/app-config.js",
  ]);

  return Object.freeze({
    css,
    optionalPresetScripts,
    requiredScripts,
  });
});
