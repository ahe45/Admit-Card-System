(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAuthDocumentEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAuthDocumentEventHandlers({
    cancelAccountEdit,
    changeSystemAutoLogoutMinutes,
    closePasswordSetupPrompt,
    deleteAccountAction,
    deleteSystemDataAction,
    downloadExamineeTemplate,
    logoutCurrentUser,
    openModal,
    renderView,
    requestCloseModal,
    resetAccountPasswordAction,
    saveAccountEdit,
    saveSystemSettings,
    setAccountCreateError,
    setSystemSettingsStatus,
    startAccountEdit,
    state,
    submitAccountCreate,
    submitLogin,
    submitPasswordSetup,
    syncLoginErrorMessage,
    syncPasswordSetupModal,
    updateAccountEditorField,
  }) {
    async function handleClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const openModalTrigger = target?.closest("[data-open-modal]") || null;
      const passwordSetupCloseTrigger = target?.closest("[data-password-setup-close]") || null;
      const closeTrigger = target?.closest("[data-close-modal]") || null;
      const downloadTrigger = target?.closest("[data-download-template]") || null;
      const authLogoutTrigger = target?.closest("[data-auth-logout]") || null;
      const accountEditTrigger = target?.closest("[data-account-edit]") || null;
      const accountSaveTrigger = target?.closest("[data-account-save]") || null;
      const accountCancelTrigger = target?.closest("[data-account-cancel]") || null;
      const accountResetTrigger = target?.closest("[data-account-reset]") || null;
      const accountDeleteTrigger = target?.closest("[data-account-delete]") || null;
      const systemSettingsActionTrigger = target?.closest("[data-system-settings-action]") || null;
      const systemSettingsStepTrigger = target?.closest("[data-system-settings-step]") || null;
      const systemDataDeleteTrigger = target?.closest("[data-system-data-delete]") || null;

      if (authLogoutTrigger) {
        await logoutCurrentUser();
        return true;
      }

      if (accountEditTrigger) {
        startAccountEdit(accountEditTrigger.dataset.accountEdit);
        renderView();
        return true;
      }

      if (accountSaveTrigger) {
        await saveAccountEdit(accountSaveTrigger.dataset.accountSave);
        return true;
      }

      if (accountCancelTrigger) {
        cancelAccountEdit();
        renderView();
        return true;
      }

      if (accountResetTrigger) {
        await resetAccountPasswordAction(accountResetTrigger.dataset.accountReset);
        return true;
      }

      if (accountDeleteTrigger) {
        await deleteAccountAction(accountDeleteTrigger.dataset.accountDelete);
        return true;
      }

      if (systemSettingsActionTrigger?.dataset.systemSettingsAction === "save") {
        await saveSystemSettings();
        return true;
      }

      if (systemSettingsStepTrigger) {
        changeSystemAutoLogoutMinutes(systemSettingsStepTrigger.dataset.systemSettingsStep === "down" ? -1 : 1);
        return true;
      }

      if (systemDataDeleteTrigger) {
        await deleteSystemDataAction(systemDataDeleteTrigger.dataset.systemDataDelete);
        return true;
      }

      if (downloadTrigger) {
        await downloadExamineeTemplate();
        return true;
      }

      if (openModalTrigger) {
        openModal(openModalTrigger.dataset.openModal);
        return true;
      }

      if (passwordSetupCloseTrigger) {
        await closePasswordSetupPrompt();
        return true;
      }

      if (closeTrigger) {
        await requestCloseModal(closeTrigger.closest(".modal")?.id);
        return true;
      }

      return false;
    }

    async function handleSubmit(event) {
      const target = event.target;

      if (target?.id === "loginForm") {
        event.preventDefault();
        await submitLogin();
        return true;
      }

      if (target?.id === "passwordSetupForm") {
        event.preventDefault();
        await submitPasswordSetup();
        return true;
      }

      if (target?.id === "accountCreateForm") {
        event.preventDefault();
        await submitAccountCreate();
        return true;
      }

      return false;
    }

    async function handleChange(event) {
      const target = event.target instanceof Element ? event.target : null;
      const accountField = target?.closest("[data-account-field]") || null;

      if (accountField?.dataset.accountField === "role") {
        updateAccountEditorField("draftRole", target?.value);
        return true;
      }

      if (target?.id === "accountCreateRole") {
        setAccountCreateError("");
        return true;
      }

      return false;
    }

    function handleInput(event) {
      const target = event.target instanceof Element ? event.target : null;
      const accountField = target?.closest("[data-account-field]") || null;

      if (target?.id === "loginAccountId") {
        state.auth.loginForm.id = target.value;
        if (state.auth.error) {
          state.auth.error = "";
          syncLoginErrorMessage();
        }
        return true;
      }

      if (target?.id === "loginPassword") {
        state.auth.loginForm.password = target.value;
        if (state.auth.error) {
          state.auth.error = "";
          syncLoginErrorMessage();
        }
        return true;
      }

      if (target?.id === "passwordSetupNext") {
        state.auth.passwordSetup.password = target.value;
        if (state.auth.passwordSetup.error) {
          state.auth.passwordSetup.error = "";
          syncPasswordSetupModal();
        }
        return true;
      }

      if (target?.id === "passwordSetupConfirm") {
        state.auth.passwordSetup.passwordConfirm = target.value;
        if (state.auth.passwordSetup.error) {
          state.auth.passwordSetup.error = "";
          syncPasswordSetupModal();
        }
        return true;
      }

      if (target?.id === "systemSettingsInitialPassword") {
        state.systemSettings.initialPassword = target.value;
        if (state.systemSettings.statusMessage) {
          setSystemSettingsStatus("");
        }
        return true;
      }

      if (target?.id === "systemSettingsAutoLogoutMinutes") {
        state.systemSettings.autoLogoutMinutes = target.value;
        if (state.systemSettings.statusMessage) {
          setSystemSettingsStatus("");
        }
        return true;
      }

      if (target?.id === "accountCreateId" || target?.id === "accountCreateName") {
        setAccountCreateError("");
        return true;
      }

      if (accountField?.dataset.accountField === "name") {
        updateAccountEditorField("draftName", target?.value);
        return true;
      }

      return false;
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleInput,
      handleSubmit,
    });
  }

  return Object.freeze({
    createAuthDocumentEventHandlers,
  });
});
