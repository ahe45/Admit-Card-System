(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      batchPrintModule: require("./workflow/batch-print"),
      pdfUtilsModule: require("./workflow/pdf-utils"),
      printHistoryModule: require("./workflow/print-history"),
      selectionModule: require("./workflow/selection"),
    });
    return;
  }

  globalScope.AdmitCardWorkflow = factory({
    batchPrintModule: globalScope.AdmitCardWorkflowBatchPrint,
    pdfUtilsModule: globalScope.AdmitCardWorkflowPdfUtils,
    printHistoryModule: globalScope.AdmitCardWorkflowPrintHistory,
    selectionModule: globalScope.AdmitCardWorkflowSelection,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({
  batchPrintModule,
  pdfUtilsModule,
  printHistoryModule,
  selectionModule,
}) => {

  if (!selectionModule?.createAdmitCardSelectionHelpers) {
    throw new Error("client/features/admit-cards/workflow/selection.js must be loaded before workflow.js.");
  }

  if (!pdfUtilsModule?.createAdmitCardPdfHelpers) {
    throw new Error("client/features/admit-cards/workflow/pdf-utils.js must be loaded before workflow.js.");
  }

  if (!printHistoryModule?.createAdmitCardPrintHistoryHelpers) {
    throw new Error("client/features/admit-cards/workflow/print-history.js must be loaded before workflow.js.");
  }

  if (!batchPrintModule?.createAdmitCardBatchPrintHelpers) {
    throw new Error("client/features/admit-cards/workflow/batch-print.js must be loaded before workflow.js.");
  }

  const { createAdmitCardSelectionHelpers } = selectionModule;
  const { createAdmitCardPdfHelpers } = pdfUtilsModule;
  const { createAdmitCardPrintHistoryHelpers } = printHistoryModule;
  const { createAdmitCardBatchPrintHelpers } = batchPrintModule;

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
    const selectionHelpers = createAdmitCardSelectionHelpers({
      getGridRowId,
      getGridRows,
      getGridSelectedRowIds,
    });
    const {
      getSelectedAdmitCardExamineeCount,
      getSelectedAdmitCardExaminees,
    } = selectionHelpers;

    const pdfHelpers = createAdmitCardPdfHelpers({ buildApiUrl });
    const {
      fetchExamineeAdmitCardPdfUrl,
      openPdfWindow,
      printPdfUrl,
    } = pdfHelpers;

    const printHistoryHelpers = createAdmitCardPrintHistoryHelpers({
      apiRequest,
      loadBootstrapData,
      renderView,
      state,
    });
    const { normalizeExamineeNoList, recordExamineePrint } = printHistoryHelpers;

    const batchPrintHelpers = createAdmitCardBatchPrintHelpers({
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
    });
    const { batchPrintSelectedExaminees } = batchPrintHelpers;

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
