const { exactRoute } = require("../router");

function createPrintHistoryRoutes(deps) {
  return [
    exactRoute("POST", "/api/print-history/export.xlsx", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      const workbookBuffer = await deps.buildPrintHistoryExportBuffer(
        Array.isArray(body?.rows) ? body.rows : [],
        Array.isArray(body?.summaryExaminees) ? body.summaryExaminees : [],
      );

      return deps.sendBinary(
        response,
        200,
        {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": deps.buildContentDisposition("attachment", "수험표 출력 이력.xlsx"),
          "Cache-Control": "no-store",
        },
        workbookBuffer,
      );
    }),
    exactRoute("POST", "/api/print-history", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 201, await deps.recordPrintHistory(body));
    }),
  ];
}

module.exports = {
  createPrintHistoryRoutes,
};
