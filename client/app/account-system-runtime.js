(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAccountSystemRuntime = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAccountSystemRuntimeController({
    MAX_SYSTEM_AUTO_LOGOUT_MINUTES,
    SYSTEM_DATA_DELETE_CONFIG,
    accountCreateError,
    accountCreateForm,
    accountCreateId,
    accountCreateModal,
    accountCreateName,
    accountCreateRole,
    accountRoleOptions,
    apiRequest,
    appendAccountRecord,
    closeModal,
    createAccountCreateController,
    createSystemSettingsController,
    getSortedAccountRows,
    getSystemAutoLogoutInputElement,
    getSystemInitialPassword,
    getTableState,
    handleAuthenticationFailure,
    loadBootstrapData,
    normalizeAccountRecord,
    normalizeSystemAutoLogoutMinutes,
    normalizeSystemSettingsPayload,
    renderView,
    showToast,
    state,
    syncAccountCreateDescription,
    syncAutoLogoutTimer,
  }) {
    const systemSettingsController = createSystemSettingsController({
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
    });
    const {
      applySystemSettingsPayload,
      changeSystemAutoLogoutMinutes,
      deleteSystemDataAction,
      getSystemDataDeletionStatusElement,
      getSystemSettingsStatusElement,
      getValidatedSystemSettingsPayload,
      saveSystemSettings,
      setSystemDataDeletionStatus,
      setSystemSettingsStatus,
    } = systemSettingsController;

    const accountCreateController = createAccountCreateController({
      accountCreateError,
      accountCreateForm,
      accountCreateId,
      accountCreateModal,
      accountCreateName,
      accountCreateRole,
      accountRoleOptions,
      apiRequest,
      appendAccountRecord,
      closeModal,
      getSortedAccountRows,
      getSystemInitialPassword,
      getTableState,
      handleAuthenticationFailure,
      normalizeAccountRecord,
      renderView,
      showToast,
    });
    const {
      getDefaultAccountRole,
      prepareAccountCreateModal,
      resetAccountCreateFormState,
      setAccountCreateError,
      submitAccountCreate,
      syncAccountCreateRoleOptions,
      syncAccountCreateSubmitButton,
    } = accountCreateController;

    return Object.freeze({
      applySystemSettingsPayload,
      changeSystemAutoLogoutMinutes,
      deleteSystemDataAction,
      getDefaultAccountRole,
      getSystemDataDeletionStatusElement,
      getSystemSettingsStatusElement,
      getValidatedSystemSettingsPayload,
      prepareAccountCreateModal,
      resetAccountCreateFormState,
      saveSystemSettings,
      setAccountCreateError,
      setSystemDataDeletionStatus,
      setSystemSettingsStatus,
      submitAccountCreate,
      syncAccountCreateRoleOptions,
      syncAccountCreateSubmitButton,
    });
  }

  return Object.freeze({
    createAccountSystemRuntimeController,
  });
});
