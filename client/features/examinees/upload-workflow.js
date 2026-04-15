(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeUploadWorkflow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createExamineeUploadWorkflowController({
    apiRequest,
    apiRequestWithUploadProgress,
    arrayBufferToBase64,
    buildUploadSummaryMessage,
    clearSelectedUploadFiles,
    closeUploadOverlayWithAlert,
    closeUploadOverlayWithToast,
    getUploadFileInput,
    getUploadPreviewMount,
    getUploadPhotoArchiveInput,
    isUploadActive,
    loadBootstrapData,
    mergeUploadResult,
    readFileAsArrayBuffer,
    setUploadOverlayState,
    showUploadFailureAlert,
    state,
    waitForNextFrame,
    }) {
    const EXAMINEE_UPLOAD_MODE_CONFIG = Object.freeze({
      workbook: Object.freeze({
        title: "수험생 데이터 업로드",
        executeLabel: "데이터 업로드 실행",
        previewMessage: "XLSX 파일을 선택하면 실제 저장 전에 예상 신규/수정 건수를 전체 파일 기준으로 확인할 수 있습니다.",
      }),
      "photo-archive": Object.freeze({
        title: "수험생 사진 업로드",
        executeLabel: "사진 업로드 실행",
        previewMessage: "사진 ZIP 파일을 선택하면 실제 저장 전에 수험번호 매칭 예정 건수를 시뮬레이션합니다.",
      }),
    });
    const EXAMINEE_IMPORT_EXISTING_DATA_POLICY_OPTIONS = Object.freeze([
      Object.freeze({
        value: "insert-only",
        label: "신규만 반영",
        description: "기존 데이터 수정건과 동일 데이터는 건너뜁니다.",
      }),
      Object.freeze({
        value: "insert-update",
        label: "신규 + 수정 반영",
        description: "동일 데이터는 건너뛰고 신규와 수정건만 반영합니다.",
      }),
      Object.freeze({
        value: "all",
        label: "전체 반영",
        description: "동일 데이터까지 포함해 업로드 파일 전체를 다시 반영합니다.",
      }),
    ]);
    const DEFAULT_EXAMINEE_IMPORT_EXISTING_DATA_POLICY = "insert-update";
    const DEFAULT_EXAMINEE_UPLOAD_MODE = "workbook";
    let examineeUploadPreviewRequestId = 0;
    let examineePhotoArchivePreviewRequestId = 0;
    let examineeImportExistingDataPolicy = DEFAULT_EXAMINEE_IMPORT_EXISTING_DATA_POLICY;
    let examineeUploadMode = DEFAULT_EXAMINEE_UPLOAD_MODE;

    function escapeHtml(value = "") {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function formatUploadReportDateTime(date = new Date()) {
      const normalizedDate = date instanceof Date ? date : new Date(date);

      if (Number.isNaN(normalizedDate.getTime())) {
        return "";
      }

      const year = normalizedDate.getFullYear();
      const month = String(normalizedDate.getMonth() + 1).padStart(2, "0");
      const day = String(normalizedDate.getDate()).padStart(2, "0");
      const hours = String(normalizedDate.getHours()).padStart(2, "0");
      const minutes = String(normalizedDate.getMinutes()).padStart(2, "0");
      const seconds = String(normalizedDate.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    function buildUploadReportFileSuffix(date = new Date()) {
      return formatUploadReportDateTime(date).replaceAll("-", "").replaceAll(":", "").replace(" ", "_");
    }

    function downloadTextReport(fileName = "", content = "") {
      const normalizedFileName = String(fileName || "").trim() || `upload-report-${buildUploadReportFileSuffix()}.txt`;
      const blob = new Blob([String(content || "")], {
        type: "text/plain;charset=utf-8",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = normalizedFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    function buildExamineeUploadResultReport({
      dataFileName = "",
      photoArchiveFileName = "",
      uploadMode = "",
      previewSummary = null,
      photoPreviewSummary = null,
      existingDataPolicy = "",
      result = {},
    } = {}) {
      const createdAt = new Date();
      const normalizedMode = normalizeExamineeUploadMode(uploadMode);
      const workbookSummary = previewSummary && typeof previewSummary === "object" ? previewSummary : null;
      const photoSummary = photoPreviewSummary && typeof photoPreviewSummary === "object" ? photoPreviewSummary : null;
      const normalizedPolicy = normalizeExamineeImportExistingDataPolicy(existingDataPolicy);
      const lines = [
        normalizedMode === "photo-archive" ? "수험생 사진 업로드 결과 리포트" : "수험생 업로드 결과 리포트",
        `생성 시각: ${formatUploadReportDateTime(createdAt)}`,
      ];

      if (String(dataFileName || "").trim()) {
        lines.push(`수험생 데이터 파일: ${String(dataFileName || "").trim()}`);
      }

      if (String(photoArchiveFileName || "").trim()) {
        lines.push(`사진 ZIP 파일: ${String(photoArchiveFileName || "").trim()}`);
      }

      if (workbookSummary) {
        lines.push("");
        lines.push("[수험생 데이터]");
        lines.push(`총 업로드 행: ${Number(workbookSummary.totalRows || 0)}건`);
        lines.push(`신규 등록 예정: ${Number(workbookSummary.insertCount || 0)}건`);
        lines.push(`기존 데이터 수정 예정: ${Number(workbookSummary.updateCount || 0)}건`);
        lines.push(`동일 데이터: ${Number(workbookSummary.unchangedCount || 0)}건`);
        lines.push(`기존 데이터 처리 방식: ${getExamineeImportExistingDataPolicyLabel(normalizedPolicy)}`);
        lines.push(`현재 설정 기준 반영 예정: ${getExamineeSelectedImportCount(workbookSummary, normalizedPolicy)}건`);
        lines.push(`실제 반영 건수: ${Number(result.processed || 0)}건`);
        lines.push(`건너뛴 행: ${Math.max(0, Number(workbookSummary.totalRows || 0) - Number(result.processed || 0))}건`);
      }

      if (photoSummary) {
        lines.push("");
        lines.push("[수험생 사진 ZIP]");
        lines.push(`ZIP 내 전체 파일: ${Number(photoSummary.totalEntries || 0)}건`);
        lines.push(`업로드 가능 사진: ${Number(photoSummary.recognizedPhotoCount || 0)}건`);
        lines.push(`수험번호 매칭 예정: ${Number(photoSummary.matchedCount || 0)}건`);
        lines.push(`미등록 수험번호: ${Number(photoSummary.unmatchedCount || 0)}건`);
        lines.push(`잘못된 파일명/형식: ${Number(photoSummary.invalidEntryCount || 0)}건`);
        lines.push(`중복 사진 파일: ${Number(photoSummary.duplicateEntryCount || 0)}건`);
        lines.push(`실제 매칭 사진: ${Number(result.photoUploaded || 0)}건`);
        lines.push(`실제 건너뛴 사진: ${Number(result.photoSkipped || 0)}건`);
      }

      return {
        fileName:
          normalizedMode === "photo-archive"
            ? `수험생_사진_업로드_결과_${buildUploadReportFileSuffix(createdAt)}.txt`
            : `수험생_업로드_결과_${buildUploadReportFileSuffix(createdAt)}.txt`,
        content: lines.join("\n"),
      };
    }

    function createDefaultExamineeUploadPreviewState() {
      return {
        fileName: "",
        fileSize: 0,
        isLoading: false,
        hasLoaded: false,
        message: EXAMINEE_UPLOAD_MODE_CONFIG.workbook.previewMessage,
        messageType: "",
        summary: null,
      };
    }

    let examineeUploadPreviewState = createDefaultExamineeUploadPreviewState();

    function createDefaultExamineePhotoArchivePreviewState() {
      return {
        fileName: "",
        fileSize: 0,
        isLoading: false,
        hasLoaded: false,
        message: EXAMINEE_UPLOAD_MODE_CONFIG["photo-archive"].previewMessage,
        messageType: "",
        summary: null,
      };
    }

    let examineePhotoArchivePreviewState = createDefaultExamineePhotoArchivePreviewState();

    function normalizeExamineeImportExistingDataPolicy(value = "") {
      const normalizedValue = String(value || "").trim().toLowerCase();
      return EXAMINEE_IMPORT_EXISTING_DATA_POLICY_OPTIONS.some((option) => option.value === normalizedValue)
        ? normalizedValue
        : DEFAULT_EXAMINEE_IMPORT_EXISTING_DATA_POLICY;
    }

    function getExamineeImportExistingDataPolicyLabel(value = "") {
      return (
        EXAMINEE_IMPORT_EXISTING_DATA_POLICY_OPTIONS.find(
          (option) => option.value === normalizeExamineeImportExistingDataPolicy(value),
        )?.label || "신규 + 수정 반영"
      );
    }

    function getExamineeSelectedImportCount(summary = null, existingDataPolicy = "") {
      const normalizedSummary = summary && typeof summary === "object" ? summary : {};
      const normalizedPolicy = normalizeExamineeImportExistingDataPolicy(existingDataPolicy);
      const insertCount = Number(normalizedSummary.insertCount || 0);
      const updateCount = Number(normalizedSummary.updateCount || 0);
      const unchangedCount = Number(normalizedSummary.unchangedCount || 0);

      if (normalizedPolicy === "insert-only") {
        return insertCount;
      }

      if (normalizedPolicy === "all") {
        return insertCount + updateCount + unchangedCount;
      }

      return insertCount + updateCount;
    }

    function normalizeExamineeUploadMode(value = "") {
      const normalizedValue = String(value || "").trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(EXAMINEE_UPLOAD_MODE_CONFIG, normalizedValue)
        ? normalizedValue
        : DEFAULT_EXAMINEE_UPLOAD_MODE;
    }

    function getCurrentExamineeUploadModeConfig() {
      return EXAMINEE_UPLOAD_MODE_CONFIG[normalizeExamineeUploadMode(examineeUploadMode)] || EXAMINEE_UPLOAD_MODE_CONFIG.workbook;
    }

    function shouldEnableExamineeUploadExecuteButton() {
      const normalizedMode = normalizeExamineeUploadMode(examineeUploadMode);

      if (normalizedMode === "photo-archive") {
        const selectedFile = getUploadPhotoArchiveInput?.()?.files?.[0] || null;
        const previewState = examineePhotoArchivePreviewState || createDefaultExamineePhotoArchivePreviewState();
        const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;

        if (!selectedFile || previewState.isLoading || previewState.messageType === "warning" || !previewState.hasLoaded || !summary) {
          return false;
        }

        return Number(summary.estimatedUploadCount || 0) > 0;
      }

      const selectedFile = getUploadFileInput?.()?.files?.[0] || null;
      const previewState = examineeUploadPreviewState || createDefaultExamineeUploadPreviewState();
      const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;

      if (!selectedFile || previewState.isLoading || previewState.messageType === "warning" || !previewState.hasLoaded || !summary) {
        return false;
      }

      return getExamineeSelectedImportCount(summary, examineeImportExistingDataPolicy) > 0;
    }

    function syncExamineeUploadModalModeUi() {
      const uploadModal = document.getElementById("uploadModal");
      const uploadTitle = document.getElementById("uploadTitle");
      const uploadExecuteButton = document.getElementById("uploadExecuteButton");
      const modeConfig = getCurrentExamineeUploadModeConfig();
      const normalizedMode = normalizeExamineeUploadMode(examineeUploadMode);

      if (uploadModal) {
        uploadModal.dataset.uploadMode = normalizedMode;
      }

      if (uploadTitle) {
        uploadTitle.textContent = modeConfig.title;
      }

      if (uploadExecuteButton) {
        uploadExecuteButton.textContent = modeConfig.executeLabel;
        uploadExecuteButton.disabled = !shouldEnableExamineeUploadExecuteButton();
      }
    }

    function setExamineeUploadMode(value = "") {
      examineeUploadMode = normalizeExamineeUploadMode(value);
      syncExamineeUploadModalModeUi();
      clearSelectedUploadFiles();
      clearExamineeUploadPreview();
    }

    function buildExamineeImportExistingDataPolicyMarkup(summary = null) {
      const selectedCount = getExamineeSelectedImportCount(summary, examineeImportExistingDataPolicy);

      return `
        <section class="upload-preview-policy">
          <div class="upload-preview-policy-head">
            <strong>기존 데이터 처리 방식</strong>
            <span>${escapeHtml(String(selectedCount))}건 반영 예정</span>
          </div>
          <div class="upload-preview-policy-options">
            ${EXAMINEE_IMPORT_EXISTING_DATA_POLICY_OPTIONS.map((option) => `
              <label class="upload-preview-policy-option">
                <input
                  type="radio"
                  name="examineeUploadExistingDataPolicy"
                  value="${escapeHtml(option.value)}"
                  data-examinee-upload-existing-data-policy="true"
                  ${normalizeExamineeImportExistingDataPolicy(examineeImportExistingDataPolicy) === option.value ? "checked" : ""}
                />
                <span class="upload-preview-policy-option-copy">
                  <strong>${escapeHtml(option.label)}</strong>
                  <span>${escapeHtml(option.description)}</span>
                </span>
              </label>
            `).join("")}
          </div>
        </section>
      `;
    }

    function renderExamineeWorkbookPreviewSectionMarkup() {
      const selectedFile = getUploadFileInput?.()?.files?.[0] || null;
      const previewState = selectedFile
        ? (examineeUploadPreviewState || createDefaultExamineeUploadPreviewState())
        : createDefaultExamineeUploadPreviewState();
      const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;

      if (previewState.isLoading) {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-state is-loading">
              <strong>수험생 데이터 미리보기 생성 중</strong>
              <p>${escapeHtml(previewState.message || "XLSX 파일을 검사하고 있습니다.")}</p>
            </div>
          </section>
        `;
      }

      if (previewState.messageType === "warning") {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-state is-warning">
              <strong>수험생 데이터 미리보기를 생성할 수 없습니다.</strong>
              <p>${escapeHtml(previewState.message || "XLSX 파일을 다시 확인하세요.")}</p>
            </div>
          </section>
        `;
      }

      if (!previewState.hasLoaded || !summary) {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-empty">
              <strong>수험생 데이터 미리보기</strong>
              <p>${escapeHtml(previewState.message || "XLSX 파일을 선택하면 실제 저장 전에 예상 신규/수정 건수를 전체 파일 기준으로 확인할 수 있습니다.")}</p>
            </div>
          </section>
        `;
      }

      return `
        <section class="upload-preview-section">
          <div class="upload-preview-head">
            <div>
              <strong>수험생 데이터 미리보기</strong>
              <p>${escapeHtml(previewState.fileName || "선택된 파일")}</p>
            </div>
            <span class="upload-preview-caption">파일 전체 기준</span>
          </div>
          <div class="upload-preview-summary-grid">
            <article class="upload-preview-summary-card">
              <strong>${escapeHtml(String(Number(summary.totalRows || 0)))}건</strong>
              <span>총 업로드 행</span>
            </article>
            <article class="upload-preview-summary-card is-insert">
              <strong>${escapeHtml(String(Number(summary.insertCount || 0)))}건</strong>
              <span>신규 등록 예정</span>
            </article>
            <article class="upload-preview-summary-card is-update">
              <strong>${escapeHtml(String(Number(summary.updateCount || 0)))}건</strong>
              <span>기존 데이터 수정 예정</span>
            </article>
            <article class="upload-preview-summary-card is-neutral">
              <strong>${escapeHtml(String(Number(summary.unchangedCount || 0)))}건</strong>
              <span>동일 데이터</span>
            </article>
            <article class="upload-preview-summary-card">
              <strong>${escapeHtml(String(getExamineeSelectedImportCount(summary, examineeImportExistingDataPolicy)))}건</strong>
              <span>현재 설정 기준 반영 예정</span>
            </article>
          </div>
          ${buildExamineeImportExistingDataPolicyMarkup(summary)}
        </section>
      `;
    }

    function renderExamineePhotoArchivePreviewSectionMarkup() {
      const selectedFile = getUploadPhotoArchiveInput?.()?.files?.[0] || null;
      const previewState = selectedFile
        ? (examineePhotoArchivePreviewState || createDefaultExamineePhotoArchivePreviewState())
        : createDefaultExamineePhotoArchivePreviewState();
      const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;

      if (previewState.isLoading) {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-state is-loading">
              <strong>수험생 사진 ZIP 시뮬레이션 중</strong>
              <p>${escapeHtml(previewState.message || "ZIP 파일을 검사하고 있습니다.")}</p>
            </div>
          </section>
        `;
      }

      if (previewState.messageType === "warning") {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-state is-warning">
              <strong>수험생 사진 ZIP 시뮬레이션을 생성할 수 없습니다.</strong>
              <p>${escapeHtml(previewState.message || "ZIP 파일을 다시 확인하세요.")}</p>
            </div>
          </section>
        `;
      }

      if (!previewState.hasLoaded || !summary) {
        return `
          <section class="upload-preview-section">
            <div class="upload-preview-empty">
              <strong>수험생 사진 ZIP 시뮬레이션</strong>
              <p>${escapeHtml(previewState.message || "사진 ZIP 파일을 선택하면 실제 저장 전에 수험번호 매칭 예정 건수를 시뮬레이션합니다.")}</p>
            </div>
          </section>
        `;
      }

      return `
        <section class="upload-preview-section">
          <div class="upload-preview-head">
            <div>
              <strong>수험생 사진 ZIP 시뮬레이션</strong>
              <p>${escapeHtml(previewState.fileName || "선택된 ZIP 파일")}</p>
            </div>
            <span class="upload-preview-caption">ZIP 전체 기준</span>
          </div>
          <div class="upload-preview-summary-grid">
            <article class="upload-preview-summary-card">
              <strong>${escapeHtml(String(Number(summary.totalEntries || 0)))}건</strong>
              <span>ZIP 내 전체 파일</span>
            </article>
            <article class="upload-preview-summary-card">
              <strong>${escapeHtml(String(Number(summary.recognizedPhotoCount || 0)))}건</strong>
              <span>업로드 가능 사진</span>
            </article>
            <article class="upload-preview-summary-card is-insert">
              <strong>${escapeHtml(String(Number(summary.matchedCount || 0)))}건</strong>
              <span>수험번호 매칭 예정</span>
            </article>
            <article class="upload-preview-summary-card is-neutral">
              <strong>${escapeHtml(String(Number(summary.unmatchedCount || 0)))}건</strong>
              <span>미등록 수험번호</span>
            </article>
            <article class="upload-preview-summary-card is-delete">
              <strong>${escapeHtml(String(Number(summary.invalidEntryCount || 0)))}건</strong>
              <span>잘못된 파일명/형식</span>
            </article>
            <article class="upload-preview-summary-card is-update">
              <strong>${escapeHtml(String(Number(summary.duplicateEntryCount || 0)))}건</strong>
              <span>중복 사진 파일</span>
            </article>
          </div>
        </section>
      `;
    }

    function renderExamineeUploadPreviewMarkup() {
      const normalizedMode = normalizeExamineeUploadMode(examineeUploadMode);

      return normalizedMode === "photo-archive"
        ? renderExamineePhotoArchivePreviewSectionMarkup()
        : renderExamineeWorkbookPreviewSectionMarkup();
    }

    function hasReadyExamineeImportPreview(file = null) {
      if (!file) {
        return false;
      }

      return (
        examineeUploadPreviewState.hasLoaded === true &&
        String(examineeUploadPreviewState.fileName || "").trim() === String(file.name || "").trim() &&
        Number(examineeUploadPreviewState.fileSize || 0) === Number(file.size || 0) &&
        examineeUploadPreviewState.summary &&
        typeof examineeUploadPreviewState.summary === "object"
      );
    }

    function hasReadyExamineePhotoArchivePreview(file = null) {
      if (!file) {
        return false;
      }

      return (
        examineePhotoArchivePreviewState.hasLoaded === true &&
        String(examineePhotoArchivePreviewState.fileName || "").trim() === String(file.name || "").trim() &&
        Number(examineePhotoArchivePreviewState.fileSize || 0) === Number(file.size || 0) &&
        examineePhotoArchivePreviewState.summary &&
        typeof examineePhotoArchivePreviewState.summary === "object"
      );
    }

    function buildExamineeUploadConfirmationMessage({
      previewSummary = null,
      photoPreviewSummary = null,
      existingDataPolicy = "",
      hasPhotoArchive = false,
      photoArchiveFileName = "",
    } = {}) {
      const summary = previewSummary && typeof previewSummary === "object" ? previewSummary : {};
      const photoSummary = photoPreviewSummary && typeof photoPreviewSummary === "object" ? photoPreviewSummary : {};
      const normalizedPolicy = normalizeExamineeImportExistingDataPolicy(existingDataPolicy);
      const selectedCount = getExamineeSelectedImportCount(summary, normalizedPolicy);
      const confirmationLines = [
        "다음 내용으로 수험생 데이터를 업로드하시겠습니까?",
        "",
        `총 업로드 행: ${Number(summary.totalRows || 0)}건`,
        `신규 등록 예정: ${Number(summary.insertCount || 0)}건`,
        `기존 데이터 수정 예정: ${Number(summary.updateCount || 0)}건`,
        `동일 데이터: ${Number(summary.unchangedCount || 0)}건`,
        `기존 데이터 처리 방식: ${getExamineeImportExistingDataPolicyLabel(normalizedPolicy)}`,
        `현재 설정 기준 반영 예정: ${selectedCount}건`,
      ];

      if (hasPhotoArchive) {
        confirmationLines.push("");
        confirmationLines.push("수험생 사진 ZIP 시뮬레이션:");
        confirmationLines.push(
          photoArchiveFileName
            ? `사진 ZIP도 함께 업로드됩니다: ${photoArchiveFileName}`
            : "사진 ZIP도 함께 업로드됩니다.",
        );
        confirmationLines.push(`수험번호 매칭 예정: ${Number(photoSummary.matchedCount || 0)}건`);
        confirmationLines.push(`미등록 수험번호: ${Number(photoSummary.unmatchedCount || 0)}건`);
        confirmationLines.push(`잘못된 파일명/형식: ${Number(photoSummary.invalidEntryCount || 0)}건`);
        confirmationLines.push(`중복 사진 파일: ${Number(photoSummary.duplicateEntryCount || 0)}건`);
      }

      return confirmationLines.join("\n");
    }

    function syncExamineeUploadPreview() {
      const previewMount = typeof getUploadPreviewMount === "function" ? getUploadPreviewMount() : null;

      if (!previewMount) {
        return;
      }

      syncExamineeUploadModalModeUi();
      previewMount.innerHTML = renderExamineeUploadPreviewMarkup();
    }

    function clearExamineeUploadPreview(options = {}) {
      examineeUploadPreviewRequestId += 1;
      examineePhotoArchivePreviewRequestId += 1;
      examineeUploadPreviewState = {
        ...createDefaultExamineeUploadPreviewState(),
        message: options.workbookMessage || options.message || EXAMINEE_UPLOAD_MODE_CONFIG.workbook.previewMessage,
        messageType: options.workbookMessageType || options.messageType || "",
      };
      examineePhotoArchivePreviewState = {
        ...createDefaultExamineePhotoArchivePreviewState(),
        message: options.photoMessage || EXAMINEE_UPLOAD_MODE_CONFIG["photo-archive"].previewMessage,
        messageType: options.photoMessageType || "",
      };
      syncExamineeUploadPreview();
    }

    function updateExamineeImportExistingDataPolicy(value = "") {
      examineeImportExistingDataPolicy = normalizeExamineeImportExistingDataPolicy(value);
      syncExamineeUploadPreview();
    }

    async function previewSelectedExamineeImportFile() {
      const file = getUploadFileInput?.()?.files?.[0] || null;
      const previewRequestId = examineeUploadPreviewRequestId + 1;

      examineeUploadPreviewRequestId = previewRequestId;

      if (!file) {
        examineeUploadPreviewState = createDefaultExamineeUploadPreviewState();
        syncExamineeUploadPreview();
        return false;
      }

      if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) {
        examineeUploadPreviewState = {
          ...createDefaultExamineeUploadPreviewState(),
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          message: "현재는 XLSX 업로드만 미리보기할 수 있습니다.",
          messageType: "warning",
        };
        syncExamineeUploadPreview();
        return false;
      }

      examineeUploadPreviewState = {
        fileName: String(file.name || "").trim(),
        fileSize: Number(file.size || 0),
        isLoading: true,
        hasLoaded: false,
        message: "XLSX 파일을 검사하고 업로드 영향을 계산하고 있습니다.",
        messageType: "",
        summary: null,
      };
      syncExamineeUploadPreview();

      try {
        const fileBuffer = await readFileAsArrayBuffer(file);
        const currentFile = getUploadFileInput?.()?.files?.[0] || null;

        if (
          examineeUploadPreviewRequestId !== previewRequestId ||
          !currentFile ||
          currentFile.name !== file.name ||
          Number(currentFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        const previewResult = await apiRequest("/api/examinees/import/preview", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name || "",
            fileContentBase64: arrayBufferToBase64(fileBuffer),
          }),
        });

        if (examineeUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        const latestFile = getUploadFileInput?.()?.files?.[0] || null;

        if (
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        examineeUploadPreviewState = {
          fileName: String(previewResult?.fileName || file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: true,
          message: "",
          messageType: "",
          summary: previewResult && typeof previewResult === "object" ? previewResult : null,
        };
        syncExamineeUploadPreview();
        return true;
      } catch (error) {
        if (examineeUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        const latestFile = getUploadFileInput?.()?.files?.[0] || null;

        if (
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        examineeUploadPreviewState = {
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: false,
          message: error.message,
          messageType: "warning",
          summary: null,
        };
        syncExamineeUploadPreview();
        return false;
      }
    }

    async function previewSelectedExamineePhotoArchiveFile() {
      const file = getUploadPhotoArchiveInput?.()?.files?.[0] || null;
      const previewRequestId = examineePhotoArchivePreviewRequestId + 1;

      examineePhotoArchivePreviewRequestId = previewRequestId;

      if (!file) {
        examineePhotoArchivePreviewState = createDefaultExamineePhotoArchivePreviewState();
        syncExamineeUploadPreview();
        return false;
      }

      if (!String(file.name || "").toLowerCase().endsWith(".zip")) {
        examineePhotoArchivePreviewState = {
          ...createDefaultExamineePhotoArchivePreviewState(),
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          message: "수험생 사진은 ZIP 파일로만 시뮬레이션할 수 있습니다.",
          messageType: "warning",
        };
        syncExamineeUploadPreview();
        return false;
      }

      examineePhotoArchivePreviewState = {
        fileName: String(file.name || "").trim(),
        fileSize: Number(file.size || 0),
        isLoading: true,
        hasLoaded: false,
        message: "사진 ZIP을 검사하고 수험번호 매칭 결과를 시뮬레이션하고 있습니다.",
        messageType: "",
        summary: null,
      };
      syncExamineeUploadPreview();

      try {
        const previewResult = await apiRequestWithUploadProgress("/api/examinees/photo-archive/preview", {
          method: "POST",
          body: file,
          headers: {
            "Content-Type": "application/zip",
          },
        });

        if (examineePhotoArchivePreviewRequestId !== previewRequestId) {
          return false;
        }

        const latestFile = getUploadPhotoArchiveInput?.()?.files?.[0] || null;

        if (
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        examineePhotoArchivePreviewState = {
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: true,
          message: "",
          messageType: "",
          summary: previewResult && typeof previewResult === "object" ? previewResult : null,
        };
        syncExamineeUploadPreview();
        return true;
      } catch (error) {
        if (examineePhotoArchivePreviewRequestId !== previewRequestId) {
          return false;
        }

        const latestFile = getUploadPhotoArchiveInput?.()?.files?.[0] || null;

        if (
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        examineePhotoArchivePreviewState = {
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: false,
          message: error?.message || "사진 ZIP 시뮬레이션을 생성하지 못했습니다.",
          messageType: "warning",
          summary: null,
        };
        syncExamineeUploadPreview();
        return false;
      }
    }

    async function readUploadFileAsBase64(
      file,
      {
        readingMessage,
        encodingMessage,
        progressLabel,
        encodingProgressLabel = progressLabel,
      } = {},
    ) {
      if (!file) {
        return "";
      }

      setUploadOverlayState({
        isActive: true,
        message: readingMessage,
        progressMode: "determinate",
        progressValue: 0,
        progressLabel,
      });

      const buffer = await readFileAsArrayBuffer(file, {
        onProgress: ({ percent }) => {
          setUploadOverlayState({
            isActive: true,
            message: readingMessage,
            progressMode: "determinate",
            progressValue: percent,
            progressLabel,
          });
        },
      });

      setUploadOverlayState({
        isActive: true,
        message: encodingMessage,
        progressMode: "indeterminate",
        progressLabel: encodingProgressLabel,
      });
      await waitForNextFrame();
      return arrayBufferToBase64(buffer);
    }

    async function uploadPhotoArchiveFile(photoArchiveFile) {
      setUploadOverlayState({
        isActive: true,
        message: "사진 ZIP을 서버로 전송하고 있습니다.",
        progressMode: "determinate",
        progressValue: 0,
        progressLabel: "사진 ZIP 전송",
      });

      return apiRequestWithUploadProgress("/api/examinees/photo-archive", {
        method: "POST",
        body: photoArchiveFile,
        headers: {
          "Content-Type": "application/zip",
        },
      }, {
        onProgress: ({ percent }) => {
          setUploadOverlayState({
            isActive: true,
            message: "사진 ZIP을 서버로 전송하고 있습니다.",
            progressMode: "determinate",
            progressValue: percent,
            progressLabel: "사진 ZIP 전송",
          });
        },
        onUploadComplete: () => {
          setUploadOverlayState({
            isActive: true,
            message: "사진 데이터를 수험생 데이터와 매칭합니다.",
            progressMode: "indeterminate",
            progressLabel: "사진 매칭 및 저장",
          });
        },
      });
    }

    async function uploadSelectedExamineeFile() {
      const normalizedMode = normalizeExamineeUploadMode(examineeUploadMode);
      const file = normalizedMode === "workbook" ? getUploadFileInput?.()?.files?.[0] || null : null;
      const photoArchiveFile =
        normalizedMode === "photo-archive" ? getUploadPhotoArchiveInput?.()?.files?.[0] || null : null;

      if (!file && !photoArchiveFile) {
        showUploadFailureAlert(
          normalizedMode === "photo-archive" ? "사진 ZIP 파일을 먼저 선택하세요." : "XLSX 파일을 먼저 선택하세요.",
        );
        return;
      }

      if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
        showUploadFailureAlert("현재는 XLSX 업로드만 지원합니다.");
        return;
      }

      if (photoArchiveFile && !photoArchiveFile.name.toLowerCase().endsWith(".zip")) {
        showUploadFailureAlert("수험생 사진은 ZIP 파일로 업로드해야 합니다.");
        return;
      }

      if (isUploadActive()) {
        return;
      }

      try {
        let result = {
          processed: 0,
          photoUploaded: 0,
          photoSkipped: 0,
        };

        if (file && !hasReadyExamineeImportPreview(file)) {
          const didPreview = await previewSelectedExamineeImportFile();

          if (!didPreview) {
            return;
          }
        }

        if (photoArchiveFile && !hasReadyExamineePhotoArchivePreview(photoArchiveFile)) {
          const didPhotoPreview = await previewSelectedExamineePhotoArchiveFile();

          if (!didPhotoPreview) {
            return;
          }
        }

        const workbookPreviewSummary =
          examineeUploadPreviewState.summary && typeof examineeUploadPreviewState.summary === "object"
            ? examineeUploadPreviewState.summary
            : null;
        const photoArchivePreviewSummary =
          examineePhotoArchivePreviewState.summary && typeof examineePhotoArchivePreviewState.summary === "object"
            ? examineePhotoArchivePreviewState.summary
            : null;

        if (normalizedMode === "workbook") {
          const previewSummary = workbookPreviewSummary;
          const selectedCount = getExamineeSelectedImportCount(previewSummary, examineeImportExistingDataPolicy);

          if (!previewSummary) {
            showUploadFailureAlert("업로드 미리보기를 먼저 확인하세요.");
            return;
          }

          if (selectedCount <= 0) {
            showUploadFailureAlert("선택한 기존 데이터 처리 방식에 따라 반영할 수험생 데이터가 없습니다.");
            return;
          }

          if (
            !window.confirm(
              buildExamineeUploadConfirmationMessage({
                previewSummary,
                existingDataPolicy: examineeImportExistingDataPolicy,
              }),
            )
          ) {
            return;
          }
        } else {
          const photoPreviewSummary = photoArchivePreviewSummary;
          const estimatedUploadCount = Number(photoPreviewSummary?.estimatedUploadCount || 0);
          const confirmationLines = [
            "사진 ZIP을 업로드하시겠습니까?",
            "",
            photoArchiveFile?.name ? `파일: ${photoArchiveFile.name}` : "",
            `수험번호 매칭 예정: ${estimatedUploadCount}건`,
            `미등록 수험번호: ${Number(photoPreviewSummary?.unmatchedCount || 0)}건`,
            `잘못된 파일명/형식: ${Number(photoPreviewSummary?.invalidEntryCount || 0)}건`,
            `중복 사진 파일: ${Number(photoPreviewSummary?.duplicateEntryCount || 0)}건`,
          ].filter(Boolean);

          if (!photoPreviewSummary) {
            showUploadFailureAlert("사진 ZIP 시뮬레이션을 먼저 확인하세요.");
            return;
          }

          if (estimatedUploadCount <= 0) {
            showUploadFailureAlert("현재 사진 ZIP에서는 수험번호와 매칭될 사진이 없습니다.");
            return;
          }

          if (!window.confirm(confirmationLines.join("\n"))) {
            return;
          }
        }

        if (file && getExamineeSelectedImportCount(examineeUploadPreviewState.summary, examineeImportExistingDataPolicy) > 0) {
          const fileContentBase64 = await readUploadFileAsBase64(file, {
            readingMessage: "XLSX 파일을 읽는 중입니다.",
            encodingMessage: "XLSX 파일을 업로드 형식으로 준비하고 있습니다.",
            progressLabel: "XLSX 읽기",
            encodingProgressLabel: "XLSX 준비",
          });
          const requestBody = JSON.stringify({
            fileName: file?.name || "",
            fileContentBase64,
            existingDataPolicy: examineeImportExistingDataPolicy,
          });

          setUploadOverlayState({
            isActive: true,
            message: "수험생 데이터를 서버로 전송하고 있습니다.",
            progressMode: "determinate",
            progressValue: 0,
            progressLabel: "XLSX 전송",
          });

          const workbookResult = await apiRequestWithUploadProgress("/api/examinees/import", {
            method: "POST",
            body: requestBody,
          }, {
            onProgress: ({ percent }) => {
              setUploadOverlayState({
                isActive: true,
                message: "수험생 데이터를 서버로 전송하고 있습니다.",
                progressMode: "determinate",
                progressValue: percent,
                progressLabel: "XLSX 전송",
              });
            },
            onUploadComplete: () => {
              setUploadOverlayState({
                isActive: true,
                message: "수험생 데이터를 MariaDB에 반영하고 있습니다.",
                progressMode: "indeterminate",
                progressLabel: "수험생 데이터 저장",
              });
            },
          });

          result = mergeUploadResult(result, workbookResult);
        }

        if (photoArchiveFile) {
          const photoResult = await uploadPhotoArchiveFile(photoArchiveFile);
          result = mergeUploadResult(result, photoResult);
        }

        const uploadResultReport = buildExamineeUploadResultReport({
          dataFileName: String(file?.name || "").trim(),
          photoArchiveFileName: String(photoArchiveFile?.name || "").trim(),
          uploadMode: normalizedMode,
          previewSummary: workbookPreviewSummary,
          photoPreviewSummary: photoArchivePreviewSummary,
          existingDataPolicy: examineeImportExistingDataPolicy,
          result,
        });

        setUploadOverlayState({
          isActive: true,
          message: "업로드 결과를 화면에 반영하고 있습니다.",
          progressMode: "indeterminate",
          progressLabel: "목록 새로고침",
        });
        await loadBootstrapData({ showLoading: false });
        downloadTextReport(uploadResultReport.fileName, uploadResultReport.content);
        clearSelectedUploadFiles();
        clearExamineeUploadPreview();
        setUploadOverlayState({
          isActive: true,
          message: "업로드를 마무리하고 있습니다.",
          progressMode: "determinate",
          progressValue: 100,
          progressLabel: "업로드 완료",
        });
        await closeUploadOverlayWithToast(buildUploadSummaryMessage(result, { hasPhotoArchive: Boolean(photoArchiveFile) }), "success", 4200);
      } catch (error) {
        if (isUploadActive()) {
          const currentProgressMode = state.upload?.progressMode || "hidden";
          setUploadOverlayState({
            isActive: true,
            message: "업로드 처리를 정리하고 있습니다.",
            progressMode: currentProgressMode,
            progressValue: currentProgressMode === "determinate" ? state.upload?.progressValue || 0 : 0,
            progressLabel: state.upload?.progressLabel || "",
          });
          await closeUploadOverlayWithAlert(error.message);
          return;
        }

        showUploadFailureAlert(error.message);
      }
    }

    syncExamineeUploadPreview();

    return Object.freeze({
      readUploadFileAsBase64,
      clearExamineeUploadPreview,
      previewSelectedExamineePhotoArchiveFile,
      previewSelectedExamineeImportFile,
      setExamineeUploadMode,
      uploadPhotoArchiveFile,
      uploadSelectedExamineeFile,
      updateExamineeImportExistingDataPolicy,
    });
  }

  return Object.freeze({
    createExamineeUploadWorkflowController,
  });
});
