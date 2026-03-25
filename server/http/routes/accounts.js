const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createAccountRoutes(deps) {
  return [
    exactRoute("POST", "/api/accounts", async ({ request, response }) => {
      const body = await deps.readJsonBody(request);
      return deps.sendJson(response, 201, await deps.createAccount(body));
    }),
    regexRoute(
      "PUT",
      /^\/api\/accounts\/(?<accountId>[^/]+)$/,
      async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        return deps.sendJson(response, 200, await deps.updateAccount(params.accountId, body));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/accounts\/(?<accountId>[^/]+)\/reset-password$/,
      async ({ response, params }) => deps.sendJson(response, 200, await deps.resetAccountPassword(params.accountId)),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/accounts\/(?<accountId>[^/]+)$/,
      async ({ response, params }) => deps.sendJson(response, 200, await deps.deleteAccount(params.accountId)),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createAccountRoutes,
};
