(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridTableSettings = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridTableSettingsController({ createTableState, normalizeGridSortRules, state }) {
    function getTableState(gridKey) {
      if (!state.tableSettings[gridKey]) {
        state.tableSettings[gridKey] = createTableState();
      }

      const tableState = state.tableSettings[gridKey];
      const legacySortRules =
        String(tableState.sortKey || "").trim() && String(tableState.sortDirection || "").trim()
          ? [
              {
                key: tableState.sortKey,
                direction: tableState.sortDirection,
              },
            ]
          : [];
      const defaultSortRules = normalizeGridSortRules(tableState.defaultSortRules);
      const activeSortRules = Array.isArray(tableState.sortRules)
        ? tableState.sortRules
        : legacySortRules.length
          ? legacySortRules
          : defaultSortRules;

      tableState.defaultSortRules = defaultSortRules;
      tableState.sortRules = normalizeGridSortRules(activeSortRules);
      tableState.filterMenuSearch = String(tableState.filterMenuSearch || "");

      return tableState;
    }

    function getGridPage(gridKey, totalPages) {
      const tableState = getTableState(gridKey);
      const currentPage = clampPage(tableState.page || 1, totalPages);
      tableState.page = currentPage;
      return currentPage;
    }

    function getTotalPages(totalRows, pageSize) {
      return Math.max(1, Math.ceil(totalRows / pageSize));
    }

    function clampPage(page, totalPages) {
      return Math.min(Math.max(Number(page) || 1, 1), totalPages);
    }

    function getVisiblePageNumbers(totalPages, currentPage) {
      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
      }

      const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
      return Array.from(pages)
        .filter((page) => page > 0 && page <= totalPages)
        .sort((left, right) => left - right);
    }

    function closeAllPageSizeMenus(exceptGridKey = "") {
      let changed = false;

      Object.entries(state.tableSettings).forEach(([gridKey, tableState]) => {
        if (gridKey !== exceptGridKey && tableState.pageSizeMenuOpen) {
          tableState.pageSizeMenuOpen = false;
          changed = true;
        }
      });

      return changed;
    }

    return Object.freeze({
      clampPage,
      closeAllPageSizeMenus,
      getGridPage,
      getTableState,
      getTotalPages,
      getVisiblePageNumbers,
    });
  }

  return Object.freeze({
    createGridTableSettingsController,
  });
});
