(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardApplicantFormConfig = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const applicantNationalityRegionCodes = Object.freeze([
    "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
    "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
    "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
    "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
    "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
    "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
    "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
    "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
    "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
    "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
    "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
    "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
    "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
    "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
    "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
  ]);

  function createRegionNameResolver(locale) {
    try {
      return typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames([locale], { type: "region" })
        : null;
    } catch (error) {
      return null;
    }
  }

  function buildApplicantNationalityOptions() {
    const koreanResolver = createRegionNameResolver("ko");
    const englishResolver = createRegionNameResolver("en");

    return Object.freeze(
      applicantNationalityRegionCodes
        .map((code) => {
          const label = String(koreanResolver?.of(code) || code).trim();
          const englishLabel = String(englishResolver?.of(code) || "").trim();

          return Object.freeze({
            key: code,
            code,
            label,
            englishLabel,
            searchLabel: [label, englishLabel, code].filter(Boolean).join(" ").toLowerCase(),
          });
        })
        .filter((option) => option.label)
        .sort((left, right) => left.label.localeCompare(right.label, "ko")),
    );
  }

  const nationalityOptions = buildApplicantNationalityOptions();

  function findApplicantNationalityOption(value = "") {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return null;
    }

    const upperValue = normalizedValue.toUpperCase();
    const lowerValue = normalizedValue.toLowerCase();
    const exactMatch =
      nationalityOptions.find((option) => option.code === upperValue) ||
      nationalityOptions.find((option) => option.label === normalizedValue) ||
      nationalityOptions.find((option) => option.searchLabel === lowerValue);

    if (exactMatch) {
      return exactMatch;
    }

    const partialMatches = nationalityOptions.filter((option) => option.searchLabel.includes(lowerValue));
    return partialMatches.length === 1 ? partialMatches[0] : null;
  }

  function isApplicantNationalityValue(value = "") {
    return Boolean(findApplicantNationalityOption(value));
  }

  const answerTypeOptions = Object.freeze([
    Object.freeze({ key: "text", label: "텍스트" }),
    Object.freeze({ key: "phone", label: "전화번호" }),
    Object.freeze({ key: "nationality", label: "국적" }),
    Object.freeze({ key: "select", label: "선택지" }),
    Object.freeze({ key: "date", label: "날짜" }),
    Object.freeze({ key: "birthdate", label: "생년월일" }),
    Object.freeze({ key: "photo", label: "사진 업로드" }),
    Object.freeze({ key: "file", label: "파일 업로드" }),
  ]);

  const systemFieldOptions = Object.freeze([
    Object.freeze({ key: "", label: "일반 항목" }),
    Object.freeze({ key: "name", label: "이름" }),
    Object.freeze({ key: "birth", label: "생년월일" }),
    Object.freeze({ key: "date", label: "시험날짜" }),
    Object.freeze({ key: "time", label: "시간" }),
    Object.freeze({ key: "track", label: "모집시기" }),
    Object.freeze({ key: "admission", label: "전형" }),
    Object.freeze({ key: "series", label: "계열" }),
    Object.freeze({ key: "unit", label: "모집단위" }),
    Object.freeze({ key: "major", label: "전공" }),
    Object.freeze({ key: "building", label: "고사건물" }),
    Object.freeze({ key: "room", label: "고사실" }),
    Object.freeze({ key: "group", label: "조" }),
    Object.freeze({ key: "photo", label: "수험생 사진" }),
  ]);

  const applicantStatusOptions = Object.freeze([
    Object.freeze({ key: "submitted", label: "접수 완료" }),
    Object.freeze({ key: "promoted", label: "배정 완료" }),
  ]);

  const defaultApplicantExamNoPattern = "AD-{YY}{MM}{DD}-{SEQ:4}";
  const defaultApplicantExamNoSequenceStart = 1;
  const protectedApplicantSystemFields = Object.freeze(["name"]);

  const answerTypeLabelMap = Object.freeze(
    answerTypeOptions.reduce(
      (map, option) => {
        map[option.key] = option.label;
        return map;
      },
      {
        textarea: "긴 텍스트",
        time: "시간",
      },
    ),
  );
  const systemFieldLabelMap = Object.freeze(
    systemFieldOptions.reduce((map, option) => {
      map[option.key] = option.label;
      return map;
    }, {}),
  );
  const applicantStatusLabelMap = Object.freeze(
    applicantStatusOptions.reduce((map, option) => {
      map[option.key] = option.label;
      return map;
    }, {}),
  );

  function getApplicantAnswerTypeLabel(answerType = "") {
    return answerTypeLabelMap[String(answerType || "").trim()] || "텍스트";
  }

  function getApplicantSystemFieldLabel(systemFieldKey = "") {
    return systemFieldLabelMap[String(systemFieldKey || "").trim()] || "일반 항목";
  }

  function normalizeApplicantScheduleDateTime(value = "") {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return "";
    }

    const matchedValue = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

    if (!matchedValue) {
      return "";
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = matchedValue;
    const parsedDate = new Date(
      Number(yearValue),
      Number(monthValue) - 1,
      Number(dayValue),
      Number(hourValue),
      Number(minuteValue),
      0,
      0,
    );

    if (
      parsedDate.getFullYear() !== Number(yearValue) ||
      parsedDate.getMonth() + 1 !== Number(monthValue) ||
      parsedDate.getDate() !== Number(dayValue) ||
      parsedDate.getHours() !== Number(hourValue) ||
      parsedDate.getMinutes() !== Number(minuteValue)
    ) {
      return "";
    }

    return `${yearValue}-${monthValue}-${dayValue}T${hourValue}:${minuteValue}`;
  }

  function getApplicantScheduleTimestamp(value = "", { inclusiveEndMinute = false } = {}) {
    const normalizedValue = normalizeApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return NaN;
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] =
      normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/) || [];

    return new Date(
      Number(yearValue),
      Number(monthValue) - 1,
      Number(dayValue),
      Number(hourValue),
      Number(minuteValue),
      inclusiveEndMinute ? 59 : 0,
      inclusiveEndMinute ? 999 : 0,
    ).getTime();
  }

  function resolveApplicantScheduleCriteria(value = {}) {
    return {
      trackName: String(value.trackName ?? value.track ?? "").trim(),
      admissionCode: String(value.admissionCode ?? "").trim(),
      admissionName: String(value.admissionName ?? value.admission ?? "").trim(),
      scheduleKey: String(value.scheduleKey ?? "").trim(),
    };
  }

  function findApplicantScheduleRecord(schedules = [], value = {}) {
    const criteria = resolveApplicantScheduleCriteria(value);
    const normalizedSchedules = Array.isArray(schedules) ? schedules : [];

    if (criteria.scheduleKey) {
      return normalizedSchedules.find((schedule) => String(schedule?.scheduleKey || "").trim() === criteria.scheduleKey) || null;
    }

    const filteredSchedules = normalizedSchedules.filter(
      (schedule) =>
        String(schedule?.trackName || "").trim() === criteria.trackName &&
        String(schedule?.admissionName || "").trim() === criteria.admissionName,
    );

    if (criteria.admissionCode) {
      return filteredSchedules.find((schedule) => String(schedule?.admissionCode || "").trim() === criteria.admissionCode) || null;
    }

    return filteredSchedules[0] || null;
  }

  function buildApplicantScheduleContextLabel(value = {}) {
    const criteria = resolveApplicantScheduleCriteria(value);
    const labelParts = [criteria.trackName, criteria.admissionName || criteria.admissionCode].filter(Boolean);
    return labelParts.length > 0 ? labelParts.join(" / ") : "선택한 전형";
  }

  function buildApplicantScheduleWindowState(startAt, endAt, referenceDate = new Date()) {
    const normalizedStartAt = normalizeApplicantScheduleDateTime(startAt);
    const normalizedEndAt = normalizeApplicantScheduleDateTime(endAt);

    if (!normalizedStartAt || !normalizedEndAt) {
      return {
        isConfigured: false,
        isOpen: false,
        reason: "not_configured",
      };
    }

    const currentTimestamp = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const startTimestamp = getApplicantScheduleTimestamp(normalizedStartAt);
    const endTimestamp = getApplicantScheduleTimestamp(normalizedEndAt, {
      inclusiveEndMinute: true,
    });

    if (!Number.isFinite(currentTimestamp) || !Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      return {
        isConfigured: true,
        isOpen: false,
        reason: "invalid",
      };
    }

    if (currentTimestamp < startTimestamp) {
      return {
        isConfigured: true,
        isOpen: false,
        reason: "before_start",
      };
    }

    if (currentTimestamp > endTimestamp) {
      return {
        isConfigured: true,
        isOpen: false,
        reason: "after_end",
      };
    }

    return {
      isConfigured: true,
      isOpen: true,
      reason: "open",
    };
  }

  function getApplicantSubmissionScheduleState(schedule = {}, referenceDate = new Date()) {
    const applicantScheduleStartAt = normalizeApplicantScheduleDateTime(schedule?.applicantScheduleStartAt);
    const applicantScheduleEndAt = normalizeApplicantScheduleDateTime(schedule?.applicantScheduleEndAt);

    return {
      applicantScheduleStartAt,
      applicantScheduleEndAt,
      ...buildApplicantScheduleWindowState(applicantScheduleStartAt, applicantScheduleEndAt, referenceDate),
    };
  }

  function getApplicantAdmitCardLookupScheduleState(schedule = {}, referenceDate = new Date()) {
    const admitCardLookupScheduleStartAt = normalizeApplicantScheduleDateTime(schedule?.admitCardLookupScheduleStartAt);
    const admitCardLookupScheduleEndAt = normalizeApplicantScheduleDateTime(schedule?.admitCardLookupScheduleEndAt);

    return {
      admitCardLookupScheduleStartAt,
      admitCardLookupScheduleEndAt,
      ...buildApplicantScheduleWindowState(admitCardLookupScheduleStartAt, admitCardLookupScheduleEndAt, referenceDate),
    };
  }

  function getApplicantAggregateScheduleState(schedules = [], scheduleType = "submission", referenceDate = new Date()) {
    const normalizedSchedules = Array.isArray(schedules) ? schedules : [];
    const scheduleStateResolver =
      scheduleType === "lookup" ? getApplicantAdmitCardLookupScheduleState : getApplicantSubmissionScheduleState;
    const configuredStates = normalizedSchedules
      .map((schedule) => scheduleStateResolver(schedule, referenceDate))
      .filter((scheduleState) => scheduleState.isConfigured);

    if (configuredStates.some((scheduleState) => scheduleState.isOpen)) {
      return configuredStates.find((scheduleState) => scheduleState.isOpen) || scheduleStateResolver({}, referenceDate);
    }

    if (configuredStates.length === 0) {
      return scheduleStateResolver({}, referenceDate);
    }

    const beforeStartStates = configuredStates
      .filter((scheduleState) => scheduleState.reason === "before_start")
      .sort((leftState, rightState) => {
        const leftTimestamp = getApplicantScheduleTimestamp(
          scheduleType === "lookup" ? leftState.admitCardLookupScheduleStartAt : leftState.applicantScheduleStartAt,
        );
        const rightTimestamp = getApplicantScheduleTimestamp(
          scheduleType === "lookup" ? rightState.admitCardLookupScheduleStartAt : rightState.applicantScheduleStartAt,
        );
        return leftTimestamp - rightTimestamp;
      });

    if (beforeStartStates.length > 0) {
      return beforeStartStates[0];
    }

    const afterEndStates = configuredStates
      .filter((scheduleState) => scheduleState.reason === "after_end")
      .sort((leftState, rightState) => {
        const leftTimestamp = getApplicantScheduleTimestamp(
          scheduleType === "lookup" ? leftState.admitCardLookupScheduleEndAt : leftState.applicantScheduleEndAt,
          { inclusiveEndMinute: true },
        );
        const rightTimestamp = getApplicantScheduleTimestamp(
          scheduleType === "lookup" ? rightState.admitCardLookupScheduleEndAt : rightState.applicantScheduleEndAt,
          { inclusiveEndMinute: true },
        );
        return rightTimestamp - leftTimestamp;
      });

    return afterEndStates[0] || configuredStates[0];
  }

  function buildApplicantScheduleRangeLabel(scheduleState = {}, scheduleType = "submission") {
    if (scheduleType === "lookup") {
      return scheduleState.isConfigured && scheduleState.admitCardLookupScheduleStartAt && scheduleState.admitCardLookupScheduleEndAt
        ? `${scheduleState.admitCardLookupScheduleStartAt} ~ ${scheduleState.admitCardLookupScheduleEndAt}`
        : "";
    }

    return scheduleState.isConfigured && scheduleState.applicantScheduleStartAt && scheduleState.applicantScheduleEndAt
      ? `${scheduleState.applicantScheduleStartAt} ~ ${scheduleState.applicantScheduleEndAt}`
      : "";
  }

  function isApplicantScheduleOpen(options = {}) {
    const normalizedOptions = options && typeof options === "object" ? options : {};

    if (typeof normalizedOptions.isApplicantScheduleOpen === "boolean") {
      return normalizedOptions.isApplicantScheduleOpen;
    }

    if (typeof normalizedOptions.scheduleState?.isOpen === "boolean") {
      return normalizedOptions.scheduleState.isOpen;
    }

    const scheduleStartAt = String(normalizedOptions.applicantScheduleStartAt || "").trim();
    const scheduleEndAt = String(normalizedOptions.applicantScheduleEndAt || "").trim();
    const referenceValue = normalizedOptions.referenceDate ?? new Date();
    const referenceTimestamp = referenceValue instanceof Date ? referenceValue.getTime() : new Date(referenceValue).getTime();

    if (!scheduleStartAt || !scheduleEndAt || !Number.isFinite(referenceTimestamp)) {
      return false;
    }

    const parsedStartDate = new Date(scheduleStartAt);
    const parsedEndDate = new Date(scheduleEndAt);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return false;
    }

    return referenceTimestamp >= parsedStartDate.getTime() && referenceTimestamp <= parsedEndDate.getTime() + (60 * 1000 - 1);
  }

  function getApplicantStatusLabel(status = "", options = {}) {
    const normalizedStatus = String(status || "").trim();
    const isScheduleOpen = isApplicantScheduleOpen(options);

    if (normalizedStatus === "promoted") {
      return applicantStatusLabelMap.promoted || "배정 완료";
    }

    return isScheduleOpen ? "접수 중" : applicantStatusLabelMap.submitted || "접수 완료";
  }

  return Object.freeze({
    answerTypeOptions,
    applicantNationalityRegionCodes,
    applicantStatusOptions,
    defaultApplicantExamNoPattern,
    defaultApplicantExamNoSequenceStart,
    findApplicantNationalityOption,
    findApplicantScheduleRecord,
    getApplicantAdmitCardLookupScheduleState,
    getApplicantAggregateScheduleState,
    getApplicantAnswerTypeLabel,
    getApplicantScheduleTimestamp,
    getApplicantStatusLabel,
    getApplicantSubmissionScheduleState,
    getApplicantSystemFieldLabel,
    isApplicantScheduleOpen,
    isApplicantNationalityValue,
    nationalityOptions,
    normalizeApplicantScheduleDateTime,
    protectedApplicantSystemFields,
    resolveApplicantScheduleCriteria,
    systemFieldOptions,
    buildApplicantScheduleContextLabel,
    buildApplicantScheduleRangeLabel,
  });
});
