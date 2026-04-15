(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(globalScope.AdmitCardApplicantFormConfig);
    return;
  }

  globalScope.AdmitCardApplicantAdmin = factory(globalScope.AdmitCardApplicantFormConfig);
})(typeof globalThis !== "undefined" ? globalThis : this, (applicantFormConfig) => {
  const defaultExamNoPattern = applicantFormConfig?.defaultApplicantExamNoPattern || "AD-{YY}{MM}{DD}-{SEQ:4}";
  const defaultExamNoSequenceStart = applicantFormConfig?.defaultApplicantExamNoSequenceStart || 1;
  const findApplicantScheduleRecord = applicantFormConfig?.findApplicantScheduleRecord || (() => null);
  const getApplicantSubmissionScheduleState =
    applicantFormConfig?.getApplicantSubmissionScheduleState ||
    (() => ({
      isConfigured: false,
      isOpen: false,
      reason: "not_configured",
      applicantScheduleStartAt: "",
      applicantScheduleEndAt: "",
    }));
  const buildApplicantScheduleContextLabel =
    applicantFormConfig?.buildApplicantScheduleContextLabel || ((value = {}) => String(value?.track || value?.trackName || "선택한 전형"));
  const buildApplicantScheduleRangeLabel = applicantFormConfig?.buildApplicantScheduleRangeLabel || (() => "");
  const applicantPromotionPreviewColumns = Object.freeze([
    Object.freeze({ key: "examineeNo", label: "수험번호" }),
    Object.freeze({ key: "name", label: "이름" }),
    Object.freeze({ key: "birth", label: "생년월일" }),
    Object.freeze({ key: "track", label: "모집시기" }),
    Object.freeze({ key: "admission", label: "전형" }),
    Object.freeze({ key: "series", label: "계열" }),
    Object.freeze({ key: "unit", label: "모집단위" }),
    Object.freeze({ key: "major", label: "전공" }),
    Object.freeze({ key: "date", label: "날짜" }),
    Object.freeze({ key: "time", label: "시간" }),
    Object.freeze({ key: "buildingCode", label: "고사건물코드" }),
    Object.freeze({ key: "building", label: "고사건물" }),
    Object.freeze({ key: "roomCode", label: "고사실코드" }),
    Object.freeze({ key: "room", label: "고사실" }),
    Object.freeze({ key: "photoStatusLabel", label: "사진" }),
    Object.freeze({ key: "statusLabel", label: "상태" }),
    Object.freeze({ key: "errorMessage", label: "오류" }),
  ]);
  const applicantPromotionSortFields = Object.freeze([
    Object.freeze({ key: "examineeNo", label: "수험번호" }),
    Object.freeze({ key: "admission", label: "전형" }),
    Object.freeze({ key: "series", label: "계열" }),
    Object.freeze({ key: "unit", label: "모집단위" }),
    Object.freeze({ key: "major", label: "전공" }),
  ]);
  const applicantPromotionBreakFields = Object.freeze(
    applicantPromotionSortFields.filter((field) => field.key !== "examineeNo"),
  );

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getApplicantPromotionFieldLabel(fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();

    return (
      applicantPromotionSortFields.find((field) => field.key === normalizedFieldKey)?.label ||
      applicantPromotionBreakFields.find((field) => field.key === normalizedFieldKey)?.label ||
      "선택 안 함"
    );
  }

  function createEmptyApplicantFieldEditor({ isActive = false, isDraft = false } = {}) {
    return {
      isActive,
      isDraft,
      editingId: 0,
      questionText: "",
      questionDescription: "",
      inputType: "text",
      systemFieldKey: "",
      options: [],
      optionDraft: "",
      allowCustomOption: false,
      customOptionLabel: "",
      required: false,
    };
  }

  function createEmptyApplicantRecruitmentUnitEditor({ isActive = false } = {}) {
    return {
      isActive,
      editingId: 0,
      trackName: "",
      admissionCode: "",
      admissionName: "",
      seriesCode: "",
      seriesName: "",
      unitCode: "",
      unitName: "",
      majorCode: "",
      majorName: "",
    };
  }

  function createEmptyApplicantScheduleEditor({ isActive = false } = {}) {
    return {
      isActive,
      editingId: 0,
      scheduleKey: "",
      trackName: "",
      admissionCode: "",
      admissionName: "",
      applicantScheduleStartAt: "",
      applicantScheduleEndAt: "",
      admitCardLookupScheduleStartAt: "",
      admitCardLookupScheduleEndAt: "",
    };
  }

  function createEmptyApplicantAssignmentEditor({ isActive = false } = {}) {
    return {
      isActive,
      editingId: 0,
      track: "",
      admission: "",
      series: "",
      unit: "",
      major: "",
      date: "",
      time: "",
      buildingCode: "",
      building: "",
      roomCode: "",
      room: "",
      assignedCount: "1",
    };
  }

  function createEmptyApplicantPromotionState() {
    return {
      selectedSubmissionIds: [],
      previewRows: [],
      summary: null,
      allowMissingPhoto: false,
      allowOverbooking: false,
      overbookingPercent: "10",
      sortField1: "examineeNo",
      sortField2: "",
      sortField3: "",
      breakField: "unit",
      isLoading: false,
      isCommitting: false,
    };
  }

  function createApplicantAdminController({
    arrayBufferToBase64,
    apiRequest,
    buildApiUrl,
    getApplicantAssignmentUploadFileInput,
    getApplicantAssignmentUploadFileName,
    getApplicantAssignmentUploadPreviewMount,
    getApplicantUnitUploadFileInput,
    getApplicantUnitUploadFileName,
    getApplicantUnitUploadPreviewMount,
    handleAuthenticationFailure,
    loadBootstrapData,
    openModal,
    readFileAsArrayBuffer,
    renderView,
    requestCloseModal,
    showToast,
    state,
  }) {
    const APPLICANT_IMPORT_EXISTING_DATA_POLICY_OPTIONS = Object.freeze([
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
    const DEFAULT_APPLICANT_IMPORT_EXISTING_DATA_POLICY = "insert-update";
    const APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE =
      "XLSX 파일을 선택하면 실제 저장 전에 예상 신규/수정 건수를 전체 파일 기준으로 확인할 수 있습니다.";
    const APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE =
      "XLSX 파일을 선택하면 실제 저장 전에 예상 신규/수정 건수를 전체 파일 기준으로 확인할 수 있습니다.";
    let applicantRecruitmentUploadPreviewRequestId = 0;
    let applicantAssignmentUploadPreviewRequestId = 0;
    let applicantRecruitmentUploadExistingDataPolicy = DEFAULT_APPLICANT_IMPORT_EXISTING_DATA_POLICY;
    let applicantAssignmentUploadExistingDataPolicy = DEFAULT_APPLICANT_IMPORT_EXISTING_DATA_POLICY;
    let applicantRecruitmentUploadPreviewState = createApplicantUploadPreviewState(
      APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
    );
    let applicantAssignmentUploadPreviewState = createApplicantUploadPreviewState(
      APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
    );

    function createApplicantUploadPreviewState(defaultMessage = "") {
      return {
        fileName: "",
        fileSize: 0,
        isLoading: false,
        hasLoaded: false,
        message: String(defaultMessage || "").trim(),
        messageType: "",
        summary: null,
      };
    }

    function formatApplicantUploadReportDateTime(date = new Date()) {
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

    function buildApplicantUploadReportFileSuffix(date = new Date()) {
      return formatApplicantUploadReportDateTime(date).replaceAll("-", "").replaceAll(":", "").replace(" ", "_");
    }

    function downloadApplicantUploadReport(fileName = "", content = "") {
      const blob = new Blob([String(content || "")], {
        type: "text/plain;charset=utf-8",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = String(fileName || "").trim() || `applicant-upload-report-${buildApplicantUploadReportFileSuffix()}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    function buildApplicantUploadResultReport({
      title = "업로드 결과 리포트",
      fileNamePrefix = "업로드",
      sourceFileName = "",
      previewSummary = null,
      existingDataPolicy = "",
      result = {},
    } = {}) {
      const createdAt = new Date();
      const summary = previewSummary && typeof previewSummary === "object" ? previewSummary : {};
      const normalizedPolicy = normalizeApplicantUploadExistingDataPolicy(existingDataPolicy);
      const selectedCount = getApplicantSelectedImportCount(summary, normalizedPolicy);
      const processedCount = Number(result.processed || 0);
      const totalRows = Number(summary.totalRows || 0);
      const lines = [
        String(title || "업로드 결과 리포트").trim(),
        `생성 시각: ${formatApplicantUploadReportDateTime(createdAt)}`,
      ];

      if (String(sourceFileName || "").trim()) {
        lines.push(`업로드 파일: ${String(sourceFileName || "").trim()}`);
      }

      lines.push("");
      lines.push(`업로드 행: ${totalRows}건`);
      lines.push(`신규 등록 예정: ${Number(summary.insertCount || 0)}건`);
      lines.push(`기존 데이터 수정 예정: ${Number(summary.updateCount || 0)}건`);
      lines.push(`동일 데이터: ${Number(summary.unchangedCount || 0)}건`);
      lines.push(`기존 데이터 처리 방식: ${getApplicantImportExistingDataPolicyLabel(normalizedPolicy)}`);
      lines.push(`현재 설정 기준 반영 예정: ${selectedCount}건`);
      lines.push(`실제 반영 건수: ${processedCount}건`);
      lines.push(`건너뛴 행: ${Math.max(0, totalRows - processedCount)}건`);

      return {
        fileName: `${String(fileNamePrefix || "업로드").trim()}_업로드_결과_${buildApplicantUploadReportFileSuffix(createdAt)}.txt`,
        content: lines.join("\n"),
      };
    }

    function normalizeApplicantUploadExistingDataPolicy(value = "") {
      const normalizedValue = String(value || "").trim().toLowerCase();
      return APPLICANT_IMPORT_EXISTING_DATA_POLICY_OPTIONS.some((option) => option.value === normalizedValue)
        ? normalizedValue
        : DEFAULT_APPLICANT_IMPORT_EXISTING_DATA_POLICY;
    }

    function getApplicantImportExistingDataPolicyLabel(value = "") {
      return (
        APPLICANT_IMPORT_EXISTING_DATA_POLICY_OPTIONS.find(
          (option) => option.value === normalizeApplicantUploadExistingDataPolicy(value),
        )?.label || "신규 + 수정 반영"
      );
    }

    function getApplicantSelectedImportCount(summary = null, existingDataPolicy = "") {
      const normalizedSummary = summary && typeof summary === "object" ? summary : {};
      const normalizedPolicy = normalizeApplicantUploadExistingDataPolicy(existingDataPolicy);
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

    function buildApplicantImportExistingDataPolicyMarkup({ target = "", summary = null, selectedPolicy = "" } = {}) {
      const normalizedTarget = String(target || "").trim();
      const normalizedPolicy = normalizeApplicantUploadExistingDataPolicy(selectedPolicy);
      const selectedCount = getApplicantSelectedImportCount(summary, normalizedPolicy);

      return `
        <section class="upload-preview-policy">
          <div class="upload-preview-policy-head">
            <strong>기존 데이터 처리 방식</strong>
            <span>${escapeHtml(String(selectedCount))}건 반영 예정</span>
          </div>
          <div class="upload-preview-policy-options">
            ${APPLICANT_IMPORT_EXISTING_DATA_POLICY_OPTIONS.map((option) => `
              <label class="upload-preview-policy-option">
                <input
                  type="radio"
                  name="${escapeHtml(normalizedTarget)}UploadExistingDataPolicy"
                  value="${escapeHtml(option.value)}"
                  data-applicant-upload-existing-policy="${escapeHtml(normalizedTarget)}"
                  ${normalizedPolicy === option.value ? "checked" : ""}
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

    function buildApplicantUploadPreviewSummaryCardMarkup(cards = []) {
      return (Array.isArray(cards) ? cards : [])
        .map((card) => {
          const toneClass = String(card?.tone || "").trim();
          return `
            <article class="upload-preview-summary-card${toneClass ? ` is-${escapeHtml(toneClass)}` : ""}">
              <strong>${escapeHtml(String(card?.value || "0건"))}</strong>
              <span>${escapeHtml(String(card?.label || ""))}</span>
            </article>
          `;
        })
        .join("");
    }

    function renderApplicantUploadPreviewMarkup({
      previewState,
      defaultMessage = "",
      fileNameFallback = "선택된 파일",
      summaryCards = [],
      policyMarkup = "",
    } = {}) {
      const normalizedState = previewState && typeof previewState === "object"
        ? previewState
        : createApplicantUploadPreviewState(defaultMessage);
      const summary = normalizedState.summary && typeof normalizedState.summary === "object" ? normalizedState.summary : null;

      if (normalizedState.isLoading) {
        return `
          <div class="upload-preview-state is-loading">
            <strong>업로드 미리보기 생성 중</strong>
            <p>${escapeHtml(normalizedState.message || "XLSX 파일을 검사하고 있습니다.")}</p>
          </div>
        `;
      }

      if (normalizedState.messageType === "warning") {
        return `
          <div class="upload-preview-state is-warning">
            <strong>업로드 미리보기를 생성할 수 없습니다.</strong>
            <p>${escapeHtml(normalizedState.message || "XLSX 파일을 다시 확인하세요.")}</p>
          </div>
        `;
      }

      if (!normalizedState.hasLoaded || !summary) {
        return `
          <div class="upload-preview-empty">
            <strong>업로드 미리보기</strong>
            <p>${escapeHtml(normalizedState.message || defaultMessage)}</p>
          </div>
        `;
      }

      return `
        <div class="upload-preview-head">
          <div>
            <strong>업로드 미리보기</strong>
            <p>${escapeHtml(normalizedState.fileName || fileNameFallback)}</p>
          </div>
          <span class="upload-preview-caption">파일 전체 기준</span>
        </div>
        <div class="upload-preview-summary-grid">
          ${buildApplicantUploadPreviewSummaryCardMarkup(summaryCards)}
        </div>
        ${policyMarkup}
      `;
    }

    function hasMatchingApplicantUploadPreview(previewState = null, file = null) {
      if (!previewState || !file) {
        return false;
      }

      return (
        previewState.hasLoaded === true &&
        String(previewState.fileName || "").trim() === String(file.name || "").trim() &&
        Number(previewState.fileSize || 0) === Number(file.size || 0) &&
        previewState.summary &&
        typeof previewState.summary === "object"
      );
    }

    function syncApplicantRecruitmentUnitUploadExecuteButtonState() {
      const executeButton = document.getElementById("applicantUnitUploadExecuteButton");
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const selectedFile = inputElement?.files?.[0] || null;
      const previewState = applicantRecruitmentUploadPreviewState || createApplicantUploadPreviewState(
        APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
      );
      const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;
      const shouldEnable =
        Boolean(selectedFile) &&
        previewState.isLoading !== true &&
        previewState.messageType !== "warning" &&
        previewState.hasLoaded === true &&
        Boolean(summary) &&
        getApplicantSelectedImportCount(summary, applicantRecruitmentUploadExistingDataPolicy) > 0;

      if (executeButton) {
        executeButton.disabled = !shouldEnable;
      }
    }

    function syncApplicantAssignmentUploadExecuteButtonState() {
      const executeButton = document.getElementById("applicantAssignmentUploadExecuteButton");
      const inputElement = typeof getApplicantAssignmentUploadFileInput === "function" ? getApplicantAssignmentUploadFileInput() : null;
      const selectedFile = inputElement?.files?.[0] || null;
      const previewState = applicantAssignmentUploadPreviewState || createApplicantUploadPreviewState(
        APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
      );
      const summary = previewState.summary && typeof previewState.summary === "object" ? previewState.summary : null;
      const shouldEnable =
        Boolean(selectedFile) &&
        previewState.isLoading !== true &&
        previewState.messageType !== "warning" &&
        previewState.hasLoaded === true &&
        Boolean(summary) &&
        getApplicantSelectedImportCount(summary, applicantAssignmentUploadExistingDataPolicy) > 0;

      if (executeButton) {
        executeButton.disabled = !shouldEnable;
      }
    }

    function buildApplicantRecruitmentUploadConfirmationMessage(previewSummary = null, existingDataPolicy = "") {
      const summary = previewSummary && typeof previewSummary === "object" ? previewSummary : {};
      const normalizedPolicy = normalizeApplicantUploadExistingDataPolicy(existingDataPolicy);

      return [
        "다음 내용으로 전형 관리 데이터를 업로드하시겠습니까?",
        "",
        `업로드 행: ${Number(summary.totalRows || 0)}건`,
        `신규 등록 예정: ${Number(summary.insertCount || 0)}건`,
        `기존 데이터 수정 예정: ${Number(summary.updateCount || 0)}건`,
        `동일 데이터: ${Number(summary.unchangedCount || 0)}건`,
        `기존 데이터 처리 방식: ${getApplicantImportExistingDataPolicyLabel(normalizedPolicy)}`,
        `현재 설정 기준 반영 예정: ${getApplicantSelectedImportCount(summary, normalizedPolicy)}건`,
      ].join("\n");
    }

    function buildApplicantAssignmentUploadConfirmationMessage(previewSummary = null, existingDataPolicy = "") {
      const summary = previewSummary && typeof previewSummary === "object" ? previewSummary : {};
      const normalizedPolicy = normalizeApplicantUploadExistingDataPolicy(existingDataPolicy);

      return [
        "다음 내용으로 배정표 데이터를 업로드하시겠습니까?",
        "",
        `업로드 행: ${Number(summary.totalRows || 0)}건`,
        `신규 등록 예정: ${Number(summary.insertCount || 0)}건`,
        `기존 데이터 수정 예정: ${Number(summary.updateCount || 0)}건`,
        `동일 데이터: ${Number(summary.unchangedCount || 0)}건`,
        `기존 데이터 처리 방식: ${getApplicantImportExistingDataPolicyLabel(normalizedPolicy)}`,
        `현재 설정 기준 반영 예정: ${getApplicantSelectedImportCount(summary, normalizedPolicy)}건`,
      ].join("\n");
    }

    function syncApplicantRecruitmentUnitUploadPreview() {
      const previewMount = typeof getApplicantUnitUploadPreviewMount === "function" ? getApplicantUnitUploadPreviewMount() : null;

      if (!previewMount) {
        syncApplicantRecruitmentUnitUploadExecuteButtonState();
        return;
      }

      const summary = applicantRecruitmentUploadPreviewState.summary || {};
      previewMount.innerHTML = renderApplicantUploadPreviewMarkup({
        previewState: applicantRecruitmentUploadPreviewState,
        defaultMessage: APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
        fileNameFallback: "전형 관리 업로드 파일",
        summaryCards: [
          { value: `${Number(summary.currentTotalCount || 0)}건`, label: "현재 저장 데이터", tone: "neutral" },
          { value: `${Number(summary.totalRows || 0)}건`, label: "업로드 행", tone: "" },
          { value: `${Number(summary.insertCount || 0)}건`, label: "신규 등록 예정", tone: "insert" },
          { value: `${Number(summary.updateCount || 0)}건`, label: "기존 데이터 수정 예정", tone: "update" },
          { value: `${Number(summary.unchangedCount || 0)}건`, label: "동일 데이터", tone: "neutral" },
          {
            value: `${getApplicantSelectedImportCount(summary, applicantRecruitmentUploadExistingDataPolicy)}건`,
            label: "현재 설정 기준 반영 예정",
            tone: "",
          },
        ],
        policyMarkup: buildApplicantImportExistingDataPolicyMarkup({
          target: "recruitment",
          summary,
          selectedPolicy: applicantRecruitmentUploadExistingDataPolicy,
        }),
      });
      syncApplicantRecruitmentUnitUploadExecuteButtonState();
    }

    function syncApplicantAssignmentUploadPreview() {
      const previewMount = typeof getApplicantAssignmentUploadPreviewMount === "function" ? getApplicantAssignmentUploadPreviewMount() : null;

      if (!previewMount) {
        syncApplicantAssignmentUploadExecuteButtonState();
        return;
      }

      const summary = applicantAssignmentUploadPreviewState.summary || {};
      previewMount.innerHTML = renderApplicantUploadPreviewMarkup({
        previewState: applicantAssignmentUploadPreviewState,
        defaultMessage: APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE,
        fileNameFallback: "배정표 업로드 파일",
        summaryCards: [
          { value: `${Number(summary.currentTotalCount || 0)}건`, label: "현재 저장 배정표", tone: "neutral" },
          { value: `${Number(summary.totalRows || 0)}건`, label: "업로드 행", tone: "" },
          { value: `${Number(summary.insertCount || 0)}건`, label: "신규 등록 예정", tone: "insert" },
          { value: `${Number(summary.updateCount || 0)}건`, label: "기존 데이터 수정 예정", tone: "update" },
          { value: `${Number(summary.unchangedCount || 0)}건`, label: "동일 데이터", tone: "neutral" },
          {
            value: `${getApplicantSelectedImportCount(summary, applicantAssignmentUploadExistingDataPolicy)}건`,
            label: "현재 설정 기준 반영 예정",
            tone: "",
          },
        ],
        policyMarkup: buildApplicantImportExistingDataPolicyMarkup({
          target: "assignment",
          summary,
          selectedPolicy: applicantAssignmentUploadExistingDataPolicy,
        }),
      });
      syncApplicantAssignmentUploadExecuteButtonState();
    }

    function clearApplicantAssignmentUploadPreview(options = {}) {
      applicantAssignmentUploadPreviewRequestId += 1;
      applicantAssignmentUploadPreviewState = {
        ...createApplicantUploadPreviewState(APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE),
        message: String(options.message || APPLICANT_ASSIGNMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE).trim(),
        messageType: String(options.messageType || "").trim(),
      };
      syncApplicantAssignmentUploadPreview();
    }

    function clearApplicantRecruitmentUnitUploadPreview(options = {}) {
      applicantRecruitmentUploadPreviewRequestId += 1;
      applicantRecruitmentUploadPreviewState = {
        ...createApplicantUploadPreviewState(APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE),
        message: String(options.message || APPLICANT_RECRUITMENT_UPLOAD_PREVIEW_DEFAULT_MESSAGE).trim(),
        messageType: String(options.messageType || "").trim(),
      };
      syncApplicantRecruitmentUnitUploadPreview();
    }

    function clearApplicantAssignmentUploadFiles() {
      const inputElement = typeof getApplicantAssignmentUploadFileInput === "function" ? getApplicantAssignmentUploadFileInput() : null;
      const labelElement = typeof getApplicantAssignmentUploadFileName === "function" ? getApplicantAssignmentUploadFileName() : null;

      if (inputElement) {
        inputElement.value = "";
      }

      if (labelElement) {
        labelElement.textContent = "선택된 데이터 파일이 없습니다.";
      }

      clearApplicantAssignmentUploadPreview();
    }

    function clearApplicantRecruitmentUnitUploadFiles() {
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const labelElement = typeof getApplicantUnitUploadFileName === "function" ? getApplicantUnitUploadFileName() : null;

      if (inputElement) {
        inputElement.value = "";
      }

      if (labelElement) {
        labelElement.textContent = "선택된 데이터 파일이 없습니다.";
      }

      clearApplicantRecruitmentUnitUploadPreview();
    }

    function updateApplicantRecruitmentUnitUploadExistingDataPolicy(value = "") {
      applicantRecruitmentUploadExistingDataPolicy = normalizeApplicantUploadExistingDataPolicy(value);
      syncApplicantRecruitmentUnitUploadPreview();
    }

    function updateApplicantAssignmentUploadExistingDataPolicy(value = "") {
      applicantAssignmentUploadExistingDataPolicy = normalizeApplicantUploadExistingDataPolicy(value);
      syncApplicantAssignmentUploadPreview();
    }

    async function previewApplicantAssignmentUploadFile() {
      const inputElement = typeof getApplicantAssignmentUploadFileInput === "function" ? getApplicantAssignmentUploadFileInput() : null;
      const file = inputElement?.files?.[0] || null;
      const previewRequestId = applicantAssignmentUploadPreviewRequestId + 1;

      applicantAssignmentUploadPreviewRequestId = previewRequestId;

      if (!file) {
        clearApplicantAssignmentUploadPreview();
        return false;
      }

      if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) {
        clearApplicantAssignmentUploadPreview({
          message: "현재는 XLSX 업로드만 미리보기할 수 있습니다.",
          messageType: "warning",
        });
        return false;
      }

      applicantAssignmentUploadPreviewState = {
        fileName: String(file.name || "").trim(),
        fileSize: Number(file.size || 0),
        isLoading: true,
        hasLoaded: false,
        message: "XLSX 파일을 검사하고 배정표 변경 내역을 계산하고 있습니다.",
        messageType: "",
        summary: null,
      };
      syncApplicantAssignmentUploadPreview();

      try {
        const fileBuffer = await readFileAsArrayBuffer(file);
        const latestFile = inputElement?.files?.[0] || null;

        if (
          applicantAssignmentUploadPreviewRequestId !== previewRequestId ||
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        const previewResult = await apiRequest("/api/applicant-assignments/import/preview", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name || "",
            fileContentBase64: arrayBufferToBase64(fileBuffer),
          }),
        });

        if (applicantAssignmentUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        applicantAssignmentUploadPreviewState = {
          fileName: String(previewResult?.fileName || file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: true,
          message: "",
          messageType: "",
          summary: previewResult && typeof previewResult === "object" ? previewResult : null,
        };
        syncApplicantAssignmentUploadPreview();
        return true;
      } catch (error) {
        if (applicantAssignmentUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        if (handleAuthenticationFailure(error)) {
          return false;
        }

        applicantAssignmentUploadPreviewState = {
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: false,
          message: error?.message || "배정표 미리보기를 생성하지 못했습니다.",
          messageType: "warning",
          summary: null,
        };
        syncApplicantAssignmentUploadPreview();
        return false;
      }
    }

    async function previewApplicantRecruitmentUnitUploadFile() {
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const file = inputElement?.files?.[0] || null;
      const previewRequestId = applicantRecruitmentUploadPreviewRequestId + 1;

      applicantRecruitmentUploadPreviewRequestId = previewRequestId;

      if (!file) {
        clearApplicantRecruitmentUnitUploadPreview();
        return false;
      }

      if (!String(file.name || "").toLowerCase().endsWith(".xlsx")) {
        clearApplicantRecruitmentUnitUploadPreview({
          message: "현재는 XLSX 업로드만 미리보기할 수 있습니다.",
          messageType: "warning",
        });
        return false;
      }

      applicantRecruitmentUploadPreviewState = {
        fileName: String(file.name || "").trim(),
        fileSize: Number(file.size || 0),
        isLoading: true,
        hasLoaded: false,
        message: "XLSX 파일을 검사하고 전형 관리 변경 내역을 계산하고 있습니다.",
        messageType: "",
        summary: null,
      };
      syncApplicantRecruitmentUnitUploadPreview();

      try {
        const fileBuffer = await readFileAsArrayBuffer(file);
        const latestFile = inputElement?.files?.[0] || null;

        if (
          applicantRecruitmentUploadPreviewRequestId !== previewRequestId ||
          !latestFile ||
          latestFile.name !== file.name ||
          Number(latestFile.size || 0) !== Number(file.size || 0)
        ) {
          return false;
        }

        const previewResult = await apiRequest("/api/applicant-recruitment-units/import/preview", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name || "",
            fileContentBase64: arrayBufferToBase64(fileBuffer),
          }),
        });

        if (applicantRecruitmentUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        applicantRecruitmentUploadPreviewState = {
          fileName: String(previewResult?.fileName || file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: true,
          message: "",
          messageType: "",
          summary: previewResult && typeof previewResult === "object" ? previewResult : null,
        };
        syncApplicantRecruitmentUnitUploadPreview();
        return true;
      } catch (error) {
        if (applicantRecruitmentUploadPreviewRequestId !== previewRequestId) {
          return false;
        }

        if (handleAuthenticationFailure(error)) {
          return false;
        }

        applicantRecruitmentUploadPreviewState = {
          fileName: String(file.name || "").trim(),
          fileSize: Number(file.size || 0),
          isLoading: false,
          hasLoaded: false,
          message: error?.message || "전형 관리 미리보기를 생성하지 못했습니다.",
          messageType: "warning",
          summary: null,
        };
        syncApplicantRecruitmentUnitUploadPreview();
        return false;
      }
    }

    function triggerBlobDownload(blob, fileName) {
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    function syncApplicantAssignmentModalForm() {
      const editorState = state.applicantManager.assignmentEditor || createEmptyApplicantAssignmentEditor();
      const modalForm = document.getElementById("applicantAssignmentForm");
      const deleteButton = document.getElementById("applicantAssignmentModalDeleteButton");
      const saveButton = document.getElementById("applicantAssignmentModalSaveButton");
      const isEditorActive = editorState.isActive === true;
      const editingId = Number(editorState.editingId || 0);

      if (modalForm) {
        modalForm.querySelectorAll("[data-applicant-assignment-input]").forEach((inputElement) => {
          if (
            !(inputElement instanceof HTMLInputElement) &&
            !(inputElement instanceof HTMLTextAreaElement) &&
            !(inputElement instanceof HTMLSelectElement)
          ) {
            return;
          }

          const fieldName = String(inputElement.dataset.applicantAssignmentInput || "").trim();
          inputElement.value = fieldName ? String(editorState[fieldName] || "") : "";
          inputElement.disabled = !isEditorActive;
        });
      }

      if (deleteButton) {
        deleteButton.dataset.applicantAssignmentDelete = editingId > 0 ? String(editingId) : "";
        deleteButton.disabled = !(isEditorActive && editingId > 0);
      }

      if (saveButton) {
        saveButton.disabled = !isEditorActive;
      }
    }

    function buildApplicantPromotionRequestPayload(promotionState = {}) {
      return {
        submissionIds: Array.isArray(promotionState.selectedSubmissionIds) ? promotionState.selectedSubmissionIds : [],
        allowMissingPhoto: promotionState.allowMissingPhoto === true,
        allowOverbooking: promotionState.allowOverbooking === true,
        overbookingPercent: String(promotionState.overbookingPercent || "").trim(),
        sortField1: String(promotionState.sortField1 || "").trim(),
        sortField2: String(promotionState.sortField2 || "").trim(),
        sortField3: String(promotionState.sortField3 || "").trim(),
        breakField: String(promotionState.breakField || "").trim(),
      };
    }

    function syncApplicantRecruitmentUnitModalForm() {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();
      const modalForm = document.getElementById("applicantRecruitmentUnitForm");
      const deleteButton = document.getElementById("applicantRecruitmentUnitModalDeleteButton");
      const saveButton = document.getElementById("applicantRecruitmentUnitModalSaveButton");
      const isEditorActive = editorState.isActive === true;
      const editingId = Number(editorState.editingId || 0);

      if (modalForm) {
        modalForm.querySelectorAll("[data-applicant-recruitment-input]").forEach((inputElement) => {
          if (!(inputElement instanceof HTMLInputElement)) {
            return;
          }

          const fieldName = String(inputElement.dataset.applicantRecruitmentInput || "").trim();
          inputElement.value = fieldName ? String(editorState[fieldName] || "") : "";
          inputElement.disabled = !isEditorActive;
        });
      }

      if (deleteButton) {
        deleteButton.dataset.applicantRecruitmentDelete = editingId > 0 ? String(editingId) : "";
        deleteButton.disabled = !(isEditorActive && editingId > 0);
      }

      if (saveButton) {
        saveButton.disabled = !isEditorActive;
      }
    }

    function syncApplicantScheduleModalForm() {
      const editorState = state.applicantManager.scheduleEditor || createEmptyApplicantScheduleEditor();
      const modalForm = document.getElementById("applicantScheduleForm");
      const saveButton = document.getElementById("applicantScheduleModalSaveButton");
      const isEditorActive = editorState.isActive === true;

      if (modalForm) {
        modalForm.querySelectorAll("[data-applicant-schedule-input]").forEach((inputElement) => {
          if (
            !(inputElement instanceof HTMLInputElement) &&
            !(inputElement instanceof HTMLTextAreaElement) &&
            !(inputElement instanceof HTMLSelectElement)
          ) {
            return;
          }

          const fieldName = String(inputElement.dataset.applicantScheduleInput || "").trim();
          inputElement.value = fieldName ? String(editorState[fieldName] || "") : "";
          inputElement.disabled = !isEditorActive;
        });
      }

      if (saveButton) {
        saveButton.disabled = !isEditorActive;
      }
    }

    function resetApplicantFieldEditor({ render = true } = {}) {
      state.applicantManager.fieldEditor = createEmptyApplicantFieldEditor();

      if (render) {
        renderView();
      }
    }

    function resetApplicantRecruitmentUnitEditor({ render = true } = {}) {
      state.applicantManager.recruitmentUnitEditor = createEmptyApplicantRecruitmentUnitEditor();
      syncApplicantRecruitmentUnitModalForm();

      if (render) {
        renderView();
      }
    }

    function resetApplicantScheduleEditor({ render = true } = {}) {
      state.applicantManager.scheduleEditor = createEmptyApplicantScheduleEditor();
      syncApplicantScheduleModalForm();

      if (render) {
        renderView();
      }
    }

    function resetApplicantAssignmentEditor({ render = true } = {}) {
      state.applicantManager.assignmentEditor = createEmptyApplicantAssignmentEditor();
      syncApplicantAssignmentModalForm();

      if (render) {
        renderView();
      }
    }

    function activateApplicantFieldCreation() {
      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "fields";
      state.applicantManager.fieldEditor = createEmptyApplicantFieldEditor({
        isActive: true,
        isDraft: true,
      });
      renderView();
    }

    function activateApplicantRecruitmentUnitCreation() {
      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "recruitment-units";
      state.applicantManager.recruitmentUnitEditor = createEmptyApplicantRecruitmentUnitEditor({
        isActive: true,
      });
      syncApplicantRecruitmentUnitModalForm();
      renderView();
    }

    function activateApplicantAssignmentCreation() {
      state.applicantManager.assignmentEditor = createEmptyApplicantAssignmentEditor({
        isActive: true,
      });
      syncApplicantAssignmentModalForm();
      renderView();
    }

    function setApplicantManagerTab(tab = "templates") {
      const normalizedTab = String(tab || "").trim();

      if (!["templates", "history", "form-settings"].includes(normalizedTab)) {
        return;
      }

      state.applicantManager.activeTab = normalizedTab;
      renderView();
    }

    function setApplicantSettingsSection(section = "recruitment-units") {
      const normalizedSection = String(section || "").trim();

      if (!["fields", "recruitment-units", "assignments"].includes(normalizedSection)) {
        return;
      }

      state.applicantManager.settingsSection = normalizedSection;
      renderView();
    }

    function toggleApplicantSubmissionDetail(submissionId) {
      const normalizedSubmissionId = Number(submissionId || 0);

      if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
        resetApplicantSubmissionDetail();
        return;
      }

      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
      const targetSubmission = submissions.find((submission) => Number(submission?.id || 0) === normalizedSubmissionId) || null;

      if (!targetSubmission) {
        showToast("답변을 확인할 접수 이력을 찾을 수 없습니다.", "error", 3200);
        return;
      }

      state.applicantManager.expandedSubmissionId = normalizedSubmissionId;
      renderView();
      openModal?.("applicantSubmissionDetailModal");
    }

    function resetApplicantSubmissionDetail({ render = true } = {}) {
      state.applicantManager.expandedSubmissionId = 0;

      if (render) {
        renderView();
      }
    }

    function getApplicantPromotionState() {
      if (!state.applicantManager.promotion || typeof state.applicantManager.promotion !== "object") {
        state.applicantManager.promotion = createEmptyApplicantPromotionState();
      }

      return state.applicantManager.promotion;
    }

    function getApplicantSelectedSubmissionIds(statuses = []) {
      const selectedRowIds =
        typeof globalThis.getGridSelectedRowIds === "function"
          ? globalThis.getGridSelectedRowIds("applicantHistoryGrid")
          : state.tableSettings?.applicantHistoryGrid?.selectedRowIds;
      const selectedRowIdSet = new Set(
        (Array.isArray(selectedRowIds) ? selectedRowIds : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      const allowedStatuses = new Set(
        (Array.isArray(statuses) ? statuses : [statuses])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];

      return Array.from(
        new Set(
          submissions
            .filter((submission) => {
              const submissionId = String(submission?.id || "").trim();

              if (!submissionId || !selectedRowIdSet.has(submissionId)) {
                return false;
              }

              if (allowedStatuses.size === 0) {
                return true;
              }

              return allowedStatuses.has(String(submission?.status || "submitted").trim() || "submitted");
            })
            .map((submission) => Number(submission?.id || 0))
            .filter((value) => Number.isInteger(value) && value > 0),
        ),
      );
    }

    function getApplicantSelectedSubmissionScheduleStates(submissionIds = []) {
      const normalizedSubmissionIdSet = new Set(
        (Array.isArray(submissionIds) ? submissionIds : [submissionIds])
          .map((value) => Number(value || 0))
          .filter((value) => Number.isInteger(value) && value > 0),
      );
      const schedules = Array.isArray(state.applicantManager?.schedules) ? state.applicantManager.schedules : [];
      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
      const handledScheduleKeys = new Set();
      const scheduleStates = [];

      submissions.forEach((submission) => {
        const submissionId = Number(submission?.id || 0);

        if (!normalizedSubmissionIdSet.has(submissionId)) {
          return;
        }

        const matchedSchedule = findApplicantScheduleRecord(schedules, submission);
        const scheduleKey = String(
          matchedSchedule?.scheduleKey || submission?.scheduleKey || `${submission?.track || ""}|${submission?.admissionCode || ""}|${submission?.admission || ""}`,
        ).trim();

        if (scheduleKey && handledScheduleKeys.has(scheduleKey)) {
          return;
        }

        if (scheduleKey) {
          handledScheduleKeys.add(scheduleKey);
        }

        scheduleStates.push({
          submission,
          scheduleState: getApplicantSubmissionScheduleState(matchedSchedule),
        });
      });

      return scheduleStates;
    }

    function isApplicantPromotionWindowClosed(submissionIds = []) {
      const selectedScheduleStates = getApplicantSelectedSubmissionScheduleStates(submissionIds);
      return selectedScheduleStates.length > 0 && selectedScheduleStates.every((entry) => entry.scheduleState.reason === "after_end");
    }

    function formatApplicantScheduleRangeForMessage(value = "") {
      return String(value || "").trim().replaceAll("T", " ");
    }

    function getApplicantPromotionScheduleMessage(submissionIds = []) {
      const selectedScheduleStates = getApplicantSelectedSubmissionScheduleStates(submissionIds);
      const blockingEntry = selectedScheduleStates.find((entry) => entry.scheduleState.reason !== "after_end") || null;

      if (!blockingEntry) {
        return "접수 마감 후 배정표 관리에 저장된 고사실 순서와 배정 기준으로 자동 배정을 진행할 수 있습니다.";
      }

      const contextLabel = buildApplicantScheduleContextLabel(blockingEntry.submission);
      const scheduleRangeLabel = formatApplicantScheduleRangeForMessage(
        buildApplicantScheduleRangeLabel(blockingEntry.scheduleState, "submission"),
      );

      if (blockingEntry.scheduleState.reason === "not_configured") {
        return `${contextLabel} 접수 기간이 설정되지 않아 고사실 배정을 진행할 수 없습니다.`;
      }

      if (blockingEntry.scheduleState.reason === "before_start") {
        return `${contextLabel} 접수 일정이 아직 시작되지 않았습니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`;
      }

      if (blockingEntry.scheduleState.reason === "invalid") {
        return `${contextLabel} 접수 기간 설정을 확인한 뒤 다시 시도하세요.`;
      }

      return `${contextLabel} 접수기간 중에는 고사실 배정을 진행할 수 없습니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`;
    }

    function buildApplicantPromotionSummary(previewRows = [], allowMissingPhoto = false, fallbackSummary = null) {
      const normalizedRows = Array.isArray(previewRows) ? previewRows : [];
      const applicantRows = normalizedRows.filter((row) => Number(row?.submissionId || 0) > 0);
      const errorCount = normalizedRows.filter((row) => String(row?.status || "") === "error").length;
      const warningCount = applicantRows.filter((row) => String(row?.status || "") === "warning").length;
      const readyCount = applicantRows.filter((row) => String(row?.status || "") === "ready").length;
      const missingPhotoCount = applicantRows.filter((row) => !(row?.hasPhoto === true || Number(row?.hasPhoto) === 1)).length;

      return {
        totalCount: applicantRows.length,
        readyCount: fallbackSummary?.readyCount != null && normalizedRows.length === 0 ? Number(fallbackSummary.readyCount) : readyCount,
        warningCount,
        errorCount,
        missingPhotoCount,
        canCommit: errorCount === 0 && (allowMissingPhoto || missingPhotoCount === 0),
      };
    }

    function renderApplicantPromotionPreviewSummary(summary = null) {
      if (!summary) {
        return `<p class="muted">배정표 관리 메뉴에 저장된 배정표를 기준으로 프리뷰를 실행하세요.</p>`;
      }

      return `
        <div class="applicant-promotion-summary-grid">
          <div class="applicant-promotion-summary-card">
            <span>대상</span>
            <strong>${escapeHtml(summary.totalCount)}</strong>
          </div>
          <div class="applicant-promotion-summary-card">
            <span>정상</span>
            <strong>${escapeHtml(summary.readyCount)}</strong>
          </div>
          <div class="applicant-promotion-summary-card">
            <span>오류</span>
            <strong>${escapeHtml(summary.errorCount)}</strong>
          </div>
          <div class="applicant-promotion-summary-card">
            <span>사진 미등록</span>
            <strong>${escapeHtml(summary.missingPhotoCount)}</strong>
          </div>
        </div>
      `;
    }

    function renderApplicantPromotionPreviewTable(rows = []) {
      const normalizedRows = Array.isArray(rows) ? rows : [];

      if (normalizedRows.length === 0) {
        return `<div class="panel-card applicant-promotion-preview-empty"><p>프리뷰 결과가 없습니다.</p><span class="muted">배정표 관리 메뉴에서 데이터를 준비한 뒤 프리뷰를 실행하세요.</span></div>`;
      }

      return `
        <div class="applicant-promotion-preview-table-wrap">
          <table class="applicant-promotion-preview-table">
            <thead>
              <tr>
                ${applicantPromotionPreviewColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${normalizedRows
                .map((row) => {
                  const rowStatus = String(row?.status || "");

                  return `
                    <tr class="applicant-promotion-preview-row applicant-promotion-preview-row-${escapeHtml(rowStatus || "ready")}">
                      ${applicantPromotionPreviewColumns
                        .map((column) => {
                          const rawValue = row?.[column.key];

                          if (column.key === "statusLabel") {
                            return `<td><span class="applicant-promotion-status applicant-promotion-status-${escapeHtml(rowStatus || "ready")}">${escapeHtml(rawValue || "-")}</span></td>`;
                          }

                          if (column.key === "errorMessage") {
                            return `<td class="applicant-promotion-preview-error-cell">${escapeHtml(rawValue || "-")}</td>`;
                          }

                          return `<td>${escapeHtml(rawValue || "-")}</td>`;
                        })
                        .join("")}
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    function syncApplicantPromotionModal() {
      const promotionState = getApplicantPromotionState();
      const promotionModal = document.getElementById("applicantPromotionModal");
      const selectionMeta = document.getElementById("applicantPromotionSelectionMeta");
      const assignmentInfo = document.getElementById("applicantPromotionAssignmentInfo");
      const commitButton = document.getElementById("applicantPromotionCommitButton");
      const overbookingRateInput = document.getElementById("applicantPromotionOverbookingPercent");
      const overbookingToggle = document.getElementById("applicantPromotionAllowOverbooking");
      const selectedCount = Array.isArray(promotionState.selectedSubmissionIds) ? promotionState.selectedSubmissionIds.length : 0;
      const storedAssignmentCount = Array.isArray(state.applicantManager?.assignments) ? state.applicantManager.assignments.length : 0;

      if (selectionMeta) {
        selectionMeta.textContent = selectedCount > 0 ? `선택된 접수 ${selectedCount}건` : "선택된 접수가 없습니다.";
      }

      if (assignmentInfo) {
        assignmentInfo.textContent = storedAssignmentCount > 0 ? `저장된 배정표 ${storedAssignmentCount}건` : "저장된 배정표가 없습니다.";
      }

      if (promotionModal) {
        promotionModal.querySelectorAll("[data-applicant-promotion-input]").forEach((inputElement) => {
          if (
            !(inputElement instanceof HTMLInputElement) &&
            !(inputElement instanceof HTMLTextAreaElement) &&
            !(inputElement instanceof HTMLSelectElement)
          ) {
            return;
          }

          const fieldName = String(inputElement.dataset.applicantPromotionInput || "").trim();

          if (!fieldName) {
            return;
          }

          if (inputElement instanceof HTMLInputElement && inputElement.type === "checkbox") {
            inputElement.checked = promotionState[fieldName] === true;
            inputElement.disabled = promotionState.isCommitting === true;
            return;
          }

          inputElement.value = String(promotionState[fieldName] || "");
          inputElement.disabled = promotionState.isCommitting === true;
        });
      }

      if (overbookingRateInput instanceof HTMLInputElement) {
        overbookingRateInput.disabled = promotionState.isCommitting === true || promotionState.allowOverbooking !== true;
      }

      if (overbookingToggle instanceof HTMLButtonElement) {
        overbookingToggle.disabled = promotionState.isCommitting === true;
        overbookingToggle.setAttribute("aria-pressed", promotionState.allowOverbooking === true ? "true" : "false");
        overbookingToggle.setAttribute(
          "aria-label",
          promotionState.allowOverbooking === true ? "오버부킹 사용 중" : "오버부킹 미사용",
        );
        overbookingToggle.dataset.enabled = promotionState.allowOverbooking === true ? "true" : "false";
        overbookingToggle.title = promotionState.allowOverbooking === true ? "사용" : "미사용";
      }

      if (commitButton instanceof HTMLButtonElement) {
        commitButton.disabled =
          selectedCount === 0 ||
          storedAssignmentCount === 0 ||
          promotionState.isCommitting === true;
        commitButton.textContent = promotionState.isCommitting === true ? "배정 중..." : "배정 시작";
      }
    }

    function resetApplicantPromotionWorkflow({ render = true } = {}) {
      state.applicantManager.promotion = createEmptyApplicantPromotionState();

      syncApplicantPromotionModal();

      if (render) {
        renderView();
      }
    }

    function updateApplicantPromotionField(fieldName = "", value) {
      const promotionState = getApplicantPromotionState();
      const normalizedFieldName = String(fieldName || "").trim();
      const isBooleanField = ["allowMissingPhoto", "allowOverbooking"].includes(normalizedFieldName);

      state.applicantManager.promotion = {
        ...promotionState,
        [normalizedFieldName]:
          isBooleanField
            ? value === true || value === "true" || Number(value) === 1
            : String(value ?? ""),
        previewRows: [],
        summary: null,
      };
      syncApplicantPromotionModal();
    }

    function openApplicantPromotionModal() {
      const selectedSubmissionIds = getApplicantSelectedSubmissionIds(["submitted"]);

      if (selectedSubmissionIds.length === 0) {
        showToast("접수 완료 상태의 접수 이력을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!isApplicantPromotionWindowClosed(selectedSubmissionIds)) {
        showToast(getApplicantPromotionScheduleMessage(selectedSubmissionIds), "error", 4200);
        return;
      }

      state.applicantManager.promotion = {
        ...createEmptyApplicantPromotionState(),
        selectedSubmissionIds,
      };
      syncApplicantPromotionModal();
      openModal?.("applicantPromotionModal");
    }

    function startApplicantFieldEdit(fieldId) {
      const field = state.applicantManager.fields.find((candidate) => candidate.id === Number(fieldId || 0));

      if (!field) {
        showToast("수정할 접수 양식 항목을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "fields";
      state.applicantManager.fieldEditor = {
        isActive: true,
        isDraft: false,
        editingId: field.id,
        questionText: field.questionText || "",
        questionDescription: field.questionDescription || "",
        inputType: field.inputType || "text",
        systemFieldKey: field.systemFieldKey || "",
        options: Array.isArray(field.options) ? [...field.options] : [],
        optionDraft: "",
        allowCustomOption: false,
        customOptionLabel: String(field.customOptionLabel || "").trim(),
        required: field.required === true,
      };
      renderView();
    }

    function startApplicantRecruitmentUnitEdit(unitId) {
      const unit = state.applicantManager.recruitmentUnits.find((candidate) => candidate.id === Number(unitId || 0));

      if (!unit) {
        showToast("수정할 전형 관리 항목을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "recruitment-units";
      state.applicantManager.recruitmentUnitEditor = {
        isActive: true,
        editingId: unit.id,
        trackName: unit.trackName || "",
        admissionCode: unit.admissionCode || "",
        admissionName: unit.admissionName || "",
        seriesCode: unit.seriesCode || "",
        seriesName: unit.seriesName || "",
        unitCode: unit.unitCode || "",
        unitName: unit.unitName || "",
        majorCode: unit.majorCode || "",
        majorName: unit.majorName || "",
      };
      renderView();
      syncApplicantRecruitmentUnitModalForm();
      openModal?.("applicantRecruitmentUnitModal");
    }

    function startApplicantScheduleEdit(scheduleKey) {
      const normalizedScheduleKey = String(scheduleKey || "").trim();
      const schedule = state.applicantManager.schedules.find(
        (candidate) => String(candidate?.scheduleKey || candidate?.id || "").trim() === normalizedScheduleKey,
      );

      if (!schedule) {
        showToast("수정할 일정 항목을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.scheduleEditor = {
        isActive: true,
        editingId: Number(schedule.id || 0),
        scheduleKey: String(schedule.scheduleKey || "").trim(),
        trackName: schedule.trackName || "",
        admissionCode: schedule.admissionCode || "",
        admissionName: schedule.admissionName || "",
        applicantScheduleStartAt: schedule.applicantScheduleStartAt || "",
        applicantScheduleEndAt: schedule.applicantScheduleEndAt || "",
        admitCardLookupScheduleStartAt: schedule.admitCardLookupScheduleStartAt || "",
        admitCardLookupScheduleEndAt: schedule.admitCardLookupScheduleEndAt || "",
      };
      renderView();
      syncApplicantScheduleModalForm();
      openModal?.("applicantScheduleModal");
    }

    function startApplicantAssignmentEdit(assignmentId) {
      const assignment = state.applicantManager.assignments.find((candidate) => candidate.id === Number(assignmentId || 0));

      if (!assignment) {
        showToast("수정할 배정표 행을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.assignmentEditor = {
        isActive: true,
        editingId: assignment.id,
        track: assignment.track || "",
        admission: assignment.admission || "",
        series: assignment.series || "",
        unit: assignment.unit || "",
        major: assignment.major || "",
        date: assignment.date || "",
        time: assignment.time || "",
        buildingCode: assignment.buildingCode || "",
        building: assignment.building || "",
        roomCode: assignment.roomCode || "",
        room: assignment.room || "",
        assignedCount: String(assignment.assignedCount || 1),
      };
      syncApplicantAssignmentModalForm();
      openModal?.("applicantAssignmentModal");
    }

    function updateApplicantFieldEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const normalizedValue =
        fieldName === "required" || fieldName === "allowCustomOption"
          ? value === true || value === "true" || Number(value) === 1
          : String(value ?? "");
      const nextEditorState = {
        ...editorState,
        [fieldName]: normalizedValue,
      };

      if (fieldName === "inputType" && normalizedValue !== "select") {
        nextEditorState.allowCustomOption = false;
        nextEditorState.customOptionLabel = "";
      }

      if (fieldName === "inputType") {
        if (normalizedValue === "file") {
          nextEditorState.systemFieldKey = "";
        } else if (normalizedValue === "photo") {
          if (nextEditorState.systemFieldKey && nextEditorState.systemFieldKey !== "photo") {
            nextEditorState.systemFieldKey = "";
          }
        } else if (nextEditorState.systemFieldKey === "photo") {
          nextEditorState.systemFieldKey = "";
        }
      }

      if (fieldName === "systemFieldKey") {
        if (editorState.inputType === "file" && normalizedValue) {
          nextEditorState.systemFieldKey = "";
        } else if (editorState.inputType === "photo" && normalizedValue && normalizedValue !== "photo") {
          nextEditorState.systemFieldKey = "";
        } else if (editorState.inputType !== "photo" && normalizedValue === "photo") {
          nextEditorState.systemFieldKey = "";
        }
      }

      if (fieldName === "allowCustomOption" && normalizedValue !== true) {
        nextEditorState.customOptionLabel = "";
      }

      state.applicantManager.fieldEditor = nextEditorState;

      if (fieldName === "inputType") {
        renderView();
      }
    }

    function updateApplicantRecruitmentUnitEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();

      if (editorState.isActive !== true) {
        return;
      }

      state.applicantManager.recruitmentUnitEditor = {
        ...editorState,
        [fieldName]: String(value ?? ""),
      };
    }

    function updateApplicantScheduleEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.scheduleEditor || createEmptyApplicantScheduleEditor();

      if (editorState.isActive !== true) {
        return;
      }

      state.applicantManager.scheduleEditor = {
        ...editorState,
        [fieldName]: String(value ?? ""),
      };
    }

    function updateApplicantAssignmentEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.assignmentEditor || createEmptyApplicantAssignmentEditor();

      if (editorState.isActive !== true) {
        return;
      }

      state.applicantManager.assignmentEditor = {
        ...editorState,
        [fieldName]: String(value ?? ""),
      };
    }

    function updateApplicantSettingsField(fieldName = "", value) {
      state.applicantManager.settings = {
        ...state.applicantManager.settings,
        [fieldName]: fieldName === "examNoSequenceStart" ? Number(value || 0) : String(value ?? ""),
      };
    }

    function resolveApplicantPhotoMimeType(fileName = "", mimeType = "") {
      const normalizedMimeType = String(mimeType || "").trim().toLowerCase();

      if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/png") {
        return normalizedMimeType;
      }

      const normalizedFileName = String(fileName || "").trim().toLowerCase();

      if (normalizedFileName.endsWith(".png")) {
        return "image/png";
      }

      if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
        return "image/jpeg";
      }

      return "";
    }

    async function refreshApplicantBootstrap(successMessage = "") {
      const currentTab = state.applicantManager.activeTab || "form-settings";
      const currentSettingsSection = state.applicantManager.settingsSection || "recruitment-units";

      await loadBootstrapData({ showLoading: false });
      state.applicantManager.activeTab = currentTab;
      state.applicantManager.settingsSection = currentSettingsSection;

      if (successMessage) {
        showToast(successMessage);
      }
    }

    async function saveApplicantFieldEditor() {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        showToast("질문 카드를 먼저 선택하거나 새 질문을 추가하세요.", "error", 3200);
        return;
      }

      const requestPath = editorState.editingId
        ? `/api/applicant-form-fields/${editorState.editingId}`
        : "/api/applicant-form-fields";
      const requestMethod = editorState.editingId ? "PUT" : "POST";

      try {
        await apiRequest(requestPath, {
          method: requestMethod,
          body: JSON.stringify({
            questionText: editorState.questionText,
            questionDescription: editorState.questionDescription,
            inputType: editorState.inputType,
            systemFieldKey: editorState.systemFieldKey,
            options: editorState.inputType === "select" ? editorState.options : [],
            allowCustomOption:
              editorState.inputType === "select" && String(editorState.customOptionLabel || "").trim() !== "",
            customOptionLabel:
              editorState.inputType === "select" ? String(editorState.customOptionLabel || "").trim() : "",
            required: editorState.required,
          }),
        });
        resetApplicantFieldEditor({ render: false });
        await refreshApplicantBootstrap(editorState.editingId ? "접수 양식 항목을 수정했습니다." : "접수 양식 항목을 추가했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 항목을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantRecruitmentUnit() {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();

      if (editorState.isActive !== true) {
        showToast("전형 관리 항목을 선택하거나 새로 추가하세요.", "error", 3200);
        return;
      }

      const requestPath = editorState.editingId
        ? `/api/applicant-recruitment-units/${editorState.editingId}`
        : "/api/applicant-recruitment-units";
      const requestMethod = editorState.editingId ? "PUT" : "POST";

      try {
        await apiRequest(requestPath, {
          method: requestMethod,
          body: JSON.stringify({
            trackName: editorState.trackName,
            admissionCode: editorState.admissionCode,
            admissionName: editorState.admissionName,
            seriesCode: editorState.seriesCode,
            seriesName: editorState.seriesName,
            unitCode: editorState.unitCode,
            unitName: editorState.unitName,
            majorCode: editorState.majorCode,
            majorName: editorState.majorName,
          }),
        });
        await requestCloseModal?.("applicantRecruitmentUnitModal");
        await refreshApplicantBootstrap(editorState.editingId ? "전형 관리 항목을 수정했습니다." : "전형 관리 항목을 추가했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "전형 관리 항목을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantSchedule() {
      const editorState = state.applicantManager.scheduleEditor || createEmptyApplicantScheduleEditor();

      if (editorState.isActive !== true) {
        showToast("일정 항목을 먼저 선택하세요.", "error", 3200);
        return;
      }

      try {
        await apiRequest("/api/applicant-schedules", {
          method: "PUT",
          body: JSON.stringify({
            trackName: editorState.trackName,
            admissionCode: editorState.admissionCode,
            admissionName: editorState.admissionName,
            applicantScheduleStartAt: editorState.applicantScheduleStartAt,
            applicantScheduleEndAt: editorState.applicantScheduleEndAt,
            admitCardLookupScheduleStartAt: editorState.admitCardLookupScheduleStartAt,
            admitCardLookupScheduleEndAt: editorState.admitCardLookupScheduleEndAt,
          }),
        });
        await requestCloseModal?.("applicantScheduleModal");
        await refreshApplicantBootstrap("일정을 저장했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "일정을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantAssignment() {
      const editorState = state.applicantManager.assignmentEditor || createEmptyApplicantAssignmentEditor();

      if (editorState.isActive !== true) {
        showToast("배정표 행을 선택하거나 새로 추가하세요.", "error", 3200);
        return;
      }

      const requestPath = editorState.editingId
        ? `/api/applicant-assignments/${editorState.editingId}`
        : "/api/applicant-assignments";
      const requestMethod = editorState.editingId ? "PUT" : "POST";

      try {
        await apiRequest(requestPath, {
          method: requestMethod,
          body: JSON.stringify({
            track: editorState.track,
            admission: editorState.admission,
            series: editorState.series,
            unit: editorState.unit,
            major: editorState.major,
            date: editorState.date,
            time: editorState.time,
            buildingCode: editorState.buildingCode,
            building: editorState.building,
            roomCode: editorState.roomCode,
            room: editorState.room,
            assignedCount: editorState.assignedCount,
          }),
        });
        await requestCloseModal?.("applicantAssignmentModal");
        await refreshApplicantBootstrap(editorState.editingId ? "배정표 행을 수정했습니다." : "배정표 행을 추가했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "배정표 행을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function downloadApplicantAssignmentTemplate() {
      try {
        const response = await fetch(buildApiUrl("/api/applicant-assignments/template.xlsx"), {
          credentials: "same-origin",
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "배정표 양식을 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "배정표 양식.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantAssignments() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantAssignmentGrid")
          : state.applicantManager?.assignments;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 배정표 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-assignments/export.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "배정표 데이터를 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "배정표 데이터.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantRecruitmentUnitTemplate() {
      try {
        const response = await fetch(buildApiUrl("/api/applicant-recruitment-units/template.xlsx"), {
          credentials: "same-origin",
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "전형 관리 양식을 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "전형 관리 업로드 양식.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantRecruitmentUnits() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantRecruitmentGrid")
          : state.applicantManager?.recruitmentUnits;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-recruitment-units/export.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "전형 관리 데이터를 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "전형 관리 데이터.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantSubmissions() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantHistoryGrid")
          : state.applicantManager?.submissions;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-submissions/export.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "접수 이력 데이터를 다운로드할 수 없습니다.");
        }

        await requestCloseModal?.("applicantSubmissionDownloadModal");
        triggerBlobDownload(await response.blob(), "접수 이력 데이터.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantSubmissionPhotos() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantHistoryGrid")
          : state.applicantManager?.submissions;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-submissions/photos.zip"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "수험생 사진 ZIP을 다운로드할 수 없습니다.");
        }

        await requestCloseModal?.("applicantSubmissionDownloadModal");
        triggerBlobDownload(await response.blob(), "접수 이력 수험생 사진.zip");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function openApplicantAssignmentManagementView() {
      if (typeof globalThis.navigateToView === "function") {
        const didNavigate = globalThis.navigateToView("applicantAssignmentManagement");

        if (didNavigate) {
          await requestCloseModal?.("applicantPromotionModal");
          return;
        }
      }

      showToast("배정표 관리 화면으로 이동하지 못했습니다.", "error", 3200);
    }

    async function previewApplicantPromotionsAction() {
      const promotionState = getApplicantPromotionState();
      if (!isApplicantPromotionWindowClosed(promotionState.selectedSubmissionIds)) {
        showToast(getApplicantPromotionScheduleMessage(promotionState.selectedSubmissionIds), "error", 4200);
        return;
      }

      if (!Array.isArray(promotionState.selectedSubmissionIds) || promotionState.selectedSubmissionIds.length === 0) {
        showToast("접수 이력을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!Array.isArray(state.applicantManager?.assignments) || state.applicantManager.assignments.length === 0) {
        showToast("배정표 관리 메뉴에서 배정표 데이터를 먼저 등록하세요.", "error", 4200);
        return;
      }

      state.applicantManager.promotion = {
        ...promotionState,
        isLoading: true,
        previewRows: [],
        summary: null,
      };
      syncApplicantPromotionModal();

      try {
        const previewResult = await apiRequest("/api/applicant-submissions/promotions/preview", {
          method: "POST",
          body: JSON.stringify(buildApplicantPromotionRequestPayload(promotionState)),
        });

        state.applicantManager.promotion = {
          ...promotionState,
          previewRows: Array.isArray(previewResult?.rows) ? previewResult.rows : [],
          summary: previewResult?.summary && typeof previewResult.summary === "object" ? previewResult.summary : null,
          isLoading: false,
        };
        syncApplicantPromotionModal();
      } catch (error) {
        state.applicantManager.promotion = {
          ...promotionState,
          previewRows: [],
          summary: null,
          isLoading: false,
        };
        syncApplicantPromotionModal();

        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "수험생 이관 프리뷰를 생성하지 못했습니다.", "error", 4200);
      }
    }

    async function downloadApplicantPromotionPreview() {
      const promotionState = getApplicantPromotionState();

      if (!Array.isArray(promotionState.previewRows) || promotionState.previewRows.length === 0) {
        showToast("먼저 프리뷰를 실행하세요.", "error", 3200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-submissions/promotions/preview.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: promotionState.previewRows,
            summary: buildApplicantPromotionSummary(
              promotionState.previewRows,
              promotionState.allowMissingPhoto === true,
              promotionState.summary,
            ),
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "프리뷰 XLSX를 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "수험생 이관 프리뷰.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function commitApplicantPromotionsAction() {
      const promotionState = getApplicantPromotionState();

      if (!isApplicantPromotionWindowClosed(promotionState.selectedSubmissionIds)) {
        showToast(getApplicantPromotionScheduleMessage(promotionState.selectedSubmissionIds), "error", 4200);
        return;
      }

      if (!Array.isArray(promotionState.selectedSubmissionIds) || promotionState.selectedSubmissionIds.length === 0) {
        showToast("접수 이력을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!Array.isArray(state.applicantManager?.assignments) || state.applicantManager.assignments.length === 0) {
        showToast("배정표 관리 메뉴에서 배정표 데이터를 먼저 등록하세요.", "error", 4200);
        return;
      }

      const confirmationMessage = [
        `선택한 접수 ${promotionState.selectedSubmissionIds.length}건에 대해 고사실 배정을 시작하시겠습니까?`,
        "",
        `정렬1: ${getApplicantPromotionFieldLabel(promotionState.sortField1)}`,
        `정렬2: ${getApplicantPromotionFieldLabel(promotionState.sortField2)}`,
        `정렬3: ${getApplicantPromotionFieldLabel(promotionState.sortField3)}`,
        `배정 구분: ${getApplicantPromotionFieldLabel(promotionState.breakField)}`,
        `오버부킹: ${promotionState.allowOverbooking === true ? `사용 (${String(promotionState.overbookingPercent || "").trim() || "10"}%)` : "미사용"}`,
      ].join("\n");

      if (!window.confirm(confirmationMessage)) {
        return;
      }

      state.applicantManager.promotion = {
        ...promotionState,
        isCommitting: true,
      };
      syncApplicantPromotionModal();

      try {
        await apiRequest("/api/applicant-submissions/promotions/commit", {
          method: "POST",
          body: JSON.stringify(buildApplicantPromotionRequestPayload(promotionState)),
        });

        resetApplicantPromotionWorkflow({ render: false });
        await requestCloseModal?.("applicantPromotionModal");
        await refreshApplicantBootstrap("고사실 배정을 완료했습니다.");
      } catch (error) {
        state.applicantManager.promotion = {
          ...promotionState,
          isCommitting: false,
        };
        syncApplicantPromotionModal();

        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(
          error?.message || "고사실 배정에 실패했습니다.",
          "error",
          error?.code === "APPLICANT_PROMOTION_COMMIT_BLOCKED" ? 7200 : 4200,
        );
      }
    }

    async function resetApplicantPromotionsAction() {
      const selectedSubmissionIds = getApplicantSelectedSubmissionIds(["promoted"]);

      if (selectedSubmissionIds.length === 0) {
        showToast("배정 완료 상태의 접수 이력을 먼저 선택하세요.", "error", 3200);
        return;
      }

      const confirmationMessage = [
        `선택한 접수 ${selectedSubmissionIds.length}건의 고사실 배정을 초기화하시겠습니까?`,
        "",
        "수험생 데이터로 이관된 정보와 배정 정보를 삭제하고 상태를 제출 상태로 되돌립니다.",
        "수험번호는 유지됩니다.",
      ].join("\n");

      if (!window.confirm(confirmationMessage)) {
        return;
      }

      try {
        const resetResult = await apiRequest("/api/applicant-submissions/promotions/reset", {
          method: "POST",
          body: JSON.stringify({
            submissionIds: selectedSubmissionIds,
          }),
        });

        if (state.tableSettings?.applicantHistoryGrid) {
          state.tableSettings.applicantHistoryGrid.selectedRowIds = [];
          state.tableSettings.applicantHistoryGrid.selectionAnchorRowId = "";
        }

        resetApplicantPromotionWorkflow({ render: false });

        if (Number(resetResult?.resetCount || 0) > 0) {
          await refreshApplicantBootstrap(`고사실 배정 ${Number(resetResult.resetCount || 0)}건을 초기화했습니다.`);
          return;
        }

        renderView();
        showToast("선택한 접수에 초기화할 배정 데이터가 없습니다.", "success", 3200);
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "고사실 배정을 초기화하지 못했습니다.", "error", 4200);
      }
    }

    async function uploadApplicantAssignmentFile() {
      const inputElement = typeof getApplicantAssignmentUploadFileInput === "function" ? getApplicantAssignmentUploadFileInput() : null;
      const file = inputElement?.files?.[0] || null;

      if (!file) {
        showToast("업로드할 XLSX 파일을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        showToast("현재는 XLSX 업로드만 지원합니다.", "error", 3200);
        return;
      }

      try {
        if (!hasMatchingApplicantUploadPreview(applicantAssignmentUploadPreviewState, file)) {
          const didPreview = await previewApplicantAssignmentUploadFile();

          if (!didPreview) {
            return;
          }
        }

        const previewSummary =
          applicantAssignmentUploadPreviewState.summary && typeof applicantAssignmentUploadPreviewState.summary === "object"
            ? applicantAssignmentUploadPreviewState.summary
            : null;
        const selectedCount = getApplicantSelectedImportCount(previewSummary, applicantAssignmentUploadExistingDataPolicy);

        if (!previewSummary) {
          showToast("업로드 미리보기를 먼저 확인하세요.", "error", 3200);
          return;
        }

        if (selectedCount <= 0) {
          showToast("선택한 기존 데이터 처리 방식에 따라 반영할 배정표 데이터가 없습니다.", "error", 3200);
          return;
        }

        if (!window.confirm(buildApplicantAssignmentUploadConfirmationMessage(previewSummary, applicantAssignmentUploadExistingDataPolicy))) {
          return;
        }

        const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

        const uploadResult = await apiRequest("/api/applicant-assignments/import", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            fileContentBase64,
            existingDataPolicy: applicantAssignmentUploadExistingDataPolicy,
          }),
        });

        const uploadResultReport = buildApplicantUploadResultReport({
          title: "배정표 업로드 결과 리포트",
          fileNamePrefix: "배정표",
          sourceFileName: file.name,
          previewSummary,
          existingDataPolicy: applicantAssignmentUploadExistingDataPolicy,
          result: uploadResult,
        });

        downloadApplicantUploadReport(uploadResultReport.fileName, uploadResultReport.content);
        clearApplicantAssignmentUploadFiles();
        await requestCloseModal?.("applicantAssignmentUploadModal");
        await refreshApplicantBootstrap("배정표 데이터를 업로드했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "배정표 데이터를 업로드하지 못했습니다.", "error", 4200);
      }
    }

    async function uploadApplicantRecruitmentUnitFile() {
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const file = inputElement?.files?.[0] || null;

      if (!file) {
        showToast("업로드할 XLSX 파일을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        showToast("현재는 XLSX 업로드만 지원합니다.", "error", 3200);
        return;
      }

      try {
        if (!hasMatchingApplicantUploadPreview(applicantRecruitmentUploadPreviewState, file)) {
          const didPreview = await previewApplicantRecruitmentUnitUploadFile();

          if (!didPreview) {
            return;
          }
        }

        const previewSummary =
          applicantRecruitmentUploadPreviewState.summary && typeof applicantRecruitmentUploadPreviewState.summary === "object"
            ? applicantRecruitmentUploadPreviewState.summary
            : null;
        const selectedCount = getApplicantSelectedImportCount(previewSummary, applicantRecruitmentUploadExistingDataPolicy);

        if (!previewSummary) {
          showToast("업로드 미리보기를 먼저 확인하세요.", "error", 3200);
          return;
        }

        if (selectedCount <= 0) {
          showToast("선택한 기존 데이터 처리 방식에 따라 반영할 전형 관리 데이터가 없습니다.", "error", 3200);
          return;
        }

        if (!window.confirm(buildApplicantRecruitmentUploadConfirmationMessage(previewSummary, applicantRecruitmentUploadExistingDataPolicy))) {
          return;
        }

        const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

        const uploadResult = await apiRequest("/api/applicant-recruitment-units/import", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            fileContentBase64,
            existingDataPolicy: applicantRecruitmentUploadExistingDataPolicy,
          }),
        });

        const uploadResultReport = buildApplicantUploadResultReport({
          title: "전형 관리 업로드 결과 리포트",
          fileNamePrefix: "전형관리",
          sourceFileName: file.name,
          previewSummary,
          existingDataPolicy: applicantRecruitmentUploadExistingDataPolicy,
          result: uploadResult,
        });

        downloadApplicantUploadReport(uploadResultReport.fileName, uploadResultReport.content);
        clearApplicantRecruitmentUnitUploadFiles();
        await requestCloseModal?.("applicantUnitUploadModal");
        await refreshApplicantBootstrap("전형 관리 데이터를 업로드했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "전형 관리 데이터를 업로드하지 못했습니다.", "error", 4200);
      }
    }

    async function uploadApplicantSubmissionPhoto(file, submissionId = 0) {
      const normalizedSubmissionId = Number(submissionId || state.applicantManager?.expandedSubmissionId || 0);
      const normalizedFileName = String(file?.name || "").trim();
      const fileExtension =
        normalizedFileName && normalizedFileName.includes(".")
          ? normalizedFileName.slice(normalizedFileName.lastIndexOf(".")).toLowerCase()
          : "";

      if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
        showToast("사진을 등록할 접수 이력을 찾을 수 없습니다.", "error", 3200);
        return;
      }

      if (!file || !normalizedFileName) {
        showToast("등록할 사진 파일을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (![".jpg", ".jpeg", ".png"].includes(fileExtension)) {
        showToast("사진 파일은 JPG, JPEG, PNG 형식만 업로드할 수 있습니다.", "error", 3200);
        return;
      }

      try {
        const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

        await apiRequest(`/api/applicant-submissions/${normalizedSubmissionId}/photo`, {
          method: "PUT",
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileContentBase64,
            mimeType: resolveApplicantPhotoMimeType(normalizedFileName, file.type),
          }),
        });

        await loadBootstrapData({ showLoading: false });
        showToast("접수 사진을 다시 등록했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 사진을 다시 등록하지 못했습니다.", "error", 4200);
      }
    }

    function addApplicantFieldOption() {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const nextOption = String(editorState.optionDraft || "").trim();
      const existingOptions = Array.isArray(editorState.options) ? editorState.options : [];

      if (!nextOption) {
        showToast("추가할 선택지 항목을 입력하세요.", "error", 3200);
        return;
      }

      if (existingOptions.includes(nextOption)) {
        showToast("같은 선택지 항목이 이미 있습니다.", "error", 3200);
        return;
      }

      state.applicantManager.fieldEditor = {
        ...editorState,
        options: [...existingOptions, nextOption],
        optionDraft: "",
        allowCustomOption: false,
        customOptionLabel:
          editorState.allowCustomOption === true && !String(editorState.customOptionLabel || "").trim()
            ? nextOption
            : String(editorState.customOptionLabel || "").trim(),
      };
      renderView();
    }

    function removeApplicantFieldOption(optionIndex) {
      const normalizedIndex = Number(optionIndex);
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const existingOptions = Array.isArray(editorState.options) ? editorState.options : [];

      if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= existingOptions.length) {
        return;
      }

      const removedOption = String(existingOptions[normalizedIndex] || "").trim();
      const currentCustomOptionLabel = String(editorState.customOptionLabel || "").trim();

      state.applicantManager.fieldEditor = {
        ...editorState,
        options: existingOptions.filter((_, index) => index !== normalizedIndex),
        customOptionLabel: currentCustomOptionLabel === removedOption ? "" : currentCustomOptionLabel,
      };
      renderView();
    }

    async function deleteApplicantField(fieldId) {
      if (!window.confirm("선택한 접수 양식 항목을 삭제하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}`, {
          method: "DELETE",
        });

        if (state.applicantManager.fieldEditor?.editingId === Number(fieldId || 0)) {
          resetApplicantFieldEditor({ render: false });
        }

        await refreshApplicantBootstrap("접수 양식 항목을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 항목을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    async function moveApplicantField(fieldId, direction = "") {
      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}/move`, {
          method: "POST",
          body: JSON.stringify({ direction }),
        });
        await refreshApplicantBootstrap("접수 양식 순서를 변경했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 순서를 변경하지 못했습니다.", "error", 4200);
      }
    }

    async function reorderApplicantField(fieldId, targetFieldId, placement = "before") {
      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}/move`, {
          method: "POST",
          body: JSON.stringify({
            targetFieldId,
            placement,
          }),
        });
        await refreshApplicantBootstrap("접수 양식 순서를 변경했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 순서를 변경하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantSettings() {
      try {
        await apiRequest("/api/applicant-settings", {
          method: "PUT",
          body: JSON.stringify({
            examNoPattern: state.applicantManager.settings?.examNoPattern || defaultExamNoPattern,
            examNoSequenceStart: state.applicantManager.settings?.examNoSequenceStart || defaultExamNoSequenceStart,
          }),
        });
        await refreshApplicantBootstrap("접수 수험번호 규칙을 저장했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 수험번호 규칙을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function deleteApplicantRecruitmentUnit(unitId) {
      if (!window.confirm("선택한 전형 관리 항목을 삭제하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-recruitment-units/${unitId}`, {
          method: "DELETE",
        });

        if (state.applicantManager.recruitmentUnitEditor?.editingId === Number(unitId || 0)) {
          await requestCloseModal?.("applicantRecruitmentUnitModal");
        }

        await refreshApplicantBootstrap("전형 관리 항목을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "전형 관리 항목을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    async function deleteApplicantAssignment(assignmentId) {
      if (!window.confirm("선택한 배정표 행을 삭제하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-assignments/${assignmentId}`, {
          method: "DELETE",
        });

        if (state.applicantManager.assignmentEditor?.editingId === Number(assignmentId || 0)) {
          await requestCloseModal?.("applicantAssignmentModal");
        }

        await refreshApplicantBootstrap("배정표 행을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "배정표 행을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    async function deleteApplicantSubmission(submissionId) {
      const normalizedSubmissionId = Number(submissionId || 0);

      if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
        return;
      }

      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
      const targetSubmission = submissions.find((submission) => Number(submission?.id || 0) === normalizedSubmissionId) || null;
      const confirmationLines = [
        targetSubmission?.name
          ? `${targetSubmission.name} (${normalizedSubmissionId}) 접수를 취소하고 삭제하시겠습니까?`
          : `접수번호 ${normalizedSubmissionId} 접수를 취소하고 삭제하시겠습니까?`,
        "삭제된 접수 이력은 복구할 수 없습니다.",
      ];

      if (String(targetSubmission?.status || "").trim() === "promoted" || String(targetSubmission?.promotedExamineeNo || "").trim()) {
        confirmationLines.push("이관된 수험생 데이터와 사진도 함께 삭제됩니다.");
      }

      if (!window.confirm(confirmationLines.join("\n"))) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-submissions/${normalizedSubmissionId}`, {
          method: "DELETE",
        });

        if (Number(state.applicantManager?.expandedSubmissionId || 0) === normalizedSubmissionId) {
          resetApplicantSubmissionDetail({ render: false });
          await requestCloseModal?.("applicantSubmissionDetailModal");
        }

        const applicantHistoryTableState = state.tableSettings?.applicantHistoryGrid;

        if (applicantHistoryTableState && Array.isArray(applicantHistoryTableState.selectedRowIds)) {
          applicantHistoryTableState.selectedRowIds = applicantHistoryTableState.selectedRowIds.filter(
            (rowId) => String(rowId || "").trim() !== String(normalizedSubmissionId),
          );

          if (String(applicantHistoryTableState.selectionAnchorRowId || "").trim() === String(normalizedSubmissionId)) {
            applicantHistoryTableState.selectionAnchorRowId = "";
          }
        }

        await refreshApplicantBootstrap("접수 이력을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 이력을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    function openApplicantFieldPreview() {
      try {
        const previewUrl = new URL(buildApiUrl("/applicant/form"));
        previewUrl.searchParams.set("preview", "1");
        window.open(previewUrl.toString(), "_blank", "noopener,noreferrer");
      } catch (error) {
        showToast("미리보기 페이지를 열지 못했습니다.", "error", 3200);
      }
    }

    syncApplicantRecruitmentUnitUploadPreview();
    syncApplicantAssignmentUploadPreview();

    return Object.freeze({
      activateApplicantAssignmentCreation,
      activateApplicantRecruitmentUnitCreation,
      activateApplicantFieldCreation,
      addApplicantFieldOption,
      clearApplicantAssignmentUploadFiles,
      clearApplicantRecruitmentUnitUploadFiles,
      createEmptyApplicantAssignmentEditor,
      createEmptyApplicantRecruitmentUnitEditor,
      createEmptyApplicantScheduleEditor,
      createEmptyApplicantFieldEditor,
      deleteApplicantAssignment,
      deleteApplicantSubmission,
      deleteApplicantRecruitmentUnit,
      deleteApplicantField,
      downloadApplicantAssignmentTemplate,
      downloadApplicantAssignments,
      downloadApplicantPromotionPreview,
      downloadApplicantSubmissionPhotos,
      downloadApplicantSubmissions,
      downloadApplicantRecruitmentUnits,
      downloadApplicantRecruitmentUnitTemplate,
      moveApplicantField,
      openApplicantAssignmentManagementView,
      openApplicantPromotionModal,
      openApplicantFieldPreview,
      previewApplicantAssignmentUploadFile,
      previewApplicantRecruitmentUnitUploadFile,
      previewApplicantPromotionsAction,
      resetApplicantPromotionsAction,
      reorderApplicantField,
      resetApplicantAssignmentEditor,
      resetApplicantPromotionWorkflow,
      resetApplicantRecruitmentUnitEditor,
      resetApplicantScheduleEditor,
      resetApplicantFieldEditor,
      resetApplicantSubmissionDetail,
      removeApplicantFieldOption,
      saveApplicantAssignment,
      saveApplicantRecruitmentUnit,
      saveApplicantSchedule,
      saveApplicantFieldEditor,
      saveApplicantSettings,
      setApplicantSettingsSection,
      setApplicantManagerTab,
      startApplicantAssignmentEdit,
      startApplicantRecruitmentUnitEdit,
      startApplicantScheduleEdit,
      startApplicantFieldEdit,
      toggleApplicantSubmissionDetail,
      commitApplicantPromotionsAction,
      uploadApplicantAssignmentFile,
      uploadApplicantRecruitmentUnitFile,
      uploadApplicantSubmissionPhoto,
      updateApplicantAssignmentEditorField,
      updateApplicantPromotionField,
      updateApplicantAssignmentUploadExistingDataPolicy,
      updateApplicantScheduleEditorField,
      updateApplicantRecruitmentUnitUploadExistingDataPolicy,
      updateApplicantRecruitmentUnitEditorField,
      updateApplicantFieldEditorField,
      updateApplicantSettingsField,
    });
  }

  return Object.freeze({
    createApplicantAdminController,
    createEmptyApplicantAssignmentEditor,
    createEmptyApplicantRecruitmentUnitEditor,
    createEmptyApplicantScheduleEditor,
    createEmptyApplicantFieldEditor,
  });
});
