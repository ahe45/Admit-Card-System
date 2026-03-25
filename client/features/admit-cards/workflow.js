(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardWorkflow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAdmitCardWorkflowController({
    BATCH_PRINT_JOB_TIMEOUT_MS,
    BATCH_PRINT_STATUS_POLL_INTERVAL_MS,
    apiRequest,
    apiRequestForBlobWithProgress,
    buildApiUrl,
    getExamineeGridRows,
    getGridRowId,
    getGridRows,
    getGridSelectedRowIds,
    handleAuthenticationFailure,
    loadBootstrapData,
    normalizeProgressValue,
    renderView,
    runWithPdfGenerationLock,
    setPdfGenerationState,
    showToast,
    state,
    wait,
  }) {
    function getSelectedAdmitCardExaminees() {
      if (
        typeof getGridRows !== "function" ||
        typeof getGridRowId !== "function" ||
        typeof getGridSelectedRowIds !== "function"
      ) {
        return [];
      }

      const selectedRowIds = new Set(getGridSelectedRowIds("admitCardLookupGrid"));

      return getGridRows("admitCardLookupGrid").filter((row) =>
        selectedRowIds.has(getGridRowId("admitCardLookupGrid", row)),
      );
    }

    function getSelectedAdmitCardExamineeCount() {
      return getSelectedAdmitCardExaminees().length;
    }

    async function fetchExamineeAdmitCardPdfUrl(examineeNo) {
      const response = await fetch(buildApiUrl(`/api/examinees/${encodeURIComponent(examineeNo)}/admit-card.pdf`));
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const payload = contentType.includes("application/json") ? await response.json() : await response.text();
        throw new Error(payload?.error || payload || "수험표 PDF를 생성할 수 없습니다.");
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    function openPdfWindow(pdfUrl, { shouldPrint = false } = {}) {
      const normalizedUrl = String(pdfUrl || "").trim();

      if (!normalizedUrl) {
        return null;
      }

      const previewWindow = window.open(normalizedUrl, "_blank", "noopener,noreferrer");

      if (!previewWindow) {
        return null;
      }

      previewWindow.focus();

      if (shouldPrint) {
        window.setTimeout(() => {
          try {
            previewWindow.print();
          } catch (error) {
            // Ignore print invocation failures and keep the viewer open.
          }
        }, 400);
      }

      return previewWindow;
    }

    function printPdfUrl(pdfUrl) {
      const normalizedUrl = String(pdfUrl || "").trim();

      if (!normalizedUrl) {
        return Promise.reject(new Error("인쇄할 PDF 문서가 없습니다."));
      }

      return new Promise((resolve, reject) => {
        const printFrame = document.createElement("iframe");
        let hasCompleted = false;
        let fallbackTimerId = 0;
        let printTimerId = 0;

        const finalize = (error) => {
          if (hasCompleted) {
            return;
          }

          hasCompleted = true;
          window.clearTimeout(fallbackTimerId);
          window.clearTimeout(printTimerId);
          window.setTimeout(() => {
            printFrame.remove();
          }, 1000);

          if (error) {
            reject(error);
            return;
          }

          resolve();
        };

        const triggerPrint = () => {
          try {
            if (!printFrame.contentWindow) {
              throw new Error("PDF 인쇄 프레임을 열 수 없습니다.");
            }

            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            finalize();
          } catch (error) {
            finalize(error);
          }
        };

        printFrame.setAttribute("aria-hidden", "true");
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        printFrame.style.opacity = "0";
        printFrame.style.pointerEvents = "none";
        printFrame.onload = () => {
          printTimerId = window.setTimeout(triggerPrint, 400);
        };
        fallbackTimerId = window.setTimeout(triggerPrint, 1600);
        printFrame.src = normalizedUrl;
        document.body.appendChild(printFrame);
      });
    }

    function normalizeExamineeNoList(examineeNos) {
      const list = Array.isArray(examineeNos) ? examineeNos : [examineeNos];

      return Array.from(
        new Set(
          list
            .map((examineeNo) => String(examineeNo || "").trim())
            .filter(Boolean),
        ),
      );
    }

    async function recordExamineePrint(examineeNos) {
      const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

      if (normalizedExamineeNos.length === 0) {
        return;
      }

      try {
        await apiRequest("/api/print-history", {
          method: "POST",
          body: JSON.stringify(
            normalizedExamineeNos.length === 1
              ? { examineeNo: normalizedExamineeNos[0] }
              : { examineeNos: normalizedExamineeNos },
          ),
        });
        await loadBootstrapData({ showLoading: false });
      } catch (error) {
        state.bootstrap.error = error.message;
        renderView();
      }
    }

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

    async function printExamineeAdmitCard(examineeNo) {
      const examinee = getExamineeGridRows().find((row) => row.examineeNo === examineeNo);

      if (!examinee) {
        return;
      }

      await runWithPdfGenerationLock(
        `${examinee.name} 수험표 PDF를 생성하고 있습니다.`,
        async () => {
          let pdfUrl = "";

          try {
            pdfUrl = await fetchExamineeAdmitCardPdfUrl(examineeNo);

            try {
              await printPdfUrl(pdfUrl);
            } catch (error) {
              const popupWindow = openPdfWindow(pdfUrl, { shouldPrint: true });

              if (!popupWindow) {
                throw new Error("브라우저에서 PDF 인쇄 창을 열지 못했습니다. 팝업 허용 후 다시 시도하세요.");
              }
            }

            await recordExamineePrint(examineeNo);
            showToast(`${examinee.name} 수험표 인쇄를 시작했습니다.`);
          } catch (error) {
            showToast(error.message, "error", 4200);
          } finally {
            if (pdfUrl) {
              window.setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
              }, 60000);
            }
          }
        },
      );
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
      fetchExamineeAdmitCardPdfUrl,
      getSelectedAdmitCardExamineeCount,
      getSelectedAdmitCardExaminees,
      normalizeExamineeNoList,
      openPdfWindow,
      printExamineeAdmitCard,
      printPdfUrl,
      recordExamineePrint,
    });
  }

  return Object.freeze({
    createAdmitCardWorkflowController,
  });
});
