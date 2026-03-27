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

    function normalizeApplicantScheduleDateTime(value) {
      const normalizedValue = String(value ?? "").trim();

      if (!normalizedValue) {
        return "";
      }

      const matchedValue = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

      if (!matchedValue) {
        return "";
      }

      const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = matchedValue;
      const year = Number(yearValue);
      const month = Number(monthValue);
      const day = Number(dayValue);
      const hour = Number(hourValue);
      const minute = Number(minuteValue);
      const parsedDate = new Date(year, month - 1, day, hour, minute, 0, 0);

      if (
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() + 1 !== month ||
        parsedDate.getDate() !== day ||
        parsedDate.getHours() !== hour ||
        parsedDate.getMinutes() !== minute
      ) {
        return "";
      }

      return `${yearValue}-${monthValue}-${dayValue}T${hourValue}:${minuteValue}`;
    }

    function createEmptyApplicantScheduleParts() {
      return {
        year: "",
        month: "",
        day: "",
        hour: "",
        minute: "",
      };
    }

    function normalizeAdmitCardDataSource(value) {
      const normalizedValue = String(value ?? "").trim();
      return ["submission", "examinee"].includes(normalizedValue) ? normalizedValue : "examinee";
    }

    function normalizeApplicantScheduleParts(parts = {}) {
      return {
        year: String(parts?.year || "").trim(),
        month: String(parts?.month || "").trim(),
        day: String(parts?.day || "").trim(),
        hour: String(parts?.hour || "").trim(),
        minute: String(parts?.minute || "").trim(),
      };
    }

    function isApplicantSchedulePartComplete(parts = {}) {
      const normalizedParts = normalizeApplicantScheduleParts(parts);
      return Object.values(normalizedParts).every(Boolean);
    }

    function buildApplicantScheduleDateTimeFromParts(parts = {}) {
      const normalizedParts = normalizeApplicantScheduleParts(parts);

      if (!isApplicantSchedulePartComplete(normalizedParts)) {
        return "";
      }

      return normalizeApplicantScheduleDateTime(
        `${normalizedParts.year}-${normalizedParts.month}-${normalizedParts.day}T${normalizedParts.hour}:${normalizedParts.minute}`,
      );
    }

    function getApplicantScheduleTimestamp(value) {
      const normalizedValue = normalizeApplicantScheduleDateTime(value);

      if (!normalizedValue) {
        return NaN;
      }

      const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/) || [];
      return new Date(
        Number(yearValue),
        Number(monthValue) - 1,
        Number(dayValue),
        Number(hourValue),
        Number(minuteValue),
        0,
        0,
      ).getTime();
    }

    function validateSystemScheduleRange(scheduleLabel, startAtParts, endAtParts) {
      const normalizedStartAtParts = normalizeApplicantScheduleParts(startAtParts);
      const normalizedEndAtParts = normalizeApplicantScheduleParts(endAtParts);
      const startAt = buildApplicantScheduleDateTimeFromParts(normalizedStartAtParts);
      const endAt = buildApplicantScheduleDateTimeFromParts(normalizedEndAtParts);

      if (!isApplicantSchedulePartComplete(normalizedStartAtParts) || !isApplicantSchedulePartComplete(normalizedEndAtParts)) {
        throw new Error(`${scheduleLabel}은 년/월/일/시/분을 모두 선택하세요.`);
      }

      if (!startAt || !endAt) {
        throw new Error(`${scheduleLabel}은 반드시 설정해야 합니다.`);
      }

      const startTimestamp = getApplicantScheduleTimestamp(startAt);
      const endTimestamp = getApplicantScheduleTimestamp(endAt);

      if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
        throw new Error(`${scheduleLabel} 형식이 올바르지 않습니다.`);
      }

      if (startTimestamp > endTimestamp) {
        throw new Error(`${scheduleLabel}의 시작 일시는 종료 일시보다 늦을 수 없습니다.`);
      }

      return {
        startAt,
        endAt,
        startAtParts: normalizedStartAtParts,
        endAtParts: normalizedEndAtParts,
      };
    }

    function applySystemSettingsPayload(payload = {}, options = {}) {
      const nextSettings = normalizeSystemSettingsPayload(payload);

      state.systemSettings.initialPassword = nextSettings.initialPassword;
      state.systemSettings.autoLogoutMinutes = nextSettings.autoLogoutMinutes;
      state.systemSettings.admissionHomepageUrl = nextSettings.admissionHomepageUrl;
      state.systemSettings.applicantScheduleStartAt = nextSettings.applicantScheduleStartAt;
      state.systemSettings.applicantScheduleStartAtParts =
        nextSettings.applicantScheduleStartAtParts && typeof nextSettings.applicantScheduleStartAtParts === "object"
          ? { ...nextSettings.applicantScheduleStartAtParts }
          : createEmptyApplicantScheduleParts();
      state.systemSettings.applicantScheduleEndAt = nextSettings.applicantScheduleEndAt;
      state.systemSettings.applicantScheduleEndAtParts =
        nextSettings.applicantScheduleEndAtParts && typeof nextSettings.applicantScheduleEndAtParts === "object"
          ? { ...nextSettings.applicantScheduleEndAtParts }
          : createEmptyApplicantScheduleParts();
      state.systemSettings.admitCardLookupScheduleStartAt = nextSettings.admitCardLookupScheduleStartAt;
      state.systemSettings.admitCardLookupScheduleStartAtParts =
        nextSettings.admitCardLookupScheduleStartAtParts && typeof nextSettings.admitCardLookupScheduleStartAtParts === "object"
          ? { ...nextSettings.admitCardLookupScheduleStartAtParts }
          : createEmptyApplicantScheduleParts();
      state.systemSettings.admitCardLookupScheduleEndAt = nextSettings.admitCardLookupScheduleEndAt;
      state.systemSettings.admitCardLookupScheduleEndAtParts =
        nextSettings.admitCardLookupScheduleEndAtParts && typeof nextSettings.admitCardLookupScheduleEndAtParts === "object"
          ? { ...nextSettings.admitCardLookupScheduleEndAtParts }
          : createEmptyApplicantScheduleParts();
      state.systemSettings.admitCardDataSource = normalizeAdmitCardDataSource(nextSettings.admitCardDataSource);
      state.systemSettings.applicantSchedulePopoverTarget = "";
      state.systemSettings.applicantExamNoDigitCount = nextSettings.applicantExamNoDigitCount;
      state.systemSettings.applicantExamNoComponents = [...nextSettings.applicantExamNoComponents];

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
      const admissionHomepageUrl = String(state.systemSettings.admissionHomepageUrl ?? "").trim();
      const applicantScheduleRange = validateSystemScheduleRange(
        "접수 일정",
        state.systemSettings.applicantScheduleStartAtParts,
        state.systemSettings.applicantScheduleEndAtParts,
      );
      const admitCardLookupScheduleRange = validateSystemScheduleRange(
        "수험표 조회 기간",
        state.systemSettings.admitCardLookupScheduleStartAtParts,
        state.systemSettings.admitCardLookupScheduleEndAtParts,
      );
      const admitCardDataSource = normalizeAdmitCardDataSource(state.systemSettings.admitCardDataSource);
      const applicantExamNoDigitCount = Math.round(Number(state.systemSettings.applicantExamNoDigitCount));
      const applicantExamNoComponents = Array.isArray(state.systemSettings.applicantExamNoComponents)
        ? state.systemSettings.applicantExamNoComponents.map((value) => String(value || "").trim())
        : [];

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

      if (admissionHomepageUrl.length > 500) {
        throw new Error("입학처 홈페이지 링크는 500자 이하여야 합니다.");
      }

      if (admissionHomepageUrl && !/^https?:\/\/\S+$/i.test(admissionHomepageUrl) && !/^\/\S*$/.test(admissionHomepageUrl)) {
        throw new Error("입학처 홈페이지 링크는 https:// 주소 또는 /경로 형식으로 입력하세요.");
      }

      if (!Number.isFinite(applicantExamNoDigitCount) || applicantExamNoDigitCount < 1 || applicantExamNoDigitCount > 30) {
        throw new Error("수험번호 자리수는 1자 이상 30자 이하로 입력하세요.");
      }

      const selectedExamNoComponents = applicantExamNoComponents.filter(Boolean);

      if (selectedExamNoComponents.length === 0) {
        throw new Error("수험번호 자동 생성 구성 요소를 하나 이상 선택하세요.");
      }

      if (selectedExamNoComponents.filter((value) => value === "sequence").length !== 1) {
        throw new Error("수험번호 자동 생성 구성에는 순번을 한 번만 포함해야 합니다.");
      }

      if (new Set(selectedExamNoComponents).size !== selectedExamNoComponents.length) {
        throw new Error("수험번호 자동 생성 구성 요소는 중복 없이 선택하세요.");
      }

      return {
        initialPassword,
        autoLogoutMinutes,
        admissionHomepageUrl,
        applicantScheduleStartAt: applicantScheduleRange.startAt,
        applicantScheduleEndAt: applicantScheduleRange.endAt,
        admitCardLookupScheduleStartAt: admitCardLookupScheduleRange.startAt,
        admitCardLookupScheduleEndAt: admitCardLookupScheduleRange.endAt,
        admitCardDataSource,
        applicantExamNoDigitCount,
        applicantExamNoComponents,
      };
    }

    function buildSystemDataDeletionSuccessMessage(result = {}) {
      const scope = String(result.scope || "").trim();
      const deletedExaminees = Number(result.deletedExaminees || 0);
      const deletedPhotos = Number(result.deletedPhotos || 0);
      const deletedApplicantSettings = Number(result.deletedApplicantSettings || 0);
      const deletedPrintHistory = Number(result.deletedPrintHistory || 0);
      const deletedApplicantSubmissions = Number(result.deletedApplicantSubmissions || 0);

      if (scope === "all") {
        return `전체 데이터를 삭제했습니다. 수험생 ${deletedExaminees}건, 사진 ${deletedPhotos}건, 접수 설정 ${deletedApplicantSettings}건, 출력 이력 ${deletedPrintHistory}건, 접수 이력 ${deletedApplicantSubmissions}건이 정리되었습니다.`;
      }

      if (scope === "applicant-settings") {
        return `접수 설정 데이터 ${deletedApplicantSettings}건을 삭제했습니다.`;
      }

      if (scope === "photos") {
        return `사진 데이터 ${deletedPhotos}건을 삭제했습니다.`;
      }

      if (scope === "applicant-history") {
        return `접수 이력 데이터 ${deletedApplicantSubmissions}건을 삭제했습니다.`;
      }

      if (scope === "examinees") {
        if (deletedPrintHistory > 0) {
          return `수험생 데이터 ${deletedExaminees}건을 삭제했습니다. 사진 ${deletedPhotos}건과 연관된 출력 이력 ${deletedPrintHistory}건이 함께 정리되었습니다.`;
        }

        return `수험생 데이터 ${deletedExaminees}건을 삭제했습니다. 사진 ${deletedPhotos}건이 함께 정리되었습니다.`;
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

      let currentPassword = "";

      if (normalizedScope === "all") {
        currentPassword = String(window.prompt("전체 데이터 삭제를 진행하려면 현재 로그인한 계정의 비밀번호를 입력하세요.", "") || "");

        if (!currentPassword) {
          setSystemDataDeletionStatus("전체 데이터 삭제가 취소되었습니다.", "warning");
          return;
        }
      }

      state.systemDataDeletion.isDeleting = true;
      state.systemDataDeletion.activeScope = normalizedScope;
      setSystemDataDeletionStatus("");
      renderView();

      try {
        const result = await apiRequest(`/api/system-data/${encodeURIComponent(normalizedScope)}`, {
          method: "DELETE",
          body: normalizedScope === "all" ? JSON.stringify({ currentPassword }) : undefined,
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
