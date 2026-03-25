(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardSystemSettings = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createSystemSettingsController({
    MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
    SYSTEM_DATA_DELETE_CONFIG,
    apiRequest,
    getSystemAutoLogoutInputElement,
    handleAuthenticationFailure,
    loadBootstrapData,
    normalizeSystemAutoLogoutMinutes,
    normalizeSystemSettingsPayload,
    renderView,
    showToast,
    state,
    syncAccountCreateDescription,
    syncAutoLogoutTimer,
  }) {
    function getSystemSettingsStatusElement() {
      return document.getElementById("systemSettingsStatus");
    }

    function getSystemDataDeletionStatusElement() {
      return document.getElementById("systemDataDeletionStatus");
    }

    function setSystemSettingsStatus(message = "", type = "") {
      state.systemSettings.statusMessage = String(message || "");
      state.systemSettings.statusType = type;

      const statusElement = getSystemSettingsStatusElement();

      if (!statusElement) {
        return;
      }

      statusElement.textContent = state.systemSettings.statusMessage;
      statusElement.classList.toggle("hidden", !state.systemSettings.statusMessage);
      statusElement.classList.toggle("warning", type === "warning");
    }

    function setSystemDataDeletionStatus(message = "", type = "") {
      state.systemDataDeletion.statusMessage = String(message || "");
      state.systemDataDeletion.statusType = type;

      const statusElement = getSystemDataDeletionStatusElement();

      if (!statusElement) {
        return;
      }

      statusElement.textContent = state.systemDataDeletion.statusMessage;
      statusElement.classList.toggle("hidden", !state.systemDataDeletion.statusMessage);
      statusElement.classList.toggle("warning", type === "warning");
    }

    function applySystemSettingsPayload(payload = {}, options = {}) {
      const nextSettings = normalizeSystemSettingsPayload(payload);

      state.systemSettings.initialPassword = nextSettings.initialPassword;
      state.systemSettings.autoLogoutMinutes = nextSettings.autoLogoutMinutes;

      if (!options.preserveStatus) {
        state.systemSettings.statusMessage = "";
        state.systemSettings.statusType = "";
      }

      syncAccountCreateDescription();
      syncAutoLogoutTimer();
    }

    function changeSystemAutoLogoutMinutes(delta) {
      const normalizedDelta = Number(delta);

      if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
        return;
      }

      const nextValue = Math.min(
        MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
        Math.max(0, normalizeSystemAutoLogoutMinutes(state.systemSettings.autoLogoutMinutes) + normalizedDelta),
      );

      state.systemSettings.autoLogoutMinutes = String(nextValue);

      if (state.systemSettings.statusMessage) {
        setSystemSettingsStatus("");
      }

      const inputElement = getSystemAutoLogoutInputElement();

      if (inputElement) {
        inputElement.value = state.systemSettings.autoLogoutMinutes;
        inputElement.focus();
      }
    }

    function getValidatedSystemSettingsPayload() {
      const initialPassword = String(state.systemSettings.initialPassword ?? "").trim();
      const autoLogoutMinutes = Math.round(Number(state.systemSettings.autoLogoutMinutes));

      if (!initialPassword) {
        throw new Error("초기 비밀번호를 입력하세요.");
      }

      if (initialPassword.length < 4) {
        throw new Error("초기 비밀번호는 4자 이상이어야 합니다.");
      }

      if (initialPassword.length > 100) {
        throw new Error("초기 비밀번호는 100자 이하여야 합니다.");
      }

      if (!Number.isFinite(autoLogoutMinutes) || autoLogoutMinutes < 0 || autoLogoutMinutes > MAX_SYSTEM_AUTO_LOGOUT_MINUTES) {
        throw new Error(`자동 로그아웃 시간은 0분 이상 ${MAX_SYSTEM_AUTO_LOGOUT_MINUTES}분 이하로 입력하세요.`);
      }

      return {
        initialPassword,
        autoLogoutMinutes,
      };
    }

    function buildSystemDataDeletionSuccessMessage(result = {}) {
      const scope = String(result.scope || "").trim();
      const deletedExaminees = Number(result.deletedExaminees || 0);
      const deletedPhotos = Number(result.deletedPhotos || 0);
      const deletedPrintHistory = Number(result.deletedPrintHistory || 0);

      if (scope === "all") {
        return `전체 데이터를 삭제했습니다. 수험생 ${deletedExaminees}건, 사진 ${deletedPhotos}건, 출력 이력 ${deletedPrintHistory}건이 정리되었습니다.`;
      }

      if (scope === "photos") {
        return `사진 데이터 ${deletedPhotos}건을 삭제했습니다.`;
      }

      return `수험표 출력 이력 ${deletedPrintHistory}건을 삭제했습니다.`;
    }

    async function saveSystemSettings() {
      let nextSettings;

      try {
        nextSettings = getValidatedSystemSettingsPayload();
      } catch (error) {
        setSystemSettingsStatus(error.message, "warning");
        return;
      }

      state.systemSettings.isSaving = true;
      setSystemSettingsStatus("");
      renderView();

      try {
        const savedSettings = await apiRequest("/api/system-settings", {
          method: "PUT",
          body: JSON.stringify(nextSettings),
        });

        applySystemSettingsPayload(savedSettings, { preserveStatus: true });
        setSystemSettingsStatus("시스템 설정을 저장했습니다.");
        showToast("시스템 설정을 저장했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        setSystemSettingsStatus(error.message, "warning");
      } finally {
        state.systemSettings.isSaving = false;
        renderView();
      }
    }

    async function deleteSystemDataAction(scope) {
      const normalizedScope = String(scope || "").trim();
      const config = SYSTEM_DATA_DELETE_CONFIG[normalizedScope];

      if (!config || state.systemDataDeletion.isDeleting) {
        return;
      }

      if (!window.confirm(config.confirmMessage)) {
        return;
      }

      state.systemDataDeletion.isDeleting = true;
      state.systemDataDeletion.activeScope = normalizedScope;
      setSystemDataDeletionStatus("");
      renderView();

      try {
        const result = await apiRequest(`/api/system-data/${encodeURIComponent(normalizedScope)}`, {
          method: "DELETE",
        });

        await loadBootstrapData({ showLoading: false });

        const successMessage = buildSystemDataDeletionSuccessMessage(result);
        setSystemDataDeletionStatus(successMessage);
        showToast(successMessage);
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        setSystemDataDeletionStatus(error.message, "warning");
      } finally {
        state.systemDataDeletion.isDeleting = false;
        state.systemDataDeletion.activeScope = "";
        renderView();
      }
    }

    return Object.freeze({
      applySystemSettingsPayload,
      changeSystemAutoLogoutMinutes,
      deleteSystemDataAction,
      getSystemDataDeletionStatusElement,
      getSystemSettingsStatusElement,
      getValidatedSystemSettingsPayload,
      saveSystemSettings,
      setSystemDataDeletionStatus,
      setSystemSettingsStatus,
    });
  }

  return Object.freeze({
    createSystemSettingsController,
  });
});
