(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAppNavigation = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createNavigationController({
    getAccessibleViewsForRoleConfig,
    getCurrentRoutePath,
    getDefaultAccessibleViewForRole,
    getRequestedViewFromLocation,
    getViewRoutePath,
    getVisibleMenuViewsForRoleConfig,
    isLoginPage,
    isUserAuthenticated,
    isViewAccessibleForRole,
    loadCurrentViewFromLocation,
    loginRoutePath,
    normalizeRoutePath,
    state,
  }) {
    let routeNavigating = false;

    function getCurrentUserRole() {
      return String(state.auth.currentUser?.role || "").trim();
    }

    function navigateToPath(pathname, { replace = false } = {}) {
      const targetPath = normalizeRoutePath(pathname);
      const currentPath = getCurrentRoutePath();

      if (targetPath === currentPath) {
        return false;
      }

      routeNavigating = true;

      if (replace) {
        window.location.replace(targetPath);
        return true;
      }

      window.location.assign(targetPath);
      return true;
    }

    function navigateToView(view, options = {}) {
      return navigateToPath(getViewRoutePath(view), options);
    }

    function navigateToLogin(options = {}) {
      return navigateToPath(loginRoutePath, options);
    }

    function syncCurrentViewFromLocation() {
      state.currentView = loadCurrentViewFromLocation();
      return state.currentView;
    }

    function getVisibleMenuViewsForRole(role = getCurrentUserRole()) {
      return new Set(getVisibleMenuViewsForRoleConfig(role));
    }

    function getAccessibleViewsForRole(role = getCurrentUserRole()) {
      return new Set(getAccessibleViewsForRoleConfig(role));
    }

    function getDefaultAccessibleView(role = getCurrentUserRole()) {
      return getDefaultAccessibleViewForRole(role);
    }

    function isViewAccessible(view, role = getCurrentUserRole()) {
      return isViewAccessibleForRole(String(view || "").trim(), role);
    }

    function redirectToAccessibleRouteIfNeeded({ replace = true } = {}) {
      if (!isUserAuthenticated() || isLoginPage()) {
        return false;
      }

      const requestedView = getRequestedViewFromLocation();

      if (!requestedView || isViewAccessible(requestedView)) {
        return false;
      }

      return navigateToView(getDefaultAccessibleView(), { replace });
    }

    function syncNavigationVisibility() {
      const visibleViews = isUserAuthenticated() ? getVisibleMenuViewsForRole() : new Set();
      const navigationItems = Array.from(document.querySelectorAll(".nav-item[data-view]"));

      navigationItems.forEach((item) => {
        const isVisible = visibleViews.has(item.dataset.view);
        item.classList.toggle("hidden", !isVisible);
        item.disabled = !isVisible;
        item.setAttribute("aria-hidden", isVisible ? "false" : "true");
      });
    }

    function isRouteNavigating() {
      return routeNavigating;
    }

    return Object.freeze({
      getAccessibleViewsForRole,
      getDefaultAccessibleView,
      getVisibleMenuViewsForRole,
      isRouteNavigating,
      isViewAccessible,
      navigateToLogin,
      navigateToPath,
      navigateToView,
      redirectToAccessibleRouteIfNeeded,
      syncCurrentViewFromLocation,
      syncNavigationVisibility,
    });
  }

  return Object.freeze({
    createNavigationController,
  });
});
