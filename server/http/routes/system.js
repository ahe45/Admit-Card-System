const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createSystemRoutes(deps) {
  return [
    exactRoute("GET", "/api/bootstrap", async ({ response }) => deps.sendJson(response, 200, await deps.getBootstrapPayload())),
    exactRoute("GET", "/api/system-settings", async ({ response }) => deps.sendJson(response, 200, await deps.getSystemSettings())),
    exactRoute("PUT", "/api/login-notice", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.updateLoginNoticeHtml(body));
    }),
    exactRoute("PUT", "/api/system-settings", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 200, await deps.updateSystemSettings(body));
    }),
    regexRoute(
      "DELETE",
      /^\/api\/system-data\/(?<scope>all|applicant-settings|applicant-history|examinees|photos|print-history)$/,
      async ({ request, response, params, authenticatedAccount }) => {
        const body = await deps.readJsonBody(request);

        if (String(params.scope || "") === "all") {
          await deps.verifySystemDataDeletionPassword(authenticatedAccount?.id, body?.currentPassword);
        }

        return deps.sendJson(response, 200, await deps.deleteSystemData(params.scope));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createSystemRoutes,
};
