const bwipjs = require("bwip-js");
const QRCode = require("qrcode");

const TEMPLATE_GENERATED_OBJECT_ALT_SUFFIX = Object.freeze({
  barcode: "Code128 바코드",
  qrcode: "QR코드",
});

function createTemplateRenderingService({
  createHttpError,
  escapeHtml,
  formatDateAsYmd,
  templateTagDefinitions,
}) {
  function buildExamineePhotoMarkup(examinee) {
    if (!examinee?.photoBlob || !examinee?.photoMime) {
      return '<span class="examinee-photo-placeholder">사진 미등록</span>';
    }

    const encodedImage = Buffer.from(examinee.photoBlob).toString("base64");
    return `<img class="examinee-photo-token-image" src="data:${examinee.photoMime};base64,${encodedImage}" alt="${escapeHtml(
      `${examinee.name || examinee.examineeNo || "수험생"} 사진`,
    )}" />`;
  }

  function getTemplateGeneratedObjectValue(examinee) {
    const examineeNo = String(examinee?.examineeNo ?? "").trim();
    return examineeNo || "-";
  }

  async function buildTemplateGeneratedObjectSvg(objectType, rawValue) {
    const normalizedType = String(objectType || "").trim().toLowerCase();
    const value = String(rawValue ?? "").trim() || "-";

    if (normalizedType === "barcode") {
      return bwipjs.toSVG({
        bcid: "code128",
        text: value,
        scale: 2,
        height: 12,
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0,
        backgroundcolor: "FFFFFF",
      });
    }

    if (normalizedType === "qrcode") {
      return QRCode.toString(value, {
        type: "svg",
        margin: 0,
        width: 168,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    }

    throw createHttpError(400, "지원하지 않는 개체 타입입니다.");
  }

  function buildTemplateGeneratedObjectDataUri(svgMarkup) {
    return `data:image/svg+xml;base64,${Buffer.from(String(svgMarkup || ""), "utf8").toString("base64")}`;
  }

  function setHtmlTagAttribute(tagMarkup, attributeName, attributeValue) {
    const serializedValue = escapeHtml(String(attributeValue ?? ""));
    const attributePattern = new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`, "i");

    if (attributePattern.test(tagMarkup)) {
      return tagMarkup.replace(attributePattern, ` ${attributeName}="${serializedValue}"`);
    }

    const closingIndex = tagMarkup.endsWith("/>") ? tagMarkup.lastIndexOf("/>") : tagMarkup.lastIndexOf(">");

    if (closingIndex === -1) {
      return tagMarkup;
    }

    return `${tagMarkup.slice(0, closingIndex)} ${attributeName}="${serializedValue}"${tagMarkup.slice(closingIndex)}`;
  }

  function appendHtmlTagClass(tagMarkup, className) {
    const normalizedClassName = String(className || "").trim();

    if (!normalizedClassName) {
      return tagMarkup;
    }

    const classPattern = /\sclass=(["'])([^"']*)\1/i;

    if (classPattern.test(tagMarkup)) {
      return tagMarkup.replace(classPattern, (fullMatch, quote, classValue) => {
        const nextClassNames = String(classValue || "")
          .split(/\s+/)
          .filter(Boolean);

        if (!nextClassNames.includes(normalizedClassName)) {
          nextClassNames.push(normalizedClassName);
        }

        return ` class=${quote}${nextClassNames.join(" ")}${quote}`;
      });
    }

    return setHtmlTagAttribute(tagMarkup, "class", normalizedClassName);
  }

  function extractExamineePhotoCellMarkup(content) {
    const photoPattern =
      /(<img\b[^>]*class=(["'])[^"']*\bexaminee-photo-token-image\b[^"']*\2[^>]*>|<span\b[^>]*class=(["'])[^"']*\bexaminee-photo-placeholder\b[^"']*\3[^>]*>[\s\S]*?<\/span>)/i;
    return String(content || "").match(photoPattern)?.[1] || "";
  }

  function normalizeExamineePhotoTableCellContent(content) {
    const photoMarkup = extractExamineePhotoCellMarkup(content);

    if (!photoMarkup) {
      return String(content || "");
    }

    const remainder = String(content || "").replace(photoMarkup, "");
    const normalizedRemainder = remainder
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/<[^>]+>/g, "")
      .trim();

    return normalizedRemainder === "" ? photoMarkup : String(content || "");
  }

  function markExamineePhotoTableCells(markup) {
    return String(markup || "").replace(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (fullMatch, tagName, attributes, content) => {
      if (!/(examinee-photo-token-image|examinee-photo-placeholder)/i.test(content)) {
        return fullMatch;
      }

      const openingTag = appendHtmlTagClass(`<${tagName}${attributes}>`, "examinee-photo-token-cell");
      return `${openingTag}${normalizeExamineePhotoTableCellContent(content)}</${tagName}>`;
    });
  }

  async function replaceTemplateGeneratedObjectMarkup(markup, examinee) {
    const objectPattern = /<img\b[^>]*\bdata-template-object-type=(["'])(barcode|qrcode)\1[^>]*>/gi;
    const matches = Array.from(String(markup || "").matchAll(objectPattern));

    if (matches.length === 0) {
      return String(markup || "");
    }

    const objectValue = getTemplateGeneratedObjectValue(examinee);
    const replacementTags = await Promise.all(
      matches.map(async (match) => {
        const objectType = match[2];
        const svgMarkup = await buildTemplateGeneratedObjectSvg(objectType, objectValue);
        let nextTagMarkup = setHtmlTagAttribute(match[0], "src", buildTemplateGeneratedObjectDataUri(svgMarkup));
        nextTagMarkup = setHtmlTagAttribute(
          nextTagMarkup,
          "alt",
          `${objectValue} ${TEMPLATE_GENERATED_OBJECT_ALT_SUFFIX[objectType] || "개체"}`,
        );
        return nextTagMarkup;
      }),
    );

    let cursor = 0;
    let replacementIndex = 0;
    let nextMarkup = "";

    matches.forEach((match) => {
      nextMarkup += markup.slice(cursor, match.index);
      nextMarkup += replacementTags[replacementIndex];
      cursor = match.index + match[0].length;
      replacementIndex += 1;
    });

    nextMarkup += markup.slice(cursor);
    return nextMarkup;
  }

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

  function findMatchingSpanMarkupEnd(markup, startIndex) {
    const openTagEndIndex = String(markup || "").indexOf(">", startIndex);

    if (openTagEndIndex < 0) {
      return -1;
    }

    const tagPattern = /<span\b|<\/span>/gi;
    tagPattern.lastIndex = openTagEndIndex + 1;
    let depth = 1;
    let match;

    while ((match = tagPattern.exec(markup))) {
      if (match[0][1] === "/") {
        depth -= 1;

        if (depth === 0) {
          return tagPattern.lastIndex;
        }
        continue;
      }

      depth += 1;
    }

    return -1;
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

  function stripTemplateTokenDecorationMarkup(tokenMarkup) {
    let nextMarkup = String(tokenMarkup || "");

    nextMarkup = nextMarkup.replace(/\sdata-template-tag-value=(["'])[^"']*\1/gi, "");
    nextMarkup = nextMarkup.replace(/\sclass=(["'])([^"']*)\1/gi, (fullMatch, quote, classValue) => {
      const nextClasses = String(classValue || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((className) => className !== "template-token" && className !== "template-data-fit");

      return nextClasses.length > 0 ? ` class=${quote}${nextClasses.join(" ")}${quote}` : "";
    });

    return nextMarkup;
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

  function sanitizeTemplateRenderHtml(templateHtml) {
    const transientClassNames = new Set([
      "template-editor-image-object",
      "is-selected-object",
      "is-moving-object",
      "is-floating-object",
      "is-active-cell",
      "is-selected-cell",
    ]);
    let markup = String(templateHtml || "");

    markup = markup
      .replace(/<div[^>]*class=(["'])[^"']*\btemplate-editor-image-selection\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<button[^>]*class=(["'])[^"']*\btemplate-editor-image-resize-handle\b[^"']*\1[^>]*>[\s\S]*?<\/button>/gi, "")
      .replace(/\sdraggable=(["'])[^"']*\1/gi, "")
      .replace(/\scontenteditable=(["'])[^"']*\1/gi, "");

    markup = markup.replace(/\sclass=(["'])([^"']*)\1/gi, (fullMatch, quote, classValue) => {
      const nextClassNames = String(classValue || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((className) => !transientClassNames.has(className));

      return nextClassNames.length > 0 ? ` class=${quote}${nextClassNames.join(" ")}${quote}` : "";
    });

    return markup;
  }

  async function renderTemplateWithExaminee(templateHtml, examinee) {
    let markup = sanitizeTemplateRenderHtml(templateHtml);
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

  return Object.freeze({
    buildTemplateGeneratedObjectSvg,
    renderTemplateWithExaminee,
  });
}

module.exports = {
  createTemplateRenderingService,
};
