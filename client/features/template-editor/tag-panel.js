(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateTagPanel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const escapeAttribute = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const getTemplateTagDefinitions = () => globalThis.AdmitCardAppConfig?.templateTagDefinitions || [];

  function renderTemplateTagButtonsMarkup() {
    return getTemplateTagDefinitions()
      .map((definition) => {
        const editorToken = String(definition?.editorToken || "").trim();

        if (!editorToken) {
          return "";
        }

        return `<button class="template-tag-button" data-template-tag="${escapeAttribute(editorToken)}" type="button">${escapeHtml(
          editorToken,
        )}</button>`;
      })
      .join("");
  }

  function hydrateTemplateTagPanel(rootElement = document.getElementById("templateTagStrip")) {
    if (!(rootElement instanceof HTMLElement)) {
      return false;
    }

    rootElement.innerHTML = renderTemplateTagButtonsMarkup();
    return true;
  }

  if (typeof document !== "undefined") {
    hydrateTemplateTagPanel();
  }

  return {
    hydrateTemplateTagPanel,
    renderTemplateTagButtonsMarkup,
  };
});
