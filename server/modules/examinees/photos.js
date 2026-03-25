const AdmZip = require("adm-zip");
const path = require("path");

function createExamineePhotoService({ createHttpError, getPool, normalizeExamineeRecord, query }) {
  function getExamineePhotoMimeType(extension) {
    if (extension === ".jpg" || extension === ".jpeg") {
      return "image/jpeg";
    }

    if (extension === ".png") {
      return "image/png";
    }

    return "";
  }

  function parseExamineePhotoFile(fileName, fileBuffer, { expectedExamineeNo = "" } = {}) {
    const normalizedFileName = path.basename(String(fileName || "").trim());

    if (!normalizedFileName) {
      throw createHttpError(400, "사진 파일 이름이 없습니다.");
    }

    const extension = path.extname(normalizedFileName).toLowerCase();
    const mimeType = getExamineePhotoMimeType(extension);

    if (!mimeType) {
      throw createHttpError(400, "사진 파일 형식은 JPG, JPEG, PNG만 지원합니다.");
    }

    const derivedExamineeNo = path.basename(normalizedFileName, extension).trim();
    const normalizedExpectedExamineeNo = String(expectedExamineeNo || "").trim();
    const normalizedExamineeNo = normalizedExpectedExamineeNo || derivedExamineeNo;

    if (!normalizedExamineeNo) {
      throw createHttpError(400, "사진 파일명에서 수험번호를 확인할 수 없습니다.");
    }

    if (normalizedExpectedExamineeNo && normalizedExpectedExamineeNo !== derivedExamineeNo) {
      throw createHttpError(400, "사진 파일명과 수험번호가 일치하지 않습니다.");
    }

    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.");
    }

    return {
      fileName: normalizedFileName,
      mimeType,
      fileBuffer,
      examineeNo: normalizedExamineeNo,
    };
  }

  function parseExamineePhotoArchiveBuffer(fileBuffer) {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 ZIP 파일 데이터가 없습니다.");
    }

    let zip;

    try {
      zip = new AdmZip(fileBuffer);
    } catch (error) {
      throw createHttpError(400, "사진 ZIP 파일을 해석할 수 없습니다.");
    }

    const examineePhotos = new Map();
    let skippedEntries = 0;
    const invalidEntryNames = [];

    zip.getEntries().forEach((entry) => {
      if (entry.isDirectory) {
        return;
      }

      try {
        const photo = parseExamineePhotoFile(path.basename(String(entry.entryName || "").trim()), entry.getData());
        examineePhotos.set(photo.examineeNo, photo);
      } catch (error) {
        skippedEntries += 1;
        const invalidEntryName = path.basename(String(entry.entryName || "").trim());

        if (invalidEntryName && invalidEntryNames.length < 3) {
          invalidEntryNames.push(invalidEntryName);
        }
      }
    });

    if (examineePhotos.size === 0) {
      const invalidEntryMessage =
        invalidEntryNames.length > 0
          ? ` 확인된 파일 예시: ${invalidEntryNames.join(", ")}`
          : "";
      throw createHttpError(
        400,
        `ZIP 파일에서 업로드 가능한 수험생 사진을 찾을 수 없습니다. 파일명은 수험번호.jpg, 수험번호.jpeg, 수험번호.png 형식이어야 합니다.${invalidEntryMessage}`,
      );
    }

    return {
      photos: Array.from(examineePhotos.values()),
      skippedEntries,
    };
  }

  function parseExamineePhotoArchive(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "사진 ZIP 파일 데이터가 없습니다.");
    }

    return parseExamineePhotoArchiveBuffer(Buffer.from(fileContentBase64, "base64"));
  }

  async function saveParsedExamineePhotos({ photos, skippedEntries }) {
    const examineeNos = photos.map((photo) => photo.examineeNo);
    const existingRows =
      examineeNos.length > 0
        ? await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no IN (?)`, [examineeNos])
        : [];
    const existingExamineeNos = new Set(existingRows.map((row) => row.examineeNo));
    const matchedPhotos = photos.filter((photo) => existingExamineeNos.has(photo.examineeNo));
    const unmatchedPhotos = photos.length - matchedPhotos.length;

    if (matchedPhotos.length > 0) {
      const connection = await getPool().getConnection();

      try {
        await connection.beginTransaction();

        for (const photo of matchedPhotos) {
          await connection.query(
            `
              UPDATE examinee
              SET
                photo_name = ?,
                photo_mime = ?,
                photo_blob = ?
              WHERE examinee_no = ?
            `,
            [photo.fileName, photo.mimeType, photo.fileBuffer, photo.examineeNo],
          );
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    return {
      photoUploaded: matchedPhotos.length,
      photoSkipped: unmatchedPhotos + skippedEntries,
    };
  }

  async function saveExamineePhotoArchiveBuffer(fileBuffer) {
    return saveParsedExamineePhotos(parseExamineePhotoArchiveBuffer(fileBuffer));
  }

  async function saveExamineePhotoArchive(fileContentBase64) {
    return saveParsedExamineePhotos(parseExamineePhotoArchive(fileContentBase64));
  }

  async function saveExamineePhoto(examineeNo, payload = {}) {
    const normalizedExamineeNo = String(examineeNo || "").trim();

    if (!normalizedExamineeNo) {
      throw createHttpError(400, "수험번호가 필요합니다.");
    }

    const [existingExaminee] = await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no = ?`, [normalizedExamineeNo]);

    if (!existingExaminee) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.");
    }

    const fileContentBase64 = String(payload.fileContentBase64 || "").trim();

    if (!fileContentBase64) {
      throw createHttpError(400, "업로드할 사진 파일 데이터가 없습니다.");
    }

    const photo = parseExamineePhotoFile(payload.fileName, Buffer.from(fileContentBase64, "base64"), {
      expectedExamineeNo: normalizedExamineeNo,
    });

    await query(
      `
        UPDATE examinee
        SET
          photo_name = ?,
          photo_mime = ?,
          photo_blob = ?
        WHERE examinee_no = ?
      `,
      [photo.fileName, photo.mimeType, photo.fileBuffer, normalizedExamineeNo],
    );

    const [updatedExaminee] = await query(
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
      [normalizedExamineeNo],
    );

    return normalizeExamineeRecord(updatedExaminee || { examineeNo: normalizedExamineeNo, hasPhoto: true });
  }

  async function getExamineePhoto(examineeNo) {
    const [examinee] = await query(
      `
        SELECT
          examinee_no AS examineeNo,
          photo_name AS photoName,
          photo_mime AS photoMime,
          photo_blob AS photoBlob
        FROM examinee
        WHERE examinee_no = ?
      `,
      [examineeNo],
    );

    if (!examinee || !examinee.photoBlob) {
      throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.");
    }

    return normalizeExamineeRecord(examinee);
  }

  return Object.freeze({
    getExamineePhoto,
    saveExamineePhoto,
    saveExamineePhotoArchive,
    saveExamineePhotoArchiveBuffer,
  });
}

module.exports = {
  createExamineePhotoService,
};
