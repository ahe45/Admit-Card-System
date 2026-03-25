(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridDocumentInputs = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridInputHandlers({
    createLookupFilters,
    filterGridFilterOptionValues,
    getGridFilterOptionValues,
    getGridFilterSelectionState,
    getTableState,
    headerFilterFields,
    lookupSelectFields,
    lookupTextFields,
    persistHeaderFilters,
    reconcileHeaderFilters,
    reconcileLookupFilters,
    refreshAdmitCardLookupGrid,
    refreshGridFilterMenu,
    renderView,
    rerenderGridInteraction,
    rerenderLookupViewInteraction,
    resetGridPages,
    setGridFilterValues,
    state,
    toggleGridRowSelection,
    toggleGridSelectAll,
    updateLookupTextFilter,
  }) {
    function handleChange(event) {
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

    return Object.freeze({
      handleChange,
      handleCompositionEnd,
      handleCompositionStart,
      handleInput,
    });
  }

  return Object.freeze({
    createGridInputHandlers,
  });
});
