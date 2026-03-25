const { createAuthAccountAdminService } = require("./service/account-admin");
const { createAuthAccountStore } = require("./service/account-store");
const { createAuthSessionService } = require("./service/session-auth");

function createAuthService({
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
}) {
  const accountStore = createAuthAccountStore({
    createHttpError,
    query,
  });
  const {
    getAccountAuthRecord,
    getAccountById,
    normalizeAccountSessionPayload,
    updateAccountLastLogin,
  } = accountStore;

  const authSessionService = createAuthSessionService({
    attachSessionCookie,
    clearSessionCookie,
    createHttpError,
    createSession,
    destroySession,
    destroySessionsByAccountId,
    getAccountAuthRecord,
    getSessionContext,
    hashPassword,
    normalizeAccountSessionPayload,
    normalizePasswordSetupValue,
    query,
    updateAccountLastLogin,
    verifyPassword,
  });
  const {
    completeTemporaryPasswordSetup,
    getAuthenticatedAccountFromRequest,
    getAuthSessionPayload,
    loginAccount,
    logoutAccount,
  } = authSessionService;

  const accountAdminService = createAuthAccountAdminService({
    accountRoleOptions,
    createHttpError,
    destroySessionsByAccountId,
    getAccountAuthRecord,
    getAccountById,
    getSystemSettings,
    hashPassword,
    query,
  });
  const {
    createAccount,
    deleteAccount,
    normalizeAccountPayload,
    resetAccountPassword,
    updateAccount,
  } = accountAdminService;

  return Object.freeze({
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
  });
}

module.exports = {
  createAuthService,
};
