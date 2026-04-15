const { randomInt, randomUUID } = require("crypto");
const AdmZip = require("adm-zip");
const fs = require("fs");
const ExcelJS = require("exceljs");
const path = require("path");

const applicantFormConfig = require("../../../shared/domain/applicant-form");

const {
  defaultApplicantExamNoPattern,
  defaultApplicantExamNoSequenceStart,
  findApplicantNationalityOption,
  getApplicantStatusLabel: getSharedApplicantStatusLabel,
  protectedApplicantSystemFields,
} = applicantFormConfig;

const APPLICANT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPLICANT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const APPLICANT_TIME_PATTERN = /^\d{2}:\d{2}$/;
const APPLICANT_SCHEDULE_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const APPLICANT_PHONE_PATTERN = /^\d+$/;
const APPLICANT_CODE_PATTERN = /^[A-Z0-9_-]+$/;
const APPLICANT_EXAM_NO_TOKEN_PATTERN = /\{(?:YYYY|YY|MM|DD|SEQ(?::\d{1,2})?|ADMISSION_CODE|SERIES_CODE|UNIT_CODE)\}/g;
const APPLICANT_EXAM_NO_CODE_TOKEN_PATTERN = /\{(?:ADMISSION_CODE|SERIES_CODE|UNIT_CODE)\}/;
const APPLICANT_FORM_INPUT_TYPES = Object.freeze(["text", "textarea", "select", "date", "birthdate", "time", "photo", "file", "phone", "nationality"]);
const APPLICANT_UPLOAD_INPUT_TYPES = Object.freeze(["photo", "file"]);
const APPLICANT_DEFAULT_RECRUITMENT_EXAM_NO_PATTERN = "{ADMISSION_CODE}{SERIES_CODE}{UNIT_CODE}-{SEQ:4}";
const APPLICANT_EXAM_NO_COMPONENT_TYPES = Object.freeze(["admissionCode", "seriesCode", "unitCode", "nationalityCode", "sequence"]);
const APPLICANT_DEFAULT_EXAM_NO_DIGIT_COUNT = 10;
const APPLICANT_MAX_EXAM_NO_DIGIT_COUNT = 30;
const APPLICANT_DEFAULT_EXAM_NO_COMPONENTS = Object.freeze(["admissionCode", "seriesCode", "unitCode", "sequence", ""]);
const APPLICANT_PUBLIC_ACCESS_TYPES = Object.freeze({
  lookup: "lookup",
  verified: "verified",
});
const APPLICANT_PUBLIC_LOOKUP_TARGETS = Object.freeze({
  result: "result",
  ticket: "ticket",
});
const APPLICANT_EMAIL_DELIVERY_STATUSES = Object.freeze({
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
});
const APPLICANT_ADMIT_CARD_DATA_SOURCES = Object.freeze({
  submission: "submission",
  examinee: "examinee",
});
const APPLICANT_PROMOTION_REQUIRED_FIELDS = Object.freeze([
  "date",
  "time",
  "track",
  "admission",
  "series",
  "unit",
  "building",
  "room",
  "name",
  "birth",
]);
const DEFAULT_APPLICANT_FORM_FIELD_SEEDS = Object.freeze([
  Object.freeze({ fieldKey: "applicant-name", questionText: "이름", inputType: "text", systemFieldKey: "name", required: true }),
  Object.freeze({ fieldKey: "exam-date", questionText: "시험날짜", inputType: "date", systemFieldKey: "date", required: true }),
  Object.freeze({ fieldKey: "exam-time", questionText: "시간", inputType: "time", systemFieldKey: "time", required: true }),
  Object.freeze({ fieldKey: "track", questionText: "모집시기", inputType: "text", systemFieldKey: "track", required: true }),
  Object.freeze({ fieldKey: "admission", questionText: "전형", inputType: "text", systemFieldKey: "admission", required: true }),
  Object.freeze({ fieldKey: "series", questionText: "계열", inputType: "text", systemFieldKey: "series", required: true }),
  Object.freeze({ fieldKey: "unit", questionText: "모집단위", inputType: "text", systemFieldKey: "unit", required: true }),
  Object.freeze({ fieldKey: "major", questionText: "전공", inputType: "text", systemFieldKey: "major", required: false }),
  Object.freeze({ fieldKey: "building", questionText: "고사건물", inputType: "text", systemFieldKey: "building", required: true }),
  Object.freeze({ fieldKey: "room", questionText: "고사실", inputType: "text", systemFieldKey: "room", required: true }),
  Object.freeze({ fieldKey: "group", questionText: "조", inputType: "text", systemFieldKey: "group", required: false }),
  Object.freeze({ fieldKey: "birth", questionText: "생년월일", inputType: "birthdate", systemFieldKey: "birth", required: true }),
  Object.freeze({ fieldKey: "photo", questionText: "수험생 사진", inputType: "photo", systemFieldKey: "photo", required: false }),
]);
const APPLICANT_UNIT_TEMPLATE_COLUMNS = Object.freeze([
  Object.freeze({ key: "trackName", header: "모집시기", width: 18, sample: "수시" }),
  Object.freeze({ key: "admissionCode", header: "전형코드", width: 16, sample: "SU" }),
  Object.freeze({ key: "admissionName", header: "전형", width: 18, sample: "수시" }),
  Object.freeze({ key: "seriesCode", header: "계열코드", width: 16, sample: "EN" }),
  Object.freeze({ key: "seriesName", header: "계열", width: 18, sample: "공학계열" }),
  Object.freeze({ key: "unitCode", header: "모집단위코드", width: 18, sample: "CSE" }),
  Object.freeze({ key: "unitName", header: "모집단위", width: 24, sample: "컴퓨터공학부" }),
  Object.freeze({ key: "majorCode", header: "전공코드", width: 16, sample: "SE" }),
  Object.freeze({ key: "majorName", header: "전공", width: 24, sample: "소프트웨어전공" }),
]);
const APPLICANT_ASSIGNMENT_SUMMARY_COLUMNS = Object.freeze([
  Object.freeze({ key: "track", header: "모집시기", width: 18 }),
  Object.freeze({ key: "admission", header: "전형", width: 18 }),
  Object.freeze({ key: "series", header: "계열", width: 18 }),
  Object.freeze({ key: "unit", header: "모집단위", width: 22 }),
  Object.freeze({ key: "major", header: "전공", width: 20 }),
  Object.freeze({ key: "applicantCount", header: "대상인원", width: 12 }),
  Object.freeze({ key: "missingPhotoCount", header: "사진미등록", width: 12 }),
]);
const APPLICANT_ASSIGNMENT_COLUMNS = Object.freeze([
  Object.freeze({ key: "track", header: "모집시기", width: 18 }),
  Object.freeze({ key: "admission", header: "전형", width: 18 }),
  Object.freeze({ key: "series", header: "계열", width: 18 }),
  Object.freeze({ key: "unit", header: "모집단위", width: 22 }),
  Object.freeze({ key: "major", header: "전공", width: 20 }),
  Object.freeze({ key: "date", header: "날짜", width: 14 }),
  Object.freeze({ key: "time", header: "시간", width: 10 }),
  Object.freeze({ key: "buildingCode", header: "고사건물코드", width: 16 }),
  Object.freeze({ key: "building", header: "고사건물", width: 18 }),
  Object.freeze({ key: "roomCode", header: "고사실코드", width: 16 }),
  Object.freeze({ key: "room", header: "고사실", width: 18 }),
  Object.freeze({ key: "assignedCount", header: "배정인원", width: 12 }),
]);
const APPLICANT_PROMOTION_SORT_FIELD_KEYS = Object.freeze(["examineeNo", "admission", "series", "unit", "major"]);
const APPLICANT_PROMOTION_BREAK_FIELD_KEYS = Object.freeze(["admission", "series", "unit", "major"]);
const DEFAULT_APPLICANT_PROMOTION_SORT_FIELDS = Object.freeze(["examineeNo", "unit", ""]);
const DEFAULT_APPLICANT_PROMOTION_BREAK_FIELD = "unit";
const APPLICANT_PROMOTION_CAPACITY_ERROR_MESSAGE = "배정표에 배정 가능한 고사실이 부족합니다.";
const APPLICANT_PROMOTION_FIELD_LABELS = Object.freeze({
  examineeNo: "수험번호",
  track: "모집시기",
  admission: "전형",
  series: "계열",
  unit: "모집단위",
  major: "전공",
});
const APPLICANT_PROMOTION_PREVIEW_COLUMNS = Object.freeze([
  Object.freeze({ key: "examineeNo", header: "수험번호", width: 18 }),
  Object.freeze({ key: "name", header: "이름", width: 16 }),
  Object.freeze({ key: "birth", header: "생년월일", width: 14 }),
  Object.freeze({ key: "track", header: "모집시기", width: 18 }),
  Object.freeze({ key: "admission", header: "전형", width: 18 }),
  Object.freeze({ key: "series", header: "계열", width: 18 }),
  Object.freeze({ key: "unit", header: "모집단위", width: 22 }),
  Object.freeze({ key: "major", header: "전공", width: 20 }),
  Object.freeze({ key: "date", header: "날짜", width: 14 }),
  Object.freeze({ key: "time", header: "시간", width: 10 }),
  Object.freeze({ key: "buildingCode", header: "고사건물코드", width: 16 }),
  Object.freeze({ key: "building", header: "고사건물", width: 18 }),
  Object.freeze({ key: "roomCode", header: "고사실코드", width: 16 }),
  Object.freeze({ key: "room", header: "고사실", width: 18 }),
  Object.freeze({ key: "photoStatusLabel", header: "사진상태", width: 12 }),
  Object.freeze({ key: "statusLabel", header: "상태", width: 14 }),
  Object.freeze({ key: "errorMessage", header: "오류", width: 42 }),
]);
const APPLICANT_PROMOTION_OVERRIDE_KEYS = Object.freeze([
  "date",
  "time",
  "building",
  "buildingCode",
  "room",
  "roomCode",
  "admissionCode",
  "seriesCode",
  "unitCode",
  "majorCode",
]);
const APPLICANT_IMPORT_PREVIEW_ROW_LIMIT = 8;
const APPLICANT_RECRUITMENT_IMPORT_COMPARE_FIELDS = Object.freeze([
  "trackName",
  "admissionCode",
  "admissionName",
  "seriesCode",
  "seriesName",
  "unitCode",
  "unitName",
  "majorCode",
  "majorName",
]);
const APPLICANT_ASSIGNMENT_IMPORT_COMPARE_FIELDS = Object.freeze([
  "track",
  "admission",
  "series",
  "unit",
  "major",
  "date",
  "time",
  "buildingCode",
  "building",
  "roomCode",
  "room",
  "assignedCount",
]);
const APPLICANT_IMPORT_EXISTING_DATA_POLICIES = Object.freeze({
  INSERT_ONLY: "insert-only",
  INSERT_UPDATE: "insert-update",
  ALL: "all",
});
const APPLICANT_RECRUITMENT_UNIT_PAIR_FIELDS = Object.freeze([
  Object.freeze({ codeKey: "admissionCode", nameKey: "admissionName", codeLabel: "전형코드", nameLabel: "전형" }),
  Object.freeze({ codeKey: "seriesCode", nameKey: "seriesName", codeLabel: "계열코드", nameLabel: "계열" }),
  Object.freeze({ codeKey: "unitCode", nameKey: "unitName", codeLabel: "모집단위코드", nameLabel: "모집단위" }),
  Object.freeze({ codeKey: "majorCode", nameKey: "majorName", codeLabel: "전공코드", nameLabel: "전공" }),
]);
const APPLICANT_RECRUITMENT_SELECTION_FIELDS = Object.freeze([
  Object.freeze({ key: "track", fieldKey: "__applicant_selection_track", questionText: "모집시기", systemFieldKey: "track", unitKey: "trackName" }),
  Object.freeze({ key: "admission", fieldKey: "__applicant_selection_admission", questionText: "전형", systemFieldKey: "admission", unitKey: "admissionName" }),
  Object.freeze({ key: "series", fieldKey: "__applicant_selection_series", questionText: "계열", systemFieldKey: "series", unitKey: "seriesName" }),
  Object.freeze({ key: "unit", fieldKey: "__applicant_selection_unit", questionText: "모집단위", systemFieldKey: "unit", unitKey: "unitName" }),
  Object.freeze({ key: "major", fieldKey: "__applicant_selection_major", questionText: "전공", systemFieldKey: "major", unitKey: "majorName" }),
]);
const APPLICANT_RECRUITMENT_SELECTION_FIELD_KEY_MAP = Object.freeze(
  APPLICANT_RECRUITMENT_SELECTION_FIELDS.reduce((fieldMap, definition) => {
    fieldMap[definition.fieldKey] = definition;
    return fieldMap;
  }, {}),
);
const APPLICANT_RECRUITMENT_SELECTION_SYSTEM_FIELD_MAP = Object.freeze(
  APPLICANT_RECRUITMENT_SELECTION_FIELDS.reduce((fieldMap, definition) => {
    fieldMap[definition.systemFieldKey] = definition;
    return fieldMap;
  }, {}),
);

function isApplicantUploadInputType(inputType = "") {
  return APPLICANT_UPLOAD_INPUT_TYPES.includes(String(inputType || "").trim());
}

function createApplicantService({
  applicantFileStorageDirName = "uploads/file",
  applicantPhotoStorageDirName = "uploads/photo",
  buildAdmitCardPdfBuffer,
  buildAdmitCardPdfBufferFromRecord,
  createHttpError,
  emailVerificationTtlMs = 1000 * 60 * 10,
  examineePhotoStorageDirName = "photo",
  getDefaultApplicantNoticeHtml = () => "",
  getPool,
  hashPassword = (value) => String(value ?? ""),
  publicAccessTtlMs = 1000 * 60 * 60,
  query,
  rootDir = process.cwd(),
  sendVerificationEmail,
  verifyPassword = (plainPassword, storedPassword) => String(plainPassword ?? "") === String(storedPassword ?? ""),
}) {
  const publicAccessStore = new Map();
  const applicantFileStorageDirectoryPath = path.join(rootDir, applicantFileStorageDirName);
  const applicantPhotoStorageDirectoryPath = path.join(rootDir, applicantPhotoStorageDirName);
  const legacyApplicantPhotoStorageDirectoryPath = path.join(rootDir, "uploads", "applicant-photos");
  const examineePhotoStorageDirectoryPath = path.join(rootDir, examineePhotoStorageDirName);
  const buildExamineeAdmitCardPdfBuffer =
    typeof buildAdmitCardPdfBuffer === "function"
      ? buildAdmitCardPdfBuffer
      : async () => {
          throw createHttpError(500, "수험표 PDF 생성기를 사용할 수 없습니다.", "APPLICANT_ADMIT_CARD_PDF_BUILDER_UNAVAILABLE");
        };
  const buildSubmissionAdmitCardPdfBuffer =
    typeof buildAdmitCardPdfBufferFromRecord === "function"
      ? buildAdmitCardPdfBufferFromRecord
      : async () => {
          throw createHttpError(500, "접수 데이터 기반 수험표 PDF 생성기를 사용할 수 없습니다.", "APPLICANT_ADMIT_CARD_PDF_BUILDER_UNAVAILABLE");
        };
  const dispatchVerificationEmail =
    typeof sendVerificationEmail === "function"
      ? sendVerificationEmail
      : async () => {
          throw createHttpError(
            503,
            "이메일 발송 설정이 완료되지 않았습니다. SMTP 환경설정을 확인하세요.",
            "APPLICANT_VERIFICATION_EMAIL_NOT_CONFIGURED",
          );
        };

  function normalizeApplicantEmailDeliveryStatus(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    return Object.values(APPLICANT_EMAIL_DELIVERY_STATUSES).includes(normalizedValue)
      ? normalizedValue
      : APPLICANT_EMAIL_DELIVERY_STATUSES.PENDING;
  }

  function cleanupPublicAccessStore() {
    const now = Date.now();

    publicAccessStore.forEach((record, token) => {
      if (!record || record.expiresAt <= now) {
        publicAccessStore.delete(token);
      }
    });
  }

  function createPublicAccessToken(payload = {}) {
    cleanupPublicAccessStore();
    const token = randomUUID();

    publicAccessStore.set(token, {
      ...payload,
      expiresAt: Date.now() + publicAccessTtlMs,
    });

    return token;
  }

  function getPublicAccessRecordOrThrow(token, allowedTypes = []) {
    const normalizedToken = String(token || "").trim();

    if (!normalizedToken) {
      throw createHttpError(401, "접근 토큰이 필요합니다.", "PUBLIC_ACCESS_TOKEN_REQUIRED");
    }

    cleanupPublicAccessStore();
    const record = publicAccessStore.get(normalizedToken);

    if (!record) {
      throw createHttpError(401, "유효하지 않거나 만료된 접근 토큰입니다.", "PUBLIC_ACCESS_TOKEN_INVALID");
    }

    if (Array.isArray(allowedTypes) && allowedTypes.length > 0 && !allowedTypes.includes(record.type)) {
      throw createHttpError(403, "허용되지 않은 접근 유형입니다.", "PUBLIC_ACCESS_TYPE_INVALID");
    }

    return {
      token: normalizedToken,
      ...record,
    };
  }

  async function executeRows(queryable, sql, params = []) {
    const result = await queryable(sql, params);
    return Array.isArray(result?.[0]) ? result[0] : result;
  }

  function normalizeApplicantDateTimeValue(value) {
    const normalizedStringValue = String(value || "").trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalizedStringValue)) {
      return normalizedStringValue;
    }

    const candidateDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(candidateDate.getTime()) ? "" : candidateDate.toISOString().slice(0, 19).replace("T", " ");
  }

  function normalizeApplicantAdmitCardDataSource(value, options = {}) {
    const normalizedValue = String(value ?? "").trim();
    const defaultValue =
      options.defaultValue && Object.values(APPLICANT_ADMIT_CARD_DATA_SOURCES).includes(options.defaultValue)
        ? options.defaultValue
        : APPLICANT_ADMIT_CARD_DATA_SOURCES.examinee;

    return Object.values(APPLICANT_ADMIT_CARD_DATA_SOURCES).includes(normalizedValue) ? normalizedValue : defaultValue;
  }

  function normalizeApplicantPublicLookupTarget(value, options = {}) {
    const normalizedValue = String(value ?? "").trim();
    const defaultValue =
      options.defaultValue && Object.values(APPLICANT_PUBLIC_LOOKUP_TARGETS).includes(options.defaultValue)
        ? options.defaultValue
        : APPLICANT_PUBLIC_LOOKUP_TARGETS.ticket;

    return Object.values(APPLICANT_PUBLIC_LOOKUP_TARGETS).includes(normalizedValue) ? normalizedValue : defaultValue;
  }

  function normalizeApplicantText(value, label, options = {}) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue && options.required !== false) {
      throw createHttpError(400, `${label}을(를) 입력하세요.`, options.errorCode || "APPLICANT_VALUE_REQUIRED");
    }

    if (options.maxLength && normalizedValue.length > options.maxLength) {
      throw createHttpError(400, `${label}은(는) ${options.maxLength}자 이하여야 합니다.`, options.errorCode || "APPLICANT_VALUE_TOO_LONG");
    }

    return normalizedValue;
  }

  function normalizeApplicantDate(value, label, options = {}) {
    const normalizedValue = normalizeApplicantText(value, label, options);

    if (!normalizedValue) {
      return "";
    }

    if (!APPLICANT_DATE_PATTERN.test(normalizedValue)) {
      throw createHttpError(400, `${label} 형식은 YYYY-MM-DD여야 합니다.`, "APPLICANT_DATE_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantTime(value, label, options = {}) {
    const normalizedValue = normalizeApplicantText(value, label, options);

    if (!normalizedValue) {
      return "";
    }

    if (!APPLICANT_TIME_PATTERN.test(normalizedValue)) {
      throw createHttpError(400, `${label} 형식은 HH:MM이어야 합니다.`, "APPLICANT_TIME_INVALID");
    }

    const [hourText, minuteText] = normalizedValue.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw createHttpError(400, `${label} 값이 올바르지 않습니다.`, "APPLICANT_TIME_RANGE_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantPhone(value, label, options = {}) {
    const normalizedValue = String(value ?? "").replace(/\D+/g, "");

    if (!normalizedValue && options.required !== false) {
      throw createHttpError(400, `${label}을(를) 입력하세요.`, options.errorCode || "APPLICANT_PHONE_REQUIRED");
    }

    if (!normalizedValue) {
      return "";
    }

    if (!APPLICANT_PHONE_PATTERN.test(normalizedValue)) {
      throw createHttpError(400, `${label}은(는) 숫자만 입력할 수 있습니다.`, options.errorCode || "APPLICANT_PHONE_INVALID");
    }

    if (normalizedValue.length > 20) {
      throw createHttpError(400, `${label}은(는) 20자리 이하여야 합니다.`, options.errorCode || "APPLICANT_PHONE_TOO_LONG");
    }

    return normalizedValue;
  }

  function normalizeApplicantEmail(value) {
    const normalizedValue = String(value ?? "").trim().toLowerCase();

    if (!normalizedValue) {
      throw createHttpError(400, "이메일을 입력하세요.", "APPLICANT_EMAIL_REQUIRED");
    }

    if (!APPLICANT_EMAIL_PATTERN.test(normalizedValue)) {
      throw createHttpError(400, "이메일 형식이 올바르지 않습니다.", "APPLICANT_EMAIL_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantNationality(value, label, options = {}) {
    const normalizedValue = normalizeApplicantText(value, label, {
      ...options,
      maxLength: 120,
    });

    if (!normalizedValue) {
      return "";
    }

    const matchedNationality = typeof findApplicantNationalityOption === "function" ? findApplicantNationalityOption(normalizedValue) : null;

    if (!matchedNationality) {
      throw createHttpError(400, `${label} 목록에서 올바른 국가를 선택하세요.`, "APPLICANT_NATIONALITY_INVALID");
    }

    return String(matchedNationality.label || normalizedValue).trim();
  }

  function normalizeApplicantSubmissionPassword(rawPassword, existingSubmission = null) {
    const passwordValue = String(rawPassword ?? "");

    if (!passwordValue.trim()) {
      if (existingSubmission?.hasPassword) {
        return {
          hasPassword: true,
          shouldUpdate: false,
          value: "",
        };
      }

      throw createHttpError(400, "비밀번호를 입력하세요.", "APPLICANT_PASSWORD_REQUIRED");
    }

    if (passwordValue.length < 4) {
      throw createHttpError(400, "비밀번호는 4자 이상이어야 합니다.", "APPLICANT_PASSWORD_TOO_SHORT");
    }

    if (passwordValue.length > 100) {
      throw createHttpError(400, "비밀번호는 100자 이하여야 합니다.", "APPLICANT_PASSWORD_TOO_LONG");
    }

    return {
      hasPassword: true,
      shouldUpdate: true,
      value: hashPassword(passwordValue),
    };
  }

  function normalizeApplicantOptionValues(payload = {}, existingField = {}) {
    const existingOptionConfig = parseApplicantOptionConfig(payload.optionsJson ?? existingField.optionsJson);
    const rawOptionValues = Array.isArray(payload.options)
      ? payload.options
      : payload.optionValuesText != null
        ? String(payload.optionValuesText)
            .split(/\r?\n/g)
            .map((value) => value.trim())
            .filter(Boolean)
        : Array.isArray(existingField.options)
          ? existingField.options
          : existingOptionConfig.items;

    return Array.from(new Set(rawOptionValues.map((value) => String(value).trim()).filter(Boolean)));
  }

  function parseApplicantOptionConfig(value) {
    const defaultConfig = {
      items: [],
      allowCustomOption: false,
      customOptionLabel: "",
    };

    if (!String(value || "").trim()) {
      return defaultConfig;
    }

    try {
      const parsedValue = JSON.parse(String(value || ""));

      if (Array.isArray(parsedValue)) {
        return {
          items: parsedValue.map((entry) => String(entry || "").trim()).filter(Boolean),
          allowCustomOption: false,
          customOptionLabel: "",
        };
      }

      if (!parsedValue || typeof parsedValue !== "object") {
        return defaultConfig;
      }

      const items = Array.isArray(parsedValue.items)
        ? parsedValue.items.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [];
      const allowCustomOption = parsedValue.allowCustomOption === true || parsedValue.allowCustom === true;
      const explicitCustomOptionLabel = String(parsedValue.customOptionLabel || parsedValue.customOptionValue || "").trim();
      const customOptionLabel =
        explicitCustomOptionLabel && items.includes(explicitCustomOptionLabel)
          ? explicitCustomOptionLabel
          : allowCustomOption && items.includes("기타")
            ? "기타"
            : "";

      return {
        items,
        allowCustomOption,
        customOptionLabel,
      };
    } catch (error) {
      return defaultConfig;
    }
  }

  function normalizeApplicantAllowCustomOption(payload = {}, existingField = {}) {
    if (payload.allowCustomOption != null) {
      return payload.allowCustomOption === true || payload.allowCustomOption === "true" || Number(payload.allowCustomOption) === 1;
    }

    if (typeof existingField.allowCustomOption === "boolean") {
      return existingField.allowCustomOption;
    }

    const existingOptionConfig = parseApplicantOptionConfig(existingField.optionsJson);
    return existingOptionConfig.allowCustomOption === true || Boolean(existingOptionConfig.customOptionLabel);
  }

  function normalizeApplicantCustomOptionLabel(payload = {}, existingField = {}) {
    if (payload.customOptionLabel != null) {
      return String(payload.customOptionLabel || "").trim();
    }

    if (typeof existingField.customOptionLabel === "string") {
      return String(existingField.customOptionLabel || "").trim();
    }

    const existingOptionConfig = parseApplicantOptionConfig(existingField.optionsJson);
    return String(existingOptionConfig.customOptionLabel || "").trim();
  }

  function parseApplicantJsonArray(value) {
    if (!String(value || "").trim()) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(String(value || "[]"));
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeApplicantFormFieldRecord(row = {}) {
    const optionConfig = parseApplicantOptionConfig(row.optionsJson);
    const options = optionConfig.items;

    return {
      id: Number(row.id || 0),
      fieldKey: String(row.fieldKey || "").trim(),
      questionText: String(row.questionText || "").trim(),
      questionDescription: String(row.questionDescription || "").trim(),
      inputType: String(row.inputType || "text").trim(),
      systemFieldKey: String(row.systemFieldKey || "").trim(),
      options,
      optionValuesText: options.join("\n"),
      allowCustomOption: optionConfig.allowCustomOption === true,
      customOptionLabel: String(optionConfig.customOptionLabel || "").trim(),
      required: Number(row.required) === 1 || row.required === true,
      active: Number(row.active) === 1 || row.active === true,
      sortOrder: Number(row.sortOrder || 0),
      createdAt: String(row.createdAt || "").trim(),
      updatedAt: String(row.updatedAt || "").trim(),
    };
  }

  function buildApplicantFieldKey(questionText = "") {
    const normalizedQuestionText = String(questionText || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalizedQuestionText || `field-${randomUUID().slice(0, 8)}`;
  }

  function normalizeApplicantCode(value, label, options = {}) {
    const normalizedValue = String(value ?? "").trim().toUpperCase();

    if (!normalizedValue && options.required !== false) {
      throw createHttpError(400, `${label}를 입력하세요.`, options.errorCode || "APPLICANT_CODE_REQUIRED");
    }

    if (!normalizedValue) {
      return "";
    }

    if (normalizedValue.length > (options.maxLength || 30)) {
      throw createHttpError(
        400,
        `${label}는 ${options.maxLength || 30}자 이하여야 합니다.`,
        options.errorCode || "APPLICANT_CODE_TOO_LONG",
      );
    }

    if (!APPLICANT_CODE_PATTERN.test(normalizedValue)) {
      throw createHttpError(
        400,
        `${label}는 영문 대문자, 숫자, -, _ 만 사용할 수 있습니다.`,
        options.errorCode || "APPLICANT_CODE_INVALID",
      );
    }

    return normalizedValue;
  }

  function extractExcelCellValue(value) {
    if (value == null) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (typeof value === "object") {
      if (typeof value.text === "string") {
        return value.text;
      }

      if (Array.isArray(value.richText)) {
        return value.richText.map((segment) => segment?.text || "").join("");
      }

      if (value.result != null) {
        return extractExcelCellValue(value.result);
      }

      if (value.hyperlink) {
        return String(value.text || value.hyperlink || "");
      }
    }

    return "";
  }

  function getExcelCellText(cell) {
    return extractExcelCellValue(cell?.value)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  }

  function normalizeApplicantPromotionOverride(rawValue = null) {
    const sourceValue =
      typeof rawValue === "string"
        ? (() => {
            try {
              return JSON.parse(rawValue);
            } catch (error) {
              return {};
            }
          })()
        : rawValue && typeof rawValue === "object"
          ? rawValue
          : {};
    const normalizedSourceValue =
      sourceValue.seriesCode || !sourceValue.trackCode
        ? sourceValue
        : {
            ...sourceValue,
            seriesCode: sourceValue.trackCode,
          };

    return APPLICANT_PROMOTION_OVERRIDE_KEYS.reduce((override, key) => {
      const normalizedValue = String(normalizedSourceValue?.[key] || "").trim();

      if (normalizedValue) {
        override[key] = normalizedValue;
      }

      return override;
    }, {});
  }

  function stringifyApplicantPromotionOverride(override = {}) {
    const normalizedOverride = normalizeApplicantPromotionOverride(override);
    return Object.keys(normalizedOverride).length > 0 ? JSON.stringify(normalizedOverride) : null;
  }

  function compareApplicantPromotionText(leftValue = "", rightValue = "") {
    return String(leftValue || "").localeCompare(String(rightValue || ""), "ko", {
      numeric: true,
      sensitivity: "base",
    });
  }

  function getApplicantPromotionFieldLabel(fieldKey = "", options = {}) {
    const normalizedFieldKey = String(fieldKey || "").trim();

    if (!normalizedFieldKey) {
      return String(options.emptyLabel || "선택 안 함").trim();
    }

    return APPLICANT_PROMOTION_FIELD_LABELS[normalizedFieldKey] || normalizedFieldKey;
  }

  function buildApplicantPromotionGroupKey(record = {}) {
    return [
      String(record.track || "").trim(),
      String(record.admission || "").trim(),
      String(record.series || "").trim(),
      String(record.unit || "").trim(),
      String(record.major || "").trim(),
    ].join("\u241f");
  }

  function buildApplicantPromotionAssignmentBaseKey(record = {}) {
    return [String(record.track || "").trim(), String(record.admission || "").trim()].join("\u241f");
  }

  function buildApplicantPromotionAssignmentKey(record = {}) {
    return [
      String(record.track || "").trim(),
      String(record.admission || "").trim(),
      String(record.series || "").trim(),
      String(record.unit || "").trim(),
      String(record.major || "").trim(),
    ].join("\u241f");
  }

  function doesApplicantAssignmentRowMatchPromotableRecord(assignmentRow = {}, promotableRecord = {}) {
    const assignmentTrack = String(assignmentRow?.track || "").trim();
    const assignmentAdmission = String(assignmentRow?.admission || "").trim();
    const assignmentSeries = String(assignmentRow?.series || "").trim();
    const assignmentUnit = String(assignmentRow?.unit || "").trim();
    const assignmentMajor = String(assignmentRow?.major || "").trim();
    const promotableTrack = String(promotableRecord?.track || "").trim();
    const promotableAdmission = String(promotableRecord?.admission || "").trim();
    const promotableSeries = String(promotableRecord?.series || "").trim();
    const promotableUnit = String(promotableRecord?.unit || "").trim();
    const promotableMajor = String(promotableRecord?.major || "").trim();

    if (assignmentTrack && compareApplicantPromotionText(assignmentTrack, promotableTrack) !== 0) {
      return false;
    }

    if (assignmentAdmission && compareApplicantPromotionText(assignmentAdmission, promotableAdmission) !== 0) {
      return false;
    }

    if (assignmentSeries && compareApplicantPromotionText(assignmentSeries, promotableSeries) !== 0) {
      return false;
    }

    if (assignmentUnit && compareApplicantPromotionText(assignmentUnit, promotableUnit) !== 0) {
      return false;
    }

    if (assignmentMajor && compareApplicantPromotionText(assignmentMajor, promotableMajor) !== 0) {
      return false;
    }

    return true;
  }

  function buildApplicantPromotionRoomKey(record = {}) {
    return [
      String(record.date || "").trim(),
      String(record.time || "").trim(),
      String(record.buildingCode || "").trim(),
      String(record.roomCode || "").trim(),
    ].join("\u241f");
  }

  function normalizeApplicantPromotionSortField(value, options = {}) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return options.allowEmpty === true ? "" : String(options.defaultValue || "").trim();
    }

    if (APPLICANT_PROMOTION_SORT_FIELD_KEYS.includes(normalizedValue)) {
      return normalizedValue;
    }

    throw createHttpError(400, "고사실 배정 정렬 기준이 올바르지 않습니다.", "APPLICANT_PROMOTION_SORT_FIELD_INVALID");
  }

  function normalizeApplicantPromotionBreakField(value) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return DEFAULT_APPLICANT_PROMOTION_BREAK_FIELD;
    }

    if (APPLICANT_PROMOTION_BREAK_FIELD_KEYS.includes(normalizedValue)) {
      return normalizedValue;
    }

    throw createHttpError(400, "고사실 배정 구분 기준이 올바르지 않습니다.", "APPLICANT_PROMOTION_BREAK_FIELD_INVALID");
  }

  function normalizeApplicantPromotionOverbookingPercent(value, options = {}) {
    const normalizedStringValue = String(value ?? "").trim();
    const defaultValue = Number.isFinite(Number(options.defaultValue)) ? Number(options.defaultValue) : 10;

    if (!normalizedStringValue) {
      return defaultValue;
    }

    if (!/^\d+$/.test(normalizedStringValue)) {
      throw createHttpError(400, "오버부킹 비율은 1~100 사이의 정수여야 합니다.", "APPLICANT_PROMOTION_OVERBOOKING_PERCENT_INVALID");
    }

    const normalizedValue = Number(normalizedStringValue);

    if (!Number.isInteger(normalizedValue) || normalizedValue < 1 || normalizedValue > 100) {
      throw createHttpError(400, "오버부킹 비율은 1~100 사이의 정수여야 합니다.", "APPLICANT_PROMOTION_OVERBOOKING_PERCENT_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantPromotionOptions(payload = {}) {
    const hasSortField1 = Object.prototype.hasOwnProperty.call(payload || {}, "sortField1");
    const hasSortField2 = Object.prototype.hasOwnProperty.call(payload || {}, "sortField2");
    const hasSortField3 = Object.prototype.hasOwnProperty.call(payload || {}, "sortField3");
    const hasBreakField = Object.prototype.hasOwnProperty.call(payload || {}, "breakField");
    const hasOverbookingPercent = Object.prototype.hasOwnProperty.call(payload || {}, "overbookingPercent");

    return {
      allowMissingPhoto: payload.allowMissingPhoto === true,
      allowOverbooking: payload.allowOverbooking === true,
      overbookingPercent: hasOverbookingPercent ? normalizeApplicantPromotionOverbookingPercent(payload.overbookingPercent) : 10,
      sortFields: [
        hasSortField1
          ? normalizeApplicantPromotionSortField(payload.sortField1, {
              defaultValue: DEFAULT_APPLICANT_PROMOTION_SORT_FIELDS[0],
            })
          : DEFAULT_APPLICANT_PROMOTION_SORT_FIELDS[0],
        hasSortField2
          ? normalizeApplicantPromotionSortField(payload.sortField2, {
              allowEmpty: true,
            })
          : DEFAULT_APPLICANT_PROMOTION_SORT_FIELDS[1],
        hasSortField3
          ? normalizeApplicantPromotionSortField(payload.sortField3, {
              allowEmpty: true,
            })
          : DEFAULT_APPLICANT_PROMOTION_SORT_FIELDS[2],
      ],
      breakField: hasBreakField ? normalizeApplicantPromotionBreakField(payload.breakField) : DEFAULT_APPLICANT_PROMOTION_BREAK_FIELD,
    };
  }

  function resolveApplicantPromotionRoomCapacity(assignmentRow = {}, promotionOptions = {}) {
    const baseCapacity = Number(assignmentRow?.assignedCount || 0);

    if (!Number.isInteger(baseCapacity) || baseCapacity <= 0) {
      return 0;
    }

    if (promotionOptions.allowOverbooking !== true) {
      return baseCapacity;
    }

    const overbookingPercent = Number(promotionOptions.overbookingPercent || 0);

    if (!Number.isFinite(overbookingPercent) || overbookingPercent <= 0) {
      return baseCapacity;
    }

    return Math.max(baseCapacity, Math.round(baseCapacity * (1 + overbookingPercent / 100)));
  }

  function getApplicantPromotionSortValue(entryOrRecord = {}, fieldKey = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();

    if (normalizedFieldKey === "examineeNo") {
      return String(
        entryOrRecord?.examineeNo ||
          entryOrRecord?.preparedRecord?.examineeNo ||
          entryOrRecord?.basePromotableRecord?.examineeNo ||
          "",
      ).trim();
    }

    const sourceRecord =
      entryOrRecord?.basePromotableRecord && typeof entryOrRecord.basePromotableRecord === "object"
        ? entryOrRecord.basePromotableRecord
        : entryOrRecord;

    return String(sourceRecord?.[normalizedFieldKey] || "").trim();
  }

  function buildApplicantPromotionCodeOverrides(recruitmentUnit = null) {
    if (!recruitmentUnit) {
      return {};
    }

    return normalizeApplicantPromotionOverride({
      admissionCode: recruitmentUnit.admissionCode,
      seriesCode: recruitmentUnit.seriesCode,
      unitCode: recruitmentUnit.unitCode,
      majorCode: recruitmentUnit.majorCode,
    });
  }

  function buildApplicantPromotionRoomOverrides(assignmentRow = {}) {
    return normalizeApplicantPromotionOverride({
      date: assignmentRow.date,
      time: assignmentRow.time,
      building: assignmentRow.building,
      buildingCode: assignmentRow.buildingCode,
      room: assignmentRow.room,
      roomCode: assignmentRow.roomCode,
    });
  }

  function getApplicantSubmissionHasPhoto(submission = {}) {
    if (submission?.hasPhoto === true || Number(submission?.hasPhoto) === 1) {
      return true;
    }

    const photoAnswerItem =
      normalizeStoredAnswerItems(submission?.answerItems).find((answerItem) => answerItem?.inputType === "photo") || null;

    return photoAnswerItem?.value?.hasPhoto === true || Boolean(String(submission?.photoFileName || "").trim());
  }

  function getExistingApplicantUploadAnswerValue(existingSubmission = null, fieldKey = "", inputType = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const normalizedInputType = String(inputType || "").trim();

    if (!existingSubmission || !normalizedFieldKey || !isApplicantUploadInputType(normalizedInputType)) {
      return null;
    }

    const matchedAnswerItem = normalizeStoredAnswerItems(existingSubmission?.answerItems).find((answerItem) => {
      return String(answerItem?.fieldKey || "").trim() === normalizedFieldKey && String(answerItem?.inputType || "").trim() === normalizedInputType;
    });

    if (!matchedAnswerItem || !matchedAnswerItem.value || typeof matchedAnswerItem.value !== "object") {
      return null;
    }

    if (normalizedInputType === "photo") {
      return {
        fileName: String(matchedAnswerItem.value.fileName || "").trim(),
        mimeType: String(matchedAnswerItem.value.mimeType || "").trim(),
        hasPhoto: matchedAnswerItem.value.hasPhoto === true || Number(matchedAnswerItem.value.hasPhoto) === 1,
      };
    }

    return {
      fileName: String(matchedAnswerItem.value.fileName || "").trim(),
      mimeType: String(matchedAnswerItem.value.mimeType || "").trim(),
      hasFile: matchedAnswerItem.value.hasFile === true || Number(matchedAnswerItem.value.hasFile) === 1,
    };
  }

  function normalizeApplicantSubmissionIdList(values = []) {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(values) ? values : [values])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    if (normalizedIds.length === 0) {
      throw createHttpError(400, "대상 접수 이력을 선택하세요.", "APPLICANT_PROMOTION_SUBMISSION_IDS_REQUIRED");
    }

    return normalizedIds;
  }

  function normalizeApplicantAssignmentText(value, fieldLabel, rowNumber, options = {}) {
    const normalizedValue = String(value ?? "").trim();

    if (normalizedValue) {
      return normalizedValue;
    }

    if (options.required === false) {
      return "";
    }

    const suffix = Number.isInteger(rowNumber) && rowNumber > 0 ? ` (${rowNumber}행)` : "";
    throw createHttpError(400, `${fieldLabel} 값을 입력하세요.${suffix}`, "APPLICANT_ASSIGNMENT_VALUE_REQUIRED");
  }

  function normalizeApplicantAssignmentDate(value, rowNumber) {
    const normalizedValue = normalizeApplicantAssignmentText(value, "날짜", rowNumber);

    if (!APPLICANT_DATE_PATTERN.test(normalizedValue)) {
      const suffix = Number.isInteger(rowNumber) && rowNumber > 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `날짜 형식은 YYYY-MM-DD여야 합니다.${suffix}`, "APPLICANT_ASSIGNMENT_DATE_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantAssignmentTime(value, rowNumber) {
    const normalizedValue = normalizeApplicantAssignmentText(value, "시간", rowNumber);

    if (!APPLICANT_TIME_PATTERN.test(normalizedValue)) {
      const suffix = Number.isInteger(rowNumber) && rowNumber > 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `시간 형식은 HH:MM이어야 합니다.${suffix}`, "APPLICANT_ASSIGNMENT_TIME_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantAssignmentCount(value, rowNumber) {
    const normalizedValue = Math.round(Number(value));

    if (Number.isInteger(normalizedValue) && normalizedValue > 0) {
      return normalizedValue;
    }

    const suffix = Number.isInteger(rowNumber) && rowNumber > 0 ? ` (${rowNumber}행)` : "";
    throw createHttpError(400, `배정인원은 1 이상의 정수여야 합니다.${suffix}`, "APPLICANT_ASSIGNMENT_COUNT_INVALID");
  }

  function normalizeApplicantAssignmentPayload(payload = {}, rowNumber = 0) {
    return {
      id: Number(payload?.id || 0),
      rowNumber: Number.isInteger(Number(payload?.rowNumber || rowNumber)) ? Number(payload?.rowNumber || rowNumber) : 0,
      track: normalizeApplicantAssignmentText(payload?.track, "모집시기", rowNumber, { required: false }),
      admission: normalizeApplicantAssignmentText(payload?.admission, "전형", rowNumber),
      series: normalizeApplicantAssignmentText(payload?.series, "계열", rowNumber, { required: false }),
      unit: normalizeApplicantAssignmentText(payload?.unit, "모집단위", rowNumber, { required: false }),
      major: normalizeApplicantAssignmentText(payload?.major, "전공", rowNumber, { required: false }),
      date: normalizeApplicantAssignmentDate(payload?.date, rowNumber),
      time: normalizeApplicantAssignmentTime(payload?.time, rowNumber),
      buildingCode: normalizeApplicantAssignmentText(payload?.buildingCode, "고사건물코드", rowNumber),
      building: normalizeApplicantAssignmentText(payload?.building, "고사건물", rowNumber),
      roomCode: normalizeApplicantAssignmentText(payload?.roomCode, "고사실코드", rowNumber),
      room: normalizeApplicantAssignmentText(payload?.room, "고사실", rowNumber),
      assignedCount: normalizeApplicantAssignmentCount(payload?.assignedCount, rowNumber),
    };
  }

  function stripApplicantAssignmentMeta(row = {}) {
    return {
      id: Number(row?.id || 0),
      track: String(row?.track || "").trim(),
      admission: String(row?.admission || "").trim(),
      series: String(row?.series || "").trim(),
      unit: String(row?.unit || "").trim(),
      major: String(row?.major || "").trim(),
      date: String(row?.date || "").trim(),
      time: String(row?.time || "").trim(),
      buildingCode: String(row?.buildingCode || "").trim(),
      building: String(row?.building || "").trim(),
      roomCode: String(row?.roomCode || "").trim(),
      room: String(row?.room || "").trim(),
      assignedCount: Number(row?.assignedCount || 0),
    };
  }

  function areApplicantAssignmentRowsEqual(leftRow = {}, rightRow = {}) {
    return APPLICANT_ASSIGNMENT_IMPORT_COMPARE_FIELDS.every((fieldKey) => {
      return String(leftRow?.[fieldKey] || "").trim() === String(rightRow?.[fieldKey] || "").trim();
    });
  }

  function classifyApplicantAssignmentImportRows(normalizedRows = [], currentAssignments = []) {
    const currentAssignmentMap = new Map(
      (Array.isArray(currentAssignments) ? currentAssignments : []).map((row) => {
        const normalizedRow = stripApplicantAssignmentMeta(row);
        return [buildApplicantPromotionRoomKey(normalizedRow), normalizedRow];
      }),
    );

    return (Array.isArray(normalizedRows) ? normalizedRows : []).map((row, index) => {
      const normalizedRow = stripApplicantAssignmentMeta(row);
      const assignmentKey = buildApplicantPromotionRoomKey(normalizedRow);
      const existingRow = currentAssignmentMap.get(assignmentKey) || null;
      const operation = existingRow ? (areApplicantAssignmentRowsEqual(normalizedRow, existingRow) ? "unchanged" : "update") : "insert";

      return {
        row: normalizedRow,
        rowNumber: Number(row?.rowNumber || index + 2),
        operation,
      };
    });
  }

  function buildApplicantAssignmentRowLabel(row = {}, index = 0) {
    const rowNumber = Number(row?.rowNumber || 0);
    const rowId = Number(row?.id || 0);

    if (Number.isInteger(rowNumber) && rowNumber > 0) {
      return `${rowNumber}행`;
    }

    if (Number.isInteger(rowId) && rowId > 0) {
      return `배정표 ${rowId}번`;
    }

    return `${index + 1}행`;
  }

  function validateApplicantAssignmentRows(rows = [], options = {}) {
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row, index) =>
      normalizeApplicantAssignmentPayload(row, Number(row?.rowNumber || index + 1)),
    );
    const buildingPairState = {
      codeToNameMap: new Map(),
      nameToCodeMap: new Map(),
    };
    const roomPairState = {
      codeToNameMap: new Map(),
      nameToCodeMap: new Map(),
    };
    const roomKeyMap = new Map();

    normalizedRows.forEach((row, index) => {
      const rowLabel = buildApplicantAssignmentRowLabel(row, index);
      const roomKey = buildApplicantPromotionRoomKey(row);
      const hasSeries = String(row.series || "").trim() !== "";
      const hasUnit = String(row.unit || "").trim() !== "";
      const hasMajor = String(row.major || "").trim() !== "";

      if (roomKeyMap.has(roomKey)) {
        throw createHttpError(
          400,
          `${rowLabel}의 날짜/시간/고사건물코드/고사실코드 조합이 ${roomKeyMap.get(roomKey)}과 중복됩니다.`,
          "APPLICANT_ASSIGNMENT_ROOM_DUPLICATED",
        );
      }

      if (hasUnit && !hasSeries) {
        throw createHttpError(
          400,
          `${rowLabel}에서 모집단위를 입력한 경우 계열도 함께 입력해야 합니다.`,
          "APPLICANT_ASSIGNMENT_SERIES_REQUIRED_FOR_UNIT",
        );
      }

      if (hasMajor && (!hasSeries || !hasUnit)) {
        throw createHttpError(
          400,
          `${rowLabel}에서 전공을 입력한 경우 계열과 모집단위를 함께 입력해야 합니다.`,
          "APPLICANT_ASSIGNMENT_SERIES_UNIT_REQUIRED_FOR_MAJOR",
        );
      }

      ensureApplicantPromotionPairConsistency(buildingPairState, row.buildingCode, row.building, rowLabel, "고사건물");
      ensureApplicantPromotionPairConsistency(roomPairState, row.roomCode, row.room, rowLabel, "고사실");
      roomKeyMap.set(roomKey, rowLabel);
    });

    if (options.requireRows !== false && normalizedRows.length === 0) {
      throw createHttpError(400, "배정표에는 최소 1개 이상의 데이터 행이 필요합니다.", "APPLICANT_ASSIGNMENT_ROW_REQUIRED");
    }

    return normalizedRows;
  }

  async function buildApplicantAssignmentWorkbookBuffer(rows = []) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("배정표", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => stripApplicantAssignmentMeta(row));

    worksheet.columns = APPLICANT_ASSIGNMENT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRows(normalizedRows);

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildApplicantAssignmentTemplateBuffer() {
    return buildApplicantAssignmentWorkbookBuffer([]);
  }

  function applyWorkbookHeaderStyle(worksheet) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4F7FB" },
    };
  }

  function normalizeApplicantRecruitmentUnitRecord(row = {}) {
    return {
      id: Number(row.id || 0),
      trackName: String(row.trackName || "").trim(),
      admissionCode: String(row.admissionCode || "").trim(),
      admissionName: String(row.admissionName || "").trim(),
      seriesCode: String(row.seriesCode || "").trim(),
      seriesName: String(row.seriesName || "").trim(),
      unitCode: String(row.unitCode || "").trim(),
      unitName: String(row.unitName || "").trim(),
      majorCode: String(row.majorCode || "").trim(),
      majorName: String(row.majorName || "").trim(),
      sortOrder: Number(row.sortOrder || 0),
      createdAt: String(row.createdAt || "").trim(),
      updatedAt: String(row.updatedAt || "").trim(),
    };
  }

  function getApplicantRecruitmentSelectionFieldByFieldKey(fieldKey = "") {
    return APPLICANT_RECRUITMENT_SELECTION_FIELD_KEY_MAP[String(fieldKey || "").trim()] || null;
  }

  function getApplicantRecruitmentSelectionFieldBySystemFieldKey(systemFieldKey = "") {
    return APPLICANT_RECRUITMENT_SELECTION_SYSTEM_FIELD_MAP[String(systemFieldKey || "").trim()] || null;
  }

  function getApplicantRecruitmentSelectionOptions(recruitmentUnits = [], currentSelection = {}, selectionDefinition = null) {
    if (!selectionDefinition) {
      return [];
    }

    const selectedIndex = APPLICANT_RECRUITMENT_SELECTION_FIELDS.findIndex((definition) => definition.key === selectionDefinition.key);
    let filteredUnits = Array.isArray(recruitmentUnits) ? recruitmentUnits : [];

    for (let index = 0; index < selectedIndex; index += 1) {
      const definition = APPLICANT_RECRUITMENT_SELECTION_FIELDS[index];
      const selectedValue = String(currentSelection?.[definition.key] || "").trim();

      if (!selectedValue) {
        continue;
      }

      filteredUnits = filteredUnits.filter((unit) => String(unit?.[definition.unitKey] || "").trim() === selectedValue);
    }

    return Array.from(
      new Set(
        filteredUnits
          .map((unit) => String(unit?.[selectionDefinition.unitKey] || "").trim())
          .filter(Boolean),
      ),
    );
  }

  function normalizeApplicantRecruitmentSelection(selectionPayload = {}, recruitmentUnits = []) {
    const normalizedPayload = selectionPayload && typeof selectionPayload === "object" ? selectionPayload : {};
    const normalizedSelection = {};
    let hasSelectableField = false;

    APPLICANT_RECRUITMENT_SELECTION_FIELDS.forEach((definition) => {
      const options = getApplicantRecruitmentSelectionOptions(recruitmentUnits, normalizedSelection, definition);
      const requestedValue = String(normalizedPayload?.[definition.key] || "").trim();

      if (options.length === 0) {
        normalizedSelection[definition.key] = "";
        return;
      }

      hasSelectableField = true;

      if (!requestedValue) {
        throw createHttpError(400, `${definition.questionText}을(를) 선택하세요.`, "APPLICANT_RECRUITMENT_SELECTION_REQUIRED");
      }

      if (!options.includes(requestedValue)) {
        throw createHttpError(400, `${definition.questionText} 선택값이 올바르지 않습니다.`, "APPLICANT_RECRUITMENT_SELECTION_INVALID");
      }

      normalizedSelection[definition.key] = requestedValue;
    });

    return {
      selection: normalizedSelection,
      hasSelectableField,
    };
  }

  function normalizeApplicantRecruitmentUnitPayload(payload = {}, existingUnit = {}) {
    return {
      trackName: normalizeApplicantText(payload.trackName ?? existingUnit.trackName, "모집시기", {
        required: false,
        maxLength: 100,
        errorCode: "APPLICANT_RECRUITMENT_TRACK_NAME_INVALID",
      }),
      admissionCode: normalizeApplicantCode(payload.admissionCode ?? existingUnit.admissionCode, "전형코드", {
        required: false,
        maxLength: 30,
        errorCode: "APPLICANT_RECRUITMENT_ADMISSION_CODE_INVALID",
      }),
      admissionName: normalizeApplicantText(payload.admissionName ?? existingUnit.admissionName, "전형", {
        required: false,
        maxLength: 100,
        errorCode: "APPLICANT_RECRUITMENT_ADMISSION_NAME_INVALID",
      }),
      seriesCode: normalizeApplicantCode(payload.seriesCode ?? existingUnit.seriesCode, "계열코드", {
        required: false,
        maxLength: 30,
        errorCode: "APPLICANT_RECRUITMENT_SERIES_CODE_INVALID",
      }),
      seriesName: normalizeApplicantText(payload.seriesName ?? existingUnit.seriesName, "계열", {
        required: false,
        maxLength: 100,
        errorCode: "APPLICANT_RECRUITMENT_SERIES_NAME_INVALID",
      }),
      unitCode: normalizeApplicantCode(payload.unitCode ?? existingUnit.unitCode, "모집단위코드", {
        required: false,
        maxLength: 30,
        errorCode: "APPLICANT_RECRUITMENT_UNIT_CODE_INVALID",
      }),
      unitName: normalizeApplicantText(payload.unitName ?? existingUnit.unitName, "모집단위", {
        required: false,
        maxLength: 100,
        errorCode: "APPLICANT_RECRUITMENT_UNIT_NAME_INVALID",
      }),
      majorCode: normalizeApplicantCode(payload.majorCode ?? existingUnit.majorCode, "전공코드", {
        required: false,
        maxLength: 30,
        errorCode: "APPLICANT_RECRUITMENT_MAJOR_CODE_INVALID",
      }),
      majorName: normalizeApplicantText(payload.majorName ?? existingUnit.majorName, "전공", {
        required: false,
        maxLength: 100,
        errorCode: "APPLICANT_RECRUITMENT_MAJOR_NAME_INVALID",
      }),
    };
  }

  function normalizeApplicantImportExistingDataPolicy(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (Object.values(APPLICANT_IMPORT_EXISTING_DATA_POLICIES).includes(normalizedValue)) {
      return normalizedValue;
    }

    return APPLICANT_IMPORT_EXISTING_DATA_POLICIES.INSERT_UPDATE;
  }

  function shouldProcessApplicantImportOperation(operation = "", existingDataPolicy = "") {
    const normalizedPolicy = normalizeApplicantImportExistingDataPolicy(existingDataPolicy);
    const normalizedOperation = String(operation || "").trim();

    if (normalizedPolicy === APPLICANT_IMPORT_EXISTING_DATA_POLICIES.ALL) {
      return true;
    }

    if (normalizedPolicy === APPLICANT_IMPORT_EXISTING_DATA_POLICIES.INSERT_ONLY) {
      return normalizedOperation === "insert";
    }

    return normalizedOperation === "insert" || normalizedOperation === "update";
  }

  function buildApplicantRecruitmentUnitImportKey(row = {}) {
    return [
      String(row?.trackName || "").trim(),
      String(row?.admissionCode || "").trim(),
      String(row?.seriesCode || "").trim(),
      String(row?.unitCode || "").trim(),
      String(row?.majorCode || "").trim(),
    ].join("\u241f");
  }

  function areApplicantRecruitmentUnitRowsEqual(leftRow = {}, rightRow = {}) {
    return APPLICANT_RECRUITMENT_IMPORT_COMPARE_FIELDS.every((fieldKey) => {
      return String(leftRow?.[fieldKey] || "").trim() === String(rightRow?.[fieldKey] || "").trim();
    });
  }

  function classifyApplicantRecruitmentUnitImportRows(normalizedRows = [], currentUnits = []) {
    const workingUnitMap = new Map(
      (Array.isArray(currentUnits) ? currentUnits : []).map((row) => {
        const normalizedRow = normalizeApplicantRecruitmentUnitPayload(row);
        return [buildApplicantRecruitmentUnitImportKey(normalizedRow), normalizedRow];
      }),
    );

    return (Array.isArray(normalizedRows) ? normalizedRows : []).map((row, index) => {
      const unitKey = buildApplicantRecruitmentUnitImportKey(row);
      const existingRow = workingUnitMap.get(unitKey) || null;
      const operation = existingRow ? (areApplicantRecruitmentUnitRowsEqual(row, existingRow) ? "unchanged" : "update") : "insert";

      workingUnitMap.set(unitKey, row);

      return {
        row,
        rowNumber: Number(row?.rowNumber || index + 2),
        operation,
      };
    });
  }

  function getApplicantRecruitmentImportRowLabel(row = {}, fallbackIndex = 0) {
    const normalizedRowNumber = Math.round(Number(row.rowNumber || row._rowNumber || 0));

    if (Number.isInteger(normalizedRowNumber) && normalizedRowNumber > 0) {
      return `업로드 ${normalizedRowNumber}행`;
    }

    const normalizedFallbackIndex = Math.round(Number(fallbackIndex));
    return `업로드 ${Number.isInteger(normalizedFallbackIndex) && normalizedFallbackIndex >= 0 ? normalizedFallbackIndex + 1 : "?"}행`;
  }

  function normalizeApplicantRecruitmentImportCodeValue(value) {
    return String(value ?? "").trim().toUpperCase();
  }

  function normalizeApplicantRecruitmentImportNameValue(value) {
    return String(value ?? "").trim();
  }

  function validateApplicantRecruitmentUnitImportRows(sourceRows = [], existingUnits = []) {
    const pairConsistencyMaps = APPLICANT_RECRUITMENT_UNIT_PAIR_FIELDS.map((pairField) => ({
      ...pairField,
      codeToNameMap: new Map(),
      nameToCodeMap: new Map(),
    }));

    const rememberPair = (pairMap, codeValue, nameValue, sourceLabel) => {
      const existingNameRecord = pairMap.codeToNameMap.get(codeValue);

      if (existingNameRecord && existingNameRecord.nameValue !== nameValue) {
        throw createHttpError(
          400,
          `${sourceLabel}의 ${pairMap.codeLabel} '${codeValue}'는 ${existingNameRecord.sourceLabel}에서 이미 ${pairMap.nameLabel} '${existingNameRecord.nameValue}'와 연결되어 있습니다.`,
          "APPLICANT_RECRUITMENT_IMPORT_CODE_NAME_MISMATCH",
        );
      }

      const existingCodeRecord = pairMap.nameToCodeMap.get(nameValue);

      if (existingCodeRecord && existingCodeRecord.codeValue !== codeValue) {
        throw createHttpError(
          400,
          `${sourceLabel}의 ${pairMap.nameLabel} '${nameValue}'는 ${existingCodeRecord.sourceLabel}에서 이미 ${pairMap.codeLabel} '${existingCodeRecord.codeValue}'와 연결되어 있습니다.`,
          "APPLICANT_RECRUITMENT_IMPORT_CODE_NAME_MISMATCH",
        );
      }

      pairMap.codeToNameMap.set(codeValue, {
        nameValue,
        sourceLabel,
      });
      pairMap.nameToCodeMap.set(nameValue, {
        codeValue,
        sourceLabel,
      });
    };

    pairConsistencyMaps.forEach((pairMap) => {
      (Array.isArray(existingUnits) ? existingUnits : []).forEach((unit) => {
        const codeValue = normalizeApplicantRecruitmentImportCodeValue(unit?.[pairMap.codeKey]);
        const nameValue = normalizeApplicantRecruitmentImportNameValue(unit?.[pairMap.nameKey]);

        if (codeValue && nameValue) {
          rememberPair(pairMap, codeValue, nameValue, "기존 전형 관리 데이터");
        }
      });
    });

    (Array.isArray(sourceRows) ? sourceRows : []).forEach((row, rowIndex) => {
      const rowLabel = getApplicantRecruitmentImportRowLabel(row, rowIndex);

      pairConsistencyMaps.forEach((pairMap) => {
        const codeValue = normalizeApplicantRecruitmentImportCodeValue(row?.[pairMap.codeKey]);
        const nameValue = normalizeApplicantRecruitmentImportNameValue(row?.[pairMap.nameKey]);
        const hasCodeValue = codeValue !== "";
        const hasNameValue = nameValue !== "";

        if (hasCodeValue !== hasNameValue) {
          throw createHttpError(
            400,
            `${rowLabel}의 ${pairMap.codeLabel}/${pairMap.nameLabel}은(는) 둘 다 입력하거나 둘 다 비워야 합니다.`,
            "APPLICANT_RECRUITMENT_IMPORT_PAIR_REQUIRED",
          );
        }

        if (hasCodeValue && hasNameValue) {
          rememberPair(pairMap, codeValue, nameValue, rowLabel);
        }
      });
    });
  }

  async function buildApplicantRecruitmentUnitTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("전형관리", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = APPLICANT_UNIT_TEMPLATE_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRow(
      APPLICANT_UNIT_TEMPLATE_COLUMNS.reduce((row, column) => {
        row[column.key] = column.sample;
        return row;
      }, {}),
    );

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= APPLICANT_UNIT_TEMPLATE_COLUMNS.length; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildApplicantRecruitmentUnitExportBuffer(rows = []) {
    const normalizedRows = (Array.isArray(rows) ? rows : [])
      .map((row) => normalizeApplicantRecruitmentUnitRecord(row))
      .filter((row) => APPLICANT_UNIT_TEMPLATE_COLUMNS.some((column) => String(row?.[column.key] || "").trim() !== ""));

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "다운로드할 전형 관리 데이터가 없습니다.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("전형관리", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = APPLICANT_UNIT_TEMPLATE_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRows(
      normalizedRows.map((row) =>
        APPLICANT_UNIT_TEMPLATE_COLUMNS.reduce((record, column) => {
          record[column.key] = String(row?.[column.key] || "").trim();
          return record;
        }, {}),
      ),
    );

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= APPLICANT_UNIT_TEMPLATE_COLUMNS.length; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildApplicantSubmissionExportBuffer(rows = []) {
    const schedules = await getApplicantSchedules();
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => {
      const normalizedAnswerItems = normalizeStoredAnswerItems(row?.answerItems);
      const applicantScheduleState = getApplicantSubmissionScheduleState(findApplicantScheduleRecord(schedules, row));

      return {
        id: String(row?.id || "").trim(),
        name: String(row?.name || "").trim(),
        email: String(row?.email || "").trim(),
        statusLabel: String(
          row?.statusLabel ||
            getSharedApplicantStatusLabel(row?.status, {
              scheduleState: applicantScheduleState,
            }) ||
            row?.status ||
            "접수 완료",
        ).trim(),
        promotedExamineeNo: String(row?.promotedExamineeNo || "").trim(),
        createdAt: String(row?.createdAt || "").trim(),
        updatedAt: String(row?.updatedAt || "").trim(),
        answerValues: normalizedAnswerItems.map((answerItem) => {
          if (answerItem.inputType === "photo") {
            return answerItem?.value?.hasPhoto ? String(answerItem?.value?.fileName || "등록된 사진").trim() : "미등록";
          }

          if (answerItem.inputType === "file") {
            return answerItem?.value?.hasFile ? String(answerItem?.value?.fileName || "등록된 파일").trim() : "미등록";
          }

          return String(answerItem?.value || "").trim();
        }),
      };
    });
    const exportableRows = normalizedRows.filter((row) => row.id || row.name || row.email || row.answerValues.length > 0);

    if (exportableRows.length === 0) {
      throw createHttpError(400, "다운로드할 접수 이력 데이터가 없습니다.");
    }

    const maxAnswerCount = exportableRows.reduce(
      (maximum, row) => Math.max(maximum, Array.isArray(row.answerValues) ? row.answerValues.length : 0),
      0,
    );
    const fixedColumns = [
      { header: "접수번호", key: "id", width: 14 },
      { header: "이름", key: "name", width: 20 },
      { header: "이메일", key: "email", width: 28 },
      { header: "상태", key: "statusLabel", width: 12 },
      { header: "수험번호", key: "promotedExamineeNo", width: 18 },
      { header: "접수일시", key: "createdAt", width: 22 },
      { header: "최종수정", key: "updatedAt", width: 22 },
    ];
    const answerColumns = Array.from({ length: maxAnswerCount }, (_, index) => ({
      header: `질문${index + 1}`,
      key: `answer${index + 1}`,
      width: 24,
    }));
    const worksheetColumns = [...fixedColumns, ...answerColumns];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("접수이력", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = worksheetColumns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRows(
      exportableRows.map((row) => {
        const record = {
          id: row.id,
          name: row.name,
          email: row.email,
          statusLabel: row.statusLabel,
          promotedExamineeNo: row.promotedExamineeNo,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };

        answerColumns.forEach((column, index) => {
          record[column.key] = String(row.answerValues[index] || "").trim();
        });

        return record;
      }),
    );

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= worksheetColumns.length; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildApplicantSubmissionPhotoArchiveBuffer(rows = []) {
    const normalizedRows = (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        submissionId: Number(row?.id || row?.submissionId || 0),
        promotedExamineeNo: String(row?.promotedExamineeNo || "").trim(),
        photoFileName: path.basename(String(row?.photoFileName || "").trim()),
      }))
      .filter((row) => row.submissionId > 0 || row.promotedExamineeNo || row.photoFileName);

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "다운로드할 수험생 사진 대상이 없습니다.");
    }

    const zip = new AdmZip();
    const handledKeys = new Set();
    const handledZipEntryNames = new Set();
    let addedPhotoCount = 0;

    for (const row of normalizedRows) {
      const dedupeKey = row.submissionId > 0 ? `submission:${row.submissionId}` : row.promotedExamineeNo || row.photoFileName;

      if (!dedupeKey || handledKeys.has(dedupeKey)) {
        continue;
      }

      handledKeys.add(dedupeKey);
      const storedApplicantPhoto =
        row.submissionId > 0 ? await readStoredApplicantPhotoFile(row.submissionId, row.promotedExamineeNo, row.photoFileName) : null;
      const storedPhoto = storedApplicantPhoto || (await readStoredPromotedPhotoFile(row.promotedExamineeNo));

      if (!storedPhoto?.photoBlob) {
        continue;
      }

      const fallbackExtension = String(storedPhoto.photoMime || "").trim().toLowerCase() === "image/png" ? ".png" : ".jpg";
      const entryExtension = path.extname(String(storedPhoto.photoName || "").trim()).toLowerCase() || fallbackExtension;
      const entryBaseName = row.promotedExamineeNo || (row.submissionId > 0 ? `submission-${row.submissionId}` : "photo");
      let entryName = `${entryBaseName}${entryExtension}`;
      let duplicateIndex = 1;

      while (handledZipEntryNames.has(entryName.toLowerCase())) {
        duplicateIndex += 1;
        entryName = `${entryBaseName}-${duplicateIndex}${entryExtension}`;
      }

      handledZipEntryNames.add(entryName.toLowerCase());
      zip.addFile(entryName, storedPhoto.photoBlob);
      addedPhotoCount += 1;
    }

    if (addedPhotoCount === 0) {
      throw createHttpError(400, "접수 사진 저장소에서 다운로드할 사진 파일을 찾을 수 없습니다.");
    }

    return zip.toBuffer();
  }

  function ensureApplicantPromotionPairConsistency(state = {}, codeValue = "", nameValue = "", rowLabel = "", pairLabel = "") {
    const normalizedCodeValue = String(codeValue || "").trim();
    const normalizedNameValue = String(nameValue || "").trim();

    if (!normalizedCodeValue || !normalizedNameValue) {
      return;
    }

    const existingNameValue = state.codeToNameMap.get(normalizedCodeValue);
    const existingCodeValue = state.nameToCodeMap.get(normalizedNameValue);

    if (existingNameValue && existingNameValue !== normalizedNameValue) {
      throw createHttpError(
        400,
        `${rowLabel}의 ${pairLabel} 코드 '${normalizedCodeValue}'는 '${existingNameValue}'로 이미 사용 중입니다.`,
        "APPLICANT_ASSIGNMENT_CODE_NAME_MISMATCH",
      );
    }

    if (existingCodeValue && existingCodeValue !== normalizedCodeValue) {
      throw createHttpError(
        400,
        `${rowLabel}의 ${pairLabel}명 '${normalizedNameValue}'는 코드 '${existingCodeValue}'로 이미 사용 중입니다.`,
        "APPLICANT_ASSIGNMENT_CODE_NAME_MISMATCH",
      );
    }

    state.codeToNameMap.set(normalizedCodeValue, normalizedNameValue);
    state.nameToCodeMap.set(normalizedNameValue, normalizedCodeValue);
  }

  async function buildApplicantPromotionAssignmentTemplateBuffer(submissionIds = []) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(submissionIds);
    await assertApplicantPromotionWindowClosed(normalizedSubmissionIds);
    const submissions = await getApplicantSubmissionsByIds(normalizedSubmissionIds, { includeInternal: true });
    const submissionIdSet = new Set(submissions.map((submission) => Number(submission?.id || 0)));
    const missingSubmissionIds = normalizedSubmissionIds.filter((submissionId) => !submissionIdSet.has(submissionId));

    if (missingSubmissionIds.length > 0) {
      throw createHttpError(404, "선택한 접수 이력 중 일부를 찾을 수 없습니다.", "APPLICANT_PROMOTION_SUBMISSION_NOT_FOUND");
    }

    if (submissions.some((submission) => String(submission?.status || "").trim() === "promoted")) {
      throw createHttpError(409, "이미 수험생으로 이관된 접수 이력이 포함되어 있습니다.", "APPLICANT_PROMOTION_ALREADY_PROMOTED");
    }

    const summaryRowsByGroupKey = new Map();

    submissions.forEach((submission) => {
      const promotableRecord = buildPromotableApplicantRecord(submission);
      const groupKey = buildApplicantPromotionGroupKey(promotableRecord);
      const groupRow = summaryRowsByGroupKey.get(groupKey) || {
        track: String(promotableRecord.track || "").trim(),
        admission: String(promotableRecord.admission || "").trim(),
        series: String(promotableRecord.series || "").trim(),
        unit: String(promotableRecord.unit || "").trim(),
        major: String(promotableRecord.major || "").trim(),
        applicantCount: 0,
        missingPhotoCount: 0,
      };

      groupRow.applicantCount += 1;

      if (!getApplicantSubmissionHasPhoto(submission)) {
        groupRow.missingPhotoCount += 1;
      }

      summaryRowsByGroupKey.set(groupKey, groupRow);
    });

    const summaryRows = Array.from(summaryRowsByGroupKey.values()).sort((leftRow, rightRow) => {
      return (
        compareApplicantPromotionText(leftRow.track, rightRow.track) ||
        compareApplicantPromotionText(leftRow.admission, rightRow.admission) ||
        compareApplicantPromotionText(leftRow.series, rightRow.series) ||
        compareApplicantPromotionText(leftRow.unit, rightRow.unit) ||
        compareApplicantPromotionText(leftRow.major, rightRow.major)
      );
    });
    const assignmentRowsByAssignmentKey = new Map();

    summaryRows.forEach((row) => {
      const assignmentKey = buildApplicantPromotionAssignmentKey(row);
      const assignmentRow = assignmentRowsByAssignmentKey.get(assignmentKey) || {
        track: String(row.track || "").trim(),
        admission: String(row.admission || "").trim(),
        series: String(row.series || "").trim(),
        unit: String(row.unit || "").trim(),
        major: String(row.major || "").trim(),
        date: "",
        time: "",
        buildingCode: "",
        building: "",
        roomCode: "",
        room: "",
        assignedCount: 0,
      };

      assignmentRow.assignedCount += Number(row.applicantCount || 0);
      assignmentRowsByAssignmentKey.set(assignmentKey, assignmentRow);
    });

    const assignmentRows = Array.from(assignmentRowsByAssignmentKey.values()).sort((leftRow, rightRow) => {
      return (
        compareApplicantPromotionText(leftRow.track, rightRow.track) ||
        compareApplicantPromotionText(leftRow.admission, rightRow.admission) ||
        compareApplicantPromotionText(leftRow.series, rightRow.series) ||
        compareApplicantPromotionText(leftRow.unit, rightRow.unit) ||
        compareApplicantPromotionText(leftRow.major, rightRow.major)
      );
    });
    const workbook = new ExcelJS.Workbook();
    const summaryWorksheet = workbook.addWorksheet("대상자요약", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const assignmentWorksheet = workbook.addWorksheet("배정표", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    summaryWorksheet.columns = APPLICANT_ASSIGNMENT_SUMMARY_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));
    assignmentWorksheet.columns = APPLICANT_ASSIGNMENT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(summaryWorksheet);
    applyWorkbookHeaderStyle(assignmentWorksheet);
    summaryWorksheet.addRows(summaryRows);
    assignmentWorksheet.addRows(assignmentRows);

    for (const worksheet of [summaryWorksheet, assignmentWorksheet]) {
      for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
          worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
        }
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function parseApplicantPromotionAssignmentWorkbook(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "배정표 XLSX 파일 데이터가 없습니다.", "APPLICANT_ASSIGNMENT_WORKBOOK_REQUIRED");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(fileContentBase64, "base64"));

    const worksheet =
      workbook.getWorksheet("배정표") ||
      workbook.worksheets.find((candidateWorksheet) => String(candidateWorksheet?.name || "").trim() === "배정표") ||
      workbook.worksheets[1] ||
      workbook.worksheets[0];

    if (!worksheet) {
      throw createHttpError(400, "배정표 시트를 찾을 수 없습니다.", "APPLICANT_ASSIGNMENT_SHEET_NOT_FOUND");
    }

    const headerRow = worksheet.getRow(1);
    const columnIndexes = APPLICANT_ASSIGNMENT_COLUMNS.reduce((indexes, column) => {
      const matchedColumnIndex =
        headerRow.actualCellCount === 0
          ? -1
          : Array.from({ length: Math.max(worksheet.columnCount, APPLICANT_ASSIGNMENT_COLUMNS.length) }, (_, offset) => offset + 1).find(
              (columnIndex) => getExcelCellText(headerRow.getCell(columnIndex)) === column.header,
            ) ?? -1;

      if (matchedColumnIndex === -1) {
        throw createHttpError(400, `배정표 헤더에 '${column.header}' 컬럼이 없습니다.`, "APPLICANT_ASSIGNMENT_HEADER_INVALID");
      }

      indexes[column.key] = matchedColumnIndex;
      return indexes;
    }, {});

    const assignmentRows = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const rawRow = {};
      let hasAnyValue = false;

      APPLICANT_ASSIGNMENT_COLUMNS.forEach((column) => {
        const value = getExcelCellText(row.getCell(columnIndexes[column.key]));
        rawRow[column.key] = value;
        hasAnyValue = hasAnyValue || value !== "";
      });

      if (!hasAnyValue) {
        continue;
      }

      assignmentRows.push({
        ...rawRow,
        rowNumber,
      });
    }

    return validateApplicantAssignmentRows(assignmentRows);
  }

  async function previewApplicantAssignmentsImport(payload = {}) {
    const sourceRows =
      Array.isArray(payload.rows) && payload.rows.length > 0
        ? payload.rows
        : payload.fileContentBase64
          ? await parseApplicantPromotionAssignmentWorkbook(payload.fileContentBase64)
          : [];
    const normalizedRows = validateApplicantAssignmentRows(sourceRows);
    const currentAssignments = await getApplicantAssignments();
    const classifiedRows = classifyApplicantAssignmentImportRows(normalizedRows, currentAssignments);
    const previewRows = [];
    let insertCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    classifiedRows.forEach(({ row, rowNumber, operation }) => {
      if (operation === "insert") {
        insertCount += 1;
      } else if (operation === "update") {
        updateCount += 1;
      } else {
        unchangedCount += 1;
      }

      if (previewRows.length < APPLICANT_IMPORT_PREVIEW_ROW_LIMIT) {
        previewRows.push({
          rowNumber,
          operation,
          track: row.track,
          admission: row.admission,
          series: row.series,
          unit: row.unit,
          major: row.major,
          date: row.date,
          time: row.time,
          buildingCode: row.buildingCode,
          building: row.building,
          roomCode: row.roomCode,
          room: row.room,
          assignedCount: row.assignedCount,
        });
      }
    });

    return {
      fileName: String(payload.fileName || "").trim(),
      currentTotalCount: currentAssignments.length,
      resultTotalCount: currentAssignments.length + insertCount,
      totalRows: normalizedRows.length,
      insertCount,
      updateCount,
      unchangedCount,
      previewRows,
    };
  }

  function normalizeApplicantPromotionPreviewRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const hasPhoto = row?.hasPhoto === true || Number(row?.hasPhoto) === 1;
      const errors = Array.isArray(row?.errors)
        ? row.errors.map((errorMessage) => String(errorMessage || "").trim()).filter(Boolean)
        : String(row?.errorMessage || "")
            .split(/\r?\n|;\s*/)
            .map((errorMessage) => String(errorMessage || "").trim())
            .filter(Boolean);
      const status = errors.length > 0 ? "error" : hasPhoto ? "ready" : "warning";

      return {
        submissionId: Number(row?.submissionId || 0),
        examineeNo: String(row?.examineeNo || "").trim(),
        name: String(row?.name || "").trim(),
        birth: String(row?.birth || "").trim(),
        track: String(row?.track || "").trim(),
        admission: String(row?.admission || "").trim(),
        series: String(row?.series || "").trim(),
        unit: String(row?.unit || "").trim(),
        major: String(row?.major || "").trim(),
        date: String(row?.date || "").trim(),
        time: String(row?.time || "").trim(),
        buildingCode: String(row?.buildingCode || "").trim(),
        building: String(row?.building || "").trim(),
        roomCode: String(row?.roomCode || "").trim(),
        room: String(row?.room || "").trim(),
        hasPhoto,
        photoStatusLabel: hasPhoto ? "등록" : "미등록",
        status,
        statusLabel: status === "error" ? "오류" : status === "warning" ? "사진 확인" : "준비 완료",
        errors,
        errorMessage: errors.join("; "),
      };
    });
  }

  async function buildApplicantPromotionPreviewExportBuffer(rows = [], summary = {}) {
    const normalizedRows = normalizeApplicantPromotionPreviewRows(rows);

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "내려받을 프리뷰 결과가 없습니다.", "APPLICANT_PROMOTION_PREVIEW_EMPTY");
    }

    const readyRows = normalizedRows.filter((row) => row.status !== "error");
    const errorRows = normalizedRows.filter((row) => row.status === "error");
    const workbook = new ExcelJS.Workbook();
    const resultWorksheet = workbook.addWorksheet("배정결과", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const summaryWorksheet = workbook.addWorksheet("요약", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    resultWorksheet.columns = APPLICANT_PROMOTION_PREVIEW_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));
    summaryWorksheet.columns = [
      { header: "항목", key: "label", width: 22, style: { numFmt: "@" } },
      { header: "값", key: "value", width: 18, style: { numFmt: "@" } },
    ];

    applyWorkbookHeaderStyle(resultWorksheet);
    applyWorkbookHeaderStyle(summaryWorksheet);
    resultWorksheet.addRows(readyRows.map((row) => ({
      ...row,
      errorMessage: row.errorMessage,
    })));
    summaryWorksheet.addRows([
      { label: "전체건수", value: String(summary?.totalCount ?? normalizedRows.length) },
      { label: "정상건수", value: String(summary?.readyCount ?? readyRows.filter((row) => row.status === "ready").length) },
      { label: "오류건수", value: String(summary?.errorCount ?? errorRows.length) },
      { label: "사진미등록", value: String(summary?.missingPhotoCount ?? normalizedRows.filter((row) => !row.hasPhoto).length) },
      { label: "커밋가능", value: summary?.canCommit === true ? "예" : "아니오" },
    ]);

    for (const worksheet of [resultWorksheet, summaryWorksheet]) {
      for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
          worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
        }
      }
    }

    if (errorRows.length > 0) {
      const errorWorksheet = workbook.addWorksheet("오류", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      errorWorksheet.columns = APPLICANT_PROMOTION_PREVIEW_COLUMNS.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width,
        style: { numFmt: "@" },
      }));
      applyWorkbookHeaderStyle(errorWorksheet);
      errorWorksheet.addRows(errorRows.map((row) => ({
        ...row,
        errorMessage: row.errorMessage,
      })));

      for (let rowIndex = 1; rowIndex <= errorWorksheet.rowCount; rowIndex += 1) {
        for (let columnIndex = 1; columnIndex <= errorWorksheet.columnCount; columnIndex += 1) {
          errorWorksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
        }
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function parseApplicantRecruitmentUnitWorkbook(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "XLSX 파일 데이터가 없습니다.");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(fileContentBase64, "base64"));

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw createHttpError(400, "XLSX 파일에서 시트를 찾을 수 없습니다.");
    }

    const headerRow = worksheet.getRow(1);
    const columnIndexes = APPLICANT_UNIT_TEMPLATE_COLUMNS.reduce((indexes, column) => {
      const matchedColumnIndex =
        headerRow.actualCellCount === 0
          ? -1
          : Array.from({ length: Math.max(worksheet.columnCount, APPLICANT_UNIT_TEMPLATE_COLUMNS.length) }, (_, offset) => offset + 1).find(
              (columnIndex) => getExcelCellText(headerRow.getCell(columnIndex)) === column.header,
            ) ?? -1;

      if (matchedColumnIndex === -1) {
        throw createHttpError(400, `XLSX 헤더에 '${column.header}' 컬럼이 없습니다.`);
      }

      indexes[column.key] = matchedColumnIndex;
      return indexes;
    }, {});

    const units = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const unit = {};
      let hasAnyValue = false;

      APPLICANT_UNIT_TEMPLATE_COLUMNS.forEach((column) => {
        const value = getExcelCellText(row.getCell(columnIndexes[column.key]));
        unit[column.key] = value;
        hasAnyValue = hasAnyValue || value !== "";
      });

      if (hasAnyValue) {
        unit.rowNumber = rowNumber;
        units.push(unit);
      }
    }

    if (units.length === 0) {
      throw createHttpError(400, "XLSX에는 헤더와 최소 1개 이상의 데이터 행이 필요합니다.");
    }

    return units;
  }

  async function previewApplicantRecruitmentUnitImport(payload = {}) {
    const sourceRows =
      Array.isArray(payload.rows) && payload.rows.length > 0
        ? payload.rows
        : payload.fileContentBase64
          ? await parseApplicantRecruitmentUnitWorkbook(payload.fileContentBase64)
          : [];

    if (sourceRows.length === 0) {
      throw createHttpError(400, "업로드할 전형 관리 데이터가 없습니다.", "APPLICANT_RECRUITMENT_IMPORT_EMPTY");
    }

    const currentUnits = await getApplicantRecruitmentUnits();
    validateApplicantRecruitmentUnitImportRows(sourceRows, currentUnits);
    const normalizedRows = sourceRows.map((row) => normalizeApplicantRecruitmentUnitPayload(row));
    const classifiedRows = classifyApplicantRecruitmentUnitImportRows(normalizedRows, currentUnits);
    const previewRows = [];
    let insertCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    classifiedRows.forEach(({ row, rowNumber, operation }) => {
      if (operation === "insert") {
        insertCount += 1;
      } else if (operation === "update") {
        updateCount += 1;
      } else {
        unchangedCount += 1;
      }

      if (previewRows.length < APPLICANT_IMPORT_PREVIEW_ROW_LIMIT) {
        previewRows.push({
          rowNumber,
          operation,
          trackName: row.trackName,
          admissionCode: row.admissionCode,
          admissionName: row.admissionName,
          seriesCode: row.seriesCode,
          seriesName: row.seriesName,
          unitCode: row.unitCode,
          unitName: row.unitName,
          majorCode: row.majorCode,
          majorName: row.majorName,
        });
      }
    });

    return {
      fileName: String(payload.fileName || "").trim(),
      currentTotalCount: currentUnits.length,
      resultTotalCount: currentUnits.length + insertCount,
      totalRows: normalizedRows.length,
      insertCount,
      updateCount,
      unchangedCount,
      previewRows,
    };
  }

  function ensureApplicantExamNoPattern(pattern = "") {
    const normalizedPattern = String(pattern || "").trim();

    if (!normalizedPattern) {
      throw createHttpError(400, "수험번호 규칙을 입력하세요.", "APPLICANT_EXAM_NO_PATTERN_REQUIRED");
    }

    if (normalizedPattern.length > 100) {
      throw createHttpError(400, "수험번호 규칙은 100자 이하여야 합니다.", "APPLICANT_EXAM_NO_PATTERN_TOO_LONG");
    }

    if (!/\{SEQ(?::\d{1,2})?\}/.test(normalizedPattern)) {
      throw createHttpError(400, "수험번호 규칙에는 {SEQ} 또는 {SEQ:n} 토큰이 포함되어야 합니다.", "APPLICANT_EXAM_NO_PATTERN_SEQ_REQUIRED");
    }

    const strippedPattern = normalizedPattern.replace(APPLICANT_EXAM_NO_TOKEN_PATTERN, "");

    if (/[{}]/.test(strippedPattern)) {
      throw createHttpError(
        400,
        "수험번호 규칙에는 {YYYY}, {YY}, {MM}, {DD}, {SEQ}, {SEQ:n}, {ADMISSION_CODE}, {SERIES_CODE}, {UNIT_CODE} 토큰만 사용할 수 있습니다.",
        "APPLICANT_EXAM_NO_PATTERN_TOKEN_INVALID",
      );
    }

    return normalizedPattern;
  }

  function normalizeApplicantSequenceStart(value) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1 || normalizedValue > 99999999) {
      throw createHttpError(400, "수험번호 시작 순번은 1 이상 99999999 이하로 입력하세요.", "APPLICANT_EXAM_NO_SEQUENCE_INVALID");
    }

    return normalizedValue;
  }

  function normalizeApplicantExamNoDigitCount(value) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1 || normalizedValue > APPLICANT_MAX_EXAM_NO_DIGIT_COUNT) {
      throw createHttpError(
        400,
        `수험번호 자리수는 1 이상 ${APPLICANT_MAX_EXAM_NO_DIGIT_COUNT} 이하로 입력하세요.`,
        "APPLICANT_EXAM_NO_DIGIT_COUNT_INVALID",
      );
    }

    return normalizedValue;
  }

  function normalizeApplicantExamNoComponents(value) {
    const sourceValues = Array.isArray(value)
      ? value
      : (() => {
          try {
            return JSON.parse(String(value || "[]"));
          } catch (error) {
            return [];
          }
        })();
    const normalizedValues = Array.from({ length: 5 }, (_, index) => {
      const normalizedValue = String(sourceValues?.[index] ?? "").trim();
      return APPLICANT_EXAM_NO_COMPONENT_TYPES.includes(normalizedValue) ? normalizedValue : "";
    });
    const selectedValues = normalizedValues.filter(Boolean);

    if (selectedValues.length === 0) {
      return [...APPLICANT_DEFAULT_EXAM_NO_COMPONENTS];
    }

    if (selectedValues.filter((valueItem) => valueItem === "sequence").length !== 1) {
      throw createHttpError(400, "수험번호 자동 생성 구성에는 순번을 한 번만 포함해야 합니다.", "APPLICANT_EXAM_NO_COMPONENT_SEQUENCE_REQUIRED");
    }

    if (new Set(selectedValues).size !== selectedValues.length) {
      throw createHttpError(400, "수험번호 자동 생성 구성 요소는 중복 없이 선택하세요.", "APPLICANT_EXAM_NO_COMPONENT_DUPLICATED");
    }

    return normalizedValues;
  }

  function normalizeApplicantSettingsRows(rows = []) {
    const rowsByKey = new Map(
      rows.map((row) => [String(row.settingKey || "").trim(), String(row.settingValue || "").trim()]),
    );

    const examNoPattern = rowsByKey.get("applicantExamNoPattern") || defaultApplicantExamNoPattern;
    const rawSequenceStart = rowsByKey.get("applicantExamNoSequenceStart");
    const parsedSequenceStart = Math.round(Number(rawSequenceStart));
    const rawDigitCount = rowsByKey.get("applicantExamNoDigitCount");
    const rawComponentsJson = rowsByKey.get("applicantExamNoComponentsJson");
    let normalizedComponents = [...APPLICANT_DEFAULT_EXAM_NO_COMPONENTS];

    try {
      normalizedComponents = normalizeApplicantExamNoComponents(rawComponentsJson || APPLICANT_DEFAULT_EXAM_NO_COMPONENTS);
    } catch (error) {
      normalizedComponents = [...APPLICANT_DEFAULT_EXAM_NO_COMPONENTS];
    }

    return {
      examNoPattern,
      examNoSequenceStart:
        Number.isFinite(parsedSequenceStart) && parsedSequenceStart >= 1
          ? parsedSequenceStart
          : defaultApplicantExamNoSequenceStart,
      digitCount:
        Number.isFinite(Math.round(Number(rawDigitCount))) && Math.round(Number(rawDigitCount)) >= 1
          ? Math.min(APPLICANT_MAX_EXAM_NO_DIGIT_COUNT, Math.round(Number(rawDigitCount)))
          : APPLICANT_DEFAULT_EXAM_NO_DIGIT_COUNT,
      components: normalizedComponents,
    };
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

  function normalizeApplicantPublicSystemSettingsRows(rows = []) {
    const rowsByKey = new Map(
      rows.map((row) => [String(row.settingKey || "").trim(), String(row.settingValue || "").trim()]),
    );

    return {
      admissionHomepageUrl: String(rowsByKey.get("admissionHomepageUrl") || "").trim(),
      admitCardDataSource: normalizeApplicantAdmitCardDataSource(rowsByKey.get("admitCardDataSource")),
    };
  }

  function normalizeApplicantScheduleDateTime(value, { defaultValue = "" } = {}) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      return defaultValue;
    }

    const matchedValue = normalizedValue.match(APPLICANT_SCHEDULE_DATE_TIME_PATTERN);

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

  function getApplicantScheduleTimestamp(value, { inclusiveEndMinute = false } = {}) {
    const normalizedValue = normalizeApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return NaN;
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] =
      normalizedValue.match(APPLICANT_SCHEDULE_DATE_TIME_PATTERN) || [];
    const scheduleTimestamp = new Date(
      Number(yearValue),
      Number(monthValue) - 1,
      Number(dayValue),
      Number(hourValue),
      Number(minuteValue),
      0,
      0,
    ).getTime();

    return inclusiveEndMinute ? scheduleTimestamp + (60 * 1000 - 1) : scheduleTimestamp;
  }

  function formatApplicantScheduleDateTimeLabel(value) {
    const normalizedValue = normalizeApplicantScheduleDateTime(value);

    if (!normalizedValue) {
      return "";
    }

    const [dateValue, timeValue] = normalizedValue.split("T");
    return `${String(dateValue || "").replaceAll("-", ".")} ${String(timeValue || "")}`;
  }

  function buildApplicantAdmissionScheduleKey(trackName = "", admissionCode = "", admissionName = "") {
    return [String(trackName || "").trim(), String(admissionCode || "").trim(), String(admissionName || "").trim()].join("\u241f");
  }

  function normalizeApplicantScheduleRecord(row = {}) {
    const trackName = String(row.trackName || "").trim();
    const admissionCode = String(row.admissionCode || "").trim();
    const admissionName = String(row.admissionName || "").trim();
    const applicantScheduleStartAt = normalizeApplicantScheduleDateTime(row.applicantScheduleStartAt);
    const applicantScheduleEndAt = normalizeApplicantScheduleDateTime(row.applicantScheduleEndAt);
    const admitCardLookupScheduleStartAt = normalizeApplicantScheduleDateTime(row.admitCardLookupScheduleStartAt);
    const admitCardLookupScheduleEndAt = normalizeApplicantScheduleDateTime(row.admitCardLookupScheduleEndAt);

    return {
      id: Number(row.id || 0),
      scheduleKey: buildApplicantAdmissionScheduleKey(trackName, admissionCode, admissionName),
      trackName,
      admissionCode,
      admissionName,
      applicantScheduleStartAt,
      applicantScheduleStartAtLabel: formatApplicantScheduleDateTimeLabel(applicantScheduleStartAt),
      applicantScheduleEndAt,
      applicantScheduleEndAtLabel: formatApplicantScheduleDateTimeLabel(applicantScheduleEndAt),
      applicantScheduleLabel:
        applicantScheduleStartAt && applicantScheduleEndAt
          ? `${formatApplicantScheduleDateTimeLabel(applicantScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(applicantScheduleEndAt)}`
          : "",
      admitCardLookupScheduleStartAt,
      admitCardLookupScheduleStartAtLabel: formatApplicantScheduleDateTimeLabel(admitCardLookupScheduleStartAt),
      admitCardLookupScheduleEndAt,
      admitCardLookupScheduleEndAtLabel: formatApplicantScheduleDateTimeLabel(admitCardLookupScheduleEndAt),
      admitCardLookupScheduleLabel:
        admitCardLookupScheduleStartAt && admitCardLookupScheduleEndAt
          ? `${formatApplicantScheduleDateTimeLabel(admitCardLookupScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(admitCardLookupScheduleEndAt)}`
          : "",
      createdAt: String(row.createdAt || "").trim(),
      updatedAt: String(row.updatedAt || "").trim(),
    };
  }

  function normalizeOptionalApplicantScheduleRange(scheduleLabel, startValue, endValue) {
    const startAt = normalizeApplicantScheduleDateTime(startValue);
    const endAt = normalizeApplicantScheduleDateTime(endValue);

    if (!startAt && !endAt) {
      return {
        startAt: "",
        endAt: "",
      };
    }

    if (!startAt || !endAt) {
      throw createHttpError(
        400,
        `${scheduleLabel}의 시작 일시와 종료 일시를 모두 입력하세요.`,
        "APPLICANT_SCHEDULE_RANGE_REQUIRED",
      );
    }

    const startTimestamp = getApplicantScheduleTimestamp(startAt);
    const endTimestamp = getApplicantScheduleTimestamp(endAt);

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      throw createHttpError(400, `${scheduleLabel} 형식이 올바르지 않습니다.`, "APPLICANT_SCHEDULE_RANGE_INVALID");
    }

    if (startTimestamp > endTimestamp) {
      throw createHttpError(
        400,
        `${scheduleLabel}의 시작 일시는 종료 일시보다 늦을 수 없습니다.`,
        "APPLICANT_SCHEDULE_RANGE_INVALID",
      );
    }

    return {
      startAt,
      endAt,
    };
  }

  function normalizeApplicantSchedulePayload(payload = {}, existingSchedule = {}) {
    const trackName = normalizeApplicantText(payload.trackName ?? existingSchedule.trackName, "모집시기", {
      required: false,
      maxLength: 100,
      errorCode: "APPLICANT_SCHEDULE_TRACK_NAME_INVALID",
    });
    const admissionCode = normalizeApplicantCode(payload.admissionCode ?? existingSchedule.admissionCode, "전형코드", {
      required: false,
      maxLength: 30,
      errorCode: "APPLICANT_SCHEDULE_ADMISSION_CODE_INVALID",
    });
    const admissionName = normalizeApplicantText(payload.admissionName ?? existingSchedule.admissionName, "전형", {
      required: false,
      maxLength: 100,
      errorCode: "APPLICANT_SCHEDULE_ADMISSION_NAME_INVALID",
    });

    if (!trackName && !admissionCode && !admissionName) {
      throw createHttpError(400, "일정을 저장할 모집시기와 전형 정보를 찾을 수 없습니다.", "APPLICANT_SCHEDULE_TARGET_REQUIRED");
    }

    const applicantScheduleRange = normalizeOptionalApplicantScheduleRange(
      "접수 기간",
      payload.applicantScheduleStartAt ?? existingSchedule.applicantScheduleStartAt,
      payload.applicantScheduleEndAt ?? existingSchedule.applicantScheduleEndAt,
    );
    const admitCardLookupScheduleRange = normalizeOptionalApplicantScheduleRange(
      "수험표 조회 기간",
      payload.admitCardLookupScheduleStartAt ?? existingSchedule.admitCardLookupScheduleStartAt,
      payload.admitCardLookupScheduleEndAt ?? existingSchedule.admitCardLookupScheduleEndAt,
    );

    return {
      trackName,
      admissionCode,
      admissionName,
      applicantScheduleStartAt: applicantScheduleRange.startAt,
      applicantScheduleEndAt: applicantScheduleRange.endAt,
      admitCardLookupScheduleStartAt: admitCardLookupScheduleRange.startAt,
      admitCardLookupScheduleEndAt: admitCardLookupScheduleRange.endAt,
    };
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
        ? `${formatApplicantScheduleDateTimeLabel(scheduleState.admitCardLookupScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(scheduleState.admitCardLookupScheduleEndAt)}`
        : "";
    }

    return scheduleState.isConfigured && scheduleState.applicantScheduleStartAt && scheduleState.applicantScheduleEndAt
      ? `${formatApplicantScheduleDateTimeLabel(scheduleState.applicantScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(scheduleState.applicantScheduleEndAt)}`
      : "";
  }

  async function assertApplicantSubmissionEntryIsOpen(selection = null) {
    const schedules = await getApplicantSchedules();
    const criteria = resolveApplicantScheduleCriteria(selection || {});
    const hasSpecificSelection = Boolean(criteria.trackName && criteria.admissionName);
    const matchedSchedule = hasSpecificSelection ? findApplicantScheduleRecord(schedules, criteria) : null;
    const scheduleState = hasSpecificSelection
      ? getApplicantSubmissionScheduleState(matchedSchedule)
      : getApplicantAggregateScheduleState(schedules, "submission");

    if (scheduleState.isOpen) {
      return scheduleState;
    }

    const contextLabel = hasSpecificSelection ? buildApplicantScheduleContextLabel(criteria) : "현재 접수 가능한 일정";
    const scheduleRangeLabel = buildApplicantScheduleRangeLabel(scheduleState, "submission");

    if (scheduleState.reason === "not_configured") {
      throw createHttpError(
        409,
        hasSpecificSelection
          ? `${contextLabel}의 접수 기간이 아직 설정되지 않았습니다.`
          : "현재 접수 가능한 전형 일정이 없습니다.",
        "APPLICANT_SUBMISSION_SCHEDULE_NOT_CONFIGURED",
      );
    }

    if (scheduleState.reason === "before_start") {
      throw createHttpError(
        409,
        `아직 접수 기간이 아닙니다.${scheduleRangeLabel ? ` 접수 가능 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_SUBMISSION_SCHEDULE_NOT_STARTED",
      );
    }

    if (scheduleState.reason === "after_end") {
      throw createHttpError(
        409,
        `접수 기간이 종료되었습니다.${scheduleRangeLabel ? ` 접수 가능 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_SUBMISSION_SCHEDULE_ENDED",
      );
    }

    throw createHttpError(
      409,
      hasSpecificSelection ? `${contextLabel}의 접수 일정을 확인할 수 없습니다.` : "현재는 접수를 진행할 수 없습니다.",
      "APPLICANT_SUBMISSION_SCHEDULE_CLOSED",
    );
  }

  async function assertApplicantPromotionWindowClosed(submissionIds = []) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(submissionIds);
    const [submissions, schedules] = await Promise.all([
      getApplicantSubmissionsByIds(normalizedSubmissionIds, { includeInternal: true }),
      getApplicantSchedules(),
    ]);
    const foundSubmissionIds = new Set(
      submissions
        .map((submission) => Number(submission?.id || 0))
        .filter((submissionId) => Number.isInteger(submissionId) && submissionId > 0),
    );
    const missingSubmissionIds = normalizedSubmissionIds.filter((submissionId) => !foundSubmissionIds.has(submissionId));

    if (missingSubmissionIds.length > 0) {
      throw createHttpError(404, "선택한 접수 이력 중 일부를 찾을 수 없습니다.", "APPLICANT_SUBMISSION_NOT_FOUND");
    }

    const uniqueScheduleStates = [];
    const handledScheduleKeys = new Set();

    submissions.forEach((submission) => {
      const criteria = resolveApplicantScheduleCriteria(submission);
      const matchedSchedule = findApplicantScheduleRecord(schedules, criteria);
      const scheduleKey =
        matchedSchedule?.scheduleKey || buildApplicantAdmissionScheduleKey(criteria.trackName, criteria.admissionCode, criteria.admissionName);

      if (handledScheduleKeys.has(scheduleKey)) {
        return;
      }

      handledScheduleKeys.add(scheduleKey);
      uniqueScheduleStates.push({
        criteria,
        scheduleState: getApplicantSubmissionScheduleState(matchedSchedule),
      });
    });

    const blockingSchedule = uniqueScheduleStates.find((entry) => entry.scheduleState.reason !== "after_end");

    if (!blockingSchedule) {
      return uniqueScheduleStates;
    }

    const scheduleRangeLabel = buildApplicantScheduleRangeLabel(blockingSchedule.scheduleState, "submission");
    const contextLabel = buildApplicantScheduleContextLabel(blockingSchedule.criteria);

    if (blockingSchedule.scheduleState.reason === "open") {
      throw createHttpError(
        409,
        `${contextLabel} 접수기간 중에는 수험생 이관을 진행할 수 없습니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_PROMOTION_SCHEDULE_OPEN",
      );
    }

    if (blockingSchedule.scheduleState.reason === "before_start") {
      throw createHttpError(
        409,
        `${contextLabel} 접수기간이 종료된 뒤에만 수험생 이관이 가능합니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_PROMOTION_SCHEDULE_NOT_ENDED",
      );
    }

    if (blockingSchedule.scheduleState.reason === "not_configured") {
      throw createHttpError(
        409,
        `${contextLabel}의 접수 기간이 아직 설정되지 않았습니다.`,
        "APPLICANT_PROMOTION_SCHEDULE_NOT_CONFIGURED",
      );
    }

    throw createHttpError(409, "현재는 수험생 이관을 진행할 수 없습니다.", "APPLICANT_PROMOTION_SCHEDULE_CLOSED");
  }

  async function assertApplicantAdmitCardLookupIsOpen(submission = null) {
    const schedules = await getApplicantSchedules();
    const criteria = resolveApplicantScheduleCriteria(submission || {});
    const hasSpecificSelection = Boolean(criteria.trackName && criteria.admissionName);
    const matchedSchedule = hasSpecificSelection ? findApplicantScheduleRecord(schedules, criteria) : null;
    const scheduleState = hasSpecificSelection
      ? getApplicantAdmitCardLookupScheduleState(matchedSchedule)
      : getApplicantAggregateScheduleState(schedules, "lookup");

    if (scheduleState.isOpen) {
      return scheduleState;
    }

    const scheduleRangeLabel = buildApplicantScheduleRangeLabel(scheduleState, "lookup");

    if (scheduleState.reason === "not_configured") {
      throw createHttpError(
        409,
        hasSpecificSelection
          ? `${buildApplicantScheduleContextLabel(criteria)}의 수험표 조회 기간이 아직 설정되지 않았습니다.`
          : "현재 조회 가능한 수험표 일정이 없습니다.",
        "APPLICANT_ADMIT_CARD_LOOKUP_SCHEDULE_NOT_CONFIGURED",
      );
    }

    if (scheduleState.reason === "before_start") {
      throw createHttpError(
        409,
        `아직 수험표 조회 기간이 아닙니다.${scheduleRangeLabel ? ` 조회 가능 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_ADMIT_CARD_LOOKUP_SCHEDULE_NOT_STARTED",
      );
    }

    if (scheduleState.reason === "after_end") {
      throw createHttpError(
        409,
        `수험표 조회 기간이 종료되었습니다.${scheduleRangeLabel ? ` 조회 가능 기간: ${scheduleRangeLabel}` : ""}`,
        "APPLICANT_ADMIT_CARD_LOOKUP_SCHEDULE_ENDED",
      );
    }

    throw createHttpError(409, "현재는 수험표 조회를 진행할 수 없습니다.", "APPLICANT_ADMIT_CARD_LOOKUP_SCHEDULE_CLOSED");
  }

  function normalizeApplicantSettingsPayload(payload = {}) {
    return {
      examNoPattern: ensureApplicantExamNoPattern(payload.examNoPattern ?? defaultApplicantExamNoPattern),
      examNoSequenceStart: normalizeApplicantSequenceStart(payload.examNoSequenceStart ?? defaultApplicantExamNoSequenceStart),
      digitCount: normalizeApplicantExamNoDigitCount(payload.digitCount ?? APPLICANT_DEFAULT_EXAM_NO_DIGIT_COUNT),
      components: normalizeApplicantExamNoComponents(payload.components ?? APPLICANT_DEFAULT_EXAM_NO_COMPONENTS),
    };
  }

  async function getApplicantSettings() {
    const rows = await query(`
      SELECT
        setting_key AS settingKey,
        setting_value AS settingValue
      FROM system_set
      WHERE setting_key IN ('applicantExamNoPattern', 'applicantExamNoSequenceStart', 'applicantExamNoDigitCount', 'applicantExamNoComponentsJson')
    `);

    return normalizeApplicantSettingsRows(rows);
  }

  async function getApplicantPublicSystemSettings() {
    const rows = await query(`
      SELECT
        setting_key AS settingKey,
        setting_value AS settingValue
      FROM system_set
      WHERE setting_key IN (
        'admissionHomepageUrl',
        'admitCardDataSource'
      )
    `);

    return normalizeApplicantPublicSystemSettingsRows(rows);
  }

  async function getApplicantPublicNoticeHtml() {
    const rows = await query(`
      SELECT
        setting_key AS settingKey,
        setting_value AS settingValue
      FROM system_set
      WHERE setting_key IN ('applicantNoticeHtml')
    `);
    const rowsByKey = new Map(rows.map((row) => [String(row.settingKey || "").trim(), String(row.settingValue || "")]));
    const storedHtml = String(rowsByKey.get("applicantNoticeHtml") || "");

    return storedHtml.trim() ? storedHtml : String(getDefaultApplicantNoticeHtml() || "").trim();
  }

  async function updateApplicantSettings(payload = {}) {
    const nextSettings = normalizeApplicantSettingsPayload(payload);

    await query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES
          ('applicantExamNoPattern', ?),
          ('applicantExamNoSequenceStart', ?),
          ('applicantExamNoDigitCount', ?),
          ('applicantExamNoComponentsJson', ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [
        nextSettings.examNoPattern,
        String(nextSettings.examNoSequenceStart),
        String(nextSettings.digitCount),
        JSON.stringify(nextSettings.components),
      ],
    );

    return getApplicantSettings();
  }

  async function getApplicantFormFields({ activeOnly = false } = {}) {
    const rows = await query(
      `
        SELECT
          id,
          field_key AS fieldKey,
          question_text AS questionText,
          question_description AS questionDescription,
          input_type AS inputType,
          system_field_key AS systemFieldKey,
          options_json AS optionsJson,
          required,
          active,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_form
        ${activeOnly ? "WHERE active = 1" : ""}
        ORDER BY sort_order ASC, id ASC
      `,
    );

    return rows.map(normalizeApplicantFormFieldRecord);
  }

  async function getApplicantFormFieldById(fieldId, options = {}) {
    const normalizedFieldId = Number(fieldId);

    if (!Number.isInteger(normalizedFieldId) || normalizedFieldId <= 0) {
      throw createHttpError(400, "접수 양식 항목 ID가 올바르지 않습니다.", "APPLICANT_FIELD_ID_INVALID");
    }

    const rows = await query(
      `
        SELECT
          id,
          field_key AS fieldKey,
          question_text AS questionText,
          question_description AS questionDescription,
          input_type AS inputType,
          system_field_key AS systemFieldKey,
          options_json AS optionsJson,
          required,
          active,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_form
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedFieldId],
    );

    const field = normalizeApplicantFormFieldRecord(rows[0] || {});

    if (!field.id && options.required !== false) {
      throw createHttpError(404, "접수 양식 항목을 찾을 수 없습니다.", "APPLICANT_FIELD_NOT_FOUND");
    }

    return field.id ? field : null;
  }

  function normalizeApplicantAssignmentRecord(row = {}) {
    return {
      id: Number(row.id || 0),
      track: String(row.track || "").trim(),
      admission: String(row.admission || "").trim(),
      series: String(row.series || "").trim(),
      unit: String(row.unit || "").trim(),
      major: String(row.major || "").trim(),
      date: String(row.date || "").trim(),
      time: String(row.time || "").trim(),
      buildingCode: String(row.buildingCode || "").trim(),
      building: String(row.building || "").trim(),
      roomCode: String(row.roomCode || "").trim(),
      room: String(row.room || "").trim(),
      assignedCount: Number(row.assignedCount || 0),
      sortOrder: Number(row.sortOrder || 0),
      createdAt: String(row.createdAt || "").trim(),
      updatedAt: String(row.updatedAt || "").trim(),
    };
  }

  async function getApplicantAssignments(options = {}) {
    const rows = await executeRows(
      options.queryable || query,
      `
        SELECT
          id,
          track,
          admission,
          series,
          unit,
          major,
          COALESCE(DATE_FORMAT(exam_date, '%Y-%m-%d'), '') AS date,
          \`time\` AS time,
          building_code AS buildingCode,
          building,
          room_code AS roomCode,
          room,
          assigned_count AS assignedCount,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_assign
        ORDER BY exam_date ASC, \`time\` ASC, building_code ASC, room_code ASC, id ASC
      `,
    );

    return rows.map((row) => normalizeApplicantAssignmentRecord(row));
  }

  async function getApplicantAssignmentById(assignmentId, options = {}) {
    const normalizedAssignmentId = Number(assignmentId || 0);

    if (!Number.isInteger(normalizedAssignmentId) || normalizedAssignmentId <= 0) {
      throw createHttpError(404, "배정표 행을 찾을 수 없습니다.", "APPLICANT_ASSIGNMENT_NOT_FOUND");
    }

    const rows = await executeRows(
      options.queryable || query,
      `
        SELECT
          id,
          track,
          admission,
          series,
          unit,
          major,
          COALESCE(DATE_FORMAT(exam_date, '%Y-%m-%d'), '') AS date,
          \`time\` AS time,
          building_code AS buildingCode,
          building,
          room_code AS roomCode,
          room,
          assigned_count AS assignedCount,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_assign
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedAssignmentId],
    );
    const assignment = normalizeApplicantAssignmentRecord(rows[0] || {});

    if (!assignment.id && options.required !== false) {
      throw createHttpError(404, "배정표 행을 찾을 수 없습니다.", "APPLICANT_ASSIGNMENT_NOT_FOUND");
    }

    return assignment.id ? assignment : null;
  }

  async function resequenceApplicantAssignments(connection, rows = []) {
    for (let index = 0; index < rows.length; index += 1) {
      await connection.query(`UPDATE app_assign SET sort_order = ? WHERE id = ?`, [index + 1, rows[index].id]);
    }
  }

  async function buildApplicantAssignmentExportBuffer(rows = []) {
    const normalizedRows =
      Array.isArray(rows) && rows.length > 0 ? validateApplicantAssignmentRows(rows) : await getApplicantAssignments();

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "내려받을 배정표 데이터가 없습니다.", "APPLICANT_ASSIGNMENT_EXPORT_EMPTY");
    }

    return buildApplicantAssignmentWorkbookBuffer(normalizedRows);
  }

  async function createApplicantAssignment(payload = {}) {
    const normalizedPayload = normalizeApplicantAssignmentPayload(payload);
    const existingRows = await getApplicantAssignments();
    const [summaryRows] = await query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM app_assign`);
    const nextSortOrder = Number(summaryRows?.nextSortOrder || summaryRows?.[0]?.nextSortOrder || 1);

    validateApplicantAssignmentRows([...existingRows, normalizedPayload]);

    await query(
      `
        INSERT INTO app_assign (
          track,
          admission,
          series,
          unit,
          major,
          exam_date,
          \`time\`,
          building_code,
          building,
          room_code,
          room,
          assigned_count,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedPayload.track,
        normalizedPayload.admission,
        normalizedPayload.series,
        normalizedPayload.unit,
        normalizedPayload.major,
        normalizedPayload.date,
        normalizedPayload.time,
        normalizedPayload.buildingCode,
        normalizedPayload.building,
        normalizedPayload.roomCode,
        normalizedPayload.room,
        normalizedPayload.assignedCount,
        nextSortOrder,
      ],
    );

    return getApplicantAssignments();
  }

  async function updateApplicantAssignment(assignmentId, payload = {}) {
    const existingAssignment = await getApplicantAssignmentById(assignmentId);
    const normalizedPayload = normalizeApplicantAssignmentPayload(payload);
    const existingRows = await getApplicantAssignments();

    validateApplicantAssignmentRows([
      ...existingRows.filter((row) => Number(row.id || 0) !== existingAssignment.id),
      { ...normalizedPayload, id: existingAssignment.id },
    ]);

    await query(
      `
        UPDATE app_assign
        SET
          track = ?,
          admission = ?,
          series = ?,
          unit = ?,
          major = ?,
          exam_date = ?,
          \`time\` = ?,
          building_code = ?,
          building = ?,
          room_code = ?,
          room = ?,
          assigned_count = ?
        WHERE id = ?
      `,
      [
        normalizedPayload.track,
        normalizedPayload.admission,
        normalizedPayload.series,
        normalizedPayload.unit,
        normalizedPayload.major,
        normalizedPayload.date,
        normalizedPayload.time,
        normalizedPayload.buildingCode,
        normalizedPayload.building,
        normalizedPayload.roomCode,
        normalizedPayload.room,
        normalizedPayload.assignedCount,
        existingAssignment.id,
      ],
    );

    return getApplicantAssignments();
  }

  async function deleteApplicantAssignment(assignmentId) {
    const existingAssignment = await getApplicantAssignmentById(assignmentId);
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(`DELETE FROM app_assign WHERE id = ?`, [existingAssignment.id]);
      const rows = await getApplicantAssignments({
        queryable: connection.query.bind(connection),
      });
      await resequenceApplicantAssignments(connection, rows);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getApplicantAssignments();
  }

  async function importApplicantAssignments(payload = {}) {
    const sourceRows =
      Array.isArray(payload.rows) && payload.rows.length > 0
        ? payload.rows
        : payload.fileContentBase64
          ? await parseApplicantPromotionAssignmentWorkbook(payload.fileContentBase64)
          : [];
    const normalizedRows = validateApplicantAssignmentRows(sourceRows);
    const existingDataPolicy = normalizeApplicantImportExistingDataPolicy(payload.existingDataPolicy);

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "업로드할 배정표 데이터가 없습니다.", "APPLICANT_ASSIGNMENT_IMPORT_EMPTY");
    }

    const currentAssignments = await getApplicantAssignments();
    const selectedRows = classifyApplicantAssignmentImportRows(normalizedRows, currentAssignments)
      .filter((entry) => shouldProcessApplicantImportOperation(entry.operation, existingDataPolicy))
      .map((entry) => entry.row);

    if (selectedRows.length === 0) {
      throw createHttpError(
        400,
        "선택한 기존 데이터 처리 방식에 따라 반영할 배정표 데이터가 없습니다.",
        "APPLICANT_ASSIGNMENT_IMPORT_NOTHING_SELECTED",
      );
    }

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const [summaryRows] = await connection.query(`SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder FROM app_assign`);
      let nextSortOrder = Number(summaryRows?.[0]?.maxSortOrder || 0);

      for (const row of selectedRows) {
        nextSortOrder += 1;

        await connection.query(
          `
            INSERT INTO app_assign (
              track,
              admission,
              series,
              unit,
              major,
              exam_date,
              \`time\`,
              building_code,
              building,
              room_code,
              room,
              assigned_count,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              track = VALUES(track),
              admission = VALUES(admission),
              series = VALUES(series),
              unit = VALUES(unit),
              major = VALUES(major),
              exam_date = VALUES(exam_date),
              \`time\` = VALUES(\`time\`),
              building = VALUES(building),
              room = VALUES(room),
              assigned_count = VALUES(assigned_count)
          `,
          [
            row.track,
            row.admission,
            row.series,
            row.unit,
            row.major,
            row.date,
            row.time,
            row.buildingCode,
            row.building,
            row.roomCode,
            row.room,
            row.assignedCount,
            nextSortOrder,
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      processed: selectedRows.length,
      assignments: await getApplicantAssignments(),
    };
  }

  async function getApplicantRecruitmentUnits(options = {}) {
    const rows = await executeRows(
      options.queryable || query,
      `
        SELECT
          id,
          track_name AS trackName,
          admission_code AS admissionCode,
          admission_name AS admissionName,
          series_code AS seriesCode,
          series_name AS seriesName,
          unit_code AS unitCode,
          unit_name AS unitName,
          major_code AS majorCode,
          major_name AS majorName,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_unit
        ORDER BY sort_order ASC, id ASC
      `,
    );

    return rows.map(normalizeApplicantRecruitmentUnitRecord);
  }

  async function getApplicantSchedules(options = {}) {
    const rows = await executeRows(
      options.queryable || query,
      `
        SELECT
          COALESCE(schedule.id, 0) AS id,
          grouped_units.track_name AS trackName,
          grouped_units.admission_code AS admissionCode,
          grouped_units.admission_name AS admissionName,
          COALESCE(DATE_FORMAT(schedule.applicant_schedule_start_at, '%Y-%m-%dT%H:%i'), '') AS applicantScheduleStartAt,
          COALESCE(DATE_FORMAT(schedule.applicant_schedule_end_at, '%Y-%m-%dT%H:%i'), '') AS applicantScheduleEndAt,
          COALESCE(DATE_FORMAT(schedule.admit_card_lookup_schedule_start_at, '%Y-%m-%dT%H:%i'), '') AS admitCardLookupScheduleStartAt,
          COALESCE(DATE_FORMAT(schedule.admit_card_lookup_schedule_end_at, '%Y-%m-%dT%H:%i'), '') AS admitCardLookupScheduleEndAt,
          COALESCE(DATE_FORMAT(schedule.created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(schedule.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM (
          SELECT
            track_name,
            admission_code,
            admission_name,
            MIN(sort_order) AS minSortOrder,
            MIN(id) AS minId
          FROM app_unit
          GROUP BY track_name, admission_code, admission_name
        ) grouped_units
        LEFT JOIN app_schedule schedule
          ON schedule.track_name = grouped_units.track_name
         AND schedule.admission_code = grouped_units.admission_code
         AND schedule.admission_name = grouped_units.admission_name
        ORDER BY
          grouped_units.minSortOrder ASC,
          grouped_units.minId ASC,
          grouped_units.track_name ASC,
          grouped_units.admission_name ASC,
          grouped_units.admission_code ASC
      `,
    );

    return rows.map(normalizeApplicantScheduleRecord);
  }

  async function getApplicantRecruitmentUnitById(unitId, options = {}) {
    const normalizedUnitId = Number(unitId);

    if (!Number.isInteger(normalizedUnitId) || normalizedUnitId <= 0) {
      throw createHttpError(400, "전형 관리 항목 ID가 올바르지 않습니다.", "APPLICANT_RECRUITMENT_UNIT_ID_INVALID");
    }

    const rows = await query(
      `
        SELECT
          id,
          track_name AS trackName,
          admission_code AS admissionCode,
          admission_name AS admissionName,
          series_code AS seriesCode,
          series_name AS seriesName,
          unit_code AS unitCode,
          unit_name AS unitName,
          major_code AS majorCode,
          major_name AS majorName,
          sort_order AS sortOrder,
          COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt
        FROM app_unit
        WHERE id = ?
        LIMIT 1
      `,
      [normalizedUnitId],
    );
    const unit = normalizeApplicantRecruitmentUnitRecord(rows[0] || {});

    if (!unit.id && options.required !== false) {
      throw createHttpError(404, "전형 관리 항목을 찾을 수 없습니다.", "APPLICANT_RECRUITMENT_UNIT_NOT_FOUND");
    }

    return unit.id ? unit : null;
  }

  async function saveApplicantSchedule(payload = {}) {
    const normalizedPayload = normalizeApplicantSchedulePayload(payload);
    const matchingUnits = await query(
      `
        SELECT id
        FROM app_unit
        WHERE track_name = ?
          AND admission_code = ?
          AND admission_name = ?
        LIMIT 1
      `,
      [normalizedPayload.trackName, normalizedPayload.admissionCode, normalizedPayload.admissionName],
    );

    if (matchingUnits.length === 0) {
      throw createHttpError(404, "일정을 설정할 전형 관리 항목을 찾을 수 없습니다.", "APPLICANT_SCHEDULE_TARGET_NOT_FOUND");
    }

    await query(
      `
        INSERT INTO app_schedule (
          track_name,
          admission_code,
          admission_name,
          applicant_schedule_start_at,
          applicant_schedule_end_at,
          admit_card_lookup_schedule_start_at,
          admit_card_lookup_schedule_end_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          applicant_schedule_start_at = VALUES(applicant_schedule_start_at),
          applicant_schedule_end_at = VALUES(applicant_schedule_end_at),
          admit_card_lookup_schedule_start_at = VALUES(admit_card_lookup_schedule_start_at),
          admit_card_lookup_schedule_end_at = VALUES(admit_card_lookup_schedule_end_at)
      `,
      [
        normalizedPayload.trackName,
        normalizedPayload.admissionCode,
        normalizedPayload.admissionName,
        normalizedPayload.applicantScheduleStartAt || null,
        normalizedPayload.applicantScheduleEndAt || null,
        normalizedPayload.admitCardLookupScheduleStartAt || null,
        normalizedPayload.admitCardLookupScheduleEndAt || null,
      ],
    );

    return getApplicantSchedules();
  }

  async function validateUniqueApplicantRecruitmentUnit(payload = {}, excludeId = 0) {
    const codeRows = await query(
      `
        SELECT id
        FROM app_unit
        WHERE track_name = ?
          AND admission_code = ?
          AND series_code = ?
          AND unit_code = ?
          AND major_code = ?
          AND id <> ?
        LIMIT 1
      `,
      [payload.trackName, payload.admissionCode, payload.seriesCode, payload.unitCode, payload.majorCode, Number(excludeId || 0)],
    );

    if (codeRows.length > 0) {
      throw createHttpError(409, "같은 코드 조합의 전형 관리 항목이 이미 있습니다.", "APPLICANT_RECRUITMENT_UNIT_CODE_EXISTS");
    }

    const nameRows = await query(
      `
        SELECT id
        FROM app_unit
        WHERE track_name = ?
          AND admission_name = ?
          AND series_name = ?
          AND unit_name = ?
          AND major_name = ?
          AND id <> ?
        LIMIT 1
      `,
      [payload.trackName, payload.admissionName, payload.seriesName, payload.unitName, payload.majorName, Number(excludeId || 0)],
    );

    if (nameRows.length > 0) {
      throw createHttpError(409, "같은 모집시기/전형/계열/모집단위/전공 조합이 이미 있습니다.", "APPLICANT_RECRUITMENT_UNIT_NAME_EXISTS");
    }
  }

  async function validateUniqueApplicantFieldKey(fieldKey, excludeId = 0) {
    const rows = await query(
      `
        SELECT id
        FROM app_form
        WHERE field_key = ?
          AND id <> ?
        LIMIT 1
      `,
      [fieldKey, Number(excludeId || 0)],
    );

    if (rows.length > 0) {
      throw createHttpError(409, "중복된 항목 키가 있습니다. 질문명을 조금 다르게 입력하세요.", "APPLICANT_FIELD_KEY_EXISTS");
    }
  }

  async function validateUniqueApplicantSystemField(systemFieldKey = "", excludeId = 0) {
    const normalizedSystemFieldKey = String(systemFieldKey || "").trim();

    if (!normalizedSystemFieldKey) {
      return;
    }

    const rows = await query(
      `
        SELECT id
        FROM app_form
        WHERE system_field_key = ?
          AND active = 1
          AND id <> ?
        LIMIT 1
      `,
      [normalizedSystemFieldKey, Number(excludeId || 0)],
    );

    if (rows.length > 0) {
      throw createHttpError(409, "같은 시스템 항목에는 하나의 질문만 연결할 수 있습니다.", "APPLICANT_SYSTEM_FIELD_DUPLICATED");
    }
  }

  function normalizeApplicantFormFieldPayload(payload = {}, existingField = {}) {
    const questionText = normalizeApplicantText(payload.questionText ?? existingField.questionText, "질문 제목", {
      maxLength: 255,
      errorCode: "APPLICANT_FIELD_QUESTION_INVALID",
    });
    const questionDescription = normalizeApplicantText(
      payload.questionDescription ?? existingField.questionDescription,
      "질문 설명",
      {
        maxLength: 500,
        required: false,
        errorCode: "APPLICANT_FIELD_DESCRIPTION_INVALID",
      },
    );
    const inputType = String(payload.inputType ?? existingField.inputType ?? "text").trim();
    const systemFieldKey = String(payload.systemFieldKey ?? existingField.systemFieldKey ?? "").trim();
    const required = payload.required ?? existingField.required ?? false;
    const options = normalizeApplicantOptionValues(payload, existingField);
    const customOptionLabel = normalizeApplicantCustomOptionLabel(payload, existingField);
    const allowCustomOption = normalizeApplicantAllowCustomOption(payload, existingField) || Boolean(customOptionLabel);
    const fieldKey = String(existingField.fieldKey || payload.fieldKey || buildApplicantFieldKey(questionText)).trim();

    if (!APPLICANT_FORM_INPUT_TYPES.includes(inputType)) {
      throw createHttpError(400, "지원하지 않는 답변 유형입니다.", "APPLICANT_FIELD_INPUT_TYPE_INVALID");
    }

    if (inputType === "select" && options.length === 0 && allowCustomOption !== true) {
      throw createHttpError(400, "선택지 항목은 최소 1개 이상의 선택지를 입력해야 합니다.", "APPLICANT_FIELD_OPTIONS_REQUIRED");
    }

    if (inputType === "select" && customOptionLabel && !options.includes(customOptionLabel)) {
      throw createHttpError(400, "직접 입력 항목은 선택지 목록에 등록된 항목이어야 합니다.", "APPLICANT_FIELD_CUSTOM_OPTION_INVALID");
    }

    if (inputType !== "select" && (options.length > 0 || allowCustomOption === true || customOptionLabel)) {
      throw createHttpError(400, "선택지 항목에서만 옵션을 입력할 수 있습니다.", "APPLICANT_FIELD_OPTIONS_INVALID");
    }

    if (inputType === "photo" && systemFieldKey && systemFieldKey !== "photo") {
      throw createHttpError(400, "사진 업로드 항목은 수험생 사진 시스템 항목에만 연결할 수 있습니다.", "APPLICANT_FIELD_PHOTO_MAPPING_INVALID");
    }

    if (systemFieldKey === "photo" && inputType !== "photo") {
      throw createHttpError(400, "수험생 사진 시스템 항목은 사진 업로드 유형으로만 설정할 수 있습니다.", "APPLICANT_FIELD_PHOTO_TYPE_REQUIRED");
    }

    if (inputType === "file" && systemFieldKey) {
      throw createHttpError(400, "파일 업로드 항목은 일반 항목으로만 설정할 수 있습니다.", "APPLICANT_FIELD_FILE_MAPPING_INVALID");
    }

    return {
      fieldKey,
      questionText,
      questionDescription,
      inputType,
      systemFieldKey,
      options,
      allowCustomOption,
      customOptionLabel,
      required: required === true || required === "true" || Number(required) === 1,
    };
  }

  async function createApplicantFormField(payload = {}) {
    const existingFields = await getApplicantFormFields();
    const normalizedPayload = normalizeApplicantFormFieldPayload(payload);
    const nextSortOrder = existingFields.length === 0 ? 1 : Math.max(...existingFields.map((field) => field.sortOrder || 0)) + 1;

    await validateUniqueApplicantFieldKey(normalizedPayload.fieldKey);
    await validateUniqueApplicantSystemField(normalizedPayload.systemFieldKey);

    await query(
      `
        INSERT INTO app_form (
          field_key,
          question_text,
          question_description,
          input_type,
          system_field_key,
          options_json,
          required,
          sort_order,
          active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        normalizedPayload.fieldKey,
        normalizedPayload.questionText,
        normalizedPayload.questionDescription,
        normalizedPayload.inputType,
        normalizedPayload.systemFieldKey,
        JSON.stringify({
          items: normalizedPayload.options,
          allowCustomOption: normalizedPayload.allowCustomOption === true,
          customOptionLabel: normalizedPayload.customOptionLabel,
        }),
        normalizedPayload.required ? 1 : 0,
        nextSortOrder,
      ],
    );

    return getApplicantFormFields();
  }

  async function updateApplicantFormField(fieldId, payload = {}) {
    const existingField = await getApplicantFormFieldById(fieldId);
    const normalizedPayload = normalizeApplicantFormFieldPayload(payload, existingField);

    if (protectedApplicantSystemFields.includes(existingField.systemFieldKey) && existingField.systemFieldKey !== normalizedPayload.systemFieldKey) {
      throw createHttpError(400, "이름 항목의 시스템 연결은 변경할 수 없습니다.", "APPLICANT_FIELD_PROTECTED_MAPPING");
    }

    await validateUniqueApplicantFieldKey(normalizedPayload.fieldKey, existingField.id);
    await validateUniqueApplicantSystemField(normalizedPayload.systemFieldKey, existingField.id);

    await query(
      `
        UPDATE app_form
        SET
          field_key = ?,
          question_text = ?,
          question_description = ?,
          input_type = ?,
          system_field_key = ?,
          options_json = ?,
          required = ?
        WHERE id = ?
      `,
      [
        normalizedPayload.fieldKey,
        normalizedPayload.questionText,
        normalizedPayload.questionDescription,
        normalizedPayload.inputType,
        normalizedPayload.systemFieldKey,
        JSON.stringify({
          items: normalizedPayload.options,
          allowCustomOption: normalizedPayload.allowCustomOption === true,
          customOptionLabel: normalizedPayload.customOptionLabel,
        }),
        normalizedPayload.required ? 1 : 0,
        existingField.id,
      ],
    );

    return getApplicantFormFields();
  }

  async function resequenceApplicantFormFields(connection, fields = []) {
    for (let index = 0; index < fields.length; index += 1) {
      await connection.query(`UPDATE app_form SET sort_order = ? WHERE id = ?`, [index + 1, fields[index].id]);
    }
  }

  async function deleteApplicantFormField(fieldId) {
    const existingField = await getApplicantFormFieldById(fieldId);

    await query(`DELETE FROM app_form WHERE id = ?`, [existingField.id]);

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const fields = await getApplicantFormFields();
      await resequenceApplicantFormFields(connection, fields);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getApplicantFormFields();
  }

  async function moveApplicantFormField(fieldId, moveOptions = {}) {
    const normalizedMoveOptions =
      typeof moveOptions === "string"
        ? {
            direction: moveOptions,
          }
        : moveOptions || {};
    const normalizedFieldId = Number(fieldId);
    const fields = await getApplicantFormFields();
    const fieldIndex = fields.findIndex((field) => field.id === normalizedFieldId);

    if (fieldIndex < 0) {
      throw createHttpError(404, "접수 양식 항목을 찾을 수 없습니다.", "APPLICANT_FIELD_NOT_FOUND");
    }

    const normalizedDirection = String(normalizedMoveOptions.direction || "").trim();
    const normalizedTargetFieldId = Number(normalizedMoveOptions.targetFieldId || 0);
    const normalizedPlacement = String(normalizedMoveOptions.placement || "before").trim() === "after" ? "after" : "before";
    let reorderedFields = [...fields];

    if (Number.isInteger(normalizedTargetFieldId) && normalizedTargetFieldId > 0) {
      if (normalizedTargetFieldId === normalizedFieldId) {
        return fields;
      }

      const filteredFields = reorderedFields.filter((field) => field.id !== normalizedFieldId);
      const targetIndex = filteredFields.findIndex((field) => field.id === normalizedTargetFieldId);

      if (targetIndex < 0) {
        throw createHttpError(404, "이동 대상 접수 양식 항목을 찾을 수 없습니다.", "APPLICANT_FIELD_MOVE_TARGET_NOT_FOUND");
      }

      const sourceField = fields[fieldIndex];
      const insertionIndex = normalizedPlacement === "after" ? targetIndex + 1 : targetIndex;
      filteredFields.splice(insertionIndex, 0, sourceField);
      reorderedFields = filteredFields;
    } else {
      if (!["up", "down"].includes(normalizedDirection)) {
        throw createHttpError(400, "이동 방향이 올바르지 않습니다.", "APPLICANT_FIELD_MOVE_DIRECTION_INVALID");
      }

      const targetIndex = normalizedDirection === "up" ? fieldIndex - 1 : fieldIndex + 1;

      if (targetIndex < 0 || targetIndex >= reorderedFields.length) {
        return fields;
      }

      const [movedField] = reorderedFields.splice(fieldIndex, 1);
      reorderedFields.splice(targetIndex, 0, movedField);
    }

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      await resequenceApplicantFormFields(connection, reorderedFields);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getApplicantFormFields();
  }

  async function resequenceApplicantRecruitmentUnits(connection, units = []) {
    for (let index = 0; index < units.length; index += 1) {
      await connection.query(`UPDATE app_unit SET sort_order = ? WHERE id = ?`, [index + 1, units[index].id]);
    }
  }

  async function createApplicantRecruitmentUnit(payload = {}) {
    const existingUnits = await getApplicantRecruitmentUnits();
    const normalizedPayload = normalizeApplicantRecruitmentUnitPayload(payload);
    const nextSortOrder = existingUnits.length === 0 ? 1 : Math.max(...existingUnits.map((unit) => unit.sortOrder || 0)) + 1;

    await validateUniqueApplicantRecruitmentUnit(normalizedPayload);

    await query(
      `
        INSERT INTO app_unit (
          track_name,
          admission_code,
          admission_name,
          series_code,
          series_name,
          unit_code,
          unit_name,
          major_code,
          major_name,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedPayload.trackName,
        normalizedPayload.admissionCode,
        normalizedPayload.admissionName,
        normalizedPayload.seriesCode,
        normalizedPayload.seriesName,
        normalizedPayload.unitCode,
        normalizedPayload.unitName,
        normalizedPayload.majorCode,
        normalizedPayload.majorName,
        nextSortOrder,
      ],
    );

    return getApplicantRecruitmentUnits();
  }

  async function updateApplicantRecruitmentUnit(unitId, payload = {}) {
    const existingUnit = await getApplicantRecruitmentUnitById(unitId);
    const normalizedPayload = normalizeApplicantRecruitmentUnitPayload(payload, existingUnit);

    await validateUniqueApplicantRecruitmentUnit(normalizedPayload, existingUnit.id);

    await query(
      `
        UPDATE app_unit
        SET
          track_name = ?,
          admission_code = ?,
          admission_name = ?,
          series_code = ?,
          series_name = ?,
          unit_code = ?,
          unit_name = ?,
          major_code = ?,
          major_name = ?
        WHERE id = ?
      `,
      [
        normalizedPayload.trackName,
        normalizedPayload.admissionCode,
        normalizedPayload.admissionName,
        normalizedPayload.seriesCode,
        normalizedPayload.seriesName,
        normalizedPayload.unitCode,
        normalizedPayload.unitName,
        normalizedPayload.majorCode,
        normalizedPayload.majorName,
        existingUnit.id,
      ],
    );

    return getApplicantRecruitmentUnits();
  }

  async function deleteApplicantRecruitmentUnit(unitId) {
    const existingUnit = await getApplicantRecruitmentUnitById(unitId);

    await query(`DELETE FROM app_unit WHERE id = ?`, [existingUnit.id]);

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const units = await getApplicantRecruitmentUnits();
      await resequenceApplicantRecruitmentUnits(connection, units);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getApplicantRecruitmentUnits();
  }

  async function importApplicantRecruitmentUnits(payload = {}) {
    const sourceRows =
      Array.isArray(payload.rows) && payload.rows.length > 0
        ? payload.rows
        : payload.fileContentBase64
          ? await parseApplicantRecruitmentUnitWorkbook(payload.fileContentBase64)
          : [];

    if (sourceRows.length === 0) {
      throw createHttpError(400, "업로드할 전형 관리 데이터가 없습니다.", "APPLICANT_RECRUITMENT_IMPORT_EMPTY");
    }

    const currentUnits = await getApplicantRecruitmentUnits();
    validateApplicantRecruitmentUnitImportRows(sourceRows, currentUnits);
    const normalizedRows = sourceRows.map((row) => normalizeApplicantRecruitmentUnitPayload(row));
    const existingDataPolicy = normalizeApplicantImportExistingDataPolicy(payload.existingDataPolicy);
    const selectedRows = classifyApplicantRecruitmentUnitImportRows(normalizedRows, currentUnits)
      .filter((entry) => shouldProcessApplicantImportOperation(entry.operation, existingDataPolicy))
      .map((entry) => entry.row);

    if (selectedRows.length === 0) {
      throw createHttpError(
        400,
        "선택한 기존 데이터 처리 방식에 따라 반영할 전형 관리 데이터가 없습니다.",
        "APPLICANT_RECRUITMENT_IMPORT_NOTHING_SELECTED",
      );
    }

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const [summaryRows] = await connection.query(`SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder FROM app_unit`);
      let nextSortOrder = Number(summaryRows?.[0]?.maxSortOrder || 0);

      for (const row of selectedRows) {
        nextSortOrder += 1;
        await connection.query(
          `
            INSERT INTO app_unit (
              track_name,
              admission_code,
              admission_name,
              series_code,
              series_name,
              unit_code,
              unit_name,
              major_code,
              major_name,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              track_name = VALUES(track_name),
              admission_name = VALUES(admission_name),
              series_code = VALUES(series_code),
              series_name = VALUES(series_name),
              unit_code = VALUES(unit_code),
              unit_name = VALUES(unit_name),
              major_code = VALUES(major_code),
              major_name = VALUES(major_name)
          `,
          [
            row.trackName,
            row.admissionCode,
            row.admissionName,
            row.seriesCode,
            row.seriesName,
            row.unitCode,
            row.unitName,
            row.majorCode,
            row.majorName,
            nextSortOrder,
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      processed: selectedRows.length,
      units: await getApplicantRecruitmentUnits(),
    };
  }

  function parseApplicantStoredPhotoAnswerData(answerData, options = {}) {
    if (!String(answerData || "").trim()) {
      return {
        fileName: "",
        mimeType: "",
        hasPhoto: false,
        ...(options.includeBase64 === true ? { base64: "" } : {}),
      };
    }

    try {
      const parsedValue = JSON.parse(String(answerData || "{}"));
      return {
        fileName: String(parsedValue?.fileName || "").trim(),
        mimeType: String(parsedValue?.mimeType || "").trim(),
        hasPhoto: parsedValue?.hasPhoto === true || Number(parsedValue?.hasPhoto) === 1,
        ...(options.includeBase64 === true ? { base64: String(parsedValue?.base64 || "").trim() } : {}),
      };
    } catch (error) {
      return {
        fileName: "",
        mimeType: "",
        hasPhoto: false,
        ...(options.includeBase64 === true ? { base64: "" } : {}),
      };
    }
  }

  function parseApplicantStoredFileAnswerData(answerData, options = {}) {
    if (!String(answerData || "").trim()) {
      return {
        fileName: "",
        mimeType: "",
        hasFile: false,
        ...(options.includeBase64 === true ? { base64: "" } : {}),
      };
    }

    try {
      const parsedValue = JSON.parse(String(answerData || "{}"));
      return {
        fileName: String(parsedValue?.fileName || parsedValue?.originalFileName || "").trim(),
        mimeType: String(parsedValue?.mimeType || "").trim(),
        hasFile: parsedValue?.hasFile === true || Number(parsedValue?.hasFile) === 1,
        ...(options.includeBase64 === true ? { base64: String(parsedValue?.base64 || "").trim() } : {}),
      };
    } catch (error) {
      return {
        fileName: "",
        mimeType: "",
        hasFile: false,
        ...(options.includeBase64 === true ? { base64: "" } : {}),
      };
    }
  }

  function normalizeApplicantStoredAnswerRow(row = {}, options = {}) {
    const inputType = String(row.inputType || "text").trim() || "text";
    const fieldKey = String(row.fieldKey || "").trim();
    const syntheticSelectionField = getApplicantRecruitmentSelectionFieldByFieldKey(fieldKey);

    if (!fieldKey) {
      return null;
    }

    if (inputType === "photo") {
      const photoValue = parseApplicantStoredPhotoAnswerData(row.answerData, {
        includeBase64: options.includeBase64 === true,
      });

      return {
        fieldKey,
        questionText: String(syntheticSelectionField?.questionText || row.questionText || fieldKey).trim(),
        inputType,
        systemFieldKey: String(syntheticSelectionField?.systemFieldKey || row.systemFieldKey || "").trim(),
        value: {
          fileName: photoValue.fileName,
          mimeType: photoValue.mimeType,
          hasPhoto: photoValue.hasPhoto,
        },
        ...(options.includeInternal === true
          ? {
              internalPhotoValue: {
                ...photoValue,
              },
            }
          : {}),
      };
    }

    if (inputType === "file") {
      const fileValue = parseApplicantStoredFileAnswerData(row.answerData, {
        includeBase64: options.includeBase64 === true,
      });

      return {
        fieldKey,
        questionText: String(syntheticSelectionField?.questionText || row.questionText || fieldKey).trim(),
        inputType,
        systemFieldKey: String(syntheticSelectionField?.systemFieldKey || row.systemFieldKey || "").trim(),
        value: {
          fileName: fileValue.fileName,
          mimeType: fileValue.mimeType,
          hasFile: fileValue.hasFile,
        },
        ...(options.includeInternal === true
          ? {
              internalFileValue: {
                ...fileValue,
              },
            }
          : {}),
      };
    }

    return {
      fieldKey,
      questionText: String(syntheticSelectionField?.questionText || row.questionText || fieldKey).trim(),
      inputType: syntheticSelectionField ? "text" : inputType,
      systemFieldKey: String(syntheticSelectionField?.systemFieldKey || row.systemFieldKey || "").trim(),
      value: String(row.answerData ?? "").trim(),
    };
  }

  function normalizeStoredAnswerItems(answerItems = []) {
    return (Array.isArray(answerItems) ? answerItems : [])
      .map((answerItem) => {
        if (!answerItem || typeof answerItem !== "object") {
          return null;
        }

        if (answerItem.inputType === "photo") {
          const photoValue = answerItem.value && typeof answerItem.value === "object" ? answerItem.value : {};

          return {
            fieldKey: String(answerItem.fieldKey || "").trim(),
            questionText: String(answerItem.questionText || answerItem.fieldKey || "").trim(),
            inputType: "photo",
            systemFieldKey: String(answerItem.systemFieldKey || "").trim(),
            value: {
              fileName: String(photoValue.fileName || "").trim(),
              mimeType: String(photoValue.mimeType || "").trim(),
              hasPhoto: photoValue.hasPhoto === true || Number(photoValue.hasPhoto) === 1,
            },
          };
        }

        if (answerItem.inputType === "file") {
          const fileValue = answerItem.value && typeof answerItem.value === "object" ? answerItem.value : {};

          return {
            fieldKey: String(answerItem.fieldKey || "").trim(),
            questionText: String(answerItem.questionText || answerItem.fieldKey || "").trim(),
            inputType: "file",
            systemFieldKey: String(answerItem.systemFieldKey || "").trim(),
            value: {
              fileName: String(fileValue.fileName || "").trim(),
              mimeType: String(fileValue.mimeType || "").trim(),
              hasFile: fileValue.hasFile === true || Number(fileValue.hasFile) === 1,
            },
          };
        }

        return {
          fieldKey: String(answerItem.fieldKey || "").trim(),
          questionText: String(answerItem.questionText || answerItem.fieldKey || "").trim(),
          inputType: String(answerItem.inputType || "text").trim(),
          systemFieldKey: String(answerItem.systemFieldKey || "").trim(),
          value: String(answerItem.value ?? "").trim(),
        };
      })
      .filter((answerItem) => answerItem?.fieldKey);
  }

  function buildApplicantAnswerMap(answerItems = []) {
    return normalizeStoredAnswerItems(answerItems).reduce((answerMap, answerItem) => {
      answerMap[answerItem.fieldKey] = answerItem.value;
      return answerMap;
    }, {});
  }

  function buildApplicantSystemValueMap(answerItems = []) {
    const systemValueKeys = ["birth", "track", "admission", "series", "unit", "major"];

    return normalizeStoredAnswerItems(answerItems).reduce((systemValueMap, answerItem) => {
      const systemFieldKey = String(answerItem?.systemFieldKey || "").trim();

      if (!systemValueKeys.includes(systemFieldKey) || isApplicantUploadInputType(answerItem?.inputType)) {
        return systemValueMap;
      }

      if (!systemValueMap[systemFieldKey]) {
        systemValueMap[systemFieldKey] = String(answerItem?.value ?? "").trim();
      }

      return systemValueMap;
    }, {
      birth: "",
      track: "",
      admission: "",
      series: "",
      unit: "",
      major: "",
    });
  }

  function buildApplicantSubmissionFromRows(rows = [], options = {}) {
    const normalizedRows = Array.isArray(rows) ? rows : [];

    if (normalizedRows.length === 0) {
      return null;
    }

    const firstRow = normalizedRows[0] || {};
    const answerItems = normalizedRows
      .map((row) => normalizeApplicantStoredAnswerRow(row, options))
      .filter(Boolean);
    const photoAnswerItem = answerItems.find((answerItem) => answerItem.inputType === "photo") || null;
    const promotionOverride = normalizeApplicantPromotionOverride(firstRow.promotionOverrideJson);
    const systemValues = buildApplicantSystemValueMap(answerItems);

    return {
      id: Number(firstRow.id || 0),
      name: String(firstRow.applicantName || "").trim(),
      email: String(firstRow.email || "").trim(),
      hasPassword: Number(firstRow.hasPassword) === 1 || firstRow.hasPassword === true,
      status: String(firstRow.status || "submitted").trim(),
      promotedExamineeNo: String(firstRow.promotedExamineeNo || "").trim(),
      hasPhoto: photoAnswerItem?.value?.hasPhoto === true,
      photoFileName: String(photoAnswerItem?.value?.fileName || "").trim(),
      createdAt: String(firstRow.createdAt || "").trim(),
      updatedAt: String(firstRow.updatedAt || "").trim(),
      promotedAt: String(firstRow.promotedAt || "").trim(),
      birth: systemValues.birth,
      track: systemValues.track,
      admission: systemValues.admission,
      series: systemValues.series,
      unit: systemValues.unit,
      major: systemValues.major,
      promotionOverride,
      answerItems: normalizeStoredAnswerItems(answerItems),
      answerMap: buildApplicantAnswerMap(answerItems),
      ...(options.includeInternal === true
        ? {
            passwordHash: String(firstRow.passwordHash || "").trim(),
            internalPhotoValue: photoAnswerItem?.internalPhotoValue || null,
            promotionOverrideJson: String(firstRow.promotionOverrideJson || "").trim(),
          }
        : {}),
    };
  }

  function buildApplicantSubmissionListFromRows(rows = [], options = {}) {
    const submissionsById = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const submissionId = Number(row?.id || 0);

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        return;
      }

      if (!submissionsById.has(submissionId)) {
        submissionsById.set(submissionId, []);
      }

      submissionsById.get(submissionId).push(row);
    });

    return Array.from(submissionsById.values())
      .map((submissionRows) => buildApplicantSubmissionFromRows(submissionRows, options))
      .filter(Boolean);
  }

  async function getApplicantSubmissionRowsById(queryable, submissionId, options = {}) {
    const normalizedSubmissionId = Number(submissionId);

    if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
      throw createHttpError(400, "접수 이력 ID가 올바르지 않습니다.", "APPLICANT_SUBMISSION_ID_INVALID");
    }

    const lockClause = options.forUpdate === true ? "\n        FOR UPDATE" : "";

    return executeRows(
      queryable,
      `
        SELECT
          s.id,
          s.applicant_name AS applicantName,
          s.email,
          s.password_hash AS passwordHash,
          CASE WHEN s.password_hash IS NULL OR s.password_hash = '' THEN 0 ELSE 1 END AS hasPassword,
          s.status,
          s.field_key AS fieldKey,
          s.answer_data AS answerData,
          COALESCE(ff.question_text, s.field_key) AS questionText,
          COALESCE(ff.input_type, 'text') AS inputType,
          COALESCE(ff.system_field_key, '') AS systemFieldKey,
          COALESCE(meta.promoted_examinee_no, '') AS promotedExamineeNo,
          COALESCE(meta.promotion_override_json, '') AS promotionOverrideJson,
          COALESCE(DATE_FORMAT(summary.created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(summary.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt,
          COALESCE(DATE_FORMAT(meta.promoted_at, '%Y-%m-%d %H:%i:%s'), '') AS promotedAt,
          COALESCE(ff.sort_order, 2147483647) AS sortOrder
        FROM app_subm s
        LEFT JOIN (
          SELECT
            id,
            MIN(created_at) AS created_at,
            MAX(updated_at) AS updated_at
          FROM app_subm
          WHERE id = ?
          GROUP BY id
        ) summary
          ON summary.id = s.id
        LEFT JOIN app_meta meta
          ON meta.id = s.id
        LEFT JOIN app_form ff
          ON ff.field_key = s.field_key
        WHERE s.id = ?
        ORDER BY COALESCE(ff.sort_order, 2147483647), s.field_key ASC${lockClause}
      `,
      [normalizedSubmissionId, normalizedSubmissionId],
    );
  }

  async function getApplicantSubmissionRowsByIds(queryable, submissionIds, options = {}) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(submissionIds);
    const placeholders = normalizedSubmissionIds.map(() => "?").join(", ");
    const lockClause = options.forUpdate === true ? "\n        FOR UPDATE" : "";

    return executeRows(
      queryable,
      `
        SELECT
          s.id,
          s.applicant_name AS applicantName,
          s.email,
          s.password_hash AS passwordHash,
          CASE WHEN s.password_hash IS NULL OR s.password_hash = '' THEN 0 ELSE 1 END AS hasPassword,
          s.status,
          s.field_key AS fieldKey,
          s.answer_data AS answerData,
          COALESCE(ff.question_text, s.field_key) AS questionText,
          COALESCE(ff.input_type, 'text') AS inputType,
          COALESCE(ff.system_field_key, '') AS systemFieldKey,
          COALESCE(meta.promoted_examinee_no, '') AS promotedExamineeNo,
          COALESCE(meta.promotion_override_json, '') AS promotionOverrideJson,
          COALESCE(DATE_FORMAT(summary.created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(summary.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt,
          COALESCE(DATE_FORMAT(meta.promoted_at, '%Y-%m-%d %H:%i:%s'), '') AS promotedAt,
          COALESCE(ff.sort_order, 2147483647) AS sortOrder
        FROM app_subm s
        INNER JOIN (
          SELECT
            id,
            MIN(created_at) AS created_at,
            MAX(updated_at) AS updated_at
          FROM app_subm
          WHERE id IN (${placeholders})
          GROUP BY id
        ) summary
          ON summary.id = s.id
        LEFT JOIN app_meta meta
          ON meta.id = s.id
        LEFT JOIN app_form ff
          ON ff.field_key = s.field_key
        WHERE s.id IN (${placeholders})
        ORDER BY summary.updated_at DESC, s.id DESC, COALESCE(ff.sort_order, 2147483647), s.field_key ASC${lockClause}
      `,
      [...normalizedSubmissionIds, ...normalizedSubmissionIds],
    );
  }

  async function getApplicantSubmissionsByIds(submissionIds, options = {}) {
    const rows = await getApplicantSubmissionRowsByIds(options.queryable || query, submissionIds, {
      forUpdate: options.forUpdate === true,
    });

    return buildApplicantSubmissionListFromRows(rows, {
      includeInternal: options.includeInternal === true,
      includeBase64: options.includeInternal === true,
    });
  }

  async function getApplicantSubmissionById(submissionId, options = {}) {
    const rows = await getApplicantSubmissionRowsById(options.queryable || query, submissionId, {
      forUpdate: options.forUpdate === true,
    });
    const submission = buildApplicantSubmissionFromRows(rows, {
      includeInternal: options.includeInternal === true,
      includeBase64: options.includeBase64 === true,
    });

    if (!submission?.id && options.required !== false) {
      throw createHttpError(404, "접수 이력을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_NOT_FOUND");
    }

    return submission?.id ? submission : null;
  }

  async function getApplicantSubmissionPhoto(submissionId) {
    const submission = await getApplicantSubmissionById(submissionId, {
      includeInternal: true,
    });
    const internalPhotoValue = submission?.internalPhotoValue && typeof submission.internalPhotoValue === "object" ? submission.internalPhotoValue : null;
    const normalizedPhotoFileName = path.basename(String(submission?.photoFileName || internalPhotoValue?.fileName || "").trim());
    const normalizedMimeType = String(internalPhotoValue?.mimeType || "").trim();
    const storedApplicantPhoto = await readStoredApplicantPhotoFile(
      submission?.id,
      submission?.promotedExamineeNo,
      normalizedPhotoFileName,
      normalizedMimeType,
    );

    if (storedApplicantPhoto?.photoBlob) {
      return storedApplicantPhoto;
    }

    const storedPromotedPhoto = await readStoredPromotedPhotoFile(submission?.promotedExamineeNo);

    if (storedPromotedPhoto?.photoBlob) {
      return storedPromotedPhoto;
    }

    const legacySubmission = await getApplicantSubmissionById(submissionId, {
      includeInternal: true,
      includeBase64: true,
    });
    const normalizedBase64 = String(legacySubmission?.internalPhotoValue?.base64 || "").trim();

    if (normalizedBase64) {
      const photoBlob = Buffer.from(normalizedBase64, "base64");

      if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
        return {
          photoBlob,
          photoMime: normalizedMimeType || "application/octet-stream",
          photoName: normalizedPhotoFileName || `applicant-submission-${submission.id}.jpg`,
        };
      }
    }

    throw createHttpError(404, "접수 사진을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_PHOTO_NOT_FOUND");
  }

  async function getApplicantSubmissionFile(submissionId, fieldKey = "") {
    const submission = await getApplicantSubmissionById(submissionId, {
      includeInternal: true,
    });
    const normalizedFieldKey = String(fieldKey || "").trim();
    const fileAnswerItem = normalizeStoredAnswerItems(submission?.answerItems).find((answerItem) => {
      return answerItem?.inputType === "file" && String(answerItem?.fieldKey || "").trim() === normalizedFieldKey;
    });

    if (!fileAnswerItem?.value?.hasFile) {
      throw createHttpError(404, "접수 첨부 파일을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_FILE_NOT_FOUND");
    }

    const storedFile = await readStoredApplicantFile(fileAnswerItem.value.fileName, fileAnswerItem.value.mimeType);

    if (!storedFile?.fileBlob) {
      throw createHttpError(404, "접수 첨부 파일을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_FILE_NOT_FOUND");
    }

    return {
      fileBlob: storedFile.fileBlob,
      fileMime: storedFile.fileMime,
      fileName: String(fileAnswerItem.value.fileName || "").trim() || storedFile.fileName,
    };
  }

  async function getApplicantSubmissions() {
    const rows = await executeRows(
      query,
      `
        SELECT
          s.id,
          s.applicant_name AS applicantName,
          s.email,
          s.password_hash AS passwordHash,
          CASE WHEN s.password_hash IS NULL OR s.password_hash = '' THEN 0 ELSE 1 END AS hasPassword,
          s.status,
          s.field_key AS fieldKey,
          s.answer_data AS answerData,
          COALESCE(ff.question_text, s.field_key) AS questionText,
          COALESCE(ff.input_type, 'text') AS inputType,
          COALESCE(ff.system_field_key, '') AS systemFieldKey,
          COALESCE(meta.promoted_examinee_no, '') AS promotedExamineeNo,
          COALESCE(meta.promotion_override_json, '') AS promotionOverrideJson,
          COALESCE(DATE_FORMAT(summary.created_at, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,
          COALESCE(DATE_FORMAT(summary.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt,
          COALESCE(DATE_FORMAT(meta.promoted_at, '%Y-%m-%d %H:%i:%s'), '') AS promotedAt,
          COALESCE(ff.sort_order, 2147483647) AS sortOrder
        FROM app_subm s
        INNER JOIN (
          SELECT
            id,
            MIN(created_at) AS created_at,
            MAX(updated_at) AS updated_at
          FROM app_subm
          GROUP BY id
        ) summary
          ON summary.id = s.id
        LEFT JOIN app_meta meta
          ON meta.id = s.id
        LEFT JOIN app_form ff
          ON ff.field_key = s.field_key
        ORDER BY summary.updated_at DESC, s.id DESC, COALESCE(ff.sort_order, 2147483647), s.field_key ASC
      `,
    );

    return buildApplicantSubmissionListFromRows(rows);
  }

  async function deleteApplicantSubmission(submissionId) {
    const normalizedSubmissionId = Number(submissionId);

    if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
      throw createHttpError(400, "접수 이력 ID가 올바르지 않습니다.", "APPLICANT_SUBMISSION_ID_INVALID");
    }

    const connection = await getPool().getConnection();
    let submission = null;
    let promotedPhotoDeleteRows = [];
    let deletedExamineeCount = 0;

    try {
      await connection.beginTransaction();
      const queryable = connection.query.bind(connection);

      submission = await getApplicantSubmissionById(normalizedSubmissionId, {
        queryable,
        includeInternal: true,
        forUpdate: true,
      });

      const normalizedPromotedExamineeNo = String(submission?.promotedExamineeNo || "").trim();

      if (normalizedPromotedExamineeNo) {
        const [examineeRows] = await connection.query(
          `
            SELECT
              examinee_no AS examineeNo,
              photo_name AS photoName
            FROM examinee
            WHERE examinee_no = ?
          `,
          [normalizedPromotedExamineeNo],
        );
        const existingExamineeRows = Array.isArray(examineeRows) ? examineeRows : [];
        const [deleteExamineeResult] = await connection.query(`DELETE FROM examinee WHERE examinee_no = ?`, [normalizedPromotedExamineeNo]);

        promotedPhotoDeleteRows =
          existingExamineeRows.length > 0 ? existingExamineeRows : [{ examineeNo: normalizedPromotedExamineeNo, photoName: "" }];
        deletedExamineeCount = Number(deleteExamineeResult?.affectedRows || 0);
      }

      await connection.query(`DELETE FROM app_meta WHERE id = ?`, [normalizedSubmissionId]);
      await connection.query(`DELETE FROM app_subm WHERE id = ?`, [normalizedSubmissionId]);
      await connection.commit();
      await deleteApplicantSubmissionArtifacts(submission, promotedPhotoDeleteRows);

      return {
        deletedSubmissionId: normalizedSubmissionId,
        deletedExamineeCount,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function getLatestApplicantSubmissionByApplicant(name = "", email = "") {
    const normalizedName = normalizeApplicantText(name, "이름", { maxLength: 100 });
    const normalizedEmail = normalizeApplicantEmail(email);
    const latestRows = await executeRows(
      query,
      `
        SELECT
          id
        FROM app_subm
        WHERE applicant_name = ?
          AND email = ?
        GROUP BY id
        ORDER BY MAX(updated_at) DESC, id DESC
        LIMIT 1
      `,
      [normalizedName, normalizedEmail],
    );
    const latestSubmissionId = Number(latestRows?.[0]?.id || 0);

    if (!Number.isInteger(latestSubmissionId) || latestSubmissionId <= 0) {
      return {
        id: 0,
        name: "",
        email: "",
        hasPassword: false,
        status: "submitted",
        promotedExamineeNo: "",
        hasPhoto: false,
        photoFileName: "",
        createdAt: "",
        updatedAt: "",
        promotedAt: "",
        answerItems: [],
        answerMap: {},
      };
    }

    return getApplicantSubmissionById(latestSubmissionId, { required: false });
  }

  function normalizeApplicantPhotoPayload(photoPayload = {}) {
    if (!photoPayload || typeof photoPayload !== "object") {
      return null;
    }

    const base64 = String(photoPayload.base64 || "").trim();

    if (!base64) {
      return null;
    }

    const mimeType = String(photoPayload.mimeType || "").trim() || "application/octet-stream";
    const fileName = String(photoPayload.fileName || "").trim() || `photo-${Date.now()}`;

    return {
      base64,
      fileName,
      mimeType,
    };
  }

  function normalizeApplicantFilePayload(filePayload = {}) {
    if (!filePayload || typeof filePayload !== "object") {
      return null;
    }

    const base64 = String(filePayload.base64 || "").trim();

    if (!base64) {
      return null;
    }

    const mimeType = String(filePayload.mimeType || "").trim() || "application/octet-stream";
    const fileName = String(filePayload.fileName || "").trim() || `file-${Date.now()}`;

    return {
      base64,
      fileName,
      mimeType,
    };
  }

  function getApplicantStoredPhotoMimeType(extension = "") {
    const normalizedExtension = String(extension || "").trim().toLowerCase();

    if (normalizedExtension === ".png") {
      return "image/png";
    }

    if (normalizedExtension === ".jpg" || normalizedExtension === ".jpeg") {
      return "image/jpeg";
    }

    return "";
  }

  function sanitizeApplicantStoredFileNameSegment(value = "", fallbackValue = "file") {
    const normalizedValue = String(value || "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");

    return normalizedValue || String(fallbackValue || "file").trim() || "file";
  }

  function resolveApplicantStoredPhotoExtension(photoValue = {}) {
    const supportedExtensions = new Set([".jpg", ".jpeg", ".png"]);
    const normalizedFileName = String(photoValue?.fileName || "").trim();
    const normalizedMimeType = String(photoValue?.mimeType || "").trim().toLowerCase();
    const fileExtension = path.extname(normalizedFileName).toLowerCase();

    if (supportedExtensions.has(fileExtension)) {
      return fileExtension;
    }

    if (normalizedMimeType === "image/png") {
      return ".png";
    }

    if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
      return ".jpg";
    }

    throw createHttpError(400, "사진 파일 형식은 JPG, JPEG, PNG만 지원합니다.", "APPLICANT_PHOTO_MIME_INVALID");
  }

  function resolveApplicantStoredFileExtension(fileValue = {}) {
    const normalizedFileName = path.basename(String(fileValue?.fileName || "").trim());
    const fileExtension = path.extname(normalizedFileName);

    if (fileExtension) {
      return fileExtension;
    }

    const normalizedMimeType = String(fileValue?.mimeType || "").trim().toLowerCase();

    if (normalizedMimeType === "application/pdf") {
      return ".pdf";
    }

    if (normalizedMimeType === "application/zip") {
      return ".zip";
    }

    if (normalizedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return ".docx";
    }

    if (normalizedMimeType === "application/msword") {
      return ".doc";
    }

    if (normalizedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return ".xlsx";
    }

    if (normalizedMimeType === "application/vnd.ms-excel") {
      return ".xls";
    }

    if (normalizedMimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      return ".pptx";
    }

    if (normalizedMimeType === "application/vnd.ms-powerpoint") {
      return ".ppt";
    }

    if (normalizedMimeType === "text/plain") {
      return ".txt";
    }

    if (normalizedMimeType === "image/png") {
      return ".png";
    }

    if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
      return ".jpg";
    }

    return "";
  }

  function normalizeApplicantStoredPhotoValue(photoValue = {}) {
    const normalizedHasPhoto =
      photoValue?.hasPhoto === true || Number(photoValue?.hasPhoto) === 1 || Boolean(String(photoValue?.base64 || "").trim());

    if (!normalizedHasPhoto) {
      return {
        fileName: "",
        mimeType: "",
        hasPhoto: false,
      };
    }

    const extension = resolveApplicantStoredPhotoExtension(photoValue);
    const normalizedFileName = path.basename(String(photoValue?.fileName || "").trim());
    const baseFileName = path.basename(normalizedFileName, path.extname(normalizedFileName)).trim() || "photo";

    return {
      fileName: `${baseFileName}${extension}`,
      mimeType: getApplicantStoredPhotoMimeType(extension) || String(photoValue?.mimeType || "").trim() || "image/jpeg",
      hasPhoto: true,
    };
  }

  function normalizeApplicantStoredFileValue(fileValue = {}) {
    const normalizedHasFile =
      fileValue?.hasFile === true || Number(fileValue?.hasFile) === 1 || Boolean(String(fileValue?.base64 || "").trim());

    if (!normalizedHasFile) {
      return {
        fileName: "",
        mimeType: "",
        hasFile: false,
      };
    }

    const normalizedFileName = path.basename(String(fileValue?.fileName || "").trim());
    const resolvedExtension = resolveApplicantStoredFileExtension(fileValue);
    const baseFileName = sanitizeApplicantStoredFileNameSegment(
      path.basename(normalizedFileName, path.extname(normalizedFileName)).trim() || "file",
      "file",
    );
    return {
      fileName: `${baseFileName}${resolvedExtension}`,
      mimeType: String(fileValue?.mimeType || "").trim() || "application/octet-stream",
      hasFile: true,
    };
  }

  function buildStoredApplicantPhotoAnswerData(storedPhotoRecord = null, fallbackPhotoValue = {}) {
    const normalizedFallbackPhotoValue = normalizeApplicantStoredPhotoValue(fallbackPhotoValue);

    if (!storedPhotoRecord) {
      return normalizedFallbackPhotoValue;
    }

    return {
      fileName: String(storedPhotoRecord.fileName || "").trim(),
      mimeType: String(storedPhotoRecord.mimeType || "").trim() || normalizedFallbackPhotoValue.mimeType || "image/jpeg",
      hasPhoto: true,
    };
  }

  function buildStoredApplicantFileAnswerData(storedFileRecord = null, fallbackFileValue = {}) {
    const normalizedFallbackFileValue = normalizeApplicantStoredFileValue(fallbackFileValue);

    if (!storedFileRecord) {
      return normalizedFallbackFileValue;
    }

    return {
      fileName: String(storedFileRecord.fileName || "").trim(),
      mimeType: String(storedFileRecord.mimeType || "").trim() || normalizedFallbackFileValue.mimeType || "application/octet-stream",
      hasFile: true,
    };
  }

  function getApplicantStoredPhotoCandidateFileNames(examineeNo = "", photoName = "") {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoName = path.basename(String(photoName || "").trim());
    const photoExtension = path.extname(normalizedPhotoName).toLowerCase();

    return Array.from(
      new Set(
        [
          normalizedPhotoName,
          normalizedExamineeNo && photoExtension ? `${normalizedExamineeNo}${photoExtension}` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpeg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.png` : "",
        ].filter(Boolean),
      ),
    );
  }

  function getLegacyApplicantStoredPhotoCandidateFileNames(photoName = "") {
    const normalizedPhotoName = path.basename(String(photoName || "").trim());
    const photoExtension = path.extname(normalizedPhotoName).toLowerCase();
    const photoBaseName = path.basename(normalizedPhotoName, photoExtension).trim();

    return Array.from(
      new Set(
        [
          normalizedPhotoName,
          photoBaseName ? `${photoBaseName}.jpg` : "",
          photoBaseName ? `${photoBaseName}.jpeg` : "",
          photoBaseName ? `${photoBaseName}.png` : "",
        ].filter(Boolean),
      ),
    );
  }

  async function readStoredApplicantPhotoFile(submissionId, examineeNo = "", photoName = "", photoMime = "") {
    const normalizedSubmissionId = Number(submissionId);
    const candidateFileNames = getApplicantStoredPhotoCandidateFileNames(examineeNo, photoName);

    for (const candidateFileName of candidateFileNames) {
      const normalizedCandidateFileName = path.basename(String(candidateFileName || "").trim());
      const candidateFilePath = path.join(applicantPhotoStorageDirectoryPath, normalizedCandidateFileName);

      try {
        const photoBlob = await fs.promises.readFile(candidateFilePath);

        if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
          const fileExtension = path.extname(normalizedCandidateFileName).toLowerCase();

          return {
            photoBlob,
            photoMime: getApplicantStoredPhotoMimeType(fileExtension) || String(photoMime || "").trim() || "application/octet-stream",
            photoName: normalizedCandidateFileName,
          };
        }
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }

    if (Number.isInteger(normalizedSubmissionId) && normalizedSubmissionId > 0) {
      const legacyPhotoDirectoryPath = path.join(legacyApplicantPhotoStorageDirectoryPath, String(normalizedSubmissionId));

      for (const candidateFileName of getLegacyApplicantStoredPhotoCandidateFileNames(photoName)) {
        const normalizedCandidateFileName = path.basename(String(candidateFileName || "").trim());
        const candidateFilePath = path.join(legacyPhotoDirectoryPath, normalizedCandidateFileName);

        try {
          const photoBlob = await fs.promises.readFile(candidateFilePath);

          if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
            const fileExtension = path.extname(normalizedCandidateFileName).toLowerCase();

            return {
              photoBlob,
              photoMime: getApplicantStoredPhotoMimeType(fileExtension) || String(photoMime || "").trim() || "application/octet-stream",
              photoName: normalizedCandidateFileName,
            };
          }
        } catch (error) {
          if (error?.code !== "ENOENT") {
            throw error;
          }
        }
      }
    }

    return null;
  }

  function getPromotedApplicantPhotoCandidateFileNames(examineeNo, photoName = "") {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoName = path.basename(String(photoName || "").trim());

    return Array.from(
      new Set(
        [
          normalizedPhotoName,
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpeg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.png` : "",
        ].filter(Boolean),
      ),
    );
  }

  async function readStoredPromotedPhotoFile(examineeNo, photoName = "") {
    const candidateFileNames = getPromotedApplicantPhotoCandidateFileNames(examineeNo, photoName);

    for (const candidateFileName of candidateFileNames) {
      const normalizedCandidateFileName = path.basename(String(candidateFileName || "").trim());
      const candidateFilePath = path.join(examineePhotoStorageDirectoryPath, normalizedCandidateFileName);

      try {
        const photoBlob = await fs.promises.readFile(candidateFilePath);

        if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
          const fileExtension = path.extname(normalizedCandidateFileName).toLowerCase();

          return {
            photoBlob,
            photoMime: getApplicantStoredPhotoMimeType(fileExtension) || "application/octet-stream",
            photoName: normalizedCandidateFileName,
          };
        }
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }

    return null;
  }

  async function readStoredApplicantFile(fileName = "", fileMime = "") {
    const normalizedFileName = path.basename(String(fileName || "").trim());

    if (!normalizedFileName) {
      return null;
    }

    const candidateFilePath = path.join(applicantFileStorageDirectoryPath, normalizedFileName);

    try {
      const fileBlob = await fs.promises.readFile(candidateFilePath);

      if (Buffer.isBuffer(fileBlob) && fileBlob.length > 0) {
        return {
          fileBlob,
          fileMime: String(fileMime || "").trim() || "application/octet-stream",
          fileName: normalizedFileName,
        };
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    return null;
  }

  async function deleteStoredFileIfExists(filePath = "") {
    const normalizedFilePath = String(filePath || "").trim();

    if (!normalizedFilePath) {
      return 0;
    }

    try {
      await fs.promises.unlink(normalizedFilePath);
      return 1;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return 0;
      }

      return 0;
    }
  }

  async function deleteApplicantStoredPhotoFiles(submissionId, examineeNo = "", photoName = "") {
    const normalizedSubmissionId = Number(submissionId);
    const candidateFileNames = Array.from(
      new Set(
        getApplicantStoredPhotoCandidateFileNames(examineeNo, photoName)
          .map((fileName) => path.basename(String(fileName || "").trim()))
          .filter(Boolean),
      ),
    );
    const currentDeleteResults = await Promise.all(
      candidateFileNames.map((fileName) => deleteStoredFileIfExists(path.join(applicantPhotoStorageDirectoryPath, fileName))),
    );
    let legacyDeleteResults = [];

    if (Number.isInteger(normalizedSubmissionId) && normalizedSubmissionId > 0) {
      const legacyPhotoDirectoryPath = path.join(legacyApplicantPhotoStorageDirectoryPath, String(normalizedSubmissionId));
      const legacyCandidateFileNames = Array.from(
        new Set(
          getLegacyApplicantStoredPhotoCandidateFileNames(photoName)
            .map((fileName) => path.basename(String(fileName || "").trim()))
            .filter(Boolean),
        ),
      );

      legacyDeleteResults = await Promise.all(
        legacyCandidateFileNames.map((fileName) => deleteStoredFileIfExists(path.join(legacyPhotoDirectoryPath, fileName))),
      );

      const remainingLegacyEntries = await fs.promises.readdir(legacyPhotoDirectoryPath).catch((error) => {
        if (error?.code === "ENOENT") {
          return null;
        }

        return null;
      });

      if (Array.isArray(remainingLegacyEntries) && remainingLegacyEntries.length === 0) {
        await fs.promises.rmdir(legacyPhotoDirectoryPath).catch(() => 0);
      }
    }

    return [...currentDeleteResults, ...legacyDeleteResults].reduce((total, value) => total + Number(value || 0), 0);
  }

  async function deleteApplicantStoredFileVariants(fileName = "") {
    const normalizedFileName = path.basename(String(fileName || "").trim());

    if (!normalizedFileName) {
      return 0;
    }

    const parsedFileName = path.parse(normalizedFileName);
    const siblingEntries = await fs.promises.readdir(applicantFileStorageDirectoryPath, { withFileTypes: true }).catch((error) => {
      if (error?.code === "ENOENT") {
        return [];
      }

      return [];
    });
    const candidateFileNames = siblingEntries
      .filter((entry) => entry.isFile() && path.parse(entry.name).name === parsedFileName.name)
      .map((entry) => entry.name);

    if (candidateFileNames.length === 0) {
      candidateFileNames.push(normalizedFileName);
    }

    const deleteResults = await Promise.all(
      Array.from(
        new Set(
          candidateFileNames
            .map((candidateFileName) => path.basename(String(candidateFileName || "").trim()))
            .filter(Boolean),
        ),
      ).map((candidateFileName) => deleteStoredFileIfExists(path.join(applicantFileStorageDirectoryPath, candidateFileName))),
    );

    return deleteResults.reduce((total, value) => total + Number(value || 0), 0);
  }

  function buildStoredApplicantPhotoRecord(examineeNo, photoValue = {}, options = {}) {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoValue = normalizeApplicantStoredPhotoValue(photoValue);
    const bufferedPhoto = Buffer.isBuffer(options.photoBuffer) ? options.photoBuffer : null;

    if (!normalizedExamineeNo || normalizedPhotoValue.hasPhoto !== true) {
      return null;
    }

    const extension = resolveApplicantStoredPhotoExtension(normalizedPhotoValue);
    const targetFileName = `${normalizedExamineeNo}${extension}`;
    const targetFilePath = path.join(applicantPhotoStorageDirectoryPath, targetFileName);
    const photoBuffer = bufferedPhoto || Buffer.from(String(photoValue.base64 || "").trim(), "base64");

    if (!Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.", "APPLICANT_PHOTO_BUFFER_EMPTY");
    }

    return {
      examineeNo: normalizedExamineeNo,
      fileName: targetFileName,
      filePath: targetFilePath,
      mimeType: getApplicantStoredPhotoMimeType(extension) || normalizedPhotoValue.mimeType || "image/jpeg",
      photoBuffer,
    };
  }

  async function persistApplicantPhotoFile(storedPhotoRecord = null) {
    if (!storedPhotoRecord?.filePath || !Buffer.isBuffer(storedPhotoRecord.photoBuffer) || storedPhotoRecord.photoBuffer.length === 0) {
      return null;
    }

    const normalizedFilePath = String(storedPhotoRecord.filePath || "").trim();
    const parsedFilePath = path.parse(normalizedFilePath);

    await fs.promises.mkdir(parsedFilePath.dir, { recursive: true });
    await fs.promises.writeFile(normalizedFilePath, storedPhotoRecord.photoBuffer);

    await Promise.all(
      [".jpg", ".jpeg", ".png"]
        .filter((candidateExtension) => candidateExtension !== parsedFilePath.ext)
        .map(async (candidateExtension) => {
          const candidatePath = path.join(parsedFilePath.dir, `${parsedFilePath.name}${candidateExtension}`);

          try {
            await fs.promises.unlink(candidatePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }),
    );

    return storedPhotoRecord;
  }

  function buildStoredApplicantFileRecord(examineeNo, questionText = "", fieldKey = "", fileValue = {}, options = {}) {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedFileValue = normalizeApplicantStoredFileValue(fileValue);
    const bufferedFile = Buffer.isBuffer(options.fileBuffer) ? options.fileBuffer : null;

    if (!normalizedExamineeNo || normalizedFileValue.hasFile !== true) {
      return null;
    }

    const sanitizedQuestionTitle = sanitizeApplicantStoredFileNameSegment(questionText, fieldKey || "file");
    const extension = resolveApplicantStoredFileExtension(normalizedFileValue);
    const targetFileName = `${normalizedExamineeNo}_${sanitizedQuestionTitle}${extension}`;
    const filePath = path.join(applicantFileStorageDirectoryPath, targetFileName);
    const fileBuffer = bufferedFile || Buffer.from(String(fileValue?.base64 || "").trim(), "base64");

    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createHttpError(400, "첨부 파일 데이터가 없습니다.", "APPLICANT_FILE_BUFFER_EMPTY");
    }

    return {
      fieldKey: String(fieldKey || "").trim(),
      questionText: String(questionText || "").trim(),
      fileName: targetFileName,
      filePath,
      mimeType: normalizedFileValue.mimeType || "application/octet-stream",
      fileBuffer,
    };
  }

  async function persistApplicantFile(storedFileRecord = null) {
    if (!storedFileRecord?.filePath || !Buffer.isBuffer(storedFileRecord.fileBuffer) || storedFileRecord.fileBuffer.length === 0) {
      return null;
    }

    const normalizedFilePath = String(storedFileRecord.filePath || "").trim();
    const parsedFilePath = path.parse(normalizedFilePath);

    await fs.promises.mkdir(parsedFilePath.dir, { recursive: true });
    await fs.promises.writeFile(normalizedFilePath, storedFileRecord.fileBuffer);

    const siblingEntries = await fs.promises.readdir(parsedFilePath.dir, { withFileTypes: true }).catch((error) => {
      if (error?.code === "ENOENT") {
        return [];
      }

      throw error;
    });

    await Promise.all(
      siblingEntries
        .filter((entry) => entry.isFile() && path.parse(entry.name).name === parsedFilePath.name && entry.name !== parsedFilePath.base)
        .map(async (entry) => {
          const candidatePath = path.join(parsedFilePath.dir, entry.name);

          try {
            await fs.promises.unlink(candidatePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }),
    );

    return storedFileRecord;
  }

  async function buildPromotedApplicantPhotoRecord(examineeNo, submissionId, photoValue = {}, options = {}) {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoValue = normalizeApplicantStoredPhotoValue(photoValue);
    let photoBuffer = Buffer.isBuffer(options.photoBuffer) ? options.photoBuffer : null;

    if (!normalizedExamineeNo || normalizedPhotoValue.hasPhoto !== true) {
      return null;
    }

    if (!photoBuffer || photoBuffer.length === 0) {
      const normalizedBase64 = String(photoValue?.base64 || "").trim();

      if (normalizedBase64) {
        photoBuffer = Buffer.from(normalizedBase64, "base64");
      }
    }

    if (!photoBuffer || photoBuffer.length === 0) {
      const storedApplicantPhoto = await readStoredApplicantPhotoFile(submissionId, normalizedExamineeNo, normalizedPhotoValue.fileName, normalizedPhotoValue.mimeType);
      photoBuffer = storedApplicantPhoto?.photoBlob || null;
    }

    if (!Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
      return null;
    }

    const extension = resolveApplicantStoredPhotoExtension(normalizedPhotoValue);
    const targetFileName = `${normalizedExamineeNo}${extension}`;

    return {
      fileName: targetFileName,
      filePath: path.join(examineePhotoStorageDirectoryPath, targetFileName),
      mimeType: getApplicantStoredPhotoMimeType(extension) || normalizedPhotoValue.mimeType || "image/jpeg",
      photoBuffer,
    };
  }

  async function persistPromotedApplicantPhotoFile(storedPhotoRecord = null) {
    if (!storedPhotoRecord?.filePath || !Buffer.isBuffer(storedPhotoRecord.photoBuffer) || storedPhotoRecord.photoBuffer.length === 0) {
      return null;
    }

    const normalizedFilePath = String(storedPhotoRecord.filePath || "").trim();
    const parsedFilePath = path.parse(normalizedFilePath);

    await fs.promises.mkdir(parsedFilePath.dir, { recursive: true });
    await fs.promises.writeFile(normalizedFilePath, storedPhotoRecord.photoBuffer);

    await Promise.all(
      [".jpg", ".jpeg", ".png"]
        .filter((candidateExtension) => candidateExtension !== parsedFilePath.ext)
        .map(async (candidateExtension) => {
          const candidatePath = path.join(parsedFilePath.dir, `${parsedFilePath.name}${candidateExtension}`);

          try {
            await fs.promises.unlink(candidatePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }),
    );

    return storedPhotoRecord;
  }

  async function deleteApplicantPromotionPhotoFiles(examineeRows = []) {
    const candidateFileNames = Array.from(
      new Set(
        (Array.isArray(examineeRows) ? examineeRows : [])
          .flatMap((row) => {
            const normalizedPhotoName = path.basename(String(row?.photoName || "").trim());
            const normalizedExamineeNo = String(row?.examineeNo || "").trim();

            return [
              normalizedPhotoName,
              normalizedExamineeNo ? `${normalizedExamineeNo}.jpg` : "",
              normalizedExamineeNo ? `${normalizedExamineeNo}.jpeg` : "",
              normalizedExamineeNo ? `${normalizedExamineeNo}.png` : "",
            ].filter(Boolean);
          }),
      ),
    );

    const deleteResults = await Promise.all(
      candidateFileNames.map(async (fileName) => {
        try {
          await fs.promises.unlink(path.join(examineePhotoStorageDirectoryPath, path.basename(String(fileName || "").trim())));
          return 1;
        } catch (error) {
          if (error?.code === "ENOENT") {
            return 0;
          }

          return 0;
        }
      }),
    );

    return deleteResults.reduce((total, value) => total + Number(value || 0), 0);
  }

  async function deleteApplicantSubmissionArtifacts(submission = null, promotedExamineeRows = []) {
    const normalizedSubmission = submission && typeof submission === "object" ? submission : null;

    if (!normalizedSubmission) {
      return {
        deletedApplicantPhotoCount: 0,
        deletedApplicantFileCount: 0,
        deletedPromotedPhotoCount: 0,
      };
    }

    const answerItems = Array.isArray(normalizedSubmission.answerItems) ? normalizedSubmission.answerItems : [];
    const photoAnswerItem = answerItems.find((answerItem) => answerItem?.inputType === "photo") || null;
    const fileNames = Array.from(
      new Set(
        answerItems
          .filter((answerItem) => answerItem?.inputType === "file")
          .map((answerItem) => path.basename(String(answerItem?.value?.fileName || "").trim()))
          .filter(Boolean),
      ),
    );
    const deletedApplicantPhotoCount = await deleteApplicantStoredPhotoFiles(
      normalizedSubmission.id,
      normalizedSubmission.promotedExamineeNo,
      photoAnswerItem?.value?.fileName || normalizedSubmission.internalPhotoValue?.fileName || "",
    );
    const deletedApplicantFileResults = await Promise.all(
      fileNames.map((fileName) => deleteApplicantStoredFileVariants(fileName)),
    );
    const deletedPromotedPhotoCount = await deleteApplicantPromotionPhotoFiles(promotedExamineeRows);

    return {
      deletedApplicantPhotoCount,
      deletedApplicantFileCount: deletedApplicantFileResults.reduce((total, value) => total + Number(value || 0), 0),
      deletedPromotedPhotoCount,
    };
  }

  async function migrateApplicantPhotoStorage() {
    const photoRows = await query(`
      SELECT
        s.id,
        s.field_key AS fieldKey,
        s.answer_data AS answerData,
        COALESCE(meta.promoted_examinee_no, '') AS promotedExamineeNo
      FROM app_subm s
      LEFT JOIN app_meta meta
        ON meta.id = s.id
      WHERE s.answer_data LIKE '%"hasPhoto"%'
      ORDER BY s.id ASC, s.field_key ASC
    `);
    let migratedCount = 0;

    for (const photoRow of Array.isArray(photoRows) ? photoRows : []) {
      const normalizedExamineeNo = String(photoRow?.promotedExamineeNo || "").trim();
      const storedPhotoValue = parseApplicantStoredPhotoAnswerData(photoRow?.answerData, {
        includeBase64: true,
      });
      const normalizedStoredPhotoValue = normalizeApplicantStoredPhotoValue(storedPhotoValue);

      if (normalizedStoredPhotoValue.hasPhoto !== true || !normalizedExamineeNo) {
        continue;
      }

      let photoBuffer = null;
      const normalizedBase64 = String(storedPhotoValue?.base64 || "").trim();

      if (normalizedBase64) {
        photoBuffer = Buffer.from(normalizedBase64, "base64");
      } else {
        const storedApplicantPhoto = await readStoredApplicantPhotoFile(
          photoRow?.id,
          normalizedExamineeNo,
          normalizedStoredPhotoValue.fileName,
          normalizedStoredPhotoValue.mimeType,
        );
        photoBuffer = storedApplicantPhoto?.photoBlob || null;
      }

      if (!Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
        continue;
      }

      const storedPhotoRecord = buildStoredApplicantPhotoRecord(normalizedExamineeNo, normalizedStoredPhotoValue, {
        photoBuffer,
      });

      if (storedPhotoRecord) {
        await persistApplicantPhotoFile(storedPhotoRecord);
      }

      await query(`UPDATE app_subm SET answer_data = ? WHERE id = ? AND field_key = ?`, [
        JSON.stringify(buildStoredApplicantPhotoAnswerData(storedPhotoRecord, normalizedStoredPhotoValue)),
        Number(photoRow?.id || 0),
        String(photoRow?.fieldKey || "").trim(),
      ]);
      migratedCount += 1;
    }

    return {
      migratedCount,
    };
  }

  async function migrateApplicantFileAnswerData() {
    const fileRows = await query(
      `
        SELECT
          s.id,
          s.field_key AS fieldKey,
          s.answer_data AS answerData
        FROM app_subm s
        INNER JOIN app_form ff ON ff.field_key = s.field_key
        WHERE ff.input_type = 'file'
          AND s.answer_data LIKE '%"originalFileName"%'
      `,
    );
    let migratedCount = 0;

    for (const fileRow of fileRows) {
      const normalizedStoredFileValue = normalizeApplicantStoredFileValue(parseApplicantStoredFileAnswerData(fileRow?.answerData));

      await query(`UPDATE app_subm SET answer_data = ? WHERE id = ? AND field_key = ?`, [
        JSON.stringify(normalizedStoredFileValue),
        Number(fileRow?.id || 0),
        String(fileRow?.fieldKey || "").trim(),
      ]);
      migratedCount += 1;
    }

    return {
      migratedCount,
    };
  }

  function normalizeApplicantAnswerValue(field, rawValue, applicantIdentity, existingSubmission = null) {
    if (!field || !field.fieldKey) {
      return "";
    }

    if (field.systemFieldKey === "name") {
      return applicantIdentity.name;
    }

    if (field.inputType === "photo") {
      const nextPhotoPayload = normalizeApplicantPhotoPayload(rawValue);

      if (nextPhotoPayload) {
        const normalizedStoredPhotoValue = normalizeApplicantStoredPhotoValue(nextPhotoPayload);

        return {
          ...normalizedStoredPhotoValue,
          base64: nextPhotoPayload.base64,
        };
      }

      if (existingSubmission?.internalPhotoValue?.hasPhoto) {
        return {
          hasPhoto: true,
          fileName: existingSubmission.internalPhotoValue.fileName,
          mimeType: existingSubmission.internalPhotoValue.mimeType,
        };
      }

      if (field.required) {
        throw createHttpError(400, `${field.questionText} 파일을 업로드하세요.`, "APPLICANT_PHOTO_REQUIRED");
      }

      return {
        hasPhoto: false,
        fileName: "",
        mimeType: "",
      };
    }

    if (field.inputType === "file") {
      const nextFilePayload = normalizeApplicantFilePayload(rawValue);

      if (nextFilePayload) {
        const normalizedStoredFileValue = normalizeApplicantStoredFileValue(nextFilePayload);

        return {
          ...normalizedStoredFileValue,
          base64: nextFilePayload.base64,
        };
      }

      const existingFileValue = getExistingApplicantUploadAnswerValue(existingSubmission, field.fieldKey, "file");

      if (existingFileValue?.hasFile) {
        return existingFileValue;
      }

      if (field.required) {
        throw createHttpError(400, `${field.questionText} 파일을 업로드하세요.`, "APPLICANT_FILE_REQUIRED");
      }

      return {
        hasFile: false,
        fileName: "",
        mimeType: "",
      };
    }

    if (field.inputType === "date" || field.inputType === "birthdate") {
      return normalizeApplicantDate(rawValue, field.questionText, {
        required: field.required,
      });
    }

    if (field.inputType === "time") {
      return normalizeApplicantTime(rawValue, field.questionText, {
        required: field.required,
      });
    }

    if (field.inputType === "phone") {
      return normalizeApplicantPhone(rawValue, field.questionText, {
        required: field.required,
      });
    }

    if (field.inputType === "nationality") {
      return normalizeApplicantNationality(rawValue, field.questionText, {
        required: field.required,
      });
    }

    if (field.inputType === "select") {
      const normalizedValue = normalizeApplicantText(rawValue, field.questionText, {
        required: field.required,
        maxLength: 255,
      });

      if (normalizedValue && !field.options.includes(normalizedValue) && field.allowCustomOption !== true) {
        throw createHttpError(400, `${field.questionText} 선택값이 올바르지 않습니다.`, "APPLICANT_SELECT_VALUE_INVALID");
      }

      return normalizedValue;
    }

    return normalizeApplicantText(rawValue, field.questionText, {
      required: field.required,
      maxLength: field.inputType === "textarea" ? 1000 : 255,
    });
  }

  function buildApplicantSubmissionArtifacts(fields = [], answers = {}, applicantIdentity = {}, existingSubmission = null, options = {}) {
    const normalizedFields = Array.isArray(fields) ? fields : [];
    const normalizedAnswers = answers && typeof answers === "object" ? { ...answers } : {};
    const normalizedRecruitmentSelection =
      options.recruitmentSelection && typeof options.recruitmentSelection === "object" ? options.recruitmentSelection : {};
    const normalizedRecruitmentUnits = Array.isArray(options.recruitmentUnits) ? options.recruitmentUnits : [];
    const answerItems = [];
    const answerRows = [];
    const handledSelectionKeys = new Set();
    const fileUploads = [];
    let photoUpload = null;

    normalizedFields.forEach((field) => {
      const syntheticSelectionField = getApplicantRecruitmentSelectionFieldBySystemFieldKey(field?.systemFieldKey || "");

      if (!syntheticSelectionField) {
        return;
      }

      const selectedValue = String(normalizedRecruitmentSelection[syntheticSelectionField.key] || "").trim();

      if (selectedValue) {
        normalizedAnswers[field.fieldKey] = selectedValue;
        handledSelectionKeys.add(syntheticSelectionField.key);
      }
    });

    normalizedFields.forEach((field) => {
      const syntheticSelectionField = getApplicantRecruitmentSelectionFieldBySystemFieldKey(field?.systemFieldKey || "");
      const selectedRecruitmentValue = syntheticSelectionField ? String(normalizedRecruitmentSelection[syntheticSelectionField.key] || "").trim() : "";
      const selectableRecruitmentOptions = syntheticSelectionField
        ? getApplicantRecruitmentSelectionOptions(normalizedRecruitmentUnits, normalizedRecruitmentSelection, syntheticSelectionField)
        : [];
      const normalizedValue = selectedRecruitmentValue
        ? normalizeApplicantText(selectedRecruitmentValue, field.questionText, {
            required: field.required,
            maxLength: 255,
          })
        : syntheticSelectionField && selectableRecruitmentOptions.length === 0
          ? ""
        : normalizeApplicantAnswerValue(field, normalizedAnswers[field.fieldKey], applicantIdentity, existingSubmission);

      if (field.inputType === "photo") {
        const normalizedPhotoValue = normalizeApplicantStoredPhotoValue(normalizedValue);

        answerItems.push({
          fieldKey: field.fieldKey,
          questionText: field.questionText,
          inputType: field.inputType,
          systemFieldKey: field.systemFieldKey,
          value: {
            fileName: normalizedPhotoValue.fileName,
            mimeType: normalizedPhotoValue.mimeType,
            hasPhoto: normalizedPhotoValue.hasPhoto === true,
          },
        });
        answerRows.push({
          fieldKey: field.fieldKey,
          answerData: JSON.stringify(normalizedPhotoValue),
        });

        if (!photoUpload && normalizedPhotoValue.hasPhoto === true && String(normalizedValue?.base64 || "").trim()) {
          photoUpload = {
            fieldKey: field.fieldKey,
            ...normalizedPhotoValue,
            base64: String(normalizedValue.base64 || "").trim(),
          };
        }

        return;
      }

      if (field.inputType === "file") {
        const normalizedFileValue = normalizeApplicantStoredFileValue(normalizedValue);

        answerItems.push({
          fieldKey: field.fieldKey,
          questionText: field.questionText,
          inputType: field.inputType,
          systemFieldKey: field.systemFieldKey,
          value: {
            fileName: normalizedFileValue.fileName,
            mimeType: normalizedFileValue.mimeType,
            hasFile: normalizedFileValue.hasFile === true,
          },
        });
        answerRows.push({
          fieldKey: field.fieldKey,
          answerData: JSON.stringify(normalizedFileValue),
        });

        if (normalizedFileValue.hasFile === true && String(normalizedValue?.base64 || "").trim()) {
          fileUploads.push({
            fieldKey: field.fieldKey,
            questionText: field.questionText,
            ...normalizedFileValue,
            base64: String(normalizedValue.base64 || "").trim(),
          });
        }

        return;
      }

      answerItems.push({
        fieldKey: field.fieldKey,
        questionText: field.questionText,
        inputType: field.inputType,
          systemFieldKey: field.systemFieldKey,
          value: normalizedValue,
      });
      answerRows.push({
        fieldKey: field.fieldKey,
        answerData: String(normalizedValue ?? "").trim(),
      });
    });

    APPLICANT_RECRUITMENT_SELECTION_FIELDS.forEach((definition) => {
      const selectedValue = String(normalizedRecruitmentSelection[definition.key] || "").trim();

      if (!selectedValue || handledSelectionKeys.has(definition.key)) {
        return;
      }

      answerItems.push({
        fieldKey: definition.fieldKey,
        questionText: definition.questionText,
        inputType: "text",
        systemFieldKey: definition.systemFieldKey,
        value: selectedValue,
      });
      answerRows.push({
        fieldKey: definition.fieldKey,
        answerData: selectedValue,
      });
    });

    return {
      answerItems,
      answerRows,
      fileUploads,
      photoUpload,
    };
  }

  function buildPromotableApplicantRecord(submission = {}) {
    const systemValues = {
      name: submission.name || "",
      birth: "",
      date: "",
      time: "",
      nationality: "",
      track: "",
      admission: "",
      series: "",
      unit: "",
      major: "",
      building: "",
      room: "",
      group: "",
      admissionCode: "",
      seriesCode: "",
      unitCode: "",
      majorCode: "",
      buildingCode: "",
      roomCode: "",
    };

    normalizeStoredAnswerItems(submission.answerItems).forEach((answerItem) => {
      if (answerItem.inputType === "nationality" && !systemValues.nationality) {
        systemValues.nationality = String(answerItem.value || "").trim();
      }

      if (!answerItem.systemFieldKey || answerItem.systemFieldKey === "photo" || answerItem.inputType === "file") {
        return;
      }

      systemValues[answerItem.systemFieldKey] = String(answerItem.value || "").trim();
    });

    const promotionOverride = normalizeApplicantPromotionOverride(
      submission?.promotionOverrideJson || submission?.promotionOverride || null,
    );

    Object.keys(promotionOverride).forEach((key) => {
      systemValues[key] = String(promotionOverride[key] || "").trim();
    });

    return systemValues;
  }

  async function buildApplicantAdmitCardRecordFromSubmission(submission = {}) {
    const normalizedSubmissionId = Number(submission?.id || 0);
    const promotableRecord = buildPromotableApplicantRecord(submission);
    let photoRecord = null;

    if (normalizedSubmissionId > 0) {
      try {
        photoRecord = await getApplicantSubmissionPhoto(normalizedSubmissionId);
      } catch (error) {
        if (error?.errorCode !== "APPLICANT_SUBMISSION_PHOTO_NOT_FOUND") {
          throw error;
        }
      }
    }

    return {
      date: String(promotableRecord.date || "").trim(),
      group: String(promotableRecord.group || "").trim(),
      time: String(promotableRecord.time || "").trim(),
      track: String(promotableRecord.track || "").trim(),
      admission: String(promotableRecord.admission || "").trim(),
      series: String(promotableRecord.series || "").trim(),
      unit: String(promotableRecord.unit || "").trim(),
      major: String(promotableRecord.major || "").trim(),
      building: String(promotableRecord.building || "").trim(),
      room: String(promotableRecord.room || "").trim(),
      examineeNo: String(submission?.promotedExamineeNo || "").trim(),
      name: String(promotableRecord.name || submission?.name || "").trim(),
      birth: String(promotableRecord.birth || "").trim(),
      photoBlob: photoRecord?.photoBlob || null,
      photoMime: String(photoRecord?.photoMime || "").trim(),
      photoName: String(photoRecord?.photoName || "").trim(),
    };
  }

  function getApplicantPromotionMissingFields(promotableRecord = {}) {
    return APPLICANT_PROMOTION_REQUIRED_FIELDS.filter((fieldKey) => !String(promotableRecord[fieldKey] || "").trim());
  }

  function resolveExamNoSourceDate(promotableRecord = {}) {
    const sourceDate = String(promotableRecord.date || "").trim();

    if (APPLICANT_DATE_PATTERN.test(sourceDate)) {
      const [yearText, monthText, dayText] = sourceDate.split("-");
      const candidateDate = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));

      if (!Number.isNaN(candidateDate.getTime())) {
        return candidateDate;
      }
    }

    return new Date();
  }

  function resolveApplicantRecruitmentUnit(recruitmentUnits = [], promotableRecord = {}) {
    const normalizedTrackName = String(promotableRecord.track || "").trim();
    const normalizedAdmissionName = String(promotableRecord.admission || "").trim();
    const normalizedSeriesName = String(promotableRecord.series || "").trim();
    const normalizedUnitName = String(promotableRecord.unit || "").trim();
    const normalizedMajorName = String(promotableRecord.major || "").trim();
    const candidateUnits = (Array.isArray(recruitmentUnits) ? recruitmentUnits : []).filter(
      (unit) =>
        unit.trackName === normalizedTrackName &&
        unit.admissionName === normalizedAdmissionName &&
        unit.seriesName === normalizedSeriesName &&
        unit.unitName === normalizedUnitName,
    );

    if (candidateUnits.length === 0) {
      return null;
    }

    return (
      candidateUnits.find((unit) => unit.majorName === normalizedMajorName) ||
      candidateUnits.find((unit) => !String(unit.majorName || "").trim()) ||
      (candidateUnits.length === 1 ? candidateUnits[0] : null)
    );
  }

  function resolveApplicantExamNoPattern(pattern = "", recruitmentUnit = null) {
    const normalizedPattern = ensureApplicantExamNoPattern(pattern || defaultApplicantExamNoPattern);

    if (APPLICANT_EXAM_NO_CODE_TOKEN_PATTERN.test(normalizedPattern)) {
      return normalizedPattern;
    }

    if (recruitmentUnit && normalizedPattern === defaultApplicantExamNoPattern) {
      return APPLICANT_DEFAULT_RECRUITMENT_EXAM_NO_PATTERN;
    }

    return normalizedPattern;
  }

  function resolveApplicantExamNoComponentValue(componentKey = "", promotableRecord = {}, recruitmentUnit = null) {
    const normalizedComponentKey = String(componentKey || "").trim();

    if (normalizedComponentKey === "admissionCode") {
      const value = String(recruitmentUnit?.admissionCode || "").trim();

      if (!value) {
        throw createHttpError(400, "수험번호 생성을 위해 일치하는 전형코드가 필요합니다.", "APPLICANT_EXAM_NO_ADMISSION_CODE_REQUIRED");
      }

      return value;
    }

    if (normalizedComponentKey === "seriesCode") {
      const value = String(recruitmentUnit?.seriesCode || "").trim();

      if (!value) {
        throw createHttpError(400, "수험번호 생성을 위해 일치하는 계열코드가 필요합니다.", "APPLICANT_EXAM_NO_SERIES_CODE_REQUIRED");
      }

      return value;
    }

    if (normalizedComponentKey === "unitCode") {
      const value = String(recruitmentUnit?.unitCode || "").trim();

      if (!value) {
        throw createHttpError(400, "수험번호 생성을 위해 일치하는 모집단위코드가 필요합니다.", "APPLICANT_EXAM_NO_UNIT_CODE_REQUIRED");
      }

      return value;
    }

    if (normalizedComponentKey === "nationalityCode") {
      const nationalityOption =
        typeof findApplicantNationalityOption === "function"
          ? findApplicantNationalityOption(String(promotableRecord.nationality || "").trim())
          : null;
      const value = String(nationalityOption?.code || "").trim();

      if (!value) {
        throw createHttpError(400, "수험번호 생성을 위해 국적코드가 필요합니다.", "APPLICANT_EXAM_NO_NATIONALITY_CODE_REQUIRED");
      }

      return value;
    }

    return "";
  }

  function buildApplicantExamNoFromComponents(settings = {}, promotableRecord = {}, recruitmentUnit = null, sequence = 1) {
    const components = normalizeApplicantExamNoComponents(settings.components ?? APPLICANT_DEFAULT_EXAM_NO_COMPONENTS);
    const digitCount = normalizeApplicantExamNoDigitCount(settings.digitCount ?? APPLICANT_DEFAULT_EXAM_NO_DIGIT_COUNT);
    const fixedValues = components.map((componentKey) => {
      if (!componentKey || componentKey === "sequence") {
        return "";
      }

      return resolveApplicantExamNoComponentValue(componentKey, promotableRecord, recruitmentUnit);
    });
    const fixedLength = fixedValues.reduce((total, value) => total + value.length, 0);

    if (fixedLength >= digitCount) {
      throw createHttpError(
        400,
        `수험번호 자리수 ${digitCount}자 안에 선택한 코드 조합이 들어가지 않습니다. 자리수를 늘리거나 구성 요소를 조정하세요.`,
        "APPLICANT_EXAM_NO_DIGIT_COUNT_TOO_SHORT",
      );
    }

    const sequenceDigits = digitCount - fixedLength;
    const sequenceText = String(sequence);

    if (sequenceText.length > sequenceDigits) {
      throw createHttpError(500, "수험번호 순번 자릿수가 부족해 더 이상 수험번호를 생성할 수 없습니다.", "APPLICANT_EXAM_NO_SEQUENCE_OVERFLOW");
    }

    const paddedSequence = sequenceText.padStart(sequenceDigits, "0");

    return components
      .map((componentKey, index) => {
        if (!componentKey) {
          return "";
        }

        if (componentKey === "sequence") {
          return paddedSequence;
        }

        return fixedValues[index];
      })
      .join("");
  }

  function buildApplicantExamNoCandidate(pattern, sourceDate, sequence, recruitmentUnit = null) {
    const year = String(sourceDate.getFullYear());
    const shortYear = year.slice(-2);
    const month = String(sourceDate.getMonth() + 1).padStart(2, "0");
    const day = String(sourceDate.getDate()).padStart(2, "0");
    const sequenceMatch = /\{SEQ(?::(\d{1,2}))?\}/.exec(pattern);
    const sequencePadding = Math.max(1, Number(sequenceMatch?.[1] || 1));
    const sequenceValue = String(sequence).padStart(sequencePadding, "0");

    return pattern
      .replaceAll("{YYYY}", year)
      .replaceAll("{YY}", shortYear)
      .replaceAll("{MM}", month)
      .replaceAll("{DD}", day)
      .replaceAll("{ADMISSION_CODE}", String(recruitmentUnit?.admissionCode || "").trim())
      .replaceAll("{SERIES_CODE}", String(recruitmentUnit?.seriesCode || "").trim())
      .replaceAll("{UNIT_CODE}", String(recruitmentUnit?.unitCode || "").trim())
      .replace(/\{SEQ(?::\d{1,2})?\}/g, sequenceValue);
  }

  async function generateApplicantExamineeNo(connection, settings = {}, promotableRecord = {}, options = {}) {
    const recruitmentUnits = Array.isArray(options.recruitmentUnits)
      ? options.recruitmentUnits
      : await getApplicantRecruitmentUnits({
          queryable: connection.query.bind(connection),
        });
    const matchedRecruitmentUnit = options.matchedRecruitmentUnit || resolveApplicantRecruitmentUnit(recruitmentUnits, promotableRecord);
    const selectedComponents = Array.isArray(settings.components) ? settings.components.filter(Boolean) : [];
    const hasStructuredSettings = selectedComponents.length > 0;
    const pattern = resolveApplicantExamNoPattern(settings.examNoPattern || defaultApplicantExamNoPattern, matchedRecruitmentUnit);
    const requiresRecruitmentUnit =
      selectedComponents.some((componentKey) => ["admissionCode", "seriesCode", "unitCode"].includes(componentKey)) ||
      APPLICANT_EXAM_NO_CODE_TOKEN_PATTERN.test(pattern);
    const sequenceStart = normalizeApplicantSequenceStart(settings.examNoSequenceStart || defaultApplicantExamNoSequenceStart);
    const sourceDate = resolveExamNoSourceDate(promotableRecord);

    if (requiresRecruitmentUnit && !matchedRecruitmentUnit) {
      throw createHttpError(
        400,
        "전형 관리에서 접수 데이터와 일치하는 모집시기/전형/계열/모집단위/전공을 먼저 등록하세요.",
        "APPLICANT_RECRUITMENT_UNIT_MATCH_NOT_FOUND",
      );
    }

    for (let sequence = sequenceStart; sequence < sequenceStart + 500000; sequence += 1) {
      const candidateValue = hasStructuredSettings
        ? buildApplicantExamNoFromComponents(settings, promotableRecord, matchedRecruitmentUnit, sequence)
        : buildApplicantExamNoCandidate(pattern, sourceDate, sequence, matchedRecruitmentUnit);
      const [rows] = await connection.query(
        `
          SELECT assignedExamineeNo
          FROM (
            SELECT examinee_no AS assignedExamineeNo
            FROM examinee
            WHERE examinee_no = ?
            UNION ALL
            SELECT promoted_examinee_no AS assignedExamineeNo
            FROM app_meta
            WHERE promoted_examinee_no = ?
          ) assigned_exam_no
          LIMIT 1
        `,
        [candidateValue, candidateValue],
      );

      if (rows.length === 0) {
        return candidateValue;
      }
    }

    throw createHttpError(500, "사용 가능한 수험번호를 생성하지 못했습니다.", "APPLICANT_EXAM_NO_GENERATION_FAILED");
  }

  async function prepareApplicantSubmissionExamNo(connection, submission = {}, settings = {}, options = {}) {
    const promotableRecord = buildPromotableApplicantRecord(submission);
    const recruitmentUnits = await getApplicantRecruitmentUnits({
      queryable: connection.query.bind(connection),
    });
    const recruitmentUnit = resolveApplicantRecruitmentUnit(recruitmentUnits, promotableRecord);
    const examineeNo =
      submission.promotedExamineeNo ||
      (await generateApplicantExamineeNo(connection, settings, promotableRecord, {
        recruitmentUnits,
        matchedRecruitmentUnit: recruitmentUnit,
      }));
    const uploadedPhotoValue = options.uploadedPhotoValue && typeof options.uploadedPhotoValue === "object" ? options.uploadedPhotoValue : null;
    const uploadedFileUploads = Array.isArray(options.uploadedFileUploads) ? options.uploadedFileUploads : [];
    const resolvedPhotoValue = uploadedPhotoValue || submission?.internalPhotoValue || null;
    const applicantPhotoRecord = buildStoredApplicantPhotoRecord(examineeNo, resolvedPhotoValue);
    const storedPhotoRecord = await buildPromotedApplicantPhotoRecord(examineeNo, submission?.id, resolvedPhotoValue, {
      photoBuffer: applicantPhotoRecord?.photoBuffer || null,
    });
    const applicantFileRecords = uploadedFileUploads
      .map((fileUpload) => buildStoredApplicantFileRecord(examineeNo, fileUpload?.questionText, fileUpload?.fieldKey, fileUpload))
      .filter(Boolean);
    const applicantFileValuesByFieldKey = applicantFileRecords.reduce((fieldMap, storedFileRecord) => {
      fieldMap[String(storedFileRecord.fieldKey || "").trim()] = buildStoredApplicantFileAnswerData(storedFileRecord);
      return fieldMap;
    }, {});

    return {
      promotableRecord,
      examineeNo,
      recruitmentUnit,
      applicantFileRecords,
      applicantFileValuesByFieldKey,
      applicantPhotoFieldKey: String(uploadedPhotoValue?.fieldKey || "").trim(),
      applicantPhotoRecord,
      applicantPhotoValue:
        uploadedPhotoValue && applicantPhotoRecord ? buildStoredApplicantPhotoAnswerData(applicantPhotoRecord, uploadedPhotoValue) : null,
      storedPhotoRecord,
    };
  }

  async function applyPreparedApplicantUploadAnswerRows(connection, submissionId, preparedRecord = {}) {
    const normalizedSubmissionId = Number(submissionId);

    if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
      return;
    }

    const queryable = typeof connection?.query === "function" ? connection.query.bind(connection) : query;
    const updateTasks = [];
    const applicantPhotoFieldKey = String(preparedRecord?.applicantPhotoFieldKey || "").trim();

    if (applicantPhotoFieldKey && preparedRecord?.applicantPhotoValue) {
      updateTasks.push(
        queryable(
          `
            UPDATE app_subm
            SET
              answer_data = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND field_key = ?
          `,
          [JSON.stringify(preparedRecord.applicantPhotoValue), normalizedSubmissionId, applicantPhotoFieldKey],
        ),
      );
    }

    Object.entries(preparedRecord?.applicantFileValuesByFieldKey || {}).forEach(([fieldKey, fileValue]) => {
      const normalizedFieldKey = String(fieldKey || "").trim();

      if (!normalizedFieldKey || !fileValue) {
        return;
      }

      updateTasks.push(
        queryable(
          `
            UPDATE app_subm
            SET
              answer_data = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND field_key = ?
          `,
          [JSON.stringify(fileValue), normalizedSubmissionId, normalizedFieldKey],
        ),
      );
    });

    if (updateTasks.length === 0) {
      return;
    }

    await Promise.all(updateTasks);
  }

  async function upsertApplicantSubmissionIntoExaminee(connection, submission = {}, settings = {}, preparedRecord = null) {
    const resolvedPreparedRecord =
      preparedRecord && typeof preparedRecord === "object"
        ? preparedRecord
        : await prepareApplicantSubmissionExamNo(connection, submission, settings);
    const promotableRecord = resolvedPreparedRecord.promotableRecord || buildPromotableApplicantRecord(submission);
    const recruitmentUnit =
      resolvedPreparedRecord.recruitmentUnit ||
      resolveApplicantRecruitmentUnit(
        await getApplicantRecruitmentUnits({
          queryable: connection.query.bind(connection),
        }),
        promotableRecord,
      );
    const missingFields = getApplicantPromotionMissingFields(promotableRecord);

    if (missingFields.length > 0) {
      throw createHttpError(
        400,
        `수험생 데이터에 필요한 항목이 비어 있습니다: ${missingFields.join(", ")}`,
        "APPLICANT_PROMOTION_REQUIRED_FIELDS_MISSING",
      );
    }

    const examineeNo = String(resolvedPreparedRecord.examineeNo || "").trim() || submission.promotedExamineeNo || (await generateApplicantExamineeNo(connection, settings, promotableRecord));
    const [existingRows] = await connection.query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ? LIMIT 1`, [examineeNo]);
    const storedPhotoRecord =
      resolvedPreparedRecord.storedPhotoRecord ??
      (await buildPromotedApplicantPhotoRecord(examineeNo, submission?.id, submission?.internalPhotoValue || null, {
        photoBuffer: resolvedPreparedRecord?.applicantPhotoRecord?.photoBuffer || null,
      }));
    const promotionCodes = buildApplicantPromotionCodeOverrides(recruitmentUnit);
    const admissionCode = String(promotableRecord.admissionCode || promotionCodes.admissionCode || "").trim();
    const seriesCode = String(promotableRecord.seriesCode || promotionCodes.seriesCode || "").trim();
    const unitCode = String(promotableRecord.unitCode || promotionCodes.unitCode || "").trim();
    const majorCode = String(promotableRecord.majorCode || promotionCodes.majorCode || "").trim();
    const buildingCode = String(promotableRecord.buildingCode || "").trim();
    const roomCode = String(promotableRecord.roomCode || "").trim();
    const photoColumnsSql = storedPhotoRecord
      ? `
            photo_name = ?,
            photo_mime = ?,
      `
      : "";
    const photoParams = storedPhotoRecord
      ? [storedPhotoRecord.fileName || null, storedPhotoRecord.mimeType || null]
      : [];

    if (existingRows.length > 0) {
      await connection.query(
        `
          UPDATE examinee
          SET
            exam_date = ?,
            \`time\` = ?,
            track = ?,
            admission = ?,
            admission_code = ?,
            series = ?,
            series_code = ?,
            unit = ?,
            unit_code = ?,
            major = ?,
            major_code = ?,
            building = ?,
            building_code = ?,
            room = ?,
            room_code = ?,
            \`group\` = ?,
            name = ?,
            birth_date = ?,
            ${photoColumnsSql}
            updated_at = CURRENT_TIMESTAMP
          WHERE examinee_no = ?
        `,
        [
          promotableRecord.date,
          promotableRecord.time,
          promotableRecord.track,
          promotableRecord.admission,
          admissionCode,
          promotableRecord.series,
          seriesCode,
          promotableRecord.unit,
          unitCode,
          promotableRecord.major || "",
          majorCode,
          promotableRecord.building,
          buildingCode,
          promotableRecord.room,
          roomCode,
          promotableRecord.group || "",
          promotableRecord.name,
          promotableRecord.birth,
          ...photoParams,
          examineeNo,
        ],
      );

      return {
        examineeNo,
        storedPhotoRecord,
      };
    }

    await connection.query(
      `
        INSERT INTO examinee (
          exam_date,
          \`time\`,
          track,
          admission,
          admission_code,
          series,
          series_code,
          unit,
          unit_code,
          major,
          major_code,
          building,
          building_code,
          room,
          room_code,
          \`group\`,
          examinee_no,
          name,
          birth_date,
          photo_name,
          photo_mime
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          promotableRecord.date,
          promotableRecord.time,
          promotableRecord.track,
          promotableRecord.admission,
          admissionCode,
          promotableRecord.series,
          seriesCode,
          promotableRecord.unit,
          unitCode,
          promotableRecord.major || "",
          majorCode,
          promotableRecord.building,
          buildingCode,
          promotableRecord.room,
          roomCode,
          promotableRecord.group || "",
          examineeNo,
          promotableRecord.name,
          promotableRecord.birth,
          storedPhotoRecord?.fileName || null,
          storedPhotoRecord?.mimeType || null,
        ],
    );

    return {
      examineeNo,
      storedPhotoRecord,
    };
  }

  function buildApplicantPromotionCapacityShortageSummary(rows = [], breakField = DEFAULT_APPLICANT_PROMOTION_BREAK_FIELD) {
    const normalizedBreakField = normalizeApplicantPromotionBreakField(breakField);
    const shortageCounts = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const errors = Array.isArray(row?.errors) ? row.errors : [];

      if (!errors.includes(APPLICANT_PROMOTION_CAPACITY_ERROR_MESSAGE)) {
        return;
      }

      const groupValue = String(row?.[normalizedBreakField] || "").trim() || "미지정";
      shortageCounts.set(groupValue, Number(shortageCounts.get(groupValue) || 0) + 1);
    });

    const groups = [...shortageCounts.entries()]
      .map(([value, count]) => ({
        value,
        count,
      }))
      .sort((leftGroup, rightGroup) => {
        return rightGroup.count - leftGroup.count || compareApplicantPromotionText(leftGroup.value, rightGroup.value);
      });

    return {
      fieldKey: normalizedBreakField,
      fieldLabel: getApplicantPromotionFieldLabel(normalizedBreakField),
      groupCount: groups.length,
      applicantCount: groups.reduce((totalCount, group) => totalCount + Number(group.count || 0), 0),
      groups,
    };
  }

  function buildApplicantPromotionSummary(rows = [], options = {}) {
    const normalizedRows = normalizeApplicantPromotionPreviewRows(rows);
    const applicantRows = normalizedRows.filter((row) => Number(row.submissionId || 0) > 0);
    const allowMissingPhoto = options.allowMissingPhoto === true;
    const breakField = normalizeApplicantPromotionBreakField(options.breakField);
    const errorCount = normalizedRows.filter((row) => row.status === "error").length;
    const warningCount = applicantRows.filter((row) => row.status === "warning").length;
    const readyCount = applicantRows.filter((row) => row.status === "ready").length;
    const missingPhotoCount = applicantRows.filter((row) => !row.hasPhoto).length;
    const capacityShortage = buildApplicantPromotionCapacityShortageSummary(applicantRows, breakField);

    return {
      totalCount: applicantRows.length,
      readyCount,
      warningCount,
      errorCount,
      missingPhotoCount,
      breakField,
      capacityShortageFieldLabel: capacityShortage.fieldLabel,
      capacityShortageGroupCount: capacityShortage.groupCount,
      capacityShortageApplicantCount: capacityShortage.applicantCount,
      capacityShortageGroups: capacityShortage.groups,
      canCommit: errorCount === 0 && (allowMissingPhoto || missingPhotoCount === 0),
      allowMissingPhoto,
    };
  }

  function buildApplicantPromotionCommitErrorMessage(summary = {}, rows = []) {
    const messages = [];
    const normalizedRows = normalizeApplicantPromotionPreviewRows(rows);
    const sampleErrors = [];
    const capacityShortageApplicantCount = Number(summary.capacityShortageApplicantCount || 0);
    const capacityShortageGroups = Array.isArray(summary.capacityShortageGroups) ? summary.capacityShortageGroups : [];

    if (Number(summary.errorCount || 0) > 0 && capacityShortageApplicantCount === 0) {
      messages.push(`오류 ${summary.errorCount}건이 있습니다.`);
    }

    if (capacityShortageApplicantCount > 0) {
      const fieldLabel = String(
        summary.capacityShortageFieldLabel || getApplicantPromotionFieldLabel(summary.breakField || DEFAULT_APPLICANT_PROMOTION_BREAK_FIELD),
      ).trim();
      const groupCount = Number(summary.capacityShortageGroupCount || 0);
      const groupSummary = capacityShortageGroups
        .slice(0, 3)
        .map((group) => `${String(group?.value || "미지정").trim() || "미지정"} ${Number(group?.count || 0)}명`)
        .join(", ");
      const extraGroupCount = Math.max(capacityShortageGroups.length - 3, 0);

      messages.push(`${fieldLabel} ${groupCount}개에서 ${capacityShortageApplicantCount}명의 배정이 불가능합니다.`);

      if (groupSummary) {
        messages.push(groupSummary + (extraGroupCount > 0 ? ` 외 ${extraGroupCount}개 ${fieldLabel}` : ""));
      }

      messages.push("배정 데이터는 업데이트하지 않았습니다.");
    }

    if (summary.allowMissingPhoto !== true && Number(summary.missingPhotoCount || 0) > 0) {
      messages.push(`사진 미등록 ${summary.missingPhotoCount}건이 있습니다.`);
    }

    normalizedRows.forEach((row) => {
      row.errors.forEach((errorMessage) => {
        if (
          errorMessage === APPLICANT_PROMOTION_CAPACITY_ERROR_MESSAGE ||
          (capacityShortageApplicantCount > 0 && errorMessage.startsWith("수험생 데이터에 필요한 항목이 비어 있습니다:")) ||
          sampleErrors.includes(errorMessage) ||
          sampleErrors.length >= 3
        ) {
          return;
        }

        sampleErrors.push(errorMessage);
      });
    });

    if (sampleErrors.length > 0) {
      messages.push(sampleErrors.join(" / "));
    }

    return messages.join(" ");
  }

  function buildApplicantPromotionPlanRow(entry = {}, options = {}) {
    const promotionOverride = normalizeApplicantPromotionOverride(
      options.promotionOverride != null ? options.promotionOverride : entry?.submission?.promotionOverride,
    );
    const promotableRecord =
      options.promotableRecord && typeof options.promotableRecord === "object"
        ? options.promotableRecord
        : buildPromotableApplicantRecord({
            ...entry.submission,
            promotionOverride,
          });
    const recruitmentUnit = options.recruitmentUnit || null;

    return {
      submissionId: Number(entry.submissionId || 0),
      submission: entry.submission,
      promotionOverride,
      promotionOverrideJson: stringifyApplicantPromotionOverride(promotionOverride),
      preparedRecord: entry.preparedRecord
        ? {
            ...entry.preparedRecord,
            promotableRecord,
            recruitmentUnit,
          }
        : null,
      examineeNo: String(entry.examineeNo || "").trim(),
      name: String(promotableRecord?.name || "").trim(),
      birth: String(promotableRecord?.birth || "").trim(),
      track: String(promotableRecord?.track || "").trim(),
      admission: String(promotableRecord?.admission || "").trim(),
      series: String(promotableRecord?.series || "").trim(),
      unit: String(promotableRecord?.unit || "").trim(),
      major: String(promotableRecord?.major || "").trim(),
      date: String(promotableRecord?.date || "").trim(),
      time: String(promotableRecord?.time || "").trim(),
      buildingCode: String(promotableRecord?.buildingCode || "").trim(),
      building: String(promotableRecord?.building || "").trim(),
      roomCode: String(promotableRecord?.roomCode || "").trim(),
      room: String(promotableRecord?.room || "").trim(),
      hasPhoto: entry.hasPhoto,
      errors: Array.isArray(options.errors) ? [...options.errors] : [...(entry.errors || [])],
    };
  }

  async function buildApplicantPromotionPlan(connection, submissionIds = [], assignmentRows = null, options = {}) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(submissionIds);
    const promotionOptions = normalizeApplicantPromotionOptions(options);
    const queryable = connection.query.bind(connection);
    const submissions = await getApplicantSubmissionsByIds(normalizedSubmissionIds, {
      queryable,
      includeInternal: true,
      forUpdate: options.forUpdate === true,
    });
    const submissionIdSet = new Set(submissions.map((submission) => Number(submission?.id || 0)));
    const missingSubmissionIds = normalizedSubmissionIds.filter((submissionId) => !submissionIdSet.has(submissionId));

    if (missingSubmissionIds.length > 0) {
      throw createHttpError(404, "선택한 접수 이력 중 일부를 찾을 수 없습니다.", "APPLICANT_PROMOTION_SUBMISSION_NOT_FOUND");
    }

    const applicantSettings = options.settings || (await getApplicantSettings());
    const recruitmentUnits = Array.isArray(options.recruitmentUnits)
      ? options.recruitmentUnits
      : await getApplicantRecruitmentUnits({ queryable });
    const entriesByAssignmentBaseKey = new Map();
    const reservedExamineeNoMap = new Map();

    for (const submission of submissions) {
      const submissionId = Number(submission?.id || 0);
      const basePromotableRecord = buildPromotableApplicantRecord(submission);
      const assignmentBaseKey = buildApplicantPromotionAssignmentBaseKey(basePromotableRecord);
      const entry = {
        submissionId,
        submission,
        basePromotableRecord,
        assignmentBaseKey,
        hasPhoto: getApplicantSubmissionHasPhoto(submission),
        errors: [],
        preparedRecord: null,
        examineeNo: String(submission?.promotedExamineeNo || "").trim(),
      };

      if (String(submission?.status || "").trim() === "promoted") {
        entry.errors.push("이미 수험생으로 이관된 접수 이력입니다.");
      }

      try {
        entry.preparedRecord = await prepareApplicantSubmissionExamNo(connection, submission, applicantSettings);
        entry.examineeNo = String(entry.preparedRecord?.examineeNo || entry.examineeNo || "").trim();
      } catch (error) {
        entry.errors.push(error?.message || "수험번호를 준비하지 못했습니다.");
      }

      if (entry.examineeNo) {
        const existingSubmissionId = reservedExamineeNoMap.get(entry.examineeNo);

        if (existingSubmissionId && existingSubmissionId !== submissionId) {
          entry.errors.push(`선택한 접수 이력 사이에 중복 수험번호 '${entry.examineeNo}'가 있습니다.`);
        } else {
          reservedExamineeNoMap.set(entry.examineeNo, submissionId);
        }
      }

      if (!entriesByAssignmentBaseKey.has(assignmentBaseKey)) {
        entriesByAssignmentBaseKey.set(assignmentBaseKey, []);
      }

      entriesByAssignmentBaseKey.get(assignmentBaseKey).push(entry);
    }

    const assignmentSourceRows = Array.isArray(assignmentRows) ? assignmentRows : await getApplicantAssignments({ queryable });
    const validatedAssignmentRows = validateApplicantAssignmentRows(assignmentSourceRows, { requireRows: false });

    if (validatedAssignmentRows.length === 0) {
      throw createHttpError(400, "배정표 관리에 등록된 배정표가 없습니다.", "APPLICANT_ASSIGNMENT_NOT_CONFIGURED");
    }

    const relevantAssignmentBaseKeys = new Set(entriesByAssignmentBaseKey.keys());
    const assignmentRowsByAssignmentBaseKey = new Map();

    validatedAssignmentRows
      .filter((assignmentRow) => relevantAssignmentBaseKeys.has(buildApplicantPromotionAssignmentBaseKey(assignmentRow)))
      .forEach((assignmentRow) => {
        const assignmentBaseKey = buildApplicantPromotionAssignmentBaseKey(assignmentRow);

        if (!assignmentRowsByAssignmentBaseKey.has(assignmentBaseKey)) {
          assignmentRowsByAssignmentBaseKey.set(assignmentBaseKey, []);
        }

        assignmentRowsByAssignmentBaseKey.get(assignmentBaseKey).push(assignmentRow);
      });

    const planRows = [];
    const normalizedSortFields = promotionOptions.sortFields.filter(Boolean);

    relevantAssignmentBaseKeys.forEach((assignmentBaseKey) => {
      const groupEntries = [...(entriesByAssignmentBaseKey.get(assignmentBaseKey) || [])];
      const groupAssignments = [...(assignmentRowsByAssignmentBaseKey.get(assignmentBaseKey) || [])].sort((leftRow, rightRow) => {
        return (
          compareApplicantPromotionText(leftRow.date, rightRow.date) ||
          compareApplicantPromotionText(leftRow.time, rightRow.time) ||
          compareApplicantPromotionText(leftRow.buildingCode, rightRow.buildingCode) ||
          compareApplicantPromotionText(leftRow.roomCode, rightRow.roomCode)
        );
      });
      const sortEntries = (leftEntry, rightEntry) => {
        for (const sortField of normalizedSortFields) {
          const comparison = compareApplicantPromotionText(
            getApplicantPromotionSortValue(leftEntry, sortField),
            getApplicantPromotionSortValue(rightEntry, sortField),
          );

          if (comparison) {
            return comparison;
          }
        }

        return (
          compareApplicantPromotionText(leftEntry.examineeNo, rightEntry.examineeNo) ||
          Number(leftEntry.submissionId || 0) - Number(rightEntry.submissionId || 0)
        );
      };

      groupEntries.sort(sortEntries);

      if (groupAssignments.length === 0) {
        groupEntries.forEach((entry) => {
          const unassignedRecord = {
            ...entry.basePromotableRecord,
            date: "",
            time: "",
            buildingCode: "",
            building: "",
            roomCode: "",
            room: "",
          };
          const recruitmentUnit =
            entry.preparedRecord?.recruitmentUnit || resolveApplicantRecruitmentUnit(recruitmentUnits, entry.basePromotableRecord);
          const errors = [...entry.errors, "배정표에 해당 모집시기/전형/계열/모집단위/전공이 없습니다."];

          if (!recruitmentUnit) {
            errors.push("전형 관리에서 일치하는 모집시기/전형/계열/모집단위/전공을 찾을 수 없습니다.");
          }

          const missingFields = getApplicantPromotionMissingFields(unassignedRecord);

          if (missingFields.length > 0) {
            errors.push(`수험생 데이터에 필요한 항목이 비어 있습니다: ${missingFields.join(", ")}`);
          }

          planRows.push(
            buildApplicantPromotionPlanRow(entry, {
              promotionOverride: normalizeApplicantPromotionOverride(entry.submission?.promotionOverride),
              promotableRecord: unassignedRecord,
              recruitmentUnit,
              errors,
            }),
          );
        });
        return;
      }

      const remainingEntries = [...groupEntries];

      groupAssignments.forEach((assignmentRow) => {
        const roomCapacity = resolveApplicantPromotionRoomCapacity(assignmentRow, promotionOptions);
        let roomAssignedCount = 0;
        let roomBreakValue = "";

        for (let entryIndex = 0; roomAssignedCount < roomCapacity && entryIndex < remainingEntries.length; entryIndex += 1) {
          const entry = remainingEntries[entryIndex];

          if (!doesApplicantAssignmentRowMatchPromotableRecord(assignmentRow, entry.basePromotableRecord)) {
            continue;
          }

          const entryBreakValue = getApplicantPromotionSortValue(entry, promotionOptions.breakField);

          if (roomAssignedCount > 0 && compareApplicantPromotionText(entryBreakValue, roomBreakValue) !== 0) {
            break;
          }

          if (roomAssignedCount === 0) {
            roomBreakValue = entryBreakValue;
          }

          remainingEntries.splice(entryIndex, 1);
          entryIndex -= 1;
          roomAssignedCount += 1;

          const recruitmentUnit =
            entry.preparedRecord?.recruitmentUnit || resolveApplicantRecruitmentUnit(recruitmentUnits, entry.basePromotableRecord);
          const promotionOverride = {
            ...normalizeApplicantPromotionOverride(entry.submission?.promotionOverride),
            ...buildApplicantPromotionRoomOverrides(assignmentRow),
            ...buildApplicantPromotionCodeOverrides(recruitmentUnit),
          };
          const promotableRecord = buildPromotableApplicantRecord({
            ...entry.submission,
            promotionOverride,
          });
          const errors = [...entry.errors];

          if (!recruitmentUnit) {
            errors.push("전형 관리에서 일치하는 모집시기/전형/계열/모집단위/전공을 찾을 수 없습니다.");
          }

          const missingFields = getApplicantPromotionMissingFields(promotableRecord);

          if (missingFields.length > 0) {
            errors.push(`수험생 데이터에 필요한 항목이 비어 있습니다: ${missingFields.join(", ")}`);
          }

          planRows.push(
            buildApplicantPromotionPlanRow(entry, {
              promotionOverride,
              promotableRecord,
              recruitmentUnit,
              errors,
            }),
          );
        }
      });

      remainingEntries.forEach((entry) => {
        const recruitmentUnit =
          entry.preparedRecord?.recruitmentUnit || resolveApplicantRecruitmentUnit(recruitmentUnits, entry.basePromotableRecord);
        const unassignedRecord = {
          ...entry.basePromotableRecord,
          date: "",
          time: "",
          buildingCode: "",
          building: "",
          roomCode: "",
          room: "",
        };
        const hasMatchingAssignmentRow = groupAssignments.some((assignmentRow) =>
          doesApplicantAssignmentRowMatchPromotableRecord(assignmentRow, entry.basePromotableRecord),
        );
        const errors = [
          ...entry.errors,
          hasMatchingAssignmentRow ? APPLICANT_PROMOTION_CAPACITY_ERROR_MESSAGE : "배정표에 해당 모집시기/전형/계열/모집단위/전공이 없습니다.",
        ];

        if (!recruitmentUnit) {
          errors.push("전형 관리에서 일치하는 모집시기/전형/계열/모집단위/전공을 찾을 수 없습니다.");
        }

        const missingFields = getApplicantPromotionMissingFields(unassignedRecord);

        if (missingFields.length > 0) {
          errors.push(`수험생 데이터에 필요한 항목이 비어 있습니다: ${missingFields.join(", ")}`);
        }

        planRows.push(
          buildApplicantPromotionPlanRow(entry, {
            promotionOverride: normalizeApplicantPromotionOverride(entry.submission?.promotionOverride),
            promotableRecord: unassignedRecord,
            recruitmentUnit,
            errors,
          }),
        );
      });
    });

    const orderedRows = [...planRows].sort((leftRow, rightRow) => {
      const leftSubmissionId = Number(leftRow.submissionId || 0);

      return (
        compareApplicantPromotionText(leftRow.track, rightRow.track) ||
        compareApplicantPromotionText(leftRow.admission, rightRow.admission) ||
        compareApplicantPromotionText(leftRow.date, rightRow.date) ||
        compareApplicantPromotionText(leftRow.time, rightRow.time) ||
        compareApplicantPromotionText(leftRow.buildingCode, rightRow.buildingCode) ||
        compareApplicantPromotionText(leftRow.roomCode, rightRow.roomCode) ||
        compareApplicantPromotionText(leftRow.examineeNo, rightRow.examineeNo) ||
        leftSubmissionId - Number(rightRow.submissionId || 0)
      );
    });
    const summary = buildApplicantPromotionSummary(orderedRows, {
      allowMissingPhoto: promotionOptions.allowMissingPhoto === true,
      breakField: promotionOptions.breakField,
    });

    return {
      rows: orderedRows,
      summary,
    };
  }

  async function previewApplicantSubmissionPromotions(payload = {}) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(payload.submissionIds);
    await assertApplicantPromotionWindowClosed(normalizedSubmissionIds);
    const connection = await getPool().getConnection();

    try {
      const plan = await buildApplicantPromotionPlan(connection, normalizedSubmissionIds, null, {
        allowMissingPhoto: payload.allowMissingPhoto === true,
        allowOverbooking: payload.allowOverbooking === true,
        overbookingPercent: payload.overbookingPercent,
        sortField1: payload.sortField1,
        sortField2: payload.sortField2,
        sortField3: payload.sortField3,
        breakField: payload.breakField,
      });

      return {
        rows: normalizeApplicantPromotionPreviewRows(plan.rows),
        summary: plan.summary,
      };
    } finally {
      connection.release();
    }
  }

  async function commitApplicantSubmissionPromotions(payload = {}) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(payload.submissionIds);
    await assertApplicantPromotionWindowClosed(normalizedSubmissionIds);
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const applicantSettings = await getApplicantSettings();
      const plan = await buildApplicantPromotionPlan(connection, normalizedSubmissionIds, null, {
        allowMissingPhoto: payload.allowMissingPhoto === true,
        allowOverbooking: payload.allowOverbooking === true,
        overbookingPercent: payload.overbookingPercent,
        sortField1: payload.sortField1,
        sortField2: payload.sortField2,
        sortField3: payload.sortField3,
        breakField: payload.breakField,
        forUpdate: true,
        settings: applicantSettings,
      });

      if (!plan.summary.canCommit) {
        throw createHttpError(
          409,
          buildApplicantPromotionCommitErrorMessage(plan.summary, plan.rows),
          "APPLICANT_PROMOTION_COMMIT_BLOCKED",
        );
      }

      const storedPhotoRecords = [];

      for (const planRow of plan.rows) {
        const normalizedSubmissionId = Number(planRow.submissionId || 0);

        if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
          continue;
        }

        await connection.query(
          `
            INSERT INTO app_meta (
              id,
              promoted_examinee_no,
              promotion_override_json,
              promoted_at
            )
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              promoted_examinee_no = VALUES(promoted_examinee_no),
              promotion_override_json = VALUES(promotion_override_json),
              promoted_at = CURRENT_TIMESTAMP
          `,
          [normalizedSubmissionId, planRow.examineeNo, planRow.promotionOverrideJson],
        );

        const upsertResult = await upsertApplicantSubmissionIntoExaminee(
          connection,
          {
            ...planRow.submission,
            promotionOverride: planRow.promotionOverride,
          },
          applicantSettings,
          planRow.preparedRecord,
        );

        await connection.query(
          `
            UPDATE app_subm
            SET
              status = 'promoted',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [normalizedSubmissionId],
        );

        if (upsertResult?.storedPhotoRecord) {
          storedPhotoRecords.push(upsertResult.storedPhotoRecord);
        }
      }

      await connection.commit();
      await Promise.all(storedPhotoRecords.map((storedPhotoRecord) => persistPromotedApplicantPhotoFile(storedPhotoRecord)));

      return {
        processedCount: normalizedSubmissionIds.length,
        rows: normalizeApplicantPromotionPreviewRows(plan.rows),
        summary: plan.summary,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function resetApplicantSubmissionPromotions(payload = {}) {
    const normalizedSubmissionIds = normalizeApplicantSubmissionIdList(payload.submissionIds);
    const connection = await getPool().getConnection();
    let promotedExamineeRows = [];

    try {
      await connection.beginTransaction();

      const submissions = await getApplicantSubmissionsByIds(normalizedSubmissionIds, {
        queryable: connection.query.bind(connection),
        forUpdate: true,
        includeInternal: true,
      });
      const foundSubmissionIds = new Set(
        submissions
          .map((submission) => Number(submission?.id || 0))
          .filter((submissionId) => Number.isInteger(submissionId) && submissionId > 0),
      );
      const missingSubmissionIds = normalizedSubmissionIds.filter((submissionId) => !foundSubmissionIds.has(submissionId));

      if (missingSubmissionIds.length > 0) {
        throw createHttpError(404, "일부 접수 이력을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_NOT_FOUND");
      }

      const resettableSubmissions = submissions.filter((submission) => {
        const status = String(submission?.status || "").trim();
        const promotedExamineeNo = String(submission?.promotedExamineeNo || "").trim();
        const promotionOverrideJson = String(submission?.promotionOverrideJson || "").trim();
        const promotedAt = String(submission?.promotedAt || "").trim();

        return status === "promoted" || Boolean(promotedExamineeNo || promotionOverrideJson || promotedAt);
      });
      const promotedExamineeNos = Array.from(
        new Set(
          resettableSubmissions
            .map((submission) => String(submission?.promotedExamineeNo || "").trim())
            .filter(Boolean),
        ),
      );
      const submissionPlaceholders = normalizedSubmissionIds.map(() => "?").join(", ");

      if (promotedExamineeNos.length > 0) {
        const examineePlaceholders = promotedExamineeNos.map(() => "?").join(", ");
        const [examineeRows] = await connection.query(
          `
            SELECT
              examinee_no AS examineeNo,
              photo_name AS photoName
            FROM examinee
            WHERE examinee_no IN (${examineePlaceholders})
          `,
          promotedExamineeNos,
        );
        promotedExamineeRows = Array.isArray(examineeRows) ? examineeRows : [];

        await connection.query(
          `
            DELETE FROM examinee
            WHERE examinee_no IN (${examineePlaceholders})
          `,
          promotedExamineeNos,
        );
      }

      await connection.query(
        `
          UPDATE app_subm
          SET
            status = 'submitted',
            updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${submissionPlaceholders})
        `,
        normalizedSubmissionIds,
      );

      await connection.query(
        `
          UPDATE app_meta
          SET
            promotion_override_json = NULL,
            promoted_at = NULL
          WHERE id IN (${submissionPlaceholders})
        `,
        normalizedSubmissionIds,
      );

      await connection.commit();
      await deleteApplicantPromotionPhotoFiles(promotedExamineeRows);

      return {
        processedCount: normalizedSubmissionIds.length,
        resetCount: resettableSubmissions.length,
        deletedExamineeCount: promotedExamineeRows.length,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function sendApplicantVerificationCode(payload = {}) {
    await assertApplicantSubmissionEntryIsOpen();

    const applicantName = normalizeApplicantText(payload.name, "이름", { maxLength: 100 });
    const email = normalizeApplicantEmail(payload.email);
    const codeValue = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + emailVerificationTtlMs);
    const insertResult = await query(
      `
        INSERT INTO app_email_log (
          applicant_name,
          email,
          code_value,
          expires_at,
          delivery_status
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [applicantName, email, codeValue, expiresAt, APPLICANT_EMAIL_DELIVERY_STATUSES.PENDING],
    );
    const verificationLogId = Math.max(0, Number(insertResult?.insertId || 0));

    try {
      const sendResult = await dispatchVerificationEmail({
        applicantName,
        codeValue,
        email,
        expiresAt,
      });
      const deliveryMode = String(sendResult?.deliveryMode || "smtp").trim() || "smtp";
      const deliveryStatus = normalizeApplicantEmailDeliveryStatus(
        sendResult?.deliveryStatus || APPLICANT_EMAIL_DELIVERY_STATUSES.SENT,
      );
      const messageId = String(sendResult?.messageId || "").trim().slice(0, 255);

      if (deliveryStatus !== APPLICANT_EMAIL_DELIVERY_STATUSES.SENT) {
        throw createHttpError(
          502,
          "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도하세요.",
          "APPLICANT_VERIFICATION_EMAIL_SEND_FAILED",
        );
      }

      if (verificationLogId > 0) {
        await query(
          `
            UPDATE app_email_log
            SET
              delivery_status = ?,
              delivery_message_id = ?,
              sent_at = CASE WHEN ? = ? THEN NOW() ELSE sent_at END,
              failed_at = CASE WHEN ? = ? THEN NOW() ELSE NULL END,
              delivery_error = ''
            WHERE id = ?
          `,
          [
            deliveryStatus,
            messageId || null,
            deliveryStatus,
            APPLICANT_EMAIL_DELIVERY_STATUSES.SENT,
            deliveryStatus,
            APPLICANT_EMAIL_DELIVERY_STATUSES.FAILED,
            verificationLogId,
          ],
        );
      }

      return {
        ok: true,
        expiresInSeconds: Math.round(emailVerificationTtlMs / 1000),
        deliveryMode,
        debugCode: String(sendResult?.debugCode || ""),
      };
    } catch (error) {
      const normalizedError =
        error?.statusCode && error?.errorCode
          ? error
          : createHttpError(
              error?.statusCode || 502,
              String(error?.message || "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도하세요."),
              String(error?.errorCode || "APPLICANT_VERIFICATION_EMAIL_SEND_FAILED"),
            );

      if (verificationLogId > 0) {
        await query(
          `
            UPDATE app_email_log
            SET
              delivery_status = ?,
              failed_at = NOW(),
              delivery_error = ?
            WHERE id = ?
          `,
          [
            APPLICANT_EMAIL_DELIVERY_STATUSES.FAILED,
            String(normalizedError.message || "인증 메일 발송 실패").trim().slice(0, 500),
            verificationLogId,
          ],
        ).catch(() => {});
      }

      throw normalizedError;
    }
  }

  async function verifyApplicantVerificationCode(payload = {}) {
    await assertApplicantSubmissionEntryIsOpen();
    const applicantName = normalizeApplicantText(payload.name, "이름", { maxLength: 100 });
    const email = normalizeApplicantEmail(payload.email);
    const codeValue = normalizeApplicantText(payload.code, "인증 코드", {
      maxLength: 12,
      errorCode: "APPLICANT_VERIFICATION_CODE_REQUIRED",
    });
    const rows = await query(
      `
        SELECT
          id,
          applicant_name AS applicantName,
          email,
          code_value AS codeValue,
          expires_at AS expiresAt,
          verified_at AS verifiedAt,
          delivery_status AS deliveryStatus
        FROM app_email_log
        WHERE applicant_name = ?
          AND email = ?
          AND delivery_status = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [applicantName, email, APPLICANT_EMAIL_DELIVERY_STATUSES.SENT],
    );
    const latestVerification = rows[0];

    if (!latestVerification) {
      throw createHttpError(404, "발송된 인증 코드를 찾을 수 없습니다. 인증 코드를 다시 요청하세요.", "APPLICANT_VERIFICATION_NOT_FOUND");
    }

    if (latestVerification.verifiedAt) {
      throw createHttpError(409, "이미 사용된 인증 코드입니다. 새 코드를 발급받으세요.", "APPLICANT_VERIFICATION_ALREADY_USED");
    }

    const expiresAtTime = new Date(latestVerification.expiresAt).getTime();

    if (!Number.isFinite(expiresAtTime) || expiresAtTime < Date.now()) {
      throw createHttpError(410, "인증 코드가 만료되었습니다. 새 코드를 발급받으세요.", "APPLICANT_VERIFICATION_EXPIRED");
    }

    if (String(latestVerification.codeValue || "").trim() !== codeValue) {
      throw createHttpError(400, "인증 코드가 일치하지 않습니다.", "APPLICANT_VERIFICATION_CODE_MISMATCH");
    }

    await query(`UPDATE app_email_log SET verified_at = NOW() WHERE id = ?`, [latestVerification.id]);

    const accessToken = createPublicAccessToken({
      type: APPLICANT_PUBLIC_ACCESS_TYPES.verified,
      name: applicantName,
      email,
    });
    const latestSubmission = await getLatestApplicantSubmissionByApplicant(applicantName, email);

    return {
      verified: true,
      accessToken,
      submission: latestSubmission.id ? latestSubmission : null,
    };
  }

  async function lookupApplicantSubmission(payload = {}) {
    const lookupTarget = normalizeApplicantPublicLookupTarget(payload.lookupTarget);
    const applicantName = normalizeApplicantText(payload.name, "이름", { maxLength: 100 });
    const email = normalizeApplicantEmail(payload.email);
    const password = String(payload.password ?? "");
    const latestSubmission = await getLatestApplicantSubmissionByApplicant(applicantName, email);

    if (!latestSubmission.id) {
      throw createHttpError(404, "일치하는 접수 이력을 찾을 수 없습니다.", "APPLICANT_LOOKUP_NOT_FOUND");
    }

    if (!password.trim()) {
      throw createHttpError(400, "비밀번호를 입력하세요.", "APPLICANT_LOOKUP_PASSWORD_REQUIRED");
    }

    const lookupTargetSubmission = await getApplicantSubmissionById(latestSubmission.id, {
      includeInternal: true,
    });

    if (!lookupTargetSubmission.hasPassword || !verifyPassword(password, lookupTargetSubmission.passwordHash)) {
      throw createHttpError(401, "비밀번호가 일치하지 않습니다.", "APPLICANT_LOOKUP_PASSWORD_INVALID");
    }

    if (lookupTarget === APPLICANT_PUBLIC_LOOKUP_TARGETS.ticket) {
      await assertApplicantAdmitCardLookupIsOpen(lookupTargetSubmission);
    }

    const accessToken = createPublicAccessToken({
      type: APPLICANT_PUBLIC_ACCESS_TYPES.lookup,
      lookupTarget,
      name: applicantName,
      email,
      submissionId: latestSubmission.id,
    });

    return {
      accessToken,
      submission: latestSubmission,
    };
  }

  async function saveApplicantSubmission(payload = {}) {
    const accessRecord = getPublicAccessRecordOrThrow(payload.accessToken, [
      APPLICANT_PUBLIC_ACCESS_TYPES.lookup,
      APPLICANT_PUBLIC_ACCESS_TYPES.verified,
    ]);
    const applicantName = normalizeApplicantText(accessRecord.name, "이름", { maxLength: 100 });
    const email = normalizeApplicantEmail(accessRecord.email);
    const [formFields, recruitmentUnits] = await Promise.all([
      getApplicantFormFields({ activeOnly: true }),
      getApplicantRecruitmentUnits(),
    ]);

    if (formFields.length === 0) {
      throw createHttpError(409, "관리자가 접수 양식을 아직 설정하지 않았습니다.", "APPLICANT_FORM_NOT_CONFIGURED");
    }

    let existingSubmission = null;
    const requestedSubmissionId = Number(payload.submissionId || accessRecord.submissionId || 0);

    if (Number.isInteger(requestedSubmissionId) && requestedSubmissionId > 0) {
      existingSubmission = await getApplicantSubmissionById(requestedSubmissionId, { includeInternal: true });

      if (existingSubmission.name !== applicantName || existingSubmission.email !== email) {
        throw createHttpError(403, "해당 접수 이력에 접근할 수 없습니다.", "APPLICANT_SUBMISSION_FORBIDDEN");
      }
    } else {
      const latestSubmission = await getLatestApplicantSubmissionByApplicant(applicantName, email);
      existingSubmission = latestSubmission.id ? await getApplicantSubmissionById(latestSubmission.id, { includeInternal: true }) : null;
    }

    const normalizedRecruitmentSelection = normalizeApplicantRecruitmentSelection(payload.selectionAnswers, recruitmentUnits);
    await assertApplicantSubmissionEntryIsOpen(normalizedRecruitmentSelection.selection);
    const submissionArtifacts = buildApplicantSubmissionArtifacts(
      formFields,
      payload.answers,
      { name: applicantName, email },
      existingSubmission,
      {
        recruitmentSelection: normalizedRecruitmentSelection.selection,
        recruitmentUnits,
      },
    );
    const passwordPayload = normalizeApplicantSubmissionPassword(payload.password, existingSubmission);
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      let submissionId = existingSubmission?.id || 0;
      const queryable = connection.query.bind(connection);
      const createdAtValue = normalizeApplicantDateTimeValue(existingSubmission?.createdAt || new Date());
      const updatedAtValue = normalizeApplicantDateTimeValue(new Date());
      const passwordHashValue = passwordPayload.shouldUpdate
        ? passwordPayload.value
        : String(existingSubmission?.passwordHash || "").trim() || null;
      const submissionStatus = String(existingSubmission?.status || "submitted").trim() || "submitted";

      if (submissionId > 0) {
        await connection.query(`INSERT INTO app_meta (id) VALUES (?) ON DUPLICATE KEY UPDATE id = VALUES(id)`, [submissionId]);
        await connection.query(`DELETE FROM app_subm WHERE id = ?`, [submissionId]);
      } else {
        const [insertResult] = await connection.query(`INSERT INTO app_meta () VALUES ()`);
        submissionId = Number(insertResult?.insertId || 0);
      }

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        throw createHttpError(500, "접수 정보를 저장하지 못했습니다.", "APPLICANT_SUBMISSION_SAVE_FAILED");
      }

      for (const answerRow of submissionArtifacts.answerRows) {
        await connection.query(
          `
            INSERT INTO app_subm (
              id,
              applicant_name,
              email,
              password_hash,
              status,
              field_key,
              answer_data,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            applicantName,
            email,
            passwordHashValue,
            submissionStatus,
            answerRow.fieldKey,
            answerRow.answerData,
            createdAtValue,
            updatedAtValue,
          ],
        );
      }

      const savedSubmission = await getApplicantSubmissionById(submissionId, {
        queryable,
        includeInternal: true,
      });

      if (!savedSubmission?.id) {
        throw createHttpError(500, "접수 정보를 저장하지 못했습니다.", "APPLICANT_SUBMISSION_SAVE_FAILED");
      }

      const applicantSettings = await getApplicantSettings();
      const preparedSubmissionRecord = await prepareApplicantSubmissionExamNo(connection, savedSubmission, applicantSettings, {
        uploadedFileUploads: submissionArtifacts.fileUploads,
        uploadedPhotoValue: submissionArtifacts.photoUpload,
      });
      const shouldSyncExaminee = String(savedSubmission.status || "").trim() === "promoted";

      await applyPreparedApplicantUploadAnswerRows(connection, submissionId, preparedSubmissionRecord);

      if (shouldSyncExaminee) {
        await upsertApplicantSubmissionIntoExaminee(connection, savedSubmission, applicantSettings, preparedSubmissionRecord);
        await connection.query(
          `
            INSERT INTO app_meta (
              id,
              promoted_examinee_no,
              promoted_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              promoted_examinee_no = VALUES(promoted_examinee_no),
              promoted_at = CURRENT_TIMESTAMP
          `,
          [submissionId, preparedSubmissionRecord.examineeNo],
        );
      } else {
        await connection.query(
          `
            INSERT INTO app_meta (
              id,
              promoted_examinee_no
            )
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
              promoted_examinee_no = VALUES(promoted_examinee_no)
          `,
          [submissionId, preparedSubmissionRecord.examineeNo],
        );
      }

      await connection.commit();
      const persistTasks = [];

      if (preparedSubmissionRecord.applicantPhotoRecord) {
        persistTasks.push(persistApplicantPhotoFile(preparedSubmissionRecord.applicantPhotoRecord));
      }

      if (Array.isArray(preparedSubmissionRecord.applicantFileRecords) && preparedSubmissionRecord.applicantFileRecords.length > 0) {
        persistTasks.push(...preparedSubmissionRecord.applicantFileRecords.map((storedFileRecord) => persistApplicantFile(storedFileRecord)));
      }

      if (shouldSyncExaminee && preparedSubmissionRecord.storedPhotoRecord) {
        persistTasks.push(persistPromotedApplicantPhotoFile(preparedSubmissionRecord.storedPhotoRecord));
      }

      await Promise.all(persistTasks);
      return getApplicantSubmissionById(submissionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function updateApplicantSubmissionPhoto(submissionId, payload = {}) {
    const normalizedSubmissionId = Number(submissionId);

    if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
      throw createHttpError(400, "접수 이력 ID가 올바르지 않습니다.", "APPLICANT_SUBMISSION_ID_INVALID");
    }

    const normalizedPhotoPayload = normalizeApplicantPhotoPayload({
      base64: payload?.base64 || payload?.fileContentBase64,
      fileName: payload?.fileName,
      mimeType: payload?.mimeType,
    });

    if (!normalizedPhotoPayload) {
      throw createHttpError(400, "등록할 사진 파일 데이터가 없습니다.", "APPLICANT_PHOTO_REQUIRED");
    }

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const queryable = connection.query.bind(connection);

      await connection.query(`INSERT INTO app_meta (id) VALUES (?) ON DUPLICATE KEY UPDATE id = VALUES(id)`, [normalizedSubmissionId]);

      const existingSubmission = await getApplicantSubmissionById(normalizedSubmissionId, {
        queryable,
        includeInternal: true,
        forUpdate: true,
      });
      const photoAnswerItem =
        (Array.isArray(existingSubmission?.answerItems) ? existingSubmission.answerItems : []).find((answerItem) => {
          const fieldKey = String(answerItem?.fieldKey || "").trim();
          const systemFieldKey = String(answerItem?.systemFieldKey || "").trim();
          return answerItem?.inputType === "photo" || systemFieldKey === "photo" || fieldKey === "photo";
        }) || null;

      if (!photoAnswerItem?.fieldKey) {
        throw createHttpError(400, "등록된 사진 항목을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_PHOTO_FIELD_NOT_FOUND");
      }

      const savedSubmission = await getApplicantSubmissionById(normalizedSubmissionId, {
        queryable,
        includeInternal: true,
      });
      const applicantSettings = await getApplicantSettings();
      const preparedSubmissionRecord = await prepareApplicantSubmissionExamNo(connection, savedSubmission, applicantSettings, {
        uploadedPhotoValue: {
          fieldKey: photoAnswerItem.fieldKey,
          ...normalizedPhotoPayload,
        },
      });
      const shouldSyncExaminee = String(savedSubmission.status || "").trim() === "promoted";

      await applyPreparedApplicantUploadAnswerRows(connection, normalizedSubmissionId, preparedSubmissionRecord);

      await connection.query(
        `
          INSERT INTO app_meta (
            id,
            promoted_examinee_no
          )
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            promoted_examinee_no = VALUES(promoted_examinee_no)
        `,
        [normalizedSubmissionId, preparedSubmissionRecord.examineeNo],
      );

      if (shouldSyncExaminee) {
        await upsertApplicantSubmissionIntoExaminee(connection, savedSubmission, applicantSettings, preparedSubmissionRecord);
      }

      await connection.commit();
      const persistTasks = [];

      if (preparedSubmissionRecord.applicantPhotoRecord) {
        persistTasks.push(persistApplicantPhotoFile(preparedSubmissionRecord.applicantPhotoRecord));
      }

      if (shouldSyncExaminee && preparedSubmissionRecord.storedPhotoRecord) {
        persistTasks.push(persistPromotedApplicantPhotoFile(preparedSubmissionRecord.storedPhotoRecord));
      }

      await Promise.all(persistTasks);
      return getApplicantSubmissionById(normalizedSubmissionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function getApplicantSubmissionForAccessToken(accessToken, submissionId, options = {}) {
    const accessRecord = getPublicAccessRecordOrThrow(accessToken, [
      APPLICANT_PUBLIC_ACCESS_TYPES.lookup,
      APPLICANT_PUBLIC_ACCESS_TYPES.verified,
    ]);

    if (options.requireTicketLookupTarget === true) {
      if (accessRecord.type !== APPLICANT_PUBLIC_ACCESS_TYPES.lookup) {
        throw createHttpError(403, "수험표 조회 권한이 없습니다.", "APPLICANT_ADMIT_CARD_LOOKUP_FORBIDDEN");
      }

      if (normalizeApplicantPublicLookupTarget(accessRecord.lookupTarget) !== APPLICANT_PUBLIC_LOOKUP_TARGETS.ticket) {
        throw createHttpError(403, "접수결과 조회에서는 수험표를 열 수 없습니다.", "APPLICANT_ADMIT_CARD_LOOKUP_TARGET_INVALID");
      }
    }

    const resolvedSubmissionId = Number(submissionId || accessRecord.submissionId || 0);

    if (!Number.isInteger(resolvedSubmissionId) || resolvedSubmissionId <= 0) {
      throw createHttpError(400, "접수 이력 ID가 필요합니다.", "APPLICANT_SUBMISSION_ID_REQUIRED");
    }

    const submission = await getApplicantSubmissionById(resolvedSubmissionId);

    if (submission.name !== accessRecord.name || submission.email !== accessRecord.email) {
      throw createHttpError(403, "해당 접수 이력에 접근할 수 없습니다.", "APPLICANT_SUBMISSION_FORBIDDEN");
    }

    if (options.requirePromoted === true && (submission.status !== "promoted" || !submission.promotedExamineeNo)) {
      throw createHttpError(409, "아직 수험표가 발급되지 않았습니다.", "APPLICANT_ADMIT_CARD_NOT_READY");
    }

    return submission;
  }

  async function buildApplicantAdmitCardPdfForAccessToken(accessToken, submissionId) {
    const systemSettings = await getApplicantPublicSystemSettings();
    const admitCardDataSource = normalizeApplicantAdmitCardDataSource(systemSettings.admitCardDataSource);
    const submission = await getApplicantSubmissionForAccessToken(accessToken, submissionId, {
      requireTicketLookupTarget: true,
      requirePromoted: admitCardDataSource === APPLICANT_ADMIT_CARD_DATA_SOURCES.examinee,
    });
    await assertApplicantAdmitCardLookupIsOpen(submission);

    if (admitCardDataSource === APPLICANT_ADMIT_CARD_DATA_SOURCES.submission) {
      const admitCardRecord = await buildApplicantAdmitCardRecordFromSubmission(submission);
      return {
        pdfBuffer: await buildSubmissionAdmitCardPdfBuffer(admitCardRecord, {
          title: `${admitCardRecord.name || submission.name || "수험표"} 수험표`,
        }),
        fileNameBase: String(submission.promotedExamineeNo || submission.id || "admit-card").trim() || "admit-card",
      };
    }

    return {
      pdfBuffer: await buildExamineeAdmitCardPdfBuffer(submission.promotedExamineeNo),
      fileNameBase: String(submission.promotedExamineeNo || submission.id || "admit-card").trim() || "admit-card",
    };
  }

  async function getApplicantPublicForm() {
    const [fields, settings, systemSettings, noticeHtml, recruitmentUnits, schedules] = await Promise.all([
      getApplicantFormFields({ activeOnly: true }),
      getApplicantSettings(),
      getApplicantPublicSystemSettings(),
      getApplicantPublicNoticeHtml(),
      getApplicantRecruitmentUnits(),
      getApplicantSchedules(),
    ]);

    return {
      fields,
      settings,
      systemSettings,
      noticeHtml,
      recruitmentUnits,
      schedules,
    };
  }

  async function seedApplicantFormFields() {
    const [fieldSummary] = await query(`SELECT COUNT(*) AS fieldCount FROM app_form`);

    if (Number(fieldSummary?.fieldCount || 0) > 0) {
      return;
    }

    for (let index = 0; index < DEFAULT_APPLICANT_FORM_FIELD_SEEDS.length; index += 1) {
      const seed = DEFAULT_APPLICANT_FORM_FIELD_SEEDS[index];
      await query(
        `
          INSERT INTO app_form (
            field_key,
            question_text,
            input_type,
            system_field_key,
            options_json,
            required,
            sort_order,
            active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          seed.fieldKey,
          seed.questionText,
          seed.inputType,
          seed.systemFieldKey,
          JSON.stringify(seed.options || []),
          seed.required ? 1 : 0,
          index + 1,
        ],
      );
    }
  }

  return Object.freeze({
    buildApplicantAssignmentExportBuffer,
    buildApplicantAssignmentTemplateBuffer,
    buildApplicantAdmitCardPdfForAccessToken,
    buildApplicantPromotionAssignmentTemplateBuffer,
    buildApplicantPromotionPreviewExportBuffer,
    buildApplicantSubmissionPhotoArchiveBuffer,
    buildApplicantSubmissionExportBuffer,
    buildApplicantRecruitmentUnitExportBuffer,
    buildApplicantRecruitmentUnitTemplateBuffer,
    commitApplicantSubmissionPromotions,
    resetApplicantSubmissionPromotions,
    createApplicantAssignment,
    createApplicantRecruitmentUnit,
    createApplicantFormField,
    deleteApplicantAssignment,
    deleteApplicantSubmission,
    deleteApplicantRecruitmentUnit,
    deleteApplicantFormField,
    getApplicantAssignments,
    getApplicantFormFields,
    getApplicantPublicForm,
    getApplicantRecruitmentUnits,
    getApplicantSchedules,
    getApplicantSettings,
    getApplicantSubmissionFile,
    getApplicantSubmissionById,
    getApplicantSubmissionPhoto,
    getApplicantSubmissionForAccessToken,
    getApplicantSubmissions,
    importApplicantAssignments,
    importApplicantRecruitmentUnits,
    lookupApplicantSubmission,
    migrateApplicantFileAnswerData,
    migrateApplicantPhotoStorage,
      moveApplicantFormField,
      previewApplicantAssignmentsImport,
      previewApplicantRecruitmentUnitImport,
      previewApplicantSubmissionPromotions,
      saveApplicantSchedule,
      saveApplicantSubmission,
    seedApplicantFormFields,
    sendApplicantVerificationCode,
    updateApplicantSubmissionPhoto,
    updateApplicantAssignment,
    updateApplicantRecruitmentUnit,
    updateApplicantFormField,
    updateApplicantSettings,
    verifyApplicantVerificationCode,
  });
}

module.exports = {
  createApplicantService,
};
