const defaultMimeTypes = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
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
  getAuthSessionPayload,
  getDefaultAccessibleView,
  getViewFromPathname,
  getViewRoutePath,
  isLoginRoutePath,
  isViewAccessibleForRole,
  loginRoutePath,
  normalizeRoutePath,
}) {
  function getDefaultAccessiblePath(role = "") {
    return getViewRoutePath(getDefaultAccessibleView(role));
  }

  function serveStaticFile(response, pathname, options = {}) {
    const requestPath = pathname === "/" ? "/index.html" : pathname;
    const safePath = path
      .normalize(decodeURIComponent(requestPath))
      .replace(/^(\.\.[/\\])+/, "")
      .replace(/^[/\\]+/, "");
    const filePath = path.join(root, safePath);

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
        authPayload.authenticated && authPayload.account ? getDefaultAccessiblePath(authPayload.account.role) : loginRoutePath;
      sendRedirect(response, nextPath);
      return true;
    }

    if (normalizedPath === "/applicant" || normalizedPath.startsWith("/applicant/")) {
      if (normalizedPath !== pathname) {
        sendRedirect(response, normalizedPath);
        return true;
      }

      serveStaticFile(response, "/applicant.html", {
        headers: {
          "Cache-Control": "no-store",
        },
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
        sendRedirect(response, getDefaultAccessiblePath(authPayload.account.role));
        return true;
      }

      serveStaticFile(response, "/index.html", {
        headers: {
          "Cache-Control": "no-store",
        },
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

    if (!isViewAccessibleForRole(requestedView, authPayload.account.role)) {
      sendRedirect(response, getDefaultAccessiblePath(authPayload.account.role));
      return true;
    }

    serveStaticFile(response, "/index.html", {
      headers: {
        "Cache-Control": "no-store",
      },
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
