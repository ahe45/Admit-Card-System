function createSystemLoginNoticeService({
  getDefaultApplicantNoticeHtml,
  defaultInitialPassword,
  getDefaultLoginNoticeHtml,
  parseSystemInitialPassword,
  query,
}) {
  const NOTICE_SCOPE_CONFIG = Object.freeze({
    login: Object.freeze({
      settingKey: "loginNoticeHtml",
      responseKey: "loginNoticeHtml",
      getDefaultHtml: (initialPassword) => getDefaultLoginNoticeHtml(initialPassword),
    }),
    applicant: Object.freeze({
      settingKey: "applicantNoticeHtml",
      responseKey: "applicantNoticeHtml",
      getDefaultHtml: () => getDefaultApplicantNoticeHtml(),
    }),
  });

  function normalizeNoticeScope(scope = "") {
    return String(scope || "").trim() === "applicant" ? "applicant" : "login";
  }

  function getNoticeScopeConfig(scope = "") {
    return NOTICE_SCOPE_CONFIG[normalizeNoticeScope(scope)] || NOTICE_SCOPE_CONFIG.login;
  }

  function parseLoginNoticeHtml(value, initialPassword = defaultInitialPassword) {
    const normalizedValue = String(value ?? "");
    return normalizedValue.trim() ? normalizedValue : getDefaultLoginNoticeHtml(initialPassword);
  }

  function parseApplicantNoticeHtml(value) {
    const normalizedValue = String(value ?? "");
    return normalizedValue.trim() ? normalizedValue : getDefaultApplicantNoticeHtml();
  }

  function normalizeLoginNoticePayload(payload = {}) {
    return {
      scope: normalizeNoticeScope(payload.scope),
      html: String(payload.html ?? payload.loginNoticeHtml ?? ""),
    };
  }

  async function getLoginNoticeHtml(scope = "login") {
    const scopeConfig = getNoticeScopeConfig(scope);
    const rows = await query(
      `
        SELECT
          setting_key AS settingKey,
          setting_value AS settingValue
        FROM system_set
        WHERE setting_key IN ('initialPassword', ?)
      `,
      [scopeConfig.settingKey],
    );
    const rowsByKey = new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row.settingKey || ""), row.settingValue]));
    const initialPassword = parseSystemInitialPassword(rowsByKey.get("initialPassword"));
    const storedValue = rowsByKey.get(scopeConfig.settingKey);

    return scopeConfig.settingKey === "applicantNoticeHtml"
      ? parseApplicantNoticeHtml(storedValue)
      : parseLoginNoticeHtml(storedValue, initialPassword);
  }

  async function updateLoginNoticeHtml(payload) {
    const nextNotice = normalizeLoginNoticePayload(payload);
    const scopeConfig = getNoticeScopeConfig(nextNotice.scope);

    await query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [scopeConfig.settingKey, nextNotice.html],
    );

    const savedHtml = await getLoginNoticeHtml(nextNotice.scope);

    return {
      scope: nextNotice.scope,
      html: savedHtml,
      [scopeConfig.responseKey]: savedHtml,
    };
  }

  return Object.freeze({
    getApplicantNoticeHtml: async () => getLoginNoticeHtml("applicant"),
    getLoginNoticeHtml,
    normalizeLoginNoticePayload,
    parseApplicantNoticeHtml,
    parseLoginNoticeHtml,
    updateLoginNoticeHtml,
  });
}

module.exports = {
  createSystemLoginNoticeService,
};
