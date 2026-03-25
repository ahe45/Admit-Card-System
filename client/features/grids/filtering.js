(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFiltering = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridFilteringController({
    accountGridColumns,
    admitCardLookupGridColumns,
    closeAllPageSizeMenus,
    examineePhotoColumn,
    examineeRegistrationGridColumns,
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
    function getGridColumns(gridKey) {
      const baseColumns =
        gridKey === "printHistoryGrid"
          ? printHistoryGridColumns
          : gridKey === "accountManagementGrid"
            ? accountGridColumns
            : gridKey === "examineeRegistrationGrid"
              ? [...examineeRegistrationGridColumns, examineePhotoColumn]
              : gridKey === "admitCardLookupGrid"
                ? admitCardLookupGridColumns
                : resultGridColumns;
      const allowFilters =
        gridKey === "examineeRegistrationGrid" ||
        gridKey === "printHistoryGrid" ||
        gridKey === "accountManagementGrid";

      return baseColumns.map((column) => ({
        ...column,
        filterable: allowFilters ? column.filterable : false,
      }));
    }

    function normalizeGridFilterSearchTerm(value) {
      return String(value ?? "").trim().toLocaleLowerCase("ko");
    }

    function filterGridFilterOptionValues(optionValues, searchTerm = "") {
      const normalizedSearchTerm = normalizeGridFilterSearchTerm(searchTerm);

      if (!normalizedSearchTerm) {
        return optionValues;
      }

      return optionValues.filter((value) =>
        String(value ?? "")
          .toLocaleLowerCase("ko")
          .includes(normalizedSearchTerm),
      );
    }

    function getGridFilterSelectionState(gridKey, columnKey, optionValues = getGridFilterOptionValues(gridKey, columnKey)) {
      const tableState = getTableState(gridKey);
      const availableValues = optionValues.filter((value, index) => optionValues.indexOf(value) === index);
      const hasExplicitFilter = Object.prototype.hasOwnProperty.call(tableState.filters || {}, columnKey);
      const explicitValues = getGridFilterValues(gridKey, columnKey).filter((value) => availableValues.includes(value));
      const selectedValues = hasExplicitFilter ? explicitValues : availableValues;

      return {
        availableValues,
        selectedValues,
        selectedValueSet: new Set(selectedValues),
        hasExplicitFilter,
      };
    }

    function getGridRows(gridKey) {
      const baseRows = getBaseGridRows(gridKey);
      const filteredRows = applyGridFilters(baseRows, gridKey);
      return applyGridSort(filteredRows, gridKey);
    }

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

      return getHeaderFilteredRows(getExamineeGridRows());
    }

    function getGridFilterComparableValue(row, key) {
      if (key === "hasPhoto") {
        return row?.hasPhoto ? "등록" : "미등록";
      }

      return String(row?.[key] ?? "");
    }

    function applyGridFilters(rows, gridKey) {
      const tableState = getTableState(gridKey);
      const filterEntries = Object.entries(tableState.filters || {}).filter(([, values]) => Array.isArray(values));

      if (filterEntries.length === 0) {
        return rows;
      }

      return rows.filter((row) =>
        filterEntries.every(([key, values]) => values.includes(getGridFilterComparableValue(row, key))),
      );
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

    function getActiveGridSortRules(gridKey) {
      return getTableState(gridKey).sortRules;
    }

    function compareGridValues(leftValue, rightValue) {
      return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "ko", {
        numeric: true,
        sensitivity: "base",
      });
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

    function toggleGridFilterMenu(gridKey, columnKey) {
      const tableState = getTableState(gridKey);
      const shouldOpen = tableState.filterMenuKey !== columnKey;

      closeAllGridFilterMenus(gridKey, shouldOpen ? columnKey : "");
      closeAllPageSizeMenus();
      tableState.filterMenuKey = shouldOpen ? columnKey : "";
      tableState.filterMenuSearch = "";
    }

    function closeGridFilterMenu(gridKey, columnKey = "") {
      const tableState = getTableState(gridKey);

      if (!columnKey || tableState.filterMenuKey === columnKey) {
        tableState.filterMenuKey = "";
        tableState.filterMenuSearch = "";
      }
    }

    function closeAllGridFilterMenus(exceptGridKey = "", exceptColumnKey = "") {
      let changed = false;

      Object.entries(state.tableSettings).forEach(([gridKey, tableState]) => {
        const shouldKeepOpen = gridKey === exceptGridKey && tableState.filterMenuKey === exceptColumnKey;

        if (!shouldKeepOpen && tableState.filterMenuKey) {
          tableState.filterMenuKey = "";
          tableState.filterMenuSearch = "";
          changed = true;
        }
      });

      return changed;
    }

    function toggleGridFilterValue(gridKey, columnKey, value) {
      const optionValues = getGridFilterOptionValues(gridKey, columnKey);
      const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
      const selectedValueSet = new Set(selectionState.selectedValues);

      if (selectedValueSet.has(value)) {
        selectedValueSet.delete(value);
      } else {
        selectedValueSet.add(value);
      }

      setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
    }

    function setGridFilterValues(gridKey, columnKey, values, optionValues = getGridFilterOptionValues(gridKey, columnKey)) {
      const tableState = getTableState(gridKey);
      const normalizedOptionValues = getSortedDistinctValues(optionValues);
      const nextValues = getSortedDistinctValues(values).filter((value) => normalizedOptionValues.includes(value));

      if (nextValues.length === normalizedOptionValues.length) {
        delete tableState.filters[columnKey];
      } else {
        tableState.filters[columnKey] = nextValues;
      }

      tableState.page = 1;
      closeAllPageSizeMenus();
    }

    function clearGridFilter(gridKey, columnKey) {
      const tableState = getTableState(gridKey);
      delete tableState.filters[columnKey];
      tableState.page = 1;
      closeAllPageSizeMenus();
    }

    function clearAllGridFilters(gridKey) {
      const tableState = getTableState(gridKey);
      tableState.filters = {};
      tableState.filterMenuKey = "";
      tableState.filterMenuSearch = "";
      tableState.page = 1;
      closeAllPageSizeMenus();
    }

    function removeGridFilterValue(gridKey, columnKey, value) {
      const optionValues = getGridFilterOptionValues(gridKey, columnKey);
      const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
      const nextValues = selectionState.selectedValues.filter((entry) => entry !== value);

      setGridFilterValues(gridKey, columnKey, nextValues, optionValues);
    }

    function getGridFilterValues(gridKey, columnKey) {
      const tableState = getTableState(gridKey);
      return Array.isArray(tableState.filters[columnKey]) ? tableState.filters[columnKey] : [];
    }

    function hasGridFilter(gridKey, columnKey) {
      return Object.prototype.hasOwnProperty.call(getTableState(gridKey).filters || {}, columnKey);
    }

    function getGridFilterOptionValues(gridKey, targetKey) {
      const tableState = getTableState(gridKey);

      return getSortedDistinctValues(
        getBaseGridRows(gridKey)
          .filter((row) => matchesGridTableFilters(row, tableState.filters, targetKey))
          .map((row) => getGridFilterComparableValue(row, targetKey)),
      );
    }

    function matchesGridTableFilters(row, filters, excludedKey = "") {
      return Object.entries(filters || {}).every(([key, values]) => {
        if (key === excludedKey || !Array.isArray(values)) {
          return true;
        }

        return values.includes(getGridFilterComparableValue(row, key));
      });
    }

    function getSortedDistinctValues(values) {
      return Array.from(new Set(values)).sort(compareGridValues);
    }

    function getActiveGridFilters(gridKey) {
      const columnsByKey = Object.fromEntries(getGridColumns(gridKey).map((column) => [column.key, column]));
      const tableState = getTableState(gridKey);

      return Object.entries(tableState.filters || []).flatMap(([key, values]) => {
        if (!Array.isArray(values) || values.length === 0 || !columnsByKey[key]) {
          return [];
        }

        return values.map((value) => ({
          key,
          label: columnsByKey[key].label,
          value,
        }));
      });
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
