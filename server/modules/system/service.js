const { createSystemAccountBootstrapService } = require("./service/account-bootstrap");
const { createSystemDataCleanupService } = require("./service/data-cleanup");
const { createSystemLoginNoticeService } = require("./service/login-notice");
const { createSystemSettingsService } = require("./service/settings");
const { createSystemSummaryService } = require("./service/summary");

function createSystemService({
  createHttpError,
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
  defaultSeedAccounts,
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
  maxAutoLogoutMinutes,
  path,
  photoStorageDirName,
  query,
  rootDir,
}) {
  const systemSettingsService = createSystemSettingsService({
    createHttpError,
    defaultAutoLogoutMinutes,
    defaultInitialPassword,
    maxAutoLogoutMinutes,
    query,
  });
  const {
    getSystemSettings,
    parseSystemInitialPassword,
    updateSystemSettings,
  } = systemSettingsService;

  const loginNoticeService = createSystemLoginNoticeService({
    getDefaultApplicantNoticeHtml,
    defaultInitialPassword,
    getDefaultLoginNoticeHtml,
    parseSystemInitialPassword,
    query,
  });
  const { getApplicantNoticeHtml, getLoginNoticeHtml, updateLoginNoticeHtml } = loginNoticeService;

  const dataCleanupService = createSystemDataCleanupService({
    createHttpError,
    fs,
    getPool,
    path,
    photoStorageDirName,
    query,
    rootDir,
  });
  const { deleteSystemData } = dataCleanupService;

  const accountBootstrapService = createSystemAccountBootstrapService({
    defaultInitialPassword,
    defaultSeedAccounts,
    getSystemSettings,
    hashPassword,
    isPasswordHash,
    query,
  });
  const {
    migrateLegacyAccountPasswords,
    migrateLegacySeedAccountIds,
    seedAccounts,
  } = accountBootstrapService;

  const summaryService = createSystemSummaryService({
    formatDateAsYmd,
    getAccounts,
    getApplicantFormFields,
    getApplicantRecruitmentUnits,
    getApplicantSettings,
    getApplicantSubmissions,
    getApplicantNoticeHtml,
    getExaminees,
    getLoginNoticeHtml,
    getPrintHistory,
    getSystemSettings,
    getTemplates,
    query,
  });
  const { getBootstrapPayload } = summaryService;

  return Object.freeze({
    deleteSystemData,
      getBootstrapPayload,
    getApplicantNoticeHtml,
    getLoginNoticeHtml,
    getSystemSettings,
    migrateLegacyAccountPasswords,
    migrateLegacySeedAccountIds,
    seedAccounts,
    updateLoginNoticeHtml,
    updateSystemSettings,
  });
}

module.exports = {
  createSystemService,
};
