(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardBootstrapData = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function loadStoredHeaderFilters({ HEADER_FILTER_STORAGE_KEY, createHeaderFilters }) {
    const defaultFilters = createHeaderFilters();

    try {
      const storedValue = window.localStorage.getItem(HEADER_FILTER_STORAGE_KEY);

      if (!storedValue) {
        return defaultFilters;
      }

      const parsedValue = JSON.parse(storedValue);
      const nextFilters = Object.keys(defaultFilters).reduce((filters, key) => {
        filters[key] = parsedValue?.[key] ?? defaultFilters[key];
        return filters;
      }, {});

      if (!nextFilters.admission && parsedValue?.exam) {
        nextFilters.admission = parsedValue.exam;
      }

      return nextFilters;
    } catch (error) {
      return defaultFilters;
    }
  }

  function createBootstrapDataController(deps) {
    const {
      EXAMINEE_DETAIL_FIELD_KEYS,
      HEADER_FILTER_STORAGE_KEY,
      applyLoginNoticePayload,
      applySystemSettingsPayload,
      cancelAccountEdit,
      clearAutoLogoutCountdownInterval,
      clearAutoLogoutTimer,
      createAccountEditorState,
      createApplicantManagementState,
      createExamineeDetailState,
      createHeaderFilters,
      createPdfGenerationState,
      createSystemDataDeletionState,
      createTemplatePreviewState,
      getAccountGridRows,
      getExamineeGridRows,
      getPrintHistoryRows,
      reconcileHeaderFilters,
      reconcileLookupFilters,
      redirectToAccessibleRouteIfNeeded,
      registeredExamineeCount,
      renderView,
      setAccountGridRows,
      setExamineeGridRows,
      setPrintHistoryRows,
      setTemplateCards,
      state,
      syncAutoLogoutCountdown,
      syncPdfGenerationOverlay,
      todayPrintCount,
      totalPrintCount,
    } = deps;

    function getCurrentUserRole() {
      return String(state.auth.currentUser?.role || "").trim();
    }

    function persistHeaderFilters() {
      try {
        const headerFilterKeys = Object.keys(createHeaderFilters());
        const persistedFilters = headerFilterKeys.reduce((filters, key) => {
          filters[key] = state.headerFilters[key] || "";
          return filters;
        }, {});

        window.localStorage.setItem(HEADER_FILTER_STORAGE_KEY, JSON.stringify(persistedFilters));
      } catch (error) {
        // Ignore storage failures and keep the in-memory state.
      }
    }

    function resetGridPages() {
      Object.values(state.tableSettings).forEach((tableState) => {
        tableState.page = 1;
      });
    }

    function clearHeaderFilters() {
      state.headerFilters = createHeaderFilters();
      reconcileLookupFilters();
      persistHeaderFilters();
      resetGridPages();
      renderView();
    }

    function updateMetricBadges() {
      if (registeredExamineeCount) {
        registeredExamineeCount.textContent = `${state.metrics.registeredExaminees}명`;
      }

      if (todayPrintCount) {
        todayPrintCount.textContent = `${state.metrics.todayPrints}건`;
      }

      if (totalPrintCount) {
        totalPrintCount.textContent = `${state.metrics.totalPrints}건`;
      }
    }

    function normalizeExamineeRecord(record = {}) {
      const time = String(record.time ?? record.session ?? "");
      const track = String(record.track ?? "");
      const admission = String(record.admission ?? record.exam ?? "");
      const series = String(record.series ?? "");
      const unit = String(record.unit ?? "");
      const group = String(record.group ?? "");
      const examineeNo = String(record.examineeNo ?? "");

      return {
        ...record,
        time,
        session: time,
        track,
        admission,
        exam: admission,
        series,
        unit,
        group,
        examineeNo,
        hasPhoto: record.hasPhoto === true || record.hasPhoto === "true" || Number(record.hasPhoto) === 1,
        photoVersion: Number(record.photoVersion || 0),
      };
    }

    function buildExamineeDetailDraft(record = {}) {
      const normalizedRecord = normalizeExamineeRecord(record);

      return EXAMINEE_DETAIL_FIELD_KEYS.reduce((draft, fieldKey) => {
        draft[fieldKey] = String(normalizedRecord?.[fieldKey] ?? "");
        return draft;
      }, {});
    }

    function areExamineeDetailDraftsEqual(leftRecord = null, rightRecord = null) {
      if (!leftRecord || !rightRecord) {
        return false;
      }

      return EXAMINEE_DETAIL_FIELD_KEYS.every(
        (fieldKey) => String(leftRecord[fieldKey] ?? "") === String(rightRecord[fieldKey] ?? ""),
      );
    }

    function reconcileExamineeDetailState() {
      const selectedExamineeNo = String(
        state.examineeDetail?.selectedExamineeNo || state.examineeDetail?.originalExamineeNo || "",
      ).trim();

      if (!selectedExamineeNo) {
        state.examineeDetail = createExamineeDetailState();
        return;
      }

      const examineeGridRows = getExamineeGridRows();
      const matchedRow =
        examineeGridRows.find((row) => row.examineeNo === selectedExamineeNo) ||
        examineeGridRows.find((row) => row.examineeNo === state.examineeDetail.originalExamineeNo) ||
        null;

      if (!matchedRow) {
        state.examineeDetail = createExamineeDetailState();
        return;
      }

      const nextBaseRecord = buildExamineeDetailDraft(matchedRow);
      const hasUnsavedChanges =
        state.examineeDetail.draftRecord &&
        state.examineeDetail.baseRecord &&
        !areExamineeDetailDraftsEqual(state.examineeDetail.draftRecord, state.examineeDetail.baseRecord);

      state.examineeDetail = {
        ...state.examineeDetail,
        selectedExamineeNo: matchedRow.examineeNo,
        originalExamineeNo: matchedRow.examineeNo,
        baseRecord: nextBaseRecord,
        draftRecord: hasUnsavedChanges ? state.examineeDetail.draftRecord : nextBaseRecord,
      };
    }

    function resetBootstrapData() {
      clearAutoLogoutTimer();
      clearAutoLogoutCountdownInterval();
      setExamineeGridRows([]);
      setPrintHistoryRows([]);
      setAccountGridRows([]);
      setTemplateCards([]);
      state.systemDataDeletion = createSystemDataDeletionState();
      state.metrics = {
        registeredExaminees: 0,
        todayPrints: 0,
        totalPrints: 0,
      };
      state.applicantManager = createApplicantManagementState();
      state.pdfGeneration = createPdfGenerationState();
      state.bootstrap.error = "";
      state.bootstrap.isLoading = false;
      state.bootstrap.serverDate = "";
      state.examineeDetail = createExamineeDetailState();
      state.accountEditor = createAccountEditorState();
      state.templatePreview = createTemplatePreviewState();
      updateMetricBadges();
      syncPdfGenerationOverlay();
      syncAutoLogoutCountdown();
    }

    function normalizeAccountRecord(record = {}) {
      return {
        id: String(record.id || ""),
        name: String(record.name || ""),
        role: String(record.role || "조회용"),
        recentAccess: String(record.recentAccess || "-"),
      };
    }

    function applyBootstrapPayload(payload) {
      applySystemSettingsPayload(payload.systemSettings);
      applyLoginNoticePayload(payload.loginNoticeHtml, { scope: "login" });
      applyLoginNoticePayload(payload.applicantNoticeHtml, { scope: "applicant" });
      const nextExamineeRows = Array.isArray(payload.examinees) ? payload.examinees.map(normalizeExamineeRecord) : [];
      const nextPrintHistoryRows = Array.isArray(payload.printHistory) ? payload.printHistory.map(normalizeExamineeRecord) : [];
      const nextAccountRows = Array.isArray(payload.accounts) ? payload.accounts.map(normalizeAccountRecord) : [];

      setExamineeGridRows(nextExamineeRows);
      setPrintHistoryRows(nextPrintHistoryRows);
      setAccountGridRows(nextAccountRows);
      setTemplateCards(Array.isArray(payload.templates) ? payload.templates : []);
      state.applicantManager = {
        ...state.applicantManager,
        fields: Array.isArray(payload.applicantManager?.fields) ? payload.applicantManager.fields : [],
        recruitmentUnits: Array.isArray(payload.applicantManager?.recruitmentUnits) ? payload.applicantManager.recruitmentUnits : [],
        submissions: Array.isArray(payload.applicantManager?.submissions) ? payload.applicantManager.submissions : [],
        settings: payload.applicantManager?.settings || createApplicantManagementState().settings,
      };
      state.bootstrap.serverDate = String(payload.serverDate || "").trim();
      state.metrics = {
        registeredExaminees: Number(payload.summary?.registeredExaminees || nextExamineeRows.length),
        todayPrints: Number(payload.summary?.todayPrints || 0),
        totalPrints: Number(payload.summary?.totalPrints || nextPrintHistoryRows.length),
      };

      reconcileExamineeDetailState();

      if (state.accountEditor.editingId && !getAccountGridRows().some((row) => row.id === state.accountEditor.editingId)) {
        cancelAccountEdit();
      }

      if (state.auth.currentUser?.id) {
        const currentAccount = getAccountGridRows().find((row) => row.id === state.auth.currentUser.id);

        if (currentAccount) {
          state.auth.currentUser = {
            ...state.auth.currentUser,
            name: currentAccount.name,
            role: currentAccount.role,
          };
        }
      }

      if (redirectToAccessibleRouteIfNeeded()) {
        return;
      }

      reconcileHeaderFilters();
      reconcileLookupFilters();
      persistHeaderFilters();
      updateMetricBadges();
    }

    return Object.freeze({
      applyBootstrapPayload,
      areExamineeDetailDraftsEqual,
      buildExamineeDetailDraft,
      clearHeaderFilters,
      getCurrentUserRole,
      normalizeAccountRecord,
      normalizeExamineeRecord,
      persistHeaderFilters,
      reconcileExamineeDetailState,
      resetBootstrapData,
      resetGridPages,
      updateMetricBadges,
    });
  }

  return Object.freeze({
    createBootstrapDataController,
    loadStoredHeaderFilters,
  });
});
