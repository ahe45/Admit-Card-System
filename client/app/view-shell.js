(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardViewShell = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createViewShellController(deps) {
    const {
      DEFAULT_VIEW,
      decorateSelectFields,
      escapeHtml,
      getViewRenderer,
      isLoginPage,
      isUserAuthenticated,
      pageTitle,
      renderAdmitCardLookup,
      renderAdmitCardLookupGridSection,
      renderLoginScreen,
      state,
      syncCurrentViewFromLocation,
      syncApplicantSubmissionDetailModal,
      syncExamineeDetailModal,
      syncGridSelectionIndicators,
      syncHeaderSelectOptions,
      syncLoginFormAutofocus,
      syncOpenGridFilterMenuPosition,
      syncPdfGenerationOverlay,
      syncUploadOverlay,
      titles,
      updateAuthChrome,
      updateMetricBadges,
      viewRoot,
      navItems,
    } = deps;

    function renderPageLoading(title = "페이지를 불러오고 있습니다.") {
      return `
        <section class="view-stack">
          <article class="empty-state">
            <div>
              <strong>${escapeHtml(title)}</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
          </article>
        </section>
      `;
    }

    function getWindowScrollTop() {
      return Math.max(
        0,
        Math.round(
          Number(
            window.scrollY ??
              window.pageYOffset ??
              document.documentElement?.scrollTop ??
              document.body?.scrollTop ??
              0,
          ) || 0,
        ),
      );
    }

    function restoreWindowScrollTop(scrollTop) {
      const nextScrollTop = Math.max(0, Math.round(Number(scrollTop) || 0));

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          window.scrollTo(0, nextScrollTop);
        });
        return;
      }

      window.setTimeout(() => {
        window.scrollTo(0, nextScrollTop);
      }, 0);
    }

    function renderView() {
      updateAuthChrome();
      const activeView = isLoginPage() ? "" : syncCurrentViewFromLocation();
      const activeTitle = isLoginPage() ? titles.login || "로그인" : titles[activeView] || titles[DEFAULT_VIEW] || "대시보드";

      if (pageTitle) {
        pageTitle.textContent = activeTitle;
      }

      document.title = `${activeTitle} | Admit Card System`;

      if (isLoginPage()) {
        navItems.forEach((item) => {
          item.classList.remove("active");
        });

        viewRoot.innerHTML = renderLoginScreen();
        syncGridSelectionIndicators();
        syncPdfGenerationOverlay();
        syncUploadOverlay();
        syncApplicantSubmissionDetailModal();
        syncExamineeDetailModal();
        syncLoginFormAutofocus();
        return;
      }

      if (state.auth.status === "loading") {
        navItems.forEach((item) => {
          item.classList.toggle("active", item.dataset.view === state.currentView);
        });

        viewRoot.innerHTML = renderPageLoading(activeTitle);
        syncGridSelectionIndicators();
        syncPdfGenerationOverlay();
        syncUploadOverlay();
        syncApplicantSubmissionDetailModal();
        syncExamineeDetailModal();
        return;
      }

      if (!isUserAuthenticated()) {
        navItems.forEach((item) => {
          item.classList.remove("active");
        });

        viewRoot.innerHTML = renderPageLoading("로그인 페이지로 이동 중입니다.");
        syncGridSelectionIndicators();
        syncPdfGenerationOverlay();
        syncUploadOverlay();
        syncApplicantSubmissionDetailModal();
        syncExamineeDetailModal();
        return;
      }

      navItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.view === state.currentView);
      });

      const renderer = getViewRenderer(state.currentView);
      viewRoot.innerHTML = renderer();
      decorateSelectFields();
      syncHeaderSelectOptions();
      updateMetricBadges();
      syncGridSelectionIndicators();
      syncOpenGridFilterMenuPosition?.();
      syncPdfGenerationOverlay();
      syncUploadOverlay();
      syncApplicantSubmissionDetailModal();
      syncExamineeDetailModal();
    }

    function refreshAdmitCardLookupView({ preserveScroll = true } = {}) {
      const mount = document.getElementById("admitCardLookupViewMount");

      if (!mount) {
        renderView();
        return;
      }

      const scrollTop = preserveScroll ? getWindowScrollTop() : 0;
      mount.outerHTML = renderAdmitCardLookup();
      decorateSelectFields();
      syncGridSelectionIndicators();
      syncOpenGridFilterMenuPosition?.();

      if (preserveScroll) {
        restoreWindowScrollTop(scrollTop);
      }
    }

    function refreshAdmitCardLookupGrid({ preserveScroll = true } = {}) {
      const mount = document.getElementById("admitCardLookupResultMount");

      if (!mount) {
        renderView();
        return;
      }

      const scrollTop = preserveScroll ? getWindowScrollTop() : 0;
      mount.outerHTML = renderAdmitCardLookupGridSection();
      syncGridSelectionIndicators();
      syncOpenGridFilterMenuPosition?.();

      if (preserveScroll) {
        restoreWindowScrollTop(scrollTop);
      }
    }

    return Object.freeze({
      getWindowScrollTop,
      refreshAdmitCardLookupGrid,
      refreshAdmitCardLookupView,
      renderPageLoading,
      renderView,
      restoreWindowScrollTop,
    });
  }

  return Object.freeze({
    createViewShellController,
  });
});
