const { createBatchAdmitCardJobController } = require("./admit-card-jobs");
const { createAdmitCardPdfService } = require("./admit-card-pdf");

function createAdmitCardService({
  batchAdmitCardJobTtlMs,
  createHttpError,
  edgeExecutablePaths,
  escapeHtml,
  getActiveTemplate,
  getExamineeByNo,
  normalizeExamineeNoList,
  renderTemplateWithExaminee,
  translateDatabaseError,
}) {
  const admitCardPdfService = createAdmitCardPdfService({
    createHttpError,
    edgeExecutablePaths,
    escapeHtml,
    getActiveTemplate,
    getExamineeByNo,
    normalizeExamineeNoList,
    renderTemplateWithExaminee,
  });
  const {
    buildAdmitCardPdfBuffer,
    buildBatchAdmitCardPdfBuffer,
  } = admitCardPdfService;

  const batchAdmitCardJobController = createBatchAdmitCardJobController({
    batchAdmitCardJobTtlMs,
    buildBatchAdmitCardPdfBuffer,
    createHttpError,
    normalizeExamineeNoList,
    translateDatabaseError,
  });
  const {
    buildBatchAdmitCardJobPayload,
    createBatchAdmitCardJob,
    getBatchAdmitCardJobOrThrow,
  } = batchAdmitCardJobController;

  return Object.freeze({
    buildAdmitCardPdfBuffer,
    buildBatchAdmitCardJobPayload,
    buildBatchAdmitCardPdfBuffer,
    createBatchAdmitCardJob,
    getBatchAdmitCardJobOrThrow,
  });
}

module.exports = {
  createAdmitCardService,
};
