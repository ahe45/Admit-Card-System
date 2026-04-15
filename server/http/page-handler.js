const defaultMimeTypes = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
});

function sendRedirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    "Cache-Control": "no-store",
  });
  response.end();
}

function createPageRequestHandlers({
  fs,
  path,
  root,
  mimeTypes = defaultMimeTypes,
  getRoleMenuVisibilitySettings,
  getAuthSessionPayload,
  getDefaultAccessibleView,
  getPublicSuperAdminSettings,
  getViewFromPathname,
  getViewRoutePath,
  isLoginRoutePath,
  isViewAccessibleForRole,
  loginRoutePath,
  normalizeRoutePath,
}) {
  async function getRoleAccessOptions() {
    if (typeof getRoleMenuVisibilitySettings !== "function") {
      return {};
    }

    return {
      roleMenuVisibility: await getRoleMenuVisibilitySettings(),
    };
  }

  async function getDefaultAccessiblePath(role = "", options = null) {
    return getViewRoutePath(getDefaultAccessibleView(role, options || (await getRoleAccessOptions())));
  }

  function escapeInlineJsonForScript(value) {
    return JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
  }

  function escapeHtmlAttribute(value = "") {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function resolveStaticFilePath(pathname) {
    const requestPath = pathname === "/" ? "/index.html" : pathname;
    const safePath = path
      .normalize(decodeURIComponent(requestPath))
      .replace(/^(\.\.[/\\])+/, "")
      .replace(/^[/\\]+/, "");

    return {
      safePath,
      filePath: path.join(root, safePath),
    };
  }

  function serveStaticFile(response, pathname, options = {}) {
    const { filePath } = resolveStaticFilePath(pathname);

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, {
        "Content-Type": mimeTypes[extension] || "application/octet-stream",
        ...(options.headers || {}),
      });
      response.end(data);
    });
  }

  async function serveHtmlFile(response, pathname, options = {}) {
    const { filePath } = resolveStaticFilePath(pathname);

    try {
      let markup = await fs.promises.readFile(filePath, "utf-8");

      if (options.injectSuperAdminSettings && typeof getPublicSuperAdminSettings === "function") {
        const superAdminSettings = await getPublicSuperAdminSettings();
        const bootstrapScript = `<script>window.AdmitCardInitialSuperAdminSettings = ${escapeInlineJsonForScript(superAdminSettings)};</script>`;
        const logoImageUrl = String(superAdminSettings?.logoImageUrl || "").trim();

        if (logoImageUrl) {
          markup = markup.replace(
            /src="\/client\/assets\/(?:login-stage-brand-mark|logo)\.png"/,
            `src="${escapeHtmlAttribute(logoImageUrl)}"`,
          );
        }

        markup = markup.includes("</head>") ? markup.replace("</head>", `    ${bootstrapScript}\n  </head>`) : `${bootstrapScript}\n${markup}`;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[".html"] || "text/html; charset=utf-8",
        ...(options.headers || {}),
      });
      response.end(markup);
    } catch (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
    }
  }

  async function handlePageRequest(request, response, pathname) {
    const normalizedPath = normalizeRoutePath(pathname);

    if (normalizedPath === "/index.html") {
      sendRedirect(response, "/");
      return true;
    }

    if (normalizedPath === "/applicant.html") {
      sendRedirect(response, "/applicant");
      return true;
    }

    if (normalizedPath === "/") {
      const authPayload = await getAuthSessionPayload(request);
      const nextPath =
        authPayload.authenticated && authPayload.account ? await getDefaultAccessiblePath(authPayload.account.role) : loginRoutePath;
      sendRedirect(response, nextPath);
      return true;
    }

    if (normalizedPath === "/applicant" || normalizedPath.startsWith("/applicant/")) {
      if (normalizedPath !== pathname) {
        sendRedirect(response, normalizedPath);
        return true;
      }

      await serveHtmlFile(response, "/applicant.html", {
        headers: {
          "Cache-Control": "no-store",
        },
        injectSuperAdminSettings: true,
      });
      return true;
    }

    if (isLoginRoutePath(normalizedPath)) {
      if (normalizedPath !== pathname) {
        sendRedirect(response, normalizedPath);
        return true;
      }

      const authPayload = await getAuthSessionPayload(request);

      if (authPayload.authenticated && authPayload.account) {
        sendRedirect(response, await getDefaultAccessiblePath(authPayload.account.role));
        return true;
      }

      await serveHtmlFile(response, "/index.html", {
        headers: {
          "Cache-Control": "no-store",
        },
        injectSuperAdminSettings: true,
      });
      return true;
    }

    const requestedView = getViewFromPathname(normalizedPath);

    if (!requestedView) {
      return false;
    }

    if (normalizedPath !== pathname) {
      sendRedirect(response, normalizedPath);
      return true;
    }

    const authPayload = await getAuthSessionPayload(request);

    if (!authPayload.authenticated || !authPayload.account) {
      sendRedirect(response, loginRoutePath);
      return true;
    }

    const roleAccessOptions = await getRoleAccessOptions();

    if (!isViewAccessibleForRole(requestedView, authPayload.account.role, roleAccessOptions)) {
      sendRedirect(response, await getDefaultAccessiblePath(authPayload.account.role, roleAccessOptions));
      return true;
    }

    await serveHtmlFile(response, "/index.html", {
      headers: {
        "Cache-Control": "no-store",
      },
      injectSuperAdminSettings: true,
    });
    return true;
  }

  return {
    handlePageRequest,
    serveStaticFile,
  };
}

module.exports = {
  createPageRequestHandlers,
  defaultMimeTypes,
};
