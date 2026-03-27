const { execFile } = require("child_process");
const { randomUUID } = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function createAdmitCardPdfService({
  createHttpError,
  edgeExecutablePaths,
  escapeHtml,
  getActiveTemplate,
  getExamineeByNo,
  normalizeExamineeNoList,
  renderTemplateWithExaminee,
}) {
  function getPdfExecutablePath() {
    const executablePath = edgeExecutablePaths.find((possiblePath) => fs.existsSync(possiblePath));

    if (!executablePath) {
      throw createHttpError(500, "PDF 생성을 위한 Microsoft Edge 실행 파일을 찾을 수 없습니다.");
    }

    return executablePath;
  }

  function getTemplateDocumentStyles() {
    return `
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: "Noto Sans KR", sans-serif;
        color: #152033;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .template-render-sheet {
        width: 794px;
        min-height: 1123px;
        margin: 0;
        padding: 44px 46px;
        background: #ffffff;
      }
      .template-render-sheet:not(:last-child) {
        break-after: page;
        page-break-after: always;
      }
      .template-render-sheet .template-doc {
        position: relative;
        min-height: 100%;
      }
      .template-render-sheet h1,
      .template-render-sheet h2,
      .template-render-sheet h3,
      .template-render-sheet p { margin-top: 0; }
      .template-render-sheet img { max-width: 100%; height: auto; display: block; }
      .template-render-sheet .examinee-photo-token-image {
        width: 100%;
        max-width: 100%;
        height: 100%;
        min-height: 120px;
        object-fit: cover;
      }
      .template-render-sheet td.examinee-photo-token-cell,
      .template-render-sheet th.examinee-photo-token-cell {
        position: relative;
        overflow: hidden;
        padding: 0 !important;
        line-height: 0;
        text-align: center;
        vertical-align: middle;
      }
      .template-render-sheet .examinee-photo-token-cell .examinee-photo-token-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        min-height: 100%;
        max-width: none;
        max-height: none;
        margin: 0;
        object-fit: contain;
        background: #ffffff;
      }
      .template-render-sheet .examinee-photo-token-cell .examinee-photo-placeholder {
        position: absolute;
        inset: 0;
        width: 100%;
        max-width: none;
        margin: 0;
      }
      .template-render-sheet .template-generated-object {
        background: #ffffff;
      }
      .template-render-sheet .template-generated-object-barcode {
        object-fit: fill;
      }
      .template-render-sheet .template-generated-object-qrcode {
        object-fit: contain;
      }
      .template-render-sheet .template-data-fit {
        display: inline;
      }
      .template-render-sheet .examinee-photo-placeholder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 1px dashed rgba(138, 154, 181, 0.92);
        color: #53627a;
        font-size: 13px;
        font-weight: 700;
        text-align: center;
        background: rgba(246, 248, 252, 0.92);
      }
      .template-render-sheet table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: fixed; }
      .template-render-sheet th,
      .template-render-sheet td { border: 1px solid #000000; padding: 5px 6px; text-align: left; vertical-align: top; }
      .template-render-sheet hr { border: 0; border-top: 1px solid #d8e0ea; margin: 18px 0; }
    `;
  }

  function getTemplateDocumentScript() {
    return `
      (() => {
        const MIN_SCALE = 0.7;
        const STEP_PX = 0.5;
        const BASE_FONT_SIZE_DATASET_KEY = "templateDataFitBaseFontSize";

        function getTextRectCount(element) {
          if (!(element instanceof HTMLElement)) {
            return 0;
          }

          const range = document.createRange();
          range.selectNodeContents(element);
          const rectCount = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0).length;
          range.detach?.();
          return rectCount;
        }

        function isWrapped(element) {
          if (!(element instanceof HTMLElement) || !element.isConnected) {
            return false;
          }

          return getTextRectCount(element) > 1;
        }

        function fitTemplateDataValue(element) {
          if (!(element instanceof HTMLElement) || !element.textContent?.trim()) {
            return;
          }

          const storedBaseFontSize = Number.parseFloat(element.dataset[BASE_FONT_SIZE_DATASET_KEY] || "");
          const computedFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
          const baseFontSize =
            Number.isFinite(storedBaseFontSize) && storedBaseFontSize > 0 ? storedBaseFontSize : computedFontSize;

          if (!Number.isFinite(baseFontSize) || baseFontSize <= 0) {
            return;
          }

          element.dataset[BASE_FONT_SIZE_DATASET_KEY] = String(baseFontSize);
          const minFontSize = baseFontSize * MIN_SCALE;
          let nextFontSize = baseFontSize;

          element.style.fontSize = baseFontSize + "px";

          if (!isWrapped(element)) {
            element.style.removeProperty("font-size");
            return;
          }

          while (nextFontSize > minFontSize) {
            nextFontSize = Math.max(minFontSize, nextFontSize - STEP_PX);
            element.style.fontSize = nextFontSize + "px";

            if (!isWrapped(element)) {
              break;
            }
          }
        }

        function fitAllTemplateDataValues() {
          document.querySelectorAll("[data-template-data-fit='true']").forEach((element) => {
            fitTemplateDataValue(element);
          });
        }

        document.addEventListener("DOMContentLoaded", () => {
          window.requestAnimationFrame(fitAllTemplateDataValues);
        });

        window.addEventListener("load", () => {
          fitAllTemplateDataValues();
        });
      })();
    `;
  }

  function buildAdmitCardDocumentHtml(title, renderedSheets) {
    const sheetMarkup = (Array.isArray(renderedSheets) ? renderedSheets : [renderedSheets])
      .map(
        (renderedHtml) => `
          <article class="template-render-sheet">
            ${renderedHtml}
          </article>
        `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(title)}</title>
          <style>${getTemplateDocumentStyles()}</style>
          <script>${getTemplateDocumentScript()}</script>
        </head>
        <body>
          ${sheetMarkup}
        </body>
      </html>
    `;
  }

  async function buildAdmitCardPdfBufferFromSheets(title, renderedSheets) {
    const tempDirectory = path.join(os.tmpdir(), "admitcard-pdf");
    const fileId = randomUUID();
    const htmlPath = path.join(tempDirectory, `${fileId}.html`);
    const pdfPath = path.join(tempDirectory, `${fileId}.pdf`);

    try {
      await fs.promises.mkdir(tempDirectory, { recursive: true });
      await fs.promises.writeFile(htmlPath, buildAdmitCardDocumentHtml(title, renderedSheets), "utf8");
      await execFileAsync(getPdfExecutablePath(), [
        "--headless",
        "--disable-gpu",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ]);

      if (!fs.existsSync(pdfPath)) {
        throw createHttpError(500, "수험표 PDF 파일을 생성하지 못했습니다.");
      }

      return await fs.promises.readFile(pdfPath);
    } finally {
      await Promise.allSettled([
        fs.promises.unlink(htmlPath),
        fs.promises.unlink(pdfPath),
      ]);
    }
  }

  async function buildAdmitCardPdfBufferFromRecord(record = {}, options = {}) {
    const template = await getActiveTemplate();
    const title = String(options.title || `${record?.name || record?.examineeNo || "수험표"} 수험표`).trim() || "수험표";
    const renderedHtml = await renderTemplateWithExaminee(template.contentHtml, record || {});

    return buildAdmitCardPdfBufferFromSheets(title, [renderedHtml]);
  }

  async function buildAdmitCardPdfBuffer(examineeNo) {
    const examinee = await getExamineeByNo(examineeNo);
    return buildAdmitCardPdfBufferFromRecord(examinee, {
      title: `${examinee.name} 수험표`,
    });
  }

  async function buildBatchAdmitCardPdfBuffer(examineeNos, options = {}) {
    const normalizedExamineeNos = normalizeExamineeNoList(examineeNos);

    if (normalizedExamineeNos.length === 0) {
      throw createHttpError(400, "출력 대상 수험번호가 필요합니다.");
    }

    options.onPhaseChange?.({
      phase: "preparing",
      completedCount: 0,
      totalCount: normalizedExamineeNos.length,
    });

    const template = await getActiveTemplate();
    const examinees = await Promise.all(normalizedExamineeNos.map((examineeNo) => getExamineeByNo(examineeNo)));
    let completedCount = 0;

    options.onPhaseChange?.({
      phase: "rendering",
      completedCount,
      totalCount: examinees.length,
    });

    const renderedSheets = await Promise.all(
      examinees.map(async (examinee) => {
        const renderedSheet = await renderTemplateWithExaminee(template.contentHtml, examinee);
        completedCount += 1;
        options.onProgress?.({
          phase: "rendering",
          completedCount,
          totalCount: examinees.length,
          examineeNo: examinee.examineeNo,
        });
        return renderedSheet;
      }),
    );

    options.onPhaseChange?.({
      phase: "finalizing",
      completedCount: examinees.length,
      totalCount: examinees.length,
    });

    return buildAdmitCardPdfBufferFromSheets(`수험표 ${examinees.length}명`, renderedSheets);
  }

  return Object.freeze({
    buildAdmitCardPdfBuffer,
    buildAdmitCardPdfBufferFromRecord,
    buildBatchAdmitCardPdfBuffer,
  });
}

module.exports = {
  createAdmitCardPdfService,
};
