(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory({
      columnsModule: require("./filtering/columns"),
      filtersModule: require("./filtering/filters"),
      printHistoryModule: require("./filtering/print-history"),
      sortingModule: require("./filtering/sorting"),
    });
    return;
  }

  globalScope.AdmitCardGridFiltering = factory({
    columnsModule: globalScope.AdmitCardGridFilterColumns,
    filtersModule: globalScope.AdmitCardGridFilterState,
    printHistoryModule: globalScope.AdmitCardGridFilterPrintHistory,
    sortingModule: globalScope.AdmitCardGridFilterSorting,
  });
})(typeof globalThis !== "undefined" ? globalThis : this, ({
  columnsModule,
  filtersModule,
  printHistoryModule,
  sortingModule,
}) => {
  const applicantFormConfig = globalThis.AdmitCardApplicantFormConfig || {};

  if (!columnsModule?.createGridColumnHelpers) {
    throw new Error("client/features/grids/filtering/columns.js must be loaded before filtering.js.");
  }

  if (!sortingModule?.createGridSortingHelpers) {
    throw new Error("client/features/grids/filtering/sorting.js must be loaded before filtering.js.");
  }

  if (!filtersModule?.createGridFilterStateHelpers) {
    throw new Error("client/features/grids/filtering/filters.js must be loaded before filtering.js.");
  }

  if (!printHistoryModule?.createPrintHistorySummaryGridHelpers) {
    throw new Error("client/features/grids/filtering/print-history.js must be loaded before filtering.js.");
  }

  const { createGridColumnHelpers } = columnsModule;
  const { createGridSortingHelpers } = sortingModule;
  const { createGridFilterStateHelpers } = filtersModule;
  const { createPrintHistorySummaryGridHelpers } = printHistoryModule;
  const findApplicantScheduleRecord = applicantFormConfig.findApplicantScheduleRecord || (() => null);

  function createGridFilteringController({
    applicantAssignmentGridColumns,
    applicantHistoryGridColumns,
    applicantRecruitmentGridColumns,
    applicantScheduleGridColumns,
    accountGridColumns,
    admitCardLookupGridColumns,
    closeAllPageSizeMenus,
    examineePhotoColumn,
    examineeRegistrationGridColumns,
    getApplicantStatusLabel,
    getAccountGridRows,
    getExamineeGridRows,
    getFilteredLookupRows,
    getHeaderFilteredRows,
    getPrintHistoryRows,
    getTableState,
    printHistoryGridColumns,
    resultGridColumns,
    state,
  }) {
    const columnHelpers = createGridColumnHelpers({
      applicantAssignmentGridColumns,
      applicantHistoryGridColumns,
      applicantRecruitmentGridColumns,
      applicantScheduleGridColumns,
      accountGridColumns,
      admitCardLookupGridColumns,
      examineePhotoColumn,
      examineeRegistrationGridColumns,
      printHistoryGridColumns,
      resultGridColumns,
    });
    const { getGridColumns } = columnHelpers;

    function getBaseGridRows(gridKey) {
      if (gridKey === "admitCardLookupGrid") {
        return getFilteredLookupRows();
      }

      if (gridKey === "printHistoryGrid") {
        return getHeaderFilteredRows(getPrintHistoryRows());
      }

      if (gridKey === "accountManagementGrid") {
        return getAccountGridRows();
      }

      if (gridKey === "applicantHistoryGrid") {
        const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
        const schedules = Array.isArray(state.applicantManager?.schedules) ? state.applicantManager.schedules : [];

        return submissions.map((submission) => {
          const matchedSchedule = findApplicantScheduleRecord(schedules, submission);

          return {
            ...submission,
            statusLabel: getApplicantStatusLabel(submission?.status, {
              applicantScheduleStartAt: matchedSchedule?.applicantScheduleStartAt || "",
              applicantScheduleEndAt: matchedSchedule?.applicantScheduleEndAt || "",
            }),
          };
        });
      }

      if (gridKey === "applicantRecruitmentGrid") {
        return Array.isArray(state.applicantManager?.recruitmentUnits) ? state.applicantManager.recruitmentUnits : [];
      }

      if (gridKey === "applicantScheduleGrid") {
        return Array.isArray(state.applicantManager?.schedules) ? state.applicantManager.schedules : [];
      }

      if (gridKey === "applicantAssignmentGrid") {
        return Array.isArray(state.applicantManager?.assignments) ? state.applicantManager.assignments : [];
      }

      return getHeaderFilteredRows(getExamineeGridRows());
    }

    const sortingHelpers = createGridSortingHelpers({
      closeAllPageSizeMenus,
      getTableState,
    });
    const {
      applyGridSort,
      compareGridValues,
      getActiveGridSortRules,
      getSortedDistinctValues,
      toggleGridSort,
    } = sortingHelpers;

    const filterStateHelpers = createGridFilterStateHelpers({
      closeAllPageSizeMenus,
      getBaseGridRows,
      getGridColumns,
      getSortedDistinctValues,
      getTableState,
      state,
    });
    const {
      applyGridFilters,
      clearAllGridFilters,
      clearGridFilter,
      closeAllGridFilterMenus,
      closeGridFilterMenu,
      filterGridFilterOptionValues,
      getActiveGridFilters,
      getGridFilterComparableValue,
      getGridFilterOptionValues,
      getGridFilterSelectionState,
      getGridFilterValues,
      hasGridFilter,
      matchesGridTableFilters,
      normalizeGridFilterSearchTerm,
      removeGridFilterValue,
      setGridFilterValues,
      toggleGridFilterMenu,
      toggleGridFilterValue,
    } = filterStateHelpers;

    const printHistorySummaryHelpers = createPrintHistorySummaryGridHelpers({
      compareGridValues,
      getActiveGridSortRules,
      getExamineeGridRows,
      getGridFilterComparableValue,
      getHeaderFilteredRows,
      getTableState,
    });
    const { getPrintHistorySummaryExamineeRows } = printHistorySummaryHelpers;

    function getGridRows(gridKey) {
      const baseRows = getBaseGridRows(gridKey);
      const filteredRows = applyGridFilters(baseRows, gridKey);
      return applyGridSort(filteredRows, gridKey);
    }

    return Object.freeze({
      applyGridFilters,
      applyGridSort,
      clearAllGridFilters,
      clearGridFilter,
      closeAllGridFilterMenus,
      closeGridFilterMenu,
      compareGridValues,
      filterGridFilterOptionValues,
      getActiveGridFilters,
      getActiveGridSortRules,
      getBaseGridRows,
      getGridColumns,
      getGridFilterComparableValue,
      getGridFilterOptionValues,
      getGridFilterSelectionState,
      getGridFilterValues,
      getGridRows,
      getPrintHistorySummaryExamineeRows,
      getSortedDistinctValues,
      hasGridFilter,
      matchesGridTableFilters,
      normalizeGridFilterSearchTerm,
      removeGridFilterValue,
      setGridFilterValues,
      toggleGridFilterMenu,
      toggleGridFilterValue,
      toggleGridSort,
    });
  }

  return Object.freeze({
    createGridFilteringController,
  });
});
