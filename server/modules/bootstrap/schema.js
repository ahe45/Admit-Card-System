function createSchemaBootstrapService({
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
  migrateLegacyAccountPasswords,
  query,
}) {
  function isSafeSqlIdentifier(identifier) {
    return /^[A-Za-z0-9_]+$/.test(String(identifier || ""));
  }

  async function hasTable(tableName) {
    const rows = await query(`SHOW TABLES LIKE ?`, [tableName]);
    return Array.isArray(rows) && rows.length > 0;
  }

  async function getTableColumns(tableName) {
    if (!isSafeSqlIdentifier(tableName)) {
      throw new Error(`Unsafe SQL identifier: ${tableName}`);
    }

    return query(`SHOW COLUMNS FROM \`${tableName}\``);
  }

  function hasColumn(columns, columnName) {
    return Array.isArray(columns) && columns.some((column) => String(column.Field || "") === columnName);
  }

  async function ensureExamineeSchema() {
    const [hasExamineeTable, hasLegacySourceTable] = await Promise.all([hasTable("examinee"), hasTable("candidates")]);

    if (!hasExamineeTable && hasLegacySourceTable) {
      await query(`RENAME TABLE candidates TO examinee`);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS examinee (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        exam_date DATE NOT NULL,
        \`time\` VARCHAR(5) NOT NULL,
        track VARCHAR(100) NOT NULL,
        admission VARCHAR(100) NOT NULL,
        series VARCHAR(100) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        major VARCHAR(100) NOT NULL,
        building VARCHAR(100) NOT NULL,
        room VARCHAR(100) NOT NULL,
        \`group\` VARCHAR(30) NOT NULL DEFAULT '',
        examinee_no VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        birth_date DATE NOT NULL,
        photo_name VARCHAR(255) NULL,
        photo_mime VARCHAR(100) NULL,
        photo_blob MEDIUMBLOB NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_examinee_examinee_no (examinee_no),
        KEY idx_examinee_exam_date (exam_date)
      )
    `);

    let examineeColumns = await getTableColumns("examinee");

    if (hasColumn(examineeColumns, "session_label") && !hasColumn(examineeColumns, "time")) {
      await query(`ALTER TABLE examinee CHANGE COLUMN session_label \`time\` VARCHAR(5) NOT NULL AFTER exam_date`);
      examineeColumns = await getTableColumns("examinee");
    }

    if (hasColumn(examineeColumns, "exam") && !hasColumn(examineeColumns, "admission")) {
      await query(`ALTER TABLE examinee CHANGE COLUMN exam admission VARCHAR(100) NOT NULL AFTER track`);
      examineeColumns = await getTableColumns("examinee");
    }

    if (hasColumn(examineeColumns, "unit_name") && !hasColumn(examineeColumns, "unit")) {
      await query(`ALTER TABLE examinee CHANGE COLUMN unit_name unit VARCHAR(100) NOT NULL AFTER admission`);
      examineeColumns = await getTableColumns("examinee");
    }

    if (hasColumn(examineeColumns, "group_label") && !hasColumn(examineeColumns, "group")) {
      await query(`ALTER TABLE examinee CHANGE COLUMN group_label \`group\` VARCHAR(30) NOT NULL DEFAULT '' AFTER room`);
      examineeColumns = await getTableColumns("examinee");
    }

    if (hasColumn(examineeColumns, "candidate_no") && !hasColumn(examineeColumns, "examinee_no")) {
      await query(`ALTER TABLE examinee CHANGE COLUMN candidate_no examinee_no VARCHAR(30) NOT NULL AFTER \`group\``);
      examineeColumns = await getTableColumns("examinee");
    }

    if (!hasColumn(examineeColumns, "time")) {
      await query(`ALTER TABLE examinee ADD COLUMN \`time\` VARCHAR(5) NOT NULL AFTER exam_date`);
    }

    if (!hasColumn(examineeColumns, "admission")) {
      await query(`ALTER TABLE examinee ADD COLUMN admission VARCHAR(100) NOT NULL AFTER track`);
    }

    if (!hasColumn(examineeColumns, "series")) {
      await query(`ALTER TABLE examinee ADD COLUMN series VARCHAR(100) NOT NULL DEFAULT '' AFTER admission`);
    }

    if (!hasColumn(examineeColumns, "unit")) {
      await query(`ALTER TABLE examinee ADD COLUMN unit VARCHAR(100) NOT NULL AFTER series`);
    }

    if (!hasColumn(examineeColumns, "group")) {
      await query(`ALTER TABLE examinee ADD COLUMN \`group\` VARCHAR(30) NOT NULL DEFAULT '' AFTER room`);
    }

    if (!hasColumn(examineeColumns, "examinee_no")) {
      await query(`ALTER TABLE examinee ADD COLUMN examinee_no VARCHAR(30) NOT NULL AFTER \`group\``);
    }

    if (!hasColumn(examineeColumns, "photo_name")) {
      await query(`ALTER TABLE examinee ADD COLUMN photo_name VARCHAR(255) NULL AFTER birth_date`);
    }

    if (!hasColumn(examineeColumns, "photo_mime")) {
      await query(`ALTER TABLE examinee ADD COLUMN photo_mime VARCHAR(100) NULL AFTER photo_name`);
    }

    if (!hasColumn(examineeColumns, "photo_blob")) {
      await query(`ALTER TABLE examinee ADD COLUMN photo_blob MEDIUMBLOB NULL AFTER photo_mime`);
    }

    const examineeIndexes = await query(`SHOW INDEX FROM examinee`);
    const hasExamineeNoUniqueIndex = examineeIndexes.some(
      (index) => String(index.Column_name || "") === "examinee_no" && Number(index.Non_unique) === 0,
    );
    const hasExamDateIndex = examineeIndexes.some((index) => String(index.Column_name || "") === "exam_date");

    if (!hasExamineeNoUniqueIndex) {
      await query(`ALTER TABLE examinee ADD UNIQUE KEY uniq_examinee_examinee_no (examinee_no)`);
    }

    if (!hasExamDateIndex) {
      await query(`ALTER TABLE examinee ADD KEY idx_examinee_exam_date (exam_date)`);
    }
  }

  async function ensurePrintHistorySchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS print_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        examinee_no VARCHAR(30) NOT NULL,
        print_count INT NOT NULL,
        printed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_print_history_examinee_no (examinee_no),
        KEY idx_print_history_printed_at (printed_at),
        CONSTRAINT fk_print_history_examinee_no
          FOREIGN KEY (examinee_no) REFERENCES examinee (examinee_no)
          ON DELETE CASCADE
      )
    `);

    let printHistoryColumns = await getTableColumns("print_history");

    if (hasColumn(printHistoryColumns, "candidate_id") && !hasColumn(printHistoryColumns, "examinee_no")) {
      await query(`ALTER TABLE print_history ADD COLUMN examinee_no VARCHAR(30) NULL AFTER id`);
      printHistoryColumns = await getTableColumns("print_history");
    }

    if (hasColumn(printHistoryColumns, "candidate_id") && hasColumn(printHistoryColumns, "examinee_no")) {
      await query(`
        UPDATE print_history ph
        INNER JOIN examinee e ON e.id = ph.candidate_id
        SET ph.examinee_no = e.examinee_no
        WHERE ph.examinee_no IS NULL
           OR ph.examinee_no = ''
           OR ph.examinee_no <> e.examinee_no
      `);

      const unresolvedRows = await query(`
        SELECT COUNT(*) AS unresolvedCount
        FROM print_history
        WHERE examinee_no IS NULL OR examinee_no = ''
      `);
      const unresolvedCount = Number(unresolvedRows[0]?.unresolvedCount || 0);

      if (unresolvedCount > 0) {
        throw new Error(`print_history.examinee_no migration failed for ${unresolvedCount} rows.`);
      }
    }

    const foreignKeys = await query(`
      SELECT
        CONSTRAINT_NAME AS constraintName,
        COLUMN_NAME AS columnName,
        REFERENCED_TABLE_NAME AS referencedTableName,
        REFERENCED_COLUMN_NAME AS referencedColumnName
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'print_history'
        AND COLUMN_NAME IN ('candidate_id', 'examinee_no')
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const foreignKey of foreignKeys) {
      const isExpectedForeignKey = String(foreignKey.columnName || "") === "examinee_no"
        && String(foreignKey.referencedTableName || "") === "examinee"
        && String(foreignKey.referencedColumnName || "") === "examinee_no";

      if (!isExpectedForeignKey) {
        await query(`ALTER TABLE print_history DROP FOREIGN KEY \`${foreignKey.constraintName}\``);
      }
    }

    printHistoryColumns = await getTableColumns("print_history");

    if (hasColumn(printHistoryColumns, "candidate_id")) {
      await query(`ALTER TABLE print_history DROP COLUMN candidate_id`);
      printHistoryColumns = await getTableColumns("print_history");
    }

    if (!hasColumn(printHistoryColumns, "examinee_no")) {
      await query(`ALTER TABLE print_history ADD COLUMN examinee_no VARCHAR(30) NULL AFTER id`);
      printHistoryColumns = await getTableColumns("print_history");
    }

    const invalidPrintHistoryRows = await query(`
      SELECT COUNT(*) AS invalidCount
      FROM print_history ph
      LEFT JOIN examinee e ON e.examinee_no = ph.examinee_no
      WHERE ph.examinee_no IS NULL
         OR ph.examinee_no = ''
         OR e.examinee_no IS NULL
    `);
    const invalidCount = Number(invalidPrintHistoryRows[0]?.invalidCount || 0);

    if (invalidCount > 0) {
      throw new Error(`print_history.examinee_no validation failed for ${invalidCount} rows.`);
    }

    await query(`ALTER TABLE print_history MODIFY COLUMN examinee_no VARCHAR(30) NOT NULL`);

    const printHistoryIndexes = await query(`SHOW INDEX FROM print_history`);
    const legacyPrintHistoryIndexNames = Array.from(new Set(
      printHistoryIndexes
        .filter(
          (index) => String(index.Column_name || "") === "candidate_id" && String(index.Key_name || "") !== "PRIMARY",
        )
        .map((index) => String(index.Key_name || "")),
    ));

    for (const indexName of legacyPrintHistoryIndexNames) {
      if (!indexName) {
        continue;
      }

      await query(`ALTER TABLE print_history DROP INDEX \`${indexName}\``);
    }

    const hasExamineeNoIndex = printHistoryIndexes.some(
      (index) => String(index.Column_name || "") === "examinee_no",
    );
    const hasPrintedAtIndex = printHistoryIndexes.some(
      (index) => String(index.Column_name || "") === "printed_at",
    );

    if (!hasExamineeNoIndex) {
      await query(`ALTER TABLE print_history ADD KEY idx_print_history_examinee_no (examinee_no)`);
    }

    if (!hasPrintedAtIndex) {
      await query(`ALTER TABLE print_history ADD KEY idx_print_history_printed_at (printed_at)`);
    }

    const refreshedForeignKeys = await query(`
      SELECT
        CONSTRAINT_NAME AS constraintName,
        COLUMN_NAME AS columnName,
        REFERENCED_TABLE_NAME AS referencedTableName,
        REFERENCED_COLUMN_NAME AS referencedColumnName
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'print_history'
        AND COLUMN_NAME = 'examinee_no'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const hasExpectedForeignKey = refreshedForeignKeys.some(
      (foreignKey) => String(foreignKey.columnName || "") === "examinee_no"
        && String(foreignKey.referencedTableName || "") === "examinee"
        && String(foreignKey.referencedColumnName || "") === "examinee_no",
    );

    if (!hasExpectedForeignKey) {
      await query(`
        ALTER TABLE print_history
        ADD CONSTRAINT fk_print_history_examinee_no
        FOREIGN KEY (examinee_no) REFERENCES examinee (examinee_no)
        ON DELETE CASCADE
      `);
    }
  }

  async function ensureAccountSchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS accounts (
        login_id VARCHAR(100) NOT NULL PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL DEFAULT '',
        role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용',
        password_value VARCHAR(255) NOT NULL DEFAULT '${defaultInitialPassword}',
        password_temporary TINYINT(1) NOT NULL DEFAULT 1,
        last_login_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [displayNameColumns, roleColumns, passwordColumns, passwordTemporaryColumns, lastLoginColumns] = await Promise.all([
      query(`SHOW COLUMNS FROM accounts LIKE 'display_name'`),
      query(`SHOW COLUMNS FROM accounts LIKE 'role'`),
      query(`SHOW COLUMNS FROM accounts LIKE 'password_value'`),
      query(`SHOW COLUMNS FROM accounts LIKE 'password_temporary'`),
      query(`SHOW COLUMNS FROM accounts LIKE 'last_login_at'`),
    ]);

    if (Array.isArray(displayNameColumns) && displayNameColumns.length === 0) {
      await query(`ALTER TABLE accounts ADD COLUMN display_name VARCHAR(100) NOT NULL DEFAULT '' AFTER login_id`);
    }

    if (Array.isArray(roleColumns) && roleColumns.length === 0) {
      await query(
        `ALTER TABLE accounts ADD COLUMN role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용' AFTER display_name`,
      );
    }

    if (Array.isArray(passwordColumns) && passwordColumns.length === 0) {
      await query(
        `ALTER TABLE accounts ADD COLUMN password_value VARCHAR(255) NOT NULL DEFAULT '${defaultInitialPassword}' AFTER role`,
      );
    }

    if (Array.isArray(passwordTemporaryColumns) && passwordTemporaryColumns.length === 0) {
      await query(`ALTER TABLE accounts ADD COLUMN password_temporary TINYINT(1) NOT NULL DEFAULT 1 AFTER password_value`);
    }

    if (Array.isArray(lastLoginColumns) && lastLoginColumns.length === 0) {
      await query(`ALTER TABLE accounts ADD COLUMN last_login_at DATETIME NULL AFTER password_temporary`);
    }

    await migrateLegacyAccountPasswords();
  }

  async function ensureSystemSettingsSchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [settingValueColumn] = await query(`SHOW COLUMNS FROM system_settings LIKE 'setting_value'`);

    if (!String(settingValueColumn?.Type || "").toLowerCase().includes("text")) {
      await query(`ALTER TABLE system_settings MODIFY COLUMN setting_value MEDIUMTEXT NOT NULL`);
    }

    await query(
      `
        INSERT IGNORE INTO system_settings (setting_key, setting_value)
        VALUES
          ('initialPassword', ?),
          ('autoLogoutMinutes', ?)
      `,
      [defaultInitialPassword, String(defaultAutoLogoutMinutes)],
    );
  }

  return Object.freeze({
    ensureAccountSchema,
    ensureExamineeSchema,
    ensurePrintHistorySchema,
    ensureSystemSettingsSchema,
  });
}

module.exports = {
  createSchemaBootstrapService,
};
