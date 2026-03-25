const { randomUUID } = require("crypto");

function createBatchAdmitCardJobController({
  batchAdmitCardJobTtlMs,
  buildBatchAdmitCardPdfBuffer,
  createHttpError,
  normalizeExamineeNoList,
  translateDatabaseError,
}) {
  const batchAdmitCardJobStore = new Map();

  function touchBatchAdmitCardJob(job) {
    if (!job) {
      return null;
    }

    job.updatedAt = Date.now();
    job.expiresAt = job.updatedAt + batchAdmitCardJobTtlMs;
    return job;
  }

  function cleanupBatchAdmitCardJobs() {
    const now = Date.now();

    batchAdmitCardJobStore.forEach((job, jobId) => {
      if (Number(job?.expiresAt || 0) > now) {
        return;
      }

      batchAdmitCardJobStore.delete(jobId);
    });
  }

  function buildBatchAdmitCardJobPayload(job) {
    return {
      jobId: String(job?.jobId || ""),
      status: String(job?.status || "running"),
      phase: String(job?.phase || "preparing"),
      totalCount: Math.max(0, Number(job?.totalCount || 0)),
      completedCount: Math.max(0, Number(job?.completedCount || 0)),
      fileName: String(job?.fileName || ""),
      error: String(job?.error || ""),
      errorCode: String(job?.errorCode || ""),
    };
  }

  function getBatchAdmitCardJobOrThrow(jobId, accountId) {
    cleanupBatchAdmitCardJobs();

    const normalizedJobId = String(jobId || "").trim();

    if (!normalizedJobId) {
      throw createHttpError(400, "배치 출력 작업 ID가 필요합니다.", "INVALID_BATCH_JOB_ID");
    }

    const job = batchAdmitCardJobStore.get(normalizedJobId);

    if (!job || job.accountId !== accountId) {
      throw createHttpError(404, "배치 출력 작업을 찾을 수 없습니다.", "BATCH_JOB_NOT_FOUND");
    }

    return touchBatchAdmitCardJob(job);
  }

  async function runBatchAdmitCardJob(jobId, examineeNos) {
    const job = batchAdmitCardJobStore.get(jobId);

    if (!job) {
      return;
    }

    try {
      const pdfBuffer = await buildBatchAdmitCardPdfBuffer(examineeNos, {
        onPhaseChange: ({ phase, completedCount, totalCount }) => {
          const activeJob = batchAdmitCardJobStore.get(jobId);

          if (!activeJob || activeJob.status !== "running") {
            return;
          }

          activeJob.phase = String(phase || activeJob.phase || "preparing");
          activeJob.completedCount = Math.max(0, Number(completedCount || 0));
          activeJob.totalCount = Math.max(activeJob.completedCount, Number(totalCount || activeJob.totalCount || 0));
          touchBatchAdmitCardJob(activeJob);
        },
        onProgress: ({ completedCount, totalCount }) => {
          const activeJob = batchAdmitCardJobStore.get(jobId);

          if (!activeJob || activeJob.status !== "running") {
            return;
          }

          activeJob.phase = "rendering";
          activeJob.completedCount = Math.max(0, Number(completedCount || 0));
          activeJob.totalCount = Math.max(activeJob.completedCount, Number(totalCount || activeJob.totalCount || 0));
          touchBatchAdmitCardJob(activeJob);
        },
      });
      const activeJob = batchAdmitCardJobStore.get(jobId);

      if (!activeJob) {
        return;
      }

      activeJob.status = "completed";
      activeJob.phase = "ready";
      activeJob.completedCount = Math.max(activeJob.completedCount, activeJob.totalCount);
      activeJob.pdfBuffer = pdfBuffer;
      activeJob.error = "";
      activeJob.errorCode = "";
      touchBatchAdmitCardJob(activeJob);
    } catch (error) {
      const activeJob = batchAdmitCardJobStore.get(jobId);

      if (!activeJob) {
        return;
      }

      const normalizedError = error?.statusCode ? error : translateDatabaseError(error);

      activeJob.status = "failed";
      activeJob.phase = "failed";
      activeJob.error = String(normalizedError?.message || "수험표 PDF를 생성할 수 없습니다.");
      activeJob.errorCode = String(normalizedError?.errorCode || "");
      activeJob.pdfBuffer = null;
      touchBatchAdmitCardJob(activeJob);
    }
  }

  function createBatchAdmitCardJob(accountId, examineeNos) {
    const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

    if (normalizedExamineeNos.length === 0) {
      throw createHttpError(400, "출력 대상 수험번호가 필요합니다.");
    }

    cleanupBatchAdmitCardJobs();

    const jobId = randomUUID();
    const now = Date.now();
    const job = {
      jobId,
      accountId: String(accountId || ""),
      status: "running",
      phase: "preparing",
      totalCount: normalizedExamineeNos.length,
      completedCount: 0,
      fileName: `admit-cards-${normalizedExamineeNos.length}.pdf`,
      pdfBuffer: null,
      error: "",
      errorCode: "",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + batchAdmitCardJobTtlMs,
    };

    batchAdmitCardJobStore.set(jobId, job);
    void runBatchAdmitCardJob(jobId, normalizedExamineeNos);

    return buildBatchAdmitCardJobPayload(job);
  }

  return Object.freeze({
    buildBatchAdmitCardJobPayload,
    createBatchAdmitCardJob,
    getBatchAdmitCardJobOrThrow,
  });
}

module.exports = {
  createBatchAdmitCardJobController,
};
