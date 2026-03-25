(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardBusyOverlays = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createBusyOverlayController({
    createPdfGenerationState,
    createUploadState,
    getDocumentBody,
    getPdfGenerationElements,
    getUploadOverlayElements,
    hideToast,
    minUploadOverlayDisplayMs = 0,
    showToast,
    state,
    wait,
  }) {
    function isPdfGenerationActive() {
      return Boolean(state.pdfGeneration?.isActive);
    }

    function isUploadActive() {
      return Boolean(state.upload?.isActive);
    }

    function isBusyOverlayActive() {
      return isPdfGenerationActive() || isUploadActive();
    }

    function buildBusyOverlayMessage(message = "") {
      const headline = String(message || "").trim();

      return headline
        ? `${headline}\n잠시만 기다려 주세요.`
        : "잠시만\n기다려 주세요.";
    }

    function buildPdfGenerationMessage(message = "") {
      return buildBusyOverlayMessage(message);
    }

    function buildUploadOverlayMessage(message = "") {
      return buildBusyOverlayMessage(message);
    }

    function normalizeProgressValue(value) {
      const normalizedValue = Math.round(Number(value));

      if (!Number.isFinite(normalizedValue)) {
        return 0;
      }

      return Math.max(0, Math.min(100, normalizedValue));
    }

    function syncAppBusyState() {
      const documentBody = typeof getDocumentBody === "function" ? getDocumentBody() : null;
      documentBody?.classList.toggle("app-busy", isBusyOverlayActive());
    }

    function syncPdfGenerationOverlay() {
      const {
        overlay,
        messageElement,
        progressElement,
        progressLabelElement,
        progressValueElement,
        progressBarElement,
        progressFillElement,
      } = typeof getPdfGenerationElements === "function" ? getPdfGenerationElements() : {};
      const isActive = isPdfGenerationActive();
      const progressMode = state.pdfGeneration?.progressMode || "hidden";
      const hasProgress = isActive && progressMode !== "hidden";
      const progressValue = normalizeProgressValue(state.pdfGeneration?.progressValue);

      if (overlay) {
        overlay.classList.toggle("hidden", !isActive);
        overlay.setAttribute("aria-hidden", isActive ? "false" : "true");
      }

      if (messageElement) {
        messageElement.textContent = state.pdfGeneration?.message || buildPdfGenerationMessage();
      }

      if (progressElement) {
        progressElement.classList.toggle("hidden", !hasProgress);
        progressElement.setAttribute("aria-hidden", hasProgress ? "false" : "true");
      }

      if (progressLabelElement) {
        progressLabelElement.textContent = state.pdfGeneration?.progressLabel || "PDF 생성 진행률";
      }

      if (progressValueElement) {
        progressValueElement.textContent = progressMode === "determinate" ? `${progressValue}%` : "진행 중";
      }

      if (progressBarElement) {
        progressBarElement.classList.toggle("is-indeterminate", progressMode === "indeterminate");
      }

      if (progressFillElement) {
        progressFillElement.style.width = progressMode === "determinate" ? `${progressValue}%` : "";
      }

      syncAppBusyState();
    }

    function setPdfGenerationState({
      isActive = state.pdfGeneration?.isActive,
      message = "",
      progressMode = state.pdfGeneration?.progressMode || "hidden",
      progressValue = state.pdfGeneration?.progressValue || 0,
      progressLabel = state.pdfGeneration?.progressLabel || "",
    } = {}) {
      const nextIsActive = Boolean(isActive);

      state.pdfGeneration = {
        ...createPdfGenerationState(),
        ...state.pdfGeneration,
        isActive: nextIsActive,
        message: nextIsActive ? buildPdfGenerationMessage(message) : "",
        progressMode: nextIsActive ? progressMode : "hidden",
        progressValue: nextIsActive ? normalizeProgressValue(progressValue) : 0,
        progressLabel: nextIsActive ? String(progressLabel || "") : "",
      };
      syncPdfGenerationOverlay();
    }

    function resetPdfGenerationState() {
      state.pdfGeneration = createPdfGenerationState();
      syncPdfGenerationOverlay();
    }

    async function runWithPdfGenerationLock(message, task, options = {}) {
      if (isPdfGenerationActive()) {
        return null;
      }

      setPdfGenerationState({
        isActive: true,
        message,
        progressMode: options.progressMode || "hidden",
        progressValue: options.progressValue || 0,
        progressLabel: options.progressLabel || "",
      });

      try {
        return await task();
      } finally {
        resetPdfGenerationState();
      }
    }

    function syncUploadOverlay() {
      const {
        overlay,
        titleElement,
        messageElement,
        progressElement,
        progressLabelElement,
        progressValueElement,
        progressBarElement,
        progressFillElement,
      } = typeof getUploadOverlayElements === "function" ? getUploadOverlayElements() : {};
      const isActive = isUploadActive();
      const progressMode = state.upload?.progressMode || "hidden";
      const hasProgress = isActive && progressMode !== "hidden";
      const progressValue = normalizeProgressValue(state.upload?.progressValue);

      if (overlay) {
        overlay.classList.toggle("hidden", !isActive);
        overlay.setAttribute("aria-hidden", isActive ? "false" : "true");
      }

      if (titleElement) {
        titleElement.textContent = state.upload?.title || "수험생 데이터 업로드 중";
      }

      if (messageElement) {
        messageElement.textContent = state.upload?.message || buildUploadOverlayMessage();
      }

      if (progressElement) {
        progressElement.classList.toggle("hidden", !hasProgress);
        progressElement.setAttribute("aria-hidden", hasProgress ? "false" : "true");
      }

      if (progressLabelElement) {
        progressLabelElement.textContent = state.upload?.progressLabel || "업로드 진행률";
      }

      if (progressValueElement) {
        progressValueElement.textContent = progressMode === "determinate" ? `${progressValue}%` : "진행 중";
      }

      if (progressBarElement) {
        progressBarElement.classList.toggle("is-indeterminate", progressMode === "indeterminate");
      }

      if (progressFillElement) {
        progressFillElement.style.width = progressMode === "determinate" ? `${progressValue}%` : "";
      }

      syncAppBusyState();
    }

    function setUploadOverlayState({
      isActive = state.upload?.isActive,
      title = state.upload?.title,
      message = "",
      progressMode = state.upload?.progressMode || "hidden",
      progressValue = state.upload?.progressValue || 0,
      progressLabel = state.upload?.progressLabel || "",
    } = {}) {
      const nextIsActive = Boolean(isActive);
      const wasActive = Boolean(state.upload?.isActive);
      const activatedAt = nextIsActive
        ? wasActive && state.upload?.activatedAt
          ? state.upload.activatedAt
          : Date.now()
        : 0;

      state.upload = {
        ...createUploadState(),
        ...state.upload,
        isActive: nextIsActive,
        activatedAt,
        title: String(title || state.upload?.title || createUploadState().title),
        message: nextIsActive ? buildUploadOverlayMessage(message) : "",
        progressMode: nextIsActive ? progressMode : "hidden",
        progressValue: nextIsActive ? normalizeProgressValue(progressValue) : 0,
        progressLabel: nextIsActive ? String(progressLabel || "") : "",
      };
      syncUploadOverlay();
    }

    function resetUploadState() {
      state.upload = createUploadState();
      syncUploadOverlay();
    }

    async function closeUploadOverlayWithToast(message, type = "success", duration = 3200) {
      const activatedAt = Number(state.upload?.activatedAt || 0);
      const elapsedMs = activatedAt > 0 ? Date.now() - activatedAt : 0;
      const remainingMs = Math.max(0, Number(minUploadOverlayDisplayMs || 0) - elapsedMs);

      if (remainingMs > 0) {
        await wait(remainingMs);
      }

      resetUploadState();
      showToast(message, type, duration);
    }

    function showUploadFailureAlert(message) {
      const normalizedMessage = String(message || "").trim();

      if (!normalizedMessage) {
        return;
      }

      hideToast();
      window.alert(normalizedMessage);
    }

    async function closeUploadOverlayWithAlert(message) {
      const activatedAt = Number(state.upload?.activatedAt || 0);
      const elapsedMs = activatedAt > 0 ? Date.now() - activatedAt : 0;
      const remainingMs = Math.max(0, Number(minUploadOverlayDisplayMs || 0) - elapsedMs);

      if (remainingMs > 0) {
        await wait(remainingMs);
      }

      resetUploadState();
      showUploadFailureAlert(message);
    }

    return Object.freeze({
      buildBusyOverlayMessage,
      buildPdfGenerationMessage,
      buildUploadOverlayMessage,
      closeUploadOverlayWithAlert,
      closeUploadOverlayWithToast,
      isBusyOverlayActive,
      isPdfGenerationActive,
      isUploadActive,
      normalizeProgressValue,
      resetPdfGenerationState,
      resetUploadState,
      runWithPdfGenerationLock,
      setPdfGenerationState,
      setUploadOverlayState,
      showUploadFailureAlert,
      syncAppBusyState,
      syncPdfGenerationOverlay,
      syncUploadOverlay,
    });
  }

  return Object.freeze({
    createBusyOverlayController,
  });
});
