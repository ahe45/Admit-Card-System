(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardStateFactories = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createHeaderFilters(fields = []) {
    return (Array.isArray(fields) ? fields : []).reduce((filters, field) => {
      if (field?.key) {
        filters[field.key] = "";
      }
      return filters;
    }, {});
  }

  function createLookupFilters(selectFields = [], textFields = []) {
    return [...(Array.isArray(selectFields) ? selectFields : []), ...(Array.isArray(textFields) ? textFields : [])].reduce(
      (filters, field) => {
        if (field?.key) {
          filters[field.key] = "";
        }
        return filters;
      },
      {},
    );
  }

  function normalizeGridSortDirection(direction) {
    return direction === "desc" ? "desc" : "asc";
  }

  function normalizeGridSortRules(rawRules) {
    if (!Array.isArray(rawRules)) {
      return [];
    }

    const sortRules = [];

    rawRules.forEach((rule) => {
      const key = String(rule?.key || "").trim();

      if (!key || sortRules.some((entry) => entry.key === key)) {
        return;
      }

      sortRules.push({
        key,
        direction: normalizeGridSortDirection(rule?.direction),
      });
    });

    return sortRules;
  }

  function buildInitialGridSortRules(options = {}) {
    if (Array.isArray(options.defaultSortRules)) {
      return normalizeGridSortRules(options.defaultSortRules);
    }

    if (options.defaultSortKey) {
      return normalizeGridSortRules([
        {
          key: options.defaultSortKey,
          direction: options.defaultSortDirection,
        },
      ]);
    }

    return [];
  }

  function createTableState(options = {}) {
    const defaultSortRules = buildInitialGridSortRules(options);

    return {
      page: 1,
      pageSize: 20,
      pageSizeMenuOpen: false,
      defaultSortRules,
      sortRules: normalizeGridSortRules(defaultSortRules),
      filterMenuKey: "",
      filterMenuSearch: "",
      filters: {},
      selectedRowIds: [],
      selectionAnchorRowId: "",
    };
  }

  function createTemplateEditorState() {
    return {
      activeTemplateId: "",
      name: "",
      description: "",
      version: "",
      draftHtml: "",
      lastValidHtml: "",
      hasOverflow: false,
      savedRange: null,
      historyEntries: [],
      historyIndex: -1,
      isRestoringHistory: false,
      statusMessage: "A4 영역 안에서 편집 중입니다.",
      statusType: "",
      selectedImageElement: null,
      tableSelection: null,
      tableSelectionSession: null,
      tableResizeSession: null,
      imageMoveSession: null,
      imageResizeSession: null,
    };
  }

  function createTemplateCardEditorState() {
    return {
      activeTemplateId: "",
      field: "",
      draftValue: "",
      isSaving: false,
    };
  }

  function createTemplatePreviewState() {
    return {
      activeTemplateId: "",
      renderedHtml: "",
      examineeLabel: "",
      examineeNo: "",
    };
  }

  function createApplicantManagementState() {
    return {
      activeTab: "templates",
      settingsSection: "recruitment-units",
      expandedSubmissionId: 0,
      fields: [],
      recruitmentUnits: [],
      submissions: [],
      settings: {
        examNoPattern: "AD-{YY}{MM}{DD}-{SEQ:4}",
        examNoSequenceStart: 1,
      },
      fieldEditor: {
        isActive: false,
        isDraft: false,
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
      },
      recruitmentUnitEditor: {
        isActive: false,
        editingId: 0,
        admissionCode: "",
        admissionName: "",
        seriesCode: "",
        seriesName: "",
        unitCode: "",
        unitName: "",
        majorCode: "",
        majorName: "",
      },
    };
  }

  function createExamineeDetailState() {
    return {
      selectedExamineeNo: "",
      originalExamineeNo: "",
      baseRecord: null,
      draftRecord: null,
      isSaving: false,
      isPhotoUploading: false,
      statusMessage: "",
      statusType: "",
    };
  }

  function createAuthState() {
    return {
      status: "loading",
      currentUser: null,
      error: "",
      isSubmittingLogin: false,
      isSubmittingPasswordSetup: false,
      loginForm: {
        id: "",
        password: "",
      },
      passwordSetup: {
        password: "",
        passwordConfirm: "",
        error: "",
      },
    };
  }

  function normalizeSystemInitialPassword(value, defaultValue = "1111") {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || defaultValue;
  }

  function normalizeSystemAutoLogoutMinutes(value, { defaultValue = 0, maxValue = 1440 } = {}) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      return defaultValue;
    }

    return Math.min(maxValue, normalizedValue);
  }

  function normalizeSystemAdmissionHomepageUrl(value, { defaultValue = "" } = {}) {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || defaultValue;
  }

  function getValidSystemScheduleReferenceDate(referenceDate = new Date()) {
    if (referenceDate instanceof Date && Number.isFinite(referenceDate.getTime())) {
      return referenceDate;
    }

    const parsedDate = new Date(referenceDate);
    return Number.isFinite(parsedDate.getTime()) ? parsedDate : new Date();
  }

  function getSystemApplicantScheduleDefaultRange(referenceDate = new Date()) {
    const validReferenceDate = getValidSystemScheduleReferenceDate(referenceDate);
    const year = validReferenceDate.getFullYear();

    return {
      startAt: `${year}-01-01T00:00`,
      endAt: `${year}-12-31T23:59`,
    };
  }

  function normalizeSystemApplicantScheduleDateTime(value, { defaultValue = "" } = {}) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      return defaultValue;
    }

    const matchedValue = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

    if (!matchedValue) {
      return defaultValue;
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = matchedValue;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const hour = Number(hourValue);
    const minute = Number(minuteValue);
    const parsedDate = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() + 1 !== month ||
      parsedDate.getDate() !== day ||
      parsedDate.getHours() !== hour ||
      parsedDate.getMinutes() !== minute
    ) {
      return defaultValue;
    }

    return `${yearValue}-${monthValue}-${dayValue}T${hourValue}:${minuteValue}`;
  }

  function createEmptySystemApplicantScheduleParts() {
    return {
      year: "",
      month: "",
      day: "",
      hour: "",
      minute: "",
    };
  }

  function normalizeSystemApplicantScheduleParts(value, options = {}) {
    const normalizedValue = normalizeSystemApplicantScheduleDateTime(value, {
      defaultValue: options.defaultValue || "",
    });

    if (!normalizedValue) {
      return createEmptySystemApplicantScheduleParts();
    }

    const matchedValue = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

    if (!matchedValue) {
      return createEmptySystemApplicantScheduleParts();
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = matchedValue;

    return {
      year: yearValue,
      month: monthValue,
      day: dayValue,
      hour: hourValue,
      minute: minuteValue,
    };
  }

  function normalizeSystemApplicantExamNoDigitCount(value, { defaultValue = 10, maxValue = 30 } = {}) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
      return defaultValue;
    }

    return Math.min(maxValue, normalizedValue);
  }

  function normalizeSystemApplicantExamNoComponents(value, { defaultValue = ["admissionCode", "seriesCode", "unitCode", "sequence", ""] } = {}) {
    const sourceValues = Array.isArray(value) ? value : defaultValue;
    const allowedValues = new Set(["", "admissionCode", "seriesCode", "unitCode", "nationalityCode", "sequence"]);

    return Array.from({ length: 5 }, (_, index) => {
      const normalizedValue = String(sourceValues[index] ?? "").trim();
      return allowedValues.has(normalizedValue) ? normalizedValue : "";
    });
  }

  function normalizeSystemAdmitCardDataSource(value, { defaultValue = "examinee" } = {}) {
    const normalizedValue = String(value ?? "").trim();
    return ["submission", "examinee"].includes(normalizedValue) ? normalizedValue : defaultValue;
  }

  function normalizeSystemSettingsPayload(payload = {}, options = {}) {
    const defaultApplicantScheduleRange = getSystemApplicantScheduleDefaultRange(options.referenceDate);
    const defaultApplicantScheduleStartAt = normalizeSystemApplicantScheduleDateTime(options.defaultApplicantScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const defaultApplicantScheduleEndAt = normalizeSystemApplicantScheduleDateTime(options.defaultApplicantScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });
    const defaultAdmitCardLookupScheduleStartAt = normalizeSystemApplicantScheduleDateTime(options.defaultAdmitCardLookupScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const defaultAdmitCardLookupScheduleEndAt = normalizeSystemApplicantScheduleDateTime(options.defaultAdmitCardLookupScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });
    const applicantScheduleStartAt = normalizeSystemApplicantScheduleDateTime(payload.applicantScheduleStartAt, {
      defaultValue: defaultApplicantScheduleStartAt,
    });
    const applicantScheduleEndAt = normalizeSystemApplicantScheduleDateTime(payload.applicantScheduleEndAt, {
      defaultValue: defaultApplicantScheduleEndAt,
    });
    const admitCardLookupScheduleStartAt = normalizeSystemApplicantScheduleDateTime(payload.admitCardLookupScheduleStartAt, {
      defaultValue: defaultAdmitCardLookupScheduleStartAt,
    });
    const admitCardLookupScheduleEndAt = normalizeSystemApplicantScheduleDateTime(payload.admitCardLookupScheduleEndAt, {
      defaultValue: defaultAdmitCardLookupScheduleEndAt,
    });

    return {
      initialPassword: normalizeSystemInitialPassword(payload.initialPassword, options.defaultPassword),
      autoLogoutMinutes: String(
        normalizeSystemAutoLogoutMinutes(payload.autoLogoutMinutes, {
          defaultValue: options.defaultAutoLogoutMinutes,
          maxValue: options.maxAutoLogoutMinutes,
        }),
      ),
      admissionHomepageUrl: normalizeSystemAdmissionHomepageUrl(payload.admissionHomepageUrl, {
        defaultValue: options.defaultAdmissionHomepageUrl,
      }),
      applicantScheduleStartAt,
      applicantScheduleStartAtParts: normalizeSystemApplicantScheduleParts(applicantScheduleStartAt),
      applicantScheduleEndAt,
      applicantScheduleEndAtParts: normalizeSystemApplicantScheduleParts(applicantScheduleEndAt),
      admitCardLookupScheduleStartAt,
      admitCardLookupScheduleStartAtParts: normalizeSystemApplicantScheduleParts(admitCardLookupScheduleStartAt),
      admitCardLookupScheduleEndAt,
      admitCardLookupScheduleEndAtParts: normalizeSystemApplicantScheduleParts(admitCardLookupScheduleEndAt),
      admitCardDataSource: normalizeSystemAdmitCardDataSource(payload.admitCardDataSource, {
        defaultValue: options.defaultAdmitCardDataSource,
      }),
      applicantExamNoDigitCount: String(
        normalizeSystemApplicantExamNoDigitCount(payload.applicantExamNoDigitCount, {
          defaultValue: options.defaultApplicantExamNoDigitCount,
          maxValue: options.maxApplicantExamNoDigitCount,
        }),
      ),
      applicantExamNoComponents: normalizeSystemApplicantExamNoComponents(payload.applicantExamNoComponents, {
        defaultValue: options.defaultApplicantExamNoComponents,
      }),
    };
  }

  function createSystemSettingsState(payload = {}, options = {}) {
    return {
      ...normalizeSystemSettingsPayload(payload, options),
      applicantSchedulePopoverTarget: "",
      isSaving: false,
      statusMessage: "",
      statusType: "",
    };
  }

  function createSystemDataDeletionState() {
    return {
      isDeleting: false,
      activeScope: "",
      statusMessage: "",
      statusType: "",
    };
  }

  function createToastState() {
    return {
      visible: false,
      message: "",
      type: "success",
    };
  }

  function createUploadState() {
    return {
      isActive: false,
      activatedAt: 0,
      title: "수험생 데이터 업로드 중",
      message: "",
      progressMode: "hidden",
      progressValue: 0,
      progressLabel: "",
    };
  }

  function getDefaultLoginNoticeHtml(initialPassword = "1111") {
    return [
      '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">계정 안내</span></p>',
      "<p><strong>ID : 계정 관리에 등록된 계정 ID</strong></p>",
      `<p><strong>PW : ${initialPassword}(초기 비밀번호)</strong></p>`,
      "<p>최초 로그인 시 비밀번호를 변경해야 서비스를 사용할 수 있습니다.</p>",
    ].join("");
  }

  function getDefaultApplicantNoticeHtml() {
    return [
      '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">접수 안내</span></p>',
      "<p>이메일 인증 후 접수를 진행하고, 접수 완료 후 수험표를 열람하고 인쇄할 수 있습니다.</p>",
      "<p>관리자가 수험생 등록을 완료하기 전에는 수험표 PDF가 표시되지 않을 수 있습니다.</p>",
    ].join("");
  }

  function normalizeLoginNoticeHtml(html = "", { fallbackHtml = "" } = {}) {
    const normalizedHtml = String(html || "");
    const resolvedFallback = String(fallbackHtml || getDefaultLoginNoticeHtml()).trim() || getDefaultLoginNoticeHtml();
    return normalizedHtml.trim() ? normalizedHtml : resolvedFallback;
  }

  function createNoticeEditorState(initialHtml = "", { fallbackHtml = "", defaultHtml = "", statusLabel = "로그인화면" } = {}) {
    const resolvedDefaultHtml = String(defaultHtml || "").trim() || getDefaultLoginNoticeHtml();
    const storedHtml = normalizeLoginNoticeHtml(initialHtml || resolvedDefaultHtml, {
      fallbackHtml: fallbackHtml || resolvedDefaultHtml,
    });

    return {
      savedHtml: storedHtml,
      draftHtml: storedHtml,
      selectionSnapshot: null,
      historyEntries: [
        {
          html: storedHtml,
          selection: null,
        },
      ],
      historyIndex: 0,
      isRestoringHistory: false,
      statusMessage: `${String(statusLabel || "로그인화면")} 공지사항을 편집 중입니다.`,
      statusType: "",
    };
  }

  function createLoginNoticeState(initialHtml = "", { fallbackHtml = "", defaultHtml = "" } = {}) {
    return createNoticeEditorState(initialHtml, {
      fallbackHtml,
      defaultHtml: defaultHtml || getDefaultLoginNoticeHtml(),
      statusLabel: "로그인화면",
    });
  }

  function createApplicantNoticeState(initialHtml = "", { fallbackHtml = "", defaultHtml = "" } = {}) {
    return createNoticeEditorState(initialHtml, {
      fallbackHtml,
      defaultHtml: defaultHtml || getDefaultApplicantNoticeHtml(),
      statusLabel: "접수화면",
    });
  }

  function createBatchPrintState() {
    return {
      isLoading: false,
    };
  }

  function createPdfGenerationState() {
    return {
      isActive: false,
      message: "",
      progressMode: "hidden",
      progressValue: 0,
      progressLabel: "",
    };
  }

  function createAccountEditorState() {
    return {
      editingId: "",
      draftName: "",
      draftRole: "관리자",
    };
  }

  return {
    buildInitialGridSortRules,
    createAccountEditorState,
    createApplicantNoticeState,
    createApplicantManagementState,
    createAuthState,
    createBatchPrintState,
    createExamineeDetailState,
    createHeaderFilters,
    createLoginNoticeState,
    createLookupFilters,
    createPdfGenerationState,
    createSystemDataDeletionState,
    createSystemSettingsState,
    createTableState,
    createTemplateCardEditorState,
    createTemplateEditorState,
    createTemplatePreviewState,
    createToastState,
    createUploadState,
    getDefaultApplicantNoticeHtml,
    getDefaultLoginNoticeHtml,
    normalizeGridSortDirection,
    normalizeGridSortRules,
    normalizeLoginNoticeHtml,
    normalizeSystemAutoLogoutMinutes,
    normalizeSystemAdmissionHomepageUrl,
    normalizeSystemApplicantScheduleDateTime,
    normalizeSystemApplicantScheduleParts,
    normalizeSystemInitialPassword,
    normalizeSystemSettingsPayload,
  };
});
