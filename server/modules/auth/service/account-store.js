function createAuthAccountStore({
  createHttpError,
  query,
}) {
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

  async function updateAccountLastLogin(accountId) {
    await query(`UPDATE accounts SET last_login_at = NOW() WHERE login_id = ?`, [accountId]);
  }

  return Object.freeze({
    getAccountAuthRecord,
    getAccountById,
    normalizeAccountSessionPayload,
    updateAccountLastLogin,
  });
}

module.exports = {
  createAuthAccountStore,
};
