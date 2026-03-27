function createSystemSettingsService({
  createHttpError,
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
  maxAutoLogoutMinutes,
  query,
}) {
  const defaultApplicantExamNoDigitCount = 10;
  const maxApplicantExamNoDigitCount = 30;
  const defaultApplicantExamNoComponents = Object.freeze(["admissionCode", "seriesCode", "unitCode", "sequence", ""]);
  const allowedApplicantExamNoComponents = new Set(["", "admissionCode", "seriesCode", "unitCode", "nationalityCode", "sequence"]);
  const defaultAdmitCardDataSource = "examinee";
  const allowedAdmitCardDataSources = new Set(["submission", "examinee"]);
  const applicantScheduleDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

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

  function parseSystemInitialPassword(value) {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || defaultInitialPassword;
  }

  function parseAutoLogoutMinutes(value) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      return defaultAutoLogoutMinutes;
    }

    return Math.min(maxAutoLogoutMinutes, normalizedValue);
  }

  function parseAdmissionHomepageUrl(value) {
    return String(value ?? "").trim();
  }

  function parseApplicantScheduleDateTime(value, { defaultValue = "" } = {}) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      return defaultValue;
    }

    const matchedValue = normalizedValue.match(applicantScheduleDateTimePattern);

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

  function getApplicantScheduleTimestamp(value) {
    const normalizedValue = parseApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return NaN;
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = normalizedValue.match(applicantScheduleDateTimePattern) || [];
    return new Date(
      Number(yearValue),
      Number(monthValue) - 1,
      Number(dayValue),
      Number(hourValue),
      Number(minuteValue),
      0,
      0,
    ).getTime();
  }

  function parseRequiredApplicantScheduleRange(scheduleLabel, startValue, endValue) {
    const startAt = parseApplicantScheduleDateTime(startValue);
    const endAt = parseApplicantScheduleDateTime(endValue);

    if (!startAt || !endAt) {
      throw createHttpError(400, `${scheduleLabel}은 반드시 설정해야 합니다.`, "APPLICANT_SCHEDULE_REQUIRED");
    }

    const startTimestamp = getApplicantScheduleTimestamp(startAt);
    const endTimestamp = getApplicantScheduleTimestamp(endAt);

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      throw createHttpError(400, `${scheduleLabel} 형식이 올바르지 않습니다.`, "APPLICANT_SCHEDULE_INVALID");
    }

    if (startTimestamp > endTimestamp) {
      throw createHttpError(400, `${scheduleLabel}의 시작 일시는 종료 일시보다 늦을 수 없습니다.`, "APPLICANT_SCHEDULE_RANGE_INVALID");
    }

    return {
      startAt,
      endAt,
    };
  }

  function parseApplicantExamNoDigitCount(value) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
      return defaultApplicantExamNoDigitCount;
    }

    return Math.min(maxApplicantExamNoDigitCount, normalizedValue);
  }

  function parseApplicantExamNoComponents(value) {
    let sourceValues = value;

    if (!Array.isArray(sourceValues)) {
      try {
        sourceValues = JSON.parse(String(value || "[]"));
      } catch (error) {
        sourceValues = [];
      }
    }

    const normalizedValues = Array.from({ length: 5 }, (_, index) => {
      const normalizedValue = String(sourceValues?.[index] ?? "").trim();
      return allowedApplicantExamNoComponents.has(normalizedValue) ? normalizedValue : "";
    });

    return normalizedValues.some(Boolean) ? normalizedValues : [...defaultApplicantExamNoComponents];
  }

  function parseAdmitCardDataSource(value) {
    const normalizedValue = String(value ?? "").trim();
    return allowedAdmitCardDataSources.has(normalizedValue) ? normalizedValue : defaultAdmitCardDataSource;
  }

  function normalizeSystemSettingsRows(rows) {
    const rowsByKey = new Map(
      (Array.isArray(rows) ? rows : []).map((row) => [String(row.settingKey || ""), String(row.settingValue || "")]),
    );
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange();

    return {
      initialPassword: parseSystemInitialPassword(rowsByKey.get("initialPassword")),
      autoLogoutMinutes: parseAutoLogoutMinutes(rowsByKey.get("autoLogoutMinutes")),
      admissionHomepageUrl: parseAdmissionHomepageUrl(rowsByKey.get("admissionHomepageUrl")),
      applicantScheduleStartAt: parseApplicantScheduleDateTime(rowsByKey.get("applicantScheduleStartAt"), {
        defaultValue: defaultApplicantScheduleRange.startAt,
      }),
      applicantScheduleEndAt: parseApplicantScheduleDateTime(rowsByKey.get("applicantScheduleEndAt"), {
        defaultValue: defaultApplicantScheduleRange.endAt,
      }),
      admitCardLookupScheduleStartAt: parseApplicantScheduleDateTime(rowsByKey.get("admitCardLookupScheduleStartAt"), {
        defaultValue: defaultApplicantScheduleRange.startAt,
      }),
      admitCardLookupScheduleEndAt: parseApplicantScheduleDateTime(rowsByKey.get("admitCardLookupScheduleEndAt"), {
        defaultValue: defaultApplicantScheduleRange.endAt,
      }),
      admitCardDataSource: parseAdmitCardDataSource(rowsByKey.get("admitCardDataSource")),
      applicantExamNoDigitCount: parseApplicantExamNoDigitCount(rowsByKey.get("applicantExamNoDigitCount")),
      applicantExamNoComponents: parseApplicantExamNoComponents(rowsByKey.get("applicantExamNoComponentsJson")),
    };
  }

  function normalizeSystemSettingsPayload(payload = {}) {
    const initialPassword = String(payload.initialPassword ?? "").trim();
    const autoLogoutMinutes = Math.round(Number(payload.autoLogoutMinutes));
    const admissionHomepageUrl = parseAdmissionHomepageUrl(payload.admissionHomepageUrl);
    const applicantScheduleRange = parseRequiredApplicantScheduleRange("접수 일정", payload.applicantScheduleStartAt, payload.applicantScheduleEndAt);
    const admitCardLookupScheduleRange = parseRequiredApplicantScheduleRange(
      "수험표 조회 기간",
      payload.admitCardLookupScheduleStartAt,
      payload.admitCardLookupScheduleEndAt,
    );
    const admitCardDataSource = parseAdmitCardDataSource(payload.admitCardDataSource);

    if (!initialPassword) {
      throw createHttpError(400, "초기 비밀번호를 입력하세요.", "INITIAL_PASSWORD_REQUIRED");
    }

    if (initialPassword.length < 4) {
      throw createHttpError(400, "초기 비밀번호는 4자 이상이어야 합니다.", "INITIAL_PASSWORD_TOO_SHORT");
    }

    if (initialPassword.length > 100) {
      throw createHttpError(400, "초기 비밀번호는 100자 이하여야 합니다.", "INITIAL_PASSWORD_TOO_LONG");
    }

    if (!Number.isFinite(autoLogoutMinutes) || autoLogoutMinutes < 0 || autoLogoutMinutes > maxAutoLogoutMinutes) {
      throw createHttpError(
        400,
        `자동 로그아웃 시간은 0분 이상 ${maxAutoLogoutMinutes}분 이하로 입력하세요.`,
        "AUTO_LOGOUT_MINUTES_INVALID",
      );
    }

    if (admissionHomepageUrl.length > 500) {
      throw createHttpError(400, "입학처 홈페이지 링크는 500자 이하여야 합니다.", "ADMISSION_HOMEPAGE_URL_TOO_LONG");
    }

    if (admissionHomepageUrl && !/^https?:\/\/\S+$/i.test(admissionHomepageUrl) && !/^\/\S*$/.test(admissionHomepageUrl)) {
      throw createHttpError(
        400,
        "입학처 홈페이지 링크는 https:// 주소 또는 /경로 형식으로 입력하세요.",
        "ADMISSION_HOMEPAGE_URL_INVALID",
      );
    }

    const applicantExamNoDigitCount = parseApplicantExamNoDigitCount(payload.applicantExamNoDigitCount);
    const applicantExamNoComponents = parseApplicantExamNoComponents(payload.applicantExamNoComponents);
    const selectedComponents = applicantExamNoComponents.filter(Boolean);

    if (selectedComponents.length === 0) {
      throw createHttpError(400, "수험번호 자동 생성 구성 요소를 하나 이상 선택하세요.", "APPLICANT_EXAM_NO_COMPONENTS_REQUIRED");
    }

    if (selectedComponents.filter((value) => value === "sequence").length !== 1) {
      throw createHttpError(400, "수험번호 자동 생성 구성에는 순번을 한 번만 포함해야 합니다.", "APPLICANT_EXAM_NO_SEQUENCE_COMPONENT_REQUIRED");
    }

    if (new Set(selectedComponents).size !== selectedComponents.length) {
      throw createHttpError(400, "수험번호 자동 생성 구성 요소는 중복 없이 선택하세요.", "APPLICANT_EXAM_NO_COMPONENTS_DUPLICATED");
    }

    return {
      initialPassword,
      autoLogoutMinutes,
      admissionHomepageUrl,
      applicantScheduleStartAt: applicantScheduleRange.startAt,
      applicantScheduleEndAt: applicantScheduleRange.endAt,
      admitCardLookupScheduleStartAt: admitCardLookupScheduleRange.startAt,
      admitCardLookupScheduleEndAt: admitCardLookupScheduleRange.endAt,
      admitCardDataSource,
      applicantExamNoDigitCount,
      applicantExamNoComponents,
    };
  }

  async function getSystemSettings() {
    const rows = await query(
      `
        SELECT
          setting_key AS settingKey,
          setting_value AS settingValue
        FROM system_set
        WHERE setting_key IN (
          'initialPassword',
          'autoLogoutMinutes',
          'admissionHomepageUrl',
          'applicantScheduleStartAt',
          'applicantScheduleEndAt',
          'admitCardLookupScheduleStartAt',
          'admitCardLookupScheduleEndAt',
          'admitCardDataSource',
          'applicantExamNoDigitCount',
          'applicantExamNoComponentsJson'
        )
      `,
    );

    return normalizeSystemSettingsRows(rows);
  }

  async function updateSystemSettings(payload) {
    const nextSettings = normalizeSystemSettingsPayload(payload);

    await query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES
          ('initialPassword', ?),
          ('autoLogoutMinutes', ?),
          ('admissionHomepageUrl', ?),
          ('applicantScheduleStartAt', ?),
          ('applicantScheduleEndAt', ?),
          ('admitCardLookupScheduleStartAt', ?),
          ('admitCardLookupScheduleEndAt', ?),
          ('admitCardDataSource', ?),
          ('applicantExamNoDigitCount', ?),
          ('applicantExamNoComponentsJson', ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [
        nextSettings.initialPassword,
        String(nextSettings.autoLogoutMinutes),
        nextSettings.admissionHomepageUrl,
        nextSettings.applicantScheduleStartAt,
        nextSettings.applicantScheduleEndAt,
        nextSettings.admitCardLookupScheduleStartAt,
        nextSettings.admitCardLookupScheduleEndAt,
        nextSettings.admitCardDataSource,
        String(nextSettings.applicantExamNoDigitCount),
        JSON.stringify(nextSettings.applicantExamNoComponents),
      ],
    );

    return getSystemSettings();
  }

  return Object.freeze({
    getSystemSettings,
    normalizeSystemSettingsPayload,
    parseAutoLogoutMinutes,
    parseAdmissionHomepageUrl,
    parseSystemInitialPassword,
    updateSystemSettings,
  });
}

module.exports = {
  createSystemSettingsService,
};
