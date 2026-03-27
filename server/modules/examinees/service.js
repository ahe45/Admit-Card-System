const { createExamineePhotoService } = require("./photos");
const { normalizeExamineeRecord } = require("./record");
const { createExamineeWorkbookService } = require("./workbook");

function createExamineeService({ createHttpError, getPool, query }) {
  const examineePhotoService = createExamineePhotoService({
    createHttpError,
    getPool,
    normalizeExamineeRecord,
    query,
  });
  const examineeWorkbookService = createExamineeWorkbookService({ createHttpError });
  const {
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    normalizeExamineeInput,
    parseExamineeWorkbook,
  } = examineeWorkbookService;
  const {
    getExamineePhoto,
    saveExamineePhoto,
    saveExamineePhotoArchive,
    saveExamineePhotoArchiveBuffer,
  } = examineePhotoService;

  async function getExaminees() {
    const rows = await query(`
      SELECT
        DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
        \`group\` AS \`group\`,
        \`time\` AS \`time\`,
        track,
        admission,
        series,
        unit,
        major,
        building,
        room,
        examinee_no AS examineeNo,
        name,
        DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
        CASE WHEN photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
        UNIX_TIMESTAMP(updated_at) AS photoVersion
      FROM examinee
      ORDER BY exam_date, \`group\`, \`time\`, examinee_no
    `);

    return rows.map(normalizeExamineeRecord);
  }

  async function getPrintHistory() {
    const rows = await query(`
      SELECT
        ph.id AS historyId,
        DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS date,
        e.\`group\` AS \`group\`,
        e.\`time\` AS \`time\`,
        e.track,
        e.admission,
        e.series,
        e.unit,
        e.major,
        e.building,
        e.room,
        e.examinee_no AS examineeNo,
        e.name,
        DATE_FORMAT(e.birth_date, '%Y-%m-%d') AS birth,
        CASE WHEN e.photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
        DATE_FORMAT(ph.printed_at, '%Y-%m-%d %H:%i:%s') AS printedAt
      FROM print_log ph
      INNER JOIN examinee e ON e.examinee_no = ph.examinee_no
      ORDER BY ph.printed_at DESC, ph.id DESC
    `);

    return rows.map(normalizeExamineeRecord);
  }

  async function saveExamineeRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createHttpError(400, "업로드할 수험생 데이터가 없습니다.");
    }

    const normalizedRows = rows.map(normalizeExamineeInput);
    const values = normalizedRows.map((row) => [
      row.date,
      row.group,
      row.time,
      row.track,
      row.admission,
      row.series,
      row.unit,
      row.major,
      row.building,
      row.room,
      row.examineeNo,
      row.name,
      row.birth,
    ]);

    await getPool().query(
      `
        INSERT INTO examinee (
          exam_date,
          \`group\`,
          \`time\`,
          track,
          admission,
          series,
          unit,
          major,
          building,
          room,
          examinee_no,
          name,
          birth_date
        )
        VALUES ?
        ON DUPLICATE KEY UPDATE
          exam_date = VALUES(exam_date),
          \`group\` = VALUES(\`group\`),
          \`time\` = VALUES(\`time\`),
          track = VALUES(track),
          admission = VALUES(admission),
          series = VALUES(series),
          unit = VALUES(unit),
          major = VALUES(major),
          building = VALUES(building),
          room = VALUES(room),
          name = VALUES(name),
          birth_date = VALUES(birth_date)
      `,
      [values],
    );

    return {
      processed: normalizedRows.length,
    };
  }

  async function updateExaminee(examineeNo, payload = {}) {
    const originalExamineeNo = String(examineeNo || "").trim();

    if (!originalExamineeNo) {
      throw createHttpError(400, "수정할 수험번호가 필요합니다.");
    }

    const normalizedRow = normalizeExamineeInput(payload, -1);
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ? FOR UPDATE`, [
        originalExamineeNo,
      ]);

      if (existingRows.length === 0) {
        throw createHttpError(404, "수정할 수험생 정보를 찾을 수 없습니다.");
      }

      await connection.query(
        `
          UPDATE examinee
          SET
            exam_date = ?,
            \`group\` = ?,
            \`time\` = ?,
            track = ?,
            admission = ?,
            series = ?,
            unit = ?,
            major = ?,
            building = ?,
            room = ?,
            examinee_no = ?,
            name = ?,
            birth_date = ?
          WHERE examinee_no = ?
        `,
        [
          normalizedRow.date,
          normalizedRow.group,
          normalizedRow.time,
          normalizedRow.track,
          normalizedRow.admission,
          normalizedRow.series,
          normalizedRow.unit,
          normalizedRow.major,
          normalizedRow.building,
          normalizedRow.room,
          normalizedRow.examineeNo,
          normalizedRow.name,
          normalizedRow.birth,
          originalExamineeNo,
        ],
      );

      const [updatedRows] = await connection.query(
        `
          SELECT
            DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
            \`group\` AS \`group\`,
            \`time\` AS \`time\`,
            track,
            admission,
            series,
            unit,
            major,
            building,
            room,
            examinee_no AS examineeNo,
            name,
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
            CASE WHEN photo_blob IS NULL THEN 0 ELSE 1 END AS hasPhoto,
            UNIX_TIMESTAMP(updated_at) AS photoVersion
          FROM examinee
          WHERE examinee_no = ?
        `,
        [normalizedRow.examineeNo],
      );

      await connection.commit();
      return normalizeExamineeRecord(updatedRows[0] || normalizedRow);
    } catch (error) {
      await connection.rollback();

      if (error?.code === "ER_DUP_ENTRY") {
        throw createHttpError(409, "이미 등록된 수험번호입니다.", "EXAMINEE_NO_EXISTS");
      }

      if (error?.code === "ER_ROW_IS_REFERENCED_2") {
        throw createHttpError(409, "출력 이력이 있는 수험생은 수험번호를 변경할 수 없습니다.", "EXAMINEE_NO_LOCKED");
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  async function importExaminees(payload = {}) {
    let processed = 0;
    let photoUploaded = 0;
    let photoSkipped = 0;

    if (Array.isArray(payload.rows) && payload.rows.length > 0) {
      processed = (await saveExamineeRows(payload.rows)).processed;
    }

    if (payload.fileContentBase64) {
      const workbookRows = await parseExamineeWorkbook(payload.fileContentBase64);
      processed = (await saveExamineeRows(workbookRows)).processed;
    }

    if (payload.photoArchiveContentBase64) {
      const photoResult = await saveExamineePhotoArchive(payload.photoArchiveContentBase64);
      photoUploaded = photoResult.photoUploaded;
      photoSkipped = photoResult.photoSkipped;
    }

    if (processed === 0 && photoUploaded === 0 && !payload.photoArchiveContentBase64) {
      throw createHttpError(400, "업로드할 수험생 데이터 또는 사진 ZIP이 없습니다.");
    }

    return {
      processed,
      photoUploaded,
      photoSkipped,
    };
  }

  async function getExamineeByNo(examineeNo) {
    const [examinee] = await query(
      `
        SELECT
          DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
          \`group\` AS \`group\`,
          \`time\` AS \`time\`,
          track,
          admission,
          series,
          unit,
          major,
          building,
          room,
          examinee_no AS examineeNo,
          name,
          DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
          photo_name AS photoName,
          photo_mime AS photoMime,
          photo_blob AS photoBlob
        FROM examinee
        WHERE examinee_no = ?
      `,
      [examineeNo],
    );

    if (!examinee) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
    }

    return normalizeExamineeRecord(examinee);
  }

  return Object.freeze({
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    getExamineeByNo,
    getExamineePhoto,
    getExaminees,
    getPrintHistory,
    importExaminees,
    saveExamineePhoto,
    saveExamineePhotoArchiveBuffer,
    updateExaminee,
  });
}

module.exports = {
  createExamineeService,
};
