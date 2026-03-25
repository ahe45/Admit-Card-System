(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridDocumentEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridDocumentEventHandlers({
    batchPrintSelectedExaminees,
    clearAllGridFilters,
    clearGridFilter,
    clearHeaderFilters,
    clampPage,
    closeAllGridFilterMenus,
    closeAllHeaderCombos,
    closeAllPageSizeMenus,
    closeGridFilterMenu,
    createLookupFilters,
    downloadExamineeGridWorkbook,
    downloadPrintHistoryGridWorkbook,
    filterGridFilterOptionValues,
    getGridFilterOptionValues,
    getGridFilterSelectionState,
    getGridPage,
    getGridRows,
    getHeaderComboElement,
    getTableState,
    getTotalPages,
    handleGridRowClickSelection,
    headerFilterFields,
    loadBootstrapData,
    lookupSelectFields,
    lookupTextFields,
    persistHeaderFilters,
    printExamineeAdmitCard,
    refreshAdmitCardLookupGrid,
    refreshGridFilterMenu,
    reconcileHeaderFilters,
    reconcileLookupFilters,
    removeGridFilterValue,
    renderView,
    rerenderGridInteraction,
    rerenderLookupViewInteraction,
    resetGridPages,
    setGridFilterValues,
    setHeaderComboOpen,
    state,
    toggleGridFilterMenu,
    toggleGridFilterValue,
    toggleGridRowSelection,
    toggleGridSelectAll,
    toggleGridSort,
    updateLookupTextFilter,
    uploadSelectedExamineeFile,
  }) {
    function handlePriorityClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const headerComboTrigger = target?.closest("[data-header-combo-trigger]") || null;
      const headerComboOptionTrigger = target?.closest("[data-header-combo-option]") || null;
      const gridSelectionTrigger = target?.closest("[data-grid-select-all], [data-grid-select-row]") || null;
      const resetHeaderFiltersTrigger = target?.closest("[data-reset-header-filters]") || null;

      if (headerComboTrigger) {
        const selectId = String(headerComboTrigger.dataset.headerComboTrigger || "").trim();
        const comboElement = getHeaderComboElement(selectId);
        const nextOpen = !(comboElement?.classList.contains("is-open"));

        closeAllHeaderCombos(nextOpen ? selectId : "");
        setHeaderComboOpen(selectId, nextOpen);
        return true;
      }

      if (headerComboOptionTrigger) {
        const selectId = String(headerComboOptionTrigger.dataset.headerComboOption || "").trim();
        const selectElement = document.getElementById(selectId);

        if (selectElement instanceof HTMLSelectElement) {
          closeAllHeaderCombos();
          selectElement.value = String(headerComboOptionTrigger.dataset.headerComboValue || "");
          selectElement.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          closeAllHeaderCombos();
        }

        return true;
      }

      if (gridSelectionTrigger) {
        return true;
      }

      if (resetHeaderFiltersTrigger) {
        clearHeaderFilters();
        return true;
      }

      return false;
    }

    async function handleGridActionClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const downloadExamineesTrigger = target?.closest("[data-download-examinees]") || null;
      const downloadPrintHistoryTrigger = target?.closest("[data-download-print-history]") || null;
      const uploadExamineesTrigger = target?.closest("[data-upload-examinees]") || null;
      const batchPrintTrigger = target?.closest("[data-batch-print]") || null;
      const examineePrintTrigger = target?.closest("[data-print-examinee]") || null;
      const gridRowTrigger = target?.closest("[data-grid-row-clickable]") || null;
      const pageSizeTrigger = target?.closest("[data-page-size-trigger]") || null;
      const pageSizeOption = target?.closest("[data-page-size-option]") || null;
      const pageTrigger = target?.closest("[data-grid-page], [data-grid-nav]") || null;
      const sortTrigger = target?.closest("[data-grid-sort]") || null;
      const filterTrigger = target?.closest("[data-grid-filter]") || null;
      const filterOptionTrigger = target?.closest("[data-grid-filter-option]") || null;
      const filterClearTrigger = target?.closest("[data-grid-filter-clear]") || null;
      const filterCloseTrigger = target?.closest("[data-grid-filter-close]") || null;
      const filterChipTrigger = target?.closest("[data-grid-filter-chip]") || null;
      const filterClearAllTrigger = target?.closest("[data-grid-filter-clear-all]") || null;
      const lookupResetTrigger = target?.closest("[data-reset-lookup]") || null;
      const refreshTrigger = target?.closest("[data-refresh-grid]") || null;

      if (downloadExamineesTrigger) {
        await downloadExamineeGridWorkbook();
        return true;
      }

      if (downloadPrintHistoryTrigger) {
        await downloadPrintHistoryGridWorkbook();
        return true;
      }

      if (uploadExamineesTrigger) {
        await uploadSelectedExamineeFile();
        return true;
      }

      if (batchPrintTrigger) {
        await batchPrintSelectedExaminees();
        return true;
      }

      if (examineePrintTrigger) {
        await printExamineeAdmitCard(examineePrintTrigger.dataset.printExaminee);
        return true;
      }

      if (gridRowTrigger) {
        closeAllPageSizeMenus();
        closeAllGridFilterMenus();

        if (
          handleGridRowClickSelection(gridRowTrigger.dataset.gridKey, gridRowTrigger.dataset.gridRowId, {
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
          })
        ) {
          rerenderGridInteraction(gridRowTrigger.dataset.gridKey);
        }

        return true;
      }

      if (pageSizeTrigger) {
        const tableState = getTableState(pageSizeTrigger.dataset.gridKey);
        const nextOpen = !tableState.pageSizeMenuOpen;

        closeAllPageSizeMenus(nextOpen ? pageSizeTrigger.dataset.gridKey : "");
        closeAllGridFilterMenus();
        tableState.pageSizeMenuOpen = nextOpen;
        rerenderGridInteraction(pageSizeTrigger.dataset.gridKey);
        return true;
      }

      if (pageSizeOption) {
        const tableState = getTableState(pageSizeOption.dataset.gridKey);
        tableState.pageSize = Number(pageSizeOption.dataset.pageSizeOption) || 10;
        tableState.page = 1;
        tableState.pageSizeMenuOpen = false;
        closeAllPageSizeMenus(pageSizeOption.dataset.gridKey);
        closeAllGridFilterMenus();
        rerenderGridInteraction(pageSizeOption.dataset.gridKey);
        return true;
      }

      if (pageTrigger) {
        const tableState = getTableState(pageTrigger.dataset.gridKey);
        const totalPages = getTotalPages(getGridRows(pageTrigger.dataset.gridKey).length, tableState.pageSize);
        const currentPage = getGridPage(pageTrigger.dataset.gridKey, totalPages);

        if (pageTrigger.dataset.gridNav === "prev") {
          tableState.page = Math.max(1, currentPage - 1);
        }

        if (pageTrigger.dataset.gridNav === "next") {
          tableState.page = Math.min(totalPages, currentPage + 1);
        }

        if (pageTrigger.dataset.gridPage) {
          tableState.page = clampPage(pageTrigger.dataset.gridPage, totalPages);
        }

        tableState.pageSizeMenuOpen = false;
        closeAllGridFilterMenus();
        rerenderGridInteraction(pageTrigger.dataset.gridKey);
        return true;
      }

      if (sortTrigger) {
        toggleGridSort(sortTrigger.dataset.gridKey, sortTrigger.dataset.gridSort);
        rerenderGridInteraction(sortTrigger.dataset.gridKey);
        return true;
      }

      if (filterTrigger) {
        toggleGridFilterMenu(filterTrigger.dataset.gridKey, filterTrigger.dataset.gridFilter);
        rerenderGridInteraction(filterTrigger.dataset.gridKey);
        return true;
      }

      if (filterOptionTrigger) {
        toggleGridFilterValue(
          filterOptionTrigger.dataset.gridKey,
          filterOptionTrigger.dataset.gridFilterOption,
          filterOptionTrigger.dataset.gridFilterValue,
        );
        rerenderGridInteraction(filterOptionTrigger.dataset.gridKey);
        return true;
      }

      if (filterClearTrigger) {
        clearGridFilter(filterClearTrigger.dataset.gridKey, filterClearTrigger.dataset.gridFilterClear);
        rerenderGridInteraction(filterClearTrigger.dataset.gridKey);
        return true;
      }

      if (filterCloseTrigger) {
        closeGridFilterMenu(filterCloseTrigger.dataset.gridKey, filterCloseTrigger.dataset.gridFilterClose);
        rerenderGridInteraction(filterCloseTrigger.dataset.gridKey);
        return true;
      }

      if (filterChipTrigger) {
        removeGridFilterValue(
          filterChipTrigger.dataset.gridKey,
          filterChipTrigger.dataset.gridFilterChip,
          filterChipTrigger.dataset.gridFilterValue,
        );
        rerenderGridInteraction(filterChipTrigger.dataset.gridKey);
        return true;
      }

      if (filterClearAllTrigger) {
        clearAllGridFilters(filterClearAllTrigger.dataset.gridKey);
        rerenderGridInteraction(filterClearAllTrigger.dataset.gridKey);
        return true;
      }

      if (lookupResetTrigger) {
        state.lookupFilters = createLookupFilters();
        getTableState("admitCardLookupGrid").page = 1;
        rerenderLookupViewInteraction();
        return true;
      }

      if (refreshTrigger) {
        const tableState = getTableState(refreshTrigger.dataset.refreshGrid);
        tableState.page = 1;
        tableState.pageSizeMenuOpen = false;
        await loadBootstrapData({ showLoading: false });
        return true;
      }

      return false;
    }

    function handleTrailingClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      const filterMenu = target?.closest(".table-filter-menu") || null;

      if (filterMenu) {
        return true;
      }

      closeAllHeaderCombos();
      const didCloseMenus = closeAllPageSizeMenus();
      const didCloseFilterMenus = closeAllGridFilterMenus();

      if (didCloseMenus || didCloseFilterMenus) {
        rerenderGridInteraction("admitCardLookupGrid");
      }

      return false;
    }

    async function handleChange(event) {
      const target = event.target instanceof Element ? event.target : null;
      const lookupSelectField = lookupSelectFields.find((field) => field.id === target?.id);
      const headerFilterField = headerFilterFields.find((field) => field.id === target?.id);
      const gridSelectAllTrigger = target?.closest("[data-grid-select-all]") || null;
      const gridSelectRowTrigger = target?.closest("[data-grid-select-row]") || null;
      const filterSelectAllTrigger = target?.matches("[data-grid-filter-select-all]") ? target : null;
      const filterOptionInput = target?.matches("[data-grid-filter-option-input]") ? target : null;

      if (gridSelectAllTrigger) {
        toggleGridSelectAll(gridSelectAllTrigger.dataset.gridKey);
        rerenderGridInteraction(gridSelectAllTrigger.dataset.gridKey);
        return true;
      }

      if (gridSelectRowTrigger) {
        toggleGridRowSelection(gridSelectRowTrigger.dataset.gridKey, gridSelectRowTrigger.dataset.gridSelectRow);
        rerenderGridInteraction(gridSelectRowTrigger.dataset.gridKey);
        return true;
      }

      if (filterSelectAllTrigger) {
        const gridKey = filterSelectAllTrigger.dataset.gridKey || "";
        const columnKey = filterSelectAllTrigger.dataset.gridFilterSelectAll || "";
        const optionValues = getGridFilterOptionValues(gridKey, columnKey);
        const visibleOptions = filterGridFilterOptionValues(optionValues, getTableState(gridKey).filterMenuSearch);
        const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
        const selectedValueSet = new Set(selectionState.selectedValues);

        visibleOptions.forEach((value) => {
          if (filterSelectAllTrigger.checked) {
            selectedValueSet.add(value);
          } else {
            selectedValueSet.delete(value);
          }
        });

        setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
        rerenderGridInteraction(gridKey);
        return true;
      }

      if (filterOptionInput) {
        const gridKey = filterOptionInput.dataset.gridKey || "";
        const columnKey = filterOptionInput.dataset.gridFilterOptionInput || "";
        const optionValues = getGridFilterOptionValues(gridKey, columnKey);
        const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
        const selectedValueSet = new Set(selectionState.selectedValues);
        const optionValue = filterOptionInput.dataset.gridFilterValue || "";

        if (filterOptionInput.checked) {
          selectedValueSet.add(optionValue);
        } else {
          selectedValueSet.delete(optionValue);
        }

        setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
        rerenderGridInteraction(gridKey);
        return true;
      }

      if (lookupSelectField) {
        state.lookupFilters[lookupSelectField.key] = target?.value;
        reconcileLookupFilters();
        getTableState("admitCardLookupGrid").page = 1;
        rerenderLookupViewInteraction();
        return true;
      }

      if (headerFilterField) {
        state.headerFilters[headerFilterField.key] = target?.value;
        reconcileHeaderFilters();
        reconcileLookupFilters();
        persistHeaderFilters();
        resetGridPages();
        renderView();
        return true;
      }

      return false;
    }

    function handleCompositionStart(event) {
      const target = event.target;

      if (lookupTextFields.some((field) => field.id === target?.id)) {
        state.composingInputId = target.id;
        return true;
      }

      return false;
    }

    function handleCompositionEnd(event) {
      const target = event.target;
      const textField = lookupTextFields.find((field) => field.id === target?.id);

      if (!textField) {
        return false;
      }

      state.composingInputId = "";
      updateLookupTextFilter(textField.key, target.value);
      refreshAdmitCardLookupGrid();
      return true;
    }

    function handleInput(event) {
      const target = event.target instanceof Element ? event.target : null;
      const gridFilterSearchInput = target?.matches("[data-grid-filter-search-input]") ? target : null;

      if (gridFilterSearchInput) {
        const gridKey = gridFilterSearchInput.dataset.gridKey || "";
        const tableState = getTableState(gridKey);

        tableState.filterMenuSearch = gridFilterSearchInput.value;
        refreshGridFilterMenu(gridFilterSearchInput.closest(".table-filter-menu"));
        return true;
      }

      const textField = lookupTextFields.find((field) => field.id === target?.id);

      if (!textField || state.composingInputId === target?.id) {
        return false;
      }

      updateLookupTextFilter(textField.key, target.value);
      refreshAdmitCardLookupGrid();
      return true;
    }

    function handleEscape() {
      return closeAllPageSizeMenus() || closeAllGridFilterMenus();
    }

    return Object.freeze({
      handleChange,
      handleCompositionEnd,
      handleCompositionStart,
      handleEscape,
      handleGridActionClick,
      handleInput,
      handlePriorityClick,
      handleTrailingClick,
    });
  }

  return Object.freeze({
    createGridDocumentEventHandlers,
  });
});
