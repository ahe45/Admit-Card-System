function createAccountSchemaBootstrap({
  defaultInitialPassword,
  migrateLegacyAccountPasswords,
  query,
}) {
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

  return Object.freeze({
    ensureAccountSchema,
  });
}

module.exports = {
  createAccountSchemaBootstrap,
};
