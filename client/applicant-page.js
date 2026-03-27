(function () {
  const applicantFormConfig = globalThis.AdmitCardApplicantFormConfig || {};
  const root = document.getElementById("applicantPageRoot");

  if (!root) {
    return;
  }

  const APPLICANT_IS_PREVIEW_MODE = new URLSearchParams(window.location.search).get("preview") === "1";
  const APPLICANT_PREVIEW_SEARCH = APPLICANT_IS_PREVIEW_MODE ? "?preview=1" : "";
  const APPLICANT_PUBLIC_STATE_STORAGE_KEY = `admitcard.applicant-public-state.v1${APPLICANT_IS_PREVIEW_MODE ? ".preview" : ""}`;
  const APPLICANT_ROUTE_PATHS = Object.freeze({
    home: "/applicant",
    verify: "/applicant/verify",
    apply: "/applicant/apply",
    form: "/applicant/form",
    result: "/applicant/result",
    lookup: "/applicant/lookup",
    "lookup-summary": "/applicant/lookup/result",
    "lookup-ticket": "/applicant/ticket",
  });
  const APPLICANT_PAGE_TITLES = Object.freeze({
    home: "수험생 접수",
    verify: "이메일 인증",
    apply: "접수 신청",
    form: "접수 페이지",
    result: "접수 결과",
    lookup: "본인 확인",
    "lookup-summary": "접수결과 조회",
    "lookup-ticket": "수험표 조회",
  });
  const APPLICANT_LOOKUP_TARGETS = Object.freeze({
    result: "result",
    ticket: "ticket",
  });
  const APPLICANT_CUSTOM_SELECT_VALUE = "__applicant_custom__";
  const APPLICANT_RECRUITMENT_SELECTION_FIELDS = Object.freeze([
    Object.freeze({ key: "admission", unitKey: "admissionName", label: "전형" }),
    Object.freeze({ key: "series", unitKey: "seriesName", label: "계열" }),
    Object.freeze({ key: "unit", unitKey: "unitName", label: "모집단위" }),
    Object.freeze({ key: "major", unitKey: "majorName", label: "전공" }),
  ]);
  const APPLICANT_SUMMARY_PRIORITY_SYSTEM_FIELDS = Object.freeze(["admission", "series", "unit", "major"]);
  let verificationCountdownTimerId = 0;
  let applicantToastTimerId = 0;
  const applicantToastRoot =
    document.getElementById("applicantPublicToastRoot") ||
    (() => {
      const toastElement = document.createElement("div");
      toastElement.id = "applicantPublicToastRoot";
      toastElement.className = "applicant-public-toast-root";
      toastElement.setAttribute("aria-live", "polite");
      toastElement.setAttribute("aria-atomic", "true");
      document.body.appendChild(toastElement);
      return toastElement;
    })();

  const state = {
    mode: "home",
    isLoadingForm: true,
    loadError: "",
    formConfig: {
      fields: [],
      recruitmentUnits: [],
      settings: {},
      systemSettings: {
        admissionHomepageUrl: "",
        applicantScheduleStartAt: `${new Date().getFullYear()}-01-01T00:00`,
        applicantScheduleEndAt: `${new Date().getFullYear()}-12-31T23:59`,
        admitCardLookupScheduleStartAt: `${new Date().getFullYear()}-01-01T00:00`,
        admitCardLookupScheduleEndAt: `${new Date().getFullYear()}-12-31T23:59`,
        admitCardDataSource: "examinee",
      },
      noticeHtml: "",
    },
    message: {
      type: "",
      text: "",
    },
    verification: {
      name: "",
      email: "",
      code: "",
      debugCode: "",
      expiresAt: 0,
      isSending: false,
      isVerifying: false,
    },
    lookup: {
      target: APPLICANT_LOOKUP_TARGETS.result,
      name: "",
      email: "",
      password: "",
      isLoading: false,
    },
    identity: {
      name: "",
      email: "",
      accessToken: "",
      submissionId: 0,
      source: "",
    },
    recruitment: {
      admission: "",
      series: "",
      unit: "",
      major: "",
    },
    application: {
      password: "",
      passwordConfirm: "",
      passwordConfirmTouched: false,
    },
    nationalityPicker: {
      openFieldKey: "",
    },
    fieldUi: {
      dateParts: {},
      customSelectModes: {},
    },
    currentSubmission: null,
    draftAnswers: {},
    isSaving: false,
  };

  function normalizeApplicantLookupTarget(value = "") {
    return String(value || "").trim() === APPLICANT_LOOKUP_TARGETS.ticket
      ? APPLICANT_LOOKUP_TARGETS.ticket
      : APPLICANT_LOOKUP_TARGETS.result;
  }

  function getApplicantLookupResultMode(target = state.lookup.target) {
    return normalizeApplicantLookupTarget(target) === APPLICANT_LOOKUP_TARGETS.ticket ? "lookup-ticket" : "lookup-summary";
  }

  function syncApplicantLookupTargetWithMode(mode = "") {
    if (mode === "lookup-ticket") {
      state.lookup.target = APPLICANT_LOOKUP_TARGETS.ticket;
      return;
    }

    if (mode === "lookup-summary") {
      state.lookup.target = APPLICANT_LOOKUP_TARGETS.result;
    }
  }

  function getApplicantLookupScreenCopy(target = state.lookup.target) {
    const normalizedTarget = normalizeApplicantLookupTarget(target);

    if (normalizedTarget === APPLICANT_LOOKUP_TARGETS.ticket) {
      return {
        heading: "수험표 조회",
        description: "이름, 이메일, 비밀번호를 입력하면 일치하는 최신 접수 내역 기준으로 수험표를 조회합니다.",
      };
    }

    return {
      heading: "접수결과 조회",
      description: "이름, 이메일, 비밀번호를 입력하면 일치하는 최신 접수 내역의 접수 결과를 조회합니다.",
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function getApplicantHomeActionIconMarkup(iconKey = "") {
    if (iconKey === "apply") {
      return `
        <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2"></rect>
          <path d="M9 4h6"></path>
          <path d="M9 9h6"></path>
          <path d="M12 12v5"></path>
          <path d="M9.5 14.5h5"></path>
        </svg>
      `;
    }

    if (iconKey === "summary") {
      return `
        <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2"></rect>
          <path d="M9 9h6"></path>
          <path d="M9 13h3"></path>
          <path d="m10 16 1.8 1.8 3.2-3.3"></path>
        </svg>
      `;
    }

    return `
      <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 9a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 0 6.5 17h11a1.5 1.5 0 0 0 1.5-1.5V13a2 2 0 0 0 0-4V8.5A1.5 1.5 0 0 0 17.5 7h-11A1.5 1.5 0 0 0 5 8.5z"></path>
        <path d="M12 7v10"></path>
        <path d="M9 10h6"></path>
      </svg>
    `;
  }

  function renderApplicantHomeActionButtonLabel(label = "", iconKey = "") {
    return `${getApplicantHomeActionIconMarkup(iconKey)}<span>${escapeHtml(label)}</span>`;
  }

  function stopVerificationCountdown() {
    if (verificationCountdownTimerId) {
      window.clearInterval(verificationCountdownTimerId);
      verificationCountdownTimerId = 0;
    }
  }

  function getVerificationRemainingSeconds() {
    const expiresAt = Number(state.verification.expiresAt || 0);

    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
      return 0;
    }

    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  function isVerificationCodeExpired() {
    return getVerificationRemainingSeconds() <= 0;
  }

  function formatVerificationCountdown(seconds = 0) {
    const normalizedSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(normalizedSeconds / 60);
    const remainingSeconds = normalizedSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function getVerificationCountdownUiState() {
    const expiresAt = Number(state.verification.expiresAt || 0);
    const remainingSeconds = getVerificationRemainingSeconds();

    if (expiresAt <= 0) {
      return {
        shouldShow: false,
        isExpired: false,
        text: "",
      };
    }

    if (remainingSeconds > 0) {
      return {
        shouldShow: true,
        isExpired: false,
        text: `인증코드 만료까지 ${formatVerificationCountdown(remainingSeconds)}`,
      };
    }

    return {
      shouldShow: true,
      isExpired: true,
      text: "인증 코드가 만료되었습니다. 새 코드를 다시 발송하세요.",
    };
  }

  function renderVerificationCountdownMarkup() {
    const countdownState = getVerificationCountdownUiState();

    if (!countdownState.shouldShow) {
      return "";
    }

    return `<span class="applicant-public-verification-timer${countdownState.isExpired ? " is-expired" : ""}" data-applicant-verification-timer="true">${escapeHtml(countdownState.text)}</span>`;
  }

  function syncVerificationCountdownUi() {
    const verificationCodeInput = document.getElementById("verificationCode");
    const verificationField = verificationCodeInput?.closest(".applicant-public-field") || null;
    const existingTimerElement = verificationField?.querySelector("[data-applicant-verification-timer='true']") || null;
    const countdownState = getVerificationCountdownUiState();

    if (!verificationField || state.mode !== "verify") {
      existingTimerElement?.remove();
      return;
    }

    if (!countdownState.shouldShow) {
      existingTimerElement?.remove();
      return;
    }

    if (existingTimerElement) {
      existingTimerElement.textContent = countdownState.text;
      existingTimerElement.classList.toggle("is-expired", countdownState.isExpired);
      return;
    }

    const timerElement = document.createElement("span");
    const debugCodeNote = verificationField.querySelector(".applicant-public-file-note");

    timerElement.dataset.applicantVerificationTimer = "true";
    timerElement.className = `applicant-public-verification-timer${countdownState.isExpired ? " is-expired" : ""}`;
    timerElement.textContent = countdownState.text;

    if (debugCodeNote) {
      verificationField.insertBefore(timerElement, debugCodeNote);
      return;
    }

    verificationField.appendChild(timerElement);
  }

  function syncVerificationCountdown() {
    const shouldRun = state.mode === "verify" && Number(state.verification.expiresAt || 0) > 0 && !isVerificationCodeExpired();

    if (!shouldRun) {
      stopVerificationCountdown();
      syncVerificationCountdownUi();
      return;
    }

    if (verificationCountdownTimerId) {
      syncVerificationCountdownUi();
      return;
    }

    syncVerificationCountdownUi();
    verificationCountdownTimerId = window.setInterval(() => {
      if (state.mode !== "verify") {
        stopVerificationCountdown();
        return;
      }

      syncVerificationCountdownUi();

      if (isVerificationCodeExpired()) {
        stopVerificationCountdown();
      }
    }, 1000);
  }

  function normalizeApplicantRoutePath(pathname = "") {
    return `/${String(pathname || "/applicant").trim()}`
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/g, "") || APPLICANT_ROUTE_PATHS.home;
  }

  function getApplicantModeFromPathname(pathname = "") {
    const normalizedPathname = normalizeApplicantRoutePath(pathname);
    const matchedRouteEntry =
      Object.entries(APPLICANT_ROUTE_PATHS).find(([, routePath]) => routePath === normalizedPathname) || null;

    return matchedRouteEntry?.[0] || "home";
  }

  function getApplicantRoutePath(mode = "") {
    return APPLICANT_ROUTE_PATHS[String(mode || "").trim()] || APPLICANT_ROUTE_PATHS.home;
  }

  function updateApplicantDocumentTitle() {
    const pageTitle = APPLICANT_PAGE_TITLES[state.mode] || APPLICANT_PAGE_TITLES.home;
    document.title = `${pageTitle} | Admit Card System`;
  }

  function buildApiUrl(resource) {
    return new URL(resource, `${window.location.origin}/`).toString();
  }

  async function apiRequest(resource, options = {}) {
    const response = await fetch(buildApiUrl(resource), {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(payload?.error || payload || "요청 처리 중 오류가 발생했습니다.");
      error.status = response.status;
      error.code = payload?.code || "";
      throw error;
    }

    return payload;
  }

  function createSerializableDraftAnswers() {
    return Object.fromEntries(
      Object.entries(state.draftAnswers || {}).map(([fieldKey, value]) => {
        if (value && typeof value === "object") {
          return [
            fieldKey,
            {
              hasPhoto: value?.hasPhoto === true || value?.file instanceof File,
              fileName: String(value?.fileName || value?.file?.name || ""),
            },
          ];
        }

        return [fieldKey, value];
      }),
    );
  }

  function createSerializableApplicantFieldUi() {
    const rawDateParts = state.fieldUi?.dateParts && typeof state.fieldUi.dateParts === "object" ? state.fieldUi.dateParts : {};
    const rawCustomSelectModes =
      state.fieldUi?.customSelectModes && typeof state.fieldUi.customSelectModes === "object" ? state.fieldUi.customSelectModes : {};

    return {
      dateParts: Object.fromEntries(
        Object.entries(rawDateParts).map(([fieldKey, value]) => [
          fieldKey,
          {
            year: String(value?.year || ""),
            month: String(value?.month || ""),
            day: String(value?.day || ""),
          },
        ]),
      ),
      customSelectModes: Object.fromEntries(
        Object.entries(rawCustomSelectModes).map(([fieldKey, value]) => [fieldKey, value === true]),
      ),
    };
  }

  function persistApplicantPublicState() {
    try {
      window.sessionStorage.setItem(
        APPLICANT_PUBLIC_STATE_STORAGE_KEY,
        JSON.stringify({
          verification: {
            name: state.verification.name,
            email: state.verification.email,
            code: state.verification.code,
            debugCode: state.verification.debugCode,
            expiresAt: Number(state.verification.expiresAt || 0),
          },
          lookup: {
            target: normalizeApplicantLookupTarget(state.lookup.target),
            name: state.lookup.name,
            email: state.lookup.email,
          },
          identity: {
            name: state.identity.name,
            email: state.identity.email,
            accessToken: state.identity.accessToken,
            submissionId: state.identity.submissionId,
            source: state.identity.source,
          },
          recruitment: {
            admission: String(state.recruitment.admission || ""),
            series: String(state.recruitment.series || ""),
            unit: String(state.recruitment.unit || ""),
            major: String(state.recruitment.major || ""),
          },
          currentSubmission: state.currentSubmission,
          draftAnswers: createSerializableDraftAnswers(),
          fieldUi: createSerializableApplicantFieldUi(),
        }),
      );
    } catch (error) {
      // Ignore storage errors in private browsing or restricted contexts.
    }
  }

  function restoreApplicantPublicState() {
    try {
      const rawSnapshot = window.sessionStorage.getItem(APPLICANT_PUBLIC_STATE_STORAGE_KEY);

      if (!rawSnapshot) {
        return;
      }

      const snapshot = JSON.parse(rawSnapshot);

      if (snapshot?.verification && typeof snapshot.verification === "object") {
        state.verification = {
          ...state.verification,
          name: String(snapshot.verification.name || ""),
          email: String(snapshot.verification.email || ""),
          code: String(snapshot.verification.code || ""),
          debugCode: String(snapshot.verification.debugCode || ""),
          expiresAt: Number(snapshot.verification.expiresAt || 0),
          isSending: false,
          isVerifying: false,
        };
      }

      if (snapshot?.lookup && typeof snapshot.lookup === "object") {
        state.lookup = {
          ...state.lookup,
          target: normalizeApplicantLookupTarget(snapshot.lookup.target),
          name: String(snapshot.lookup.name || ""),
          email: String(snapshot.lookup.email || ""),
          password: "",
          isLoading: false,
        };
      }

      if (snapshot?.identity && typeof snapshot.identity === "object") {
        state.identity = {
          name: String(snapshot.identity.name || ""),
          email: String(snapshot.identity.email || ""),
          accessToken: String(snapshot.identity.accessToken || ""),
          submissionId: Number(snapshot.identity.submissionId || 0),
          source: String(snapshot.identity.source || ""),
        };
      }

      if (snapshot?.recruitment && typeof snapshot.recruitment === "object") {
        state.recruitment = {
          admission: String(snapshot.recruitment.admission || ""),
          series: String(snapshot.recruitment.series || ""),
          unit: String(snapshot.recruitment.unit || ""),
          major: String(snapshot.recruitment.major || ""),
        };
      }

      if (snapshot?.currentSubmission && typeof snapshot.currentSubmission === "object") {
        state.currentSubmission = snapshot.currentSubmission;
      }

      if (snapshot?.draftAnswers && typeof snapshot.draftAnswers === "object") {
        state.draftAnswers = snapshot.draftAnswers;
      }

      if (snapshot?.fieldUi && typeof snapshot.fieldUi === "object") {
        state.fieldUi = {
          dateParts:
            snapshot.fieldUi.dateParts && typeof snapshot.fieldUi.dateParts === "object"
              ? snapshot.fieldUi.dateParts
              : {},
          customSelectModes:
            snapshot.fieldUi.customSelectModes && typeof snapshot.fieldUi.customSelectModes === "object"
              ? snapshot.fieldUi.customSelectModes
              : {},
        };
      }
    } catch (error) {
      // Ignore invalid storage payloads and continue with a clean state.
    }
  }

  function canAccessApplicantForm() {
    return APPLICANT_IS_PREVIEW_MODE || Boolean(state.identity.accessToken && state.identity.email);
  }

  function canAccessApplicantSelection() {
    return canAccessApplicantForm();
  }

  function hasApplicantFormConfigured() {
    return Array.isArray(state.formConfig.fields) && state.formConfig.fields.length > 0;
  }

  function getValidApplicantScheduleReferenceDate(referenceDate = new Date()) {
    if (referenceDate instanceof Date && Number.isFinite(referenceDate.getTime())) {
      return referenceDate;
    }

    const parsedDate = new Date(referenceDate);
    return Number.isFinite(parsedDate.getTime()) ? parsedDate : new Date();
  }

  function getDefaultApplicantScheduleRange(referenceDate = new Date()) {
    const validReferenceDate = getValidApplicantScheduleReferenceDate(referenceDate);
    const year = validReferenceDate.getFullYear();

    return {
      startAt: `${year}-01-01T00:00`,
      endAt: `${year}-12-31T23:59`,
    };
  }

  function normalizeApplicantScheduleDateTime(value, { defaultValue = "" } = {}) {
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

  function getApplicantScheduleDate(value, { inclusiveEndMinute = false } = {}) {
    const normalizedValue = normalizeApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return null;
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/) || [];
    const parsedDate = new Date(
      Number(yearValue),
      Number(monthValue) - 1,
      Number(dayValue),
      Number(hourValue),
      Number(minuteValue),
      inclusiveEndMinute ? 59 : 0,
      inclusiveEndMinute ? 999 : 0,
    );

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  function formatApplicantScheduleDateTime(value) {
    const normalizedValue = normalizeApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return "";
    }

    const [dateValue, timeValue] = normalizedValue.split("T");
    return `${String(dateValue || "").replaceAll("-", ".")} ${String(timeValue || "")}`;
  }

  function getApplicantSubmissionScheduleState(referenceDate = new Date()) {
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange(referenceDate);
    const applicantScheduleStartAt = normalizeApplicantScheduleDateTime(state.formConfig.systemSettings?.applicantScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const applicantScheduleEndAt = normalizeApplicantScheduleDateTime(state.formConfig.systemSettings?.applicantScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });

    const currentTimestamp = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const applicantScheduleStartDate = getApplicantScheduleDate(applicantScheduleStartAt);
    const applicantScheduleEndDate = getApplicantScheduleDate(applicantScheduleEndAt, {
      inclusiveEndMinute: true,
    });

    if (!Number.isFinite(currentTimestamp) || !applicantScheduleStartDate || !applicantScheduleEndDate) {
      return {
        applicantScheduleStartAt,
        applicantScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "invalid",
      };
    }

    if (currentTimestamp < applicantScheduleStartDate.getTime()) {
      return {
        applicantScheduleStartAt,
        applicantScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "before_start",
      };
    }

    if (currentTimestamp > applicantScheduleEndDate.getTime()) {
      return {
        applicantScheduleStartAt,
        applicantScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "after_end",
      };
    }

    return {
      applicantScheduleStartAt,
      applicantScheduleEndAt,
      isConfigured: true,
      isOpen: true,
      reason: "open",
    };
  }

  function getApplicantSubmissionSchedulePeriodLabel(scheduleState = getApplicantSubmissionScheduleState()) {
    if (!scheduleState.isConfigured || !scheduleState.applicantScheduleStartAt || !scheduleState.applicantScheduleEndAt) {
      return "";
    }

    return `${formatApplicantScheduleDateTime(scheduleState.applicantScheduleStartAt)} ~ ${formatApplicantScheduleDateTime(scheduleState.applicantScheduleEndAt)}`;
  }

  function getApplicantSubmissionScheduleStatusMessage(scheduleState = getApplicantSubmissionScheduleState()) {
    if (!scheduleState.isConfigured) {
      return "";
    }

    if (scheduleState.reason === "before_start") {
      return "아직 접수 시작 전입니다.";
    }

    if (scheduleState.reason === "after_end") {
      return "접수 기간이 종료되었습니다.";
    }

    return "현재 접수 가능합니다.";
  }

  function getApplicantLookupScheduleState(referenceDate = new Date()) {
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange(referenceDate);
    const admitCardLookupScheduleStartAt = normalizeApplicantScheduleDateTime(state.formConfig.systemSettings?.admitCardLookupScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const admitCardLookupScheduleEndAt = normalizeApplicantScheduleDateTime(state.formConfig.systemSettings?.admitCardLookupScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });

    const currentTimestamp = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const admitCardLookupScheduleStartDate = getApplicantScheduleDate(admitCardLookupScheduleStartAt);
    const admitCardLookupScheduleEndDate = getApplicantScheduleDate(admitCardLookupScheduleEndAt, {
      inclusiveEndMinute: true,
    });

    if (!Number.isFinite(currentTimestamp) || !admitCardLookupScheduleStartDate || !admitCardLookupScheduleEndDate) {
      return {
        admitCardLookupScheduleStartAt,
        admitCardLookupScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "invalid",
      };
    }

    if (currentTimestamp < admitCardLookupScheduleStartDate.getTime()) {
      return {
        admitCardLookupScheduleStartAt,
        admitCardLookupScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "before_start",
      };
    }

    if (currentTimestamp > admitCardLookupScheduleEndDate.getTime()) {
      return {
        admitCardLookupScheduleStartAt,
        admitCardLookupScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "after_end",
      };
    }

    return {
      admitCardLookupScheduleStartAt,
      admitCardLookupScheduleEndAt,
      isConfigured: true,
      isOpen: true,
      reason: "open",
    };
  }

  function getApplicantLookupSchedulePeriodLabel(scheduleState = getApplicantLookupScheduleState()) {
    if (!scheduleState.isConfigured || !scheduleState.admitCardLookupScheduleStartAt || !scheduleState.admitCardLookupScheduleEndAt) {
      return "";
    }

    return `${formatApplicantScheduleDateTime(scheduleState.admitCardLookupScheduleStartAt)} ~ ${formatApplicantScheduleDateTime(scheduleState.admitCardLookupScheduleEndAt)}`;
  }

  function getApplicantLookupScheduleStatusMessage(scheduleState = getApplicantLookupScheduleState()) {
    if (!scheduleState.isConfigured) {
      return "";
    }

    if (scheduleState.reason === "before_start") {
      return "아직 수험표 조회 시작 전입니다.";
    }

    if (scheduleState.reason === "after_end") {
      return "수험표 조회 기간이 종료되었습니다.";
    }

    return "현재 수험표 조회 가능합니다.";
  }

  function getApplicantApplyAvailabilityState() {
    const scheduleState = getApplicantSubmissionScheduleState();
    const isFormConfigured = hasApplicantFormConfigured();
    const isAvailable =
      !state.isLoadingForm &&
      !state.loadError &&
      isFormConfigured &&
      scheduleState.isOpen;

    return {
      isAvailable,
      isFormConfigured,
      scheduleState,
    };
  }

  function getApplicantLookupAvailabilityState() {
    const scheduleState = getApplicantLookupScheduleState();
    const isAvailable = !state.loadError && scheduleState.isOpen;

    return {
      isAvailable,
      scheduleState,
    };
  }

  function getApplicantResultLookupAvailabilityState() {
    return {
      isAvailable: true,
      reason: "open",
    };
  }

  function getApplicantApplyDisabledMessage(applyAvailabilityState = getApplicantApplyAvailabilityState()) {
    if (state.isLoadingForm) {
      return "접수 양식을 불러오는 중입니다.";
    }

    if (state.loadError) {
      return state.loadError || "접수 페이지를 준비하지 못했습니다.";
    }

    if (!applyAvailabilityState.isFormConfigured) {
      return "접수 양식이 아직 설정되지 않았습니다.";
    }

    if (applyAvailabilityState.scheduleState.reason === "before_start") {
      const periodLabel = getApplicantSubmissionSchedulePeriodLabel(applyAvailabilityState.scheduleState);
      return `아직 접수 기간이 아닙니다.${periodLabel ? ` 접수 가능 기간: ${periodLabel}` : ""}`;
    }

    if (applyAvailabilityState.scheduleState.reason === "after_end") {
      const periodLabel = getApplicantSubmissionSchedulePeriodLabel(applyAvailabilityState.scheduleState);
      return `접수 기간이 종료되었습니다.${periodLabel ? ` 접수 가능 기간: ${periodLabel}` : ""}`;
    }

    return "현재는 접수를 진행할 수 없습니다.";
  }

  function getApplicantLookupDisabledMessage(lookupAvailabilityState = getApplicantLookupAvailabilityState()) {
    if (state.isLoadingForm) {
      return "수험표 조회 페이지를 준비하는 중입니다.";
    }

    if (state.loadError) {
      return state.loadError || "수험표 조회 페이지를 준비하지 못했습니다.";
    }

    if (lookupAvailabilityState.scheduleState.reason === "before_start") {
      const periodLabel = getApplicantLookupSchedulePeriodLabel(lookupAvailabilityState.scheduleState);
      return `아직 수험표 조회 기간이 아닙니다.${periodLabel ? ` 조회 가능 기간: ${periodLabel}` : ""}`;
    }

    if (lookupAvailabilityState.scheduleState.reason === "after_end") {
      const periodLabel = getApplicantLookupSchedulePeriodLabel(lookupAvailabilityState.scheduleState);
      return `수험표 조회 기간이 종료되었습니다.${periodLabel ? ` 조회 가능 기간: ${periodLabel}` : ""}`;
    }

    return "현재는 수험표 조회를 진행할 수 없습니다.";
  }

  function getApplicantLookupActionAvailabilityState(target = state.lookup.target) {
    return normalizeApplicantLookupTarget(target) === APPLICANT_LOOKUP_TARGETS.ticket
      ? getApplicantLookupAvailabilityState()
      : getApplicantResultLookupAvailabilityState();
  }

  function getApplicantLookupActionDisabledMessage(target = state.lookup.target, lookupAvailabilityState = getApplicantLookupActionAvailabilityState(target)) {
    return normalizeApplicantLookupTarget(target) === APPLICANT_LOOKUP_TARGETS.ticket
      ? getApplicantLookupDisabledMessage(lookupAvailabilityState)
      : "";
  }

  function canEnterApplicantVerification() {
    return APPLICANT_IS_PREVIEW_MODE || getApplicantApplyAvailabilityState().isAvailable;
  }

  function getApplicantRecruitmentUnits() {
    return Array.isArray(state.formConfig.recruitmentUnits) ? state.formConfig.recruitmentUnits : [];
  }

  function getApplicantRecruitmentSelectionOptions(fieldKey = "", selection = state.recruitment) {
    const definition = APPLICANT_RECRUITMENT_SELECTION_FIELDS.find((field) => field.key === String(fieldKey || "").trim()) || null;

    if (!definition) {
      return [];
    }

    let filteredUnits = getApplicantRecruitmentUnits();
    const definitionIndex = APPLICANT_RECRUITMENT_SELECTION_FIELDS.findIndex((field) => field.key === definition.key);

    for (let index = 0; index < definitionIndex; index += 1) {
      const priorDefinition = APPLICANT_RECRUITMENT_SELECTION_FIELDS[index];
      const selectedValue = String(selection?.[priorDefinition.key] || "").trim();

      if (!selectedValue) {
        continue;
      }

      filteredUnits = filteredUnits.filter((unit) => String(unit?.[priorDefinition.unitKey] || "").trim() === selectedValue);
    }

    return Array.from(
      new Set(
        filteredUnits
          .map((unit) => String(unit?.[definition.unitKey] || "").trim())
          .filter(Boolean),
      ),
    );
  }

  function getApplicantRecruitmentSelectionIndex(fieldKey = "") {
    return APPLICANT_RECRUITMENT_SELECTION_FIELDS.findIndex((field) => field.key === String(fieldKey || "").trim());
  }

  function hasApplicantRecruitmentSelectionPrerequisites(fieldKey = "", selection = state.recruitment) {
    const definitionIndex = getApplicantRecruitmentSelectionIndex(fieldKey);

    if (definitionIndex <= 0) {
      return true;
    }

    for (let index = 0; index < definitionIndex; index += 1) {
      const previousDefinition = APPLICANT_RECRUITMENT_SELECTION_FIELDS[index];
      const previousOptions = getApplicantRecruitmentSelectionOptions(previousDefinition.key, {});

      if (previousOptions.length === 0) {
        continue;
      }

      const selectedValue = String(selection?.[previousDefinition.key] || "").trim();

      if (!selectedValue) {
        return false;
      }
    }

    return true;
  }

  function hasApplicantRecruitmentSelectionStep() {
    if (getApplicantRecruitmentUnits().length === 0) {
      return false;
    }

    return APPLICANT_RECRUITMENT_SELECTION_FIELDS.some(
      (definition) => getApplicantRecruitmentSelectionOptions(definition.key).length > 0,
    );
  }

  function hasCompletedApplicantRecruitmentSelection() {
    if (!hasApplicantRecruitmentSelectionStep()) {
      return true;
    }

    return APPLICANT_RECRUITMENT_SELECTION_FIELDS.every((definition) => {
      const options = getApplicantRecruitmentSelectionOptions(definition.key, state.recruitment);

      if (options.length === 0) {
        return true;
      }

      const selectedValue = String(state.recruitment?.[definition.key] || "").trim();
      return Boolean(selectedValue && options.includes(selectedValue));
    });
  }

  function syncApplicantRecruitmentSelection({ preserveExisting = true } = {}) {
    const nextSelection = {
      admission: "",
      series: "",
      unit: "",
      major: "",
    };

    APPLICANT_RECRUITMENT_SELECTION_FIELDS.forEach((definition) => {
      const globalOptions = getApplicantRecruitmentSelectionOptions(definition.key, {});

      if (globalOptions.length === 0 || !hasApplicantRecruitmentSelectionPrerequisites(definition.key, nextSelection)) {
        nextSelection[definition.key] = "";
        return;
      }

      const options = getApplicantRecruitmentSelectionOptions(definition.key, nextSelection);
      const previousValue = preserveExisting ? String(state.recruitment?.[definition.key] || "").trim() : "";

      if (previousValue && options.includes(previousValue)) {
        nextSelection[definition.key] = previousValue;
        return;
      }

      nextSelection[definition.key] = options.length === 1 ? options[0] : "";
    });

    state.recruitment = nextSelection;
  }

  function getApplicantRecruitmentSelectionFromSubmission(submission = null) {
    const nextSelection = {
      admission: "",
      series: "",
      unit: "",
      major: "",
    };
    const answerItems = Array.isArray(submission?.answerItems) ? submission.answerItems : [];

    answerItems.forEach((answerItem) => {
      const systemFieldKey = String(answerItem?.systemFieldKey || "").trim();
      const value = String(answerItem?.value || "").trim();

      if (!value) {
        return;
      }

      if (systemFieldKey === "admission") {
        nextSelection.admission = value;
      }

      if (systemFieldKey === "series") {
        nextSelection.series = value;
      }

      if (systemFieldKey === "unit") {
        nextSelection.unit = value;
      }

      if (systemFieldKey === "major") {
        nextSelection.major = value;
      }
    });

    return nextSelection;
  }

  function syncApplicantRecruitmentSelectionIntoDraftAnswers() {
    const fields = Array.isArray(state.formConfig.fields) ? state.formConfig.fields : [];

    fields.forEach((field) => {
      if (field.systemFieldKey === "admission") {
        state.draftAnswers[field.fieldKey] = state.recruitment.admission || "";
      }

      if (field.systemFieldKey === "series") {
        state.draftAnswers[field.fieldKey] = state.recruitment.series || "";
      }

      if (field.systemFieldKey === "unit") {
        state.draftAnswers[field.fieldKey] = state.recruitment.unit || "";
      }

      if (field.systemFieldKey === "major") {
        state.draftAnswers[field.fieldKey] = state.recruitment.major || "";
      }
    });
  }

  function canAccessApplicantResult() {
    return canAccessApplicantForm() && state.currentSubmission;
  }

  function canEnterApplicantLookup() {
    return getApplicantLookupActionAvailabilityState().isAvailable;
  }

  function canAccessApplicantLookupSummaryResult() {
    return Boolean(state.identity.source === "lookup" && state.identity.accessToken && state.currentSubmission?.id);
  }

  function canAccessApplicantLookupTicketResult() {
    return Boolean(
      state.identity.source === "lookup" &&
      state.identity.accessToken &&
      state.currentSubmission?.id &&
      normalizeApplicantLookupTarget(state.lookup.target) === APPLICANT_LOOKUP_TARGETS.ticket &&
      getApplicantLookupAvailabilityState().isAvailable,
    );
  }

  function getGuardedApplicantMode(requestedMode = "") {
    const normalizedMode = String(requestedMode || "").trim();

    if (normalizedMode === "verify") {
      return canEnterApplicantVerification() ? "verify" : "home";
    }

    if (normalizedMode === "apply") {
      if (APPLICANT_IS_PREVIEW_MODE) {
        return "form";
      }

      return canAccessApplicantSelection() ? (hasApplicantRecruitmentSelectionStep() ? "apply" : "form") : "home";
    }

    if (normalizedMode === "form") {
      if (!canAccessApplicantForm()) {
        return "home";
      }

      if (APPLICANT_IS_PREVIEW_MODE) {
        return "form";
      }

      if (hasApplicantRecruitmentSelectionStep() && !hasCompletedApplicantRecruitmentSelection()) {
        return "apply";
      }

      return "form";
    }

    if (normalizedMode === "result") {
      return canAccessApplicantResult() ? "result" : "home";
    }

    if (normalizedMode === "lookup") {
      return canEnterApplicantLookup() ? "lookup" : "home";
    }

    if (normalizedMode === "lookup-summary") {
      return canAccessApplicantLookupSummaryResult() ? "lookup-summary" : "home";
    }

    if (normalizedMode === "lookup-ticket") {
      return canAccessApplicantLookupTicketResult() ? "lookup-ticket" : "home";
    }

    return APPLICANT_ROUTE_PATHS[normalizedMode] ? normalizedMode : "home";
  }

  function syncApplicantRoute({ replace = false } = {}) {
    state.mode = getGuardedApplicantMode(state.mode);
    syncApplicantLookupTargetWithMode(state.mode);
    updateApplicantDocumentTitle();
    const targetPath = getApplicantRoutePath(state.mode);
    const targetLocation = `${targetPath}${APPLICANT_PREVIEW_SEARCH}`;
    const currentPath = normalizeApplicantRoutePath(window.location.pathname);
    const currentLocation = `${currentPath}${window.location.search || ""}`;

    if (currentLocation !== targetLocation) {
      const historyMethod = replace ? "replaceState" : "pushState";
      window.history[historyMethod](null, "", targetLocation);
    }

    persistApplicantPublicState();
  }

  function navigateToApplicantMode(mode, options = {}) {
    state.mode = String(mode || "home").trim() || "home";
    syncApplicantRoute({ replace: options.replace === true });

    if (options.render !== false) {
      render();
    }
  }

  function applyApplicantRouteFromLocation({ replace = false } = {}) {
    state.mode = getApplicantModeFromPathname(window.location.pathname);
    syncApplicantRoute({ replace });
    render();
  }

  function resetMessage() {
    hideApplicantToast();
    state.message = {
      type: "",
      text: "",
    };
  }

  function hideApplicantToast() {
    if (applicantToastTimerId) {
      window.clearTimeout(applicantToastTimerId);
      applicantToastTimerId = 0;
    }

    if (applicantToastRoot) {
      applicantToastRoot.classList.remove("is-visible", "is-error", "is-success");
      applicantToastRoot.textContent = "";
    }
  }

  function showApplicantToast(message = "", type = "error") {
    const normalizedMessage = String(message || "").trim();

    if (!normalizedMessage || !applicantToastRoot) {
      return;
    }

    hideApplicantToast();
    applicantToastRoot.textContent = normalizedMessage;
    applicantToastRoot.classList.add("is-visible", type === "success" ? "is-success" : "is-error");
    applicantToastTimerId = window.setTimeout(() => {
      hideApplicantToast();
    }, 3600);
  }

  function setMessage(type, text) {
    const normalizedType = String(type || "").trim();
    const normalizedText = String(text || "").trim();

    if (normalizedType === "error") {
      state.message = {
        type: "",
        text: "",
      };
      showApplicantToast(normalizedText || "처리 중 오류가 발생했습니다.", "error");
      return;
    }

    hideApplicantToast();
    state.message = {
      type: normalizedType,
      text: normalizedText,
    };
  }

  function resetIdentity() {
    state.identity = {
      name: "",
      email: "",
      accessToken: "",
      submissionId: 0,
      source: "",
    };
    state.recruitment = {
      admission: "",
      series: "",
      unit: "",
      major: "",
    };
    state.application.password = "";
    state.application.passwordConfirm = "";
    state.application.passwordConfirmTouched = false;
    state.nationalityPicker.openFieldKey = "";
    state.fieldUi = {
      dateParts: {},
      customSelectModes: {},
    };
    state.currentSubmission = null;
    state.draftAnswers = {};
  }

  function resetToHome() {
    resetMessage();
    resetIdentity();
    state.verification = {
      name: "",
      email: "",
      code: "",
      debugCode: "",
      expiresAt: 0,
      isSending: false,
      isVerifying: false,
    };
    state.lookup = {
      target: APPLICANT_LOOKUP_TARGETS.result,
      name: "",
      email: "",
      password: "",
      isLoading: false,
    };
    state.isSaving = false;
    navigateToApplicantMode("home");
  }

  function applyApplicantPreviewIdentity() {
    if (!APPLICANT_IS_PREVIEW_MODE) {
      return;
    }

    state.identity = {
      ...state.identity,
      name: state.identity.name || "홍길동",
      email: state.identity.email || "preview@example.com",
      source: "preview",
    };
  }

  function getSubmissionAnswerMap(submission = null) {
    return submission?.answerMap && typeof submission.answerMap === "object" ? submission.answerMap : {};
  }

  function getApplicantFormFieldByKey(fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();
    return (Array.isArray(state.formConfig.fields) ? state.formConfig.fields : []).find((field) => field.fieldKey === normalizedFieldKey) || null;
  }

  function parseApplicantDateParts(value = "") {
    const normalizedValue = String(value || "").trim();
    const matchedDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);

    if (!matchedDate) {
      return {
        year: "",
        month: "",
        day: "",
      };
    }

    return {
      year: matchedDate[1],
      month: matchedDate[2],
      day: matchedDate[3],
    };
  }

  function buildApplicantDateValueFromParts(parts = {}) {
    const year = String(parts?.year || "").trim();
    const month = String(parts?.month || "").trim();
    const day = String(parts?.day || "").trim();

    if (!year || !month || !day) {
      return "";
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function getApplicantDatePartState(fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const storedParts = state.fieldUi?.dateParts?.[normalizedFieldKey];

    if (storedParts && typeof storedParts === "object") {
      return {
        year: String(storedParts.year || ""),
        month: String(storedParts.month || ""),
        day: String(storedParts.day || ""),
      };
    }

    return parseApplicantDateParts(state.draftAnswers?.[normalizedFieldKey]);
  }

  function getApplicantDateDayCount(year, month) {
    const normalizedYear = Number(year || 0);
    const normalizedMonth = Number(month || 0);

    if (!Number.isInteger(normalizedYear) || normalizedYear < 1 || !Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
      return 31;
    }

    return new Date(normalizedYear, normalizedMonth, 0).getDate();
  }

  function getApplicantDateYearOptions(inputType = "", selectedYear = "") {
    const currentYear = new Date().getFullYear();
    let startYear = inputType === "birthdate" ? currentYear - 120 : currentYear - 10;
    let endYear = inputType === "birthdate" ? currentYear : currentYear + 20;
    const normalizedSelectedYear = Number(selectedYear || 0);

    if (Number.isInteger(normalizedSelectedYear) && normalizedSelectedYear > 0) {
      startYear = Math.min(startYear, normalizedSelectedYear);
      endYear = Math.max(endYear, normalizedSelectedYear);
    }

    const years = [];

    if (inputType === "birthdate") {
      for (let year = endYear; year >= startYear; year -= 1) {
        years.push(String(year));
      }
      return years;
    }

    for (let year = startYear; year <= endYear; year += 1) {
      years.push(String(year));
    }

    return years;
  }

  function renderApplicantDateOptions(values = [], selectedValue = "", placeholder = "") {
    const normalizedSelectedValue = String(selectedValue || "").trim();

    return [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...(Array.isArray(values) ? values : []).map((value) => {
        const normalizedValue = String(value || "").trim();
        return `<option value="${escapeAttribute(normalizedValue)}" ${normalizedSelectedValue === normalizedValue ? "selected" : ""}>${escapeHtml(normalizedValue)}</option>`;
      }),
    ].join("");
  }

  function syncApplicantFieldUiState({ preserveExisting = true } = {}) {
    const nextDateParts = {};
    const nextCustomSelectModes = {};
    const fields = Array.isArray(state.formConfig.fields) ? state.formConfig.fields : [];

    fields.forEach((field) => {
      const fieldKey = String(field?.fieldKey || "").trim();

      if (!fieldKey) {
        return;
      }

      if (field.inputType === "date" || field.inputType === "birthdate") {
        const existingParts = preserveExisting ? state.fieldUi?.dateParts?.[fieldKey] : null;

        nextDateParts[fieldKey] =
          existingParts && typeof existingParts === "object"
            ? {
                year: String(existingParts.year || ""),
                month: String(existingParts.month || ""),
                day: String(existingParts.day || ""),
              }
            : parseApplicantDateParts(state.draftAnswers[fieldKey]);
      }

      if (field.inputType === "select" && field.allowCustomOption === true) {
        const draftValue = String(state.draftAnswers[fieldKey] ?? "").trim();
        const existingMode = preserveExisting && state.fieldUi?.customSelectModes?.[fieldKey] === true;
        nextCustomSelectModes[fieldKey] =
          existingMode || (draftValue && !(Array.isArray(field.options) ? field.options : []).includes(draftValue));
      }
    });

    state.fieldUi = {
      dateParts: nextDateParts,
      customSelectModes: nextCustomSelectModes,
    };
  }

  function buildDraftAnswers(submission = null) {
    const answerMap = getSubmissionAnswerMap(submission);

    return (Array.isArray(state.formConfig.fields) ? state.formConfig.fields : []).reduce((draft, field) => {
      if (field.systemFieldKey === "name") {
        draft[field.fieldKey] = state.identity.name || state.verification.name || state.lookup.name || "";
        return draft;
      }

      draft[field.fieldKey] = answerMap[field.fieldKey] ?? (field.inputType === "photo" ? { hasPhoto: false, fileName: "" } : "");
      return draft;
    }, {});
  }

  function getApplicantFlowEntryMode() {
    return hasApplicantRecruitmentSelectionStep() ? "apply" : "form";
  }

  function getApplicantFormBackMode() {
    if (APPLICANT_IS_PREVIEW_MODE) {
      return "home";
    }

    if (hasApplicantRecruitmentSelectionStep()) {
      return "apply";
    }

    return state.identity.source === "lookup" ? getApplicantLookupResultMode() : "verify";
  }

  function applySubmissionContext({ accessToken = "", submission = null, source = "" }) {
    const submissionRecruitment = getApplicantRecruitmentSelectionFromSubmission(submission);

    state.identity = {
      name: submission?.name || state.verification.name || state.lookup.name || state.identity.name,
      email: submission?.email || state.verification.email || state.lookup.email || state.identity.email,
      accessToken: String(accessToken || ""),
      submissionId: Number(submission?.id || 0),
      source: String(source || ""),
    };
    state.application.password = "";
    state.application.passwordConfirm = "";
    state.application.passwordConfirmTouched = false;
    state.nationalityPicker.openFieldKey = "";
    state.currentSubmission = submission || null;
    state.recruitment = {
      admission: submissionRecruitment.admission || state.recruitment.admission || "",
      series: submissionRecruitment.series || state.recruitment.series || "",
      unit: submissionRecruitment.unit || state.recruitment.unit || "",
      major: submissionRecruitment.major || state.recruitment.major || "",
    };
    state.draftAnswers = buildDraftAnswers(submission);
    syncApplicantRecruitmentSelection({ preserveExisting: true });
    syncApplicantRecruitmentSelectionIntoDraftAnswers();
    syncApplicantFieldUiState({ preserveExisting: false });
  }

  function getAdmissionHomepageUrl() {
    return String(state.formConfig.systemSettings?.admissionHomepageUrl || "").trim();
  }

  function getNationalityOptions() {
    return Array.isArray(applicantFormConfig?.nationalityOptions) ? applicantFormConfig.nationalityOptions : [];
  }

  function getFilteredNationalityOptions(fieldKey = "") {
    const options = getNationalityOptions();
    const searchValue = String(state.draftAnswers[fieldKey] || "")
      .trim()
      .toLowerCase();

    if (!searchValue) {
      return options.slice(0, 12);
    }

    const startsWithMatches = [];
    const containsMatches = [];

    options.forEach((option) => {
      const searchLabel = String(option?.searchLabel || "").trim();

      if (!searchLabel) {
        return;
      }

      if (searchLabel.startsWith(searchValue)) {
        startsWithMatches.push(option);
        return;
      }

      if (searchLabel.includes(searchValue)) {
        containsMatches.push(option);
      }
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 12);
  }

  function closeNationalityPicker() {
    state.nationalityPicker.openFieldKey = "";
  }

  function findApplicantFieldElement(fieldKey = "") {
    return Array.from(root.querySelectorAll("[data-applicant-field-key]")).find((element) => {
      return String(element?.dataset?.applicantFieldKey || "").trim() === String(fieldKey || "").trim();
    });
  }

  function findApplicantNationalityPickerElement(fieldKey = "") {
    return Array.from(root.querySelectorAll("[data-applicant-nationality-picker-for]")).find((element) => {
      return String(element?.dataset?.applicantNationalityPickerFor || "").trim() === String(fieldKey || "").trim();
    });
  }

  function renderNationalityPickerContent(fieldKey = "") {
    const filteredNationalityOptions = getFilteredNationalityOptions(fieldKey);
    const fieldValue = String(state.draftAnswers[fieldKey] || "").trim();

    if (filteredNationalityOptions.length === 0) {
      return `<div class="applicant-public-nationality-empty">검색 결과가 없습니다.</div>`;
    }

    return `
      <div class="applicant-public-nationality-options" role="listbox">
        ${filteredNationalityOptions
          .map((option) => {
            const isSelected = fieldValue === String(option.label || "").trim();
            return `
              <button
                class="applicant-public-nationality-option ${isSelected ? "is-selected" : ""}"
                data-applicant-nationality-field-key="${escapeAttribute(fieldKey)}"
                data-applicant-nationality-value="${escapeAttribute(option.label)}"
                type="button"
              >
                <strong>${escapeHtml(option.label)}</strong>
                <span>${escapeHtml([option.englishLabel, option.code].filter(Boolean).join(" · "))}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function syncNationalityFieldUI(fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();

    if (!normalizedFieldKey) {
      return;
    }

    const fieldElement = findApplicantFieldElement(normalizedFieldKey);

    if (fieldElement instanceof HTMLInputElement) {
      fieldElement.value = String(state.draftAnswers[normalizedFieldKey] || "");
    }

    const pickerElement = findApplicantNationalityPickerElement(normalizedFieldKey);

    if (!(pickerElement instanceof HTMLElement)) {
      return;
    }

    const isOpen = state.nationalityPicker.openFieldKey === normalizedFieldKey;
    pickerElement.classList.toggle("is-open", isOpen);
    pickerElement.innerHTML = isOpen ? renderNationalityPickerContent(normalizedFieldKey) : "";
  }

  function normalizeNationalityDraftValue(fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();

    if (!normalizedFieldKey) {
      return;
    }

    const rawValue = String(state.draftAnswers[normalizedFieldKey] || "").trim();

    if (!rawValue) {
      return;
    }

    const matchedOption =
      typeof applicantFormConfig?.findApplicantNationalityOption === "function"
        ? applicantFormConfig.findApplicantNationalityOption(rawValue)
        : null;

    if (matchedOption?.label) {
      state.draftAnswers[normalizedFieldKey] = matchedOption.label;
    }
  }

  function resolveAdmissionHomepageUrl() {
    const admissionHomepageUrl = getAdmissionHomepageUrl();

    if (!admissionHomepageUrl) {
      return "";
    }

    try {
      return new URL(admissionHomepageUrl, window.location.origin).toString();
    } catch (error) {
      return "";
    }
  }

  async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        const result = String(reader.result || "");
        const [, base64 = ""] = result.split(",");
        resolve(base64);
      });
      reader.addEventListener("error", () => {
        reject(new Error("파일을 읽지 못했습니다."));
      });
      reader.readAsDataURL(file);
    });
  }

  async function buildSubmissionPayloadAnswers() {
    const answerPayload = {};
    const fields = Array.isArray(state.formConfig.fields) ? state.formConfig.fields : [];

    syncApplicantRecruitmentSelectionIntoDraftAnswers();

    for (const field of fields) {
      const currentValue = state.draftAnswers[field.fieldKey];

      if (field.inputType !== "photo") {
        answerPayload[field.fieldKey] = currentValue ?? "";
        continue;
      }

      if (currentValue?.file instanceof File) {
        answerPayload[field.fieldKey] = {
          fileName: currentValue.file.name,
          mimeType: currentValue.file.type || "application/octet-stream",
          base64: await readFileAsBase64(currentValue.file),
        };
        continue;
      }

      answerPayload[field.fieldKey] = {};
    }

    return answerPayload;
  }

  function buildApplicantRecruitmentSelectionPayload() {
    return {
      admission: String(state.recruitment.admission || "").trim(),
      series: String(state.recruitment.series || "").trim(),
      unit: String(state.recruitment.unit || "").trim(),
      major: String(state.recruitment.major || "").trim(),
    };
  }

  function getApplicantStatusLabel(status = "") {
    return applicantFormConfig?.getApplicantStatusLabel
      ? applicantFormConfig.getApplicantStatusLabel(status)
      : String(status || "접수 완료");
  }

  function getApplicantNoticeMarkup(html, placeholder = "공지사항이 없습니다.") {
    const normalizedHtml = String(html || "").trim();
    return normalizedHtml || `<p>${escapeHtml(placeholder)}</p>`;
  }

  function renderMessage() {
    if (!state.message.text || state.message.type === "error") {
      return "";
    }

    return `
      <div class="applicant-public-message ${state.message.type === "success" ? "is-success" : ""}">
        ${escapeHtml(state.message.text)}
      </div>
    `;
  }

  function getApplicantPasswordConfirmError() {
    const hasExistingPassword = state.currentSubmission?.hasPassword === true;
    const passwordValue = String(state.application.password || "");
    const passwordConfirmValue = String(state.application.passwordConfirm || "");

    if (state.application.passwordConfirmTouched !== true) {
      return "";
    }

    if (!passwordValue.trim()) {
      if (passwordConfirmValue.trim()) {
        return hasExistingPassword ? "변경할 비밀번호를 먼저 입력하세요." : "비밀번호를 먼저 입력하세요.";
      }

      return "";
    }

    if (!passwordConfirmValue.trim()) {
      return "비밀번호를 한 번 더 입력하세요.";
    }

    if (passwordValue !== passwordConfirmValue) {
      return "비밀번호가 일치하지 않습니다.";
    }

    return "";
  }

  function syncApplicantPasswordConfirmValidationUI() {
    const passwordField = root.querySelector("[data-applicant-password-confirm-field]");
    const passwordInput = root.querySelector("#applicationPasswordConfirm");
    const errorElement = root.querySelector("[data-applicant-password-confirm-error]");
    const errorMessage = getApplicantPasswordConfirmError();

    if (passwordField instanceof HTMLElement) {
      passwordField.classList.toggle("is-invalid", Boolean(errorMessage));
    }

    if (passwordInput instanceof HTMLElement) {
      passwordInput.classList.toggle("is-invalid", Boolean(errorMessage));
      passwordInput.setAttribute("aria-invalid", errorMessage ? "true" : "false");
    }

    if (errorElement instanceof HTMLElement) {
      errorElement.textContent = errorMessage;
      errorElement.classList.toggle("is-visible", Boolean(errorMessage));
    }
  }

  function renderHome() {
    const admissionHomepageUrl = getAdmissionHomepageUrl();
    const applyAvailabilityState = getApplicantApplyAvailabilityState();
    const applicantScheduleState = applyAvailabilityState.scheduleState;
    const resultLookupAvailabilityState = getApplicantResultLookupAvailabilityState();
    const ticketLookupAvailabilityState = getApplicantLookupAvailabilityState();
    const lookupScheduleState = ticketLookupAvailabilityState.scheduleState;
    const formNotReady = !state.isLoadingForm && !state.loadError && !applyAvailabilityState.isFormConfigured;
    const isApplyDisabled = !applyAvailabilityState.isAvailable;
    const applyButtonTitle = isApplyDisabled ? getApplicantApplyDisabledMessage(applyAvailabilityState) : "접수하기";
    const resultLookupButtonTitle = !resultLookupAvailabilityState.isAvailable
      ? getApplicantLookupActionDisabledMessage(APPLICANT_LOOKUP_TARGETS.result, resultLookupAvailabilityState)
      : "접수결과 조회";
    const ticketLookupButtonTitle = !ticketLookupAvailabilityState.isAvailable
      ? getApplicantLookupDisabledMessage(ticketLookupAvailabilityState)
      : "수험표 조회";

    return `
      <button
        class="ghost-button applicant-public-browser-home-link"
        data-applicant-action="go-admission-home"
        type="button"
        ${admissionHomepageUrl ? "" : "disabled"}
        title="${escapeAttribute(admissionHomepageUrl ? "입학처 홈페이지로 이동" : "입학처 홈페이지 링크가 아직 설정되지 않았습니다.")}"
      >
        입학처 홈페이지
      </button>

      <section class="applicant-public-home-stage">
        <section class="applicant-public-home">
          <article class="applicant-public-hero login-hero-card login-notice-card">
            <div class="login-notice-head">
              <p class="page-kicker">Applicant Notice</p>
              <h2>공지사항</h2>
            </div>
            <div class="login-notice-content applicant-public-notice-surface">
              ${getApplicantNoticeMarkup(state.formConfig.noticeHtml, "접수 전 공지사항을 확인하세요.")}
            </div>
          </article>

          <article class="applicant-public-panel applicant-public-action-grid login-panel-card login-stage-panel">
            <div class="applicant-public-action-header">
              <div class="applicant-public-brand login-stage-brand">
                <img class="applicant-public-brand-mark" src="/client/assets/login-stage-brand-mark.png" alt="" />
                <div class="applicant-public-brand-copy login-stage-brand-copy">
                  <span>Admit Card System</span>
                  <strong>수험생 접수</strong>
                </div>
              </div>
            </div>
            ${renderMessage()}
            ${
              state.isLoadingForm
                ? `<div class="applicant-public-empty-state"><strong>접수 양식을 불러오는 중입니다.</strong><span>잠시만 기다려 주세요.</span></div>`
                : ""
            }
            ${
              state.loadError
                ? `<div class="applicant-public-empty-state"><strong>페이지를 준비하지 못했습니다.</strong><span>${escapeHtml(state.loadError)}</span></div>`
                : ""
            }
            ${
              formNotReady
                ? `<div class="applicant-public-empty-state"><strong>접수 양식이 아직 설정되지 않았습니다.</strong><span>관리자에게 접수 양식 설정 여부를 확인하세요.</span></div>`
                : ""
            }
            <div class="applicant-public-action-stack applicant-public-home-actions">
              <button
                class="primary-button"
                data-applicant-action="go-verify"
                type="button"
                ${isApplyDisabled ? "disabled" : ""}
                title="${escapeAttribute(applyButtonTitle)}"
              >${renderApplicantHomeActionButtonLabel("접수하기", "apply")}</button>
              <button
                class="ghost-button"
                data-applicant-action="go-lookup-summary"
                type="button"
                ${resultLookupAvailabilityState.isAvailable ? "" : "disabled"}
                title="${escapeAttribute(resultLookupButtonTitle)}"
              >${renderApplicantHomeActionButtonLabel("접수결과 조회", "summary")}</button>
              <button
                class="ghost-button"
                data-applicant-action="go-lookup-ticket"
                type="button"
                ${ticketLookupAvailabilityState.isAvailable ? "" : "disabled"}
                title="${escapeAttribute(ticketLookupButtonTitle)}"
              >${renderApplicantHomeActionButtonLabel("수험표 조회", "ticket")}</button>
            </div>
          </article>
        </section>

        <p class="login-shell-copyright applicant-public-copyright">COPYRIGHT(c) 2026 BY U-PLUS SYSTEM. ALL RIGHTS RESERVED.</p>
      </section>
    `;
  }

  function renderVerify() {
    return `
      <section class="applicant-public-step">
        <article class="applicant-public-slab">
          <h2>이메일 인증</h2>
          <p>이름과 이메일을 입력한 뒤 인증 코드를 확인하면 다음 단계로 이동합니다.</p>
          ${renderMessage()}

          <div class="applicant-public-form applicant-public-verify-form">
            <div class="applicant-public-field">
              <label for="verificationName">이름 <span class="applicant-public-required">*</span></label>
              <input id="verificationName" data-applicant-model="verification.name" type="text" value="${escapeAttribute(state.verification.name)}" />
            </div>
            <div class="applicant-public-field">
              <label for="verificationEmail">이메일 <span class="applicant-public-required">*</span></label>
              <input id="verificationEmail" data-applicant-model="verification.email" type="email" value="${escapeAttribute(state.verification.email)}" />
            </div>
          </div>

          <div class="applicant-public-actions">
            <button class="ghost-button" data-applicant-action="back-home" type="button">뒤로</button>
            <button class="primary-button" data-applicant-action="send-code" type="button" ${state.verification.isSending ? "disabled" : ""}>
              ${state.verification.isSending ? "발송 중..." : "인증 코드 발송"}
            </button>
          </div>

          <form class="applicant-public-form" data-applicant-form="verify-code">
            <div class="applicant-public-field">
              <label for="verificationCode">인증 코드 <span class="applicant-public-required">*</span></label>
              <input id="verificationCode" data-applicant-model="verification.code" type="text" maxlength="12" value="${escapeAttribute(state.verification.code)}" />
              ${renderVerificationCountdownMarkup()}
              ${
                state.verification.debugCode
                  ? `<span class="applicant-public-file-note">개발용 확인 코드: <strong>${escapeHtml(state.verification.debugCode)}</strong></span>`
                  : ""
              }
            </div>

            <div class="applicant-public-actions">
              <button class="ghost-button" data-applicant-action="back-home" type="button">뒤로</button>
              <button class="primary-button" type="submit" ${state.verification.isVerifying ? "disabled" : ""}>
                ${state.verification.isVerifying ? "확인 중..." : "인증 확인"}
              </button>
            </div>
          </form>
        </article>
      </section>
    `;
  }

  function renderApplicantStaticField({ fieldId = "", label = "", value = "", helperText = "" } = {}) {
    return `
      <div class="applicant-public-field applicant-public-static-field">
        <label for="${escapeAttribute(fieldId)}">${escapeHtml(label)}</label>
        ${helperText ? `<span class="applicant-public-file-note applicant-public-field-note">${escapeHtml(helperText)}</span>` : ""}
        <input id="${escapeAttribute(fieldId)}" type="text" value="${escapeAttribute(value)}" readonly />
      </div>
    `;
  }

  function renderApplicantPasswordFields() {
    const hasExistingPassword = state.currentSubmission?.hasPassword === true;
    const passwordConfirmError = getApplicantPasswordConfirmError();

    return `
      <div class="applicant-public-field applicant-public-password-field">
        <label for="applicationPassword">
          비밀번호
          ${hasExistingPassword ? "" : ` <span class="applicant-public-required">*</span>`}
        </label>
        <span class="applicant-public-file-note applicant-public-field-note">
          ${
            hasExistingPassword
              ? "새 비밀번호를 입력하면 변경되고, 비워 두면 기존 비밀번호를 유지합니다."
              : "접수 비밀번호를 4자 이상 입력하세요."
          }
        </span>
        <input
          id="applicationPassword"
          data-applicant-model="application.password"
          type="password"
          value="${escapeAttribute(state.application.password)}"
          placeholder="${hasExistingPassword ? "변경할 때만 입력" : "비밀번호를 입력하세요"}"
          autocomplete="new-password"
        />
      </div>
      <div class="applicant-public-field applicant-public-password-field ${passwordConfirmError ? "is-invalid" : ""}" data-applicant-password-confirm-field="true">
        <label for="applicationPasswordConfirm">
          비밀번호 확인
          ${hasExistingPassword ? "" : ` <span class="applicant-public-required">*</span>`}
        </label>
        <span class="applicant-public-file-note applicant-public-field-note">비밀번호를 한 번 더 입력해 주세요.</span>
        <input
          id="applicationPasswordConfirm"
          data-applicant-model="application.passwordConfirm"
          type="password"
          value="${escapeAttribute(state.application.passwordConfirm)}"
          placeholder="${hasExistingPassword ? "변경한 비밀번호를 다시 입력" : "비밀번호를 다시 입력하세요"}"
          autocomplete="new-password"
          aria-invalid="${passwordConfirmError ? "true" : "false"}"
        />
        <span class="applicant-public-input-error ${passwordConfirmError ? "is-visible" : ""}" data-applicant-password-confirm-error="true">${escapeHtml(passwordConfirmError)}</span>
      </div>
    `;
  }

  function renderApplicantDateField(field, fieldValue, requiredBadge, fieldDescriptionMarkup, isReadOnly) {
    const dateParts = getApplicantDatePartState(field.fieldKey);
    const yearOptions = getApplicantDateYearOptions(field.inputType, dateParts.year);
    const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
    const dayOptions = Array.from(
      { length: getApplicantDateDayCount(dateParts.year, dateParts.month) },
      (_, index) => String(index + 1).padStart(2, "0"),
    );

    return `
      <div class="applicant-public-field">
        <label>${escapeHtml(field.questionText)} ${requiredBadge}</label>
        ${fieldDescriptionMarkup}
        <div class="applicant-public-date-select-grid">
          <select
            id="field-${escapeAttribute(field.fieldKey)}-year"
            data-applicant-date-field-key="${escapeAttribute(field.fieldKey)}"
            data-applicant-date-part="year"
            ${isReadOnly ? "disabled" : ""}
          >
            ${renderApplicantDateOptions(yearOptions, dateParts.year, "연")}
          </select>
          <select
            id="field-${escapeAttribute(field.fieldKey)}-month"
            data-applicant-date-field-key="${escapeAttribute(field.fieldKey)}"
            data-applicant-date-part="month"
            ${isReadOnly ? "disabled" : ""}
          >
            ${renderApplicantDateOptions(monthOptions, dateParts.month, "월")}
          </select>
          <select
            id="field-${escapeAttribute(field.fieldKey)}-day"
            data-applicant-date-field-key="${escapeAttribute(field.fieldKey)}"
            data-applicant-date-part="day"
            ${isReadOnly ? "disabled" : ""}
          >
            ${renderApplicantDateOptions(dayOptions, dateParts.day, "일")}
          </select>
        </div>
        <input type="hidden" data-applicant-field-key="${escapeAttribute(field.fieldKey)}" value="${escapeAttribute(fieldValue || "")}" />
      </div>
    `;
  }

  function renderApplicantField(field) {
    const fieldValue = state.draftAnswers[field.fieldKey];
    const isReadOnly = field.systemFieldKey === "name";
    const requiredBadge = field.required ? `<span class="applicant-public-required">*</span>` : "";
    const fieldDescription = String(field.questionDescription || "").trim();
    const fieldDescriptionMarkup = fieldDescription
      ? `<span class="applicant-public-file-note applicant-public-field-note">${escapeHtml(fieldDescription)}</span>`
      : "";
    const fieldTypeAttribute = `data-applicant-field-type="${escapeAttribute(field.inputType || "text")}"`;

    if (field.inputType === "textarea") {
      return `
        <div class="applicant-public-field">
          <label for="field-${escapeAttribute(field.fieldKey)}">${escapeHtml(field.questionText)} ${requiredBadge}</label>
          ${fieldDescriptionMarkup}
          <textarea
            id="field-${escapeAttribute(field.fieldKey)}"
            data-applicant-field-key="${escapeAttribute(field.fieldKey)}"
            ${fieldTypeAttribute}
            ${isReadOnly ? "readonly" : ""}
          >${escapeHtml(fieldValue || "")}</textarea>
        </div>
      `;
    }

    if (field.inputType === "select") {
      const normalizedOptions = Array.isArray(field.options) ? field.options : [];
      const customOptionLabel = String(field.customOptionLabel || "").trim();
      const hasLinkedCustomOption =
        field.allowCustomOption === true && customOptionLabel !== "" && normalizedOptions.includes(customOptionLabel);
      const isCustomSelectMode = state.fieldUi?.customSelectModes?.[field.fieldKey] === true && field.allowCustomOption === true;
      const selectedOptionValue =
        isCustomSelectMode
          ? hasLinkedCustomOption
            ? customOptionLabel
            : APPLICANT_CUSTOM_SELECT_VALUE
          : normalizedOptions.includes(String(fieldValue || "").trim())
            ? String(fieldValue || "").trim()
            : "";
      const customInputValue =
        isCustomSelectMode
          ? hasLinkedCustomOption
            ? normalizedOptions.includes(String(fieldValue || "").trim())
              ? ""
              : String(fieldValue || "")
            : !normalizedOptions.includes(String(fieldValue || "").trim())
              ? String(fieldValue || "")
              : ""
          : "";

      return `
        <div class="applicant-public-field">
          <label for="field-${escapeAttribute(field.fieldKey)}">${escapeHtml(field.questionText)} ${requiredBadge}</label>
          ${fieldDescriptionMarkup}
          <select
            id="field-${escapeAttribute(field.fieldKey)}"
            data-applicant-field-key="${escapeAttribute(field.fieldKey)}"
            data-applicant-select-source="true"
            ${fieldTypeAttribute}
            ${isReadOnly ? "disabled" : ""}
          >
            <option value="">선택하세요</option>
            ${normalizedOptions
              .map(
                (option) => `
                  <option value="${escapeAttribute(option)}" ${selectedOptionValue === option ? "selected" : ""}>${escapeHtml(option)}</option>
                `,
              )
              .join("")}
            ${
              field.allowCustomOption === true && !hasLinkedCustomOption
                ? `<option value="${escapeAttribute(APPLICANT_CUSTOM_SELECT_VALUE)}" ${selectedOptionValue === APPLICANT_CUSTOM_SELECT_VALUE ? "selected" : ""}>직접 입력</option>`
                : ""
            }
          </select>
          ${
            field.allowCustomOption === true && isCustomSelectMode
              ? `
                <input
                  id="field-${escapeAttribute(field.fieldKey)}-custom"
                  data-applicant-select-custom-field-key="${escapeAttribute(field.fieldKey)}"
                  type="text"
                  value="${escapeAttribute(customInputValue)}"
                  placeholder="직접 입력 값을 작성하세요"
                  ${isReadOnly ? "readonly" : ""}
                />
              `
              : ""
          }
        </div>
      `;
    }

    if (field.inputType === "photo") {
      const photoLabel =
        fieldValue?.file instanceof File
          ? fieldValue.file.name
          : fieldValue?.hasPhoto
            ? fieldValue.fileName || "기존 사진이 등록되어 있습니다."
            : "선택된 파일이 없습니다.";

      return `
        <div class="applicant-public-field applicant-public-file-field">
          <label for="field-${escapeAttribute(field.fieldKey)}">${escapeHtml(field.questionText)} ${requiredBadge}</label>
          ${fieldDescriptionMarkup}
          <div class="applicant-public-file-shell">
            <input
              id="field-${escapeAttribute(field.fieldKey)}"
              class="applicant-public-file-input"
              data-applicant-field-key="${escapeAttribute(field.fieldKey)}"
              ${fieldTypeAttribute}
              type="file"
              accept="image/*"
            />
            <label class="applicant-public-file-display" for="field-${escapeAttribute(field.fieldKey)}">
              <span class="applicant-public-file-button">파일 선택</span>
              <span class="applicant-public-file-name">${escapeHtml(photoLabel)}</span>
            </label>
          </div>
        </div>
      `;
    }

    if (field.inputType === "nationality") {
      const isPickerOpen = state.nationalityPicker.openFieldKey === field.fieldKey && !isReadOnly;

      return `
        <div class="applicant-public-field applicant-public-nationality-field">
          <label for="field-${escapeAttribute(field.fieldKey)}">${escapeHtml(field.questionText)} ${requiredBadge}</label>
          ${fieldDescriptionMarkup}
          <div class="applicant-public-nationality-combobox">
            <input
              id="field-${escapeAttribute(field.fieldKey)}"
              data-applicant-field-key="${escapeAttribute(field.fieldKey)}"
              ${fieldTypeAttribute}
              type="search"
              value="${escapeAttribute(fieldValue || "")}"
              placeholder="국가를 검색하세요"
              autocomplete="off"
              spellcheck="false"
              ${isReadOnly ? "readonly" : ""}
            />
            <div
              class="applicant-public-nationality-picker ${isPickerOpen ? "is-open" : ""}"
              data-applicant-nationality-picker-for="${escapeAttribute(field.fieldKey)}"
            >
              ${isPickerOpen ? renderNationalityPickerContent(field.fieldKey) : ""}
            </div>
          </div>
          <span class="applicant-public-file-note">국가명을 검색한 뒤 목록에서 선택하세요.</span>
        </div>
      `;
    }

    if (field.inputType === "date" || field.inputType === "birthdate") {
      return renderApplicantDateField(field, fieldValue, requiredBadge, fieldDescriptionMarkup, isReadOnly);
    }

    const inputType =
      field.inputType === "time"
          ? "time"
          : "text";
    const inputAttributes =
      field.inputType === "phone"
        ? `inputmode="numeric" pattern="[0-9]*" maxlength="20" autocomplete="tel-national"`
        : "";

    return `
      <div class="applicant-public-field">
        <label for="field-${escapeAttribute(field.fieldKey)}">${escapeHtml(field.questionText)} ${requiredBadge}</label>
        ${fieldDescriptionMarkup}
        <input
          id="field-${escapeAttribute(field.fieldKey)}"
          data-applicant-field-key="${escapeAttribute(field.fieldKey)}"
          ${fieldTypeAttribute}
          type="${inputType}"
          value="${escapeAttribute(fieldValue || "")}"
          ${inputAttributes}
          ${isReadOnly ? "readonly" : ""}
        />
      </div>
    `;
  }

  function getVisibleApplicantFormFields() {
    const fields = Array.isArray(state.formConfig.fields) ? state.formConfig.fields : [];

    if (!hasApplicantRecruitmentSelectionStep()) {
      return fields;
    }

    return fields.filter((field) => !["admission", "series", "unit", "major"].includes(String(field?.systemFieldKey || "").trim()));
  }

  function renderApplicantRecruitmentSelectionSummary() {
    const summaryItems = APPLICANT_RECRUITMENT_SELECTION_FIELDS
      .map((definition) => ({
        label: definition.label,
        value: String(state.recruitment?.[definition.key] || "").trim(),
      }))
      .filter((item) => item.value);

    if (summaryItems.length === 0) {
      return "";
    }

    return `
      <div class="applicant-public-selection-summary">
        ${summaryItems
          .map(
            (item) => `
              <div class="applicant-public-selection-summary-item">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderApplicantRecruitmentSelectionFields() {
    return APPLICANT_RECRUITMENT_SELECTION_FIELDS.map((definition) => {
      const globalOptions = getApplicantRecruitmentSelectionOptions(definition.key, {});
      const previousDefinition =
        APPLICANT_RECRUITMENT_SELECTION_FIELDS[getApplicantRecruitmentSelectionIndex(definition.key) - 1] || null;
      const isEnabled = hasApplicantRecruitmentSelectionPrerequisites(definition.key, state.recruitment);
      const options = isEnabled ? getApplicantRecruitmentSelectionOptions(definition.key, state.recruitment) : [];
      const placeholderLabel = !isEnabled
        ? `${previousDefinition?.label || "이전 항목"} 먼저 선택하세요`
        : options.length > 0
          ? "선택하세요"
          : `선택 가능한 ${definition.label}이(가) 없습니다`;

      if (globalOptions.length === 0) {
        return "";
      }

      const selectedValue = String(state.recruitment?.[definition.key] || "").trim();

      return `
        <div class="applicant-public-field">
          <label for="applicationSelection-${escapeAttribute(definition.key)}">${escapeHtml(definition.label)} <span class="applicant-public-required">*</span></label>
          <select
            id="applicationSelection-${escapeAttribute(definition.key)}"
            data-applicant-model="recruitment.${escapeAttribute(definition.key)}"
            ${!isEnabled || options.length === 0 ? "disabled" : ""}
          >
            <option value="">${escapeHtml(placeholderLabel)}</option>
            ${options
              .map(
                (option) => `
                  <option value="${escapeAttribute(option)}" ${selectedValue === option ? "selected" : ""}>${escapeHtml(option)}</option>
                `,
              )
              .join("")}
          </select>
        </div>
      `;
    }).join("");
  }

  function renderApplicantApplicationHeaderActions(statusMarkup = "") {
    return `
      <div class="applicant-public-application-header-actions">
        ${statusMarkup}
        <button class="ghost-button applicant-public-application-home-button" data-applicant-action="back-home" type="button">처음으로</button>
      </div>
    `;
  }

  function renderApply() {
    return `
      <section class="applicant-public-step applicant-public-application-step">
        <article class="applicant-public-slab applicant-public-application-panel">
          <div class="applicant-public-application-header">
            <div class="applicant-public-application-header-copy">
              <p class="page-kicker applicant-public-form-kicker">Application Setup</p>
              <h2>접수 신청</h2>
            </div>
            ${renderApplicantApplicationHeaderActions()}
          </div>
          ${renderMessage()}
          <div class="applicant-public-form applicant-public-application-form">
            <div class="applicant-public-form-section">
              <div class="applicant-public-form-section-head">
                <span class="applicant-public-form-section-kicker">Selection</span>
                <h3>지원 정보를 선택하세요</h3>
                <p>접수 설정 기준으로 전형, 계열, 모집단위, 전공을 순서대로 선택합니다.</p>
              </div>
              <div class="applicant-public-form-stack">
                ${renderApplicantRecruitmentSelectionFields()}
              </div>
            </div>

            <div class="applicant-public-actions applicant-public-application-actions">
              <button class="ghost-button" data-applicant-action="back-verify" type="button">이전</button>
              <button class="primary-button" data-applicant-action="continue-application" type="button">다음</button>
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderApplicationConfiguredFields() {
    const fields = getVisibleApplicantFormFields();
    const renderedFields = [];
    let insertedEmailAndPassword = false;

    fields.forEach((field) => {
      renderedFields.push(renderApplicantField(field));

      if (!insertedEmailAndPassword && field.systemFieldKey === "name") {
        renderedFields.push(
          renderApplicantStaticField({
            fieldId: "applicationEmail",
            label: "이메일",
            value: state.identity.email || "-",
            helperText: "이메일 인증이 완료된 주소입니다.",
          }),
        );
        renderedFields.push(renderApplicantPasswordFields());
        insertedEmailAndPassword = true;
      }
    });

    if (!insertedEmailAndPassword) {
      renderedFields.unshift(renderApplicantPasswordFields());
      renderedFields.unshift(
        renderApplicantStaticField({
          fieldId: "applicationEmail",
          label: "이메일",
          value: state.identity.email || "-",
          helperText: "이메일 인증이 완료된 주소입니다.",
        }),
      );
      renderedFields.unshift(
        renderApplicantStaticField({
          fieldId: "applicationName",
          label: "이름",
          value: state.identity.name || "-",
          helperText: "본인 확인이 완료된 이름입니다.",
        }),
      );
    }

    return renderedFields.join("");
  }

  function renderForm() {
    const isPreviewMode = APPLICANT_IS_PREVIEW_MODE;
    const submissionStatus = state.currentSubmission?.status ? getApplicantStatusLabel(state.currentSubmission.status) : "";
    const statusMarkup =
      submissionStatus || isPreviewMode
        ? `<span class="applicant-public-application-status ${isPreviewMode ? "is-preview" : ""}">${escapeHtml(isPreviewMode ? "미리보기" : submissionStatus)}</span>`
        : "";

    return `
      <section class="applicant-public-step applicant-public-application-step">
        <article class="applicant-public-slab applicant-public-application-panel">
          <div class="applicant-public-application-header">
            <div class="applicant-public-application-header-copy">
              <p class="page-kicker applicant-public-form-kicker">Application Setup</p>
              <h2>접수 페이지</h2>
            </div>
            ${renderApplicantApplicationHeaderActions(statusMarkup)}
          </div>
          ${renderMessage()}
          ${
            isPreviewMode
              ? `<div class="applicant-public-preview-note">관리자 미리보기 화면입니다. 입력값은 저장되지 않습니다.</div>`
              : ""
          }
          <form class="applicant-public-form applicant-public-application-form" data-applicant-form="application">
            <div class="applicant-public-form-section">
              <div class="applicant-public-form-section-head">
                <span class="applicant-public-form-section-kicker">Account</span>
                <h3>기본 정보 및 접수 항목</h3>
              </div>
              ${renderApplicantRecruitmentSelectionSummary()}
              <div class="applicant-public-form-stack">
                ${renderApplicationConfiguredFields()}
              </div>
            </div>

            <div class="applicant-public-actions applicant-public-application-actions">
              ${
                isPreviewMode
                  ? `
                    <button class="ghost-button" data-applicant-action="preview-home" type="button">첫 화면 보기</button>
                    <button class="primary-button" type="button" disabled>미리보기 전용</button>
                  `
                  : `
                    <button class="ghost-button" data-applicant-action="back-form" type="button">이전</button>
                    <button class="primary-button" type="submit" ${state.isSaving ? "disabled" : ""}>
                      ${state.isSaving ? "저장 중..." : "접수 완료"}
                    </button>
                  `
              }
            </div>
          </form>
        </article>
      </section>
    `;
  }

  function renderSummaryItems(answerItems = []) {
    const fieldOrderMap = (Array.isArray(state.formConfig?.fields) ? state.formConfig.fields : []).reduce((orderMap, field, fieldIndex) => {
      const fieldKey = String(field?.fieldKey || "").trim();

      if (fieldKey && !orderMap.has(fieldKey)) {
        orderMap.set(fieldKey, fieldIndex);
      }

      return orderMap;
    }, new Map());
    const normalizedItems = Array.isArray(answerItems)
      ? answerItems
          .map((answerItem, index) => ({
            answerItem: answerItem && typeof answerItem === "object" ? answerItem : {},
            index,
          }))
          .sort((leftItem, rightItem) => {
            const leftSystemFieldKey = String(leftItem.answerItem?.systemFieldKey || "").trim();
            const rightSystemFieldKey = String(rightItem.answerItem?.systemFieldKey || "").trim();
            const leftPriorityIndex = APPLICANT_SUMMARY_PRIORITY_SYSTEM_FIELDS.indexOf(leftSystemFieldKey);
            const rightPriorityIndex = APPLICANT_SUMMARY_PRIORITY_SYSTEM_FIELDS.indexOf(rightSystemFieldKey);
            const leftIsPriority = leftPriorityIndex >= 0;
            const rightIsPriority = rightPriorityIndex >= 0;

            if (leftIsPriority || rightIsPriority) {
              if (leftIsPriority && rightIsPriority) {
                return leftPriorityIndex - rightPriorityIndex;
              }

              return leftIsPriority ? -1 : 1;
            }

            const leftFieldKey = String(leftItem.answerItem?.fieldKey || "").trim();
            const rightFieldKey = String(rightItem.answerItem?.fieldKey || "").trim();
            const leftFieldOrder = fieldOrderMap.has(leftFieldKey) ? fieldOrderMap.get(leftFieldKey) : Number.MAX_SAFE_INTEGER;
            const rightFieldOrder = fieldOrderMap.has(rightFieldKey) ? fieldOrderMap.get(rightFieldKey) : Number.MAX_SAFE_INTEGER;

            if (leftFieldOrder !== rightFieldOrder) {
              return leftFieldOrder - rightFieldOrder;
            }

            return leftItem.index - rightItem.index;
          })
          .map((item) => item.answerItem)
      : [];

    return `
      <div class="applicant-public-summary-grid">
        ${normalizedItems
          .map((answerItem) => {
            const value =
              answerItem?.inputType === "photo"
                ? answerItem?.value?.hasPhoto
                  ? answerItem?.value?.fileName || "등록된 사진"
                  : "미등록"
                : String(answerItem?.value || "").trim() || "-";

            return `
              <div class="applicant-public-summary-item">
                <strong>${escapeHtml(answerItem?.questionText || "-")}</strong>
                <span>${escapeHtml(value)}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderResult() {
    return `
      <section class="applicant-public-step">
        <article class="applicant-public-slab">
          <h2>접수 결과</h2>
          <p>입력한 내용을 한 번 더 확인한 뒤 확인 완료를 누르면 처음 화면으로 돌아갑니다.</p>
          ${renderMessage()}

          ${renderSummaryItems(state.currentSubmission?.answerItems)}

          <div class="applicant-public-actions">
            <button class="primary-button" data-applicant-action="confirm-result" type="button">확인 완료</button>
          </div>
        </article>
      </section>
    `;
  }

  function renderLookup() {
    const lookupScreenCopy = getApplicantLookupScreenCopy();

    return `
      <section class="applicant-public-step">
        <article class="applicant-public-slab">
          <h2>${escapeHtml(lookupScreenCopy.heading)}</h2>
          <p>${escapeHtml(lookupScreenCopy.description)}</p>
          ${renderMessage()}

          <form class="applicant-public-form applicant-public-lookup-form" data-applicant-form="lookup">
            <div class="applicant-public-field">
              <label for="lookupName">이름 <span class="applicant-public-required">*</span></label>
              <input
                id="lookupName"
                data-applicant-model="lookup.name"
                type="text"
                value="${escapeAttribute(state.lookup.name)}"
                autocomplete="name"
              />
            </div>
            <div class="applicant-public-field">
              <label for="lookupEmail">이메일 <span class="applicant-public-required">*</span></label>
              <input
                id="lookupEmail"
                data-applicant-model="lookup.email"
                type="email"
                value="${escapeAttribute(state.lookup.email)}"
                autocomplete="email"
              />
            </div>
            <div class="applicant-public-field applicant-public-password-field">
              <label for="lookupPassword">비밀번호 <span class="applicant-public-required">*</span></label>
              <input
                id="lookupPassword"
                data-applicant-model="lookup.password"
                type="password"
                value="${escapeAttribute(state.lookup.password)}"
                autocomplete="current-password"
              />
            </div>

            <div class="applicant-public-actions">
              <button class="ghost-button" data-applicant-action="back-home" type="button">취소</button>
              <button class="primary-button" type="submit" ${state.lookup.isLoading ? "disabled" : ""}>
                ${state.lookup.isLoading ? "조회 중..." : "조회"}
              </button>
            </div>
          </form>
        </article>
      </section>
    `;
  }

  function renderLookupSummaryResult() {
    const submission = state.currentSubmission;

    return `
      <section class="applicant-public-step">
        <article class="applicant-public-slab">
          <h2>접수결과 조회</h2>
          <p>등록된 최신 접수 내용을 확인합니다.</p>
          ${renderMessage()}

          ${renderSummaryItems(submission?.answerItems)}

          <div class="applicant-public-actions">
            <button class="ghost-button" data-applicant-action="edit-application" type="button">수정</button>
            <button class="primary-button" data-applicant-action="back-home" type="button">홈</button>
          </div>
        </article>
      </section>
    `;
  }

  function renderLookupTicketResult() {
    const submission = state.currentSubmission;
    const admitCardDataSource = String(state.formConfig.systemSettings?.admitCardDataSource || "").trim() || "examinee";
    const isSubmissionAdmitCardSource = admitCardDataSource === "submission";
    const pdfUrl =
      submission?.id &&
      state.identity.accessToken &&
      (isSubmissionAdmitCardSource || (submission?.status === "promoted" && submission?.promotedExamineeNo))
        ? buildApiUrl(`/api/public/applications/${submission.id}/admit-card.pdf?token=${encodeURIComponent(state.identity.accessToken)}`)
        : "";
    const pdfViewerUrl = pdfUrl ? `${pdfUrl}#page=1&view=FitH&navpanes=0&pagemode=none` : "";
    const previewMarkup = pdfViewerUrl
      ? `
        <div class="applicant-public-pdf-frame">
          <iframe title="수험표 미리보기" src="${escapeAttribute(pdfViewerUrl)}"></iframe>
        </div>
      `
      : `
        <div class="applicant-public-empty-state">
          <strong>수험표가 아직 발급되지 않았습니다.</strong>
          <span>관리자에서 수험생 등록으로 이동하면 이 화면에서 PDF가 표시됩니다.</span>
        </div>
      `;

    return `
      <section class="applicant-public-step">
        <article class="applicant-public-slab applicant-public-ticket-slab applicant-public-ticket-viewer-slab">
          <div class="applicant-public-ticket-viewer-head">
            <div class="applicant-public-ticket-viewer-copy">
              <h2>수험표 조회</h2>
              <p>수험표 PDF를 열람하고 인쇄합니다.</p>
            </div>
            <div class="applicant-public-actions">
              <button class="ghost-button" data-applicant-action="edit-application" type="button">수정</button>
              <button class="primary-button" data-applicant-action="back-home" type="button">홈</button>
            </div>
          </div>
          ${renderMessage()}
          ${previewMarkup}
        </article>
      </section>
    `;
  }

  function render() {
    const markup =
      state.mode === "verify"
        ? renderVerify()
        : state.mode === "apply"
          ? renderApply()
        : state.mode === "form"
          ? renderForm()
          : state.mode === "result"
            ? renderResult()
            : state.mode === "lookup"
              ? renderLookup()
              : state.mode === "lookup-summary"
                ? renderLookupSummaryResult()
                : state.mode === "lookup-ticket"
                  ? renderLookupTicketResult()
                : renderHome();

    root.innerHTML = markup;
    updateApplicantDocumentTitle();
    persistApplicantPublicState();
    syncVerificationCountdown();
    syncVerificationCountdownUi();
    syncApplicantPasswordConfirmValidationUI();
  }

  async function loadFormConfig() {
    state.isLoadingForm = true;
    state.loadError = "";
    render();

    try {
      const payload = await apiRequest("/api/public/applicant-form", {
        method: "GET",
        headers: {},
      });
      applyApplicantPreviewIdentity();
      state.formConfig = {
        fields: Array.isArray(payload?.fields) ? payload.fields : [],
        recruitmentUnits: Array.isArray(payload?.recruitmentUnits) ? payload.recruitmentUnits : [],
        settings: payload?.settings || {},
        systemSettings: {
          admissionHomepageUrl: "",
          ...getDefaultApplicantScheduleRange(),
          admitCardLookupScheduleStartAt: getDefaultApplicantScheduleRange().startAt,
          admitCardLookupScheduleEndAt: getDefaultApplicantScheduleRange().endAt,
          admitCardDataSource: "examinee",
          ...(payload?.systemSettings && typeof payload.systemSettings === "object" ? payload.systemSettings : {}),
        },
        noticeHtml: String(payload?.noticeHtml || ""),
      };
      syncApplicantRecruitmentSelection({ preserveExisting: true });
      state.draftAnswers = {
        ...buildDraftAnswers(state.currentSubmission),
        ...(state.draftAnswers && typeof state.draftAnswers === "object" ? state.draftAnswers : {}),
      };
      syncApplicantRecruitmentSelectionIntoDraftAnswers();
      syncApplicantFieldUiState();
      syncApplicantRoute({ replace: true });
    } catch (error) {
      state.loadError = error?.message || "접수 양식을 불러오지 못했습니다.";
    } finally {
      state.isLoadingForm = false;
      render();
    }
  }

  async function sendVerificationCode() {
    resetMessage();
    const applicantScheduleState = getApplicantSubmissionScheduleState();

    if (!applicantScheduleState.isOpen) {
      setMessage("error", getApplicantApplyDisabledMessage({
        isAvailable: false,
        isFormConfigured: hasApplicantFormConfigured(),
        scheduleState: applicantScheduleState,
      }));
      render();
      return;
    }

    state.verification.code = "";
    state.verification.debugCode = "";
    state.verification.isSending = true;
    render();

    try {
      const payload = await apiRequest("/api/public/email-verifications", {
        method: "POST",
        body: JSON.stringify({
          name: state.verification.name,
          email: state.verification.email,
        }),
      });
      state.verification.debugCode = String(payload?.debugCode || "");
      state.verification.expiresAt = Date.now() + Math.max(0, Number(payload?.expiresInSeconds || 0)) * 1000;
      setMessage("success", "인증 코드를 발송했습니다. 5분 이내에 인증 코드를 입력하세요.");
    } catch (error) {
      setMessage("error", error?.message || "인증 코드를 발송하지 못했습니다.");
    } finally {
      state.verification.isSending = false;
      render();
    }
  }

  async function verifyCode() {
    resetMessage();

    if (Number(state.verification.expiresAt || 0) > 0 && isVerificationCodeExpired()) {
      setMessage("error", "인증 코드가 만료되었습니다. 새 코드를 다시 발송하세요.");
      render();
      return;
    }

    state.verification.isVerifying = true;
    render();

    try {
      const payload = await apiRequest("/api/public/email-verifications/verify", {
        method: "POST",
        body: JSON.stringify({
          name: state.verification.name,
          email: state.verification.email,
          code: state.verification.code,
        }),
      });
      applySubmissionContext({
        accessToken: payload?.accessToken || "",
        submission: payload?.submission || {
          name: state.verification.name,
          email: state.verification.email,
        },
        source: "apply",
      });
      state.verification.expiresAt = 0;
      setMessage("success", hasApplicantRecruitmentSelectionStep() ? "이메일 인증이 완료되었습니다. 접수 신청 정보를 선택하세요." : "이메일 인증이 완료되었습니다. 접수를 진행하세요.");
      navigateToApplicantMode(getApplicantFlowEntryMode());
      return;
    } catch (error) {
      setMessage("error", error?.message || "이메일 인증에 실패했습니다.");
    } finally {
      state.verification.isVerifying = false;
      if (state.mode === "verify") {
        render();
      }
    }
  }

  async function saveApplication() {
    resetMessage();

    if (hasApplicantRecruitmentSelectionStep() && !hasCompletedApplicantRecruitmentSelection()) {
      setMessage("error", "접수 신청 정보를 먼저 선택하세요.");
      return;
    }

    const hasExistingPassword = state.currentSubmission?.hasPassword === true;
    const passwordValue = String(state.application.password || "");
    const passwordConfirmValue = String(state.application.passwordConfirm || "");
    state.application.passwordConfirmTouched = true;
    syncApplicantPasswordConfirmValidationUI();

    if (!passwordValue.trim()) {
      if (!hasExistingPassword) {
        setMessage("error", "비밀번호를 입력하세요.");
        render();
        return;
      }

      if (passwordConfirmValue.trim()) {
        setMessage("error", "변경할 비밀번호를 입력하세요.");
        render();
        return;
      }
    }

    if (passwordValue.trim()) {
      if (passwordValue.length < 4) {
        setMessage("error", "비밀번호는 4자 이상이어야 합니다.");
        render();
        return;
      }

      if (passwordValue.length > 100) {
        setMessage("error", "비밀번호는 100자 이하여야 합니다.");
        render();
        return;
      }

      if (!passwordConfirmValue.trim()) {
        setMessage("error", "비밀번호 확인을 입력하세요.");
        render();
        return;
      }

      if (passwordValue !== passwordConfirmValue) {
        setMessage("error", "비밀번호 확인이 일치하지 않습니다.");
        render();
        return;
      }
    }

    state.isSaving = true;
    render();

    try {
      const payload = await apiRequest("/api/public/applications", {
        method: "POST",
        body: JSON.stringify({
          accessToken: state.identity.accessToken,
          submissionId: state.identity.submissionId || state.currentSubmission?.id || 0,
          password: state.application.password,
          selectionAnswers: buildApplicantRecruitmentSelectionPayload(),
          answers: await buildSubmissionPayloadAnswers(),
        }),
      });
      applySubmissionContext({
        accessToken: state.identity.accessToken,
        submission: payload,
        source: state.identity.source || "apply",
      });
      state.application.passwordConfirm = "";
      state.application.passwordConfirmTouched = false;
      setMessage("success", "접수가 정상적으로 저장되었습니다.");
      navigateToApplicantMode("result");
      return;
    } catch (error) {
      setMessage("error", error?.message || "접수 저장에 실패했습니다.");
    } finally {
      state.isSaving = false;
      if (state.mode === "form") {
        render();
      }
    }
  }

  async function lookupSubmission() {
    resetMessage();
    const lookupTarget = normalizeApplicantLookupTarget(state.lookup.target);
    const lookupAvailabilityState = getApplicantLookupActionAvailabilityState(lookupTarget);

    if (!lookupAvailabilityState.isAvailable) {
      setMessage("error", getApplicantLookupActionDisabledMessage(lookupTarget, lookupAvailabilityState));
      render();
      return;
    }

    state.lookup.isLoading = true;
    render();

    try {
      const payload = await apiRequest("/api/public/applications/lookup", {
        method: "POST",
        body: JSON.stringify({
          lookupTarget,
          name: state.lookup.name,
          email: state.lookup.email,
          password: state.lookup.password,
        }),
      });
      state.lookup.password = "";
      applySubmissionContext({
        accessToken: payload?.accessToken || "",
        submission: payload?.submission,
        source: "lookup",
      });
      navigateToApplicantMode(getApplicantLookupResultMode(lookupTarget));
      return;
    } catch (error) {
      setMessage("error", error?.message || "접수 이력을 찾지 못했습니다.");
    } finally {
      state.lookup.isLoading = false;
      if (state.mode === "lookup") {
        render();
      }
    }
  }

  root.addEventListener("click", async (event) => {
    const clickedElement = event.target instanceof Element ? event.target : null;
    const nationalityOption = clickedElement?.closest("[data-applicant-nationality-value]");

    if (nationalityOption instanceof HTMLElement) {
      const fieldKey = String(nationalityOption.dataset.applicantNationalityFieldKey || "").trim();
      const optionValue = String(nationalityOption.dataset.applicantNationalityValue || "").trim();

      if (fieldKey && optionValue) {
        state.draftAnswers[fieldKey] = optionValue;
      }

      const inputElement = findApplicantFieldElement(fieldKey);
      closeNationalityPicker();
      syncNationalityFieldUI(fieldKey);
      persistApplicantPublicState();

      if (inputElement instanceof HTMLInputElement) {
        inputElement.focus();
      }

      return;
    }

    const openNationalityFieldKey = state.nationalityPicker.openFieldKey;

    if (!clickedElement?.closest(".applicant-public-nationality-field") && openNationalityFieldKey) {
      closeNationalityPicker();
      syncNationalityFieldUI(openNationalityFieldKey);
    }

    const target = clickedElement ? clickedElement.closest("[data-applicant-action]") : null;

    if (!target) {
      return;
    }

    const action = String(target.dataset.applicantAction || "").trim();

    if (action === "go-verify") {
      const applyAvailabilityState = getApplicantApplyAvailabilityState();

      if (!applyAvailabilityState.isAvailable) {
        setMessage("error", getApplicantApplyDisabledMessage(applyAvailabilityState));
        render();
        return;
      }

      resetMessage();
      navigateToApplicantMode("verify");
      return;
    }

    if (action === "go-lookup-summary") {
      state.lookup.target = APPLICANT_LOOKUP_TARGETS.result;
      resetMessage();
      navigateToApplicantMode("lookup");
      return;
    }

    if (action === "go-lookup" || action === "go-lookup-ticket") {
      state.lookup.target = APPLICANT_LOOKUP_TARGETS.ticket;
      const lookupAvailabilityState = getApplicantLookupAvailabilityState();

      if (!lookupAvailabilityState.isAvailable) {
        setMessage("error", getApplicantLookupDisabledMessage(lookupAvailabilityState));
        render();
        return;
      }

      resetMessage();
      navigateToApplicantMode("lookup");
      return;
    }

    if (action === "go-admission-home") {
      const admissionHomepageUrl = resolveAdmissionHomepageUrl();

      if (!admissionHomepageUrl) {
        setMessage("error", "입학처 홈페이지 링크가 아직 설정되지 않았습니다.");
        render();
        return;
      }

      window.open(admissionHomepageUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (action === "back-home" || action === "confirm-result") {
      resetToHome();
      return;
    }

    if (action === "back-verify") {
      resetMessage();
      navigateToApplicantMode("verify");
      return;
    }

    if (action === "continue-application") {
      resetMessage();

      if (!hasCompletedApplicantRecruitmentSelection()) {
        const nextRequiredField =
          APPLICANT_RECRUITMENT_SELECTION_FIELDS.find((definition) => {
            const options = getApplicantRecruitmentSelectionOptions(definition.key, state.recruitment);

            if (options.length === 0) {
              return false;
            }

            const selectedValue = String(state.recruitment?.[definition.key] || "").trim();
            return !selectedValue || !options.includes(selectedValue);
          }) || null;

        setMessage("error", `${nextRequiredField?.label || "접수 신청 정보"}을(를) 선택하세요.`);
        return;
      }

      syncApplicantRecruitmentSelectionIntoDraftAnswers();
      navigateToApplicantMode("form");
      return;
    }

    if (action === "back-form") {
      resetMessage();
      navigateToApplicantMode(getApplicantFormBackMode());
      return;
    }

    if (action === "preview-home") {
      resetMessage();
      navigateToApplicantMode("home");
      return;
    }

    if (action === "back-lookup-result") {
      resetMessage();
      navigateToApplicantMode(getApplicantLookupResultMode());
      return;
    }

    if (action === "edit-application") {
      resetMessage();
      state.application.password = "";
      state.application.passwordConfirm = "";
      state.application.passwordConfirmTouched = false;
      state.draftAnswers = buildDraftAnswers(state.currentSubmission);
      state.recruitment = getApplicantRecruitmentSelectionFromSubmission(state.currentSubmission);
      syncApplicantRecruitmentSelection({ preserveExisting: true });
      syncApplicantRecruitmentSelectionIntoDraftAnswers();
      syncApplicantFieldUiState({ preserveExisting: false });
      closeNationalityPicker();
      navigateToApplicantMode(getApplicantFlowEntryMode());
      return;
    }

    if (action === "send-code") {
      await sendVerificationCode();
    }
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;

    if (!form) {
      return;
    }

    if (form.matches("[data-applicant-form='verify-code']")) {
      event.preventDefault();
      await verifyCode();
      return;
    }

    if (form.matches("[data-applicant-form='application']")) {
      event.preventDefault();

      if (APPLICANT_IS_PREVIEW_MODE) {
        setMessage("error", "미리보기 화면에서는 접수를 저장할 수 없습니다.");
        return;
      }

      await saveApplication();
      return;
    }

    if (form.matches("[data-applicant-form='lookup']")) {
      event.preventDefault();
      await lookupSubmission();
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement
      ? event.target
      : null;

    if (!target) {
      return;
    }

    if (target.dataset.applicantModel === "verification.name") {
      state.verification.name = target.value;
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantModel === "verification.email") {
      state.verification.email = target.value;
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantModel === "verification.code") {
      state.verification.code = target.value;
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantModel === "lookup.name") {
      state.lookup.name = target.value;
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantModel === "lookup.email") {
      state.lookup.email = target.value;
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantModel === "lookup.password") {
      state.lookup.password = target.value;
      return;
    }

    if (target.dataset.applicantModel === "application.password") {
      state.application.password = target.value;
      if (state.application.passwordConfirmTouched) {
        syncApplicantPasswordConfirmValidationUI();
      }
      persistApplicantPublicState();
      return;
    }

    if (String(target.dataset.applicantModel || "").startsWith("recruitment.")) {
      const recruitmentKey = String(target.dataset.applicantModel || "").replace("recruitment.", "").trim();
      const definition = APPLICANT_RECRUITMENT_SELECTION_FIELDS.find((field) => field.key === recruitmentKey) || null;

      if (!definition) {
        return;
      }

      state.recruitment[recruitmentKey] = target.value;
      const changedFieldIndex = APPLICANT_RECRUITMENT_SELECTION_FIELDS.findIndex((field) => field.key === recruitmentKey);

      for (let index = changedFieldIndex + 1; index < APPLICANT_RECRUITMENT_SELECTION_FIELDS.length; index += 1) {
        state.recruitment[APPLICANT_RECRUITMENT_SELECTION_FIELDS[index].key] = "";
      }

      syncApplicantRecruitmentSelection({ preserveExisting: true });
      syncApplicantRecruitmentSelectionIntoDraftAnswers();
      persistApplicantPublicState();
      render();
      document.getElementById(target.id)?.focus();
      return;
    }

    if (target.dataset.applicantModel === "application.passwordConfirm") {
      state.application.passwordConfirm = target.value;
      if (state.application.passwordConfirmTouched) {
        syncApplicantPasswordConfirmValidationUI();
      }
      persistApplicantPublicState();
      return;
    }

    const customSelectFieldKey = String(target.dataset.applicantSelectCustomFieldKey || "").trim();

    if (customSelectFieldKey) {
      state.draftAnswers[customSelectFieldKey] = target.value;
      persistApplicantPublicState();
      return;
    }

    const fieldKey = String(target.dataset.applicantFieldKey || "").trim();

    if (!fieldKey) {
      return;
    }

    if (target.dataset.applicantSelectSource === "true") {
      return;
    }

    if (target.dataset.applicantFieldType === "nationality") {
      state.draftAnswers[fieldKey] = target.value;
      state.nationalityPicker.openFieldKey = fieldKey;
      syncNationalityFieldUI(fieldKey);
      persistApplicantPublicState();
      return;
    }

    if (target.dataset.applicantFieldType === "phone") {
      const normalizedPhoneValue = String(target.value || "").replace(/\D+/g, "");
      target.value = normalizedPhoneValue;
      state.draftAnswers[fieldKey] = normalizedPhoneValue;
      persistApplicantPublicState();
      return;
    }

    state.draftAnswers[fieldKey] = target.value;
    persistApplicantPublicState();
  });

  root.addEventListener("change", (event) => {
    const element =
      event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement
        ? event.target
        : null;

    if (!element) {
      return;
    }

    if (String(element.dataset.applicantModel || "").startsWith("recruitment.")) {
      const mirroredInputEvent = new Event("input", { bubbles: true });
      element.dispatchEvent(mirroredInputEvent);
      return;
    }

    const dateFieldKey = String(element.dataset.applicantDateFieldKey || "").trim();
    const datePart = String(element.dataset.applicantDatePart || "").trim();

    if (dateFieldKey && datePart) {
      const nextParts = {
        ...getApplicantDatePartState(dateFieldKey),
        [datePart]: String(element.value || "").trim(),
      };
      const maxDay = getApplicantDateDayCount(nextParts.year, nextParts.month);

      if (nextParts.day && Number(nextParts.day) > maxDay) {
        nextParts.day = "";
      }

      state.fieldUi.dateParts[dateFieldKey] = nextParts;
      state.draftAnswers[dateFieldKey] = buildApplicantDateValueFromParts(nextParts);
      persistApplicantPublicState();
      render();
      document.getElementById(element.id)?.focus();
      return;
    }

    if (element instanceof HTMLInputElement && element.type === "file") {
      const fieldKey = String(element.dataset.applicantFieldKey || "").trim();
      const file = element.files?.[0] || null;

      if (!fieldKey) {
        return;
      }

      state.draftAnswers[fieldKey] = file
        ? {
            file,
            fileName: file.name,
            hasPhoto: true,
          }
        : {
            hasPhoto: false,
            fileName: "",
          };
      persistApplicantPublicState();
      render();
      return;
    }

    const fieldKey = String(element.dataset.applicantFieldKey || "").trim();

    if (fieldKey) {
      if (element.dataset.applicantSelectSource === "true") {
        const field = getApplicantFormFieldByKey(fieldKey);
        const fieldOptions = Array.isArray(field?.options) ? field.options : [];
        const customOptionLabel = String(field?.customOptionLabel || "").trim();
        const hasLinkedCustomOption =
          field?.allowCustomOption === true && customOptionLabel !== "" && fieldOptions.includes(customOptionLabel);

        if (element.value === APPLICANT_CUSTOM_SELECT_VALUE || (hasLinkedCustomOption && element.value === customOptionLabel)) {
          state.fieldUi.customSelectModes[fieldKey] = true;

          const currentDraftValue = String(state.draftAnswers[fieldKey] || "").trim();

          if (!currentDraftValue || currentDraftValue === customOptionLabel || fieldOptions.includes(currentDraftValue)) {
            state.draftAnswers[fieldKey] = "";
          }

          persistApplicantPublicState();
          render();
          document.getElementById(`field-${fieldKey}-custom`)?.focus();
          return;
        }

        delete state.fieldUi.customSelectModes[fieldKey];
        state.draftAnswers[fieldKey] = element.value;
        persistApplicantPublicState();
        render();
        document.getElementById(element.id)?.focus();
        return;
      }

      if (element.dataset.applicantFieldType === "phone") {
        const normalizedPhoneValue = String(element.value || "").replace(/\D+/g, "");
        element.value = normalizedPhoneValue;
        state.draftAnswers[fieldKey] = normalizedPhoneValue;
        persistApplicantPublicState();
        return;
      }

      if (element.dataset.applicantFieldType === "nationality") {
        state.draftAnswers[fieldKey] = element.value;
        persistApplicantPublicState();
        return;
      }

      state.draftAnswers[fieldKey] = element.value;
      persistApplicantPublicState();
    }
  });

  root.addEventListener("focusin", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    const fieldKey = String(target?.dataset?.applicantFieldKey || "").trim();

    if (!target || target.dataset.applicantFieldType !== "nationality" || !fieldKey) {
      return;
    }

    if (state.nationalityPicker.openFieldKey === fieldKey) {
      return;
    }

    state.nationalityPicker.openFieldKey = fieldKey;
    syncNationalityFieldUI(fieldKey);
  });

  root.addEventListener("focusout", (event) => {
    const passwordConfirmInput =
      event.target instanceof HTMLInputElement && event.target.dataset.applicantModel === "application.passwordConfirm"
        ? event.target
        : null;

    if (passwordConfirmInput) {
      state.application.passwordConfirmTouched = true;
      syncApplicantPasswordConfirmValidationUI();
    }

    const currentTarget = event.target instanceof Element ? event.target.closest(".applicant-public-nationality-field") : null;

    if (!currentTarget) {
      return;
    }

    const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null;

    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }

    const fieldInput = currentTarget.querySelector("[data-applicant-field-key]");
    const fieldKey = String(fieldInput?.dataset?.applicantFieldKey || "").trim();

    if (!fieldKey || state.nationalityPicker.openFieldKey !== fieldKey) {
      return;
    }

    normalizeNationalityDraftValue(fieldKey);
    closeNationalityPicker();
    syncNationalityFieldUI(fieldKey);
  });

  window.addEventListener("popstate", () => {
    applyApplicantRouteFromLocation();
  });

  const initialMode = getApplicantModeFromPathname(window.location.pathname);

  if (["verify", "apply", "form"].includes(initialMode) && !(APPLICANT_IS_PREVIEW_MODE && initialMode === "form")) {
    window.sessionStorage.removeItem(APPLICANT_PUBLIC_STATE_STORAGE_KEY);
    window.location.replace(APPLICANT_ROUTE_PATHS.home);
    return;
  }

  restoreApplicantPublicState();
  state.mode = getApplicantModeFromPathname(window.location.pathname);
  syncApplicantRoute({ replace: true });
  render();
  loadFormConfig();
})();
