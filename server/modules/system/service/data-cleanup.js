function createSystemDataCleanupService({
  applicantFileStorageDirName = "uploads/file",
  applicantPhotoStorageDirName = "uploads/photo",
  createHttpError,
  examineePhotoStorageDirName = "photo",
  rootDir = process.cwd(),
  fs,
  path,
  getPool,
  query,
}) {
  const applicantFileStorageDirectoryPath = path.join(rootDir, applicantFileStorageDirName);
  const applicantPhotoStorageDirectoryPath = path.join(rootDir, applicantPhotoStorageDirName);
  const legacyApplicantPhotoStorageDirectoryPath = path.join(rootDir, "uploads", "applicant-photos");
  const examineePhotoStorageDirectoryPath = path.join(rootDir, examineePhotoStorageDirName);
  const autoIncrementTableNames = new Set(["app_meta", "app_unit", "app_schedule", "app_assign", "app_email_log", "examinee", "print_log", "app_form"]);

  function toSqlIdentifier(value = "") {
    return `\`${String(value || "").replaceAll("`", "``")}\``;
  }

  async function resetAutoIncrementCounters(queryable, tableNames = []) {
    const normalizedTableNames = [...new Set((Array.isArray(tableNames) ? tableNames : []).map((tableName) => String(tableName || "").trim()).filter(Boolean))];

    for (const tableName of normalizedTableNames) {
      if (!autoIncrementTableNames.has(tableName)) {
        continue;
      }

      await queryable(`ALTER TABLE ${toSqlIdentifier(tableName)} AUTO_INCREMENT = 1`);
    }
  }

  function normalizeSystemDataDeleteScope(scope) {
    const normalizedScope = String(scope || "").trim().toLowerCase();

    if (!["all", "applicant-settings", "applicant-assignments", "applicant-history", "examinees", "photos", "print-history"].includes(normalizedScope)) {
      throw createHttpError(400, "지원하지 않는 데이터 삭제 범위입니다.", "SYSTEM_DATA_SCOPE_INVALID");
    }

    return normalizedScope;
  }

  async function clearStoredFiles(directoryPath) {
    if (!fs || !path) {
      return;
    }

    try {
      const entryNames = await fs.promises.readdir(directoryPath, { withFileTypes: true });

      await Promise.all(
        entryNames.map((entry) => {
          const entryPath = path.join(directoryPath, entry.name);

          if (entry.isDirectory()) {
            return fs.promises.rm(entryPath, { recursive: true, force: true });
          }

          return fs.promises.unlink(entryPath);
        }),
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async function clearApplicantStoredPhotoFiles() {
    await Promise.all([
      clearStoredFiles(applicantPhotoStorageDirectoryPath),
      clearStoredFiles(legacyApplicantPhotoStorageDirectoryPath),
    ]);
  }

  async function clearApplicantStoredFileUploads() {
    await clearStoredFiles(applicantFileStorageDirectoryPath);
  }

  async function clearExamineeStoredPhotoFiles() {
    await clearStoredFiles(examineePhotoStorageDirectoryPath);
  }

  async function deleteAllSystemData() {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [examineeSummaryRows] = await connection.query(`
        SELECT
          COUNT(*) AS examineeCount,
          SUM(CASE WHEN photo_name IS NOT NULL OR photo_mime IS NOT NULL THEN 1 ELSE 0 END) AS photoCount
        FROM examinee
      `);
      const [printHistorySummaryRows] = await connection.query(`
        SELECT COUNT(*) AS printHistoryCount
        FROM print_log
      `);
      const [applicantSettingsSummaryRows] = await connection.query(`
        SELECT COUNT(*) AS applicantSettingsCount
        FROM app_unit
      `);
      const [applicantAssignmentSummaryRows] = await connection.query(`
        SELECT COUNT(*) AS applicantAssignmentCount
        FROM app_assign
      `);
      const [applicantSubmissionSummaryRows] = await connection.query(`
        SELECT COUNT(DISTINCT id) AS applicantSubmissionCount
        FROM app_subm
      `);

      await connection.query(`DELETE FROM app_unit`);
      await connection.query(`DELETE FROM app_schedule`);
      await connection.query(`DELETE FROM app_assign`);
      await connection.query(`DELETE FROM print_log`);
      await connection.query(`DELETE FROM app_subm`);
      await connection.query(`DELETE FROM app_meta`);
      await connection.query(`DELETE FROM app_email_log`);
      await connection.query(`DELETE FROM examinee`);
      await connection.commit();
      await resetAutoIncrementCounters(connection.query.bind(connection), [
        "app_unit",
        "app_schedule",
        "app_assign",
        "print_log",
        "app_meta",
        "app_email_log",
        "examinee",
      ]);
      await Promise.all([clearApplicantStoredPhotoFiles(), clearApplicantStoredFileUploads(), clearExamineeStoredPhotoFiles()]);

      return {
        scope: "all",
        deletedExaminees: Number(examineeSummaryRows?.[0]?.examineeCount || 0),
        deletedPhotos: Number(examineeSummaryRows?.[0]?.photoCount || 0),
        deletedApplicantSettings: Number(applicantSettingsSummaryRows?.[0]?.applicantSettingsCount || 0),
        deletedApplicantAssignments: Number(applicantAssignmentSummaryRows?.[0]?.applicantAssignmentCount || 0),
        deletedPrintHistory: Number(printHistorySummaryRows?.[0]?.printHistoryCount || 0),
        deletedApplicantSubmissions: Number(applicantSubmissionSummaryRows?.[0]?.applicantSubmissionCount || 0),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function deleteCandidatePhotoData() {
    const [summary] = await query(`
      SELECT COUNT(*) AS photoCount
      FROM examinee
      WHERE photo_name IS NOT NULL OR photo_mime IS NOT NULL
    `);

    await query(`
      UPDATE examinee
      SET
        photo_name = NULL,
        photo_mime = NULL
      WHERE photo_name IS NOT NULL OR photo_mime IS NOT NULL
    `);
    await clearExamineeStoredPhotoFiles();

    return {
      scope: "photos",
      deletedExaminees: 0,
      deletedPhotos: Number(summary?.photoCount || 0),
      deletedApplicantSettings: 0,
      deletedApplicantAssignments: 0,
      deletedPrintHistory: 0,
      deletedApplicantSubmissions: 0,
    };
  }

  async function deleteExamineeData() {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [examineeSummaryRows] = await connection.query(`
        SELECT
          COUNT(*) AS examineeCount,
          SUM(CASE WHEN photo_name IS NOT NULL OR photo_mime IS NOT NULL THEN 1 ELSE 0 END) AS photoCount
        FROM examinee
      `);
      const [printHistorySummaryRows] = await connection.query(`
        SELECT COUNT(*) AS printHistoryCount
        FROM print_log
      `);

      await connection.query(`DELETE FROM examinee`);
      await connection.commit();
      await resetAutoIncrementCounters(connection.query.bind(connection), ["examinee", "print_log"]);
      await clearExamineeStoredPhotoFiles();

      return {
        scope: "examinees",
        deletedExaminees: Number(examineeSummaryRows?.[0]?.examineeCount || 0),
        deletedPhotos: Number(examineeSummaryRows?.[0]?.photoCount || 0),
        deletedApplicantSettings: 0,
        deletedApplicantAssignments: 0,
        deletedPrintHistory: Number(printHistorySummaryRows?.[0]?.printHistoryCount || 0),
        deletedApplicantSubmissions: 0,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function deleteApplicantSettingsData() {
    const [summary] = await query(`
      SELECT COUNT(*) AS applicantSettingsCount
      FROM app_unit
    `);

    await query(`DELETE FROM app_unit`);
    await query(`DELETE FROM app_schedule`);
    await resetAutoIncrementCounters(query, ["app_unit", "app_schedule"]);

    return {
      scope: "applicant-settings",
      deletedExaminees: 0,
      deletedPhotos: 0,
      deletedApplicantSettings: Number(summary?.applicantSettingsCount || 0),
      deletedApplicantAssignments: 0,
      deletedPrintHistory: 0,
      deletedApplicantSubmissions: 0,
    };
  }

  async function deleteApplicantAssignmentData() {
    const [summary] = await query(`
      SELECT COUNT(*) AS applicantAssignmentCount
      FROM app_assign
    `);

    await query(`DELETE FROM app_assign`);
    await resetAutoIncrementCounters(query, ["app_assign"]);

    return {
      scope: "applicant-assignments",
      deletedExaminees: 0,
      deletedPhotos: 0,
      deletedApplicantSettings: 0,
      deletedApplicantAssignments: Number(summary?.applicantAssignmentCount || 0),
      deletedPrintHistory: 0,
      deletedApplicantSubmissions: 0,
    };
  }

  async function deletePrintHistoryData() {
    const [summary] = await query(`
      SELECT COUNT(*) AS printHistoryCount
      FROM print_log
    `);

    await query(`DELETE FROM print_log`);
    await resetAutoIncrementCounters(query, ["print_log"]);

    return {
      scope: "print-history",
      deletedExaminees: 0,
      deletedPhotos: 0,
      deletedApplicantSettings: 0,
      deletedApplicantAssignments: 0,
      deletedPrintHistory: Number(summary?.printHistoryCount || 0),
      deletedApplicantSubmissions: 0,
    };
  }

  async function deleteApplicantHistoryData() {
    const [summary] = await query(`
      SELECT COUNT(DISTINCT id) AS applicantSubmissionCount
      FROM app_subm
    `);

    await query(`DELETE FROM app_subm`);
    await query(`DELETE FROM app_meta`);
    await query(`DELETE FROM app_email_log`);
    await resetAutoIncrementCounters(query, ["app_meta", "app_email_log"]);
    await Promise.all([clearApplicantStoredPhotoFiles(), clearApplicantStoredFileUploads()]);

    return {
      scope: "applicant-history",
      deletedExaminees: 0,
      deletedPhotos: 0,
      deletedApplicantSettings: 0,
      deletedApplicantAssignments: 0,
      deletedPrintHistory: 0,
      deletedApplicantSubmissions: Number(summary?.applicantSubmissionCount || 0),
    };
  }

  async function deleteSystemData(scope) {
    const normalizedScope = normalizeSystemDataDeleteScope(scope);

    if (normalizedScope === "all") {
      return deleteAllSystemData();
    }

    if (normalizedScope === "photos") {
      return deleteCandidatePhotoData();
    }

    if (normalizedScope === "examinees") {
      return deleteExamineeData();
    }

    if (normalizedScope === "applicant-settings") {
      return deleteApplicantSettingsData();
    }

    if (normalizedScope === "applicant-assignments") {
      return deleteApplicantAssignmentData();
    }

    if (normalizedScope === "applicant-history") {
      return deleteApplicantHistoryData();
    }

    return deletePrintHistoryData();
  }

  return Object.freeze({
    deleteSystemData,
    normalizeSystemDataDeleteScope,
  });
}

module.exports = {
  createSystemDataCleanupService,
};
