function createSystemSettingsService({
  createHttpError,
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
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

  return Object.freeze({
    getSystemSettings,
    normalizeSystemSettingsPayload,
    parseAutoLogoutMinutes,
    parseSystemInitialPassword,
    updateSystemSettings,
  });
}

module.exports = {
  createSystemSettingsService,
};
