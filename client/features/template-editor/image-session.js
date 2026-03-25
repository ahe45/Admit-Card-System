(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorImageSession = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorImageSessionController({
    TEMPLATE_EDITOR_IMAGE_MIN_SIZE,
    getSelectedTemplateEditorImage,
    getTemplateEditorDocumentElement,
    getTemplateEditorImageOverlay,
    getTemplateEditorSurface,
    parseTemplateEditorPixelStyle,
    selectTemplateEditorImage,
    state,
    syncTemplateEditorContent,
    updateTemplateEditorImageSelectionOverlay,
  }) {
    function getTemplateEditorBoundedCoordinate(value, maxValue) {
      const safeMax = Math.max(Math.round(maxValue) || 0, 0);
      return Math.min(Math.max(Math.round(value) || 0, 0), safeMax);
    }

    function prepareTemplateEditorImageForMove(imageElement) {
      const documentElement = getTemplateEditorDocumentElement();
      const templateEditorSurface = getTemplateEditorSurface();

      if (!documentElement || !templateEditorSurface?.contains(imageElement)) {
        return null;
      }

      if (imageElement.parentElement === documentElement && imageElement.style.position === "absolute") {
        imageElement.classList.add("is-floating-object");
        return {
          left: parseTemplateEditorPixelStyle(imageElement.style.left, imageElement.offsetLeft),
          top: parseTemplateEditorPixelStyle(imageElement.style.top, imageElement.offsetTop),
        };
      }

      const imageRect = imageElement.getBoundingClientRect();
      const documentRect = documentElement.getBoundingClientRect();
      const boundedLeft = getTemplateEditorBoundedCoordinate(
        imageRect.left - documentRect.left,
        documentElement.clientWidth - imageRect.width,
      );
      const boundedTop = getTemplateEditorBoundedCoordinate(
        imageRect.top - documentRect.top,
        Math.max(documentElement.scrollHeight, documentElement.clientHeight) - imageRect.height,
      );

      imageElement.style.width = `${Math.max(Math.round(imageRect.width), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
      imageElement.style.height = `${Math.max(Math.round(imageRect.height), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
      imageElement.style.position = "absolute";
      imageElement.style.left = `${boundedLeft}px`;
      imageElement.style.top = `${boundedTop}px`;
      imageElement.style.margin = "0";
      imageElement.style.zIndex = "2";
      imageElement.classList.add("is-floating-object");
      documentElement.append(imageElement);

      return {
        left: boundedLeft,
        top: boundedTop,
      };
    }

    function handleTemplateEditorImageMove(event) {
      const moveSession = state.templateEditor.imageMoveSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (
        !moveSession ||
        moveSession.pointerId !== event.pointerId ||
        !moveSession.image ||
        !templateEditorSurface?.contains(moveSession.image)
      ) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - moveSession.startX;
      const deltaY = event.clientY - moveSession.startY;

      if (!moveSession.isActive && Math.hypot(deltaX, deltaY) < 4) {
        return;
      }

      if (!moveSession.isActive) {
        const startingPosition = prepareTemplateEditorImageForMove(moveSession.image);

        if (!startingPosition) {
          releaseTemplateEditorImageMoveSession({ sync: false });
          return;
        }

        moveSession.startLeft = startingPosition.left;
        moveSession.startTop = startingPosition.top;
        moveSession.lastLeft = startingPosition.left;
        moveSession.lastTop = startingPosition.top;
        moveSession.isActive = true;
        templateEditorSurface?.classList.add("is-image-moving");
        moveSession.image.classList.add("is-moving-object");
      }

      const documentElement = getTemplateEditorDocumentElement();

      if (!documentElement) {
        return;
      }

      const imageRect = moveSession.image.getBoundingClientRect();
      const nextLeft = getTemplateEditorBoundedCoordinate(
        moveSession.startLeft + deltaX,
        documentElement.clientWidth - imageRect.width,
      );
      const nextTop = getTemplateEditorBoundedCoordinate(
        moveSession.startTop + deltaY,
        Math.max(documentElement.scrollHeight, documentElement.clientHeight) - imageRect.height,
      );

      if (nextLeft === moveSession.lastLeft && nextTop === moveSession.lastTop) {
        return;
      }

      moveSession.lastLeft = nextLeft;
      moveSession.lastTop = nextTop;
      moveSession.didChange = true;
      moveSession.image.style.left = `${nextLeft}px`;
      moveSession.image.style.top = `${nextTop}px`;
      updateTemplateEditorImageSelectionOverlay();
    }

    function handleTemplateEditorImageMoveEnd(event) {
      const moveSession = state.templateEditor.imageMoveSession;

      if (!moveSession || moveSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorImageMoveSession({ sync: true });
    }

    function releaseTemplateEditorImageMoveSession({ sync = true } = {}) {
      const moveSession = state.templateEditor.imageMoveSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!moveSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorImageMove);
      window.removeEventListener("pointerup", handleTemplateEditorImageMoveEnd);
      window.removeEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
      state.templateEditor.imageMoveSession = null;
      templateEditorSurface?.classList.remove("is-image-moving");
      moveSession.image?.classList.remove("is-moving-object");

      if (sync && moveSession.didChange && moveSession.image && templateEditorSurface?.contains(moveSession.image)) {
        syncTemplateEditorContent();
        selectTemplateEditorImage(moveSession.image);
        return;
      }

      updateTemplateEditorImageSelectionOverlay();
    }

    function startTemplateEditorImageMoveSession(imageElement, event) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!imageElement || !templateEditorSurface?.contains(imageElement)) {
        return;
      }

      state.templateEditor.imageMoveSession = {
        image: imageElement,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: null,
        startTop: null,
        lastLeft: null,
        lastTop: null,
        isActive: false,
        didChange: false,
      };

      window.addEventListener("pointermove", handleTemplateEditorImageMove);
      window.addEventListener("pointerup", handleTemplateEditorImageMoveEnd);
      window.addEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
    }

    function handleTemplateEditorImageResizeStart(event) {
      const selectedImage = getSelectedTemplateEditorImage();
      const templateEditorSurface = getTemplateEditorSurface();

      if (event.button !== 0 || !selectedImage || !templateEditorSurface?.contains(selectedImage)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const imageRect = selectedImage.getBoundingClientRect();

      state.templateEditor.imageResizeSession = {
        image: selectedImage,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: Math.max(imageRect.width, TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        startHeight: Math.max(imageRect.height, TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        lastWidth: Math.max(Math.round(imageRect.width), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        lastHeight: Math.max(Math.round(imageRect.height), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        didChange: false,
      };

      templateEditorSurface?.classList.add("is-image-resizing");
      getTemplateEditorImageOverlay()?.classList.add("is-resizing");
      window.addEventListener("pointermove", handleTemplateEditorImageResizeMove);
      window.addEventListener("pointerup", handleTemplateEditorImageResizeEnd);
      window.addEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
    }

    function handleTemplateEditorImageResizeMove(event) {
      const resizeSession = state.templateEditor.imageResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (
        !resizeSession ||
        resizeSession.pointerId !== event.pointerId ||
        !resizeSession.image ||
        !templateEditorSurface?.contains(resizeSession.image)
      ) {
        return;
      }

      event.preventDefault();

      const widthScale = (resizeSession.startWidth + (event.clientX - resizeSession.startX)) / resizeSession.startWidth;
      const heightScale = (resizeSession.startHeight + (event.clientY - resizeSession.startY)) / resizeSession.startHeight;
      let scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;

      if (!Number.isFinite(scale) || scale <= 0) {
        scale = TEMPLATE_EDITOR_IMAGE_MIN_SIZE / resizeSession.startWidth;
      }

      const nextWidth = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(resizeSession.startWidth * scale));
      const nextHeight = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(resizeSession.startHeight * scale));

      if (nextWidth === resizeSession.lastWidth && nextHeight === resizeSession.lastHeight) {
        return;
      }

      resizeSession.lastWidth = nextWidth;
      resizeSession.lastHeight = nextHeight;
      resizeSession.didChange = true;
      resizeSession.image.style.width = `${nextWidth}px`;
      resizeSession.image.style.height = `${nextHeight}px`;
      updateTemplateEditorImageSelectionOverlay();
    }

    function handleTemplateEditorImageResizeEnd(event) {
      const resizeSession = state.templateEditor.imageResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorImageResizeSession({ sync: true });
    }

    function releaseTemplateEditorImageResizeSession({ sync = true } = {}) {
      const resizeSession = state.templateEditor.imageResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!resizeSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorImageResizeMove);
      window.removeEventListener("pointerup", handleTemplateEditorImageResizeEnd);
      window.removeEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
      state.templateEditor.imageResizeSession = null;
      templateEditorSurface?.classList.remove("is-image-resizing");
      getTemplateEditorImageOverlay()?.classList.remove("is-resizing");

      if (sync && resizeSession.didChange && resizeSession.image && templateEditorSurface?.contains(resizeSession.image)) {
        syncTemplateEditorContent();
        selectTemplateEditorImage(resizeSession.image);
        return;
      }

      updateTemplateEditorImageSelectionOverlay();
    }

    return Object.freeze({
      handleTemplateEditorImageResizeStart,
      releaseTemplateEditorImageMoveSession,
      releaseTemplateEditorImageResizeSession,
      startTemplateEditorImageMoveSession,
    });
  }

  return Object.freeze({
    createTemplateEditorImageSessionController,
  });
});
