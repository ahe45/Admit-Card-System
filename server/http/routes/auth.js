const { exactRoute } = require("../router");

function createAuthRoutes(deps) {
  return [
    exactRoute(
      "GET",
      "/api/health",
      async ({ response }) => {
        const [health] = await deps.query(`SELECT 1 AS ok`);

        return deps.sendJson(response, 200, {
          ok: Number(health?.ok || 0) === 1,
          database: deps.databaseName || "admit_card",
        });
      },
      { auth: false },
    ),
    exactRoute(
      "GET",
      "/api/auth/session",
      async ({ request, response }) => deps.sendJson(response, 200, await deps.getAuthSessionPayload(request)),
      { auth: false },
    ),
    exactRoute(
      "POST",
      "/api/auth/login",
      async ({ request, response }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.loginAccount(body, response));
      },
      { auth: false },
    ),
    exactRoute(
      "POST",
      "/api/auth/password/setup",
      async ({ request, response }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.completeTemporaryPasswordSetup(request, body, response));
      },
      { auth: false },
    ),
    exactRoute(
      "POST",
      "/api/auth/logout",
      async ({ request, response }) => deps.sendJson(response, 200, deps.logoutAccount(request, response)),
      { auth: false },
    ),
    exactRoute(
      "GET",
      "/api/login-notice",
      async ({ response }) =>
        deps.sendJson(response, 200, {
          html: await deps.getLoginNoticeHtml(),
        }),
      { auth: false },
    ),
  ];
}

module.exports = {
  createAuthRoutes,
};
