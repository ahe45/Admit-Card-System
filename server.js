require("dotenv").config({ quiet: true });

const http = require("http");
const AdmZip = require("adm-zip");
const bwipjs = require("bwip-js");
const ExcelJS = require("exceljs");
const fs = require("fs");
const os = require("os");
const path = require("path");
const QRCode = require("qrcode");
const { execFile } = require("child_process");
const { randomBytes, randomUUID, scryptSync, timingSafeEqual } = require("crypto");
const { pathToFileURL } = require("url");
const { promisify } = require("util");
const { getPool, query } = require("./db");
const {
  accountRoleOptions,
  getDefaultAccessibleView,
  getViewFromPathname,
  getViewRoutePath,
  isLoginRoutePath,
  isViewAccessibleForRole,
  loginRoutePath: LOGIN_ROUTE_PATH,
  normalizeRoutePath,
  templateTagDefinitions,
} = require("./shared/app-config");
const DEFAULT_TEMPLATE_SEEDS = require("./db/default-templates.json");

const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const DEFAULT_INITIAL_PASSWORD = "1111";
const DEFAULT_AUTO_LOGOUT_MINUTES = 0;
const MAX_AUTO_LOGOUT_MINUTES = 1440;
const TEMPLATE_TAG_SCHEMA_VERSION = "3";
const PASSWORD_HASH_PREFIX = "scrypt";
const SESSION_COOKIE_NAME = "admitcard.sid";
const AUTHENTICATED_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const PASSWORD_SETUP_SESSION_TTL_MS = 1000 * 60 * 15;
const BATCH_ADMIT_CARD_JOB_TTL_MS = 1000 * 60 * 30;
const sessionStore = new Map();
const batchAdmitCardJobStore = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const TEMPLATE_GENERATED_OBJECT_ALT_SUFFIX = Object.freeze({
  barcode: "Code128 바코드",
  qrcode: "QR코드",
});

function getDefaultLoginNoticeHtml(initialPassword = DEFAULT_INITIAL_PASSWORD) {
  return [
    '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">계정 안내</span></p>',
    "<p><strong>ID : 계정 관리에 등록된 계정 ID</strong></p>",
    `<p><strong>PW : ${initialPassword}(초기 비밀번호)</strong></p>`,
    "<p>최초 로그인 시 비밀번호를 변경해야 서비스를 사용할 수 있습니다.</p>",
  ].join("");
}

const examineeTemplateColumns = [
  { header: "시험날짜", key: "date", width: 16, sample: "2026-03-28" },
  { header: "시간", key: "time", width: 12, sample: "08:40" },
  { header: "모집시기", key: "track", width: 16, sample: "수시" },
  { header: "전형", key: "admission", width: 18, sample: "음악특기자" },
  { header: "모집단위", key: "unit", width: 18, sample: "실용음악과" },
  { header: "전공", key: "major", width: 16, sample: "피아노" },
  { header: "고사건물", key: "building", width: 16, sample: "A동" },
  { header: "고사실", key: "room", width: 16, sample: "101" },
  { header: "조", key: "group", width: 14, sample: "A조" },
  { header: "수험번호", key: "examineeNo", width: 18, sample: "173600001" },
  { header: "이름", key: "name", width: 16, sample: "홍길동" },
  { header: "생년월일", key: "birth", width: 16, sample: "2006-01-02" },
];
const optionalExamineeTemplateColumnKeys = new Set(["major", "group"]);
const legacyExamineeTemplateHeaders = Object.freeze({
  date: "시험일자",
  time: "교시",
  track: "전형",
  admission: "시험",
});
const execFileAsync = promisify(execFile);
const EDGE_EXECUTABLE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const DEFAULT_SEED_ACCOUNTS = Object.freeze([
  Object.freeze({
    legacyId: "admin001",
    id: "admin",
    name: "김관리",
    role: "관리자",
  }),
  Object.freeze({
    legacyId: "ops001",
    id: "ops",
    name: "박운영",
    role: "운영자",
  }),
  Object.freeze({
    legacyId: "viewer001",
    id: "view",
    name: "최조회",
    role: "조회용",
  }),
]);

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...getCorsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function sendBinary(response, statusCode, headers, payload) {
  const contentLength =
    typeof payload === "string"
      ? Buffer.byteLength(payload)
      : Buffer.isBuffer(payload) || payload instanceof Uint8Array
        ? payload.byteLength
        : null;

  response.writeHead(statusCode, {
    ...getCorsHeaders(),
    ...(Number.isFinite(contentLength) ? { "Content-Length": String(contentLength) } : {}),
    ...headers,
  });
  response.end(payload);
}

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPasswordHash(value) {
  return new RegExp(`^${PASSWORD_HASH_PREFIX}\\$[a-f0-9]+\\$[a-f0-9]+$`, "i").test(String(value || ""));
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`;
}

function verifyPassword(password, passwordValue) {
  const normalizedPassword = String(password ?? "");
  const normalizedPasswordValue = String(passwordValue ?? "");

  if (!normalizedPasswordValue) {
    return false;
  }

  if (!isPasswordHash(normalizedPasswordValue)) {
    return normalizedPassword === normalizedPasswordValue;
  }

  const [, salt, expectedHash] = normalizedPasswordValue.split("$");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const derivedBuffer = scryptSync(normalizedPassword, salt, expectedBuffer.length);

  return expectedBuffer.length === derivedBuffer.length && timingSafeEqual(expectedBuffer, derivedBuffer);
}

function normalizePasswordSetupValue(value) {
  return String(value ?? "");
}

function parseCookies(request) {
  return String(request.headers.cookie || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function destroySession(sessionId) {
  if (!sessionId) {
    return;
  }

  sessionStore.delete(sessionId);
}

function destroySessionsByAccountId(accountId) {
  sessionStore.forEach((session, sessionId) => {
    if (session.accountId === accountId) {
      sessionStore.delete(sessionId);
    }
  });
}

function createSession(accountId, stage = "authenticated") {
  const expiresAt = Date.now() + (stage === "password_setup" ? PASSWORD_SETUP_SESSION_TTL_MS : AUTHENTICATED_SESSION_TTL_MS);
  const sessionId = randomUUID();

  sessionStore.set(sessionId, {
    accountId,
    stage,
    expiresAt,
  });

  return sessionId;
}

function buildSessionCookieValue(sessionId, maxAgeMs) {
  const maxAgeSeconds = Math.max(0, Math.floor(maxAgeMs / 1000));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function attachSessionCookie(response, sessionId, stage = "authenticated") {
  const maxAgeMs = stage === "password_setup" ? PASSWORD_SETUP_SESSION_TTL_MS : AUTHENTICATED_SESSION_TTL_MS;
  response.setHeader("Set-Cookie", buildSessionCookieValue(sessionId, maxAgeMs));
}

function getSessionContext(request) {
  const sessionId = parseCookies(request)[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return null;
  }

  const session = sessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    destroySession(sessionId);
    return null;
  }

  return {
    sessionId,
    session,
  };
}

function touchBatchAdmitCardJob(job) {
  if (!job) {
    return null;
  }

  job.updatedAt = Date.now();
  job.expiresAt = job.updatedAt + BATCH_ADMIT_CARD_JOB_TTL_MS;
  return job;
}

function cleanupBatchAdmitCardJobs() {
  const now = Date.now();

  batchAdmitCardJobStore.forEach((job, jobId) => {
    if (Number(job?.expiresAt || 0) > now) {
      return;
    }

    batchAdmitCardJobStore.delete(jobId);
  });
}

function buildBatchAdmitCardJobPayload(job) {
  return {
    jobId: String(job?.jobId || ""),
    status: String(job?.status || "running"),
    phase: String(job?.phase || "preparing"),
    totalCount: Math.max(0, Number(job?.totalCount || 0)),
    completedCount: Math.max(0, Number(job?.completedCount || 0)),
    fileName: String(job?.fileName || ""),
    error: String(job?.error || ""),
    errorCode: String(job?.errorCode || ""),
  };
}

function getBatchAdmitCardJobOrThrow(jobId, accountId) {
  cleanupBatchAdmitCardJobs();

  const normalizedJobId = String(jobId || "").trim();

  if (!normalizedJobId) {
    throw createHttpError(400, "배치 출력 작업 ID가 필요합니다.", "INVALID_BATCH_JOB_ID");
  }

  const job = batchAdmitCardJobStore.get(normalizedJobId);

  if (!job || job.accountId !== accountId) {
    throw createHttpError(404, "배치 출력 작업을 찾을 수 없습니다.", "BATCH_JOB_NOT_FOUND");
  }

  return touchBatchAdmitCardJob(job);
}

function normalizeText(value, fieldName, rowNumber) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw createHttpError(400, `${rowNumber}번째 행의 ${fieldName} 값이 비어 있습니다.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value) {
  return String(value ?? "").trim();
}

function normalizeDate(value, fieldName, rowNumber) {
  const normalizedValue = normalizeText(value, fieldName, rowNumber);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw createHttpError(400, `${rowNumber}번째 행의 ${fieldName} 형식은 YYYY-MM-DD 여야 합니다.`);
  }

  return normalizedValue;
}

function normalizeTime(value, fieldName, rowNumber) {
  const normalizedValue = normalizeText(value, fieldName, rowNumber);

  if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
    throw createHttpError(400, `${rowNumber}번째 행의 ${fieldName} 형식은 hh:mm 이어야 합니다.`);
  }

  const [hourText, minuteText] = normalizedValue.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw createHttpError(400, `${rowNumber}번째 행의 ${fieldName} 값은 00:00부터 23:59 사이여야 합니다.`);
  }

  return normalizedValue;
}

function normalizeExamineeRecord(record = {}) {
  const group = String(record.group ?? record.groupLabel ?? "").trim();
  const time = String(record.time ?? record.session ?? "").trim();
  const track = String(record.track ?? "").trim();
  const admission = String(record.admission ?? record.exam ?? "").trim();
  const unit = String(record.unit ?? record.unitName ?? "").trim();
  const major = String(record.major ?? "").trim();
  const building = String(record.building ?? "").trim();
  const room = String(record.room ?? "").trim();
  const examineeNo = String(record.examineeNo ?? "").trim();

  return {
    ...record,
    group,
    time,
    session: time,
    track,
    admission,
    exam: admission,
    unit,
    major,
    building,
    room,
    examineeNo,
  };
}

function normalizeExamineeInput(examineeInput, index) {
  const rowNumber = index + 2;

  return normalizeExamineeRecord({
    date: normalizeDate(examineeInput.date, "시험날짜", rowNumber),
    group: normalizeOptionalText(examineeInput.group),
    time: normalizeTime(examineeInput.time ?? examineeInput.session, "시간", rowNumber),
    track: normalizeText(examineeInput.track, "모집시기", rowNumber),
    admission: normalizeText(examineeInput.admission ?? examineeInput.exam, "전형", rowNumber),
    unit: normalizeText(examineeInput.unit, "모집단위", rowNumber),
    major: normalizeOptionalText(examineeInput.major),
    building: normalizeText(examineeInput.building, "고사건물", rowNumber),
    room: normalizeText(examineeInput.room, "고사실", rowNumber),
    examineeNo: normalizeText(examineeInput.examineeNo, "수험번호", rowNumber),
    name: normalizeText(examineeInput.name, "이름", rowNumber),
    birth: normalizeDate(examineeInput.birth, "생년월일", rowNumber),
  });
}

function formatDateAsYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function extractExcelCellValue(value) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return formatDateAsYmd(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value.map(extractExcelCellValue).join("").trim();
  }

  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((entry) => entry.text || "").join("").trim();
    }

    if (typeof value.text === "string") {
      return value.text.trim();
    }

    if ("result" in value) {
      return extractExcelCellValue(value.result);
    }

    if (typeof value.hyperlink === "string") {
      return value.hyperlink.trim();
    }
  }

  return String(value).trim();
}

function getExcelCellText(cell) {
  if (typeof cell.text === "string" && cell.text.trim()) {
    return cell.text.trim();
  }

  return extractExcelCellValue(cell.value);
}

function getExamineePhotoMimeType(extension) {
  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  return "";
}

function parseExamineePhotoFile(fileName, fileBuffer, { expectedExamineeNo = "" } = {}) {
  const normalizedFileName = path.basename(String(fileName || "").trim());

  if (!normalizedFileName) {
    throw createHttpError(400, "사진 파일명이 없습니다.");
  }

  const extension = path.extname(normalizedFileName).toLowerCase();

  if (![".jpg", ".jpeg", ".png"].includes(extension)) {
    throw createHttpError(400, "사진 파일은 JPG, JPEG, PNG 형식만 업로드할 수 있습니다.");
  }

  const derivedExamineeNo = path.basename(normalizedFileName, extension).trim();
  const normalizedExpectedExamineeNo = String(expectedExamineeNo || "").trim();
  const normalizedExamineeNo = normalizedExpectedExamineeNo || derivedExamineeNo;

  if (!normalizedExamineeNo) {
    throw createHttpError(400, "사진 파일명에서 수험번호를 확인할 수 없습니다.");
  }

  if (normalizedExpectedExamineeNo && derivedExamineeNo !== normalizedExpectedExamineeNo) {
    throw createHttpError(
      400,
      `사진 파일명은 ${normalizedExpectedExamineeNo}.jpg, ${normalizedExpectedExamineeNo}.jpeg, ${normalizedExpectedExamineeNo}.png 형식이어야 합니다.`,
      "INVALID_PHOTO_FILENAME",
    );
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw createHttpError(400, "사진 파일 데이터가 비어 있습니다.");
  }

  return {
    examineeNo: normalizedExamineeNo,
    fileName: normalizedFileName,
    mimeType: getExamineePhotoMimeType(extension),
    fileBuffer,
  };
}

function getPdfExecutablePath() {
  const executablePath = EDGE_EXECUTABLE_PATHS.find((possiblePath) => fs.existsSync(possiblePath));

  if (!executablePath) {
    throw createHttpError(500, "PDF 생성을 위한 Microsoft Edge 실행 파일을 찾을 수 없습니다.");
  }

  return executablePath;
}

async function buildExamineeTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("수험생업로드", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = examineeTemplateColumns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
    style: { numFmt: "@" },
  }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF4F7FB" },
  };

  worksheet.addRow(
    examineeTemplateColumns.reduce((row, column) => {
      row[column.key] = column.sample;
      return row;
    }, {}),
  );

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= examineeTemplateColumns.length; columnIndex += 1) {
      const cell = worksheet.getRow(rowIndex).getCell(columnIndex);
      cell.numFmt = "@";
    }
  }

  return workbook.xlsx.writeBuffer();
}

const printHistoryExportColumns = Object.freeze([
  Object.freeze({ header: "시험날짜", key: "date", width: 14, text: true }),
  Object.freeze({ header: "시간", key: "time", width: 10, text: true }),
  Object.freeze({ header: "모집시기", key: "track", width: 14, text: true }),
  Object.freeze({ header: "전형", key: "admission", width: 18, text: true }),
  Object.freeze({ header: "모집단위", key: "unit", width: 18, text: true }),
  Object.freeze({ header: "전공", key: "major", width: 16, text: true }),
  Object.freeze({ header: "고사건물", key: "building", width: 16, text: true }),
  Object.freeze({ header: "고사실", key: "room", width: 16, text: true }),
  Object.freeze({ header: "조", key: "group", width: 10, text: true }),
  Object.freeze({ header: "수험번호", key: "examineeNo", width: 16, text: true }),
  Object.freeze({ header: "이름", key: "name", width: 14, text: true }),
  Object.freeze({ header: "생년월일", key: "birth", width: 14, text: true }),
  Object.freeze({ header: "출력시각", key: "printedAt", width: 22, text: true }),
]);

const examineeExportColumns = Object.freeze([
  ...printHistoryExportColumns
    .slice(0, -1)
    .map((column) => (column.key === "date" ? { ...column, header: "시험날짜" } : column)),
]);

const printHistorySummaryExportColumns = Object.freeze([
  ...printHistoryExportColumns.slice(0, -1),
  Object.freeze({ header: "출력횟수", key: "printCount", width: 12, text: false }),
]);

function normalizeExamineeExportRow(record = {}) {
  const normalizedRecord = normalizeExamineeRecord(record);

  return {
    date: String(record.date ?? "").trim(),
    time: normalizedRecord.time,
    track: normalizedRecord.track,
    admission: normalizedRecord.admission,
    unit: normalizedRecord.unit,
    major: normalizedRecord.major,
    building: normalizedRecord.building,
    room: normalizedRecord.room,
    group: normalizedRecord.group,
    examineeNo: normalizedRecord.examineeNo,
    name: String(record.name ?? "").trim(),
    birth: String(record.birth ?? "").trim(),
  };
}

function normalizePrintHistoryExportRow(record = {}) {
  const normalizedRecord = normalizeExamineeRecord(record);

  return {
    date: String(record.date ?? "").trim(),
    time: normalizedRecord.time,
    track: normalizedRecord.track,
    admission: normalizedRecord.admission,
    unit: normalizedRecord.unit,
    major: normalizedRecord.major,
    building: normalizedRecord.building,
    room: normalizedRecord.room,
    group: normalizedRecord.group,
    examineeNo: normalizedRecord.examineeNo,
    name: String(record.name ?? "").trim(),
    birth: String(record.birth ?? "").trim(),
    printedAt: String(record.printedAt ?? "").trim(),
  };
}

function applyWorkbookHeaderStyle(worksheet) {
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF4F7FB" },
  };
}

function buildWorkbookSheet(workbook, sheetName, columns, rows) {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
    style: column.text ? { numFmt: "@" } : undefined,
  }));

  applyWorkbookHeaderStyle(worksheet);
  rows.forEach((row) => worksheet.addRow(row));

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    columns.forEach((column, columnIndex) => {
      if (!column.text) {
        return;
      }

      worksheet.getRow(rowIndex).getCell(columnIndex + 1).numFmt = "@";
    });
  }

  return worksheet;
}

function buildPrintHistorySummaryRows(rows, summaryExaminees = []) {
  const summaryMap = new Map();

  summaryExaminees.forEach((row) => {
    const examineeNo = String(row.examineeNo || "").trim();
    const summaryKey = examineeNo || `__empty_summary__${summaryMap.size}`;

    if (!summaryMap.has(summaryKey)) {
      summaryMap.set(summaryKey, {
        ...row,
        printCount: 0,
      });
    }
  });

  rows.forEach((row) => {
    const examineeNo = String(row.examineeNo || "").trim();
    const summaryKey = examineeNo || `__empty_history__${summaryMap.size}`;

    if (!summaryMap.has(summaryKey)) {
      summaryMap.set(summaryKey, {
        ...row,
        printCount: 0,
      });
    }

    summaryMap.get(summaryKey).printCount += 1;
  });

  return Array.from(summaryMap.values());
}

async function buildPrintHistoryExportBuffer(rows, summaryExaminees = []) {
  if ((!Array.isArray(rows) || rows.length === 0) && (!Array.isArray(summaryExaminees) || summaryExaminees.length === 0)) {
    throw createHttpError(400, "다운로드할 출력 이력 데이터가 없습니다.");
  }

  const normalizedRows = Array.isArray(rows) ? rows.map((row) => normalizePrintHistoryExportRow(row)) : [];
  const normalizedSummaryExaminees = Array.isArray(summaryExaminees)
    ? summaryExaminees.map((row) => normalizePrintHistoryExportRow(row))
    : [];
  const workbook = new ExcelJS.Workbook();

  buildWorkbookSheet(workbook, "출력이력", printHistoryExportColumns, normalizedRows);
  buildWorkbookSheet(
    workbook,
    "수험번호별 출력횟수",
    printHistorySummaryExportColumns,
    buildPrintHistorySummaryRows(normalizedRows, normalizedSummaryExaminees),
  );

  return workbook.xlsx.writeBuffer();
}

async function buildExamineeExportBuffer(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw createHttpError(400, "다운로드할 수험생 데이터가 없습니다.");
  }

  const normalizedRows = rows.map((row) => normalizeExamineeExportRow(row));
  const workbook = new ExcelJS.Workbook();

  buildWorkbookSheet(workbook, "수험생등록", examineeExportColumns, normalizedRows);

  return workbook.xlsx.writeBuffer();
}

async function parseExamineeWorkbook(fileContentBase64) {
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
  const headerTexts = Array.from(
    { length: Math.max(worksheet.columnCount, examineeTemplateColumns.length) },
    (_, offset) => getExcelCellText(headerRow.getCell(offset + 1)),
  );
  const columnIndexes = examineeTemplateColumns.reduce((indexes, column) => {
    const expectedHeaders = [column.header, legacyExamineeTemplateHeaders[column.key]]
      .filter(Boolean)
      .filter((header, index, headers) => headers.indexOf(header) === index);

    const matchedColumnIndex = headerRow.actualCellCount === 0
      ? -1
      : Array.from({ length: Math.max(worksheet.columnCount, examineeTemplateColumns.length) }, (_, offset) => offset + 1)
          .find((columnIndex) => expectedHeaders.includes(getExcelCellText(headerRow.getCell(columnIndex)))) ?? -1;

    if (matchedColumnIndex === -1) {
      if (optionalExamineeTemplateColumnKeys.has(column.key)) {
        indexes[column.key] = -1;
        return indexes;
      }

      throw createHttpError(400, `XLSX 헤더에 '${column.header}' 컬럼이 없습니다.`);
    }

    indexes[column.key] = matchedColumnIndex;
    return indexes;
  }, {});

  const examinees = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const examinee = {};
    let hasAnyValue = false;

    examineeTemplateColumns.forEach((column) => {
      const columnIndex = columnIndexes[column.key];
      const value = columnIndex > 0 ? getExcelCellText(row.getCell(columnIndex)) : "";
      examinee[column.key] = value;
      hasAnyValue = hasAnyValue || value !== "";
    });

    if (hasAnyValue) {
      examinees.push(examinee);
    }
  }

  if (examinees.length === 0) {
    throw createHttpError(400, "XLSX에는 헤더와 최소 1개 이상의 데이터 행이 필요합니다.");
  }

  return examinees;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw createHttpError(400, "JSON 본문을 해석할 수 없습니다.");
  }
}

async function getExaminees() {
  const rows = await query(`
    SELECT
      DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
      \`group\` AS \`group\`,
      \`time\` AS \`time\`,
      track,
      admission,
      unit,
      major,
      building,
      room,
      examinee_no AS examineeNo,
      name,
      DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
      CASE WHEN photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
      UNIX_TIMESTAMP(updated_at) AS photoVersion
    FROM examinee
    ORDER BY exam_date, \`group\`, \`time\`, examinee_no
  `);

  return rows.map(normalizeExamineeRecord);
}

async function getPrintHistory() {
  const rows = await query(`
    SELECT
      ph.id AS historyId,
      DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS date,
      e.\`group\` AS \`group\`,
      e.\`time\` AS \`time\`,
      e.track,
      e.admission,
      e.unit,
      e.major,
      e.building,
      e.room,
      e.examinee_no AS examineeNo,
      e.name,
      DATE_FORMAT(e.birth_date, '%Y-%m-%d') AS birth,
      CASE WHEN e.photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
      DATE_FORMAT(ph.printed_at, '%Y-%m-%d %H:%i:%s') AS printedAt
    FROM print_history ph
    INNER JOIN examinee e ON e.examinee_no = ph.examinee_no
    ORDER BY ph.printed_at DESC, ph.id DESC
  `);

  return rows.map(normalizeExamineeRecord);
}

async function getAccounts() {
  return query(`
    SELECT
      login_id AS id,
      display_name AS name,
      role,
      COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), '-') AS recentAccess
    FROM accounts
    ORDER BY login_id
  `);
}

async function getTemplates() {
  return query(`
    SELECT
      id,
      name,
      description,
      version_label AS version,
      status,
      content_html AS contentHtml
    FROM templates
    ORDER BY created_at ASC, updated_at ASC
  `);
}

async function ensureTemplateSchema() {
  const descriptionColumns = await query(`SHOW COLUMNS FROM templates LIKE 'description'`);

  if (Array.isArray(descriptionColumns) && descriptionColumns.length === 0) {
    await query(`
      ALTER TABLE templates
      ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '' AFTER name
    `);
  }
}

function normalizeTemplateSeed(seed, status) {
  const id = String(seed?.id || `template-${randomUUID()}`).trim();

  return normalizeTemplatePayload(
    {
      name: seed?.name,
      description: seed?.description,
      version: seed?.version,
      status,
      contentHtml: migrateLegacyTemplateTagMarkup(seed?.contentHtml),
    },
    { id },
  );
}

async function seedTemplates() {
  const [templateSummary] = await query(`SELECT COUNT(*) AS totalTemplates FROM templates`);

  if (Number(templateSummary?.totalTemplates || 0) > 0) {
    return;
  }

  if (!Array.isArray(DEFAULT_TEMPLATE_SEEDS) || DEFAULT_TEMPLATE_SEEDS.length === 0) {
    return;
  }

  const hasUsedTemplate = DEFAULT_TEMPLATE_SEEDS.some((template) => String(template?.status || "").trim() === "used");
  let usedTemplateAssigned = false;

  for (const [index, templateSeed] of DEFAULT_TEMPLATE_SEEDS.entries()) {
    const shouldUseTemplate = hasUsedTemplate
      ? String(templateSeed?.status || "").trim() === "used" && !usedTemplateAssigned
      : index === 0;
    const template = normalizeTemplateSeed(templateSeed, shouldUseTemplate ? "used" : "unused");

    if (template.status === "used") {
      usedTemplateAssigned = true;
    }

    await query(
      `
        INSERT INTO templates (id, name, description, version_label, status, content_html)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [template.id, template.name, template.description, template.version, template.status, template.contentHtml],
    );
  }
}

function isSafeSqlIdentifier(identifier) {
  return /^[A-Za-z0-9_]+$/.test(String(identifier || ""));
}

async function hasTable(tableName) {
  const rows = await query(`SHOW TABLES LIKE ?`, [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function getTableColumns(tableName) {
  if (!isSafeSqlIdentifier(tableName)) {
    throw new Error(`Unsafe SQL identifier: ${tableName}`);
  }

  return query(`SHOW COLUMNS FROM \`${tableName}\``);
}

function hasColumn(columns, columnName) {
  return Array.isArray(columns) && columns.some((column) => String(column.Field || "") === columnName);
}

async function ensureExamineeSchema() {
  const [hasExamineeTable, hasLegacySourceTable] = await Promise.all([hasTable("examinee"), hasTable("candidates")]);

  if (!hasExamineeTable && hasLegacySourceTable) {
    await query(`RENAME TABLE candidates TO examinee`);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS examinee (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      exam_date DATE NOT NULL,
      \`time\` VARCHAR(5) NOT NULL,
      track VARCHAR(100) NOT NULL,
      admission VARCHAR(100) NOT NULL,
      unit VARCHAR(100) NOT NULL,
      major VARCHAR(100) NOT NULL,
      building VARCHAR(100) NOT NULL,
      room VARCHAR(100) NOT NULL,
      \`group\` VARCHAR(30) NOT NULL DEFAULT '',
      examinee_no VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      birth_date DATE NOT NULL,
      photo_name VARCHAR(255) NULL,
      photo_mime VARCHAR(100) NULL,
      photo_blob MEDIUMBLOB NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_examinee_examinee_no (examinee_no),
      KEY idx_examinee_exam_date (exam_date)
    )
  `);

  let examineeColumns = await getTableColumns("examinee");

  if (hasColumn(examineeColumns, "session_label") && !hasColumn(examineeColumns, "time")) {
    await query(`ALTER TABLE examinee CHANGE COLUMN session_label \`time\` VARCHAR(5) NOT NULL AFTER exam_date`);
    examineeColumns = await getTableColumns("examinee");
  }

  if (hasColumn(examineeColumns, "exam") && !hasColumn(examineeColumns, "admission")) {
    await query(`ALTER TABLE examinee CHANGE COLUMN exam admission VARCHAR(100) NOT NULL AFTER track`);
    examineeColumns = await getTableColumns("examinee");
  }

  if (hasColumn(examineeColumns, "unit_name") && !hasColumn(examineeColumns, "unit")) {
    await query(`ALTER TABLE examinee CHANGE COLUMN unit_name unit VARCHAR(100) NOT NULL AFTER admission`);
    examineeColumns = await getTableColumns("examinee");
  }

  if (hasColumn(examineeColumns, "group_label") && !hasColumn(examineeColumns, "group")) {
    await query(`ALTER TABLE examinee CHANGE COLUMN group_label \`group\` VARCHAR(30) NOT NULL DEFAULT '' AFTER room`);
    examineeColumns = await getTableColumns("examinee");
  }

  if (hasColumn(examineeColumns, "candidate_no") && !hasColumn(examineeColumns, "examinee_no")) {
    await query(`ALTER TABLE examinee CHANGE COLUMN candidate_no examinee_no VARCHAR(30) NOT NULL AFTER \`group\``);
    examineeColumns = await getTableColumns("examinee");
  }

  if (!hasColumn(examineeColumns, "time")) {
    await query(`ALTER TABLE examinee ADD COLUMN \`time\` VARCHAR(5) NOT NULL AFTER exam_date`);
  }

  if (!hasColumn(examineeColumns, "admission")) {
    await query(`ALTER TABLE examinee ADD COLUMN admission VARCHAR(100) NOT NULL AFTER track`);
  }

  if (!hasColumn(examineeColumns, "unit")) {
    await query(`ALTER TABLE examinee ADD COLUMN unit VARCHAR(100) NOT NULL AFTER admission`);
  }

  if (!hasColumn(examineeColumns, "group")) {
    await query(`ALTER TABLE examinee ADD COLUMN \`group\` VARCHAR(30) NOT NULL DEFAULT '' AFTER room`);
  }

  if (!hasColumn(examineeColumns, "examinee_no")) {
    await query(`ALTER TABLE examinee ADD COLUMN examinee_no VARCHAR(30) NOT NULL AFTER \`group\``);
  }

  if (!hasColumn(examineeColumns, "photo_name")) {
    await query(`ALTER TABLE examinee ADD COLUMN photo_name VARCHAR(255) NULL AFTER birth_date`);
  }

  if (!hasColumn(examineeColumns, "photo_mime")) {
    await query(`ALTER TABLE examinee ADD COLUMN photo_mime VARCHAR(100) NULL AFTER photo_name`);
  }

  if (!hasColumn(examineeColumns, "photo_blob")) {
    await query(`ALTER TABLE examinee ADD COLUMN photo_blob MEDIUMBLOB NULL AFTER photo_mime`);
  }

  const examineeIndexes = await query(`SHOW INDEX FROM examinee`);
  const hasExamineeNoUniqueIndex = examineeIndexes.some(
    (index) => String(index.Column_name || "") === "examinee_no" && Number(index.Non_unique) === 0,
  );
  const hasExamDateIndex = examineeIndexes.some((index) => String(index.Column_name || "") === "exam_date");

  if (!hasExamineeNoUniqueIndex) {
    await query(`ALTER TABLE examinee ADD UNIQUE KEY uniq_examinee_examinee_no (examinee_no)`);
  }

  if (!hasExamDateIndex) {
    await query(`ALTER TABLE examinee ADD KEY idx_examinee_exam_date (exam_date)`);
  }
}

async function ensurePrintHistorySchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS print_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      examinee_no VARCHAR(30) NOT NULL,
      print_count INT NOT NULL,
      printed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_print_history_examinee_no (examinee_no),
      KEY idx_print_history_printed_at (printed_at),
      CONSTRAINT fk_print_history_examinee_no
        FOREIGN KEY (examinee_no) REFERENCES examinee (examinee_no)
        ON DELETE CASCADE
    )
  `);

  let printHistoryColumns = await getTableColumns("print_history");

  if (hasColumn(printHistoryColumns, "candidate_id") && !hasColumn(printHistoryColumns, "examinee_no")) {
    await query(`ALTER TABLE print_history ADD COLUMN examinee_no VARCHAR(30) NULL AFTER id`);
    printHistoryColumns = await getTableColumns("print_history");
  }

  if (hasColumn(printHistoryColumns, "candidate_id") && hasColumn(printHistoryColumns, "examinee_no")) {
    await query(`
      UPDATE print_history ph
      INNER JOIN examinee e ON e.id = ph.candidate_id
      SET ph.examinee_no = e.examinee_no
      WHERE ph.examinee_no IS NULL
         OR ph.examinee_no = ''
         OR ph.examinee_no <> e.examinee_no
    `);

    const unresolvedRows = await query(`
      SELECT COUNT(*) AS unresolvedCount
      FROM print_history
      WHERE examinee_no IS NULL OR examinee_no = ''
    `);
    const unresolvedCount = Number(unresolvedRows[0]?.unresolvedCount || 0);

    if (unresolvedCount > 0) {
      throw new Error(`print_history.examinee_no migration failed for ${unresolvedCount} rows.`);
    }
  }

  const foreignKeys = await query(`
    SELECT
      CONSTRAINT_NAME AS constraintName,
      COLUMN_NAME AS columnName,
      REFERENCED_TABLE_NAME AS referencedTableName,
      REFERENCED_COLUMN_NAME AS referencedColumnName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'print_history'
      AND COLUMN_NAME IN ('candidate_id', 'examinee_no')
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  for (const foreignKey of foreignKeys) {
    const isExpectedForeignKey = String(foreignKey.columnName || "") === "examinee_no"
      && String(foreignKey.referencedTableName || "") === "examinee"
      && String(foreignKey.referencedColumnName || "") === "examinee_no";

    if (!isExpectedForeignKey) {
      await query(`ALTER TABLE print_history DROP FOREIGN KEY \`${foreignKey.constraintName}\``);
    }
  }

  printHistoryColumns = await getTableColumns("print_history");

  if (hasColumn(printHistoryColumns, "candidate_id")) {
    await query(`ALTER TABLE print_history DROP COLUMN candidate_id`);
    printHistoryColumns = await getTableColumns("print_history");
  }

  if (!hasColumn(printHistoryColumns, "examinee_no")) {
    await query(`ALTER TABLE print_history ADD COLUMN examinee_no VARCHAR(30) NULL AFTER id`);
    printHistoryColumns = await getTableColumns("print_history");
  }

  const invalidPrintHistoryRows = await query(`
    SELECT COUNT(*) AS invalidCount
    FROM print_history ph
    LEFT JOIN examinee e ON e.examinee_no = ph.examinee_no
    WHERE ph.examinee_no IS NULL
       OR ph.examinee_no = ''
       OR e.examinee_no IS NULL
  `);
  const invalidCount = Number(invalidPrintHistoryRows[0]?.invalidCount || 0);

  if (invalidCount > 0) {
    throw new Error(`print_history.examinee_no validation failed for ${invalidCount} rows.`);
  }

  await query(`ALTER TABLE print_history MODIFY COLUMN examinee_no VARCHAR(30) NOT NULL`);

  const printHistoryIndexes = await query(`SHOW INDEX FROM print_history`);
  const legacyPrintHistoryIndexNames = Array.from(new Set(
    printHistoryIndexes
      .filter(
        (index) => String(index.Column_name || "") === "candidate_id" && String(index.Key_name || "") !== "PRIMARY",
      )
      .map((index) => String(index.Key_name || "")),
  ));

  for (const indexName of legacyPrintHistoryIndexNames) {
    if (!indexName) {
      continue;
    }

    await query(`ALTER TABLE print_history DROP INDEX \`${indexName}\``);
  }

  const hasExamineeNoIndex = printHistoryIndexes.some(
    (index) => String(index.Column_name || "") === "examinee_no",
  );
  const hasPrintedAtIndex = printHistoryIndexes.some(
    (index) => String(index.Column_name || "") === "printed_at",
  );

  if (!hasExamineeNoIndex) {
    await query(`ALTER TABLE print_history ADD KEY idx_print_history_examinee_no (examinee_no)`);
  }

  if (!hasPrintedAtIndex) {
    await query(`ALTER TABLE print_history ADD KEY idx_print_history_printed_at (printed_at)`);
  }

  const refreshedForeignKeys = await query(`
    SELECT
      CONSTRAINT_NAME AS constraintName,
      COLUMN_NAME AS columnName,
      REFERENCED_TABLE_NAME AS referencedTableName,
      REFERENCED_COLUMN_NAME AS referencedColumnName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'print_history'
      AND COLUMN_NAME = 'examinee_no'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  const hasExpectedForeignKey = refreshedForeignKeys.some(
    (foreignKey) => String(foreignKey.columnName || "") === "examinee_no"
      && String(foreignKey.referencedTableName || "") === "examinee"
      && String(foreignKey.referencedColumnName || "") === "examinee_no",
  );

  if (!hasExpectedForeignKey) {
    await query(`
      ALTER TABLE print_history
      ADD CONSTRAINT fk_print_history_examinee_no
      FOREIGN KEY (examinee_no) REFERENCES examinee (examinee_no)
      ON DELETE CASCADE
    `);
  }
}

async function ensureAccountSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS accounts (
      login_id VARCHAR(100) NOT NULL PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL DEFAULT '',
      role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용',
      password_value VARCHAR(255) NOT NULL DEFAULT '${DEFAULT_INITIAL_PASSWORD}',
      password_temporary TINYINT(1) NOT NULL DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [displayNameColumns, roleColumns, passwordColumns, passwordTemporaryColumns, lastLoginColumns] = await Promise.all([
    query(`SHOW COLUMNS FROM accounts LIKE 'display_name'`),
    query(`SHOW COLUMNS FROM accounts LIKE 'role'`),
    query(`SHOW COLUMNS FROM accounts LIKE 'password_value'`),
    query(`SHOW COLUMNS FROM accounts LIKE 'password_temporary'`),
    query(`SHOW COLUMNS FROM accounts LIKE 'last_login_at'`),
  ]);

  if (Array.isArray(displayNameColumns) && displayNameColumns.length === 0) {
    await query(`ALTER TABLE accounts ADD COLUMN display_name VARCHAR(100) NOT NULL DEFAULT '' AFTER login_id`);
  }

  if (Array.isArray(roleColumns) && roleColumns.length === 0) {
    await query(
      `ALTER TABLE accounts ADD COLUMN role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용' AFTER display_name`,
    );
  }

  if (Array.isArray(passwordColumns) && passwordColumns.length === 0) {
    await query(
      `ALTER TABLE accounts ADD COLUMN password_value VARCHAR(255) NOT NULL DEFAULT '${DEFAULT_INITIAL_PASSWORD}' AFTER role`,
    );
  }

  if (Array.isArray(passwordTemporaryColumns) && passwordTemporaryColumns.length === 0) {
    await query(`ALTER TABLE accounts ADD COLUMN password_temporary TINYINT(1) NOT NULL DEFAULT 1 AFTER password_value`);
  }

  if (Array.isArray(lastLoginColumns) && lastLoginColumns.length === 0) {
    await query(`ALTER TABLE accounts ADD COLUMN last_login_at DATETIME NULL AFTER password_temporary`);
  }

  await migrateLegacyAccountPasswords();
}

async function ensureSystemSettingsSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value MEDIUMTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [settingValueColumn] = await query(`SHOW COLUMNS FROM system_settings LIKE 'setting_value'`);

  if (!String(settingValueColumn?.Type || "").toLowerCase().includes("text")) {
    await query(`ALTER TABLE system_settings MODIFY COLUMN setting_value MEDIUMTEXT NOT NULL`);
  }

  await query(
    `
      INSERT IGNORE INTO system_settings (setting_key, setting_value)
      VALUES
        ('initialPassword', ?),
        ('autoLogoutMinutes', ?)
    `,
    [DEFAULT_INITIAL_PASSWORD, String(DEFAULT_AUTO_LOGOUT_MINUTES)],
  );
}

function migrateLegacyTemplateTagMarkup(contentHtml) {
  let nextMarkup = String(contentHtml || "");

  if (!nextMarkup) {
    return nextMarkup;
  }

  nextMarkup = nextMarkup
    .replaceAll("@{교시}", "@{시간}")
    .replaceAll("@교시", "@시간");

  nextMarkup = nextMarkup
    .replaceAll("@{전형}", "__ADMITCARD_LEGACY_TRACK_TOKEN__")
    .replaceAll("@전형", "__ADMITCARD_LEGACY_TRACK_TAG__")
    .replaceAll("@{시험}", "@{전형}")
    .replaceAll("@시험", "@전형")
    .replaceAll("__ADMITCARD_LEGACY_TRACK_TOKEN__", "@{모집시기}")
    .replaceAll("__ADMITCARD_LEGACY_TRACK_TAG__", "@모집시기");

  nextMarkup = nextMarkup
    .replaceAll("@{날짜}", "@{시험날짜}")
    .replaceAll("@날짜", "@시험날짜");

  return nextMarkup;
}

async function migrateTemplateTagSchema() {
  const [schemaVersionRow] = await query(
    `
      SELECT setting_value AS settingValue
      FROM system_settings
      WHERE setting_key = 'templateTagSchemaVersion'
    `,
  );

  if (String(schemaVersionRow?.settingValue || "") === TEMPLATE_TAG_SCHEMA_VERSION) {
    return;
  }

  const templates = await query(`
    SELECT
      id,
      content_html AS contentHtml
    FROM templates
  `);

  for (const template of templates) {
    const migratedContentHtml = migrateLegacyTemplateTagMarkup(template.contentHtml);

    if (migratedContentHtml === template.contentHtml) {
      continue;
    }

    await query(
      `
        UPDATE templates
        SET content_html = ?
        WHERE id = ?
      `,
      [migratedContentHtml, template.id],
    );
  }

  await query(
    `
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('templateTagSchemaVersion', ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value)
    `,
    [TEMPLATE_TAG_SCHEMA_VERSION],
  );
}

function parseSystemInitialPassword(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || DEFAULT_INITIAL_PASSWORD;
}

function parseAutoLogoutMinutes(value) {
  const normalizedValue = Math.round(Number(value));

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    return DEFAULT_AUTO_LOGOUT_MINUTES;
  }

  return Math.min(MAX_AUTO_LOGOUT_MINUTES, normalizedValue);
}

function normalizeSystemSettingsRows(rows) {
  const rowsByKey = new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [String(row.settingKey || ""), String(row.settingValue || "")]),
  );

  return {
    initialPassword: parseSystemInitialPassword(rowsByKey.get("initialPassword")),
    autoLogoutMinutes: parseAutoLogoutMinutes(rowsByKey.get("autoLogoutMinutes")),
  };
}

function parseLoginNoticeHtml(value, initialPassword = DEFAULT_INITIAL_PASSWORD) {
  const normalizedValue = String(value ?? "");
  return normalizedValue.trim() ? normalizedValue : getDefaultLoginNoticeHtml(initialPassword);
}

function normalizeSystemSettingsPayload(payload = {}) {
  const initialPassword = String(payload.initialPassword ?? "").trim();
  const autoLogoutMinutes = Math.round(Number(payload.autoLogoutMinutes));

  if (!initialPassword) {
    throw createHttpError(400, "초기 비밀번호를 입력하세요.", "INITIAL_PASSWORD_REQUIRED");
  }

  if (initialPassword.length < 4) {
    throw createHttpError(400, "초기 비밀번호는 4자 이상이어야 합니다.", "INITIAL_PASSWORD_TOO_SHORT");
  }

  if (initialPassword.length > 100) {
    throw createHttpError(400, "초기 비밀번호는 100자 이하여야 합니다.", "INITIAL_PASSWORD_TOO_LONG");
  }

  if (!Number.isFinite(autoLogoutMinutes) || autoLogoutMinutes < 0 || autoLogoutMinutes > MAX_AUTO_LOGOUT_MINUTES) {
    throw createHttpError(
      400,
      `자동 로그아웃 시간은 0분 이상 ${MAX_AUTO_LOGOUT_MINUTES}분 이하로 입력하세요.`,
      "AUTO_LOGOUT_MINUTES_INVALID",
    );
  }

  return {
    initialPassword,
    autoLogoutMinutes,
  };
}

async function getSystemSettings() {
  const rows = await query(
    `
      SELECT
        setting_key AS settingKey,
        setting_value AS settingValue
      FROM system_settings
      WHERE setting_key IN ('initialPassword', 'autoLogoutMinutes')
    `,
  );

  return normalizeSystemSettingsRows(rows);
}

async function getLoginNoticeHtml() {
  const rows = await query(
    `
      SELECT
        setting_key AS settingKey,
        setting_value AS settingValue
      FROM system_settings
      WHERE setting_key IN ('initialPassword', 'loginNoticeHtml')
    `,
  );
  const rowsByKey = new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row.settingKey || ""), row.settingValue]));
  const initialPassword = parseSystemInitialPassword(rowsByKey.get("initialPassword"));
  return parseLoginNoticeHtml(rowsByKey.get("loginNoticeHtml"), initialPassword);
}

function normalizeLoginNoticePayload(payload = {}) {
  return {
    html: String(payload.html ?? payload.loginNoticeHtml ?? ""),
  };
}

async function updateLoginNoticeHtml(payload) {
  const nextNotice = normalizeLoginNoticePayload(payload);

  await query(
    `
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('loginNoticeHtml', ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value)
    `,
    [nextNotice.html],
  );

  return {
    html: await getLoginNoticeHtml(),
  };
}

async function updateSystemSettings(payload) {
  const nextSettings = normalizeSystemSettingsPayload(payload);

  await query(
    `
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES
        ('initialPassword', ?),
        ('autoLogoutMinutes', ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value)
    `,
    [nextSettings.initialPassword, String(nextSettings.autoLogoutMinutes)],
  );

  return getSystemSettings();
}

function normalizeSystemDataDeleteScope(scope) {
  const normalizedScope = String(scope || "").trim().toLowerCase();

  if (!["all", "photos", "print-history"].includes(normalizedScope)) {
    throw createHttpError(400, "지원하지 않는 데이터 삭제 범위입니다.", "SYSTEM_DATA_SCOPE_INVALID");
  }

  return normalizedScope;
}

async function deleteAllSystemData() {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [examineeSummaryRows] = await connection.query(`
      SELECT
        COUNT(*) AS examineeCount,
        SUM(CASE WHEN photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL THEN 1 ELSE 0 END) AS photoCount
      FROM examinee
    `);
    const [printHistorySummaryRows] = await connection.query(`
      SELECT COUNT(*) AS printHistoryCount
      FROM print_history
    `);

    await connection.query(`DELETE FROM examinee`);
    await connection.commit();

    return {
      scope: "all",
      deletedExaminees: Number(examineeSummaryRows?.[0]?.examineeCount || 0),
      deletedPhotos: Number(examineeSummaryRows?.[0]?.photoCount || 0),
      deletedPrintHistory: Number(printHistorySummaryRows?.[0]?.printHistoryCount || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteCandidatePhotoData() {
  const [summary] = await query(`
    SELECT COUNT(*) AS photoCount
    FROM examinee
    WHERE photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL
  `);

  await query(`
    UPDATE examinee
    SET
      photo_name = NULL,
      photo_mime = NULL,
      photo_blob = NULL
    WHERE photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL
  `);

  return {
    scope: "photos",
    deletedExaminees: 0,
    deletedPhotos: Number(summary?.photoCount || 0),
    deletedPrintHistory: 0,
  };
}

async function deletePrintHistoryData() {
  const [summary] = await query(`
    SELECT COUNT(*) AS printHistoryCount
    FROM print_history
  `);

  await query(`DELETE FROM print_history`);

  return {
    scope: "print-history",
    deletedExaminees: 0,
    deletedPhotos: 0,
    deletedPrintHistory: Number(summary?.printHistoryCount || 0),
  };
}

async function deleteSystemData(scope) {
  const normalizedScope = normalizeSystemDataDeleteScope(scope);

  if (normalizedScope === "all") {
    return deleteAllSystemData();
  }

  if (normalizedScope === "photos") {
    return deleteCandidatePhotoData();
  }

  return deletePrintHistoryData();
}

async function migrateLegacyAccountPasswords() {
  const { initialPassword } = await getSystemSettings();
  const accounts = await query(`
    SELECT
      login_id AS id,
      password_value AS passwordValue,
      password_temporary AS passwordTemporary
    FROM accounts
  `);

  for (const account of accounts) {
    if (isPasswordHash(account.passwordValue)) {
      continue;
    }

    const rawPasswordValue = String(account.passwordValue || initialPassword);
    const nextPasswordValue = hashPassword(rawPasswordValue);
    const nextPasswordTemporary =
      rawPasswordValue === DEFAULT_INITIAL_PASSWORD || rawPasswordValue === initialPassword ? 1 : 0;

    await query(
      `
        UPDATE accounts
        SET
          password_value = ?,
          password_temporary = ?
        WHERE login_id = ?
      `,
      [nextPasswordValue, nextPasswordTemporary, account.id],
    );
  }
}

async function migrateLegacySeedAccountIds() {
  const accountIds = DEFAULT_SEED_ACCOUNTS.flatMap((account) => [account.legacyId, account.id]);
  const placeholders = accountIds.map(() => "?").join(", ");
  const accounts = await query(
    `
      SELECT login_id AS id
      FROM accounts
      WHERE login_id IN (${placeholders})
    `,
    accountIds,
  );
  const existingIds = new Set(accounts.map((account) => String(account.id || "").trim()));

  for (const account of DEFAULT_SEED_ACCOUNTS) {
    if (!existingIds.has(account.legacyId) || existingIds.has(account.id)) {
      continue;
    }

    await query(`UPDATE accounts SET login_id = ? WHERE login_id = ?`, [account.id, account.legacyId]);
    existingIds.delete(account.legacyId);
    existingIds.add(account.id);
  }
}

async function seedAccounts() {
  const [accountSummary] = await query(`SELECT COUNT(*) AS totalAccounts FROM accounts`);

  if (Number(accountSummary?.totalAccounts || 0) > 0) {
    return;
  }

  const { initialPassword } = await getSystemSettings();

  await query(
    `
      INSERT INTO accounts (login_id, display_name, role, password_value, password_temporary, last_login_at)
      VALUES
        (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 16 MINUTE)),
        (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
        (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))
    `,
    [
      DEFAULT_SEED_ACCOUNTS[0].id,
      DEFAULT_SEED_ACCOUNTS[0].name,
      DEFAULT_SEED_ACCOUNTS[0].role,
      hashPassword(initialPassword),
      1,
      DEFAULT_SEED_ACCOUNTS[1].id,
      DEFAULT_SEED_ACCOUNTS[1].name,
      DEFAULT_SEED_ACCOUNTS[1].role,
      hashPassword(initialPassword),
      1,
      DEFAULT_SEED_ACCOUNTS[2].id,
      DEFAULT_SEED_ACCOUNTS[2].name,
      DEFAULT_SEED_ACCOUNTS[2].role,
      hashPassword(initialPassword),
      1,
    ],
  );
}

async function getSummary() {
  const [examineeSummary] = await query(`SELECT COUNT(*) AS registeredExaminees FROM examinee`);
  const [printSummary] = await query(`SELECT COUNT(*) AS totalPrints FROM print_history`);
  const [todayPrintSummary] = await query(`
    SELECT COUNT(*) AS todayPrints
    FROM print_history
    WHERE DATE(printed_at) = CURDATE()
  `);

  return {
    registeredExaminees: Number(examineeSummary?.registeredExaminees || 0),
    totalPrints: Number(printSummary?.totalPrints || 0),
    todayPrints: Number(todayPrintSummary?.todayPrints || 0),
  };
}

async function getBootstrapPayload() {
  const [examinees, printHistory, templates, accounts, summary, systemSettings, loginNoticeHtml] = await Promise.all([
    getExaminees(),
    getPrintHistory(),
    getTemplates(),
    getAccounts(),
    getSummary(),
    getSystemSettings(),
    getLoginNoticeHtml(),
  ]);

  return {
    examinees,
    printHistory,
    templates,
    accounts,
    summary,
    systemSettings,
    loginNoticeHtml,
    serverDate: formatDateAsYmd(new Date()),
  };
}

async function saveExamineeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw createHttpError(400, "업로드할 수험생 데이터가 없습니다.");
  }

  const normalizedRows = rows.map(normalizeExamineeInput);
  const values = normalizedRows.map((row) => [
    row.date,
    row.group,
    row.time,
    row.track,
    row.admission,
    row.unit,
    row.major,
    row.building,
    row.room,
    row.examineeNo,
    row.name,
    row.birth,
  ]);

  await getPool().query(
    `
      INSERT INTO examinee (
        exam_date,
        \`group\`,
        \`time\`,
        track,
        admission,
        unit,
        major,
        building,
        room,
        examinee_no,
        name,
        birth_date
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        exam_date = VALUES(exam_date),
        \`group\` = VALUES(\`group\`),
        \`time\` = VALUES(\`time\`),
        track = VALUES(track),
        admission = VALUES(admission),
        unit = VALUES(unit),
        major = VALUES(major),
        building = VALUES(building),
        room = VALUES(room),
        name = VALUES(name),
        birth_date = VALUES(birth_date)
    `,
    [values],
  );

  return {
    processed: normalizedRows.length,
  };
}

async function updateExaminee(examineeNo, payload = {}) {
  const originalExamineeNo = String(examineeNo || "").trim();

  if (!originalExamineeNo) {
    throw createHttpError(400, "수정할 수험번호가 필요합니다.");
  }

  const normalizedRow = normalizeExamineeInput(payload, -1);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ? FOR UPDATE`, [
      originalExamineeNo,
    ]);

    if (existingRows.length === 0) {
      throw createHttpError(404, "수정할 수험생 정보를 찾을 수 없습니다.");
    }

    await connection.query(
      `
        UPDATE examinee
        SET
          exam_date = ?,
          \`group\` = ?,
          \`time\` = ?,
          track = ?,
          admission = ?,
          unit = ?,
          major = ?,
          building = ?,
          room = ?,
          examinee_no = ?,
          name = ?,
          birth_date = ?
        WHERE examinee_no = ?
      `,
      [
        normalizedRow.date,
        normalizedRow.group,
        normalizedRow.time,
        normalizedRow.track,
        normalizedRow.admission,
        normalizedRow.unit,
        normalizedRow.major,
        normalizedRow.building,
        normalizedRow.room,
        normalizedRow.examineeNo,
        normalizedRow.name,
        normalizedRow.birth,
        originalExamineeNo,
      ],
    );

    const [updatedRows] = await connection.query(
      `
        SELECT
          DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
          \`group\` AS \`group\`,
          \`time\` AS \`time\`,
          track,
          admission,
          unit,
          major,
          building,
          room,
          examinee_no AS examineeNo,
          name,
          DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
          CASE WHEN photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
          UNIX_TIMESTAMP(updated_at) AS photoVersion
        FROM examinee
        WHERE examinee_no = ?
      `,
      [normalizedRow.examineeNo],
    );

    await connection.commit();
    return normalizeExamineeRecord(updatedRows[0] || normalizedRow);
  } catch (error) {
    await connection.rollback();

    if (error?.code === "ER_DUP_ENTRY") {
      throw createHttpError(409, "이미 등록된 수험번호입니다.", "EXAMINEE_NO_EXISTS");
    }

    if (error?.code === "ER_ROW_IS_REFERENCED_2") {
      throw createHttpError(409, "출력 이력이 있는 수험생은 수험번호를 변경할 수 없습니다.", "EXAMINEE_NO_LOCKED");
    }

    throw error;
  } finally {
    connection.release();
  }
}

function parseExamineePhotoArchive(fileContentBase64) {
  if (!fileContentBase64) {
    throw createHttpError(400, "사진 ZIP 파일 데이터가 없습니다.");
  }

  let zip;

  try {
    zip = new AdmZip(Buffer.from(fileContentBase64, "base64"));
  } catch (error) {
    throw createHttpError(400, "사진 ZIP 파일을 해석할 수 없습니다.");
  }

  const examineePhotos = new Map();
  let skippedEntries = 0;

  zip.getEntries().forEach((entry) => {
    if (entry.isDirectory) {
      return;
    }

    try {
      const photo = parseExamineePhotoFile(path.basename(String(entry.entryName || "").trim()), entry.getData());
      examineePhotos.set(photo.examineeNo, photo);
    } catch (error) {
      skippedEntries += 1;
    }
  });

  if (examineePhotos.size === 0) {
    throw createHttpError(400, "ZIP 파일에서 업로드 가능한 수험생 사진을 찾을 수 없습니다.");
  }

  return {
    photos: Array.from(examineePhotos.values()),
    skippedEntries,
  };
}

async function saveExamineePhotoArchive(fileContentBase64) {
  const { photos, skippedEntries } = parseExamineePhotoArchive(fileContentBase64);
  const examineeNos = photos.map((photo) => photo.examineeNo);
  const existingRows =
    examineeNos.length > 0
      ? await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no IN (?)`, [examineeNos])
      : [];
  const existingExamineeNos = new Set(existingRows.map((row) => row.examineeNo));
  const matchedPhotos = photos.filter((photo) => existingExamineeNos.has(photo.examineeNo));
  const unmatchedPhotos = photos.length - matchedPhotos.length;

  if (matchedPhotos.length > 0) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      for (const photo of matchedPhotos) {
        await connection.query(
          `
            UPDATE examinee
            SET
              photo_name = ?,
              photo_mime = ?,
              photo_blob = ?
            WHERE examinee_no = ?
          `,
          [photo.fileName, photo.mimeType, photo.fileBuffer, photo.examineeNo],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    photoUploaded: matchedPhotos.length,
    photoSkipped: unmatchedPhotos + skippedEntries,
  };
}

async function saveExamineePhoto(examineeNo, payload = {}) {
  const normalizedExamineeNo = String(examineeNo || "").trim();

  if (!normalizedExamineeNo) {
    throw createHttpError(400, "수험번호가 필요합니다.");
  }

  const [existingExaminee] = await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ?`, [normalizedExamineeNo]);

  if (!existingExaminee) {
    throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
  }

  const fileContentBase64 = String(payload.fileContentBase64 || "").trim();

  if (!fileContentBase64) {
    throw createHttpError(400, "업로드할 사진 파일 데이터가 없습니다.");
  }

  const photo = parseExamineePhotoFile(payload.fileName, Buffer.from(fileContentBase64, "base64"), {
    expectedExamineeNo: normalizedExamineeNo,
  });

  await query(
    `
      UPDATE examinee
      SET
        photo_name = ?,
        photo_mime = ?,
        photo_blob = ?
      WHERE examinee_no = ?
    `,
    [photo.fileName, photo.mimeType, photo.fileBuffer, normalizedExamineeNo],
  );

  const [updatedExaminee] = await query(
    `
      SELECT
        DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
        \`group\` AS \`group\`,
        \`time\` AS \`time\`,
        track,
        admission,
        unit,
        major,
        building,
        room,
        examinee_no AS examineeNo,
        name,
        DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
        CASE WHEN photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
        UNIX_TIMESTAMP(updated_at) AS photoVersion
      FROM examinee
      WHERE examinee_no = ?
    `,
    [normalizedExamineeNo],
  );

  return normalizeExamineeRecord(updatedExaminee || { examineeNo: normalizedExamineeNo, hasPhoto: true });
}

async function importExaminees(payload) {
  let processed = 0;
  let photoUploaded = 0;
  let photoSkipped = 0;

  if (Array.isArray(payload.rows) && payload.rows.length > 0) {
    processed = (await saveExamineeRows(payload.rows)).processed;
  }

  if (payload.fileContentBase64) {
    const workbookRows = await parseExamineeWorkbook(payload.fileContentBase64);
    processed = (await saveExamineeRows(workbookRows)).processed;
  }

  if (payload.photoArchiveContentBase64) {
    const photoResult = await saveExamineePhotoArchive(payload.photoArchiveContentBase64);
    photoUploaded = photoResult.photoUploaded;
    photoSkipped = photoResult.photoSkipped;
  }

  if (processed === 0 && photoUploaded === 0 && !payload.photoArchiveContentBase64) {
    throw createHttpError(400, "업로드할 수험생 데이터 또는 사진 ZIP이 없습니다.");
  }

  return {
    processed,
    photoUploaded,
    photoSkipped,
  };
}

function normalizeTemplatePayload(payload, existingTemplate = {}) {
  const name = String(payload.name ?? existingTemplate.name ?? "").trim();
  const description = String(payload.description ?? existingTemplate.description ?? "").trim();
  const version = String(payload.version ?? existingTemplate.version ?? "").trim();
  const status = payload.status ?? existingTemplate.status ?? "unused";
  const contentHtml = String(payload.contentHtml ?? existingTemplate.contentHtml ?? "");

  if (!name) {
    throw createHttpError(400, "양식 이름이 필요합니다.");
  }

  if (!version) {
    throw createHttpError(400, "양식 버전이 필요합니다.");
  }

  if (!["used", "unused"].includes(status)) {
    throw createHttpError(400, "양식 상태는 used 또는 unused 여야 합니다.");
  }

  if (!contentHtml.trim()) {
    throw createHttpError(400, "양식 HTML 내용이 비어 있습니다.");
  }

  return {
    id: existingTemplate.id || `template-${randomUUID()}`,
    name,
    description,
    version,
    status,
    contentHtml,
  };
}

async function createTemplate(payload) {
  const template = normalizeTemplatePayload(payload);

  await query(
    `
      INSERT INTO templates (id, name, description, version_label, status, content_html)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [template.id, template.name, template.description, template.version, template.status, template.contentHtml],
  );

  return template;
}

async function updateTemplate(templateId, payload) {
  const [existingTemplate] = await getTemplatesById(templateId);

  if (!existingTemplate) {
    throw createHttpError(404, "수정할 양식을 찾을 수 없습니다.");
  }

  const template = normalizeTemplatePayload(payload, existingTemplate);

  await query(
    `
      UPDATE templates
      SET
        name = ?,
        description = ?,
        version_label = ?,
        status = ?,
        content_html = ?
      WHERE id = ?
    `,
    [template.name, template.description, template.version, template.status, template.contentHtml, templateId],
  );

  return template;
}

async function activateTemplate(templateId) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [templateRows] = await connection.query(`SELECT id FROM templates WHERE id = ?`, [templateId]);

    if (templateRows.length === 0) {
      throw createHttpError(404, "적용할 양식을 찾을 수 없습니다.");
    }

    await connection.query(`UPDATE templates SET status = 'unused'`);
    await connection.query(`UPDATE templates SET status = 'used' WHERE id = ?`, [templateId]);

    await connection.commit();

    return getTemplates();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteTemplate(templateId) {
  const [existingTemplate] = await getTemplatesById(templateId);

  if (!existingTemplate) {
    throw createHttpError(404, "삭제할 양식을 찾을 수 없습니다.");
  }

  if (existingTemplate.status === "used") {
    throw createHttpError(409, "사용 중인 양식은 삭제할 수 없습니다.");
  }

  await query(`DELETE FROM templates WHERE id = ?`, [templateId]);
  return { id: templateId };
}

async function getTemplatesById(templateId) {
  return query(
    `
      SELECT
        id,
        name,
        description,
        version_label AS version,
        status,
        content_html AS contentHtml
      FROM templates
      WHERE id = ?
    `,
    [templateId],
  );
}

async function getExamineePhoto(examineeNo) {
  const [examinee] = await query(
    `
      SELECT
        examinee_no AS examineeNo,
        photo_name AS photoName,
        photo_mime AS photoMime,
        photo_blob AS photoBlob
      FROM examinee
      WHERE examinee_no = ?
    `,
    [examineeNo],
  );

  if (!examinee || !examinee.photoBlob) {
    throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.");
  }

  return normalizeExamineeRecord(examinee);
}

async function getExamineeByNo(examineeNo) {
  const [examinee] = await query(
    `
      SELECT
        DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
        \`group\` AS \`group\`,
        \`time\` AS \`time\`,
        track,
        admission,
        unit,
        major,
        building,
        room,
        examinee_no AS examineeNo,
        name,
        DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
        photo_name AS photoName,
        photo_mime AS photoMime,
        photo_blob AS photoBlob
      FROM examinee
      WHERE examinee_no = ?
    `,
    [examineeNo],
  );

  if (!examinee) {
    throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
  }

  return normalizeExamineeRecord(examinee);
}

async function getActiveTemplate() {
  const [template] = await query(`
    SELECT
      id,
      name,
      description,
      version_label AS version,
      status,
      content_html AS contentHtml
    FROM templates
    WHERE status = 'used'
    ORDER BY updated_at DESC
    LIMIT 1
  `);

  if (!template) {
    throw createHttpError(404, "사용중인 수험표 양식을 찾을 수 없습니다.");
  }

  return template;
}

function buildExamineePhotoMarkup(examinee) {
  if (!examinee?.photoBlob || !examinee?.photoMime) {
    return '<span class="examinee-photo-placeholder">사진 미등록</span>';
  }

  const encodedImage = Buffer.from(examinee.photoBlob).toString("base64");
  return `<img class="examinee-photo-token-image" src="data:${examinee.photoMime};base64,${encodedImage}" alt="${escapeHtml(
    `${examinee.name || examinee.examineeNo || "수험생"} 사진`,
  )}" />`;
}

function getTemplateGeneratedObjectValue(examinee) {
  const examineeNo = String(examinee?.examineeNo ?? "").trim();
  return examineeNo || "-";
}

async function buildTemplateGeneratedObjectSvg(objectType, rawValue) {
  const normalizedType = String(objectType || "").trim().toLowerCase();
  const value = String(rawValue ?? "").trim() || "-";

  if (normalizedType === "barcode") {
    return bwipjs.toSVG({
      bcid: "code128",
      text: value,
      scale: 2,
      height: 12,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0,
      backgroundcolor: "FFFFFF",
    });
  }

  if (normalizedType === "qrcode") {
    return QRCode.toString(value, {
      type: "svg",
      margin: 0,
      width: 168,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  }

  throw createHttpError(400, "지원하지 않는 개체 타입입니다.");
}

function buildTemplateGeneratedObjectDataUri(svgMarkup) {
  return `data:image/svg+xml;base64,${Buffer.from(String(svgMarkup || ""), "utf8").toString("base64")}`;
}

function setHtmlTagAttribute(tagMarkup, attributeName, attributeValue) {
  const serializedValue = escapeHtml(String(attributeValue ?? ""));
  const attributePattern = new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`, "i");

  if (attributePattern.test(tagMarkup)) {
    return tagMarkup.replace(attributePattern, ` ${attributeName}="${serializedValue}"`);
  }

  const closingIndex = tagMarkup.endsWith("/>") ? tagMarkup.lastIndexOf("/>") : tagMarkup.lastIndexOf(">");

  if (closingIndex === -1) {
    return tagMarkup;
  }

  return `${tagMarkup.slice(0, closingIndex)} ${attributeName}="${serializedValue}"${tagMarkup.slice(closingIndex)}`;
}

function appendHtmlTagClass(tagMarkup, className) {
  const normalizedClassName = String(className || "").trim();

  if (!normalizedClassName) {
    return tagMarkup;
  }

  const classPattern = /\sclass=(["'])([^"']*)\1/i;

  if (classPattern.test(tagMarkup)) {
    return tagMarkup.replace(classPattern, (fullMatch, quote, classValue) => {
      const nextClassNames = String(classValue || "")
        .split(/\s+/)
        .filter(Boolean);

      if (!nextClassNames.includes(normalizedClassName)) {
        nextClassNames.push(normalizedClassName);
      }

      return ` class=${quote}${nextClassNames.join(" ")}${quote}`;
    });
  }

  return setHtmlTagAttribute(tagMarkup, "class", normalizedClassName);
}

function extractExamineePhotoCellMarkup(content) {
  const photoPattern =
    /(<img\b[^>]*class=(["'])[^"']*\bexaminee-photo-token-image\b[^"']*\2[^>]*>|<span\b[^>]*class=(["'])[^"']*\bexaminee-photo-placeholder\b[^"']*\3[^>]*>[\s\S]*?<\/span>)/i;
  return String(content || "").match(photoPattern)?.[1] || "";
}

function normalizeExamineePhotoTableCellContent(content) {
  const photoMarkup = extractExamineePhotoCellMarkup(content);

  if (!photoMarkup) {
    return String(content || "");
  }

  const remainder = String(content || "").replace(photoMarkup, "");
  const normalizedRemainder = remainder
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();

  return normalizedRemainder === "" ? photoMarkup : String(content || "");
}

function markExamineePhotoTableCells(markup) {
  return String(markup || "").replace(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (fullMatch, tagName, attributes, content) => {
    if (!/(examinee-photo-token-image|examinee-photo-placeholder)/i.test(content)) {
      return fullMatch;
    }

    const openingTag = appendHtmlTagClass(`<${tagName}${attributes}>`, "examinee-photo-token-cell");
    return `${openingTag}${normalizeExamineePhotoTableCellContent(content)}</${tagName}>`;
  });
}

async function replaceTemplateGeneratedObjectMarkup(markup, examinee) {
  const objectPattern = /<img\b[^>]*\bdata-template-object-type=(["'])(barcode|qrcode)\1[^>]*>/gi;
  const matches = Array.from(String(markup || "").matchAll(objectPattern));

  if (matches.length === 0) {
    return String(markup || "");
  }

  const objectValue = getTemplateGeneratedObjectValue(examinee);
  const replacementTags = await Promise.all(
    matches.map(async (match) => {
      const objectType = match[2];
      const svgMarkup = await buildTemplateGeneratedObjectSvg(objectType, objectValue);
      let nextTagMarkup = setHtmlTagAttribute(match[0], "src", buildTemplateGeneratedObjectDataUri(svgMarkup));
      nextTagMarkup = setHtmlTagAttribute(
        nextTagMarkup,
        "alt",
        `${objectValue} ${TEMPLATE_GENERATED_OBJECT_ALT_SUFFIX[objectType] || "개체"}`,
      );
      return nextTagMarkup;
    }),
  );

  let cursor = 0;
  let replacementIndex = 0;
  let nextMarkup = "";

  matches.forEach((match) => {
    nextMarkup += markup.slice(cursor, match.index);
    nextMarkup += replacementTags[replacementIndex];
    cursor = match.index + match[0].length;
    replacementIndex += 1;
  });

  nextMarkup += markup.slice(cursor);
  return nextMarkup;
}

function getTemplateTagReplacement(definition, examinee) {
  if (definition.token === "@{수험생사진}") {
    return buildExamineePhotoMarkup(examinee);
  }

  const wrapTemplateTextValue = (value) => {
    const normalizedValue = String(value ?? "");

    if (!normalizedValue) {
      return "";
    }

    return `<span class="template-data-fit" data-template-data-fit="true">${escapeHtml(normalizedValue)}</span>`;
  };

  if (definition.examineeKey === "currentDate") {
    return wrapTemplateTextValue(examinee?.currentDate || formatDateAsYmd(new Date()));
  }

  return wrapTemplateTextValue(examinee[definition.examineeKey] ?? "");
}

function getTemplateTagEditorText(definition) {
  if (!definition?.token) {
    return "";
  }

  return `#${String(definition.token).replace(/^@\{/, "").replace(/\}$/, "")}`;
}

function getTemplateTagPlainTextReplacement(definition, examinee) {
  if (definition.token === "@{수험생사진}") {
    return buildExamineePhotoMarkup(examinee);
  }

  if (definition.examineeKey === "currentDate") {
    return escapeHtml(String(examinee?.currentDate || formatDateAsYmd(new Date())));
  }

  return escapeHtml(String(examinee[definition.examineeKey] ?? ""));
}

function findTemplateTagDefinitionByValue(rawValue) {
  const normalizedValue = String(rawValue || "").trim();

  if (!normalizedValue) {
    return null;
  }

  return (
    templateTagDefinitions.find((definition) =>
      [
        definition.token,
        definition.legacyTag,
        definition.editorToken,
        ...(definition.editorTokens || []),
        ...(definition.legacyTokens || []),
        ...(definition.legacyTags || []),
      ]
        .filter(Boolean)
        .includes(normalizedValue),
    ) || null
  );
}

function findMatchingSpanMarkupEnd(markup, startIndex) {
  const openTagEndIndex = String(markup || "").indexOf(">", startIndex);

  if (openTagEndIndex < 0) {
    return -1;
  }

  const tagPattern = /<span\b|<\/span>/gi;
  tagPattern.lastIndex = openTagEndIndex + 1;
  let depth = 1;
  let match;

  while ((match = tagPattern.exec(markup))) {
    if (match[0][1] === "/") {
      depth -= 1;

      if (depth === 0) {
        return tagPattern.lastIndex;
      }
      continue;
    }

    depth += 1;
  }

  return -1;
}

function replaceStyledTemplateTagMarkup(markup, examinee) {
  const sourceMarkup = String(markup || "");

  if (!sourceMarkup) {
    return sourceMarkup;
  }

  const tagPattern = /<span\b[^>]*\sdata-template-tag-value=(["'])([^"']*)\1[^>]*>/gi;
  let nextMarkup = "";
  let lastIndex = 0;
  let match;

  while ((match = tagPattern.exec(sourceMarkup))) {
    const tagStartIndex = match.index;
    const tagEndIndex = findMatchingSpanMarkupEnd(sourceMarkup, tagStartIndex);

    if (tagEndIndex < 0) {
      continue;
    }

    const definition = findTemplateTagDefinitionByValue(match[2]);

    if (!definition) {
      continue;
    }

    nextMarkup += sourceMarkup.slice(lastIndex, tagStartIndex);
    nextMarkup += getStyledTemplateTagReplacement(sourceMarkup.slice(tagStartIndex, tagEndIndex), definition, examinee);
    lastIndex = tagEndIndex;
    tagPattern.lastIndex = tagEndIndex;
  }

  if (lastIndex === 0) {
    return sourceMarkup;
  }

  return `${nextMarkup}${sourceMarkup.slice(lastIndex)}`;
}

function stripTemplateTokenDecorationMarkup(tokenMarkup) {
  let nextMarkup = String(tokenMarkup || "");

  nextMarkup = nextMarkup.replace(/\sdata-template-tag-value=(["'])[^"']*\1/gi, "");
  nextMarkup = nextMarkup.replace(/\sclass=(["'])([^"']*)\1/gi, (fullMatch, quote, classValue) => {
    const nextClasses = String(classValue || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((className) => className !== "template-token" && className !== "template-data-fit");

    return nextClasses.length > 0 ? ` class=${quote}${nextClasses.join(" ")}${quote}` : "";
  });

  return nextMarkup;
}

function getStyledTemplateTagReplacement(tokenMarkup, definition, examinee) {
  if (definition?.token === "@{수험생사진}") {
    return buildExamineePhotoMarkup(examinee);
  }

  const replacementMarkup = getTemplateTagReplacement(definition, examinee);

  if (!replacementMarkup) {
    return "";
  }

  const cleanedMarkup = stripTemplateTokenDecorationMarkup(tokenMarkup);
  const editorTagText = getTemplateTagEditorText(definition);

  if (cleanedMarkup && editorTagText && cleanedMarkup.includes(editorTagText)) {
    return cleanedMarkup.replaceAll(editorTagText, replacementMarkup);
  }

  return replacementMarkup;
}

function sanitizeTemplateRenderHtml(templateHtml) {
  const transientClassNames = new Set([
    "template-editor-image-object",
    "is-selected-object",
    "is-moving-object",
    "is-floating-object",
    "is-active-cell",
    "is-selected-cell",
  ]);
  let markup = String(templateHtml || "");

  markup = markup
    .replace(/<div[^>]*class=(["'])[^"']*\btemplate-editor-image-selection\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<button[^>]*class=(["'])[^"']*\btemplate-editor-image-resize-handle\b[^"']*\1[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/\sdraggable=(["'])[^"']*\1/gi, "")
    .replace(/\scontenteditable=(["'])[^"']*\1/gi, "");

  markup = markup.replace(/\sclass=(["'])([^"']*)\1/gi, (fullMatch, quote, classValue) => {
    const nextClassNames = String(classValue || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((className) => !transientClassNames.has(className));

    return nextClassNames.length > 0 ? ` class=${quote}${nextClassNames.join(" ")}${quote}` : "";
  });

  return markup;
}

async function renderTemplateWithExaminee(templateHtml, examinee) {
  let markup = sanitizeTemplateRenderHtml(templateHtml);
  markup = replaceStyledTemplateTagMarkup(markup, examinee);

  templateTagDefinitions.forEach((definition) => {
    const replacementText = getTemplateTagPlainTextReplacement(definition, examinee);
    [definition.token, definition.editorToken, ...(definition.editorTokens || []), ...(definition.legacyTokens || [])]
      .filter(Boolean)
      .forEach((tokenValue) => {
        markup = markup.replaceAll(tokenValue, replacementText);
      });

    [definition.legacyTag, ...(definition.legacyTags || [])]
      .filter(Boolean)
      .forEach((legacyTag) => {
        markup = markup.replaceAll(legacyTag, replacementText);
      });
  });

  const renderedMarkup = await replaceTemplateGeneratedObjectMarkup(markup, examinee);
  return markExamineePhotoTableCells(renderedMarkup);
}

function getTemplateDocumentStyles() {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: "Noto Sans KR", sans-serif;
      color: #152033;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .template-render-sheet {
      width: 794px;
      min-height: 1123px;
      margin: 0;
      padding: 44px 46px;
      background: #ffffff;
    }
    .template-render-sheet:not(:last-child) {
      break-after: page;
      page-break-after: always;
    }
    .template-render-sheet .template-doc {
      position: relative;
      min-height: 100%;
    }
    .template-render-sheet h1,
    .template-render-sheet h2,
    .template-render-sheet h3,
    .template-render-sheet p { margin-top: 0; }
    .template-render-sheet img { max-width: 100%; height: auto; display: block; }
    .template-render-sheet .examinee-photo-token-image {
      width: 100%;
      max-width: 100%;
      height: 100%;
      min-height: 120px;
      object-fit: cover;
    }
    .template-render-sheet td.examinee-photo-token-cell,
    .template-render-sheet th.examinee-photo-token-cell {
      position: relative;
      overflow: hidden;
      padding: 0 !important;
      line-height: 0;
      text-align: center;
      vertical-align: middle;
    }
    .template-render-sheet .examinee-photo-token-cell .examinee-photo-token-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      object-fit: contain;
      background: #ffffff;
    }
    .template-render-sheet .examinee-photo-token-cell .examinee-photo-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      max-width: none;
      margin: 0;
    }
    .template-render-sheet .template-generated-object {
      background: #ffffff;
    }
    .template-render-sheet .template-generated-object-barcode {
      object-fit: fill;
    }
    .template-render-sheet .template-generated-object-qrcode {
      object-fit: contain;
    }
    .template-render-sheet .template-data-fit {
      display: inline;
    }
    .template-render-sheet .examinee-photo-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 1px dashed rgba(138, 154, 181, 0.92);
      color: #53627a;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      background: rgba(246, 248, 252, 0.92);
    }
    .template-render-sheet table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: fixed; }
    .template-render-sheet th,
    .template-render-sheet td { border: 1px solid #000000; padding: 10px 12px; text-align: left; vertical-align: top; }
    .template-render-sheet hr { border: 0; border-top: 1px solid #d8e0ea; margin: 18px 0; }
  `;
}

function getTemplateDocumentScript() {
  return `
    (() => {
      const MIN_SCALE = 0.7;
      const STEP_PX = 0.5;
      const BASE_FONT_SIZE_DATASET_KEY = "templateDataFitBaseFontSize";

      function getTextRectCount(element) {
        if (!(element instanceof HTMLElement)) {
          return 0;
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        const rectCount = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).length;
        range.detach?.();
        return rectCount;
      }

      function isWrapped(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
          return false;
        }

        return getTextRectCount(element) > 1;
      }

      function fitTemplateDataValue(element) {
        if (!(element instanceof HTMLElement) || !element.textContent?.trim()) {
          return;
        }

        const storedBaseFontSize = Number.parseFloat(element.dataset[BASE_FONT_SIZE_DATASET_KEY] || "");
        const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
        const baseFontSize =
          Number.isFinite(storedBaseFontSize) && storedBaseFontSize > 0 ? storedBaseFontSize : computedFontSize;

        if (!Number.isFinite(baseFontSize) || baseFontSize <= 0) {
          return;
        }

        element.dataset[BASE_FONT_SIZE_DATASET_KEY] = String(baseFontSize);
        const minFontSize = baseFontSize * MIN_SCALE;
        let nextFontSize = baseFontSize;

        // Always reset to the original computed size before re-measuring so repeated runs do not compound.
        element.style.fontSize = baseFontSize + "px";

        if (!isWrapped(element)) {
          element.style.removeProperty("font-size");
          return;
        }

        while (nextFontSize > minFontSize) {
          nextFontSize = Math.max(minFontSize, nextFontSize - STEP_PX);
          element.style.fontSize = nextFontSize + "px";

          if (!isWrapped(element)) {
            break;
          }
        }
      }

      function fitAllTemplateDataValues() {
        document.querySelectorAll("[data-template-data-fit='true']").forEach((element) => {
          fitTemplateDataValue(element);
        });
      }

      document.addEventListener("DOMContentLoaded", () => {
        window.requestAnimationFrame(fitAllTemplateDataValues);
      });

      window.addEventListener("load", () => {
        fitAllTemplateDataValues();
      });
    })();
  `;
}

function buildAdmitCardDocumentHtml(title, renderedSheets) {
  const sheetMarkup = (Array.isArray(renderedSheets) ? renderedSheets : [renderedSheets])
    .map(
      (renderedHtml) => `
        <article class="template-render-sheet">
          ${renderedHtml}
        </article>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>${getTemplateDocumentStyles()}</style>
        <script>${getTemplateDocumentScript()}</script>
      </head>
      <body>
        ${sheetMarkup}
      </body>
    </html>
  `;
}

function normalizeExamineeNoList(examineeNos) {
  const list = Array.isArray(examineeNos) ? examineeNos : [examineeNos];

  return Array.from(
    new Set(
      list
        .map((examineeNo) => String(examineeNo || "").trim())
        .filter(Boolean),
    ),
  );
}

async function buildAdmitCardPdfBufferFromSheets(title, renderedSheets) {
  const tempDirectory = path.join(os.tmpdir(), "admitcard-pdf");
  const fileId = randomUUID();
  const htmlPath = path.join(tempDirectory, `${fileId}.html`);
  const pdfPath = path.join(tempDirectory, `${fileId}.pdf`);

  try {
    await fs.promises.mkdir(tempDirectory, { recursive: true });
    await fs.promises.writeFile(htmlPath, buildAdmitCardDocumentHtml(title, renderedSheets), "utf8");
    await execFileAsync(getPdfExecutablePath(), [
      "--headless",
      "--disable-gpu",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ]);

    if (!fs.existsSync(pdfPath)) {
      throw createHttpError(500, "수험표 PDF 파일을 생성하지 못했습니다.");
    }

    return await fs.promises.readFile(pdfPath);
  } finally {
    await Promise.allSettled([
      fs.promises.unlink(htmlPath),
      fs.promises.unlink(pdfPath),
    ]);
  }
}

async function buildAdmitCardPdfBuffer(examineeNo) {
  const [examinee, template] = await Promise.all([getExamineeByNo(examineeNo), getActiveTemplate()]);
  const renderedHtml = await renderTemplateWithExaminee(template.contentHtml, examinee);

  return buildAdmitCardPdfBufferFromSheets(`${examinee.name} 수험표`, [renderedHtml]);
}

async function buildBatchAdmitCardPdfBuffer(examineeNos, options = {}) {
  const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

  if (normalizedExamineeNos.length === 0) {
    throw createHttpError(400, "출력 대상 수험번호가 필요합니다.");
  }

  options.onPhaseChange?.({
    phase: "preparing",
    completedCount: 0,
    totalCount: normalizedExamineeNos.length,
  });

  const template = await getActiveTemplate();
  const examinees = await Promise.all(normalizedExamineeNos.map((examineeNo) => getExamineeByNo(examineeNo)));
  let completedCount = 0;

  options.onPhaseChange?.({
    phase: "rendering",
    completedCount,
    totalCount: examinees.length,
  });

  const renderedSheets = await Promise.all(
    examinees.map(async (examinee) => {
      const renderedSheet = await renderTemplateWithExaminee(template.contentHtml, examinee);
      completedCount += 1;
      options.onProgress?.({
        phase: "rendering",
        completedCount,
        totalCount: examinees.length,
        examineeNo: examinee.examineeNo,
      });
      return renderedSheet;
    }),
  );

  options.onPhaseChange?.({
    phase: "finalizing",
    completedCount: examinees.length,
    totalCount: examinees.length,
  });

  return buildAdmitCardPdfBufferFromSheets(`수험표 ${examinees.length}명`, renderedSheets);
}

async function runBatchAdmitCardJob(jobId, examineeNos) {
  const job = batchAdmitCardJobStore.get(jobId);

  if (!job) {
    return;
  }

  try {
    const pdfBuffer = await buildBatchAdmitCardPdfBuffer(examineeNos, {
      onPhaseChange: ({ phase, completedCount, totalCount }) => {
        const activeJob = batchAdmitCardJobStore.get(jobId);

        if (!activeJob || activeJob.status !== "running") {
          return;
        }

        activeJob.phase = String(phase || activeJob.phase || "preparing");
        activeJob.completedCount = Math.max(0, Number(completedCount || 0));
        activeJob.totalCount = Math.max(activeJob.completedCount, Number(totalCount || activeJob.totalCount || 0));
        touchBatchAdmitCardJob(activeJob);
      },
      onProgress: ({ completedCount, totalCount }) => {
        const activeJob = batchAdmitCardJobStore.get(jobId);

        if (!activeJob || activeJob.status !== "running") {
          return;
        }

        activeJob.phase = "rendering";
        activeJob.completedCount = Math.max(0, Number(completedCount || 0));
        activeJob.totalCount = Math.max(activeJob.completedCount, Number(totalCount || activeJob.totalCount || 0));
        touchBatchAdmitCardJob(activeJob);
      },
    });
    const activeJob = batchAdmitCardJobStore.get(jobId);

    if (!activeJob) {
      return;
    }

    activeJob.status = "completed";
    activeJob.phase = "ready";
    activeJob.completedCount = Math.max(activeJob.completedCount, activeJob.totalCount);
    activeJob.pdfBuffer = pdfBuffer;
    activeJob.error = "";
    activeJob.errorCode = "";
    touchBatchAdmitCardJob(activeJob);
  } catch (error) {
    const activeJob = batchAdmitCardJobStore.get(jobId);

    if (!activeJob) {
      return;
    }

    const normalizedError = error?.statusCode ? error : translateDatabaseError(error);

    activeJob.status = "failed";
    activeJob.phase = "failed";
    activeJob.error = String(normalizedError?.message || "수험표 PDF를 생성할 수 없습니다.");
    activeJob.errorCode = String(normalizedError?.errorCode || "");
    activeJob.pdfBuffer = null;
    touchBatchAdmitCardJob(activeJob);
  }
}

function createBatchAdmitCardJob(accountId, examineeNos) {
  const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

  if (normalizedExamineeNos.length === 0) {
    throw createHttpError(400, "출력 대상 수험번호가 필요합니다.");
  }

  cleanupBatchAdmitCardJobs();

  const jobId = randomUUID();
  const now = Date.now();
  const job = {
    jobId,
    accountId: String(accountId || ""),
    status: "running",
    phase: "preparing",
    totalCount: normalizedExamineeNos.length,
    completedCount: 0,
    fileName: `admit-cards-${normalizedExamineeNos.length}.pdf`,
    pdfBuffer: null,
    error: "",
    errorCode: "",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + BATCH_ADMIT_CARD_JOB_TTL_MS,
  };

  batchAdmitCardJobStore.set(jobId, job);
  void runBatchAdmitCardJob(jobId, normalizedExamineeNos);

  return buildBatchAdmitCardJobPayload(job);
}

async function getAccountById(accountId) {
  const [account] = await query(
    `
      SELECT
        login_id AS id,
        display_name AS name,
        role,
        COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s'), '-') AS recentAccess
      FROM accounts
      WHERE login_id = ?
    `,
    [accountId],
  );

  if (!account) {
    throw createHttpError(404, "계정을 찾을 수 없습니다.");
  }

  return account;
}

async function getAccountAuthRecord(accountId) {
  const [account] = await query(
    `
      SELECT
        login_id AS id,
        display_name AS name,
        role,
        password_value AS passwordValue,
        password_temporary AS passwordTemporary
      FROM accounts
      WHERE login_id = ?
    `,
    [accountId],
  );

  return account || null;
}

function normalizeAccountSessionPayload(account = {}) {
  return {
    id: String(account.id || ""),
    name: String(account.name || ""),
    role: String(account.role || "조회용"),
  };
}

async function getAuthenticatedAccountFromRequest(request, options = {}) {
  const sessionContext = getSessionContext(request);
  const allowPasswordSetup = options.allowPasswordSetup === true;

  if (!sessionContext) {
    throw createHttpError(401, "로그인이 필요합니다.", "AUTH_REQUIRED");
  }

  if (sessionContext.session.stage !== "authenticated" && !allowPasswordSetup) {
    throw createHttpError(403, "초기 비밀번호 변경을 먼저 완료하세요.", "PASSWORD_SETUP_REQUIRED");
  }

  const account = await getAccountAuthRecord(sessionContext.session.accountId);

  if (!account) {
    destroySession(sessionContext.sessionId);
    throw createHttpError(401, "계정 정보를 찾을 수 없습니다. 다시 로그인하세요.", "AUTH_REQUIRED");
  }

  return {
    ...sessionContext,
    account,
  };
}

async function updateAccountLastLogin(accountId) {
  await query(`UPDATE accounts SET last_login_at = NOW() WHERE login_id = ?`, [accountId]);
}

async function loginAccount(payload, response) {
  const accountId = String(payload.id || "").trim();
  const password = normalizePasswordSetupValue(payload.password);

  if (!accountId || !password) {
    throw createHttpError(400, "계정 ID와 비밀번호를 모두 입력하세요.", "INVALID_LOGIN_PAYLOAD");
  }

  const account = await getAccountAuthRecord(accountId);

  if (!account || !verifyPassword(password, account.passwordValue)) {
    throw createHttpError(401, "계정 ID 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
  }

  destroySessionsByAccountId(account.id);

  if (Number(account.passwordTemporary) === 1) {
    const sessionId = createSession(account.id, "password_setup");
    attachSessionCookie(response, sessionId, "password_setup");

    return {
      authenticated: false,
      requiresPasswordChange: true,
      account: normalizeAccountSessionPayload(account),
    };
  }

  await updateAccountLastLogin(account.id);
  const sessionId = createSession(account.id, "authenticated");
  attachSessionCookie(response, sessionId, "authenticated");

  return {
    authenticated: true,
    requiresPasswordChange: false,
    account: normalizeAccountSessionPayload(account),
  };
}

async function getAuthSessionPayload(request) {
  const sessionContext = getSessionContext(request);

  if (!sessionContext) {
    return {
      authenticated: false,
      requiresPasswordChange: false,
      account: null,
    };
  }

  const account = await getAccountAuthRecord(sessionContext.session.accountId);

  if (!account) {
    destroySession(sessionContext.sessionId);
    return {
      authenticated: false,
      requiresPasswordChange: false,
      account: null,
    };
  }

  return {
    authenticated: sessionContext.session.stage === "authenticated",
    requiresPasswordChange: sessionContext.session.stage === "password_setup",
    account: normalizeAccountSessionPayload(account),
  };
}

async function completeTemporaryPasswordSetup(request, payload, response) {
  const { sessionId, session, account } = await getAuthenticatedAccountFromRequest(request, { allowPasswordSetup: true });
  const nextPassword = normalizePasswordSetupValue(payload.password);
  const passwordConfirm = normalizePasswordSetupValue(payload.passwordConfirm);

  if (session.stage !== "password_setup") {
    throw createHttpError(400, "초기 비밀번호 설정이 필요한 로그인 상태가 아닙니다.", "PASSWORD_SETUP_NOT_REQUIRED");
  }

  if (!nextPassword) {
    throw createHttpError(400, "새 비밀번호를 입력하세요.", "PASSWORD_REQUIRED");
  }

  if (nextPassword.length < 4) {
    throw createHttpError(400, "비밀번호는 4자 이상이어야 합니다.", "PASSWORD_TOO_SHORT");
  }

  if (verifyPassword(nextPassword, account.passwordValue)) {
    throw createHttpError(400, "초기 비밀번호와 다른 비밀번호를 설정하세요.", "PASSWORD_MUST_CHANGE");
  }

  if (passwordConfirm && nextPassword !== passwordConfirm) {
    throw createHttpError(400, "비밀번호 확인이 일치하지 않습니다.", "PASSWORD_CONFIRM_MISMATCH");
  }

  await query(
    `
      UPDATE accounts
      SET
        password_value = ?,
        password_temporary = 0,
        last_login_at = NOW()
      WHERE login_id = ?
    `,
    [hashPassword(nextPassword), account.id],
  );

  destroySession(sessionId);
  const nextSessionId = createSession(account.id, "authenticated");
  attachSessionCookie(response, nextSessionId, "authenticated");

  return {
    authenticated: true,
    requiresPasswordChange: false,
    account: normalizeAccountSessionPayload(account),
  };
}

function logoutAccount(request, response) {
  const sessionContext = getSessionContext(request);

  if (sessionContext) {
    destroySession(sessionContext.sessionId);
  }

  clearSessionCookie(response);

  return {
    ok: true,
  };
}

function normalizeAccountPayload(payload, existingAccount = {}) {
  const id = String(payload.id ?? existingAccount.id ?? "").trim();
  const name = String(payload.name ?? existingAccount.name ?? "").trim();
  const role = String(payload.role ?? existingAccount.role ?? "").trim();

  if (!id) {
    throw createHttpError(400, "계정 ID가 필요합니다.");
  }

  if (!name) {
    throw createHttpError(400, "계정 이름이 필요합니다.");
  }

  if (!accountRoleOptions.includes(role)) {
    throw createHttpError(400, "계정 권한은 관리자, 운영자, 조회용 중 하나여야 합니다.");
  }

  return {
    id,
    name,
    role,
  };
}

async function createAccount(payload) {
  const nextAccount = normalizeAccountPayload(payload);
  const existingAccount = await getAccountAuthRecord(nextAccount.id);

  if (existingAccount) {
    throw createHttpError(409, "이미 등록된 계정 ID입니다.", "ACCOUNT_ID_EXISTS");
  }

  const { initialPassword } = await getSystemSettings();

  try {
    await query(
      `
        INSERT INTO accounts (
          login_id,
          display_name,
          role,
          password_value,
          password_temporary,
          last_login_at
        )
        VALUES (?, ?, ?, ?, 1, NULL)
      `,
      [nextAccount.id, nextAccount.name, nextAccount.role, hashPassword(initialPassword)],
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw createHttpError(409, "이미 등록된 계정 ID입니다.", "ACCOUNT_ID_EXISTS");
    }

    throw error;
  }

  return getAccountById(nextAccount.id);
}

async function updateAccount(accountId, payload) {
  const existingAccount = await getAccountById(accountId);
  const nextAccount = normalizeAccountPayload(payload, existingAccount);

  await query(
    `
      UPDATE accounts
      SET
        display_name = ?,
        role = ?
      WHERE login_id = ?
    `,
    [nextAccount.name, nextAccount.role, accountId],
  );

  return getAccountById(accountId);
}

async function resetAccountPassword(accountId) {
  await getAccountById(accountId);
  const { initialPassword } = await getSystemSettings();
  await query(
    `
      UPDATE accounts
      SET
        password_value = ?,
        password_temporary = 1
      WHERE login_id = ?
    `,
    [hashPassword(initialPassword), accountId],
  );
  destroySessionsByAccountId(accountId);
  return { id: accountId, password: initialPassword };
}

async function deleteAccount(accountId) {
  await getAccountById(accountId);
  await query(`DELETE FROM accounts WHERE login_id = ?`, [accountId]);
  destroySessionsByAccountId(accountId);
  return { id: accountId };
}

async function recordPrintHistory(payload) {
  const examineeNos = normalizeExamineeNoList(
    Array.isArray(payload?.examineeNos) ? payload.examineeNos : payload?.examineeNo,
  );

  if (examineeNos.length === 0) {
    throw createHttpError(400, "출력 대상 수험번호가 필요합니다.");
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const insertedHistory = [];

    for (const examineeNo of examineeNos) {
      const [examineeRows] = await connection.query(
        `SELECT examinee_no FROM examinee WHERE examinee_no = ? FOR UPDATE`,
        [examineeNo],
      );

      if (examineeRows.length === 0) {
        throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
      }

      await connection.query(
        `INSERT INTO print_history (examinee_no, print_count) VALUES (?, ?)`,
        [examineeNo, 1],
      );
      insertedHistory.push(examineeNo);
    }

    await connection.commit();

    return {
      examineeNo: insertedHistory[0] || "",
      examineeNos: insertedHistory,
      printCount: insertedHistory.length,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function translateDatabaseError(error) {
  if (error.statusCode) {
    return error;
  }

  if (error.code === "AUTH_SWITCH_PLUGIN_ERROR" || String(error.message || "").includes("auth_gssapi_client")) {
    return createHttpError(
      500,
      "현재 MariaDB 계정은 auth_gssapi_client 인증을 사용 중입니다. Node에서는 전용 mysql_native_password 계정을 만들어 `.env`에 설정해야 합니다.",
    );
  }

  if (error.code === "ER_BAD_DB_ERROR") {
    return createHttpError(500, "DB가 아직 생성되지 않았습니다. `npm run db:setup`을 먼저 실행하세요.");
  }

  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    return createHttpError(500, "MariaDB 접속 정보가 올바르지 않습니다. `.env`의 계정 정보를 확인하세요.");
  }

  if (error.code === "ECONNREFUSED") {
    return createHttpError(500, "MariaDB 서버에 연결할 수 없습니다. 서비스 실행 여부와 포트를 확인하세요.");
  }

  return createHttpError(500, "서버 처리 중 오류가 발생했습니다.");
}

async function handleApiRequest(request, response, requestUrl) {
  const { pathname, searchParams } = requestUrl;

  if (request.method === "GET" && pathname === "/api/health") {
    const [health] = await query(`SELECT 1 AS ok`);
    return sendJson(response, 200, {
      ok: Number(health?.ok || 0) === 1,
      database: process.env.DB_NAME || "admit_card",
    });
  }

  if (request.method === "GET" && pathname === "/api/auth/session") {
    return sendJson(response, 200, await getAuthSessionPayload(request));
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await loginAccount(body, response));
  }

  if (request.method === "POST" && pathname === "/api/auth/password/setup") {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await completeTemporaryPasswordSetup(request, body, response));
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    return sendJson(response, 200, logoutAccount(request, response));
  }

  if (request.method === "GET" && pathname === "/api/login-notice") {
    return sendJson(response, 200, {
      html: await getLoginNoticeHtml(),
    });
  }

  const { account: authenticatedAccount } = await getAuthenticatedAccountFromRequest(request);

  if (request.method === "GET" && pathname === "/api/examinees/template.xlsx") {
    const workbookBuffer = await buildExamineeTemplateBuffer();
    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition("attachment", "수험생 데이터 업로드 양식.xlsx"),
      },
      workbookBuffer,
    );
  }

  if (request.method === "POST" && pathname === "/api/examinees/export.xlsx") {
    const body = await readJsonBody(request);
    const workbookBuffer = await buildExamineeExportBuffer(Array.isArray(body?.rows) ? body.rows : []);

    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition("attachment", "수험생 등록 데이터.xlsx"),
        "Cache-Control": "no-store",
      },
      workbookBuffer,
    );
  }

  if (request.method === "POST" && pathname === "/api/print-history/export.xlsx") {
    const body = await readJsonBody(request);
    const workbookBuffer = await buildPrintHistoryExportBuffer(
      Array.isArray(body?.rows) ? body.rows : [],
      Array.isArray(body?.summaryExaminees) ? body.summaryExaminees : [],
    );

    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition("attachment", "수험표 출력 이력.xlsx"),
        "Cache-Control": "no-store",
      },
      workbookBuffer,
    );
  }

  if (request.method === "GET" && /^\/api\/template-objects\/(barcode|qrcode)\.svg$/.test(pathname)) {
    const objectType = decodeURIComponent(pathname.replace(/^\/api\/template-objects\/((?:barcode|qrcode))\.svg$/, "$1"));
    const objectValue = searchParams.get("value") || "-";
    const svgMarkup = await buildTemplateGeneratedObjectSvg(objectType, objectValue);

    return sendBinary(
      response,
      200,
      {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
      Buffer.from(svgMarkup, "utf8"),
    );
  }

  if (request.method === "GET" && /^\/api\/examinees\/[^/]+\/photo$/.test(pathname)) {
    const examineeNo = decodeURIComponent(pathname.replace(/^\/api\/examinees\/(.+)\/photo$/, "$1"));
    const examineePhoto = await getExamineePhoto(examineeNo);
    return sendBinary(
      response,
      200,
      {
        "Content-Type": examineePhoto.photoMime || "application/octet-stream",
        "Content-Disposition": buildContentDisposition("inline", examineePhoto.photoName || `${examineeNo}.jpg`),
        "Cache-Control": "no-store",
      },
      examineePhoto.photoBlob,
    );
  }

  if (request.method === "PUT" && /^\/api\/examinees\/[^/]+\/photo$/.test(pathname)) {
    const examineeNo = decodeURIComponent(pathname.replace(/^\/api\/examinees\/(.+)\/photo$/, "$1"));
    const body = await readJsonBody(request);
    return sendJson(response, 200, await saveExamineePhoto(examineeNo, body));
  }

  if (request.method === "POST" && pathname === "/api/examinees/admit-card-jobs") {
    const body = await readJsonBody(request);
    const examineeNos = normalizeExamineeNoList(Array.isArray(body?.examineeNos) ? body.examineeNos : body?.examineeNo);

    return sendJson(response, 202, createBatchAdmitCardJob(authenticatedAccount.id, examineeNos), {
      "Cache-Control": "no-store",
    });
  }

  if (request.method === "GET" && /^\/api\/examinees\/admit-card-jobs\/[^/]+$/.test(pathname)) {
    const jobId = decodeURIComponent(pathname.replace(/^\/api\/examinees\/admit-card-jobs\/(.+)$/, "$1"));
    const job = getBatchAdmitCardJobOrThrow(jobId, authenticatedAccount.id);

    return sendJson(response, 200, buildBatchAdmitCardJobPayload(job), {
      "Cache-Control": "no-store",
    });
  }

  if (request.method === "GET" && /^\/api\/examinees\/admit-card-jobs\/[^/]+\/pdf$/.test(pathname)) {
    const jobId = decodeURIComponent(pathname.replace(/^\/api\/examinees\/admit-card-jobs\/(.+)\/pdf$/, "$1"));
    const job = getBatchAdmitCardJobOrThrow(jobId, authenticatedAccount.id);

    if (job.status === "failed") {
      throw createHttpError(409, job.error || "수험표 PDF를 생성할 수 없습니다.", job.errorCode || "BATCH_JOB_FAILED");
    }

    if (job.status !== "completed" || !job.pdfBuffer) {
      throw createHttpError(409, "수험표 PDF 생성이 아직 완료되지 않았습니다.", "BATCH_JOB_NOT_READY");
    }

    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition("inline", job.fileName || "admit-cards.pdf"),
        "Cache-Control": "no-store",
      },
      job.pdfBuffer,
    );
  }

  if (request.method === "GET" && /^\/api\/examinees\/[^/]+\/admit-card\.pdf$/.test(pathname)) {
    const examineeNo = decodeURIComponent(pathname.replace(/^\/api\/examinees\/(.+)\/admit-card\.pdf$/, "$1"));
    const pdfBuffer = await buildAdmitCardPdfBuffer(examineeNo);
    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition("inline", `${examineeNo}.pdf`),
        "Cache-Control": "no-store",
      },
      pdfBuffer,
    );
  }

  if (request.method === "POST" && pathname === "/api/examinees/admit-cards.pdf") {
    const body = await readJsonBody(request);
    const examineeNos = normalizeExamineeNoList(Array.isArray(body?.examineeNos) ? body.examineeNos : body?.examineeNo);
    const pdfBuffer = await buildBatchAdmitCardPdfBuffer(examineeNos);

    return sendBinary(
      response,
      200,
      {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition("inline", `admit-cards-${examineeNos.length}.pdf`),
        "Cache-Control": "no-store",
      },
      pdfBuffer,
    );
  }

  if (request.method === "GET" && pathname === "/api/bootstrap") {
    return sendJson(response, 200, await getBootstrapPayload());
  }

  if (request.method === "GET" && pathname === "/api/system-settings") {
    return sendJson(response, 200, await getSystemSettings());
  }

  if (request.method === "PUT" && pathname === "/api/login-notice") {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await updateLoginNoticeHtml(body));
  }

  if (request.method === "PUT" && pathname === "/api/system-settings") {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await updateSystemSettings(body));
  }

  if (request.method === "DELETE" && /^\/api\/system-data\/(?:all|photos|print-history)$/.test(pathname)) {
    const scope = decodeURIComponent(pathname.replace(/^\/api\/system-data\/(.+)$/, "$1"));
    return sendJson(response, 200, await deleteSystemData(scope));
  }

  if (request.method === "POST" && pathname === "/api/examinees/import") {
    const body = await readJsonBody(request);
    return sendJson(response, 200, await importExaminees(body));
  }

  if (request.method === "PUT" && /^\/api\/examinees\/[^/]+$/.test(pathname)) {
    const examineeNo = decodeURIComponent(pathname.replace(/^\/api\/examinees\/(.+)$/, "$1"));
    const body = await readJsonBody(request);
    return sendJson(response, 200, await updateExaminee(examineeNo, body));
  }

  if (request.method === "POST" && pathname === "/api/templates") {
    const body = await readJsonBody(request);
    return sendJson(response, 201, await createTemplate(body));
  }

  if (request.method === "POST" && /^\/api\/templates\/[^/]+\/activate$/.test(pathname)) {
    const templateId = decodeURIComponent(pathname.replace(/^\/api\/templates\/(.+)\/activate$/, "$1"));
    return sendJson(response, 200, await activateTemplate(templateId));
  }

  if (request.method === "PUT" && /^\/api\/templates\/[^/]+$/.test(pathname)) {
    const templateId = decodeURIComponent(pathname.replace(/^\/api\/templates\/(.+)$/, "$1"));
    const body = await readJsonBody(request);
    return sendJson(response, 200, await updateTemplate(templateId, body));
  }

  if (request.method === "DELETE" && /^\/api\/templates\/[^/]+$/.test(pathname)) {
    const templateId = decodeURIComponent(pathname.replace(/^\/api\/templates\/(.+)$/, "$1"));
    return sendJson(response, 200, await deleteTemplate(templateId));
  }

  if (request.method === "POST" && pathname === "/api/print-history") {
    const body = await readJsonBody(request);
    return sendJson(response, 201, await recordPrintHistory(body));
  }

  if (request.method === "POST" && pathname === "/api/accounts") {
    const body = await readJsonBody(request);
    return sendJson(response, 201, await createAccount(body));
  }

  if (request.method === "PUT" && /^\/api\/accounts\/[^/]+$/.test(pathname)) {
    const accountId = decodeURIComponent(pathname.replace(/^\/api\/accounts\/(.+)$/, "$1"));
    const body = await readJsonBody(request);
    return sendJson(response, 200, await updateAccount(accountId, body));
  }

  if (request.method === "POST" && /^\/api\/accounts\/[^/]+\/reset-password$/.test(pathname)) {
    const accountId = decodeURIComponent(pathname.replace(/^\/api\/accounts\/(.+)\/reset-password$/, "$1"));
    return sendJson(response, 200, await resetAccountPassword(accountId));
  }

  if (request.method === "DELETE" && /^\/api\/accounts\/[^/]+$/.test(pathname)) {
    const accountId = decodeURIComponent(pathname.replace(/^\/api\/accounts\/(.+)$/, "$1"));
    return sendJson(response, 200, await deleteAccount(accountId));
  }

  return sendJson(response, 404, { error: "API 경로를 찾을 수 없습니다." });
}

function escapeHeaderFilename(fileName) {
  return String(fileName || "download")
    .replaceAll("\\", "_")
    .replaceAll('"', "")
    .replaceAll("\r", "")
    .replaceAll("\n", "");
}

function createAsciiHeaderFilename(fileName) {
  const safeFileName = escapeHeaderFilename(fileName);
  const extensionMatch = safeFileName.match(/(\.[A-Za-z0-9]{1,16})$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const baseName = extension ? safeFileName.slice(0, -extension.length) : safeFileName;
  const asciiBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[%;=]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "");

  return `${asciiBaseName || "download"}${extension}`;
}

function encodeHeaderFilename(fileName) {
  return encodeURIComponent(escapeHeaderFilename(fileName))
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");
}

function buildContentDisposition(dispositionType, fileName) {
  const normalizedDisposition = String(dispositionType || "").toLowerCase() === "inline" ? "inline" : "attachment";
  const safeFileName = escapeHeaderFilename(fileName);
  const asciiFallback = createAsciiHeaderFilename(safeFileName);
  const encodedFileName = encodeHeaderFilename(safeFileName);

  return `${normalizedDisposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

function sendRedirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    "Cache-Control": "no-store",
  });
  response.end();
}

function getDefaultAccessiblePath(role = "") {
  return getViewRoutePath(getDefaultAccessibleView(role));
}

async function handlePageRequest(request, response, pathname) {
  const normalizedPath = normalizeRoutePath(pathname);

  if (normalizedPath === "/index.html") {
    sendRedirect(response, "/");
    return true;
  }

  if (normalizedPath === "/") {
    const authPayload = await getAuthSessionPayload(request);
    const nextPath = authPayload.authenticated && authPayload.account
      ? getDefaultAccessiblePath(authPayload.account.role)
      : LOGIN_ROUTE_PATH;
    sendRedirect(response, nextPath);
    return true;
  }

  if (isLoginRoutePath(normalizedPath)) {
    if (normalizedPath !== pathname) {
      sendRedirect(response, normalizedPath);
      return true;
    }

    const authPayload = await getAuthSessionPayload(request);

    if (authPayload.authenticated && authPayload.account) {
      sendRedirect(response, getDefaultAccessiblePath(authPayload.account.role));
      return true;
    }

    serveStaticFile(response, "/index.html", {
      headers: {
        "Cache-Control": "no-store",
      },
    });
    return true;
  }

  const requestedView = getViewFromPathname(normalizedPath);

  if (!requestedView) {
    return false;
  }

  if (normalizedPath !== pathname) {
    sendRedirect(response, normalizedPath);
    return true;
  }

  const authPayload = await getAuthSessionPayload(request);

  if (!authPayload.authenticated || !authPayload.account) {
    sendRedirect(response, LOGIN_ROUTE_PATH);
    return true;
  }

  if (!isViewAccessibleForRole(requestedView, authPayload.account.role)) {
    sendRedirect(response, getDefaultAccessiblePath(authPayload.account.role));
    return true;
  }

  serveStaticFile(response, "/index.html", {
    headers: {
      "Cache-Control": "no-store",
    },
  });
  return true;
}

function serveStaticFile(response, pathname, options = {}) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path
    .normalize(decodeURIComponent(requestPath))
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(root, safePath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      ...(options.headers || {}),
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const { pathname } = requestUrl;

  try {
    if (pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        response.writeHead(204, getCorsHeaders());
        response.end();
        return;
      }

      await handleApiRequest(request, response, requestUrl);
      return;
    }

    if (await handlePageRequest(request, response, pathname)) {
      return;
    }

    serveStaticFile(response, pathname);
  } catch (error) {
    const translatedError = translateDatabaseError(error);
    sendJson(response, translatedError.statusCode || 500, {
      error: translatedError.message,
      code: translatedError.errorCode || "",
    });
  }
});

async function initializeServer() {
  try {
    await ensureExamineeSchema();
    await ensurePrintHistorySchema();
    await ensureTemplateSchema();
    await seedTemplates();
    await ensureSystemSettingsSchema();
    await migrateTemplateTagSchema();
    await ensureAccountSchema();
    await migrateLegacySeedAccountIds();
    await seedAccounts();
  } catch (error) {
    console.error(`Schema check skipped: ${translateDatabaseError(error).message}`);
  }

  server.listen(port, () => {
    console.log(`Admit Card System running at http://localhost:${port}`);
  });
}

initializeServer();
