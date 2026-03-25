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
  formatDateAsYmd,
  getAccounts,
  getDefaultLoginNoticeHtml,
  getExaminees,
  getPool,
  getPrintHistory,
  getTemplates,
  hashPassword,
  isPasswordHash,
  maxAutoLogoutMinutes,
  query,
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
    defaultInitialPassword,
    getDefaultLoginNoticeHtml,
    parseSystemInitialPassword,
    query,
  });
  const { getLoginNoticeHtml, updateLoginNoticeHtml } = loginNoticeService;

  const dataCleanupService = createSystemDataCleanupService({
    createHttpError,
    getPool,
    query,
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
