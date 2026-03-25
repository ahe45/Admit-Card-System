(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFilterMenu = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridFilterMenuController({
    escapeAttribute,
    escapeHtml,
    filterGridFilterOptionValues,
    getActiveGridSortRules,
    getGridColumns,
    getGridFilterOptionValues,
    getGridFilterSelectionState,
    getTableState,
    hasGridFilter,
  }) {
    function renderTableHeaderCell(gridKey, column) {
      const activeSortRules = getActiveGridSortRules(gridKey);
      const activeSortRuleIndex = activeSortRules.findIndex((rule) => rule.key === column.key);
      const activeSortRule = activeSortRuleIndex >= 0 ? activeSortRules[activeSortRuleIndex] : null;
      const isSorted = Boolean(activeSortRule);
      const filterActive = hasGridFilter(gridKey, column.key);
      const classes = ["table-header-enhanced", `table-column-${column.key}`];
      const isAccountActionColumn =
        gridKey === "accountManagementGrid" &&
        ["editAction", "resetAction", "deleteAction"].includes(column.key);

      if (isSorted) {
        classes.push(activeSortRule.direction === "desc" ? "sorted-desc" : "sorted-asc");
      }

      if (filterActive) {
        classes.push("filter-active");
      }

      if (isAccountActionColumn) {
        classes.push("table-action-column");
      }

      return `
        <th class="${classes.join(" ")}">
          <div class="table-header-shell ${column.filterable ? "has-filter" : "no-filter"}">
            ${
              column.sortable === false
                ? `<div class="table-header-static">
                    <span class="table-header-label">${escapeHtml(column.label)}</span>
                  </div>`
                : `<button
                    type="button"
                    class="table-sort-button"
                    data-grid-key="${gridKey}"
                    data-grid-sort="${column.key}"
                    title="${escapeAttribute(column.label)} 정렬"
                  >
                    <span class="table-header-label">${escapeHtml(column.label)}</span>
                    <span class="table-sort-icon" aria-hidden="true">${renderTableSortIcon(activeSortRule, activeSortRuleIndex, activeSortRules.length)}</span>
                  </button>`
            }
            ${
              column.filterable
                ? `<button
                    type="button"
                    class="table-filter-button"
                    data-grid-key="${gridKey}"
                    data-grid-filter="${column.key}"
                    aria-label="${escapeAttribute(column.label)} 필터"
                    title="${escapeAttribute(column.label)} 필터"
                  >
                    <span class="table-filter-glyph" aria-hidden="true"></span>
                  </button>`
                : ""
            }
          </div>
        </th>
      `;
    }

    function renderTableSortIcon(sortRule, sortRuleIndex, totalSortRuleCount) {
      const directionLabel = sortRule?.direction === "desc" ? "▼" : sortRule ? "▲" : "↕";
      const orderLabel = sortRule && totalSortRuleCount > 1 ? String(sortRuleIndex + 1) : "";

      return orderLabel
        ? `<span class="table-sort-arrow">${directionLabel}</span><span class="table-sort-order">${orderLabel}</span>`
        : `<span class="table-sort-arrow">${directionLabel}</span>`;
    }

    function renderGridFilterOptionItems(gridKey, columnKey, optionValues, selectedValueSet) {
      if (optionValues.length === 0) {
        return '<div class="table-filter-empty">검색 결과가 없습니다.</div>';
      }

      return optionValues
        .map(
          (value) => `
            <label class="table-filter-option" title="${escapeAttribute(value)}">
              <input
                type="checkbox"
                data-grid-key="${gridKey}"
                data-grid-filter-option-input="${columnKey}"
                data-grid-filter-value="${escapeAttribute(value)}"
                ${selectedValueSet.has(value) ? "checked" : ""}
              />
              <span>${escapeHtml(value)}</span>
            </label>
          `,
        )
        .join("");
    }

    function renderTableFilterMenu(gridKey, column, { overlay = false } = {}) {
      const tableState = getTableState(gridKey);
      const optionValues = getGridFilterOptionValues(gridKey, column.key);
      const visibleOptions = filterGridFilterOptionValues(optionValues, tableState.filterMenuSearch);
      const selectionState = getGridFilterSelectionState(gridKey, column.key, optionValues);
      const visibleSelectedCount = visibleOptions.filter((value) => selectionState.selectedValueSet.has(value)).length;
      const isAllVisibleSelected = visibleOptions.length > 0 && visibleSelectedCount === visibleOptions.length;
      const isPartiallyVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleOptions.length;
      const className = ["table-filter-menu", overlay ? "table-filter-menu-overlay" : ""].filter(Boolean).join(" ");
      const overlayAttributes = overlay
        ? ` data-grid-key="${gridKey}" data-grid-filter-menu-overlay="${column.key}" style="visibility: hidden;"`
        : "";

      return `
        <div class="${className}"${overlayAttributes}>
          <div class="table-filter-menu-header">
            <strong>${escapeHtml(column.label)}</strong>
            <button
              type="button"
              class="table-filter-close"
              data-grid-key="${gridKey}"
              data-grid-filter-close="${column.key}"
              aria-label="${escapeAttribute(column.label)} 필터 닫기"
            >
              ×
            </button>
          </div>
          <label class="table-filter-search">
            <span>검색</span>
            <input
              type="search"
              value="${escapeAttribute(tableState.filterMenuSearch)}"
              data-grid-key="${gridKey}"
              data-grid-filter-search-input="${column.key}"
              placeholder="데이터 검색"
              autocomplete="off"
            />
          </label>
          <label class="table-filter-option table-filter-option-all">
            <input
              type="checkbox"
              data-grid-key="${gridKey}"
              data-grid-filter-select-all="${column.key}"
              data-indeterminate="${isPartiallyVisibleSelected ? "true" : "false"}"
              ${isAllVisibleSelected ? "checked" : ""}
            />
            <span>(전체)</span>
          </label>
          <div class="table-filter-option-list">
            ${renderGridFilterOptionItems(gridKey, column.key, visibleOptions, selectionState.selectedValueSet)}
          </div>
          <div class="table-filter-menu-footer">
            <button
              type="button"
              class="mini-btn subtle"
              data-grid-key="${gridKey}"
              data-grid-filter-clear="${column.key}"
            >
              초기화
            </button>
            <button
              type="button"
              class="mini-btn"
              data-grid-key="${gridKey}"
              data-grid-filter-close="${column.key}"
            >
              닫기
            </button>
          </div>
        </div>
      `;
    }

    function renderActiveGridFilterMenu(gridKey) {
      const tableState = getTableState(gridKey);
      const activeColumnKey = String(tableState.filterMenuKey || "").trim();

      if (!activeColumnKey) {
        return "";
      }

      const activeColumn = getGridColumns(gridKey).find((column) => column.key === activeColumnKey && column.filterable);

      if (!activeColumn) {
        return "";
      }

      return renderTableFilterMenu(gridKey, activeColumn, { overlay: true });
    }

    function syncOpenGridFilterMenuPosition() {
      document.querySelectorAll(".table-filter-menu-overlay").forEach((menuElement) => {
        const gridKey = menuElement.dataset.gridKey || "";
        const columnKey = menuElement.dataset.gridFilterMenuOverlay || "";
        const escapedGridKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(gridKey) : gridKey;
        const escapedColumnKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(columnKey) : columnKey;
        const triggerSelector = `button[data-grid-key="${escapedGridKey}"][data-grid-filter="${escapedColumnKey}"]`;
        const triggerElement = document.querySelector(triggerSelector);

        if (!(triggerElement instanceof HTMLElement)) {
          menuElement.style.visibility = "hidden";
          return;
        }

        const triggerRect = triggerElement.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const viewportPadding = 12;
        const nextLeft = Math.min(
          Math.max(viewportPadding, triggerRect.right - menuRect.width),
          window.innerWidth - menuRect.width - viewportPadding,
        );
        const nextTop = Math.min(triggerRect.bottom + 8, window.innerHeight - menuRect.height - viewportPadding);

        menuElement.style.left = `${Math.max(viewportPadding, Math.round(nextLeft))}px`;
        menuElement.style.top = `${Math.max(viewportPadding, Math.round(nextTop))}px`;
        menuElement.style.visibility = "visible";
      });
    }

    function syncGridFilterMenuIndicators() {
      document.querySelectorAll("[data-grid-filter-select-all]").forEach((checkbox) => {
        checkbox.indeterminate = checkbox.dataset.indeterminate === "true";
      });
    }

    function refreshGridFilterMenu(menuElement = null) {
      const targetMenu =
        menuElement instanceof HTMLElement ? menuElement : document.querySelector(".table-filter-menu-overlay");

      if (!(targetMenu instanceof HTMLElement)) {
        return;
      }

      const gridKey = targetMenu.dataset.gridKey || "";
      const columnKey = targetMenu.dataset.gridFilterMenuOverlay || "";

      if (!gridKey || !columnKey) {
        return;
      }

      const optionListElement = targetMenu.querySelector(".table-filter-option-list");
      const selectAllInput = targetMenu.querySelector("[data-grid-filter-select-all]");
      const optionValues = getGridFilterOptionValues(gridKey, columnKey);
      const visibleOptions = filterGridFilterOptionValues(optionValues, getTableState(gridKey).filterMenuSearch);
      const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
      const visibleSelectedCount = visibleOptions.filter((value) => selectionState.selectedValueSet.has(value)).length;

      if (optionListElement) {
        optionListElement.innerHTML = renderGridFilterOptionItems(gridKey, columnKey, visibleOptions, selectionState.selectedValueSet);
      }

      if (selectAllInput instanceof HTMLInputElement) {
        const isAllVisibleSelected = visibleOptions.length > 0 && visibleSelectedCount === visibleOptions.length;
        const isPartiallyVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleOptions.length;

        selectAllInput.checked = isAllVisibleSelected;
        selectAllInput.dataset.indeterminate = isPartiallyVisibleSelected ? "true" : "false";
      }

      syncGridFilterMenuIndicators();
      syncOpenGridFilterMenuPosition();
    }

    return Object.freeze({
      refreshGridFilterMenu,
      renderActiveGridFilterMenu,
      renderTableHeaderCell,
      syncGridFilterMenuIndicators,
      syncOpenGridFilterMenuPosition,
    });
  }

  return Object.freeze({
    createGridFilterMenuController,
  });
});
