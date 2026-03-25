(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFilterSorting = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridSortingHelpers({
    closeAllPageSizeMenus,
    getTableState,
  }) {
    function getActiveGridSortRules(gridKey) {
      return getTableState(gridKey).sortRules;
    }

    function compareGridValues(leftValue, rightValue) {
      return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "ko", {
        numeric: true,
        sensitivity: "base",
      });
    }

    function applyGridSort(rows, gridKey) {
      const activeSortRules = getActiveGridSortRules(gridKey);

      if (!activeSortRules.length) {
        return rows;
      }

      return rows
        .map((row, index) => ({ row, index }))
        .sort((leftEntry, rightEntry) => {
          for (const rule of activeSortRules) {
            const leftValue = leftEntry.row[rule.key];
            const rightValue = rightEntry.row[rule.key];
            const comparison = compareGridValues(leftValue, rightValue);

            if (comparison !== 0) {
              return rule.direction === "desc" ? comparison * -1 : comparison;
            }
          }

          return leftEntry.index - rightEntry.index;
        })
        .map((entry) => entry.row);
    }

    function toggleGridSort(gridKey, columnKey) {
      const tableState = getTableState(gridKey);
      const currentRuleIndex = tableState.sortRules.findIndex((rule) => rule.key === columnKey);

      if (currentRuleIndex < 0) {
        tableState.sortRules.push({
          key: columnKey,
          direction: "asc",
        });
      } else if (tableState.sortRules[currentRuleIndex].direction === "asc") {
        tableState.sortRules[currentRuleIndex].direction = "desc";
      } else {
        tableState.sortRules.splice(currentRuleIndex, 1);
      }

      tableState.page = 1;
      tableState.filterMenuKey = "";
      tableState.filterMenuSearch = "";
      closeAllPageSizeMenus();
    }

    function getSortedDistinctValues(values) {
      return Array.from(new Set(values)).sort(compareGridValues);
    }

    return Object.freeze({
      applyGridSort,
      compareGridValues,
      getActiveGridSortRules,
      getSortedDistinctValues,
      toggleGridSort,
    });
  }

  return Object.freeze({
    createGridSortingHelpers,
  });
});
