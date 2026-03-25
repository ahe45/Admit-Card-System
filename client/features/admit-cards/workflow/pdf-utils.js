(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardWorkflowPdfUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAdmitCardPdfHelpers({ buildApiUrl }) {
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

    return Object.freeze({
      fetchExamineeAdmitCardPdfUrl,
      openPdfWindow,
      printPdfUrl,
    });
  }

  return Object.freeze({
    createAdmitCardPdfHelpers,
  });
});
