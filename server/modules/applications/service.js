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
const APPLICANT_FORM_INPUT_TYPES = Object.freeze(["text", "textarea", "select", "date", "birthdate", "time", "photo", "phone", "nationality"]);
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
  Object.freeze({ key: "admissionCode", header: "전형코드", width: 16, sample: "SU" }),
  Object.freeze({ key: "admissionName", header: "전형", width: 18, sample: "수시" }),
  Object.freeze({ key: "seriesCode", header: "계열코드", width: 16, sample: "EN" }),
  Object.freeze({ key: "seriesName", header: "계열", width: 18, sample: "공학계열" }),
  Object.freeze({ key: "unitCode", header: "모집단위코드", width: 18, sample: "CSE" }),
  Object.freeze({ key: "unitName", header: "모집단위", width: 24, sample: "컴퓨터공학부" }),
  Object.freeze({ key: "majorCode", header: "전공코드", width: 16, sample: "SE" }),
  Object.freeze({ key: "majorName", header: "전공", width: 24, sample: "소프트웨어전공" }),
]);
const APPLICANT_RECRUITMENT_UNIT_PAIR_FIELDS = Object.freeze([
  Object.freeze({ codeKey: "admissionCode", nameKey: "admissionName", codeLabel: "전형코드", nameLabel: "전형" }),
  Object.freeze({ codeKey: "seriesCode", nameKey: "seriesName", codeLabel: "계열코드", nameLabel: "계열" }),
  Object.freeze({ codeKey: "unitCode", nameKey: "unitName", codeLabel: "모집단위코드", nameLabel: "모집단위" }),
  Object.freeze({ codeKey: "majorCode", nameKey: "majorName", codeLabel: "전공코드", nameLabel: "전공" }),
]);
const APPLICANT_RECRUITMENT_SELECTION_FIELDS = Object.freeze([
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

function createApplicantService({
  buildAdmitCardPdfBuffer,
  buildAdmitCardPdfBufferFromRecord,
  createHttpError,
  emailVerificationTtlMs = 1000 * 60 * 10,
  photoStorageDirName = "photo",
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
  const photoStorageDirectoryPath = path.join(rootDir, photoStorageDirName);
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
          rememberPair(pairMap, codeValue, nameValue, "기존 접수 설정");
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
    const worksheet = workbook.addWorksheet("접수설정", {
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
      throw createHttpError(400, "다운로드할 접수 설정 데이터가 없습니다.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("접수설정", {
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
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => {
      const normalizedAnswerItems = normalizeStoredAnswerItems(row?.answerItems);

      return {
        id: String(row?.id || "").trim(),
        name: String(row?.name || "").trim(),
        email: String(row?.email || "").trim(),
        statusLabel: String(row?.statusLabel || row?.status || "접수 완료").trim(),
        promotedExamineeNo: String(row?.promotedExamineeNo || "").trim(),
        createdAt: String(row?.createdAt || "").trim(),
        updatedAt: String(row?.updatedAt || "").trim(),
        answerValues: normalizedAnswerItems.map((answerItem) => {
          if (answerItem.inputType === "photo") {
            return answerItem?.value?.hasPhoto ? String(answerItem?.value?.fileName || "등록된 사진").trim() : "미등록";
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
      { header: "상태", key: "statusLabel", width: 18 },
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
        promotedExamineeNo: String(row?.promotedExamineeNo || "").trim(),
        photoFileName: path.basename(String(row?.photoFileName || "").trim()),
      }))
      .filter((row) => row.promotedExamineeNo || row.photoFileName);

    if (normalizedRows.length === 0) {
      throw createHttpError(400, "다운로드할 수험생 사진 대상이 없습니다.");
    }

    const zip = new AdmZip();
    const handledKeys = new Set();
    let addedPhotoCount = 0;

    for (const row of normalizedRows) {
      const dedupeKey = row.promotedExamineeNo || row.photoFileName;

      if (!dedupeKey || handledKeys.has(dedupeKey)) {
        continue;
      }

      handledKeys.add(dedupeKey);
      const candidateFileNames = [
        row.photoFileName,
        row.promotedExamineeNo ? `${row.promotedExamineeNo}.jpg` : "",
        row.promotedExamineeNo ? `${row.promotedExamineeNo}.jpeg` : "",
        row.promotedExamineeNo ? `${row.promotedExamineeNo}.png` : "",
      ].filter(Boolean);

      for (const candidateFileName of candidateFileNames) {
        const normalizedCandidateFileName = path.basename(candidateFileName);
        const candidateFilePath = path.join(photoStorageDirectoryPath, normalizedCandidateFileName);

        try {
          const photoBuffer = await fs.promises.readFile(candidateFilePath);
          zip.addFile(normalizedCandidateFileName, photoBuffer);
          addedPhotoCount += 1;
          break;
        } catch (error) {
          if (error?.code !== "ENOENT") {
            throw error;
          }
        }
      }
    }

    if (addedPhotoCount === 0) {
      throw createHttpError(400, "photo 폴더에서 다운로드할 수험생 사진 파일을 찾을 수 없습니다.");
    }

    return zip.toBuffer();
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
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange();

    return {
      admissionHomepageUrl: String(rowsByKey.get("admissionHomepageUrl") || "").trim(),
      applicantScheduleStartAt: normalizeApplicantScheduleDateTime(rowsByKey.get("applicantScheduleStartAt"), {
        defaultValue: defaultApplicantScheduleRange.startAt,
      }),
      applicantScheduleEndAt: normalizeApplicantScheduleDateTime(rowsByKey.get("applicantScheduleEndAt"), {
        defaultValue: defaultApplicantScheduleRange.endAt,
      }),
      admitCardLookupScheduleStartAt: normalizeApplicantScheduleDateTime(rowsByKey.get("admitCardLookupScheduleStartAt"), {
        defaultValue: defaultApplicantScheduleRange.startAt,
      }),
      admitCardLookupScheduleEndAt: normalizeApplicantScheduleDateTime(rowsByKey.get("admitCardLookupScheduleEndAt"), {
        defaultValue: defaultApplicantScheduleRange.endAt,
      }),
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

  function getApplicantSubmissionScheduleState(systemSettings = {}, referenceDate = new Date()) {
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange(referenceDate);
    const applicantScheduleStartAt = normalizeApplicantScheduleDateTime(systemSettings.applicantScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const applicantScheduleEndAt = normalizeApplicantScheduleDateTime(systemSettings.applicantScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });

    const currentTimestamp = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const applicantScheduleStartTimestamp = getApplicantScheduleTimestamp(applicantScheduleStartAt);
    const applicantScheduleEndTimestamp = getApplicantScheduleTimestamp(applicantScheduleEndAt, {
      inclusiveEndMinute: true,
    });

    if (!Number.isFinite(currentTimestamp) || !Number.isFinite(applicantScheduleStartTimestamp) || !Number.isFinite(applicantScheduleEndTimestamp)) {
      return {
        applicantScheduleStartAt,
        applicantScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "invalid",
      };
    }

    if (currentTimestamp < applicantScheduleStartTimestamp) {
      return {
        applicantScheduleStartAt,
        applicantScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "before_start",
      };
    }

    if (currentTimestamp > applicantScheduleEndTimestamp) {
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

  function getApplicantAdmitCardLookupScheduleState(systemSettings = {}, referenceDate = new Date()) {
    const defaultApplicantScheduleRange = getDefaultApplicantScheduleRange(referenceDate);
    const admitCardLookupScheduleStartAt = normalizeApplicantScheduleDateTime(systemSettings.admitCardLookupScheduleStartAt, {
      defaultValue: defaultApplicantScheduleRange.startAt,
    });
    const admitCardLookupScheduleEndAt = normalizeApplicantScheduleDateTime(systemSettings.admitCardLookupScheduleEndAt, {
      defaultValue: defaultApplicantScheduleRange.endAt,
    });

    const currentTimestamp = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
    const admitCardLookupScheduleStartTimestamp = getApplicantScheduleTimestamp(admitCardLookupScheduleStartAt);
    const admitCardLookupScheduleEndTimestamp = getApplicantScheduleTimestamp(admitCardLookupScheduleEndAt, {
      inclusiveEndMinute: true,
    });

    if (
      !Number.isFinite(currentTimestamp) ||
      !Number.isFinite(admitCardLookupScheduleStartTimestamp) ||
      !Number.isFinite(admitCardLookupScheduleEndTimestamp)
    ) {
      return {
        admitCardLookupScheduleStartAt,
        admitCardLookupScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "invalid",
      };
    }

    if (currentTimestamp < admitCardLookupScheduleStartTimestamp) {
      return {
        admitCardLookupScheduleStartAt,
        admitCardLookupScheduleEndAt,
        isConfigured: true,
        isOpen: false,
        reason: "before_start",
      };
    }

    if (currentTimestamp > admitCardLookupScheduleEndTimestamp) {
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

  async function getApplicantSubmissionScheduleStateFromSettings(referenceDate = new Date()) {
    return getApplicantSubmissionScheduleState(await getApplicantPublicSystemSettings(), referenceDate);
  }

  async function assertApplicantSubmissionEntryIsOpen() {
    const scheduleState = await getApplicantSubmissionScheduleStateFromSettings();

    if (scheduleState.isOpen) {
      return scheduleState;
    }

    const scheduleRangeLabel =
      scheduleState.isConfigured && scheduleState.applicantScheduleStartAt && scheduleState.applicantScheduleEndAt
        ? `${formatApplicantScheduleDateTimeLabel(scheduleState.applicantScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(scheduleState.applicantScheduleEndAt)}`
        : "";

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

    throw createHttpError(409, "현재는 접수를 진행할 수 없습니다.", "APPLICANT_SUBMISSION_SCHEDULE_CLOSED");
  }

  async function assertApplicantAdmitCardLookupIsOpen() {
    const scheduleState = getApplicantAdmitCardLookupScheduleState(await getApplicantPublicSystemSettings());

    if (scheduleState.isOpen) {
      return scheduleState;
    }

    const scheduleRangeLabel =
      scheduleState.isConfigured && scheduleState.admitCardLookupScheduleStartAt && scheduleState.admitCardLookupScheduleEndAt
        ? `${formatApplicantScheduleDateTimeLabel(scheduleState.admitCardLookupScheduleStartAt)} ~ ${formatApplicantScheduleDateTimeLabel(scheduleState.admitCardLookupScheduleEndAt)}`
        : "";

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
        'applicantScheduleStartAt',
        'applicantScheduleEndAt',
        'admitCardLookupScheduleStartAt',
        'admitCardLookupScheduleEndAt',
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

  async function getApplicantRecruitmentUnits(options = {}) {
    const rows = await executeRows(
      options.queryable || query,
      `
        SELECT
          id,
          admission_code AS admissionCode,
          admission_name AS admissionName,
          track_code AS seriesCode,
          track_name AS seriesName,
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

  async function getApplicantRecruitmentUnitById(unitId, options = {}) {
    const normalizedUnitId = Number(unitId);

    if (!Number.isInteger(normalizedUnitId) || normalizedUnitId <= 0) {
      throw createHttpError(400, "접수 설정 ID가 올바르지 않습니다.", "APPLICANT_RECRUITMENT_UNIT_ID_INVALID");
    }

    const rows = await query(
      `
        SELECT
          id,
          admission_code AS admissionCode,
          admission_name AS admissionName,
          track_code AS seriesCode,
          track_name AS seriesName,
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
      throw createHttpError(404, "접수 설정을 찾을 수 없습니다.", "APPLICANT_RECRUITMENT_UNIT_NOT_FOUND");
    }

    return unit.id ? unit : null;
  }

  async function validateUniqueApplicantRecruitmentUnit(payload = {}, excludeId = 0) {
    const codeRows = await query(
      `
        SELECT id
        FROM app_unit
        WHERE admission_code = ?
          AND track_code = ?
          AND unit_code = ?
          AND major_code = ?
          AND id <> ?
        LIMIT 1
      `,
      [payload.admissionCode, payload.seriesCode, payload.unitCode, payload.majorCode, Number(excludeId || 0)],
    );

    if (codeRows.length > 0) {
      throw createHttpError(409, "같은 코드 조합의 접수 설정이 이미 있습니다.", "APPLICANT_RECRUITMENT_UNIT_CODE_EXISTS");
    }

    const nameRows = await query(
      `
        SELECT id
        FROM app_unit
        WHERE admission_name = ?
          AND track_name = ?
          AND unit_name = ?
          AND major_name = ?
          AND id <> ?
        LIMIT 1
      `,
      [payload.admissionName, payload.seriesName, payload.unitName, payload.majorName, Number(excludeId || 0)],
    );

    if (nameRows.length > 0) {
      throw createHttpError(409, "같은 전형/계열/모집단위/전공 조합이 이미 있습니다.", "APPLICANT_RECRUITMENT_UNIT_NAME_EXISTS");
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
          admission_code,
          admission_name,
          track_code,
          track_name,
          unit_code,
          unit_name,
          major_code,
          major_name,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
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
          admission_code = ?,
          admission_name = ?,
          track_code = ?,
          track_name = ?,
          unit_code = ?,
          unit_name = ?,
          major_code = ?,
          major_name = ?
        WHERE id = ?
      `,
      [
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
      throw createHttpError(400, "업로드할 접수 설정 데이터가 없습니다.", "APPLICANT_RECRUITMENT_IMPORT_EMPTY");
    }

    validateApplicantRecruitmentUnitImportRows(sourceRows, await getApplicantRecruitmentUnits());
    const normalizedRows = sourceRows.map((row) => normalizeApplicantRecruitmentUnitPayload(row));
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const [summaryRows] = await connection.query(`SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder FROM app_unit`);
      let nextSortOrder = Number(summaryRows?.[0]?.maxSortOrder || 0);

      for (const row of normalizedRows) {
        nextSortOrder += 1;
        await connection.query(
          `
            INSERT INTO app_unit (
              admission_code,
              admission_name,
              track_code,
              track_name,
              unit_code,
              unit_name,
              major_code,
              major_name,
              sort_order
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              admission_name = VALUES(admission_name),
              track_code = VALUES(track_code),
              track_name = VALUES(track_name),
              unit_code = VALUES(unit_code),
              unit_name = VALUES(unit_name),
              major_code = VALUES(major_code),
              major_name = VALUES(major_name)
          `,
          [
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
      processed: normalizedRows.length,
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
        ...(options.includeBase64 === true
          ? {
              internalPhotoValue: {
                ...photoValue,
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
      answerItems: normalizeStoredAnswerItems(answerItems),
      answerMap: buildApplicantAnswerMap(answerItems),
      ...(options.includeInternal === true
        ? {
            passwordHash: String(firstRow.passwordHash || "").trim(),
            internalPhotoValue: photoAnswerItem?.internalPhotoValue || null,
          }
        : {}),
    };
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

  async function getApplicantSubmissionById(submissionId, options = {}) {
    const rows = await getApplicantSubmissionRowsById(options.queryable || query, submissionId, {
      forUpdate: options.forUpdate === true,
    });
    const submission = buildApplicantSubmissionFromRows(rows, {
      includeInternal: options.includeInternal === true,
      includeBase64: options.includeInternal === true,
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
    const internalPhotoValue = submission?.internalPhotoValue && typeof submission.internalPhotoValue === "object"
      ? submission.internalPhotoValue
      : null;
    const normalizedPhotoFileName = path.basename(String(submission?.photoFileName || internalPhotoValue?.fileName || "").trim());
    const normalizedMimeType = String(internalPhotoValue?.mimeType || "").trim() || "application/octet-stream";
    const normalizedBase64 = String(internalPhotoValue?.base64 || "").trim();

    if (normalizedBase64) {
      const photoBuffer = Buffer.from(normalizedBase64, "base64");

      if (Buffer.isBuffer(photoBuffer) && photoBuffer.length > 0) {
        return {
          photoBlob: photoBuffer,
          photoMime: normalizedMimeType,
          photoName: normalizedPhotoFileName || `applicant-submission-${submission.id}.jpg`,
        };
      }
    }

    const candidateFileNames = [
      normalizedPhotoFileName,
      submission?.promotedExamineeNo ? `${submission.promotedExamineeNo}.jpg` : "",
      submission?.promotedExamineeNo ? `${submission.promotedExamineeNo}.jpeg` : "",
      submission?.promotedExamineeNo ? `${submission.promotedExamineeNo}.png` : "",
    ].filter(Boolean);

    for (const candidateFileName of candidateFileNames) {
      const normalizedCandidateFileName = path.basename(String(candidateFileName || "").trim());
      const candidateFilePath = path.join(photoStorageDirectoryPath, normalizedCandidateFileName);

      try {
        const photoBlob = await fs.promises.readFile(candidateFilePath);

        if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
          return {
            photoBlob,
            photoMime:
              path.extname(normalizedCandidateFileName).toLowerCase() === ".png"
                ? "image/png"
                : "image/jpeg",
            photoName: normalizedCandidateFileName,
          };
        }
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }

    throw createHttpError(404, "접수 사진을 찾을 수 없습니다.", "APPLICANT_SUBMISSION_PHOTO_NOT_FOUND");
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
    const submissionsById = new Map();

    rows.forEach((row) => {
      const submissionId = Number(row?.id || 0);

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        return;
      }

      if (!submissionsById.has(submissionId)) {
        submissionsById.set(submissionId, []);
      }

      submissionsById.get(submissionId).push(row);
    });

    return Array.from(submissionsById.values()).map((submissionRows) => buildApplicantSubmissionFromRows(submissionRows)).filter(Boolean);
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

  function buildStoredApplicantPhotoRecord(examineeNo, photoValue = {}) {
    const normalizedExamineeNo = String(examineeNo || "").trim();

    if (!normalizedExamineeNo || photoValue?.hasPhoto !== true || !String(photoValue?.base64 || "").trim()) {
      return null;
    }

    const extension = resolveApplicantStoredPhotoExtension(photoValue);
    const targetFileName = `${normalizedExamineeNo}${extension}`;
    const targetFilePath = path.join(photoStorageDirectoryPath, targetFileName);
    const photoBuffer = Buffer.from(String(photoValue.base64 || "").trim(), "base64");

    if (!Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.", "APPLICANT_PHOTO_BUFFER_EMPTY");
    }

    return {
      fileName: targetFileName,
      filePath: targetFilePath,
      mimeType: String(photoValue.mimeType || "").trim() || (extension === ".png" ? "image/png" : "image/jpeg"),
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
        return {
          hasPhoto: true,
          fileName: nextPhotoPayload.fileName,
          mimeType: nextPhotoPayload.mimeType,
          base64: nextPhotoPayload.base64,
        };
      }

      if (existingSubmission?.internalPhotoValue?.hasPhoto) {
        return {
          hasPhoto: true,
          fileName: existingSubmission.internalPhotoValue.fileName,
          mimeType: existingSubmission.internalPhotoValue.mimeType,
          base64: existingSubmission.internalPhotoValue.base64,
        };
      }

      if (field.required) {
        throw createHttpError(400, `${field.questionText} 파일을 업로드하세요.`, "APPLICANT_PHOTO_REQUIRED");
      }

      return {
        hasPhoto: false,
        fileName: "",
        mimeType: "",
        base64: "",
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
        answerItems.push({
          fieldKey: field.fieldKey,
          questionText: field.questionText,
          inputType: field.inputType,
          systemFieldKey: field.systemFieldKey,
          value: {
            fileName: String(normalizedValue?.fileName || "").trim(),
            mimeType: String(normalizedValue?.mimeType || "").trim(),
            hasPhoto: normalizedValue?.hasPhoto === true,
          },
        });
        answerRows.push({
          fieldKey: field.fieldKey,
          answerData: JSON.stringify({
            fileName: String(normalizedValue?.fileName || "").trim(),
            mimeType: String(normalizedValue?.mimeType || "").trim(),
            hasPhoto: normalizedValue?.hasPhoto === true,
            base64: String(normalizedValue?.base64 || "").trim(),
          }),
        });
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
    };

    normalizeStoredAnswerItems(submission.answerItems).forEach((answerItem) => {
      if (answerItem.inputType === "nationality" && !systemValues.nationality) {
        systemValues.nationality = String(answerItem.value || "").trim();
      }

      if (!answerItem.systemFieldKey || answerItem.systemFieldKey === "photo") {
        return;
      }

      systemValues[answerItem.systemFieldKey] = String(answerItem.value || "").trim();
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
    const normalizedAdmissionName = String(promotableRecord.admission || "").trim();
    const normalizedSeriesName = String(promotableRecord.series || "").trim();
    const normalizedUnitName = String(promotableRecord.unit || "").trim();
    const normalizedMajorName = String(promotableRecord.major || "").trim();
    const candidateUnits = (Array.isArray(recruitmentUnits) ? recruitmentUnits : []).filter(
      (unit) =>
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

  async function generateApplicantExamineeNo(connection, settings = {}, promotableRecord = {}) {
    const recruitmentUnits = await getApplicantRecruitmentUnits({
      queryable: connection.query.bind(connection),
    });
    const matchedRecruitmentUnit = resolveApplicantRecruitmentUnit(recruitmentUnits, promotableRecord);
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
        "접수 설정에서 접수 데이터와 일치하는 전형/계열/모집단위/전공을 먼저 등록하세요.",
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

  async function prepareApplicantSubmissionExamNo(connection, submission = {}, settings = {}) {
    const promotableRecord = buildPromotableApplicantRecord(submission);
    const examineeNo = submission.promotedExamineeNo || (await generateApplicantExamineeNo(connection, settings, promotableRecord));
    const storedPhotoRecord = buildStoredApplicantPhotoRecord(examineeNo, submission?.internalPhotoValue || null);

    return {
      promotableRecord,
      examineeNo,
      storedPhotoRecord,
    };
  }

  async function upsertApplicantSubmissionIntoExaminee(connection, submission = {}, settings = {}, preparedRecord = null) {
    const resolvedPreparedRecord =
      preparedRecord && typeof preparedRecord === "object"
        ? preparedRecord
        : await prepareApplicantSubmissionExamNo(connection, submission, settings);
    const promotableRecord = resolvedPreparedRecord.promotableRecord || buildPromotableApplicantRecord(submission);
    const missingFields = getApplicantPromotionMissingFields(promotableRecord);

    if (missingFields.length > 0) {
      throw createHttpError(
        400,
        `수험생 등록에 필요한 항목이 비어 있습니다: ${missingFields.join(", ")}`,
        "APPLICANT_PROMOTION_REQUIRED_FIELDS_MISSING",
      );
    }

    const examineeNo = String(resolvedPreparedRecord.examineeNo || "").trim() || submission.promotedExamineeNo || (await generateApplicantExamineeNo(connection, settings, promotableRecord));
    const [existingRows] = await connection.query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ? LIMIT 1`, [examineeNo]);
    const storedPhotoRecord = resolvedPreparedRecord.storedPhotoRecord ?? buildStoredApplicantPhotoRecord(examineeNo, submission?.internalPhotoValue || null);
    const photoColumnsSql = storedPhotoRecord
      ? `
            photo_name = ?,
            photo_mime = ?,
            photo_blob = ?,
      `
      : "";
    const photoParams = storedPhotoRecord
      ? [storedPhotoRecord.fileName || null, storedPhotoRecord.mimeType || null, storedPhotoRecord.photoBuffer]
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
            series = ?,
            unit = ?,
            major = ?,
            building = ?,
            room = ?,
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
          promotableRecord.series,
          promotableRecord.unit,
          promotableRecord.major || "",
          promotableRecord.building,
          promotableRecord.room,
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
          series,
          unit,
          major,
          building,
          room,
          \`group\`,
          examinee_no,
          name,
          birth_date,
          photo_name,
          photo_mime,
          photo_blob
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        promotableRecord.date,
        promotableRecord.time,
        promotableRecord.track,
        promotableRecord.admission,
        promotableRecord.series,
        promotableRecord.unit,
        promotableRecord.major || "",
        promotableRecord.building,
        promotableRecord.room,
        promotableRecord.group || "",
        examineeNo,
        promotableRecord.name,
        promotableRecord.birth,
        storedPhotoRecord?.fileName || null,
        storedPhotoRecord?.mimeType || null,
        storedPhotoRecord?.photoBuffer || null,
      ],
    );

    return {
      examineeNo,
      storedPhotoRecord,
    };
  }

  async function sendApplicantVerificationCode(payload = {}) {
    await assertApplicantSubmissionEntryIsOpen();

    const applicantName = normalizeApplicantText(payload.name, "이름", { maxLength: 100 });
    const email = normalizeApplicantEmail(payload.email);
    const codeValue = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + emailVerificationTtlMs);

    await query(
      `
        INSERT INTO app_email_log (
          applicant_name,
          email,
          code_value,
          expires_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [applicantName, email, codeValue, expiresAt],
    );

    const sendResult = await sendVerificationEmail({
      applicantName,
      codeValue,
      email,
      expiresAt,
    });

    return {
      ok: true,
      expiresInSeconds: Math.round(emailVerificationTtlMs / 1000),
      deliveryMode: String(sendResult?.deliveryMode || "console"),
      debugCode: String(sendResult?.debugCode || ""),
    };
  }

  async function verifyApplicantVerificationCode(payload = {}) {
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
          verified_at AS verifiedAt
        FROM app_email_log
        WHERE applicant_name = ?
          AND email = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [applicantName, email],
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

    if (lookupTarget === APPLICANT_PUBLIC_LOOKUP_TARGETS.ticket) {
      await assertApplicantAdmitCardLookupIsOpen();
    }

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
      const preparedSubmissionRecord = await prepareApplicantSubmissionExamNo(connection, savedSubmission, applicantSettings);
      const shouldSyncExaminee = String(savedSubmission.status || "").trim() === "promoted";

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
      await persistApplicantPhotoFile(preparedSubmissionRecord.storedPhotoRecord);
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

      await connection.query(
        `
          UPDATE app_subm
          SET
            answer_data = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND field_key = ?
        `,
        [
          JSON.stringify({
            fileName: normalizedPhotoPayload.fileName,
            mimeType: normalizedPhotoPayload.mimeType,
            hasPhoto: true,
            base64: normalizedPhotoPayload.base64,
          }),
          normalizedSubmissionId,
          photoAnswerItem.fieldKey,
        ],
      );

      const savedSubmission = await getApplicantSubmissionById(normalizedSubmissionId, {
        queryable,
        includeInternal: true,
      });
      const applicantSettings = await getApplicantSettings();
      const preparedSubmissionRecord = await prepareApplicantSubmissionExamNo(connection, savedSubmission, applicantSettings);

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

      if (String(savedSubmission.status || "").trim() === "promoted") {
        await upsertApplicantSubmissionIntoExaminee(connection, savedSubmission, applicantSettings, preparedSubmissionRecord);
      }

      await connection.commit();
      await persistApplicantPhotoFile(preparedSubmissionRecord.storedPhotoRecord);
      return getApplicantSubmissionById(normalizedSubmissionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function promoteApplicantSubmission(submissionId) {
    const normalizedSubmissionId = Number(submissionId);

    if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
      throw createHttpError(400, "접수 이력 ID가 올바르지 않습니다.", "APPLICANT_SUBMISSION_ID_INVALID");
    }

    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      const queryable = connection.query.bind(connection);

      await connection.query(`INSERT INTO app_meta (id) VALUES (?) ON DUPLICATE KEY UPDATE id = VALUES(id)`, [normalizedSubmissionId]);

      const submission = await getApplicantSubmissionById(normalizedSubmissionId, {
        queryable,
        includeInternal: true,
        forUpdate: true,
      });

      const applicantSettings = await getApplicantSettings();
      const { examineeNo, storedPhotoRecord } = await upsertApplicantSubmissionIntoExaminee(connection, submission, applicantSettings);

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
        [normalizedSubmissionId, examineeNo],
      );

      await connection.commit();
      await persistApplicantPhotoFile(storedPhotoRecord);
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
    await assertApplicantAdmitCardLookupIsOpen();
    const systemSettings = await getApplicantPublicSystemSettings();
    const admitCardDataSource = normalizeApplicantAdmitCardDataSource(systemSettings.admitCardDataSource);
    const submission = await getApplicantSubmissionForAccessToken(accessToken, submissionId, {
      requireTicketLookupTarget: true,
      requirePromoted: admitCardDataSource === APPLICANT_ADMIT_CARD_DATA_SOURCES.examinee,
    });

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
    const [fields, settings, systemSettings, noticeHtml, recruitmentUnits] = await Promise.all([
      getApplicantFormFields({ activeOnly: true }),
      getApplicantSettings(),
      getApplicantPublicSystemSettings(),
      getApplicantPublicNoticeHtml(),
      getApplicantRecruitmentUnits(),
    ]);

    return {
      fields,
      settings,
      systemSettings,
      noticeHtml,
      recruitmentUnits,
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
    buildApplicantAdmitCardPdfForAccessToken,
    buildApplicantSubmissionPhotoArchiveBuffer,
    buildApplicantSubmissionExportBuffer,
    buildApplicantRecruitmentUnitExportBuffer,
    buildApplicantRecruitmentUnitTemplateBuffer,
    createApplicantRecruitmentUnit,
    createApplicantFormField,
    deleteApplicantRecruitmentUnit,
    deleteApplicantFormField,
    getApplicantFormFields,
    getApplicantPublicForm,
    getApplicantRecruitmentUnits,
    getApplicantSettings,
    getApplicantSubmissionById,
    getApplicantSubmissionPhoto,
    getApplicantSubmissionForAccessToken,
    getApplicantSubmissions,
    importApplicantRecruitmentUnits,
    lookupApplicantSubmission,
    moveApplicantFormField,
    promoteApplicantSubmission,
    saveApplicantSubmission,
    seedApplicantFormFields,
    sendApplicantVerificationCode,
    updateApplicantSubmissionPhoto,
    updateApplicantRecruitmentUnit,
    updateApplicantFormField,
    updateApplicantSettings,
    verifyApplicantVerificationCode,
  });
}

module.exports = {
  createApplicantService,
};
