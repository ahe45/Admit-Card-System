const ExcelJS = require("exceljs");

const {
  examineeExportColumns,
  examineeTemplateColumns,
  legacyExamineeTemplateHeaders,
  normalizeExamineeExportRow,
  normalizePrintHistoryExportRow,
  optionalExamineeTemplateColumnKeys,
  printHistoryExportColumns,
  printHistorySummaryExportColumns,
} = require("./config");

function createExamineeWorkbookService({ createHttpError }) {
  function normalizeText(value, fieldName, rowNumber) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 값을 입력하세요.${suffix}`);
    }

    return normalizedValue;
  }

  function normalizeOptionalText(value) {
    return String(value ?? "").trim();
  }

  function normalizeDate(value, fieldName, rowNumber) {
    const normalizedValue = normalizeText(value, fieldName, rowNumber);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 형식은 YYYY-MM-DD여야 합니다.${suffix}`);
    }

    return normalizedValue;
  }

  function normalizeTime(value, fieldName, rowNumber) {
    const normalizedValue = normalizeText(value, fieldName, rowNumber);

    if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 형식은 HH:MM이어야 합니다.${suffix}`);
    }

    const [hourText, minuteText] = normalizedValue.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 값이 올바르지 않습니다.${suffix}`);
    }

    return normalizedValue;
  }

  function normalizeExamineeInput(examineeInput, index) {
    const rowNumber = Number(index) >= 0 ? Number(index) + 2 : -1;

    return {
      date: normalizeDate(examineeInput.date, "시험날짜", rowNumber),
      group: normalizeOptionalText(examineeInput.group),
      time: normalizeTime(examineeInput.time ?? examineeInput.session, "시간", rowNumber),
      track: normalizeText(examineeInput.track, "모집시기", rowNumber),
      admission: normalizeText(examineeInput.admission ?? examineeInput.exam, "전형", rowNumber),
      series: normalizeText(examineeInput.series, "계열", rowNumber),
      unit: normalizeText(examineeInput.unit, "모집단위", rowNumber),
      major: normalizeOptionalText(examineeInput.major),
      building: normalizeText(examineeInput.building, "고사건물", rowNumber),
      room: normalizeText(examineeInput.room, "고사실", rowNumber),
      examineeNo: normalizeText(examineeInput.examineeNo, "수험번호", rowNumber),
      name: normalizeText(examineeInput.name, "이름", rowNumber),
      birth: normalizeDate(examineeInput.birth, "생년월일", rowNumber),
    };
  }

  function extractExcelCellValue(value) {
    if (value == null) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (typeof value === "object") {
      if (typeof value.text === "string") {
        return value.text;
      }

      if (Array.isArray(value.richText)) {
        return value.richText.map((segment) => segment?.text || "").join("");
      }

      if (value.result != null) {
        return extractExcelCellValue(value.result);
      }

      if (value.hyperlink) {
        return String(value.text || value.hyperlink || "");
      }

      if (value.formula && value.result != null) {
        return extractExcelCellValue(value.result);
      }
    }

    return "";
  }

  function getExcelCellText(cell) {
    return extractExcelCellValue(cell?.value)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  }

  function applyWorkbookHeaderStyle(worksheet) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4F7FB" },
    };
  }

  function buildWorkbookSheet(workbook, sheetName, columns, rows) {
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: column.text ? { numFmt: "@" } : undefined,
    }));

    applyWorkbookHeaderStyle(worksheet);
    rows.forEach((row) => worksheet.addRow(row));

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      columns.forEach((column, columnIndex) => {
        if (!column.text) {
          return;
        }

        worksheet.getRow(rowIndex).getCell(columnIndex + 1).numFmt = "@";
      });
    }

    return worksheet;
  }

  function buildPrintHistorySummaryRows(rows, summaryExaminees = []) {
    const summaryMap = new Map();

    summaryExaminees.forEach((row) => {
      const examineeNo = String(row.examineeNo || "").trim();
      const summaryKey = examineeNo || `__empty_summary__${summaryMap.size}`;

      if (!summaryMap.has(summaryKey)) {
        summaryMap.set(summaryKey, {
          ...row,
          printCount: 0,
        });
      }
    });

    rows.forEach((row) => {
      const examineeNo = String(row.examineeNo || "").trim();
      const summaryKey = examineeNo || `__empty_history__${summaryMap.size}`;

      if (!summaryMap.has(summaryKey)) {
        summaryMap.set(summaryKey, {
          ...row,
          printCount: 0,
        });
      }

      summaryMap.get(summaryKey).printCount += 1;
    });

    return Array.from(summaryMap.values());
  }

  async function buildExamineeTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("수험생업로드", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = examineeTemplateColumns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      style: { numFmt: "@" },
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRow(
      examineeTemplateColumns.reduce((row, column) => {
        row[column.key] = column.sample;
        return row;
      }, {}),
    );

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= examineeTemplateColumns.length; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildPrintHistoryExportBuffer(rows, summaryExaminees = []) {
    if ((!Array.isArray(rows) || rows.length === 0) && (!Array.isArray(summaryExaminees) || summaryExaminees.length === 0)) {
      throw createHttpError(400, "다운로드할 출력 이력 데이터가 없습니다.");
    }

    const normalizedRows = Array.isArray(rows) ? rows.map((row) => normalizePrintHistoryExportRow(row)) : [];
    const normalizedSummaryExaminees = Array.isArray(summaryExaminees)
      ? summaryExaminees.map((row) => normalizePrintHistoryExportRow(row))
      : [];
    const workbook = new ExcelJS.Workbook();

    buildWorkbookSheet(workbook, "출력이력", printHistoryExportColumns, normalizedRows);
    buildWorkbookSheet(
      workbook,
      "수험번호별 출력횟수",
      printHistorySummaryExportColumns,
      buildPrintHistorySummaryRows(normalizedRows, normalizedSummaryExaminees),
    );

    return workbook.xlsx.writeBuffer();
  }

  async function buildExamineeExportBuffer(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createHttpError(400, "다운로드할 수험생 데이터가 없습니다.");
    }

    const normalizedRows = rows.map((row) => normalizeExamineeExportRow(row));
    const workbook = new ExcelJS.Workbook();

    buildWorkbookSheet(workbook, "수험생등록", examineeExportColumns, normalizedRows);

    return workbook.xlsx.writeBuffer();
  }

  async function parseExamineeWorkbook(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "XLSX 파일 데이터가 없습니다.");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(fileContentBase64, "base64"));

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw createHttpError(400, "XLSX 파일에서 시트를 찾을 수 없습니다.");
    }

    const headerRow = worksheet.getRow(1);
    const columnIndexes = examineeTemplateColumns.reduce((indexes, column) => {
      const expectedHeaders = [column.header, legacyExamineeTemplateHeaders[column.key]]
        .filter(Boolean)
        .filter((header, index, headers) => headers.indexOf(header) === index);

      const matchedColumnIndex = headerRow.actualCellCount === 0
        ? -1
        : Array.from({ length: Math.max(worksheet.columnCount, examineeTemplateColumns.length) }, (_, offset) => offset + 1)
            .find((columnIndex) => expectedHeaders.includes(getExcelCellText(headerRow.getCell(columnIndex)))) ?? -1;

      if (matchedColumnIndex === -1) {
        if (optionalExamineeTemplateColumnKeys.has(column.key)) {
          indexes[column.key] = -1;
          return indexes;
        }

        throw createHttpError(400, `XLSX 헤더에 '${column.header}' 컬럼이 없습니다.`);
      }

      indexes[column.key] = matchedColumnIndex;
      return indexes;
    }, {});

    const examinees = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const examinee = {};
      let hasAnyValue = false;

      examineeTemplateColumns.forEach((column) => {
        const columnIndex = columnIndexes[column.key];
        const value = columnIndex > 0 ? getExcelCellText(row.getCell(columnIndex)) : "";
        examinee[column.key] = value;
        hasAnyValue = hasAnyValue || value !== "";
      });

      if (hasAnyValue) {
        examinees.push(examinee);
      }
    }

    if (examinees.length === 0) {
      throw createHttpError(400, "XLSX에는 헤더와 최소 1개 이상의 데이터 행이 필요합니다.");
    }

    return examinees;
  }

  return Object.freeze({
    buildExamineeExportBuffer,
    buildExamineeTemplateBuffer,
    buildPrintHistoryExportBuffer,
    normalizeExamineeInput,
    parseExamineeWorkbook,
  });
}

module.exports = {
  createExamineeWorkbookService,
};
