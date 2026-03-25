(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridTableControls = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridTableControlController({
    escapeAttribute,
    escapeHtml,
    getActiveGridFilters,
    getGridRowId,
    getSelectedAdmitCardExamineeCount,
    isGridRowSelected,
    state,
  }) {
    function renderLeadingGridHeaders({ gridKey, selectable, showRowNumber, checkboxFirst, selectionState }) {
      const rowNumberHeader = showRowNumber ? '<th class="row-number-col">순번</th>' : "";
      const selectHeader = selectable
        ? `<th class="select-col">
            <input
              type="checkbox"
              data-grid-key="${gridKey}"
              data-grid-select-all="true"
              aria-label="전체 선택"
              ${selectionState.allSelected ? "checked" : ""}
              ${selectionState.isIndeterminate ? 'data-indeterminate="true"' : ""}
            />
          </th>`
        : "";

      return checkboxFirst ? `${selectHeader}${rowNumberHeader}` : `${rowNumberHeader}${selectHeader}`;
    }

    function renderLeadingGridCells({ gridKey, selectable, showRowNumber, checkboxFirst, rowIndex, row }) {
      const rowNumberCell = showRowNumber ? `<td class="row-number-col">${rowIndex}</td>` : "";
      const rowId = getGridRowId(gridKey, row);
      const selectCell = selectable
        ? `<td class="select-col">
            <input
              type="checkbox"
              data-grid-key="${gridKey}"
              data-grid-select-row="${escapeAttribute(rowId)}"
              aria-label="${escapeAttribute(row.name || row.examineeNo || "행")} 선택"
              ${isGridRowSelected(gridKey, rowId) ? "checked" : ""}
            />
          </td>`
        : "";

      return checkboxFirst ? `${selectCell}${rowNumberCell}` : `${rowNumberCell}${selectCell}`;
    }

    function syncGridSelectionIndicators(syncGridFilterMenuIndicators) {
      document.querySelectorAll("[data-grid-select-all]").forEach((checkbox) => {
        checkbox.indeterminate = checkbox.dataset.indeterminate === "true";
      });
      syncGridFilterMenuIndicators();
    }

    function renderTableFilterStrip(gridKey) {
      const activeFilters = getActiveGridFilters(gridKey);

      if (activeFilters.length === 0) {
        return "";
      }

      return `
        <div class="filter-strip">
          ${activeFilters
            .map(
              ({ key, label, value }) => `
                <button
                  type="button"
                  class="filter-chip active"
                  data-grid-key="${gridKey}"
                  data-grid-filter-chip="${key}"
                  data-grid-filter-value="${escapeAttribute(value)}"
                >
                  <span>${escapeHtml(label)}: ${escapeHtml(value)}</span>
                  <span>×</span>
                </button>
              `,
            )
            .join("")}
          <button type="button" class="filter-chip" data-grid-key="${gridKey}" data-grid-filter-clear-all="true">전체 해제</button>
        </div>
      `;
    }

    function renderGridHeaderActions({ gridKey, includeBatchPrint = false }) {
      return `
        ${includeBatchPrint ? renderBatchPrintButton() : ""}
        ${
          gridKey === "accountManagementGrid"
            ? `<button class="primary-button" data-open-modal="accountCreateModal" type="button">계정 등록</button>`
            : ""
        }
        ${
          gridKey === "printHistoryGrid"
            ? `<button class="outline-button" data-download-print-history="true" type="button">
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 4v10"></path>
                  <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
                  <path d="M4 20h16"></path>
                </svg>
                <span>다운로드</span>
              </button>`
            : ""
        }
        <button class="outline-button" data-refresh-grid="${gridKey}" type="button">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
            <path d="M20 4v6h-6"></path>
          </svg>
          <span>새로고침</span>
        </button>
      `;
    }

    function renderUploadHeaderAction() {
      return `
        <button class="outline-button" data-download-examinees="true" type="button">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v10"></path>
            <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
            <path d="M4 20h16"></path>
          </svg>
          <span>다운로드</span>
        </button>
        <button class="primary-button" data-open-modal="uploadModal" type="button">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 16V4"></path>
            <path d="M7.5 8.5 12 4l4.5 4.5"></path>
            <path d="M4 20h16"></path>
          </svg>
          <span>데이터 업로드</span>
        </button>
      `;
    }

    function renderBatchPrintButton() {
      const selectedCount = typeof getSelectedAdmitCardExamineeCount === "function" ? getSelectedAdmitCardExamineeCount() : 0;
      const isLoading = Boolean(state.batchPrint?.isLoading);
      const label = isLoading
        ? "PDF 생성 중..."
        : selectedCount > 0
          ? `일괄 인쇄 (${selectedCount}명)`
          : "일괄 인쇄";

      return `
        <button
          class="secondary-button"
          data-batch-print="true"
          type="button"
          ${selectedCount === 0 || isLoading ? "disabled" : ""}
        >
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 8V4.5h10V8"></path>
            <path d="M6 18H5a2 2 0 0 1-2-2v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5a2 2 0 0 1-2 2h-1"></path>
            <path d="M7 14h10v5.5H7z"></path>
            <path d="M16 11.5h2"></path>
          </svg>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    }

    function renderGridPagination({ currentPage, endRowNumber, gridKey, startRowNumber, tableState, totalPages, totalRows, visiblePageNumbers }) {
      return `
        <div class="table-pagination">
          <div class="table-page-size">
            <span>표시 개수</span>
            <div class="table-page-size-select">
              <button
                type="button"
                class="page-size-trigger"
                data-grid-key="${gridKey}"
                data-page-size-trigger="true"
                aria-expanded="${tableState.pageSizeMenuOpen ? "true" : "false"}"
              >
                <span>${tableState.pageSize}개</span>
                <span class="page-size-caret">${tableState.pageSizeMenuOpen ? "▴" : "▾"}</span>
              </button>
              ${
                tableState.pageSizeMenuOpen
                  ? `<div class="page-size-menu">
                      ${[10, 20, 50, 100]
                        .map(
                          (size) => `
                            <button
                              type="button"
                              class="page-size-option ${size === tableState.pageSize ? "active" : ""}"
                              data-grid-key="${gridKey}"
                              data-page-size-option="${size}"
                            >
                              ${size}개
                            </button>
                          `,
                        )
                        .join("")}
                    </div>`
                  : ""
              }
            </div>
          </div>
          <div class="table-pagination-actions">
            <button
              type="button"
              class="page-btn"
              data-grid-key="${gridKey}"
              data-grid-nav="prev"
              ${currentPage === 1 ? "disabled" : ""}
            >
              이전
            </button>
            ${visiblePageNumbers
              .map((page, index) => {
                const previousPage = visiblePageNumbers[index - 1];
                const ellipsis =
                  typeof previousPage === "number" && page - previousPage > 1
                    ? '<span class="table-pagination-ellipsis">…</span>'
                    : "";

                return `${ellipsis}
                  <button
                    type="button"
                    class="page-btn ${page === currentPage ? "active" : ""}"
                    data-grid-key="${gridKey}"
                    data-grid-page="${page}"
                  >
                    ${page}
                  </button>`;
              })
              .join("")}
            <button
              type="button"
              class="page-btn"
              data-grid-key="${gridKey}"
              data-grid-nav="next"
              ${currentPage === totalPages ? "disabled" : ""}
            >
              다음
            </button>
          </div>
          <div class="table-pagination-summary">${startRowNumber}-${endRowNumber} / 총 ${totalRows}건</div>
        </div>
      `;
    }

    return Object.freeze({
      renderBatchPrintButton,
      renderGridHeaderActions,
      renderGridPagination,
      renderLeadingGridCells,
      renderLeadingGridHeaders,
      renderTableFilterStrip,
      renderUploadHeaderAction,
      syncGridSelectionIndicators,
    });
  }

  return Object.freeze({
    createGridTableControlController,
  });
});
