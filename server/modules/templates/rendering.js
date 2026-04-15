const { createTemplateGeneratedObjectService } = require("./rendering/generated-objects");
const { createTemplateRenderingMarkupUtils } = require("./rendering/markup-utils");
const { createTemplatePhotoMarkupService } = require("./rendering/photo-markup");
const { createTemplateTagReplacementService } = require("./rendering/tag-replacements");

function createTemplateRenderingService({
  createHttpError,
  escapeHtml,
  formatDateAsYmd,
  templateTagDefinitions,
}) {
  const markupUtils = createTemplateRenderingMarkupUtils({ escapeHtml });
  const {
    appendHtmlTagClass,
    findMatchingSpanMarkupEnd,
    sanitizeTemplateRenderHtml,
    setHtmlTagAttribute,
    stripTemplateTokenDecorationMarkup,
  } = markupUtils;

  const photoMarkupService = createTemplatePhotoMarkupService({
    appendHtmlTagClass,
    escapeHtml,
  });
  const { buildExamineePhotoMarkup, markExamineePhotoTableCells } = photoMarkupService;

  const generatedObjectService = createTemplateGeneratedObjectService({
    createHttpError,
    setHtmlTagAttribute,
  });
  const { buildTemplateGeneratedObjectSvg, replaceTemplateGeneratedObjectMarkup } = generatedObjectService;

  const tagReplacementService = createTemplateTagReplacementService({
    buildExamineePhotoMarkup,
    escapeHtml,
    findMatchingSpanMarkupEnd,
    formatDateAsYmd,
    stripTemplateTokenDecorationMarkup,
    templateTagDefinitions,
  });
  const {
    getTemplateTagPlainTextReplacement,
    replaceStyledTemplateTagMarkup,
  } = tagReplacementService;

  async function renderTemplateMarkupWithExaminee(markup, examinee) {
    markup = replaceStyledTemplateTagMarkup(markup, examinee);

    templateTagDefinitions.forEach((definition) => {
      const replacementText = getTemplateTagPlainTextReplacement(definition, examinee);
      [definition.token, definition.editorToken, ...(definition.editorTokens || []), ...(definition.legacyTokens || [])]
        .filter(Boolean)
        .forEach((tokenValue) => {
          markup = markup.replaceAll(tokenValue, replacementText);
        });

      [definition.legacyTag, ...(definition.legacyTags || [])]
        .filter(Boolean)
        .forEach((legacyTag) => {
          markup = markup.replaceAll(legacyTag, replacementText);
        });
    });

    const renderedMarkup = await replaceTemplateGeneratedObjectMarkup(markup, examinee);
    return markExamineePhotoTableCells(renderedMarkup);
  }

  function createTemplateExamineeRenderer(templateHtml) {
    const sanitizedTemplateHtml = sanitizeTemplateRenderHtml(templateHtml);

    return async function renderTemplateMarkup(examinee) {
      return renderTemplateMarkupWithExaminee(sanitizedTemplateHtml, examinee);
    };
  }

  async function renderTemplateWithExaminee(templateHtml, examinee) {
    return createTemplateExamineeRenderer(templateHtml)(examinee);
  }

  return Object.freeze({
    buildTemplateGeneratedObjectSvg,
    createTemplateExamineeRenderer,
    renderTemplateWithExaminee,
  });
}

module.exports = {
  createTemplateRenderingService,
};
