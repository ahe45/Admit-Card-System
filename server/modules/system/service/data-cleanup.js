function createSystemDataCleanupService({
  createHttpError,
  getPool,
  query,
}) {
  function normalizeSystemDataDeleteScope(scope) {
    const normalizedScope = String(scope || "").trim().toLowerCase();

    if (!["all", "photos", "print-history"].includes(normalizedScope)) {
      throw createHttpError(400, "지원하지 않는 데이터 삭제 범위입니다.", "SYSTEM_DATA_SCOPE_INVALID");
    }

    return normalizedScope;
  }

  async function deleteAllSystemData() {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [examineeSummaryRows] = await connection.query(`
        SELECT
          COUNT(*) AS examineeCount,
          SUM(CASE WHEN photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL THEN 1 ELSE 0 END) AS photoCount
        FROM examinee
      `);
      const [printHistorySummaryRows] = await connection.query(`
        SELECT COUNT(*) AS printHistoryCount
        FROM print_history
      `);

      await connection.query(`DELETE FROM examinee`);
      await connection.commit();

      return {
        scope: "all",
        deletedExaminees: Number(examineeSummaryRows?.[0]?.examineeCount || 0),
        deletedPhotos: Number(examineeSummaryRows?.[0]?.photoCount || 0),
        deletedPrintHistory: Number(printHistorySummaryRows?.[0]?.printHistoryCount || 0),
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
      WHERE photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL
    `);

    await query(`
      UPDATE examinee
      SET
        photo_name = NULL,
        photo_mime = NULL,
        photo_blob = NULL
      WHERE photo_blob IS NOT NULL OR photo_name IS NOT NULL OR photo_mime IS NOT NULL
    `);

    return {
      scope: "photos",
      deletedExaminees: 0,
      deletedPhotos: Number(summary?.photoCount || 0),
      deletedPrintHistory: 0,
    };
  }

  async function deletePrintHistoryData() {
    const [summary] = await query(`
      SELECT COUNT(*) AS printHistoryCount
      FROM print_history
    `);

    await query(`DELETE FROM print_history`);

    return {
      scope: "print-history",
      deletedExaminees: 0,
      deletedPhotos: 0,
      deletedPrintHistory: Number(summary?.printHistoryCount || 0),
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
