(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardWorkflowBatchPrint = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAdmitCardBatchPrintHelpers({
    BATCH_PRINT_JOB_TIMEOUT_MS,
    BATCH_PRINT_STATUS_POLL_INTERVAL_MS,
    apiRequest,
    apiRequestForBlobWithProgress,
    getSelectedAdmitCardExaminees,
    handleAuthenticationFailure,
    normalizeExamineeNoList,
    normalizeProgressValue,
    openPdfWindow,
    printPdfUrl,
    recordExamineePrint,
    renderView,
    runWithPdfGenerationLock,
    setPdfGenerationState,
    showToast,
    state,
    wait,
  }) {
    function normalizeBatchPrintCount(value) {
      const normalizedValue = Math.round(Number(value));

      if (!Number.isFinite(normalizedValue)) {
        return 0;
      }

      return Math.max(0, normalizedValue);
    }

    function getBatchPrintProgressState(completedCount, totalCount) {
      const normalizedCompleted = normalizeBatchPrintCount(completedCount);
      const normalizedTotal = normalizeBatchPrintCount(totalCount);
      const total = normalizedTotal > 0 ? normalizedTotal : normalizedCompleted;
      const completed = total > 0 ? Math.min(total, normalizedCompleted) : 0;

      return {
        completed,
        total,
        percent: total > 0 ? normalizeProgressValue((completed / total) * 100) : 0,
      };
    }

    function buildBatchPrintProgressLabel(completedCount, totalCount) {
      const { completed, total } = getBatchPrintProgressState(completedCount, totalCount);

      return `${completed}/${total}명 처리 완료`;
    }

    function buildBatchPrintPhaseMessage(phase, totalCount) {
      const normalizedTotal = normalizeBatchPrintCount(totalCount);

      switch (String(phase || "")) {
        case "preparing":
          return `선택한 ${normalizedTotal}명의 출력 대상을 준비하고 있습니다.`;
        case "finalizing":
          return `${normalizedTotal}명의 수험표를 하나의 PDF로 생성하고 있습니다.`;
        case "ready":
          return `${normalizedTotal}명의 수험표 PDF를 준비했습니다.`;
        case "rendering":
        default:
          return `선택한 ${normalizedTotal}명의 수험표를 생성하고 있습니다.`;
      }
    }

    function syncBatchPrintOverlayFromJob(jobPayload = {}) {
      const { completed, total, percent } = getBatchPrintProgressState(jobPayload.completedCount, jobPayload.totalCount);

      setPdfGenerationState({
        isActive: true,
        message: buildBatchPrintPhaseMessage(jobPayload.phase, total),
        progressMode: "determinate",
        progressValue: percent,
        progressLabel: buildBatchPrintProgressLabel(completed, total),
      });
    }

    async function waitForBatchAdmitCardJobCompletion(jobId) {
      const normalizedJobId = String(jobId || "").trim();
      const startedAt = Date.now();

      if (!normalizedJobId) {
        throw new Error("배치 출력 작업 ID가 올바르지 않습니다.");
      }

      while (true) {
        const jobPayload = await apiRequest(`/api/examinees/admit-card-jobs/${encodeURIComponent(normalizedJobId)}`);

        syncBatchPrintOverlayFromJob(jobPayload);

        if (jobPayload.status === "completed") {
          return jobPayload;
        }

        if (jobPayload.status === "failed") {
          const error = new Error(jobPayload.error || "수험표 PDF를 생성할 수 없습니다.");
          error.code = jobPayload.errorCode || "";
          throw error;
        }

        if (Date.now() - startedAt >= BATCH_PRINT_JOB_TIMEOUT_MS) {
          throw new Error("수험표 PDF 생성 시간이 너무 오래 걸리고 있습니다. 잠시 후 다시 시도하세요.");
        }

        await wait(BATCH_PRINT_STATUS_POLL_INTERVAL_MS);
      }
    }

    async function batchPrintSelectedExaminees() {
      const selectedExaminees = getSelectedAdmitCardExaminees();
      const examineeNos = normalizeExamineeNoList(
        selectedExaminees.map((examinee) => examinee.examineeNo),
      );

      if (examineeNos.length === 0) {
        showToast("일괄 인쇄할 수험생을 먼저 선택하세요.", "error");
        return;
      }

      state.batchPrint.isLoading = true;
      renderView();

      const downloadMessage = `선택한 ${examineeNos.length}명의 수험표 PDF를 다운로드하고 있습니다.`;
      const printPreparationMessage = `${examineeNos.length}명의 수험표 인쇄 창을 준비하고 있습니다.`;

      await runWithPdfGenerationLock(
        buildBatchPrintPhaseMessage("preparing", examineeNos.length),
        async () => {
          let pdfUrl = "";

          try {
            const batchJob = await apiRequest("/api/examinees/admit-card-jobs", {
              method: "POST",
              body: JSON.stringify({ examineeNos }),
            });
            const completedJob = await waitForBatchAdmitCardJobCompletion(batchJob.jobId);
            const completedProgressLabel = buildBatchPrintProgressLabel(
              completedJob.completedCount,
              completedJob.totalCount,
            );

            setPdfGenerationState({
              isActive: true,
              message: downloadMessage,
              progressMode: "determinate",
              progressValue: 100,
              progressLabel: completedProgressLabel,
            });

            const { blob } = await apiRequestForBlobWithProgress(
              `/api/examinees/admit-card-jobs/${encodeURIComponent(batchJob.jobId)}/pdf`,
              {
                credentials: "same-origin",
              },
              {
                onResponseStart: () => {
                  setPdfGenerationState({
                    isActive: true,
                    message: downloadMessage,
                    progressMode: "determinate",
                    progressValue: 100,
                    progressLabel: completedProgressLabel,
                  });
                },
              },
            );

            pdfUrl = URL.createObjectURL(blob);
            setPdfGenerationState({
              isActive: true,
              message: printPreparationMessage,
              progressMode: "determinate",
              progressValue: 100,
              progressLabel: completedProgressLabel,
            });

            try {
              await printPdfUrl(pdfUrl);
            } catch (error) {
              const popupWindow = openPdfWindow(pdfUrl, { shouldPrint: true });

              if (!popupWindow) {
                throw new Error("브라우저에서 PDF 인쇄 창을 열지 못했습니다. 팝업 허용 후 다시 시도하세요.");
              }
            }

            await recordExamineePrint(examineeNos);
            showToast(`${examineeNos.length}명의 수험표 PDF를 생성해 인쇄를 시작했습니다.`);
          } catch (error) {
            if (handleAuthenticationFailure(error)) {
              return;
            }

            showToast(error.message, "error", 4200);
          } finally {
            if (pdfUrl) {
              window.setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
              }, 60000);
            }
          }
        },
        {
          progressMode: "determinate",
          progressValue: 0,
          progressLabel: buildBatchPrintProgressLabel(0, examineeNos.length),
        },
      );

      state.batchPrint.isLoading = false;
      renderView();
    }

    return Object.freeze({
      batchPrintSelectedExaminees,
      buildBatchPrintPhaseMessage,
      buildBatchPrintProgressLabel,
    });
  }

  return Object.freeze({
    createAdmitCardBatchPrintHelpers,
  });
});
