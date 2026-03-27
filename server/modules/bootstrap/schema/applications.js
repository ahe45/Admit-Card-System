function createApplicantSchemaBootstrap({
  getTableColumns,
  hasColumn,
  hasTable,
  query,
}) {
  const applicantFieldInputTypeSql = "ENUM('text', 'textarea', 'select', 'date', 'birthdate', 'time', 'photo', 'phone', 'nationality')";
  const applicantSubmissionStatusSql = "ENUM('submitted', 'promoted')";

  async function renameLegacyTableIfNeeded(legacyTableName, nextTableName) {
    const legacyExists = typeof hasTable === "function" ? await hasTable(legacyTableName) : false;
    const nextExists = typeof hasTable === "function" ? await hasTable(nextTableName) : false;

    if (legacyExists && !nextExists) {
      await query(`RENAME TABLE ${legacyTableName} TO ${nextTableName}`);
    }
  }

  async function createApplicantSubmissionMetaTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS app_meta (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        promoted_examinee_no VARCHAR(30) NULL,
        promoted_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_app_meta_promoted (promoted_examinee_no)
      )
    `);
  }

  async function createApplicantSubmissionAnswerTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS app_subm (
        id BIGINT UNSIGNED NOT NULL,
        applicant_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NULL,
        status ${applicantSubmissionStatusSql} NOT NULL DEFAULT 'submitted',
        field_key VARCHAR(60) NOT NULL,
        answer_data MEDIUMTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id, field_key),
        KEY idx_app_subm_lookup (email, applicant_name, id),
        KEY idx_app_subm_status (status),
        KEY idx_app_subm_field_key (field_key)
      )
    `);
  }

  async function createApplicantRecruitmentUnitTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS app_unit (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        admission_code VARCHAR(30) NOT NULL,
        admission_name VARCHAR(100) NOT NULL,
        track_code VARCHAR(30) NOT NULL,
        track_name VARCHAR(100) NOT NULL,
        unit_code VARCHAR(30) NOT NULL,
        unit_name VARCHAR(100) NOT NULL,
        major_code VARCHAR(30) NOT NULL DEFAULT '',
        major_name VARCHAR(100) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_app_unit_codes (admission_code, track_code, unit_code, major_code),
        UNIQUE KEY uniq_app_unit_names (admission_name, track_name, unit_name, major_name),
        KEY idx_app_unit_sort_order (sort_order)
      )
    `);
  }

  function parseLegacyAnswerItems(rawAnswerItems = "") {
    if (!String(rawAnswerItems || "").trim()) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(String(rawAnswerItems || "[]"));
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (error) {
      return [];
    }
  }

  function buildMigratedApplicantAnswerData(answerItem = {}, legacyRow = {}) {
    const inputType = String(answerItem?.inputType || "text").trim();
    const answerValue = answerItem?.value;

    if (inputType !== "photo") {
      return String(answerValue ?? "").trim();
    }

    const normalizedPhotoValue =
      answerValue && typeof answerValue === "object"
        ? {
            fileName: String(answerValue.fileName || legacyRow.photoName || "").trim(),
            mimeType: String(answerValue.mimeType || legacyRow.photoMime || "").trim(),
            hasPhoto: answerValue.hasPhoto === true || Number(answerValue.hasPhoto) === 1 || Boolean(legacyRow.photoBase64),
            base64: String(legacyRow.photoBase64 || "").trim(),
          }
        : {
            fileName: String(legacyRow.photoName || "").trim(),
            mimeType: String(legacyRow.photoMime || "").trim(),
            hasPhoto: Boolean(legacyRow.photoBase64),
            base64: String(legacyRow.photoBase64 || "").trim(),
          };

    return JSON.stringify(normalizedPhotoValue);
  }

  async function migrateLegacyApplicantSubmissionsTable() {
    const legacyTableName = `app_subm_legacy_${Date.now()}`;
    const legacyRows = await query(`
      SELECT
        id,
        applicant_name AS applicantName,
        email,
        password_hash AS passwordHash,
        status,
        answers_json AS answersJson,
        promoted_examinee_no AS promotedExamineeNo,
        photo_name AS photoName,
        photo_mime AS photoMime,
        TO_BASE64(photo_blob) AS photoBase64,
        created_at AS createdAt,
        updated_at AS updatedAt,
        promoted_at AS promotedAt
      FROM app_subm
      ORDER BY id ASC
    `);

    await query(`RENAME TABLE app_subm TO ${legacyTableName}`);
    await createApplicantSubmissionMetaTable();
    await createApplicantSubmissionAnswerTable();

    for (const legacyRow of Array.isArray(legacyRows) ? legacyRows : []) {
      const submissionId = Number(legacyRow?.id || 0);

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        continue;
      }

      await query(
        `
          INSERT INTO app_meta (
            id,
            promoted_examinee_no,
            promoted_at
          )
          VALUES (?, ?, ?)
        `,
        [
          submissionId,
          String(legacyRow?.promotedExamineeNo || "").trim() || null,
          legacyRow?.promotedAt || null,
        ],
      );

      const answerItems = parseLegacyAnswerItems(legacyRow?.answersJson)
        .map((answerItem) => ({
          fieldKey: String(answerItem?.fieldKey || "").trim(),
          answerData: buildMigratedApplicantAnswerData(answerItem, legacyRow),
        }))
        .filter((answerItem) => answerItem.fieldKey);

      for (const answerItem of answerItems) {
        await query(
          `
            INSERT INTO app_subm (
              id,
              applicant_name,
              email,
              password_hash,
              status,
              field_key,
              answer_data,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            submissionId,
            String(legacyRow?.applicantName || "").trim(),
            String(legacyRow?.email || "").trim(),
            String(legacyRow?.passwordHash || "").trim() || null,
            String(legacyRow?.status || "submitted").trim() || "submitted",
            answerItem.fieldKey,
            answerItem.answerData,
            legacyRow?.createdAt || new Date(),
            legacyRow?.updatedAt || legacyRow?.createdAt || new Date(),
          ],
        );
      }
    }
  }

  async function ensureApplicantUnitSchema() {
    await createApplicantRecruitmentUnitTable();

    const applicantUnitColumns = await getTableColumns("app_unit");

    if (hasColumn(applicantUnitColumns, "series_code") && !hasColumn(applicantUnitColumns, "track_code")) {
      await query(`ALTER TABLE app_unit CHANGE COLUMN series_code track_code VARCHAR(30) NOT NULL`);
    }

    if (hasColumn(applicantUnitColumns, "series_name") && !hasColumn(applicantUnitColumns, "track_name")) {
      await query(`ALTER TABLE app_unit CHANGE COLUMN series_name track_name VARCHAR(100) NOT NULL`);
    }

    const refreshedApplicantUnitColumns = await getTableColumns("app_unit");

    if (!hasColumn(refreshedApplicantUnitColumns, "major_code")) {
      await query(`ALTER TABLE app_unit ADD COLUMN major_code VARCHAR(30) NOT NULL DEFAULT '' AFTER unit_name`);
    }

    if (!hasColumn(refreshedApplicantUnitColumns, "major_name")) {
      await query(`ALTER TABLE app_unit ADD COLUMN major_name VARCHAR(100) NOT NULL DEFAULT '' AFTER major_code`);
    }

    const appUnitIndexes = await query(`SHOW INDEX FROM app_unit`);
    const legacyIndexNames = ["uniq_applicant_recruitment_unit_codes", "uniq_applicant_recruitment_unit_names", "idx_applicant_recruitment_units_sort_order"];

    for (const legacyIndexName of legacyIndexNames) {
      if (appUnitIndexes.some((index) => String(index.Key_name || "") === legacyIndexName)) {
        await query(`ALTER TABLE app_unit DROP INDEX \`${legacyIndexName}\``);
      }
    }

    const refreshedIndexes = await query(`SHOW INDEX FROM app_unit`);
    const hasCodeIndex = refreshedIndexes.some((index) => String(index.Key_name || "") === "uniq_app_unit_codes");
    const hasNameIndex = refreshedIndexes.some((index) => String(index.Key_name || "") === "uniq_app_unit_names");
    const hasSortIndex = refreshedIndexes.some((index) => String(index.Key_name || "") === "idx_app_unit_sort_order");

    if (!hasCodeIndex) {
      await query(`ALTER TABLE app_unit ADD UNIQUE KEY uniq_app_unit_codes (admission_code, track_code, unit_code, major_code)`);
    }

    if (!hasNameIndex) {
      await query(`ALTER TABLE app_unit ADD UNIQUE KEY uniq_app_unit_names (admission_name, track_name, unit_name, major_name)`);
    }

    if (!hasSortIndex) {
      await query(`ALTER TABLE app_unit ADD KEY idx_app_unit_sort_order (sort_order)`);
    }
  }

  async function ensureApplicantFormSchema() {
    await query(`
      CREATE TABLE IF NOT EXISTS app_form (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        field_key VARCHAR(60) NOT NULL,
        question_text VARCHAR(255) NOT NULL,
        question_description VARCHAR(500) NOT NULL DEFAULT '',
        input_type ${applicantFieldInputTypeSql} NOT NULL DEFAULT 'text',
        system_field_key VARCHAR(40) NOT NULL DEFAULT '',
        options_json TEXT NULL,
        required TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_app_form_field_key (field_key),
        KEY idx_app_form_sort_order (sort_order)
      )
    `);

    if (typeof getTableColumns === "function" && typeof hasColumn === "function") {
      const applicantFieldColumns = await getTableColumns("app_form");
      const inputTypeColumn = applicantFieldColumns.find((column) => String(column.Field || "") === "input_type");

      if (!hasColumn(applicantFieldColumns, "question_description")) {
        await query(`ALTER TABLE app_form ADD COLUMN question_description VARCHAR(500) NOT NULL DEFAULT '' AFTER question_text`);
      }

      if (!String(inputTypeColumn?.Type || "").includes("'phone'") || !String(inputTypeColumn?.Type || "").includes("'nationality'")) {
        await query(`ALTER TABLE app_form MODIFY COLUMN input_type ${applicantFieldInputTypeSql} NOT NULL DEFAULT 'text'`);
      }
    } else {
      const [descriptionColumn] = await query(`SHOW COLUMNS FROM app_form LIKE 'question_description'`);
      const [inputTypeColumn] = await query(`SHOW COLUMNS FROM app_form LIKE 'input_type'`);

      if (!descriptionColumn) {
        await query(`ALTER TABLE app_form ADD COLUMN question_description VARCHAR(500) NOT NULL DEFAULT '' AFTER question_text`);
      }

      if (!String(inputTypeColumn?.Type || "").includes("'phone'") || !String(inputTypeColumn?.Type || "").includes("'nationality'")) {
        await query(`ALTER TABLE app_form MODIFY COLUMN input_type ${applicantFieldInputTypeSql} NOT NULL DEFAULT 'text'`);
      }
    }
  }

  async function ensureApplicantSubmissionSchema() {
    let applicantSubmissionColumns = [];
    let applicantSubmissionTableExists = false;

    if (typeof hasTable === "function") {
      applicantSubmissionTableExists = await hasTable("app_subm");
    } else {
      const applicantSubmissionTables = await query(`SHOW TABLES LIKE 'app_subm'`);
      applicantSubmissionTableExists = Array.isArray(applicantSubmissionTables) && applicantSubmissionTables.length > 0;
    }

    if (applicantSubmissionTableExists) {
      if (typeof getTableColumns === "function") {
        applicantSubmissionColumns = await getTableColumns("app_subm");
      } else {
        applicantSubmissionColumns = await query(`SHOW COLUMNS FROM app_subm`);
      }
    }

    const hasLegacyApplicantSubmissionSchema = applicantSubmissionColumns.some((column) => String(column?.Field || "") === "answers_json");

    if (applicantSubmissionTableExists && hasLegacyApplicantSubmissionSchema) {
      await migrateLegacyApplicantSubmissionsTable();
    } else {
      await createApplicantSubmissionMetaTable();
      await createApplicantSubmissionAnswerTable();
    }

    if (typeof getTableColumns === "function" && typeof hasColumn === "function") {
      applicantSubmissionColumns = await getTableColumns("app_subm");

      if (!hasColumn(applicantSubmissionColumns, "password_hash")) {
        await query(`ALTER TABLE app_subm ADD COLUMN password_hash VARCHAR(255) NULL AFTER email`);
      }

      const statusColumn = applicantSubmissionColumns.find((column) => String(column.Field || "") === "status");

      if (!String(statusColumn?.Type || "").includes("'promoted'")) {
        await query(`ALTER TABLE app_subm MODIFY COLUMN status ${applicantSubmissionStatusSql} NOT NULL DEFAULT 'submitted'`);
      }
    } else {
      const [passwordHashColumn] = await query(`SHOW COLUMNS FROM app_subm LIKE 'password_hash'`);
      const [statusColumn] = await query(`SHOW COLUMNS FROM app_subm LIKE 'status'`);

      if (!passwordHashColumn) {
        await query(`ALTER TABLE app_subm ADD COLUMN password_hash VARCHAR(255) NULL AFTER email`);
      }

      if (!String(statusColumn?.Type || "").includes("'promoted'")) {
        await query(`ALTER TABLE app_subm MODIFY COLUMN status ${applicantSubmissionStatusSql} NOT NULL DEFAULT 'submitted'`);
      }
    }
  }

  async function ensureApplicantSchema() {
    await renameLegacyTableIfNeeded("applicant_form_fields", "app_form");
    await renameLegacyTableIfNeeded("applicant_submission_meta", "app_meta");
    await renameLegacyTableIfNeeded("applicant_submissions", "app_subm");
    await renameLegacyTableIfNeeded("applicant_recruitment_units", "app_unit");
    await renameLegacyTableIfNeeded("applicant_email_verifications", "app_email_log");

    await ensureApplicantFormSchema();
    await ensureApplicantUnitSchema();
    await ensureApplicantSubmissionSchema();

    await query(`
      CREATE TABLE IF NOT EXISTS app_email_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        applicant_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        code_value VARCHAR(12) NOT NULL,
        expires_at DATETIME NOT NULL,
        verified_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_app_email_log_lookup (email, applicant_name),
        KEY idx_app_email_log_expires (expires_at)
      )
    `);
  }

  return Object.freeze({
    ensureApplicantSchema,
  });
}

module.exports = {
  createApplicantSchemaBootstrap,
};
