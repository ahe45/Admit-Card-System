(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridInteraction = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridInteractionController({ refreshAdmitCardLookupView, renderView, state }) {
    const GRID_CELL_TOOLTIP_DELAY_MS = 1000;
    let gridCellTooltipTimerId = 0;
    let gridCellTooltipActiveTarget = null;

    function getGridCellTooltipElement() {
      return document.getElementById("tableCellTooltip");
    }

    function clearGridCellTooltipTimer() {
      if (gridCellTooltipTimerId) {
        window.clearTimeout(gridCellTooltipTimerId);
        gridCellTooltipTimerId = 0;
      }
    }

    function resetGridCellTooltipPosition(tooltipElement) {
      if (!(tooltipElement instanceof HTMLElement)) {
        return;
      }

      tooltipElement.style.removeProperty("left");
      tooltipElement.style.removeProperty("top");
    }

    function hideGridCellTooltip() {
      clearGridCellTooltipTimer();
      gridCellTooltipActiveTarget = null;

      const tooltipElement = getGridCellTooltipElement();

      if (!(tooltipElement instanceof HTMLElement)) {
        return;
      }

      tooltipElement.classList.add("hidden");
      tooltipElement.setAttribute("aria-hidden", "true");
      tooltipElement.textContent = "";
      resetGridCellTooltipPosition(tooltipElement);
    }

    function getGridCellTooltipTarget(target) {
      return target instanceof Element ? target.closest("[data-grid-cell-text]") : null;
    }

    function isGridCellTooltipOverflowing(targetElement) {
      return targetElement instanceof HTMLElement && targetElement.scrollWidth > targetElement.clientWidth + 1;
    }

    function positionGridCellTooltip(targetElement) {
      const tooltipElement = getGridCellTooltipElement();

      if (
        !(tooltipElement instanceof HTMLElement) ||
        !(targetElement instanceof HTMLElement) ||
        tooltipElement.classList.contains("hidden")
      ) {
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const viewportPadding = 12;
      const offset = 10;
      const tooltipRect = tooltipElement.getBoundingClientRect();
      let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
      let top = targetRect.bottom + offset;

      if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipRect.width - viewportPadding;
      }

      if (left < viewportPadding) {
        left = viewportPadding;
      }

      if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
        top = targetRect.top - tooltipRect.height - offset;
      }

      if (top < viewportPadding) {
        top = viewportPadding;
      }

      tooltipElement.style.left = `${Math.round(left)}px`;
      tooltipElement.style.top = `${Math.round(top)}px`;
    }

    function showGridCellTooltip(targetElement) {
      if (
        !(targetElement instanceof HTMLElement) ||
        !document.body.contains(targetElement) ||
        !isGridCellTooltipOverflowing(targetElement)
      ) {
        hideGridCellTooltip();
        return;
      }

      const tooltipElement = getGridCellTooltipElement();
      const fullText = String(targetElement.dataset.gridCellFullText || "").trim();

      if (!(tooltipElement instanceof HTMLElement) || !fullText) {
        hideGridCellTooltip();
        return;
      }

      tooltipElement.textContent = fullText;
      tooltipElement.classList.remove("hidden");
      tooltipElement.setAttribute("aria-hidden", "false");
      gridCellTooltipActiveTarget = targetElement;
      positionGridCellTooltip(targetElement);
    }

    function scheduleGridCellTooltip(targetElement) {
      if (!(targetElement instanceof HTMLElement)) {
        return;
      }

      clearGridCellTooltipTimer();
      gridCellTooltipActiveTarget = targetElement;

      if (!isGridCellTooltipOverflowing(targetElement)) {
        return;
      }

      gridCellTooltipTimerId = window.setTimeout(() => {
        if (gridCellTooltipActiveTarget !== targetElement) {
          return;
        }

        showGridCellTooltip(targetElement);
      }, GRID_CELL_TOOLTIP_DELAY_MS);
    }

    function rerenderGridInteraction(gridKey = "") {
      hideGridCellTooltip();

      if (state.currentView === "admitCardLookup" && gridKey === "admitCardLookupGrid") {
        refreshAdmitCardLookupView();
        return;
      }

      renderView();
    }

    function rerenderLookupViewInteraction() {
      hideGridCellTooltip();

      if (state.currentView === "admitCardLookup") {
        refreshAdmitCardLookupView();
        return;
      }

      renderView();
    }

    function handleGridCellTooltipMouseOver(event) {
      const nextTarget = getGridCellTooltipTarget(event.target);

      if (!(nextTarget instanceof HTMLElement)) {
        return;
      }

      const previousTarget = getGridCellTooltipTarget(event.relatedTarget);

      if (previousTarget === nextTarget) {
        return;
      }

      scheduleGridCellTooltip(nextTarget);
    }

    function handleGridCellTooltipMouseOut(event) {
      const previousTarget = getGridCellTooltipTarget(event.target);

      if (!(previousTarget instanceof HTMLElement)) {
        return;
      }

      const nextTarget = getGridCellTooltipTarget(event.relatedTarget);

      if (previousTarget === nextTarget) {
        return;
      }

      hideGridCellTooltip();
    }

    function handleGridCellTooltipResize() {
      if (gridCellTooltipActiveTarget instanceof HTMLElement) {
        positionGridCellTooltip(gridCellTooltipActiveTarget);
      }
    }

    function handleGridCellTooltipScroll() {
      hideGridCellTooltip();
    }

    return Object.freeze({
      handleGridCellTooltipMouseOut,
      handleGridCellTooltipMouseOver,
      handleGridCellTooltipResize,
      handleGridCellTooltipScroll,
      hideGridCellTooltip,
      rerenderGridInteraction,
      rerenderLookupViewInteraction,
    });
  }

  return Object.freeze({
    createGridInteractionController,
  });
});
