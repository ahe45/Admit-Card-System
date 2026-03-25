(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAutoLogout = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAutoLogoutController({
    apiRequest,
    autoLogoutCountdown,
    autoLogoutCountdownValue,
    getSystemAutoLogoutMinutes,
    isUserAuthenticated,
    navigateToLogin,
    queueFlashToast,
    renderView,
    setLoggedOutState,
    updateAuthChrome,
  }) {
    let autoLogoutTimerId = 0;
    let autoLogoutCountdownIntervalId = 0;
    let autoLogoutDeadlineAt = 0;

    function clearAutoLogoutTimer() {
      if (!autoLogoutTimerId) {
        return;
      }

      window.clearTimeout(autoLogoutTimerId);
      autoLogoutTimerId = 0;
    }

    function clearAutoLogoutCountdownInterval() {
      if (!autoLogoutCountdownIntervalId) {
        return;
      }

      window.clearInterval(autoLogoutCountdownIntervalId);
      autoLogoutCountdownIntervalId = 0;
    }

    function formatAutoLogoutRemainingTime(remainingMs) {
      const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const pad = (value) => String(value).padStart(2, "0");

      if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      }

      return `${pad(minutes)}:${pad(seconds)}`;
    }

    function syncAutoLogoutCountdown() {
      const shouldShowCountdown =
        isUserAuthenticated() &&
        getSystemAutoLogoutMinutes() > 0 &&
        Number.isFinite(autoLogoutDeadlineAt) &&
        autoLogoutDeadlineAt > 0;

      if (autoLogoutCountdown) {
        autoLogoutCountdown.classList.toggle("hidden", !shouldShowCountdown);
      }

      if (!shouldShowCountdown) {
        if (autoLogoutCountdownValue) {
          autoLogoutCountdownValue.textContent = "00:00";
        }

        if (autoLogoutCountdown) {
          autoLogoutCountdown.title = "활동이 없으면 자동 로그아웃됩니다.";
        }

        return;
      }

      const remainingMs = Math.max(0, autoLogoutDeadlineAt - Date.now());
      const formattedRemainingTime = formatAutoLogoutRemainingTime(remainingMs);

      if (autoLogoutCountdownValue) {
        autoLogoutCountdownValue.textContent = formattedRemainingTime;
      }

      if (autoLogoutCountdown) {
        autoLogoutCountdown.title = `활동이 없으면 ${formattedRemainingTime} 후 자동 로그아웃됩니다.`;
      }
    }

    async function handleAutoLogoutTimeout(autoLogoutMinutes = getSystemAutoLogoutMinutes()) {
      clearAutoLogoutTimer();
      clearAutoLogoutCountdownInterval();
      autoLogoutDeadlineAt = 0;
      syncAutoLogoutCountdown();

      if (!isUserAuthenticated()) {
        return;
      }

      try {
        await apiRequest("/api/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        // Ignore logout request failures and clear the local state anyway.
      }

      queueFlashToast(`${autoLogoutMinutes}분 동안 활동이 없어 자동 로그아웃되었습니다.`, "error", 4200);
      setLoggedOutState({
        preserveLoginId: true,
        message: "",
      });
      updateAuthChrome();
      renderView();
      navigateToLogin({ replace: true });
    }

    function syncAutoLogoutTimer() {
      clearAutoLogoutTimer();
      clearAutoLogoutCountdownInterval();
      autoLogoutDeadlineAt = 0;
      syncAutoLogoutCountdown();

      if (!isUserAuthenticated()) {
        return;
      }

      const autoLogoutMinutes = getSystemAutoLogoutMinutes();

      if (autoLogoutMinutes <= 0) {
        return;
      }

      const timeoutMs = autoLogoutMinutes * 60 * 1000;
      autoLogoutDeadlineAt = Date.now() + timeoutMs;
      autoLogoutTimerId = window.setTimeout(() => {
        handleAutoLogoutTimeout(autoLogoutMinutes);
      }, timeoutMs);
      autoLogoutCountdownIntervalId = window.setInterval(syncAutoLogoutCountdown, 1000);
      syncAutoLogoutCountdown();
    }

    function recordAutoLogoutActivity() {
      if (!isUserAuthenticated() || getSystemAutoLogoutMinutes() <= 0) {
        return;
      }

      syncAutoLogoutTimer();
    }

    return Object.freeze({
      clearAutoLogoutCountdownInterval,
      clearAutoLogoutTimer,
      recordAutoLogoutActivity,
      syncAutoLogoutCountdown,
      syncAutoLogoutTimer,
    });
  }

  return Object.freeze({
    createAutoLogoutController,
  });
});
