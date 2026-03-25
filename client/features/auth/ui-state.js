(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAuthUiState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAuthUiController(deps) {
    const {
      FLASH_TOAST_STORAGE_KEY,
      getLoginAccountInput,
      getLoginErrorElement,
      getLoginPasswordInput,
      passwordSetupConfirm,
      passwordSetupDescription,
      passwordSetupError,
      passwordSetupForm,
      passwordSetupModal,
      passwordSetupNext,
      state,
      toastRoot,
    } = deps;

    let loginAutofocusTimerId = 0;
    let toastTimerId = 0;

    function syncToast() {
      if (!toastRoot) {
        return;
      }

      const shouldShow = state.toast.visible && state.toast.message;
      toastRoot.classList.toggle("has-toast", Boolean(shouldShow));
      toastRoot.replaceChildren();

      if (!shouldShow) {
        return;
      }

      const toastMessage = document.createElement("div");
      toastMessage.className = `toast-message toast-${state.toast.type || "success"}`;
      toastMessage.setAttribute("role", "status");
      toastMessage.textContent = state.toast.message;
      toastRoot.appendChild(toastMessage);
    }

    function hideToast() {
      if (toastTimerId) {
        window.clearTimeout(toastTimerId);
        toastTimerId = 0;
      }

      state.toast.visible = false;
      state.toast.message = "";
      state.toast.type = "success";
      syncToast();
    }

    function showToast(message, type = "success", duration = 3200) {
      if (toastTimerId) {
        window.clearTimeout(toastTimerId);
        toastTimerId = 0;
      }

      state.toast.visible = true;
      state.toast.message = String(message || "").trim();
      state.toast.type = type || "success";
      syncToast();

      if (!state.toast.message) {
        return;
      }

      toastTimerId = window.setTimeout(() => {
        hideToast();
      }, duration);
    }

    function queueFlashToast(message, type = "success", duration = 3200) {
      const normalizedMessage = String(message || "").trim();

      if (!normalizedMessage) {
        return;
      }

      try {
        window.sessionStorage.setItem(
          FLASH_TOAST_STORAGE_KEY,
          JSON.stringify({
            message: normalizedMessage,
            type: type || "success",
            duration: Number(duration) || 3200,
          }),
        );
      } catch (error) {
        // Ignore session storage failures and continue without cross-page toast delivery.
      }
    }

    function consumeFlashToast() {
      try {
        const storedValue = window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY);

        if (!storedValue) {
          return;
        }

        window.sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);
        const payload = JSON.parse(storedValue);
        showToast(payload?.message || "", payload?.type || "success", payload?.duration || 3200);
      } catch (error) {
        // Ignore invalid session storage data.
      }
    }

    function syncLoginFormAutofocus() {
      if (loginAutofocusTimerId) {
        window.clearTimeout(loginAutofocusTimerId);
        loginAutofocusTimerId = 0;
      }

      if (state.auth.status !== "logged_out" || state.auth.isSubmittingLogin) {
        return;
      }

      loginAutofocusTimerId = window.setTimeout(() => {
        loginAutofocusTimerId = 0;
        const preferredInput =
          String(state.auth.loginForm.id || "").trim() ? getLoginPasswordInput?.() || null : getLoginAccountInput?.() || null;
        const fallbackInput = getLoginAccountInput?.() || null;
        const focusTarget =
          preferredInput instanceof HTMLInputElement && !preferredInput.disabled
            ? preferredInput
            : fallbackInput instanceof HTMLInputElement && !fallbackInput.disabled
              ? fallbackInput
              : null;

        if (!focusTarget) {
          return;
        }

        focusTarget.focus();

        if (typeof focusTarget.setSelectionRange === "function") {
          const cursorPosition = focusTarget.value.length;
          focusTarget.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    }

    function syncPasswordSetupModal() {
      if (!passwordSetupModal) {
        return;
      }

      const isOpen = state.auth.status === "password_setup";
      const passwordSetupSubmitButton = passwordSetupForm?.querySelector("[data-password-setup-submit]");
      const passwordSetupCloseButtons = Array.from(passwordSetupModal.querySelectorAll("[data-password-setup-close]"));

      passwordSetupModal.classList.toggle("hidden", !isOpen);
      passwordSetupModal.setAttribute("aria-hidden", isOpen ? "false" : "true");

      if (passwordSetupDescription) {
        const accountName = state.auth.currentUser?.name || state.auth.currentUser?.id || "선택한 계정";
        passwordSetupDescription.textContent = `${accountName} 계정은 초기 비밀번호를 변경해야 관리자 페이지를 사용할 수 있습니다.`;
      }

      if (passwordSetupError) {
        const message = state.auth.passwordSetup.error || "";
        passwordSetupError.textContent = message;
        passwordSetupError.classList.toggle("hidden", !message);
      }

      if (passwordSetupNext && passwordSetupNext.value !== state.auth.passwordSetup.password) {
        passwordSetupNext.value = state.auth.passwordSetup.password;
      }

      if (passwordSetupConfirm && passwordSetupConfirm.value !== state.auth.passwordSetup.passwordConfirm) {
        passwordSetupConfirm.value = state.auth.passwordSetup.passwordConfirm;
      }

      if (passwordSetupSubmitButton) {
        passwordSetupSubmitButton.disabled = !isOpen || state.auth.isSubmittingPasswordSetup;
        passwordSetupSubmitButton.textContent = state.auth.isSubmittingPasswordSetup ? "설정 중..." : "비밀번호 설정";
      }

      passwordSetupCloseButtons.forEach((button) => {
        button.disabled = !isOpen || state.auth.isSubmittingPasswordSetup;
      });

      if (
        isOpen &&
        passwordSetupNext &&
        document.activeElement !== passwordSetupNext &&
        document.activeElement !== passwordSetupConfirm
      ) {
        window.setTimeout(() => {
          passwordSetupNext.focus();
        }, 0);
      }
    }

    function syncLoginErrorMessage() {
      const loginError = getLoginErrorElement?.() || null;

      if (!loginError) {
        return;
      }

      const message = state.auth.error || "";
      loginError.textContent = message;
      loginError.classList.toggle("hidden", !message);
    }

    return Object.freeze({
      consumeFlashToast,
      hideToast,
      queueFlashToast,
      showToast,
      syncLoginErrorMessage,
      syncLoginFormAutofocus,
      syncPasswordSetupModal,
      syncToast,
    });
  }

  return Object.freeze({
    createAuthUiController,
  });
});
