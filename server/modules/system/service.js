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
  function parseSystemInitialPassword(value) {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || defaultInitialPassword;
  }

  function parseAutoLogoutMinutes(value) {
    const normalizedValue = Math.round(Number(value));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      return defaultAutoLogoutMinutes;
    }

    return Math.min(maxAutoLogoutMinutes, normalizedValue);
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

  function parseLoginNoticeHtml(value, initialPassword = defaultInitialPassword) {
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

    if (!Number.isFinite(autoLogoutMinutes) || autoLogoutMinutes < 0 || autoLogoutMinutes > maxAutoLogoutMinutes) {
      throw createHttpError(
        400,
        `자동 로그아웃 시간은 0분 이상 ${maxAutoLogoutMinutes}분 이하로 입력하세요.`,
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
        rawPasswordValue === defaultInitialPassword || rawPasswordValue === initialPassword ? 1 : 0;

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
    const accountIds = defaultSeedAccounts.flatMap((account) => [account.legacyId, account.id]);
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

    for (const account of defaultSeedAccounts) {
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
        defaultSeedAccounts[0].id,
        defaultSeedAccounts[0].name,
        defaultSeedAccounts[0].role,
        hashPassword(initialPassword),
        1,
        defaultSeedAccounts[1].id,
        defaultSeedAccounts[1].name,
        defaultSeedAccounts[1].role,
        hashPassword(initialPassword),
        1,
        defaultSeedAccounts[2].id,
        defaultSeedAccounts[2].name,
        defaultSeedAccounts[2].role,
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
