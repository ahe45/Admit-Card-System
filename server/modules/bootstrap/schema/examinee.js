function createExamineeSchemaBootstrap({
  getTableColumns,
  hasColumn,
  hasTable,
  query,
}) {
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

  return Object.freeze({
    ensureExamineeSchema,
  });
}

module.exports = {
  createExamineeSchemaBootstrap,
};
