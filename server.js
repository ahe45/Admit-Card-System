require("dotenv").config({ quiet: true });

const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomBytes, randomUUID, scryptSync, timingSafeEqual } = require("crypto");
const { getPool, query } = require("./db");
const { buildContentDisposition } = require("./server/http/content-disposition");
const { createApiRoutes } = require("./server/http/api-routes");
const { createPageRequestHandlers } = require("./server/http/page-handler");
const { dispatchRoute } = require("./server/http/router");
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
const { createAuthSessionStore } = require("./server/modules/auth/session-store");
const { createAuthService } = require("./server/modules/auth/service");
const { createAdmitCardService } = require("./server/modules/examinees/admit-card");
const { createExamineeService } = require("./server/modules/examinees/service");
const { createSchemaBootstrapService } = require("./server/modules/bootstrap/schema");
const { createTemplateBootstrapService } = require("./server/modules/templates/bootstrap");
const { createSystemService } = require("./server/modules/system/service");
const { createTemplateService } = require("./server/modules/templates/service");

const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const DEFAULT_INITIAL_PASSWORD = "1111";
const DEFAULT_AUTO_LOGOUT_MINUTES = 0;
const MAX_AUTO_LOGOUT_MINUTES = 1440;
const TEMPLATE_TAG_SCHEMA_VERSION = "3";
const TEMPLATE_LAYOUT_SCHEMA_VERSION = "1";
const PASSWORD_HASH_PREFIX = "scrypt";
const SESSION_COOKIE_NAME = "admitcard.sid";
const AUTHENTICATED_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const PASSWORD_SETUP_SESSION_TTL_MS = 1000 * 60 * 15;
const BATCH_ADMIT_CARD_JOB_TTL_MS = 1000 * 60 * 30;

function getDefaultLoginNoticeHtml(initialPassword = DEFAULT_INITIAL_PASSWORD) {
  return [
    '<p><span style="display:inline-flex;padding:3px 8px;border-radius:6px;background:#2f63c8;color:#fff;font-weight:800;">계정 안내</span></p>',
    "<p><strong>ID : 계정 관리에 등록된 계정 ID</strong></p>",
    `<p><strong>PW : ${initialPassword}(초기 비밀번호)</strong></p>`,
    "<p>최초 로그인 시 비밀번호를 변경해야 서비스를 사용할 수 있습니다.</p>",
  ].join("");
}

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
const authSessionStore = createAuthSessionStore({
  authenticatedSessionTtlMs: AUTHENTICATED_SESSION_TTL_MS,
  passwordSetupSessionTtlMs: PASSWORD_SETUP_SESSION_TTL_MS,
  sessionCookieName: SESSION_COOKIE_NAME,
});
const {
  attachSessionCookie,
  buildSessionCookieValue,
  clearSessionCookie,
  createSession,
  destroySession,
  destroySessionsByAccountId,
  getSessionContext,
  parseCookies,
} = authSessionStore;
const examineeService = createExamineeService({
  createHttpError,
  getPool,
  query,
});
const {
  buildExamineeExportBuffer,
  buildExamineeTemplateBuffer,
  buildPrintHistoryExportBuffer,
  getExamineeByNo,
  getExamineePhoto,
  getExaminees,
  getPrintHistory,
  importExaminees,
  saveExamineePhoto,
  saveExamineePhotoArchiveBuffer,
  updateExaminee,
} = examineeService;
const templateService = createTemplateService({
  createHttpError,
  escapeHtml,
  formatDateAsYmd,
  getPool,
  query,
  templateTagDefinitions,
});
const {
  activateTemplate,
  buildTemplateGeneratedObjectSvg,
  createTemplate,
  deleteTemplate,
  getActiveTemplate,
  getTemplates,
  normalizeTemplatePayload,
  renderTemplateWithExaminee,
  updateTemplate,
} = templateService;
const templateBootstrapService = createTemplateBootstrapService({
  defaultTemplateSeeds: DEFAULT_TEMPLATE_SEEDS,
  normalizeTemplatePayload,
  query,
  templateLayoutSchemaVersion: TEMPLATE_LAYOUT_SCHEMA_VERSION,
  templateTagSchemaVersion: TEMPLATE_TAG_SCHEMA_VERSION,
});
const {
  ensureTemplateSchema,
  migrateTemplateTagSchema,
  migrateTemplateLayoutSchema,
  seedTemplates,
} = templateBootstrapService;
const systemService = createSystemService({
  createHttpError,
  defaultAutoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES,
  defaultInitialPassword: DEFAULT_INITIAL_PASSWORD,
  defaultSeedAccounts: DEFAULT_SEED_ACCOUNTS,
  formatDateAsYmd,
  getAccounts,
  getDefaultLoginNoticeHtml,
  getExaminees,
  getPool,
  getPrintHistory,
  getTemplates,
  hashPassword,
  isPasswordHash,
  maxAutoLogoutMinutes: MAX_AUTO_LOGOUT_MINUTES,
  query,
});
const {
  deleteSystemData,
  getBootstrapPayload,
  getLoginNoticeHtml,
  getSystemSettings,
  migrateLegacyAccountPasswords,
  migrateLegacySeedAccountIds,
  seedAccounts,
  updateLoginNoticeHtml,
  updateSystemSettings,
} = systemService;
const schemaBootstrapService = createSchemaBootstrapService({
  defaultAutoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES,
  defaultInitialPassword: DEFAULT_INITIAL_PASSWORD,
  migrateLegacyAccountPasswords,
  query,
});
const {
  ensureAccountSchema,
  ensureExamineeSchema,
  ensurePrintHistorySchema,
  ensureSystemSettingsSchema,
} = schemaBootstrapService;
const authService = createAuthService({
  accountRoleOptions,
  attachSessionCookie,
  clearSessionCookie,
  createHttpError,
  createSession,
  destroySession,
  destroySessionsByAccountId,
  getSessionContext,
  getSystemSettings,
  hashPassword,
  normalizePasswordSetupValue,
  query,
  verifyPassword,
});
const {
  completeTemporaryPasswordSetup,
  createAccount,
  deleteAccount,
  getAccountAuthRecord,
  getAccountById,
  getAuthenticatedAccountFromRequest,
  getAuthSessionPayload,
  loginAccount,
  logoutAccount,
  normalizeAccountPayload,
  normalizeAccountSessionPayload,
  resetAccountPassword,
  updateAccount,
  updateAccountLastLogin,
} = authService;

function formatDateAsYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

async function readBinaryBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
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

const admitCardService = createAdmitCardService({
  batchAdmitCardJobTtlMs: BATCH_ADMIT_CARD_JOB_TTL_MS,
  createHttpError,
  edgeExecutablePaths: EDGE_EXECUTABLE_PATHS,
  escapeHtml,
  getActiveTemplate,
  getExamineeByNo,
  normalizeExamineeNoList,
  renderTemplateWithExaminee,
  translateDatabaseError,
});
const {
  buildAdmitCardPdfBuffer,
  buildBatchAdmitCardJobPayload,
  buildBatchAdmitCardPdfBuffer,
  createBatchAdmitCardJob,
  getBatchAdmitCardJobOrThrow,
} = admitCardService;

function createApiRouteDependencies() {
  return {
    activateTemplate,
    buildAdmitCardPdfBuffer,
    buildBatchAdmitCardJobPayload,
    buildBatchAdmitCardPdfBuffer,
    buildContentDisposition,
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    buildTemplateGeneratedObjectSvg,
    completeTemporaryPasswordSetup,
    createAccount,
    createBatchAdmitCardJob,
    createHttpError,
    createTemplate,
    databaseName: process.env.DB_NAME || "admit_card",
    deleteAccount,
    deleteSystemData,
    deleteTemplate,
    getAuthSessionPayload,
    getBatchAdmitCardJobOrThrow,
    getBootstrapPayload,
    getExamineePhoto,
    getLoginNoticeHtml,
    getSystemSettings,
    importExaminees,
    loginAccount,
    logoutAccount,
    normalizeExamineeNoList,
    query,
    readBinaryBody,
    readJsonBody,
    recordPrintHistory,
    resetAccountPassword,
    saveExamineePhoto,
    saveExamineePhotoArchiveBuffer,
    sendBinary,
    sendJson,
    updateAccount,
    updateExaminee,
    updateLoginNoticeHtml,
    updateSystemSettings,
    updateTemplate,
  };
}

const apiRoutes = createApiRoutes(createApiRouteDependencies());
const { handlePageRequest, serveStaticFile } = createPageRequestHandlers({
  fs,
  path,
  root,
  getAuthSessionPayload,
  getDefaultAccessibleView,
  getViewFromPathname,
  getViewRoutePath,
  isLoginRoutePath,
  isViewAccessibleForRole,
  loginRoutePath: LOGIN_ROUTE_PATH,
  normalizeRoutePath,
});

async function handleApiRequest(request, response, requestUrl) {
  const handled = await dispatchRoute(
    apiRoutes,
    { request, response, requestUrl },
    { authenticate: getAuthenticatedAccountFromRequest },
  );

  if (handled) {
    return;
  }

  return sendJson(response, 404, { error: "API 경로를 찾을 수 없습니다." });
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
    await migrateTemplateLayoutSchema();
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
