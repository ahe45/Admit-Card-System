function createSchemaQueryHelpers({ query }) {
  function isSafeSqlIdentifier(identifier) {
    return /^[A-Za-z0-9_]+$/.test(String(identifier || ""));
  }

  function escapeSqlString(value = "") {
    return String(value ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "''");
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

  async function getDetailedTableColumns(tableName) {
    if (!isSafeSqlIdentifier(tableName)) {
      throw new Error(`Unsafe SQL identifier: ${tableName}`);
    }

    return query(
      `
        SELECT
          COLUMN_NAME AS columnName,
          COLUMN_TYPE AS columnType,
          IS_NULLABLE AS isNullable,
          COLUMN_DEFAULT AS columnDefault,
          EXTRA AS extra,
          COLUMN_COMMENT AS columnComment,
          CHARACTER_SET_NAME AS characterSetName,
          COLLATION_NAME AS collationName
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `,
      [tableName],
    );
  }

  async function getDetailedTable(tableName) {
    if (!isSafeSqlIdentifier(tableName)) {
      throw new Error(`Unsafe SQL identifier: ${tableName}`);
    }

    const rows = await query(
      `
        SELECT
          TABLE_NAME AS tableName,
          TABLE_COMMENT AS tableComment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
      `,
      [tableName],
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  function normalizeColumnDefaultValue(columnDefault) {
    if (columnDefault === null || typeof columnDefault === "undefined") {
      return null;
    }

    const normalizedValue = String(columnDefault);

    if (normalizedValue.toUpperCase() === "NULL") {
      return null;
    }

    if (/^'.*'$/.test(normalizedValue)) {
      return normalizedValue.slice(1, -1).replace(/''/g, "'");
    }

    return normalizedValue;
  }

  function formatColumnDefaultClause(column = {}) {
    const normalizedExtra = String(column?.extra || "").toLowerCase();

    if (normalizedExtra.includes("auto_increment")) {
      return "";
    }

    const normalizedDefault = normalizeColumnDefaultValue(column?.columnDefault);

    if (normalizedDefault === null) {
      return String(column?.isNullable || "YES") === "YES" ? " DEFAULT NULL" : "";
    }

    if (/^current_timestamp(?:\(\))?$/i.test(normalizedDefault)) {
      return " DEFAULT CURRENT_TIMESTAMP";
    }

    if (/^-?\d+(?:\.\d+)?$/i.test(normalizedDefault)) {
      return ` DEFAULT ${normalizedDefault}`;
    }

    return ` DEFAULT '${escapeSqlString(normalizedDefault)}'`;
  }

  function formatColumnCharacterSetClause(column = {}) {
    const characterSetName = String(column?.characterSetName || "").trim();
    const collationName = String(column?.collationName || "").trim();
    const clauses = [];

    if (characterSetName) {
      clauses.push(`CHARACTER SET ${characterSetName}`);
    }

    if (collationName) {
      clauses.push(`COLLATE ${collationName}`);
    }

    return clauses.length > 0 ? ` ${clauses.join(" ")}` : "";
  }

  function formatColumnExtraClause(column = {}) {
    const normalizedExtra = String(column?.extra || "").trim();

    if (!normalizedExtra) {
      return "";
    }

    return ` ${normalizedExtra
      .replace(/current_timestamp\(\)/gi, "CURRENT_TIMESTAMP")
      .replace(/\bon update\b/gi, "ON UPDATE")
      .replace(/\bauto_increment\b/gi, "AUTO_INCREMENT")}`;
  }

  function buildCommentedColumnDefinition(column = {}, comment = "") {
    const columnName = String(column?.columnName || "").trim();

    if (!isSafeSqlIdentifier(columnName)) {
      throw new Error(`Unsafe SQL identifier: ${columnName}`);
    }

    return `${`\`${columnName}\``} ${String(column?.columnType || "").trim()}${formatColumnCharacterSetClause(column)}${
      String(column?.isNullable || "YES") === "NO" ? " NOT NULL" : " NULL"
    }${formatColumnDefaultClause(column)}${formatColumnExtraClause(column)} COMMENT '${escapeSqlString(comment)}'`;
  }

  async function syncColumnComments(commentMapByTable = {}) {
    for (const [tableName, columnCommentMap] of Object.entries(commentMapByTable || {})) {
      if (!isSafeSqlIdentifier(tableName) || !(await hasTable(tableName))) {
        continue;
      }

      const columns = await getDetailedTableColumns(tableName);
      const columnsByName = new Map(
        (Array.isArray(columns) ? columns : []).map((column) => [String(column?.columnName || ""), column]),
      );
      const modifyClauses = [];

      Object.entries(columnCommentMap || {}).forEach(([columnName, comment]) => {
        const column = columnsByName.get(String(columnName || ""));

        if (!column) {
          return;
        }

        if (String(column.columnComment || "") === String(comment || "")) {
          return;
        }

        modifyClauses.push(`MODIFY COLUMN ${buildCommentedColumnDefinition(column, comment)}`);
      });

      if (modifyClauses.length === 0) {
        continue;
      }

      await query(`ALTER TABLE \`${tableName}\`\n${modifyClauses.join(",\n")}`);
    }
  }

  async function syncTableComments(tableCommentMap = {}) {
    for (const [tableName, comment] of Object.entries(tableCommentMap || {})) {
      if (!isSafeSqlIdentifier(tableName) || !(await hasTable(tableName))) {
        continue;
      }

      const table = await getDetailedTable(tableName);

      if (!table || String(table.tableComment || "") === String(comment || "")) {
        continue;
      }

      await query(`ALTER TABLE \`${tableName}\` COMMENT = '${escapeSqlString(comment)}'`);
    }
  }

  return Object.freeze({
    getDetailedTable,
    getDetailedTableColumns,
    getTableColumns,
    hasColumn,
    hasTable,
    isSafeSqlIdentifier,
    syncColumnComments,
    syncTableComments,
  });
}

module.exports = {
  createSchemaQueryHelpers,
};
