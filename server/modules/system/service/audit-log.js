function createSystemAuditLogService({
  query,
}) {
  const DEFAULT_AUDIT_LOG_LIMIT = 200;
  const MAX_AUDIT_LOG_LIMIT = 500;

  function normalizeText(value = "", maxLength = 0) {
    const normalizedValue = String(value ?? "").trim();

    if (!maxLength || normalizedValue.length <= maxLength) {
      return normalizedValue;
    }

    return normalizedValue.slice(0, maxLength);
  }

  function normalizeAuditLogLimit(limit = DEFAULT_AUDIT_LOG_LIMIT) {
    const normalizedLimit = Math.round(Number(limit));

    if (!Number.isFinite(normalizedLimit) || normalizedLimit < 1) {
      return DEFAULT_AUDIT_LOG_LIMIT;
    }

    return Math.min(MAX_AUDIT_LOG_LIMIT, normalizedLimit);
  }

  function serializeAuditLogDetails(details) {
    if (typeof details === "undefined") {
      return null;
    }

    try {
      return JSON.stringify(details);
    } catch (error) {
      return JSON.stringify({
        serializationError: true,
        fallbackValue: normalizeText(error?.message || "DETAILS_SERIALIZATION_FAILED", 200),
      });
    }
  }

  function parseAuditLogDetails(detailsJson = "") {
    const normalizedJson = String(detailsJson || "").trim();

    if (!normalizedJson) {
      return null;
    }

    try {
      return JSON.parse(normalizedJson);
    } catch (error) {
      return {
        parseError: true,
        raw: normalizedJson,
      };
    }
  }

  async function recordSystemAuditLog(entry = {}) {
    await query(
      `
        INSERT INTO system_audit_log (
          account_login_id,
          account_display_name,
          account_role,
          action_type,
          target_scope,
          summary_text,
          details_json,
          ip_address,
          user_agent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizeText(entry.accountId, 100),
        normalizeText(entry.accountName, 100),
        normalizeText(entry.accountRole, 30),
        normalizeText(entry.actionType, 80),
        normalizeText(entry.targetScope, 80),
        normalizeText(entry.summaryText, 255),
        serializeAuditLogDetails(entry.details),
        normalizeText(entry.ipAddress, 100),
        normalizeText(entry.userAgent, 500),
      ],
    );

    return true;
  }

  async function getSystemAuditLogs(options = {}) {
    const limit = normalizeAuditLogLimit(options.limit);
    const rows = await query(
      `
        SELECT
          id,
          account_login_id AS accountId,
          account_display_name AS accountName,
          account_role AS accountRole,
          action_type AS actionType,
          target_scope AS targetScope,
          summary_text AS summaryText,
          details_json AS detailsJson,
          ip_address AS ipAddress,
          user_agent AS userAgent,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
        FROM system_audit_log
        ORDER BY id DESC
        LIMIT ?
      `,
      [limit],
    );

    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: Number(row?.id || 0),
      accountId: normalizeText(row?.accountId, 100),
      accountName: normalizeText(row?.accountName, 100),
      accountRole: normalizeText(row?.accountRole, 30),
      actionType: normalizeText(row?.actionType, 80),
      targetScope: normalizeText(row?.targetScope, 80),
      summaryText: normalizeText(row?.summaryText, 255),
      details: parseAuditLogDetails(row?.detailsJson),
      ipAddress: normalizeText(row?.ipAddress, 100),
      userAgent: normalizeText(row?.userAgent, 500),
      createdAt: normalizeText(row?.createdAt, 40),
    }));
  }

  return Object.freeze({
    getSystemAuditLogs,
    recordSystemAuditLog,
  });
}

module.exports = {
  createSystemAuditLogService,
};
