const { createAccountRoutes } = require("./routes/accounts");
const { createApplicantRoutes } = require("./routes/applications");
const { createAuthRoutes } = require("./routes/auth");
const { createExamineeRoutes } = require("./routes/examinees");
const { createPrintHistoryRoutes } = require("./routes/print-history");
const { createSystemRoutes } = require("./routes/system");
const { createTemplateRoutes } = require("./routes/templates");

function createApiRoutes(deps) {
  return Object.freeze([
    ...createAuthRoutes(deps),
    ...createApplicantRoutes(deps),
    ...createExamineeRoutes(deps),
    ...createPrintHistoryRoutes(deps),
    ...createSystemRoutes(deps),
    ...createTemplateRoutes(deps),
    ...createAccountRoutes(deps),
  ]);
}

module.exports = {
  createApiRoutes,
};
