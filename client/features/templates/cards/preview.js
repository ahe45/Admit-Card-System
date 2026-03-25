(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateCardPreview = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateCardPreviewService({
    getDefaultTemplateContent,
    getTemplatePreviewExaminee,
    renderTemplateWithExaminee,
    state,
  }) {
    function getTemplateCreationSeed() {
      const sourceTemplate = state.templateCards.find((card) => card.status === "used") || state.templateCards[0] || null;

      return {
        description: String(sourceTemplate?.description || "").trim() || "기본 수험표 레이아웃",
        version: String(sourceTemplate?.version || "").trim() || "초안 버전 v1.0",
        contentHtml: String(sourceTemplate?.contentHtml || "").trim() || getDefaultTemplateContent(),
      };
    }

    function getTemplatePreviewDate() {
      const serverDate = String(state.bootstrap?.serverDate || "").trim();

      if (serverDate) {
        return serverDate;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function renderTemplateCardThumbnail(card) {
      try {
        const previewExaminee = getTemplatePreviewExaminee();
        const sourceHtml = String(card?.contentHtml || "").trim() || getDefaultTemplateContent();
        const renderedHtml = renderTemplateWithExaminee(sourceHtml, previewExaminee);
        const thumbnailContainer = document.createElement("div");

        thumbnailContainer.innerHTML = renderedHtml;
        thumbnailContainer.querySelectorAll("img").forEach((imageElement) => {
          imageElement.loading = "lazy";
          imageElement.decoding = "async";
          imageElement.draggable = false;
        });

        return `
          <article class="template-render-sheet template-card-thumbnail-sheet" aria-hidden="true">
            ${thumbnailContainer.innerHTML}
          </article>
        `;
      } catch (error) {
        return `
          <div class="template-sheet-placeholder" aria-hidden="true">
            <span class="template-sheet-placeholder-title"></span>
            <span class="template-sheet-placeholder-line long"></span>
            <span class="template-sheet-placeholder-line"></span>
            <span class="template-sheet-placeholder-line"></span>
            <span class="template-sheet-placeholder-block"></span>
          </div>
        `;
      }
    }

    return Object.freeze({
      getTemplateCreationSeed,
      getTemplatePreviewDate,
      renderTemplateCardThumbnail,
    });
  }

  return Object.freeze({
    createTemplateCardPreviewService,
  });
});
