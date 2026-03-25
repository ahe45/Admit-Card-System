function createTemplateTagReplacementService({
  buildExamineePhotoMarkup,
  escapeHtml,
  findMatchingSpanMarkupEnd,
  formatDateAsYmd,
  stripTemplateTokenDecorationMarkup,
  templateTagDefinitions,
}) {
  function getTemplateTagReplacement(definition, examinee) {
    if (definition.token === "@{수험생사진}") {
      return buildExamineePhotoMarkup(examinee);
    }

    const wrapTemplateTextValue = (value) => {
      const normalizedValue = String(value ?? "");

      if (!normalizedValue) {
        return "";
      }

      return `<span class="template-data-fit" data-template-data-fit="true">${escapeHtml(normalizedValue)}</span>`;
    };

    if (definition.examineeKey === "currentDate") {
      return wrapTemplateTextValue(examinee?.currentDate || formatDateAsYmd(new Date()));
    }

    return wrapTemplateTextValue(examinee[definition.examineeKey] ?? "");
  }

  function getTemplateTagEditorText(definition) {
    if (!definition?.token) {
      return "";
    }

    return `#${String(definition.token).replace(/^@\{/, "").replace(/\}$/, "")}`;
  }

  function getTemplateTagPlainTextReplacement(definition, examinee) {
    if (definition.token === "@{수험생사진}") {
      return buildExamineePhotoMarkup(examinee);
    }

    if (definition.examineeKey === "currentDate") {
      return escapeHtml(String(examinee?.currentDate || formatDateAsYmd(new Date())));
    }

    return escapeHtml(String(examinee[definition.examineeKey] ?? ""));
  }

  function findTemplateTagDefinitionByValue(rawValue) {
    const normalizedValue = String(rawValue || "").trim();

    if (!normalizedValue) {
      return null;
    }

    return (
      templateTagDefinitions.find((definition) =>
        [
          definition.token,
          definition.legacyTag,
          definition.editorToken,
          ...(definition.editorTokens || []),
          ...(definition.legacyTokens || []),
          ...(definition.legacyTags || []),
        ]
          .filter(Boolean)
          .includes(normalizedValue),
      ) || null
    );
  }

  function getStyledTemplateTagReplacement(tokenMarkup, definition, examinee) {
    if (definition?.token === "@{수험생사진}") {
      return buildExamineePhotoMarkup(examinee);
    }

    const replacementMarkup = getTemplateTagReplacement(definition, examinee);

    if (!replacementMarkup) {
      return "";
    }

    const cleanedMarkup = stripTemplateTokenDecorationMarkup(tokenMarkup);
    const editorTagText = getTemplateTagEditorText(definition);

    if (cleanedMarkup && editorTagText && cleanedMarkup.includes(editorTagText)) {
      return cleanedMarkup.replaceAll(editorTagText, replacementMarkup);
    }

    return replacementMarkup;
  }

  function replaceStyledTemplateTagMarkup(markup, examinee) {
    const sourceMarkup = String(markup || "");

    if (!sourceMarkup) {
      return sourceMarkup;
    }

    const tagPattern = /<span\b[^>]*\sdata-template-tag-value=(["'])([^"']*)\1[^>]*>/gi;
    let nextMarkup = "";
    let lastIndex = 0;
    let match;

    while ((match = tagPattern.exec(sourceMarkup))) {
      const tagStartIndex = match.index;
      const tagEndIndex = findMatchingSpanMarkupEnd(sourceMarkup, tagStartIndex);

      if (tagEndIndex < 0) {
        continue;
      }

      const definition = findTemplateTagDefinitionByValue(match[2]);

      if (!definition) {
        continue;
      }

      nextMarkup += sourceMarkup.slice(lastIndex, tagStartIndex);
      nextMarkup += getStyledTemplateTagReplacement(sourceMarkup.slice(tagStartIndex, tagEndIndex), definition, examinee);
      lastIndex = tagEndIndex;
      tagPattern.lastIndex = tagEndIndex;
    }

    if (lastIndex === 0) {
      return sourceMarkup;
    }

    return `${nextMarkup}${sourceMarkup.slice(lastIndex)}`;
  }

  return Object.freeze({
    getTemplateTagPlainTextReplacement,
    replaceStyledTemplateTagMarkup,
  });
}

module.exports = {
  createTemplateTagReplacementService,
};
