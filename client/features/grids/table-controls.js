(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridTableControls = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const applicantFormConfig = globalThis.AdmitCardApplicantFormConfig || {};
  const findApplicantScheduleRecord = applicantFormConfig.findApplicantScheduleRecord || (() => null);
  const getApplicantSubmissionScheduleState =
    applicantFormConfig.getApplicantSubmissionScheduleState ||
    (() => ({
      isConfigured: false,
      isOpen: false,
      reason: "not_configured",
      applicantScheduleStartAt: "",
      applicantScheduleEndAt: "",
    }));
  const buildApplicantScheduleContextLabel =
    applicantFormConfig.buildApplicantScheduleContextLabel || ((value = {}) => String(value?.track || value?.trackName || "선택한 전형"));
  const buildApplicantScheduleRangeLabel = applicantFormConfig.buildApplicantScheduleRangeLabel || (() => "");

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

    function formatApplicantScheduleRangeForTitle(value = "") {
      return String(value || "").trim().replaceAll("T", " ");
    }

    function getApplicantSelectedSubmissions(statuses = []) {
      const selectedRowIds =
        Array.isArray(state.tableSettings?.applicantHistoryGrid?.selectedRowIds) ? state.tableSettings.applicantHistoryGrid.selectedRowIds : [];
      const selectedRowIdSet = new Set(
        selectedRowIds
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      const allowedStatuses = new Set(
        (Array.isArray(statuses) ? statuses : [statuses])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];

      return submissions.filter((submission) => {
        const submissionId = String(submission?.id || "").trim();

        if (!submissionId || !selectedRowIdSet.has(submissionId)) {
          return false;
        }

        if (allowedStatuses.size === 0) {
          return true;
        }

        return allowedStatuses.has(String(submission?.status || "submitted").trim() || "submitted");
      });
    }

    function getApplicantPromotionAvailability() {
      const selectedSubmissions = getApplicantSelectedSubmissions(["submitted"]);
      const schedules = Array.isArray(state.applicantManager?.schedules) ? state.applicantManager.schedules : [];
      const handledScheduleKeys = new Set();
      const scheduleEntries = [];

      selectedSubmissions.forEach((submission) => {
        const matchedSchedule = findApplicantScheduleRecord(schedules, submission);
        const scheduleKey =
          String(matchedSchedule?.scheduleKey || submission?.scheduleKey || `${submission?.track || ""}|${submission?.admissionCode || ""}|${submission?.admission || ""}`).trim();

        if (scheduleKey && handledScheduleKeys.has(scheduleKey)) {
          return;
        }

        if (scheduleKey) {
          handledScheduleKeys.add(scheduleKey);
        }

        scheduleEntries.push({
          submission,
          scheduleState: getApplicantSubmissionScheduleState(matchedSchedule),
        });
      });

      const blockingEntry = scheduleEntries.find((entry) => entry.scheduleState.reason !== "after_end") || null;

      return {
        isAvailable: selectedSubmissions.length > 0 && !blockingEntry,
        blockingEntry,
        selectedSubmissions,
      };
    }

    function getApplicantPromotionBlockedTitle(blockingEntry = null) {
      if (!blockingEntry) {
        return "접수기간 종료 후에만 고사실 배정을 진행할 수 있습니다.";
      }

      const contextLabel = buildApplicantScheduleContextLabel(blockingEntry.submission);
      const scheduleRangeLabel = formatApplicantScheduleRangeForTitle(
        buildApplicantScheduleRangeLabel(blockingEntry.scheduleState, "submission"),
      );

      if (blockingEntry.scheduleState.reason === "not_configured") {
        return `${contextLabel} 접수 기간이 설정되지 않아 고사실 배정을 진행할 수 없습니다.`;
      }

      if (blockingEntry.scheduleState.reason === "before_start") {
        return `${contextLabel} 접수 일정이 아직 시작되지 않았습니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`;
      }

      if (blockingEntry.scheduleState.reason === "invalid") {
        return `${contextLabel} 접수 기간 설정을 확인한 뒤 다시 시도하세요.`;
      }

      return `${contextLabel} 접수기간 중에는 고사실 배정을 진행할 수 없습니다.${scheduleRangeLabel ? ` 접수 기간: ${scheduleRangeLabel}` : ""}`;
    }

    function getApplicantHistorySelectionCounts() {
      const selectedRowIds =
        Array.isArray(state.tableSettings?.applicantHistoryGrid?.selectedRowIds)
          ? state.tableSettings.applicantHistoryGrid.selectedRowIds
          : [];
      const selectedRowIdSet = new Set(
        selectedRowIds
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      );
      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
      let submittedCount = 0;
      let promotedCount = 0;

      submissions.forEach((submission) => {
        const submissionId = String(submission?.id || "").trim();

        if (!submissionId || !selectedRowIdSet.has(submissionId)) {
          return;
        }

        if (String(submission?.status || "submitted").trim() === "promoted") {
          promotedCount += 1;
          return;
        }

        submittedCount += 1;
      });

      return {
        selectedCount: submittedCount + promotedCount,
        submittedCount,
        promotedCount,
      };
    }

    function renderGridHeaderActions({ gridKey, includeBatchPrint = false }) {
      const applicantHistorySelectionCounts =
        gridKey === "applicantHistoryGrid"
          ? getApplicantHistorySelectionCounts()
          : { selectedCount: 0, submittedCount: 0, promotedCount: 0 };
      const applicantPromotionAvailability =
        gridKey === "applicantHistoryGrid"
          ? getApplicantPromotionAvailability()
          : { isAvailable: false, blockingEntry: null };
      const applicantPromotionAvailable = gridKey === "applicantHistoryGrid" && applicantPromotionAvailability.isAvailable;
      const applicantPromotionLabel = `고사실 배정(${applicantHistorySelectionCounts.submittedCount}명)`;
      const applicantPromotionResetLabel = `배정 초기화(${applicantHistorySelectionCounts.promotedCount}명)`;
      const applicantPromotionTitle = applicantPromotionAvailable
        ? "배정표 관리 메뉴에 저장된 고사실 순서와 배정 기준으로 선택한 접수 이력을 자동 배정합니다."
        : applicantHistorySelectionCounts.selectedCount === 0
          ? "배정할 접수 이력을 먼저 선택하세요."
          : applicantHistorySelectionCounts.submittedCount === 0
            ? "선택한 접수 이력 중 접수 완료 상태만 고사실 배정할 수 있습니다."
            : getApplicantPromotionBlockedTitle(applicantPromotionAvailability.blockingEntry);
      const applicantPromotionResetTitle =
        applicantHistorySelectionCounts.promotedCount > 0
          ? "선택한 접수 이력의 고사실 배정 결과를 초기화하고 제출 상태로 되돌립니다."
          : applicantHistorySelectionCounts.selectedCount > 0
            ? "선택한 접수 이력 중 배정 완료 상태만 배정 초기화할 수 있습니다."
            : "배정 초기화할 접수 이력을 먼저 선택하세요.";

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
        ${
          gridKey === "applicantHistoryGrid"
            ? `<button
                class="outline-button"
                data-applicant-submission-promotion-open="true"
                type="button"
                title="${escapeAttribute(applicantPromotionTitle)}"
                ${!applicantPromotionAvailable || applicantHistorySelectionCounts.submittedCount === 0 ? "disabled" : ""}
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20V6l8-2 8 2v14"></path>
                  <path d="M9 9h.01"></path>
                  <path d="M15 9h.01"></path>
                  <path d="M9 13h.01"></path>
                  <path d="M15 13h.01"></path>
                  <path d="M10 20v-3h4v3"></path>
                </svg>
                <span>${escapeHtml(applicantPromotionLabel)}</span>
              </button>`
            : ""
        }
        ${
          gridKey === "applicantHistoryGrid"
            ? `<button
                class="outline-button danger-button"
                data-applicant-submission-promotion-reset="true"
                type="button"
                title="${escapeAttribute(applicantPromotionResetTitle)}"
                ${applicantHistorySelectionCounts.promotedCount === 0 ? "disabled" : ""}
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                  <path d="M3 4v5h5"></path>
                  <path d="M12 8v4l3 2"></path>
                </svg>
                <span>${escapeHtml(applicantPromotionResetLabel)}</span>
              </button>`
            : ""
        }
        ${
          gridKey === "applicantHistoryGrid"
            ? `<button class="outline-button" data-open-modal="applicantSubmissionDownloadModal" type="button">
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
        <button class="primary-button" data-open-modal="uploadTypeModal" type="button">
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
        ? "파일 생성 중..."
        : `일괄 다운로드(${selectedCount}명)`;

      return `
        <button
          class="secondary-button"
          data-open-modal="batchPrintDownloadModal"
          type="button"
          ${selectedCount === 0 || isLoading ? "disabled" : ""}
        >
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v10"></path>
            <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
            <path d="M4 20h16"></path>
          </svg>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    }

    function renderGridPagination({ currentPage, endRowNumber, gridKey, startRowNumber, tableState, totalPages, totalRows, visiblePageNumbers }) {
      const pageSizeOptions = [10, 20, 50, 100, 500, 1000, 2000, 0];
      const currentPageSize = Number(tableState.pageSize || 0);
      const pageSizeLabel = currentPageSize > 0 ? `${currentPageSize}개` : "모두 표시";

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
                <span>${escapeHtml(pageSizeLabel)}</span>
                <span class="page-size-caret">${tableState.pageSizeMenuOpen ? "▴" : "▾"}</span>
              </button>
              ${
                tableState.pageSizeMenuOpen
                  ? `<div class="page-size-menu">
                      ${pageSizeOptions
                        .map(
                          (size) => `
                            <button
                              type="button"
                              class="page-size-option ${size === currentPageSize ? "active" : ""}"
                              data-grid-key="${gridKey}"
                              data-page-size-option="${size}"
                            >
                              ${size > 0 ? `${size}개` : "모두 표시"}
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
