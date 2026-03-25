function createSystemSettingsSchemaBootstrap({
  defaultAutoLogoutMinutes,
  defaultInitialPassword,
  query,
}) {
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
    ensureSystemSettingsSchema,
  });
}

module.exports = {
  createSystemSettingsSchemaBootstrap,
};
