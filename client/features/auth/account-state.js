(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAuthAccountState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAuthAccountStateController({
    accountCreateDescription,
    normalizeSystemAutoLogoutMinutes,
    normalizeSystemInitialPassword,
    state,
  }) {
    function normalizeAuthAccount(record = {}) {
      if (!record) {
        return null;
      }

      return {
        id: String(record.id || ""),
        name: String(record.name || ""),
        role: String(record.role || "조회용"),
      };
    }

    function isUserAuthenticated() {
      return state.auth.status === "authenticated";
    }

    function getSystemInitialPassword() {
      return normalizeSystemInitialPassword(state.systemSettings.initialPassword);
    }

    function getSystemAutoLogoutMinutes() {
      return normalizeSystemAutoLogoutMinutes(state.systemSettings.autoLogoutMinutes);
    }

    function syncAccountCreateDescription() {
      if (!accountCreateDescription) {
        return;
      }

      accountCreateDescription.textContent = `새 계정을 추가하면 초기 비밀번호는 ${getSystemInitialPassword()}로 설정됩니다.`;
    }

    return Object.freeze({
      getSystemAutoLogoutMinutes,
      getSystemInitialPassword,
      isUserAuthenticated,
      normalizeAuthAccount,
      syncAccountCreateDescription,
    });
  }

  return Object.freeze({
    createAuthAccountStateController,
  });
});
