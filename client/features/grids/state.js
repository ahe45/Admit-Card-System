(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const gridFilteringModule = globalThis.AdmitCardGridFiltering;
  const gridSelectionModule = globalThis.AdmitCardGridSelection;
  const gridTableSettingsModule = globalThis.AdmitCardGridTableSettings;

  if (!gridFilteringModule?.createGridFilteringController) {
    throw new Error("client/features/grids/filtering.js must be loaded before client/features/grids/state.js.");
  }

  if (!gridSelectionModule?.createGridSelectionController) {
    throw new Error("client/features/grids/selection.js must be loaded before client/features/grids/state.js.");
  }

  if (!gridTableSettingsModule?.createGridTableSettingsController) {
    throw new Error("client/features/grids/table-settings.js must be loaded before client/features/grids/state.js.");
  }

  const { createGridFilteringController } = gridFilteringModule;
  const { createGridSelectionController } = gridSelectionModule;
  const { createGridTableSettingsController } = gridTableSettingsModule;

  function createGridStateController(deps) {
    const {
      applicantHistoryGridColumns,
      applicantRecruitmentGridColumns,
      accountGridColumns,
      admitCardLookupGridColumns,
      createTableState,
      examineePhotoColumn,
      examineeRegistrationGridColumns,
      getApplicantStatusLabel,
      getAccountGridRows,
      getExamineeGridRows,
      getFilteredLookupRows,
      getHeaderFilteredRows,
      normalizeGridSortRules,
      openExamineeDetail,
      getPrintHistoryRows,
      printHistoryGridColumns,
      resultGridColumns,
      startApplicantRecruitmentUnitEdit,
      state,
    } = deps;

    const gridTableSettingsController = createGridTableSettingsController({
      createTableState,
      normalizeGridSortRules,
      state,
    });
    const {
      clampPage,
      closeAllPageSizeMenus,
      getGridPage,
      getTableState,
      getTotalPages,
      getVisiblePageNumbers,
    } = gridTableSettingsController;

    const gridFilteringController = createGridFilteringController({
      applicantHistoryGridColumns,
      applicantRecruitmentGridColumns,
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
    });
    const {
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
    } = gridFilteringController;

    const gridSelectionController = createGridSelectionController({
      getGridRows,
      getTableState,
      openExamineeDetail,
      startApplicantRecruitmentUnitEdit,
      state,
    });
    const {
      getGridRowId,
      getGridSelectableRowIds,
      getGridSelectedRowIds,
      getGridSelectionAnchorRowId,
      getGridSelectionState,
      handleAdmitCardLookupRowSelection,
      handleGridRowClickSelection,
      isGridRowClickable,
      isGridRowHighlighted,
      isGridRowSelected,
      setGridSelectedRowIds,
      toggleGridRowSelection,
      toggleGridSelectAll,
    } = gridSelectionController;

    return Object.freeze({
      applyGridFilters,
      applyGridSort,
      clampPage,
      clearAllGridFilters,
      clearGridFilter,
      closeAllGridFilterMenus,
      closeAllPageSizeMenus,
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
      getGridPage,
      getGridRowId,
      getGridRows,
      getGridSelectableRowIds,
      getGridSelectedRowIds,
      getGridSelectionAnchorRowId,
      getGridSelectionState,
      getPrintHistorySummaryExamineeRows,
      getSortedDistinctValues,
      getTableState,
      getTotalPages,
      getVisiblePageNumbers,
      handleAdmitCardLookupRowSelection,
      handleGridRowClickSelection,
      hasGridFilter,
      isGridRowClickable,
      isGridRowHighlighted,
      isGridRowSelected,
      matchesGridTableFilters,
      normalizeGridFilterSearchTerm,
      removeGridFilterValue,
      setGridFilterValues,
      setGridSelectedRowIds,
      toggleGridFilterMenu,
      toggleGridFilterValue,
      toggleGridRowSelection,
      toggleGridSelectAll,
      toggleGridSort,
    });
  }

  return Object.freeze({
    createGridStateController,
  });
});
