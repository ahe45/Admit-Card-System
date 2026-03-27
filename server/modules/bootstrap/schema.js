const { createAccountSchemaBootstrap } = require("./schema/accounts");
const { createApplicantSchemaBootstrap } = require("./schema/applications");
const { createExamineeSchemaBootstrap } = require("./schema/examinee");
const { createPrintHistorySchemaBootstrap } = require("./schema/print-history");
const { createSchemaQueryHelpers } = require("./schema/helpers");
const { createSystemSettingsSchemaBootstrap } = require("./schema/system-settings");

function createSchemaBootstrapService({
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
  migrateLegacyAccountPasswords,
  query,
}) {
  const schemaQueryHelpers = createSchemaQueryHelpers({ query });
  const { getTableColumns, hasColumn, hasTable } = schemaQueryHelpers;

  const examineeSchemaBootstrap = createExamineeSchemaBootstrap({
    getTableColumns,
    hasColumn,
    hasTable,
    query,
  });
  const { ensureExamineeSchema } = examineeSchemaBootstrap;

  const printHistorySchemaBootstrap = createPrintHistorySchemaBootstrap({
    getTableColumns,
    hasColumn,
    hasTable,
    query,
  });
  const { ensurePrintHistorySchema } = printHistorySchemaBootstrap;

  const accountSchemaBootstrap = createAccountSchemaBootstrap({
    defaultInitialPassword,
    migrateLegacyAccountPasswords,
    query,
  });
  const { ensureAccountSchema } = accountSchemaBootstrap;

  const applicantSchemaBootstrap = createApplicantSchemaBootstrap({
    getTableColumns,
    hasColumn,
    hasTable,
    query,
  });
  const { ensureApplicantSchema } = applicantSchemaBootstrap;

  const systemSettingsSchemaBootstrap = createSystemSettingsSchemaBootstrap({
    defaultAutoLogoutMinutes,
    defaultInitialPassword,
    hasTable,
    query,
  });
  const { ensureSystemSettingsSchema } = systemSettingsSchemaBootstrap;

  return Object.freeze({
    ensureAccountSchema,
    ensureApplicantSchema,
    ensureExamineeSchema,
    ensurePrintHistorySchema,
    ensureSystemSettingsSchema,
  });
}

module.exports = {
  createSchemaBootstrapService,
};
