(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorTokenContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorTokenContentController({
    decorateTemplateEditorImages,
    getTemplateEditorSurface,
    normalizeTemplateEditorFontNodes,
    normalizeTemplateEditorTables,
    templateTagDefinitions,
  }) {
    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replaceAll('"', "&quot;");
    }

    function escapeRegExp(value) {
      return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function normalizeTemplateTag(rawTag) {
      const label = String(rawTag || "")
        .trim()
        .replace(/^@\{?/, "")
        .replace(/^#/, "")
        .replace(/\}$/, "");

      if (!label) {
        return "";
      }

      const matchedDefinition = templateTagDefinitions.find((definition) =>
        (Array.isArray(definition.aliases) ? definition.aliases : [definition.label]).includes(label),
      );
      return matchedDefinition?.token || `@{${label}}`;
    }

    function getTemplateEditorTagText(rawTag) {
      const normalizedTag = normalizeTemplateTag(rawTag);

      if (!normalizedTag) {
        return "";
      }

      return `#${normalizedTag.replace(/^@\{/, "").replace(/\}$/, "")}`;
    }

    function setTemplateTokenTextPreservingMarkup(tokenElement, nextText) {
      if (!(tokenElement instanceof Element)) {
        return;
      }

      const normalizedText = String(nextText ?? "");
      const textNodes = [];
      const walker = document.createTreeWalker(tokenElement, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      const meaningfulTextNodes = textNodes.filter((textNode) => String(textNode.textContent || "").replace(/\u00a0/g, " ").trim() !== "");

      if (meaningfulTextNodes.length === 0) {
        tokenElement.textContent = normalizedText;
        return;
      }

      meaningfulTextNodes[0].textContent = normalizedText;
      meaningfulTextNodes.slice(1).forEach((textNode) => textNode.remove());
    }

    function buildTemplateTokenHtml(rawTag) {
      const normalizedTag = normalizeTemplateTag(rawTag);
      const editorTagText = getTemplateEditorTagText(normalizedTag);

      if (!normalizedTag || !editorTagText) {
        return "";
      }

      return `<span class="template-token" data-template-tag-value="${escapeAttribute(normalizedTag)}">${escapeHtml(
        editorTagText,
      )}</span>`;
    }

    function createTemplateTokenElement(rawTag) {
      const normalizedTag = normalizeTemplateTag(rawTag);
      const editorTagText = getTemplateEditorTagText(normalizedTag);
      const tokenElement = document.createElement("span");

      tokenElement.className = "template-token";
      tokenElement.dataset.templateTagValue = normalizedTag;
      tokenElement.textContent = editorTagText;
      return tokenElement;
    }

    function getTemplateTagMatcher() {
      const labels = Array.from(
        new Set(
          templateTagDefinitions.flatMap((definition) =>
            (Array.isArray(definition.aliases) ? definition.aliases : [definition.label]).map((label) => escapeRegExp(label)),
          ),
        ),
      ).join("|");

      if (!labels) {
        return /$^/g;
      }

      return new RegExp(`@\\{(${labels})\\}|@(${labels})|#(${labels})`, "g");
    }

    function stripTemplateEditorTransientState(rootElement) {
      if (!rootElement?.querySelectorAll) {
        return;
      }

      rootElement
        .querySelectorAll(".template-editor-image-selection, .template-editor-image-resize-handle")
        .forEach((element) => element.remove());

      const transientClassNames = [
        "template-editor-image-object",
        "is-selected-object",
        "is-moving-object",
        "is-floating-object",
        "is-active-cell",
        "is-selected-cell",
      ];
      const transientSelector = transientClassNames.map((className) => `.${className}`).join(", ");

      rootElement.querySelectorAll(transientSelector).forEach((element) => {
        transientClassNames.forEach((className) => element.classList.remove(className));
      });

      rootElement.querySelectorAll("img[draggable]").forEach((imageElement) => {
        imageElement.removeAttribute("draggable");
      });

      rootElement.querySelectorAll("img[contenteditable]").forEach((imageElement) => {
        imageElement.removeAttribute("contenteditable");
      });
    }

    function normalizeTemplateTagNodes(rootElement) {
      if (!rootElement) {
        return;
      }

      rootElement.querySelectorAll("[data-template-tag-value]").forEach((tokenElement) => {
        const normalizedTag = normalizeTemplateTag(tokenElement.dataset.templateTagValue || tokenElement.textContent || "");
        tokenElement.classList.remove("template-data-fit");
        tokenElement.classList.add("template-token");
        tokenElement.dataset.templateTagValue = normalizedTag;
        setTemplateTokenTextPreservingMarkup(tokenElement, getTemplateEditorTagText(normalizedTag));
      });

      const tagMatcher = getTemplateTagMatcher();
      const textNodes = [];
      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        const currentNode = walker.currentNode;

        if (!currentNode.parentElement || currentNode.parentElement.closest("[data-template-tag-value]")) {
          continue;
        }

        textNodes.push(currentNode);
      }

      textNodes.forEach((textNode) => {
        const sourceText = textNode.textContent || "";
        tagMatcher.lastIndex = 0;

        if (!tagMatcher.test(sourceText)) {
          return;
        }

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        sourceText.replace(tagMatcher, (matchedText, bracedLabel, plainLabel, hashLabel, offset) => {
          const label = bracedLabel || plainLabel || hashLabel;

          if (offset > lastIndex) {
            fragment.append(sourceText.slice(lastIndex, offset));
          }

          fragment.append(createTemplateTokenElement(`@{${label}}`));
          lastIndex = offset + matchedText.length;
          return matchedText;
        });

        if (lastIndex < sourceText.length) {
          fragment.append(sourceText.slice(lastIndex));
        }

        textNode.replaceWith(fragment);
      });
    }

    function prepareTemplateEditorContent(templateHtml) {
      const container = document.createElement("div");
      container.innerHTML = String(templateHtml || "");
      stripTemplateEditorTransientState(container);
      normalizeTemplateEditorFontNodes(container);
      normalizeTemplateTagNodes(container);
      normalizeTemplateEditorTables(container);

      if (!container.querySelector(".template-doc")) {
        const wrapper = document.createElement("div");
        wrapper.className = "template-doc";
        wrapper.innerHTML = container.innerHTML;
        container.innerHTML = "";
        container.append(wrapper);
      }

      decorateTemplateEditorImages(container);

      return container.innerHTML;
    }

    function getTemplateEditorSerializedHtml() {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return "";
      }

      const clone = templateEditorSurface.cloneNode(true);
      clone.querySelectorAll("[data-template-tag-value]").forEach((tokenElement) => {
        const normalizedTag = normalizeTemplateTag(tokenElement.dataset.templateTagValue || tokenElement.textContent || "");
        tokenElement.classList.remove("template-data-fit");
        tokenElement.classList.add("template-token");
        tokenElement.dataset.templateTagValue = normalizedTag;
        setTemplateTokenTextPreservingMarkup(tokenElement, getTemplateEditorTagText(normalizedTag));
      });
      stripTemplateEditorTransientState(clone);
      normalizeTemplateEditorFontNodes(clone);
      return clone.innerHTML;
    }

    return Object.freeze({
      buildTemplateTokenHtml,
      escapeAttribute,
      escapeHtml,
      escapeRegExp,
      getTemplateEditorSerializedHtml,
      getTemplateEditorTagText,
      normalizeTemplateTag,
      normalizeTemplateTagNodes,
      prepareTemplateEditorContent,
      stripTemplateEditorTransientState,
    });
  }

  return Object.freeze({
    createTemplateEditorTokenContentController,
  });
});
