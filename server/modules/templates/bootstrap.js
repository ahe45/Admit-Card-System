const { randomUUID } = require("crypto");

function createTemplateBootstrapService({
  defaultTemplateSeeds,
  normalizeTemplatePayload,
  query,
  templateLayoutSchemaVersion,
  templateTagSchemaVersion,
}) {
  async function ensureTemplateSchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',
        version_label VARCHAR(100) NOT NULL,
        status ENUM('used', 'unused') NOT NULL DEFAULT 'unused',
        content_html MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);

    const descriptionColumns = await query(`SHOW COLUMNS FROM templates LIKE 'description'`);

    if (Array.isArray(descriptionColumns) && descriptionColumns.length === 0) {
      await query(`
        ALTER TABLE templates
        ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '' AFTER name
      `);
    }
  }

  function migrateLegacyTemplateTagMarkup(contentHtml) {
    let nextMarkup = String(contentHtml || "");

    if (!nextMarkup) {
      return nextMarkup;
    }

    nextMarkup = nextMarkup
      .replaceAll("@{교시}", "@{시간}")
      .replaceAll("@교시", "@시간");

    nextMarkup = nextMarkup
      .replaceAll("@{전형}", "__ADMITCARD_LEGACY_TRACK_TOKEN__")
      .replaceAll("@전형", "__ADMITCARD_LEGACY_TRACK_TAG__")
      .replaceAll("@{시험}", "@{전형}")
      .replaceAll("@시험", "@전형")
      .replaceAll("__ADMITCARD_LEGACY_TRACK_TOKEN__", "@{모집시기}")
      .replaceAll("__ADMITCARD_LEGACY_TRACK_TAG__", "@모집시기");

    nextMarkup = nextMarkup
      .replaceAll("@{날짜}", "@{시험날짜}")
      .replaceAll("@날짜", "@시험날짜");

    return nextMarkup;
  }

  function migrateTemplateSeriesLayoutMarkup(contentHtml) {
    let nextMarkup = String(contentHtml || "");

    if (!nextMarkup || nextMarkup.includes("#계열")) {
      return nextMarkup;
    }

    nextMarkup = nextMarkup.replace('rowspan="6" colspan="1"', 'rowspan="7" colspan="1"');

    nextMarkup = nextMarkup.replace(
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">생년월일</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#생년월일<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">모집단위</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#모집단위<br></td>',
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">생년월일</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#생년월일<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">계&nbsp; &nbsp; &nbsp;열</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#계열<br></td>',
    );

    nextMarkup = nextMarkup.replace(
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">고사건물</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#고사건물<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">전 공 명</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#전공<br></td>',
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">고사건물</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#고사건물<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">모집단위</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#모집단위<br></td>',
    );

    nextMarkup = nextMarkup.replace(
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">고 사 실</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#고사실<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">시험날짜</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#시험날짜<br></td>',
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">고 사 실</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#고사실<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">전 공 명</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#전공<br></td>',
    );

    nextMarkup = nextMarkup.replace(
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">조</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#조<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">시&nbsp; &nbsp; 간</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#시간<br></td>',
      '<th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="" rowspan="2">조</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="" rowspan="2">#조<br></td>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">시험날짜</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#시험날짜<br></td>\n' +
        '          </tr>\n' +
        '          <tr>\n' +
        '            <th style="text-align: center; border: 1px solid rgb(0, 0, 0); padding: 12px 14px; background: rgb(246, 248, 252); vertical-align: top;" class="">시&nbsp; &nbsp; 간</th>\n' +
        '            <td style="border: 1px solid rgb(0, 0, 0); padding: 12px 14px; text-align: left; vertical-align: top;" class="">#시간<br></td>',
    );

    return nextMarkup;
  }

  function normalizeTemplateSeed(seed, status) {
    const id = String(seed?.id || `template-${randomUUID()}`).trim();

    return normalizeTemplatePayload(
      {
        name: seed?.name,
        description: seed?.description,
        version: seed?.version,
        status,
        contentHtml: migrateLegacyTemplateTagMarkup(seed?.contentHtml),
      },
      { id },
    );
  }

  async function seedTemplates() {
    const [templateSummary] = await query(`SELECT COUNT(*) AS totalTemplates FROM templates`);

    if (Number(templateSummary?.totalTemplates || 0) > 0) {
      return;
    }

    if (!Array.isArray(defaultTemplateSeeds) || defaultTemplateSeeds.length === 0) {
      return;
    }

    const hasUsedTemplate = defaultTemplateSeeds.some((template) => String(template?.status || "").trim() === "used");
    let usedTemplateAssigned = false;

    for (const [index, templateSeed] of defaultTemplateSeeds.entries()) {
      const shouldUseTemplate = hasUsedTemplate
        ? String(templateSeed?.status || "").trim() === "used" && !usedTemplateAssigned
        : index === 0;
      const template = normalizeTemplateSeed(templateSeed, shouldUseTemplate ? "used" : "unused");

      if (template.status === "used") {
        usedTemplateAssigned = true;
      }

      await query(
        `
          INSERT INTO templates (id, name, description, version_label, status, content_html)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [template.id, template.name, template.description, template.version, template.status, template.contentHtml],
      );
    }
  }

  async function migrateTemplateTagSchema() {
    const [schemaVersionRow] = await query(
      `
        SELECT setting_value AS settingValue
        FROM system_set
        WHERE setting_key = 'templateTagSchemaVersion'
      `,
    );

    if (String(schemaVersionRow?.settingValue || "") === templateTagSchemaVersion) {
      return;
    }

    const templates = await query(`
      SELECT
        id,
        content_html AS contentHtml
      FROM templates
    `);

    for (const template of templates) {
      const migratedContentHtml = migrateLegacyTemplateTagMarkup(template.contentHtml);

      if (migratedContentHtml === template.contentHtml) {
        continue;
      }

      await query(
        `
          UPDATE templates
          SET content_html = ?
          WHERE id = ?
        `,
        [migratedContentHtml, template.id],
      );
    }

    await query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES ('templateTagSchemaVersion', ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [templateTagSchemaVersion],
    );
  }

  async function migrateTemplateLayoutSchema() {
    const [schemaVersionRow] = await query(
      `
        SELECT setting_value AS settingValue
        FROM system_set
        WHERE setting_key = 'templateLayoutSchemaVersion'
      `,
    );

    if (String(schemaVersionRow?.settingValue || "") === templateLayoutSchemaVersion) {
      return;
    }

    const templates = await query(`
      SELECT
        id,
        content_html AS contentHtml
      FROM templates
    `);

    for (const template of templates) {
      const migratedContentHtml = migrateTemplateSeriesLayoutMarkup(template.contentHtml);

      if (migratedContentHtml === template.contentHtml) {
        continue;
      }

      await query(
        `
          UPDATE templates
          SET content_html = ?
          WHERE id = ?
        `,
        [migratedContentHtml, template.id],
      );
    }

    await query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES ('templateLayoutSchemaVersion', ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [templateLayoutSchemaVersion],
    );
  }

  return Object.freeze({
    ensureTemplateSchema,
    migrateLegacyTemplateTagMarkup,
    migrateTemplateLayoutSchema,
    migrateTemplateSeriesLayoutMarkup,
    migrateTemplateTagSchema,
    normalizeTemplateSeed,
    seedTemplates,
  });
}

module.exports = {
  createTemplateBootstrapService,
};
