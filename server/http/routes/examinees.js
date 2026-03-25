const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createExamineeRoutes(deps) {
  return [
    exactRoute("GET", "/api/examinees/template.xlsx", async ({ response }) => {
      const workbookBuffer = await deps.buildExamineeTemplateBuffer();

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "수험생 데이터 업로드 양식.xlsx"),
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/examinees/export.xlsx", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const workbookBuffer = await deps.buildExamineeExportBuffer(Array.isArray(body?.rows) ? body.rows : []);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "수험생 등록 데이터.xlsx"),
          "Cache-Control": "no-store",
        },
        workbookBuffer,
      );
    }),
    regexRoute(
      "GET",
      /^\/api\/examinees\/(?<examineeNo>[^/]+)\/photo$/,
      async ({ response, params }) => {
        const examineePhoto = await deps.getExamineePhoto(params.examineeNo);

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Type": examineePhoto.photoMime || "application/octet-stream",
            "Content-Disposition": deps.buildContentDisposition("inline", examineePhoto.photoName || `${params.examineeNo}.jpg`),
            "Cache-Control": "no-store",
          },
          examineePhoto.photoBlob,
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "PUT",
      /^\/api\/examinees\/(?<examineeNo>[^/]+)\/photo$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.saveExamineePhoto(params.examineeNo, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/examinees/admit-card-jobs", async ({ request, response, authenticatedAccount }) => {
      const body = await deps.readJsonBody(request);
      const examineeNos = deps.normalizeExamineeNoList(Array.isArray(body?.examineeNos) ? body.examineeNos : body?.examineeNo);

      return deps.sendJson(response, 202, deps.createBatchAdmitCardJob(authenticatedAccount.id, examineeNos), {
        "Cache-Control": "no-store",
      });
    }),
    regexRoute(
      "GET",
      /^\/api\/examinees\/admit-card-jobs\/(?<jobId>[^/]+)$/,
      async ({ response, params, authenticatedAccount }) => {
        const job = deps.getBatchAdmitCardJobOrThrow(params.jobId, authenticatedAccount.id);

        return deps.sendJson(response, 200, deps.buildBatchAdmitCardJobPayload(job), {
          "Cache-Control": "no-store",
        });
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/examinees\/admit-card-jobs\/(?<jobId>[^/]+)\/pdf$/,
      async ({ response, params, authenticatedAccount }) => {
        const job = deps.getBatchAdmitCardJobOrThrow(params.jobId, authenticatedAccount.id);

        if (job.status === "failed") {
          throw deps.createHttpError(409, job.error || "수험표 PDF를 생성할 수 없습니다.", job.errorCode || "BATCH_JOB_FAILED");
        }

        if (job.status !== "completed" || !job.pdfBuffer) {
          throw deps.createHttpError(409, "수험표 PDF 생성이 아직 완료되지 않았습니다.", "BATCH_JOB_NOT_READY");
        }

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Type": "application/pdf",
            "Content-Disposition": deps.buildContentDisposition("inline", job.fileName || "admit-cards.pdf"),
            "Cache-Control": "no-store",
          },
          job.pdfBuffer,
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "GET",
      /^\/api\/examinees\/(?<examineeNo>[^/]+)\/admit-card\.pdf$/,
      async ({ response, params }) => {
        const pdfBuffer = await deps.buildAdmitCardPdfBuffer(params.examineeNo);

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Type": "application/pdf",
            "Content-Disposition": deps.buildContentDisposition("inline", `${params.examineeNo}.pdf`),
            "Cache-Control": "no-store",
          },
          pdfBuffer,
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/examinees/admit-cards.pdf", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const examineeNos = deps.normalizeExamineeNoList(Array.isArray(body?.examineeNos) ? body.examineeNos : body?.examineeNo);
      const pdfBuffer = await deps.buildBatchAdmitCardPdfBuffer(examineeNos);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/pdf",
          "Content-Disposition": deps.buildContentDisposition("inline", `admit-cards-${examineeNos.length}.pdf`),
          "Cache-Control": "no-store",
        },
        pdfBuffer,
      );
    }),
    exactRoute("POST", "/api/examinees/import", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.importExaminees(body));
    }),
    exactRoute("POST", "/api/examinees/photo-archive", async ({ request, response }) => {
      const body = await deps.readBinaryBody(request);
      return deps.sendJson(response, 200, await deps.saveExamineePhotoArchiveBuffer(body));
    }),
    regexRoute(
      "PUT",
      /^\/api\/examinees\/(?<examineeNo>[^/]+)$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.updateExaminee(params.examineeNo, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createExamineeRoutes,
};
