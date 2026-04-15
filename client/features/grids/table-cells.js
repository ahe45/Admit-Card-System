(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridTableCells = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridTableCellsController({
    escapeAttribute,
    escapeHtml,
    renderAccountRoleOptions,
    state,
  }) {
    function isAccountRowEditing(accountId) {
      return state.accountEditor.editingId === accountId;
    }

    function renderTableDataCell(columnKey, content, extraClasses = []) {
      const classes = [`table-column-${columnKey}`, ...extraClasses].filter(Boolean);

      return `<td class="${classes.join(" ")}">${content}</td>`;
    }

    function renderTableTruncatedTextContent(value, { strong = false } = {}) {
      const normalizedValue = String(value ?? "");
      const content = strong ? `<strong>${escapeHtml(normalizedValue)}</strong>` : escapeHtml(normalizedValue);

      return `<span class="table-cell-text" data-grid-cell-text="true" data-grid-cell-full-text="${escapeAttribute(normalizedValue)}">${content}</span>`;
    }

    function renderTableTextCell(columnKey, value, extraClasses = [], options = {}) {
      return renderTableDataCell(columnKey, renderTableTruncatedTextContent(value, options), extraClasses);
    }

    function renderAccountActionCell(columnKey, content) {
      return renderTableDataCell(columnKey, content, ["table-action-column"]);
    }

    function renderTableCell(gridKey, column, row) {
      if (gridKey === "applicantHistoryGrid") {
        if (column.key === "id") {
          return renderTableTextCell(column.key, row.id, [], { strong: true });
        }

        if (column.key === "statusLabel") {
          return renderTableDataCell(
            column.key,
            `<span class="applicant-status-chip applicant-status-${escapeAttribute(row.status || "submitted")}">${escapeHtml(row.statusLabel || row.status || "-")}</span>`,
          );
        }

        if (column.key === "detailAction") {
          return renderAccountActionCell(
            column.key,
            `
              <button
                class="icon-button table-inline-icon-button"
                data-applicant-submission-toggle="${escapeAttribute(row.id)}"
                type="button"
                aria-label="답변 보기"
                title="답변 보기"
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            `,
          );
        }

        if (column.key === "deleteAction") {
          return renderAccountActionCell(
            column.key,
            `
              <button
                class="icon-button table-inline-icon-button danger-button"
                data-applicant-submission-delete="${escapeAttribute(row.id)}"
                type="button"
                aria-label="접수 삭제"
                title="접수 삭제"
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16"></path>
                  <path d="M9.5 3.5h5"></path>
                  <path d="M8 7v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 18V7"></path>
                  <path d="M10 10.5v5"></path>
                  <path d="M14 10.5v5"></path>
                </svg>
              </button>
            `,
          );
        }

      }

      if (gridKey === "accountManagementGrid") {
        const isEditing = isAccountRowEditing(row.id);

        if (column.key === "name") {
          return isEditing
            ? renderTableDataCell(
                column.key,
                `
                  <div class="table-inline-field-shell">
                    <input
                      class="table-inline-input"
                      data-account-field="name"
                      data-account-id="${escapeAttribute(row.id)}"
                      value="${escapeAttribute(state.accountEditor.draftName)}"
                    maxlength="100"
                    />
                  </div>
                `,
              )
            : renderTableTextCell(column.key, row.name, [], { strong: true });
        }

        if (column.key === "role") {
          return isEditing
            ? renderTableDataCell(
                column.key,
                `
                  <div class="table-inline-field-shell">
                    <select class="table-inline-select" data-account-field="role" data-account-id="${escapeAttribute(row.id)}">
                      ${renderAccountRoleOptions(state.accountEditor.draftRole)}
                    </select>
                  </div>
                `,
              )
            : renderTableTextCell(column.key, row.role);
        }

        if (column.key === "editAction") {
          return isEditing
            ? renderAccountActionCell(
                column.key,
                `
                  <div class="table-inline-actions table-inline-actions-compact table-inline-actions-dual">
                    <button class="table-inline-button primary" data-account-save="${escapeAttribute(row.id)}" type="button">저장</button>
                    <button class="table-inline-button" data-account-cancel="${escapeAttribute(row.id)}" type="button">취소</button>
                  </div>
                `,
              )
            : renderAccountActionCell(
                column.key,
                `<div class="table-inline-actions table-inline-actions-compact table-inline-actions-dual table-inline-actions-reserved">
                  <button
                    class="icon-button table-inline-icon-button table-inline-button-span-2"
                    data-account-edit="${escapeAttribute(row.id)}"
                    type="button"
                    aria-label="계정 수정"
                    title="계정 수정"
                  >
                    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"></path>
                      <path d="m12.5 7 4.5 4.5"></path>
                    </svg>
                  </button>
                </div>`,
              );
        }

        if (column.key === "resetAction") {
          return renderAccountActionCell(
            column.key,
            `
              <button
                class="icon-button table-inline-icon-button"
                data-account-reset="${escapeAttribute(row.id)}"
                type="button"
                aria-label="비밀번호 초기화"
                title="비밀번호 초기화"
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
                  <path d="M20 4v6h-6"></path>
                </svg>
              </button>
            `,
          );
        }

        if (column.key === "deleteAction") {
          return renderAccountActionCell(
            column.key,
            `
              <button
                class="icon-button table-inline-icon-button danger-button"
                data-account-delete="${escapeAttribute(row.id)}"
                type="button"
                aria-label="계정 삭제"
                title="계정 삭제"
              >
                <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16"></path>
                  <path d="M9.5 3.5h5"></path>
                  <path d="M8 7v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 18V7"></path>
                  <path d="M10 10.5v5"></path>
                  <path d="M14 10.5v5"></path>
                </svg>
              </button>
            `,
          );
        }
      }

      const value = row[column.key];

      if (column.key === "examineeNo") {
        return renderTableTextCell(column.key, value, [], { strong: true });
      }

      if (column.key === "hasPhoto") {
        return renderTableDataCell(column.key, row.hasPhoto ? "O" : "X", [
          "table-photo-cell",
          row.hasPhoto ? "available" : "missing",
        ]);
      }

      return renderTableTextCell(column.key, value);
    }

    return Object.freeze({
      renderTableCell,
    });
  }

  return Object.freeze({
    createGridTableCellsController,
  });
});
