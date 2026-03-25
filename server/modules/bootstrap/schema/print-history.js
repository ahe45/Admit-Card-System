function createPrintHistorySchemaBootstrap({
  getTableColumns,
  hasColumn,
  query,
}) {
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

  return Object.freeze({
    ensurePrintHistorySchema,
  });
}

module.exports = {
  createPrintHistorySchemaBootstrap,
};
