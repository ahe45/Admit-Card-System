(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAppConfig = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const accountRoleOptions = Object.freeze(["관리자", "운영자", "조회용"]);
  const defaultView = "dashboard";
  const loginRoutePath = "/login";
  const pageTitles = Object.freeze({
    login: "로그인",
    dashboard: "대시보드",
    applicantHistory: "접수 이력",
    applicantFormSettings: "접수 양식 설정",
    examineeRegistration: "수험생 등록",
    admitCardLookup: "수험표 출력",
    printHistory: "수험표 출력 이력",
    templateManagement: "수험표 양식 관리",
    accountManagement: "계정 관리",
    loginNoticeSettings: "공지사항 설정",
    systemSettings: "시스템 설정",
    systemDataDeletion: "데이터 삭제",
  });
  const viewRouteDefinitions = Object.freeze([
    Object.freeze({ view: defaultView, path: "/dashboard", title: pageTitles.dashboard }),
    Object.freeze({ view: "applicantFormSettings", path: "/applicant-form-settings", title: pageTitles.applicantFormSettings }),
    Object.freeze({ view: "applicantHistory", path: "/applicant-history", title: pageTitles.applicantHistory }),
    Object.freeze({ view: "examineeRegistration", path: "/examinee-registration", title: pageTitles.examineeRegistration }),
    Object.freeze({ view: "admitCardLookup", path: "/admit-cards", title: pageTitles.admitCardLookup }),
    Object.freeze({ view: "printHistory", path: "/print-history", title: pageTitles.printHistory }),
    Object.freeze({ view: "templateManagement", path: "/templates", title: pageTitles.templateManagement }),
    Object.freeze({ view: "accountManagement", path: "/accounts", title: pageTitles.accountManagement }),
    Object.freeze({ view: "loginNoticeSettings", path: "/login-notice", title: pageTitles.loginNoticeSettings }),
    Object.freeze({ view: "systemSettings", path: "/system-settings", title: pageTitles.systemSettings }),
    Object.freeze({ view: "systemDataDeletion", path: "/system-data-deletion", title: pageTitles.systemDataDeletion }),
  ]);
  const availableViews = Object.freeze(viewRouteDefinitions.map((definition) => definition.view));
  const roleMenuViews = Object.freeze({
    관리자: Object.freeze([
      "applicantFormSettings",
      "applicantHistory",
      "examineeRegistration",
      "admitCardLookup",
      "printHistory",
      "templateManagement",
      "accountManagement",
      "loginNoticeSettings",
      "systemSettings",
      "systemDataDeletion",
    ]),
    운영자: Object.freeze([
      "applicantFormSettings",
      "applicantHistory",
      "examineeRegistration",
      "admitCardLookup",
      "printHistory",
      "templateManagement",
    ]),
    조회용: Object.freeze([
      "admitCardLookup",
      "printHistory",
    ]),
  });
  const roleDefaultViews = Object.freeze({
    관리자: defaultView,
    운영자: defaultView,
    조회용: "admitCardLookup",
  });
  const viewRouteMap = Object.freeze(
    viewRouteDefinitions.reduce((definitionsByView, definition) => {
      definitionsByView[definition.view] = definition;
      return definitionsByView;
    }, {}),
  );
  const viewByPathMap = Object.freeze(
    viewRouteDefinitions.reduce((viewsByPath, definition) => {
      viewsByPath[definition.path] = definition.view;
      return viewsByPath;
    }, {}),
  );

  const normalizeRoutePath = (pathname) => {
    const normalizedValue = `/${String(pathname || "/").trim()}`
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/g, "");

    return normalizedValue || "/";
  };

  const getViewRoutePath = (view) => viewRouteMap[String(view || "").trim()]?.path || viewRouteMap[defaultView].path;
  const getViewFromPathname = (pathname) => viewByPathMap[normalizeRoutePath(pathname)] || "";
  const isLoginRoutePath = (pathname) => normalizeRoutePath(pathname) === loginRoutePath;
  const getVisibleMenuViewsForRole = (role = "") => Array.from(roleMenuViews[String(role || "").trim()] || roleMenuViews.관리자);
  const getAccessibleViewsForRole = (role = "") => {
    const normalizedRole = String(role || "").trim();
    const accessibleViews = new Set(getVisibleMenuViewsForRole(normalizedRole));

    if (normalizedRole !== "조회용") {
      accessibleViews.add(defaultView);
    }

    return Array.from(accessibleViews);
  };
  const getDefaultAccessibleView = (role = "") => {
    const normalizedRole = String(role || "").trim();
    const accessibleViews = getAccessibleViewsForRole(normalizedRole);
    const preferredView = roleDefaultViews[normalizedRole] || defaultView;

    return accessibleViews.includes(preferredView) ? preferredView : accessibleViews[0] || defaultView;
  };
  const isViewAccessibleForRole = (view, role = "") => getAccessibleViewsForRole(role).includes(String(view || "").trim());
  const createTemplateTagDefinition = ({ label, examineeKey, aliases = [], legacyTokens = [], legacyTags = [] }) => {
    const normalizedAliases = Array.from(new Set([label, ...aliases].filter(Boolean)));

    return Object.freeze({
      label,
      token: `@{${label}}`,
      legacyTag: `@${label}`,
      editorToken: `#${label}`,
      examineeKey,
      aliases: Object.freeze(normalizedAliases),
      editorTokens: Object.freeze(normalizedAliases.map((alias) => `#${alias}`)),
      legacyTokens: Object.freeze(legacyTokens),
      legacyTags: Object.freeze(legacyTags),
    });
  };
  const templateTagDefinitions = Object.freeze([
    createTemplateTagDefinition({ label: "수험번호", examineeKey: "examineeNo" }),
    createTemplateTagDefinition({ label: "이름", examineeKey: "name" }),
    createTemplateTagDefinition({ label: "생년월일", examineeKey: "birth" }),
    createTemplateTagDefinition({
      label: "현재날짜",
      examineeKey: "currentDate",
      aliases: ["날짜"],
      legacyTokens: ["@{날짜}"],
      legacyTags: ["@날짜"],
    }),
    createTemplateTagDefinition({ label: "시험날짜", examineeKey: "date" }),
    createTemplateTagDefinition({ label: "조", examineeKey: "group" }),
    createTemplateTagDefinition({
      label: "시간",
      examineeKey: "time",
      aliases: ["교시"],
      legacyTokens: ["@{교시}"],
      legacyTags: ["@교시"],
    }),
    createTemplateTagDefinition({ label: "모집시기", examineeKey: "track" }),
    createTemplateTagDefinition({
      label: "전형",
      examineeKey: "admission",
      aliases: ["시험"],
      legacyTokens: ["@{시험}"],
      legacyTags: ["@시험"],
    }),
    createTemplateTagDefinition({ label: "계열", examineeKey: "series" }),
    createTemplateTagDefinition({ label: "모집단위", examineeKey: "unit" }),
    createTemplateTagDefinition({ label: "전공", examineeKey: "major" }),
    createTemplateTagDefinition({ label: "고사건물", examineeKey: "building" }),
    createTemplateTagDefinition({ label: "고사실", examineeKey: "room" }),
    createTemplateTagDefinition({ label: "수험생사진", examineeKey: "examineePhoto" }),
  ].sort((left, right) => String(left?.label || "").localeCompare(String(right?.label || ""), "ko-KR")));

  return {
    accountRoleOptions,
    availableViews,
    defaultView,
    getAccessibleViewsForRole,
    getDefaultAccessibleView,
    getViewFromPathname,
    getViewRoutePath,
    getVisibleMenuViewsForRole,
    isLoginRoutePath,
    isViewAccessibleForRole,
    loginRoutePath,
    normalizeRoutePath,
    pageTitles,
    roleDefaultViews,
    roleMenuViews,
    templateTagDefinitions,
    viewRouteDefinitions,
  };
});
