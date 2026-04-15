(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardLoginNoticeLinkUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function isLoginNoticeElementTag(element, tagName) {
    return String(element?.tagName || "").toUpperCase() === String(tagName || "").toUpperCase();
  }

  function normalizeLoginNoticeLinkUrl(rawValue = "") {
    const normalizedValue = String(rawValue || "").trim();

    if (!normalizedValue) {
      return "";
    }

    if (/^www\.\S+$/i.test(normalizedValue)) {
      return `https://${normalizedValue}`;
    }

    if (/^(?:https?:\/\/|mailto:|tel:)\S+$/i.test(normalizedValue)) {
      return normalizedValue;
    }

    if (/^(?:\/|\.\/|\.\.\/)\S*$/.test(normalizedValue)) {
      return normalizedValue;
    }

    return "";
  }

  function decorateLoginNoticeAnchor(anchorElement) {
    if (!isLoginNoticeElementTag(anchorElement, "a")) {
      return false;
    }

    const href = normalizeLoginNoticeLinkUrl(anchorElement.getAttribute("href") || "");

    if (!href) {
      anchorElement.removeAttribute("href");
      anchorElement.removeAttribute("target");
      anchorElement.removeAttribute("rel");
      return false;
    }

    anchorElement.setAttribute("href", href);
    anchorElement.setAttribute("target", "_blank");
    anchorElement.setAttribute("rel", "noopener noreferrer");
    return true;
  }

  function decorateLoginNoticeLinks(rootElement) {
    if (!rootElement?.querySelectorAll) {
      return rootElement;
    }

    rootElement.querySelectorAll("a").forEach((anchorElement) => {
      decorateLoginNoticeAnchor(anchorElement);
    });

    return rootElement;
  }

  function buildLoginNoticeMarkup(rawHtml = "", fallbackHtml = "") {
    const normalizedHtml = String(rawHtml || "").trim();
    const resolvedMarkup = normalizedHtml || String(fallbackHtml || "").trim();

    if (!resolvedMarkup || typeof document === "undefined") {
      return resolvedMarkup;
    }

    const container = document.createElement("div");

    container.innerHTML = resolvedMarkup;
    decorateLoginNoticeLinks(container);
    return container.innerHTML;
  }

  function getLoginNoticeImageTarget(target, rootElement = null) {
    const baseElement =
      target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
    const imageElement = baseElement?.closest("img") || null;

    if (!isLoginNoticeElementTag(imageElement, "img")) {
      return null;
    }

    if (rootElement?.contains && !rootElement.contains(imageElement)) {
      return null;
    }

    return imageElement;
  }

  function getLoginNoticeClosestLink(target, rootElement = null) {
    const baseElement =
      target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
    const anchorElement = baseElement?.closest("a") || null;

    if (!isLoginNoticeElementTag(anchorElement, "a")) {
      return null;
    }

    if (rootElement?.contains && !rootElement.contains(anchorElement)) {
      return null;
    }

    return anchorElement;
  }

  function upsertLoginNoticeImageLink({
    imageElement = null,
    href = "",
    rootElement = null,
  } = {}) {
    if (!isLoginNoticeElementTag(imageElement, "img")) {
      return null;
    }

    if (rootElement?.contains && !rootElement.contains(imageElement)) {
      return null;
    }

    let anchorElement = getLoginNoticeClosestLink(imageElement, rootElement);

    if (!isLoginNoticeElementTag(anchorElement, "a")) {
      const parentNode = imageElement.parentNode;

      if (!parentNode) {
        return null;
      }

      anchorElement = document.createElement("a");
      parentNode.insertBefore(anchorElement, imageElement);
      anchorElement.appendChild(imageElement);
    }

    anchorElement.setAttribute("href", String(href || "").trim());
    decorateLoginNoticeAnchor(anchorElement);
    return anchorElement;
  }

  return Object.freeze({
    buildLoginNoticeMarkup,
    decorateLoginNoticeAnchor,
    decorateLoginNoticeLinks,
    getLoginNoticeClosestLink,
    getLoginNoticeImageTarget,
    normalizeLoginNoticeLinkUrl,
    upsertLoginNoticeImageLink,
  });
});
