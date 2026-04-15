(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      loginNoticeLinkUtilsModule: require("../system/login-notice-link-utils"),
    });
    return;
  }

  globalScope.AdmitCardAuthRenderers = factory({
    loginNoticeLinkUtilsModule: globalScope.AdmitCardLoginNoticeLinkUtils,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({ loginNoticeLinkUtilsModule }) => {
  const appConfig = globalThis.AdmitCardAppConfig || {};
  const { buildLoginNoticeMarkup } = loginNoticeLinkUtilsModule || {};
  const resolveSuperAdminLogoImageUrl =
    appConfig.resolveSuperAdminLogoImageUrl || ((settings = {}) => String(settings?.logoImageUrl || "").trim() || "/client/assets/logo.png");
  const resolveSuperAdminBackgroundImageUrl =
    appConfig.resolveSuperAdminBackgroundImageUrl || ((settings = {}) => String(settings?.backgroundImageUrl || "").trim() || "/client/assets/bg.png");

  function renderAuthBackgroundMedia(settings = {}) {
    const backgroundImageUrl = resolveSuperAdminBackgroundImageUrl(settings);

    if (!backgroundImageUrl) {
      return "";
    }

    return `
      <div class="auth-background-media" aria-hidden="true">
        <img class="auth-background-media-image" src="${escapeAttribute(backgroundImageUrl)}" alt="" />
      </div>
    `;
  }

  function getLoginNoticeMarkup(html, placeholder = "공지사항을 입력하세요.") {
    const normalizedHtml = String(html || "").trim();
    const fallbackMarkup = `<p>${escapeHtml(placeholder)}</p>`;

    if (typeof buildLoginNoticeMarkup === "function") {
      return buildLoginNoticeMarkup(normalizedHtml, fallbackMarkup);
    }

    return normalizedHtml || fallbackMarkup;
  }

  function renderLoginStage({
    noticeHtml,
    heading,
    description,
    submitLabel,
    interactive = false,
    errorMessage = "",
    accountIdValue = "",
    passwordValue = "",
    isDisabled = false,
    shellClassName = "",
    noticeCardClassName = "",
    panelClassName = "",
    noticeContentClassName = "",
    noticeContentId = "",
    noticeContentAttributes = "",
    useEditorMarkup = false,
  }) {
    const logoImageUrl = resolveSuperAdminLogoImageUrl(state.superAdmin || {});
    const shellClassNames = ["login-shell", shellClassName].filter(Boolean).join(" ");
    const noticeCardClassNames = ["login-hero-card", "login-notice-card", noticeCardClassName].filter(Boolean).join(" ");
    const panelClassNames = ["login-panel-card", "login-stage-panel", panelClassName].filter(Boolean).join(" ");
    const noticeContentClassNames = ["login-notice-content", noticeContentClassName].filter(Boolean).join(" ");
    const noticeContentMarkup = useEditorMarkup ? buildLoginNoticeEditorMarkup(noticeHtml) : getLoginNoticeMarkup(noticeHtml);
    const noticeContentIdMarkup = noticeContentId ? ` id="${noticeContentId}"` : "";
    const noticeContentAttributesMarkup = noticeContentAttributes ? ` ${noticeContentAttributes}` : "";
    const formBody = interactive
      ? `
          <form class="login-form login-stage-form" id="loginForm">
            <h3>${escapeHtml(heading)}</h3>
            <label class="field login-field" for="loginAccountId">
              <span>계정 ID</span>
              <input
                id="loginAccountId"
                type="text"
                value="${escapeAttribute(accountIdValue)}"
                autocomplete="username"
                ${isDisabled ? "disabled" : ""}
              />
            </label>
            <label class="field login-field" for="loginPassword">
              <span>비밀번호</span>
              <input
                id="loginPassword"
                type="password"
                value="${escapeAttribute(passwordValue)}"
                autocomplete="current-password"
                ${isDisabled ? "disabled" : ""}
              />
            </label>
            <p class="login-error ${errorMessage ? "" : "hidden"}" id="loginError">${escapeHtml(errorMessage)}</p>
            <button class="primary-button login-submit-button" data-auth-login="true" type="submit" ${
              isDisabled ? "disabled" : ""
            }>
              ${escapeHtml(submitLabel)}
            </button>
          </form>
        `
      : `
          <div class="login-form login-stage-form login-stage-form-preview">
            <h3>${escapeHtml(heading)}</h3>
            <label class="field login-field">
              <span>계정 ID</span>
              <input type="text" value="${escapeAttribute(accountIdValue)}" readonly tabindex="-1" />
            </label>
            <label class="field login-field">
              <span>비밀번호</span>
              <input type="password" value="${escapeAttribute(passwordValue)}" readonly tabindex="-1" />
            </label>
            <button class="primary-button login-submit-button" type="button" tabindex="-1">${escapeHtml(submitLabel)}</button>
          </div>
        `;

    return `
      <section class="${shellClassNames}">
        <article class="${noticeCardClassNames}">
          <div class="login-notice-head">
            <p class="page-kicker">Login Notice</p>
            <h2>공지사항</h2>
          </div>
          <div${noticeContentIdMarkup} class="${noticeContentClassNames}"${noticeContentAttributesMarkup}>${noticeContentMarkup}</div>
        </article>

        <article class="${panelClassNames}">
          <div class="login-stage-brand">
            <img
              class="login-stage-brand-mark"
              src="${escapeAttribute(logoImageUrl)}"
              alt=""
              width="68"
              height="68"
            />
            <div class="login-stage-brand-copy">
              <span>Admit Card System</span>
              <strong>수험표시스템</strong>
            </div>
          </div>
          <div class="login-stage-panel-inner">${formBody}</div>
        </article>
        <p class="login-shell-copyright">COPYRIGHT(c) 2026 BY U-PLUS SYSTEM. ALL RIGHTS RESERVED.</p>
      </section>
    `;
  }

  function renderLoginScreen() {
    const superAdminSettings = state.superAdmin || {};
    const isLoading = state.auth.status === "loading";
    const isPasswordSetup = state.auth.status === "password_setup";
    const heading = isLoading ? "세션 확인 중" : "로그인";
    const description = isLoading
      ? "현재 로그인 세션을 확인하고 있습니다."
      : isPasswordSetup
        ? `${state.auth.currentUser?.id || "선택한 계정"} 계정의 초기 비밀번호가 확인되었습니다. 새 비밀번호를 설정하세요.`
        : "계정 관리에 등록된 계정 ID와 비밀번호로 로그인합니다.";

    return `${renderAuthBackgroundMedia(superAdminSettings)}${renderLoginStage({
      noticeHtml: state.loginNotice.savedHtml,
      heading,
      description,
      submitLabel: state.auth.isSubmittingLogin ? "로그인 중..." : "로그인",
      interactive: true,
      errorMessage: state.auth.error || "",
      accountIdValue: state.auth.loginForm.id,
      passwordValue: state.auth.loginForm.password,
      isDisabled: isLoading || isPasswordSetup || state.auth.isSubmittingLogin,
    })}`;
  }

  return {
    getLoginNoticeMarkup,
    renderLoginScreen,
    renderLoginStage,
  };
});
