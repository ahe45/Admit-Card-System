function createSystemLoginNoticeService({
  defaultInitialPassword,
  getDefaultLoginNoticeHtml,
  parseSystemInitialPassword,
  query,
}) {
  function parseLoginNoticeHtml(value, initialPassword = defaultInitialPassword) {
    const normalizedValue = String(value ?? "");
    return normalizedValue.trim() ? normalizedValue : getDefaultLoginNoticeHtml(initialPassword);
  }

  function normalizeLoginNoticePayload(payload = {}) {
    return {
      html: String(payload.html ?? payload.loginNoticeHtml ?? ""),
    };
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

  return Object.freeze({
    getLoginNoticeHtml,
    normalizeLoginNoticePayload,
    parseLoginNoticeHtml,
    updateLoginNoticeHtml,
  });
}

module.exports = {
  createSystemLoginNoticeService,
};
