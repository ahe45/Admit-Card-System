const examineeFields = require("../../../shared/domain/examinee-fields");
const { normalizeExamineeRecord } = require("./record");

const examineeTemplateColumns = examineeFields.createTemplateColumns();
const optionalExamineeTemplateColumnKeys = new Set(examineeFields.optionalTemplateFieldKeys);
const legacyExamineeTemplateHeaders = examineeFields.legacyTemplateHeaders;

const printHistoryExportColumns = Object.freeze([
  ...examineeFields.createWorkbookTextColumns({ dateLabel: "시험날짜" }),
  Object.freeze({ header: "출력시각", key: "printedAt", width: 22, text: true }),
]);

const examineeExportColumns = examineeFields.createWorkbookTextColumns({ dateLabel: "시험날짜" });

const printHistorySummaryExportColumns = Object.freeze([
  ...examineeFields.createWorkbookTextColumns({ dateLabel: "시험날짜" }),
  Object.freeze({ header: "출력횟수", key: "printCount", width: 12, text: false }),
]);

function normalizeExamineeExportRow(record = {}) {
  const normalizedRecord = normalizeExamineeRecord(record);

  return {
    date: String(record.date ?? "").trim(),
    time: normalizedRecord.time,
    track: normalizedRecord.track,
    admission: normalizedRecord.admission,
    series: normalizedRecord.series,
    unit: normalizedRecord.unit,
    major: normalizedRecord.major,
    building: normalizedRecord.building,
    room: normalizedRecord.room,
    group: normalizedRecord.group,
    examineeNo: normalizedRecord.examineeNo,
    name: String(record.name ?? "").trim(),
    birth: String(record.birth ?? "").trim(),
  };
}

function normalizePrintHistoryExportRow(record = {}) {
  const normalizedRecord = normalizeExamineeRecord(record);

  return {
    date: String(record.date ?? "").trim(),
    time: normalizedRecord.time,
    track: normalizedRecord.track,
    admission: normalizedRecord.admission,
    series: normalizedRecord.series,
    unit: normalizedRecord.unit,
    major: normalizedRecord.major,
    building: normalizedRecord.building,
    room: normalizedRecord.room,
    group: normalizedRecord.group,
    examineeNo: normalizedRecord.examineeNo,
    name: String(record.name ?? "").trim(),
    birth: String(record.birth ?? "").trim(),
    printedAt: String(record.printedAt ?? "").trim(),
  };
}

module.exports = {
  examineeExportColumns,
  examineeTemplateColumns,
  legacyExamineeTemplateHeaders,
  normalizeExamineeExportRow,
  normalizePrintHistoryExportRow,
  optionalExamineeTemplateColumnKeys,
  printHistoryExportColumns,
  printHistorySummaryExportColumns,
};
