function createSystemAuditLogSchemaBootstrap({
  getTableColumns,
  hasColumn,
  query,
}) {
  async function ensureSystemAuditLogSchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS system_audit_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_login_id VARCHAR(100) NOT NULL DEFAULT '',
        account_display_name VARCHAR(100) NOT NULL DEFAULT '',
        account_role VARCHAR(30) NOT NULL DEFAULT '',
        action_type VARCHAR(80) NOT NULL,
        target_scope VARCHAR(80) NOT NULL DEFAULT '',
        summary_text VARCHAR(255) NOT NULL DEFAULT '',
        details_json MEDIUMTEXT NULL,
        ip_address VARCHAR(100) NOT NULL DEFAULT '',
        user_agent VARCHAR(500) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_system_audit_log_created_at (created_at),
        KEY idx_system_audit_log_action_type (action_type),
        KEY idx_system_audit_log_account_login_id (account_login_id)
      )
    `);

    let auditLogColumns = await getTableColumns("system_audit_log");

    if (!hasColumn(auditLogColumns, "account_login_id")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN account_login_id VARCHAR(100) NOT NULL DEFAULT '' AFTER id`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "account_display_name")) {
      await query(
        `ALTER TABLE system_audit_log ADD COLUMN account_display_name VARCHAR(100) NOT NULL DEFAULT '' AFTER account_login_id`,
      );
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "account_role")) {
      await query(
        `ALTER TABLE system_audit_log ADD COLUMN account_role VARCHAR(30) NOT NULL DEFAULT '' AFTER account_display_name`,
      );
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "action_type")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN action_type VARCHAR(80) NOT NULL AFTER account_role`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "target_scope")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN target_scope VARCHAR(80) NOT NULL DEFAULT '' AFTER action_type`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "summary_text")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN summary_text VARCHAR(255) NOT NULL DEFAULT '' AFTER target_scope`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "details_json")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN details_json MEDIUMTEXT NULL AFTER summary_text`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "ip_address")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN ip_address VARCHAR(100) NOT NULL DEFAULT '' AFTER details_json`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "user_agent")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN user_agent VARCHAR(500) NOT NULL DEFAULT '' AFTER ip_address`);
      auditLogColumns = await getTableColumns("system_audit_log");
    }

    if (!hasColumn(auditLogColumns, "created_at")) {
      await query(`ALTER TABLE system_audit_log ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER user_agent`);
    }

    await query(`ALTER TABLE system_audit_log MODIFY COLUMN account_login_id VARCHAR(100) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN account_display_name VARCHAR(100) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN account_role VARCHAR(30) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN action_type VARCHAR(80) NOT NULL`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN target_scope VARCHAR(80) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN summary_text VARCHAR(255) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN details_json MEDIUMTEXT NULL`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN ip_address VARCHAR(100) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN user_agent VARCHAR(500) NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE system_audit_log MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`);

    const auditLogIndexes = await query(`SHOW INDEX FROM system_audit_log`);
    const hasCreatedAtIndex = auditLogIndexes.some((index) => String(index.Key_name || "") === "idx_system_audit_log_created_at");
    const hasActionTypeIndex = auditLogIndexes.some((index) => String(index.Key_name || "") === "idx_system_audit_log_action_type");
    const hasAccountLoginIdIndex = auditLogIndexes.some((index) => String(index.Key_name || "") === "idx_system_audit_log_account_login_id");

    if (!hasCreatedAtIndex) {
      await query(`ALTER TABLE system_audit_log ADD KEY idx_system_audit_log_created_at (created_at)`);
    }

    if (!hasActionTypeIndex) {
      await query(`ALTER TABLE system_audit_log ADD KEY idx_system_audit_log_action_type (action_type)`);
    }

    if (!hasAccountLoginIdIndex) {
      await query(`ALTER TABLE system_audit_log ADD KEY idx_system_audit_log_account_login_id (account_login_id)`);
    }
  }

  return Object.freeze({
    ensureSystemAuditLogSchema,
  });
}

module.exports = {
  createSystemAuditLogSchemaBootstrap,
};
