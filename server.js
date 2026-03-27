require("dotenv").config({ quiet: true });

const http = require("http");
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");
const { getPool, query } = require("./db");
const { readBinaryBody, readJsonBody } = require("./server/http/body");
const { buildContentDisposition } = require("./server/http/content-disposition");
const { createApiRoutes } = require("./server/http/api-routes");
const { createPageRequestHandlers } = require("./server/http/page-handler");
const { getCorsHeaders, sendBinary, sendJson } = require("./server/http/response");
const { dispatchRoute } = require("./server/http/router");
const { createPasswordHelpers, DEFAULT_PASSWORD_HASH_PREFIX } = require("./server/modules/auth/passwords");
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
const { createDatabaseErrorTranslator } = require("./server/modules/database/error-translation");
const { createAuthSessionStore } = require("./server/modules/auth/session-store");
const { createAuthService } = require("./server/modules/auth/service");
const { createAdmitCardService } = require("./server/modules/examinees/admit-card");
const { createExamineeService } = require("./server/modules/examinees/service");
const { createApplicantService } = require("./server/modules/applications/service");
const { createSchemaBootstrapService } = require("./server/modules/bootstrap/schema");
const { createPrintHistoryService } = require("./server/modules/print-history/service");
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
const PASSWORD_HASH_PREFIX = DEFAULT_PASSWORD_HASH_PREFIX;
const SESSION_COOKIE_NAME = "admitcard.sid";
const AUTHENTICATED_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const PASSWORD_SETUP_SESSION_TTL_MS = 1000 * 60 * 15;
const BATCH_ADMIT_CARD_JOB_TTL_MS = 1000 * 60 * 30;
const APPLICANT_EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 5;
const APPLICANT_PUBLIC_ACCESS_TTL_MS = 1000 * 60 * 60;
const PHOTO_STORAGE_DIR_NAME = "photo";

function getDefaultLoginNoticeHtml(initialPassword = DEFAULT_INITIAL_PASSWORD) {
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

function createApplicantVerificationEmailSender() {
  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpPort = Math.round(Number(process.env.SMTP_PORT));
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();
  const smtpFrom = String(process.env.SMTP_FROM || "").trim();
  const smtpFromName = String(process.env.SMTP_FROM_NAME || "Admit Card System").trim();
  const smtpSecure = String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true";
  const transporter =
    smtpHost && Number.isFinite(smtpPort) && smtpPort > 0 && smtpFrom
      ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: smtpUser || smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        })
      : null;

  return async ({ applicantName, codeValue, email, expiresAt }) => {
    const expirationLabel =
      expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime())
        ? `${expiresAt.getFullYear()}-${String(expiresAt.getMonth() + 1).padStart(2, "0")}-${String(expiresAt.getDate()).padStart(2, "0")} ${String(expiresAt.getHours()).padStart(2, "0")}:${String(expiresAt.getMinutes()).padStart(2, "0")}`
        : "";
    const textLines = [
      `${applicantName}님, 수험생 접수 이메일 인증 코드입니다.`,
      `인증 코드: ${codeValue}`,
      expirationLabel ? `만료 시각: ${expirationLabel}` : "",
      "이 메일은 Admit Card System에서 발송되었습니다.",
    ].filter(Boolean);

    if (!transporter) {
      console.log(`[Applicant Verification] ${email} -> ${codeValue}`);
      return {
        deliveryMode: "console",
        debugCode: process.env.NODE_ENV === "production" ? "" : codeValue,
      };
    }

    try {
      await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFrom}>`,
        to: email,
        subject: "[Admit Card System] 수험생 이메일 인증 코드",
        text: textLines.join("\n"),
        html: `
          <div style="font-family:'Noto Sans KR',sans-serif;color:#152033;line-height:1.6;">
            <p><strong>${escapeHtml(applicantName)}</strong>님, 수험생 접수 이메일 인증 코드입니다.</p>
            <p style="font-size:20px;font-weight:800;letter-spacing:2px;">${escapeHtml(codeValue)}</p>
            ${expirationLabel ? `<p>만료 시각: ${escapeHtml(expirationLabel)}</p>` : ""}
            <p>이 메일은 Admit Card System에서 발송되었습니다.</p>
          </div>
        `,
      });

      return {
        deliveryMode: "smtp",
        debugCode: "",
      };
    } catch (error) {
      console.error(`Applicant verification mail send failed: ${error.message}`);
      console.log(`[Applicant Verification Fallback] ${email} -> ${codeValue}`);
      return {
        deliveryMode: "console",
        debugCode: process.env.NODE_ENV === "production" ? "" : codeValue,
      };
    }
  };
}

const passwordHelpers = createPasswordHelpers({
  passwordHashPrefix: PASSWORD_HASH_PREFIX,
});
const {
  hashPassword,
  isPasswordHash,
  normalizePasswordSetupValue,
  verifyPassword,
} = passwordHelpers;
const authSessionStore = createAuthSessionStore({
  authenticatedSessionTtlMs: AUTHENTICATED_SESSION_TTL_MS,
  passwordSetupSessionTtlMs: PASSWORD_SETUP_SESSION_TTL_MS,
  sessionCookieName: SESSION_COOKIE_NAME,
});
const {
  attachSessionCookie,
  clearSessionCookie,
  createSession,
  destroySession,
  destroySessionsByAccountId,
  getSessionContext,
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

function formatDateAsYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

async function verifySystemDataDeletionPassword(accountId, currentPassword) {
  const normalizedAccountId = String(accountId || "").trim();
  const normalizedPassword = String(currentPassword ?? "");

  if (!normalizedAccountId) {
    throw createHttpError(401, "로그인이 필요합니다.", "AUTH_REQUIRED");
  }

  if (!normalizedPassword) {
    throw createHttpError(400, "현재 비밀번호를 입력하세요.", "SYSTEM_DATA_DELETE_PASSWORD_REQUIRED");
  }

  const account = await getAccountAuthRecord(normalizedAccountId);

  if (!account || !verifyPassword(normalizedPassword, account.passwordValue)) {
    throw createHttpError(401, "현재 비밀번호가 올바르지 않습니다.", "SYSTEM_DATA_DELETE_PASSWORD_INVALID");
  }

  return true;
}

const printHistoryService = createPrintHistoryService({
  createHttpError,
  getPool,
});
const { normalizeExamineeNoList, recordPrintHistory } = printHistoryService;

const translateDatabaseError = createDatabaseErrorTranslator({ createHttpError });

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
  buildAdmitCardPdfBufferFromRecord,
  buildBatchAdmitCardJobPayload,
  buildBatchAdmitCardPdfBuffer,
  createBatchAdmitCardJob,
  getBatchAdmitCardJobOrThrow,
} = admitCardService;
const applicantService = createApplicantService({
  buildAdmitCardPdfBuffer,
  buildAdmitCardPdfBufferFromRecord,
  createHttpError,
  emailVerificationTtlMs: APPLICANT_EMAIL_VERIFICATION_TTL_MS,
  getDefaultApplicantNoticeHtml,
  getPool,
  hashPassword,
  photoStorageDirName: PHOTO_STORAGE_DIR_NAME,
  publicAccessTtlMs: APPLICANT_PUBLIC_ACCESS_TTL_MS,
  query,
  rootDir: root,
  sendVerificationEmail: createApplicantVerificationEmailSender(),
  verifyPassword,
});
const {
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
} = applicantService;
const systemService = createSystemService({
  createHttpError,
  defaultAutoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES,
  defaultInitialPassword: DEFAULT_INITIAL_PASSWORD,
  defaultSeedAccounts: DEFAULT_SEED_ACCOUNTS,
  fs,
  getDefaultApplicantNoticeHtml,
  formatDateAsYmd,
  getAccounts,
  getApplicantFormFields,
  getApplicantRecruitmentUnits,
  getApplicantSettings,
  getApplicantSubmissions,
  getDefaultLoginNoticeHtml,
  getExaminees,
  getPool,
  getPrintHistory,
  getTemplates,
  hashPassword,
  isPasswordHash,
  maxAutoLogoutMinutes: MAX_AUTO_LOGOUT_MINUTES,
  path,
  photoStorageDirName: PHOTO_STORAGE_DIR_NAME,
  query,
  rootDir: root,
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
  ensureApplicantSchema,
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

function createApiRouteDependencies() {
  return {
    activateTemplate,
    buildAdmitCardPdfBuffer,
    buildApplicantAdmitCardPdfForAccessToken,
    buildApplicantSubmissionPhotoArchiveBuffer,
    buildApplicantSubmissionExportBuffer,
    buildApplicantRecruitmentUnitExportBuffer,
    buildApplicantRecruitmentUnitTemplateBuffer,
    buildBatchAdmitCardJobPayload,
    buildBatchAdmitCardPdfBuffer,
    buildContentDisposition,
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    buildTemplateGeneratedObjectSvg,
    createApplicantRecruitmentUnit,
    completeTemporaryPasswordSetup,
    createApplicantFormField,
    createAccount,
    createBatchAdmitCardJob,
    createHttpError,
    createTemplate,
    databaseName: process.env.DB_NAME || "admitcard",
    deleteApplicantFormField,
    deleteApplicantRecruitmentUnit,
    deleteAccount,
    deleteSystemData,
    deleteTemplate,
    getAuthSessionPayload,
    getApplicantPublicForm,
    getApplicantSubmissionPhoto,
    getApplicantSubmissionForAccessToken,
    getBatchAdmitCardJobOrThrow,
    getBootstrapPayload,
    getExamineePhoto,
    getLoginNoticeHtml,
    getSystemSettings,
    importExaminees,
    importApplicantRecruitmentUnits,
    loginAccount,
    lookupApplicantSubmission,
    logoutAccount,
    moveApplicantFormField,
    normalizeExamineeNoList,
    query,
    readBinaryBody,
    readJsonBody,
    recordPrintHistory,
    promoteApplicantSubmission,
    resetAccountPassword,
    saveExamineePhoto,
    saveExamineePhotoArchiveBuffer,
    saveApplicantSubmission,
    sendApplicantVerificationCode,
    sendBinary,
    sendJson,
    updateApplicantSubmissionPhoto,
    updateAccount,
    updateApplicantRecruitmentUnit,
    updateApplicantFormField,
    updateApplicantSettings,
    updateExaminee,
    updateLoginNoticeHtml,
    updateSystemSettings,
    updateTemplate,
    verifySystemDataDeletionPassword,
    verifyApplicantVerificationCode,
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
    await ensureApplicantSchema();
    await ensurePrintHistorySchema();
    await ensureTemplateSchema();
    await seedTemplates();
    await seedApplicantFormFields();
    await ensureSystemSettingsSchema();
    await migrateTemplateTagSchema();
    await migrateTemplateLayoutSchema();
    await ensureAccountSchema();
    await migrateLegacySeedAccountIds();
    await seedAccounts();
  } catch (error) {
    console.error(`Schema check skipped: ${translateDatabaseError(error).message}`);
  }

  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("error", handleError);
      reject(error);
    };

    server.once("error", handleError);
    server.listen(port, () => {
      server.off("error", handleError);
      console.log(`Admit Card System running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

function reportStartupError(error) {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Server start failed: port ${port} is already in use. Stop the existing process or change PORT in .env.`,
    );
    return;
  }

  console.error(error);
}

if (require.main === module) {
  initializeServer().catch((error) => {
    reportStartupError(error);
    process.exit(1);
  });
}

module.exports = {
  initializeServer,
  reportStartupError,
  server,
};
