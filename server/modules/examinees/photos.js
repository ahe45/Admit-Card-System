const fs = require("fs");
const AdmZip = require("adm-zip");
const path = require("path");

function createExamineePhotoService({
  createHttpError,
  getPool,
  normalizeExamineeRecord,
  photoStorageDirName = "photo",
  query,
  rootDir = process.cwd(),
}) {
  const photoStorageDirectoryPath = path.join(rootDir, photoStorageDirName);

  function getExamineePhotoMimeType(extension) {
    if (extension === ".jpg" || extension === ".jpeg") {
      return "image/jpeg";
    }

    if (extension === ".png") {
      return "image/png";
    }

    return "";
  }

  function resolveStoredExamineePhotoExtension({ fileName = "", mimeType = "" } = {}) {
    const normalizedFileName = path.basename(String(fileName || "").trim());
    const normalizedMimeType = String(mimeType || "").trim().toLowerCase();
    const fileExtension = path.extname(normalizedFileName).toLowerCase();

    if (fileExtension === ".jpg" || fileExtension === ".jpeg" || fileExtension === ".png") {
      return fileExtension;
    }

    if (normalizedMimeType === "image/png") {
      return ".png";
    }

    if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
      return ".jpg";
    }

    return ".jpg";
  }

  function buildStoredExamineePhotoFileRecord(photo = {}) {
    const normalizedExamineeNo = String(photo.examineeNo || "").trim();
    const fileBuffer = Buffer.isBuffer(photo.fileBuffer) ? photo.fileBuffer : null;

    if (!normalizedExamineeNo) {
      throw createHttpError(400, "수험번호가 필요합니다.");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.");
    }

    const extension = resolveStoredExamineePhotoExtension(photo);
    const fileName = `${normalizedExamineeNo}${extension}`;

    return {
      examineeNo: normalizedExamineeNo,
      fileBuffer,
      fileName,
      filePath: path.join(photoStorageDirectoryPath, fileName),
      mimeType: getExamineePhotoMimeType(extension) || String(photo.mimeType || "").trim() || "image/jpeg",
    };
  }

  async function persistStoredExamineePhotoFile(storedPhotoRecord = null) {
    if (!storedPhotoRecord?.filePath || !Buffer.isBuffer(storedPhotoRecord.fileBuffer) || storedPhotoRecord.fileBuffer.length === 0) {
      return null;
    }

    const normalizedFilePath = String(storedPhotoRecord.filePath || "").trim();
    const parsedFilePath = path.parse(normalizedFilePath);

    await fs.promises.mkdir(parsedFilePath.dir, { recursive: true });
    await fs.promises.writeFile(normalizedFilePath, storedPhotoRecord.fileBuffer);

    await Promise.all(
      [".jpg", ".jpeg", ".png"]
        .filter((candidateExtension) => candidateExtension !== parsedFilePath.ext)
        .map(async (candidateExtension) => {
          const candidatePath = path.join(parsedFilePath.dir, `${parsedFilePath.name}${candidateExtension}`);

          try {
            await fs.promises.unlink(candidatePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }),
    );

    return storedPhotoRecord;
  }

  function getStoredExamineePhotoCandidateFileNames(examineeNo, photoName = "") {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoName = path.basename(String(photoName || "").trim());

    return Array.from(
      new Set(
        [
          normalizedPhotoName,
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpeg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.png` : "",
        ].filter(Boolean),
      ),
    );
  }

  async function readStoredExamineePhotoFile(examineeNo, photoName = "") {
    const candidateFileNames = getStoredExamineePhotoCandidateFileNames(examineeNo, photoName);

    for (const candidateFileName of candidateFileNames) {
      const normalizedCandidateFileName = path.basename(candidateFileName);
      const candidateFilePath = path.join(photoStorageDirectoryPath, normalizedCandidateFileName);

      try {
        const photoBlob = await fs.promises.readFile(candidateFilePath);

        if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
          const fileExtension = path.extname(normalizedCandidateFileName).toLowerCase();

          return {
            photoBlob,
            photoMime: getExamineePhotoMimeType(fileExtension) || "application/octet-stream",
            photoName: normalizedCandidateFileName,
          };
        }
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }

    return null;
  }

  async function hydrateExamineeWithStoredPhoto(examinee = {}) {
    const normalizedExaminee = normalizeExamineeRecord(examinee);
    const storedPhoto = await readStoredExamineePhotoFile(normalizedExaminee.examineeNo, normalizedExaminee.photoName);

    if (!storedPhoto) {
      return {
        ...normalizedExaminee,
        photoBlob: null,
      };
    }

    return {
      ...normalizedExaminee,
      ...storedPhoto,
    };
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
    let totalEntries = 0;
    let skippedEntries = 0;
    let duplicateEntries = 0;
    const invalidEntryNames = [];
    const duplicateEntryNames = [];

    zip.getEntries().forEach((entry) => {
      if (entry.isDirectory) {
        return;
      }

      totalEntries += 1;

      try {
        const photo = parseExamineePhotoFile(path.basename(String(entry.entryName || "").trim()), entry.getData());

        if (examineePhotos.has(photo.examineeNo)) {
          duplicateEntries += 1;

          if (duplicateEntryNames.length < 3) {
            duplicateEntryNames.push(photo.fileName);
          }
        }

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
      totalEntries,
      skippedEntries,
      duplicateEntries,
      invalidEntryNames,
      duplicateEntryNames,
    };
  }

  function parseExamineePhotoArchive(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "사진 ZIP 파일 데이터가 없습니다.");
    }

    return parseExamineePhotoArchiveBuffer(Buffer.from(fileContentBase64, "base64"));
  }

  async function saveParsedExamineePhotos({ photos, skippedEntries = 0, duplicateEntries = 0 }) {
    const examineeNos = photos.map((photo) => photo.examineeNo);
    const existingRows =
      examineeNos.length > 0
        ? await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no IN (?)`, [examineeNos])
        : [];
    const existingExamineeNos = new Set(existingRows.map((row) => row.examineeNo));
    const matchedPhotos = photos.filter((photo) => existingExamineeNos.has(photo.examineeNo));
    const unmatchedPhotos = photos.length - matchedPhotos.length;

    if (matchedPhotos.length > 0) {
      const storedPhotoRecords = matchedPhotos.map((photo) => buildStoredExamineePhotoFileRecord(photo));
      const connection = await getPool().getConnection();

      try {
        await connection.beginTransaction();

        for (const storedPhotoRecord of storedPhotoRecords) {
          await persistStoredExamineePhotoFile(storedPhotoRecord);
          await connection.query(
            `
              UPDATE examinee
              SET
                photo_name = ?,
                photo_mime = ?
              WHERE examinee_no = ?
            `,
            [
              storedPhotoRecord.fileName,
              storedPhotoRecord.mimeType,
              storedPhotoRecord.examineeNo,
            ],
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
      photoSkipped: unmatchedPhotos + Number(skippedEntries || 0) + Number(duplicateEntries || 0),
    };
  }

  async function saveExamineePhotoArchiveBuffer(fileBuffer) {
    return saveParsedExamineePhotos(parseExamineePhotoArchiveBuffer(fileBuffer));
  }

  async function saveExamineePhotoArchive(fileContentBase64) {
    return saveParsedExamineePhotos(parseExamineePhotoArchive(fileContentBase64));
  }

  async function previewParsedExamineePhotos({ photos, totalEntries = 0, skippedEntries = 0, duplicateEntries = 0 } = {}) {
    const examineeNos = Array.from(
      new Set(
        (Array.isArray(photos) ? photos : [])
          .map((photo) => String(photo?.examineeNo || "").trim())
          .filter(Boolean),
      ),
    );
    const existingRows =
      examineeNos.length > 0
        ? await query(`SELECT examinee_no AS examineeNo FROM examinee WHERE examinee_no IN (?)`, [examineeNos])
        : [];
    const existingExamineeNos = new Set(existingRows.map((row) => String(row?.examineeNo || "").trim()));
    const matchedCount = (Array.isArray(photos) ? photos : []).filter((photo) => existingExamineeNos.has(String(photo?.examineeNo || "").trim())).length;
    const unmatchedCount = Math.max(0, (Array.isArray(photos) ? photos.length : 0) - matchedCount);

    return {
      totalEntries: Number(totalEntries || 0),
      recognizedPhotoCount: Array.isArray(photos) ? photos.length : 0,
      matchedCount,
      unmatchedCount,
      invalidEntryCount: Number(skippedEntries || 0),
      duplicateEntryCount: Number(duplicateEntries || 0),
      estimatedUploadCount: matchedCount,
      estimatedSkipCount: unmatchedCount + Number(skippedEntries || 0) + Number(duplicateEntries || 0),
    };
  }

  async function previewExamineePhotoArchiveBuffer(fileBuffer) {
    const parsedArchive = parseExamineePhotoArchiveBuffer(fileBuffer);
    return previewParsedExamineePhotos(parsedArchive);
  }

  async function previewExamineePhotoArchive(fileContentBase64) {
    const parsedArchive = parseExamineePhotoArchive(fileContentBase64);
    return previewParsedExamineePhotos(parsedArchive);
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
    const storedPhotoRecord = buildStoredExamineePhotoFileRecord(photo);

    await persistStoredExamineePhotoFile(storedPhotoRecord);

    await query(
      `
        UPDATE examinee
        SET
          photo_name = ?,
          photo_mime = ?
        WHERE examinee_no = ?
      `,
      [storedPhotoRecord.fileName, storedPhotoRecord.mimeType, normalizedExamineeNo],
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
          CASE WHEN photo_name IS NULL OR photo_name = '' THEN 0 ELSE 1 END AS hasPhoto,
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
          photo_mime AS photoMime
        FROM examinee
        WHERE examinee_no = ?
      `,
      [examineeNo],
    );

    if (!examinee) {
      throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.");
    }

    const storedPhoto = await readStoredExamineePhotoFile(examinee.examineeNo, examinee.photoName);

    if (!storedPhoto?.photoBlob) {
      throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.");
    }

    return normalizeExamineeRecord({
      ...examinee,
      ...storedPhoto,
    });
  }

  return Object.freeze({
    hydrateExamineeWithStoredPhoto,
    getExamineePhoto,
    previewExamineePhotoArchive,
    previewExamineePhotoArchiveBuffer,
    saveExamineePhoto,
    saveExamineePhotoArchive,
    saveExamineePhotoArchiveBuffer,
  });
}

module.exports = {
  createExamineePhotoService,
};
