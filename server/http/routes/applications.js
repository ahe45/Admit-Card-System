const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createApplicantRoutes(deps) {
  return [
    exactRoute("GET", "/api/public/applicant-form", async ({ response }) => {
      return deps.sendJson(response, 200, await deps.getApplicantPublicForm());
    }, { auth: false }),
    exactRoute("POST", "/api/public/email-verifications", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.sendApplicantVerificationCode(body));
    }, { auth: false }),
    exactRoute("POST", "/api/public/email-verifications/verify", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.verifyApplicantVerificationCode(body));
    }, { auth: false }),
    exactRoute("POST", "/api/public/applications/lookup", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.lookupApplicantSubmission(body));
    }, { auth: false }),
    exactRoute("POST", "/api/public/applications", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.saveApplicantSubmission(body));
    }, { auth: false }),
    exactRoute("GET", "/api/applicant-recruitment-units/template.xlsx", async ({ response }) => {
      const workbookBuffer = await deps.buildApplicantRecruitmentUnitTemplateBuffer();

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "접수 설정 업로드 양식.xlsx"),
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/applicant-recruitment-units/export.xlsx", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const workbookBuffer = await deps.buildApplicantRecruitmentUnitExportBuffer(Array.isArray(body?.rows) ? body.rows : []);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "접수 설정 데이터.xlsx"),
          "Cache-Control": "no-store",
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/applicant-submissions/export.xlsx", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const workbookBuffer = await deps.buildApplicantSubmissionExportBuffer(Array.isArray(body?.rows) ? body.rows : []);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "접수 이력 데이터.xlsx"),
          "Cache-Control": "no-store",
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/applicant-submissions/photos.zip", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const zipBuffer = await deps.buildApplicantSubmissionPhotoArchiveBuffer(Array.isArray(body?.rows) ? body.rows : []);

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/zip",
          "Content-Disposition": deps.buildContentDisposition("attachment", "접수 이력 수험생 사진.zip"),
          "Cache-Control": "no-store",
        },
        zipBuffer,
      );
    }),
    regexRoute(
      "GET",
      /^\/api\/applicant-submissions\/(?<submissionId>\d+)\/photo$/,
      async ({ response, params }) => {
        const applicantSubmissionPhoto = await deps.getApplicantSubmissionPhoto(params.submissionId);

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Type": applicantSubmissionPhoto.photoMime || "application/octet-stream",
            "Content-Disposition": deps.buildContentDisposition(
              "inline",
              applicantSubmissionPhoto.photoName || `applicant-submission-${params.submissionId}.jpg`,
            ),
            "Cache-Control": "no-store",
          },
          applicantSubmissionPhoto.photoBlob,
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/applicant-recruitment-units/import", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.importApplicantRecruitmentUnits(body));
    }),
    regexRoute(
      "GET",
      /^\/api\/public\/applications\/(?<submissionId>\d+)\/admit-card\.pdf$/,
      async ({ response, params, searchParams }) => {
        const admitCardPdf = await deps.buildApplicantAdmitCardPdfForAccessToken(
          searchParams.get("token"),
          params.submissionId,
        );

        return deps.sendBinary(
          response,
          200,
          {
            "Content-Type": "application/pdf",
            "Content-Disposition": deps.buildContentDisposition(
              "inline",
              `${admitCardPdf.fileNameBase || params.submissionId}.pdf`,
            ),
            "Cache-Control": "no-store",
          },
          admitCardPdf.pdfBuffer,
        );
      },
      { auth: false, getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/applicant-form-fields", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 201, await deps.createApplicantFormField(body));
    }),
    regexRoute(
      "PUT",
      /^\/api\/applicant-form-fields\/(?<fieldId>\d+)$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.updateApplicantFormField(params.fieldId, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/applicant-form-fields\/(?<fieldId>\d+)$/,
      async ({ response, params }) => deps.sendJson(response, 200, await deps.deleteApplicantFormField(params.fieldId)),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/applicant-form-fields\/(?<fieldId>\d+)\/move$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.moveApplicantFormField(params.fieldId, body || {}));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("POST", "/api/applicant-recruitment-units", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 201, await deps.createApplicantRecruitmentUnit(body));
    }),
    regexRoute(
      "PUT",
      /^\/api\/applicant-recruitment-units\/(?<unitId>\d+)$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.updateApplicantRecruitmentUnit(params.unitId, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/applicant-recruitment-units\/(?<unitId>\d+)$/,
      async ({ response, params }) => deps.sendJson(response, 200, await deps.deleteApplicantRecruitmentUnit(params.unitId)),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    exactRoute("PUT", "/api/applicant-settings", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.updateApplicantSettings(body));
    }),
    regexRoute(
      "PUT",
      /^\/api\/applicant-submissions\/(?<submissionId>\d+)\/photo$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.updateApplicantSubmissionPhoto(params.submissionId, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/applicant-submissions\/(?<submissionId>\d+)\/promote$/,
      async ({ response, params }) => deps.sendJson(response, 200, await deps.promoteApplicantSubmission(params.submissionId)),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createApplicantRoutes,
};
