(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeUploadWorkflow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createExamineeUploadWorkflowController({
    apiRequestWithUploadProgress,
    arrayBufferToBase64,
    buildUploadSummaryMessage,
    clearSelectedUploadFiles,
    closeUploadOverlayWithAlert,
    closeUploadOverlayWithToast,
    getUploadFileInput,
    getUploadPhotoArchiveInput,
    isUploadActive,
    loadBootstrapData,
    mergeUploadResult,
    readFileAsArrayBuffer,
    setUploadOverlayState,
    showUploadFailureAlert,
    state,
    waitForNextFrame,
  }) {
    async function readUploadFileAsBase64(
      file,
      {
        readingMessage,
        encodingMessage,
        progressLabel,
        encodingProgressLabel = progressLabel,
      } = {},
    ) {
      if (!file) {
        return "";
      }

      setUploadOverlayState({
        isActive: true,
        message: readingMessage,
        progressMode: "determinate",
        progressValue: 0,
        progressLabel,
      });

      const buffer = await readFileAsArrayBuffer(file, {
        onProgress: ({ percent }) => {
          setUploadOverlayState({
            isActive: true,
            message: readingMessage,
            progressMode: "determinate",
            progressValue: percent,
            progressLabel,
          });
        },
      });

      setUploadOverlayState({
        isActive: true,
        message: encodingMessage,
        progressMode: "indeterminate",
        progressLabel: encodingProgressLabel,
      });
      await waitForNextFrame();
      return arrayBufferToBase64(buffer);
    }

    async function uploadPhotoArchiveFile(photoArchiveFile) {
      setUploadOverlayState({
        isActive: true,
        message: "사진 ZIP을 서버로 전송하고 있습니다.",
        progressMode: "determinate",
        progressValue: 0,
        progressLabel: "사진 ZIP 전송",
      });

      return apiRequestWithUploadProgress("/api/examinees/photo-archive", {
        method: "POST",
        body: photoArchiveFile,
        headers: {
          "Content-Type": "application/zip",
        },
      }, {
        onProgress: ({ percent }) => {
          setUploadOverlayState({
            isActive: true,
            message: "사진 ZIP을 서버로 전송하고 있습니다.",
            progressMode: "determinate",
            progressValue: percent,
            progressLabel: "사진 ZIP 전송",
          });
        },
        onUploadComplete: () => {
          setUploadOverlayState({
            isActive: true,
            message: "사진 데이터를 수험생 데이터와 매칭합니다.",
            progressMode: "indeterminate",
            progressLabel: "사진 매칭 및 저장",
          });
        },
      });
    }

    async function uploadSelectedExamineeFile() {
      const file = getUploadFileInput?.()?.files?.[0];
      const photoArchiveFile = getUploadPhotoArchiveInput?.()?.files?.[0];

      if (!file && !photoArchiveFile) {
        showUploadFailureAlert("XLSX 파일 또는 사진 ZIP 파일을 먼저 선택하세요.");
        return;
      }

      if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
        showUploadFailureAlert("현재는 XLSX 업로드만 지원합니다.");
        return;
      }

      if (photoArchiveFile && !photoArchiveFile.name.toLowerCase().endsWith(".zip")) {
        showUploadFailureAlert("수험생 사진은 ZIP 파일로 업로드해야 합니다.");
        return;
      }

      if (isUploadActive()) {
        return;
      }

      try {
        const hasXlsx = Boolean(file);
        const hasPhotoArchive = Boolean(photoArchiveFile);
        let result = {
          processed: 0,
          photoUploaded: 0,
          photoSkipped: 0,
        };

        if (hasXlsx) {
          const fileContentBase64 = await readUploadFileAsBase64(file, {
            readingMessage: "XLSX 파일을 읽는 중입니다.",
            encodingMessage: "XLSX 파일을 업로드 형식으로 준비하고 있습니다.",
            progressLabel: "XLSX 읽기",
            encodingProgressLabel: "XLSX 준비",
          });
          const requestBody = JSON.stringify({
            fileName: file?.name || "",
            fileContentBase64,
          });

          setUploadOverlayState({
            isActive: true,
            message: "수험생 데이터를 서버로 전송하고 있습니다.",
            progressMode: "determinate",
            progressValue: 0,
            progressLabel: "XLSX 전송",
          });

          const workbookResult = await apiRequestWithUploadProgress("/api/examinees/import", {
            method: "POST",
            body: requestBody,
          }, {
            onProgress: ({ percent }) => {
              setUploadOverlayState({
                isActive: true,
                message: "수험생 데이터를 서버로 전송하고 있습니다.",
                progressMode: "determinate",
                progressValue: percent,
                progressLabel: "XLSX 전송",
              });
            },
            onUploadComplete: () => {
              setUploadOverlayState({
                isActive: true,
                message: "수험생 데이터를 MariaDB에 반영하고 있습니다.",
                progressMode: "indeterminate",
                progressLabel: "수험생 데이터 저장",
              });
            },
          });

          result = mergeUploadResult(result, workbookResult);
        }

        if (hasPhotoArchive) {
          const photoResult = await uploadPhotoArchiveFile(photoArchiveFile);
          result = mergeUploadResult(result, photoResult);
        }

        setUploadOverlayState({
          isActive: true,
          message: "업로드 결과를 화면에 반영하고 있습니다.",
          progressMode: "indeterminate",
          progressLabel: "목록 새로고침",
        });
        await loadBootstrapData({ showLoading: false });
        clearSelectedUploadFiles();
        setUploadOverlayState({
          isActive: true,
          message: "업로드를 마무리하고 있습니다.",
          progressMode: "determinate",
          progressValue: 100,
          progressLabel: "업로드 완료",
        });
        await closeUploadOverlayWithToast(buildUploadSummaryMessage(result, { hasPhotoArchive }), "success", 4200);
      } catch (error) {
        if (isUploadActive()) {
          const currentProgressMode = state.upload?.progressMode || "hidden";
          setUploadOverlayState({
            isActive: true,
            message: "업로드 처리를 정리하고 있습니다.",
            progressMode: currentProgressMode,
            progressValue: currentProgressMode === "determinate" ? state.upload?.progressValue || 0 : 0,
            progressLabel: state.upload?.progressLabel || "",
          });
          await closeUploadOverlayWithAlert(error.message);
          return;
        }

        showUploadFailureAlert(error.message);
      }
    }

    return Object.freeze({
      readUploadFileAsBase64,
      uploadPhotoArchiveFile,
      uploadSelectedExamineeFile,
    });
  }

  return Object.freeze({
    createExamineeUploadWorkflowController,
  });
});
