(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFilterPrintHistory = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createPrintHistorySummaryGridHelpers({
    compareGridValues,
    getActiveGridSortRules,
    getExamineeGridRows,
    getGridFilterComparableValue,
    getHeaderFilteredRows,
    getTableState,
  }) {
    function getPrintHistorySummaryExamineeRows() {
      const rows = getHeaderFilteredRows(getExamineeGridRows());
      const tableState = getTableState("printHistoryGrid");
      const filterEntries = Object.entries(tableState.filters || {}).filter(([key, values]) => key !== "printedAt" && Array.isArray(values));
      const sortRules = getActiveGridSortRules("printHistoryGrid").filter((rule) => rule.key !== "printedAt");
      const filteredRows =
        filterEntries.length === 0
          ? rows
          : rows.filter((row) => filterEntries.every(([key, values]) => values.includes(getGridFilterComparableValue(row, key))));

      if (sortRules.length === 0) {
        return filteredRows;
      }

      return filteredRows
        .map((row, index) => ({ row, index }))
        .sort((leftEntry, rightEntry) => {
          for (const rule of sortRules) {
            const comparison = compareGridValues(leftEntry.row[rule.key], rightEntry.row[rule.key]);

            if (comparison !== 0) {
              return rule.direction === "desc" ? comparison * -1 : comparison;
            }
          }

          return leftEntry.index - rightEntry.index;
        })
        .map((entry) => entry.row);
    }

    return Object.freeze({
      getPrintHistorySummaryExamineeRows,
    });
  }

  return Object.freeze({
    createPrintHistorySummaryGridHelpers,
  });
});
