const { createExamineePhotoService } = require("./photos");
const { normalizeExamineeRecord } = require("./record");
const { createExamineeWorkbookService } = require("./workbook");

const EXAMINEE_DETAIL_BATCH_QUERY_SIZE = 200;
const EXAMINEE_IMPORT_PREVIEW_ROW_LIMIT = 8;
const EXAMINEE_IMPORT_COMPARISON_FIELDS = Object.freeze([
  "date",
  "group",
  "time",
  "track",
  "admission",
  "admissionCode",
  "series",
  "seriesCode",
  "unit",
  "unitCode",
  "major",
  "majorCode",
  "building",
  "buildingCode",
  "room",
  "roomCode",
  "examineeNo",
  "name",
  "birth",
]);
const EXAMINEE_IMPORT_EXISTING_DATA_POLICIES = Object.freeze({
  INSERT_ONLY: "insert-only",
  INSERT_UPDATE: "insert-update",
  ALL: "all",
});

function createExamineeService({ createHttpError, getPool, photoStorageDirName, query, rootDir }) {
  const examineePhotoService = createExamineePhotoService({
    createHttpError,
    getPool,
    normalizeExamineeRecord,
    photoStorageDirName,
    query,
    rootDir,
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
    hydrateExamineeWithStoredPhoto,
    getExamineePhoto,
    previewExamineePhotoArchive,
    saveExamineePhoto,
    saveExamineePhotoArchive,
    saveExamineePhotoArchiveBuffer,
    previewExamineePhotoArchiveBuffer,
  } = examineePhotoService;

  async function getExaminees() {
    const rows = await query(`
      SELECT
        DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
        \`group\` AS \`group\`,
        \`time\` AS \`time\`,
        track,
        admission,
        admission_code AS admissionCode,
        series,
        series_code AS seriesCode,
        unit,
        unit_code AS unitCode,
        major,
        major_code AS majorCode,
        building,
        building_code AS buildingCode,
        room,
        room_code AS roomCode,
        examinee_no AS examineeNo,
        name,
        DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
        CASE WHEN photo_name IS NULL OR photo_name = '' THEN 0 ELSE 1 END AS hasPhoto,
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
        e.admission_code AS admissionCode,
        e.series,
        e.series_code AS seriesCode,
        e.unit,
        e.unit_code AS unitCode,
        e.major,
        e.major_code AS majorCode,
        e.building,
        e.building_code AS buildingCode,
        e.room,
        e.room_code AS roomCode,
        e.examinee_no AS examineeNo,
        e.name,
        DATE_FORMAT(e.birth_date, '%Y-%m-%d') AS birth,
        CASE WHEN e.photo_name IS NULL OR e.photo_name = '' THEN 0 ELSE 1 END AS hasPhoto,
        DATE_FORMAT(ph.printed_at, '%Y-%m-%d %H:%i:%s') AS printedAt
      FROM print_log ph
      INNER JOIN examinee e ON e.examinee_no = ph.examinee_no
      ORDER BY ph.printed_at DESC, ph.id DESC
    `);

    return rows.map(normalizeExamineeRecord);
  }

  function buildExamineeImportDuplicateError(duplicateEntries = []) {
    const normalizedEntries = (Array.isArray(duplicateEntries) ? duplicateEntries : [])
      .map((entry) => ({
        examineeNo: String(entry?.examineeNo || "").trim(),
        rowNumbers: Array.isArray(entry?.rowNumbers) ? entry.rowNumbers : [],
      }))
      .filter((entry) => entry.examineeNo && entry.rowNumbers.length > 1);

    if (normalizedEntries.length === 0) {
      return null;
    }

    const summaryText = normalizedEntries
      .slice(0, 3)
      .map((entry) => `${entry.examineeNo}(${entry.rowNumbers.join(", ")}행)`)
      .join(", ");
    const suffix = normalizedEntries.length > 3 ? ` 외 ${normalizedEntries.length - 3}건` : "";
    return createHttpError(
      400,
      `XLSX에 중복된 수험번호가 있습니다: ${summaryText}${suffix}`,
      "EXAMINEE_IMPORT_DUPLICATE_NO",
    );
  }

  function prepareExamineeImportRows(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createHttpError(400, "업로드할 수험생 데이터가 없습니다.");
    }

    const normalizedRows = rows.map((row, index) => normalizeExamineeInput(row, index));
    const duplicateRowMap = new Map();

    normalizedRows.forEach((row, index) => {
      const examineeNo = String(row.examineeNo || "").trim();
      const duplicateEntry = duplicateRowMap.get(examineeNo) || {
        examineeNo,
        rowNumbers: [],
      };

      duplicateEntry.rowNumbers.push(index + 2);
      duplicateRowMap.set(examineeNo, duplicateEntry);
    });

    const duplicateError = buildExamineeImportDuplicateError(
      Array.from(duplicateRowMap.values()).filter((entry) => entry.rowNumbers.length > 1),
    );

    if (duplicateError) {
      throw duplicateError;
    }

    return normalizedRows;
  }

  async function getExistingExamineeImportRowsByNos(examineeNos = []) {
    const normalizedExamineeNos = Array.from(
      new Set(
        (Array.isArray(examineeNos) ? examineeNos : [examineeNos])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    if (normalizedExamineeNos.length === 0) {
      return new Map();
    }

    const existingRowMap = new Map();

    for (let startIndex = 0; startIndex < normalizedExamineeNos.length; startIndex += EXAMINEE_DETAIL_BATCH_QUERY_SIZE) {
      const examineeChunk = normalizedExamineeNos.slice(startIndex, startIndex + EXAMINEE_DETAIL_BATCH_QUERY_SIZE);
      const placeholders = examineeChunk.map(() => "?").join(", ");
      const rows = await query(
        `
          SELECT
            DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
            \`group\` AS \`group\`,
            \`time\` AS \`time\`,
            track,
            admission,
            admission_code AS admissionCode,
            series,
            series_code AS seriesCode,
            unit,
            unit_code AS unitCode,
            major,
            major_code AS majorCode,
            building,
            building_code AS buildingCode,
            room,
            room_code AS roomCode,
            examinee_no AS examineeNo,
            name,
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth
          FROM examinee
          WHERE examinee_no IN (${placeholders})
        `,
        examineeChunk,
      );

      rows.forEach((row) => {
        const normalizedRow = normalizeExamineeInput(row, -1);
        existingRowMap.set(normalizedRow.examineeNo, normalizedRow);
      });
    }

    return existingRowMap;
  }

  function areExamineeImportRowsEqual(leftRow = {}, rightRow = {}) {
    return EXAMINEE_IMPORT_COMPARISON_FIELDS.every(
      (fieldKey) => String(leftRow?.[fieldKey] || "").trim() === String(rightRow?.[fieldKey] || "").trim(),
    );
  }

  function normalizeExamineeImportExistingDataPolicy(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (Object.values(EXAMINEE_IMPORT_EXISTING_DATA_POLICIES).includes(normalizedValue)) {
      return normalizedValue;
    }

    return EXAMINEE_IMPORT_EXISTING_DATA_POLICIES.INSERT_UPDATE;
  }

  function classifyExamineeImportRows(normalizedRows = [], existingRowMap = new Map()) {
    return (Array.isArray(normalizedRows) ? normalizedRows : []).map((row, index) => {
      const existingRow = existingRowMap.get(row.examineeNo) || null;
      const operation = existingRow ? (areExamineeImportRowsEqual(row, existingRow) ? "unchanged" : "update") : "insert";

      return {
        row,
        rowNumber: index + 2,
        operation,
      };
    });
  }

  function shouldProcessExamineeImportOperation(operation = "", existingDataPolicy = "") {
    const normalizedPolicy = normalizeExamineeImportExistingDataPolicy(existingDataPolicy);

    if (normalizedPolicy === EXAMINEE_IMPORT_EXISTING_DATA_POLICIES.ALL) {
      return true;
    }

    if (normalizedPolicy === EXAMINEE_IMPORT_EXISTING_DATA_POLICIES.INSERT_ONLY) {
      return String(operation || "").trim() === "insert";
    }

    return ["insert", "update"].includes(String(operation || "").trim());
  }

  async function saveExamineeRows(rows) {
    const normalizedRows = prepareExamineeImportRows(rows);
    const values = normalizedRows.map((row) => [
      row.date,
      row.group,
      row.time,
      row.track,
      row.admission,
      row.admissionCode,
      row.series,
      row.seriesCode,
      row.unit,
      row.unitCode,
      row.major,
      row.majorCode,
      row.building,
      row.buildingCode,
      row.room,
      row.roomCode,
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
          admission_code,
          series,
          series_code,
          unit,
          unit_code,
          major,
          major_code,
          building,
          building_code,
          room,
          room_code,
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
          admission_code = VALUES(admission_code),
          series = VALUES(series),
          series_code = VALUES(series_code),
          unit = VALUES(unit),
          unit_code = VALUES(unit_code),
          major = VALUES(major),
          major_code = VALUES(major_code),
          building = VALUES(building),
          building_code = VALUES(building_code),
          room = VALUES(room),
          room_code = VALUES(room_code),
          name = VALUES(name),
          birth_date = VALUES(birth_date)
      `,
      [values],
    );

    return {
      processed: normalizedRows.length,
    };
  }

  async function previewExamineeImport(payload = {}) {
    if (!payload.fileContentBase64) {
      throw createHttpError(400, "XLSX 파일 데이터가 없습니다.");
    }

    const workbookRows = await parseExamineeWorkbook(payload.fileContentBase64);
    const normalizedRows = prepareExamineeImportRows(workbookRows);
    const existingRowMap = await getExistingExamineeImportRowsByNos(normalizedRows.map((row) => row.examineeNo));
    const classifiedRows = classifyExamineeImportRows(normalizedRows, existingRowMap);
    const previewRows = [];
    let insertCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    classifiedRows.forEach(({ row, rowNumber, operation }) => {
      if (operation === "insert") {
        insertCount += 1;
      } else if (operation === "update") {
        updateCount += 1;
      } else {
        unchangedCount += 1;
      }

      if (previewRows.length < EXAMINEE_IMPORT_PREVIEW_ROW_LIMIT) {
        previewRows.push({
          rowNumber,
          operation,
          examineeNo: row.examineeNo,
          name: row.name,
          date: row.date,
          time: row.time,
          track: row.track,
          admission: row.admission,
          series: row.series,
          unit: row.unit,
          building: row.building,
          room: row.room,
        });
      }
    });

    return {
      fileName: String(payload.fileName || "").trim(),
      totalRows: normalizedRows.length,
      insertCount,
      updateCount,
      unchangedCount,
      previewRows,
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
            admission_code = ?,
            series = ?,
            series_code = ?,
            unit = ?,
            unit_code = ?,
            major = ?,
            major_code = ?,
            building = ?,
            building_code = ?,
            room = ?,
            room_code = ?,
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
          normalizedRow.admissionCode,
          normalizedRow.series,
          normalizedRow.seriesCode,
          normalizedRow.unit,
          normalizedRow.unitCode,
          normalizedRow.major,
          normalizedRow.majorCode,
          normalizedRow.building,
          normalizedRow.buildingCode,
          normalizedRow.room,
          normalizedRow.roomCode,
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
            admission_code AS admissionCode,
            series,
            series_code AS seriesCode,
            unit,
            unit_code AS unitCode,
            major,
            major_code AS majorCode,
            building,
            building_code AS buildingCode,
            room,
            room_code AS roomCode,
            examinee_no AS examineeNo,
            name,
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
            CASE WHEN photo_name IS NULL OR photo_name = '' THEN 0 ELSE 1 END AS hasPhoto,
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
    const existingDataPolicy = normalizeExamineeImportExistingDataPolicy(payload.existingDataPolicy);

    if ((Array.isArray(payload.rows) && payload.rows.length > 0) || payload.fileContentBase64) {
      const sourceRows =
        Array.isArray(payload.rows) && payload.rows.length > 0
          ? payload.rows
          : await parseExamineeWorkbook(payload.fileContentBase64);
      const normalizedRows = prepareExamineeImportRows(sourceRows);
      const existingRowMap = await getExistingExamineeImportRowsByNos(normalizedRows.map((row) => row.examineeNo));
      const selectedRows = classifyExamineeImportRows(normalizedRows, existingRowMap)
        .filter((entry) => shouldProcessExamineeImportOperation(entry.operation, existingDataPolicy))
        .map((entry) => entry.row);

      if (selectedRows.length > 0) {
        processed = (await saveExamineeRows(selectedRows)).processed;
      }
    }

    if (payload.photoArchiveContentBase64) {
      const photoResult = await saveExamineePhotoArchive(payload.photoArchiveContentBase64);
      photoUploaded = photoResult.photoUploaded;
      photoSkipped = photoResult.photoSkipped;
    }

    if (processed === 0 && ((Array.isArray(payload.rows) && payload.rows.length > 0) || payload.fileContentBase64) && !payload.photoArchiveContentBase64) {
      throw createHttpError(400, "선택한 기존 데이터 처리 방식에 따라 반영할 수험생 데이터가 없습니다.", "EXAMINEE_IMPORT_NOTHING_SELECTED");
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
          admission_code AS admissionCode,
          series,
          series_code AS seriesCode,
          unit,
          unit_code AS unitCode,
          major,
          major_code AS majorCode,
          building,
          building_code AS buildingCode,
          room,
          room_code AS roomCode,
          examinee_no AS examineeNo,
          name,
          DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
          photo_name AS photoName,
          photo_mime AS photoMime
        FROM examinee
        WHERE examinee_no = ?
      `,
      [examineeNo],
    );

    if (!examinee) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
    }

    return hydrateExamineeWithStoredPhoto(examinee);
  }

  async function getExamineesByNos(examineeNos) {
    const normalizedExamineeNos = Array.from(
      new Set(
        (Array.isArray(examineeNos) ? examineeNos : [examineeNos])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    if (normalizedExamineeNos.length === 0) {
      return [];
    }

    const examineeMap = new Map();

    for (let startIndex = 0; startIndex < normalizedExamineeNos.length; startIndex += EXAMINEE_DETAIL_BATCH_QUERY_SIZE) {
      const examineeChunk = normalizedExamineeNos.slice(startIndex, startIndex + EXAMINEE_DETAIL_BATCH_QUERY_SIZE);
      const placeholders = examineeChunk.map(() => "?").join(", ");
      const rows = await query(
        `
          SELECT
            DATE_FORMAT(exam_date, '%Y-%m-%d') AS date,
            \`group\` AS \`group\`,
            \`time\` AS \`time\`,
            track,
            admission,
            admission_code AS admissionCode,
            series,
            series_code AS seriesCode,
            unit,
            unit_code AS unitCode,
            major,
            major_code AS majorCode,
            building,
            building_code AS buildingCode,
            room,
            room_code AS roomCode,
            examinee_no AS examineeNo,
            name,
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth,
            photo_name AS photoName,
            photo_mime AS photoMime
          FROM examinee
          WHERE examinee_no IN (${placeholders})
        `,
        examineeChunk,
      );

      rows.forEach((row) => {
        const normalizedRecord = normalizeExamineeRecord(row);
        examineeMap.set(normalizedRecord.examineeNo, normalizedRecord);
      });
    }

    const orderedExaminees = normalizedExamineeNos.map((examineeNo) => examineeMap.get(examineeNo) || null);
    const hasMissingExaminee = orderedExaminees.some((record) => !record);

    if (hasMissingExaminee) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
    }

    return Promise.all(orderedExaminees.map((record) => hydrateExamineeWithStoredPhoto(record)));
  }

  return Object.freeze({
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    getExamineeByNo,
    getExamineesByNos,
    getExamineePhoto,
    getExaminees,
    getPrintHistory,
    importExaminees,
    previewExamineePhotoArchive,
    previewExamineePhotoArchiveBuffer,
    previewExamineeImport,
    saveExamineePhoto,
    saveExamineePhotoArchiveBuffer,
    updateExaminee,
  });
}

module.exports = {
  createExamineeService,
};
