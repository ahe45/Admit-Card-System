(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridDocumentPriority = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridPriorityClickHandler({
    clearHeaderFilters,
    closeAllHeaderCombos,
    getHeaderComboElement,
    setHeaderComboOpen,
  }) {
    return function handlePriorityClick(event) {
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
    };
  }

  return Object.freeze({
    createGridPriorityClickHandler,
  });
});
