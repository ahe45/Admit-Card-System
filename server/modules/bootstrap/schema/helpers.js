function createSchemaQueryHelpers({ query }) {
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

  return Object.freeze({
    getTableColumns,
    hasColumn,
    hasTable,
    isSafeSqlIdentifier,
  });
}

module.exports = {
  createSchemaQueryHelpers,
};
