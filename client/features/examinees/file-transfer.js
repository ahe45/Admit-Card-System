(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeFileTransfer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const apiClient = globalThis.AdmitCardApiClient;

  function triggerBlobDownload(blob, fileName) {
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function waitForNextFrame() {
    return new Promise((resolve) => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      window.setTimeout(resolve, 0);
    });
  }

  function wait(delayMs) {
    const normalizedDelay = Math.max(0, Math.round(Number(delayMs) || 0));

    if (normalizedDelay === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      window.setTimeout(resolve, normalizedDelay);
    });
  }

  function readFileAsArrayBuffer(file, { onProgress } = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress?.({
          loaded: event.loaded,
          total: event.total,
          percent: event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0,
        });
      });
      reader.addEventListener("load", () => {
        onProgress?.({
          loaded: file?.size || 0,
          total: file?.size || 0,
          percent: 100,
        });
        resolve(reader.result);
      });
      reader.addEventListener("error", () => reject(new Error("파일을 읽는 중 오류가 발생했습니다.")));
      reader.readAsArrayBuffer(file);
    });
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  }

  function clearSelectedUploadFiles() {
    if (typeof uploadFileInput !== "undefined" && uploadFileInput) {
      uploadFileInput.value = "";
    }
    if (typeof uploadFileName !== "undefined" && uploadFileName) {
      uploadFileName.textContent = "선택된 데이터 파일이 없습니다.";
    }
    if (typeof uploadPhotoArchiveInput !== "undefined" && uploadPhotoArchiveInput) {
      uploadPhotoArchiveInput.value = "";
    }
    if (typeof uploadPhotoArchiveName !== "undefined" && uploadPhotoArchiveName) {
      uploadPhotoArchiveName.textContent = "선택된 사진 ZIP이 없습니다.";
    }
  }

  function buildUploadSummaryMessage(result = {}, { hasPhotoArchive = false } = {}) {
    const processed = Number(result.processed || 0);
    const photoUploaded = Number(result.photoUploaded || 0);
    const photoSkipped = Number(result.photoSkipped || 0);
    const messages = [];

    if (processed > 0) {
      messages.push(`${processed}건의 수험생 데이터를 저장했습니다.`);
    }

    if (photoUploaded > 0 || hasPhotoArchive) {
      messages.push(`사진 ${photoUploaded}건을 매칭했습니다.`);
    }

    if (photoSkipped > 0) {
      messages.push(`${photoSkipped}건은 파일명 불일치 또는 미등록 수험번호로 건너뛰었습니다.`);
    }

    return messages.join(" ") || "업로드를 완료했습니다.";
  }

  function mergeUploadResult(target = {}, source = {}) {
    return {
      processed: Number(target.processed || 0) + Number(source.processed || 0),
      photoUploaded: Number(target.photoUploaded || 0) + Number(source.photoUploaded || 0),
      photoSkipped: Number(target.photoSkipped || 0) + Number(source.photoSkipped || 0),
    };
  }

  async function downloadExamineeTemplate() {
    try {
      const response = await fetch(apiClient.buildApiUrl("/api/examinees/template.xlsx"));
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const payload = contentType.includes("application/json") ? await response.json() : await response.text();
        throw new Error(payload?.error || payload || "XLSX 템플릿을 다운로드할 수 없습니다.");
      }

      triggerBlobDownload(await response.blob(), "수험생 데이터 업로드 양식.xlsx");
    } catch (error) {
      showToast(error.message, "error", 4200);
    }
  }

  async function downloadExamineeGridWorkbook() {
    const filteredRows = typeof getGridRows === "function" ? getGridRows("examineeRegistrationGrid") : [];

    if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
      showToast("필터링된 데이터가 없습니다.", "error", 4200);
      return;
    }

    try {
      const response = await fetch(apiClient.buildApiUrl("/api/examinees/export.xlsx"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: filteredRows,
        }),
      });
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const payload = contentType.includes("application/json") ? await response.json() : await response.text();
        throw new Error(payload?.error || payload || "수험생 데이터 XLSX를 다운로드할 수 없습니다.");
      }

      triggerBlobDownload(await response.blob(), "수험생 등록 데이터.xlsx");
    } catch (error) {
      showToast(error.message, "error", 4200);
    }
  }

  async function downloadPrintHistoryGridWorkbook() {
    const filteredRows = typeof getGridRows === "function" ? getGridRows("printHistoryGrid") : [];
    const summaryExaminees = typeof getPrintHistorySummaryExamineeRows === "function" ? getPrintHistorySummaryExamineeRows() : [];

    if ((!Array.isArray(filteredRows) || filteredRows.length === 0) && (!Array.isArray(summaryExaminees) || summaryExaminees.length === 0)) {
      showToast("필터링된 데이터가 없습니다.", "error", 4200);
      return;
    }

    try {
      const response = await fetch(apiClient.buildApiUrl("/api/print-history/export.xlsx"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: filteredRows,
          summaryExaminees,
        }),
      });
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const payload = contentType.includes("application/json") ? await response.json() : await response.text();
        throw new Error(payload?.error || payload || "출력 이력 XLSX를 다운로드할 수 없습니다.");
      }

      triggerBlobDownload(await response.blob(), "수험표 출력 이력.xlsx");
    } catch (error) {
      showToast(error.message, "error", 4200);
    }
  }

  return {
    arrayBufferToBase64,
    buildUploadSummaryMessage,
    clearSelectedUploadFiles,
    downloadExamineeGridWorkbook,
    downloadExamineeTemplate,
    downloadPrintHistoryGridWorkbook,
    mergeUploadResult,
    readFileAsArrayBuffer,
    wait,
    waitForNextFrame,
  };
});
