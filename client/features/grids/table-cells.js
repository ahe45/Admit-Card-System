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
                  <button class="table-inline-button table-inline-button-span-2" data-account-edit="${escapeAttribute(row.id)}" type="button">수정</button>
                </div>`,
              );
        }

        if (column.key === "resetAction") {
          return renderAccountActionCell(
            column.key,
            `<button class="table-inline-button" data-account-reset="${escapeAttribute(row.id)}" type="button">초기화</button>`,
          );
        }

        if (column.key === "deleteAction") {
          return renderAccountActionCell(
            column.key,
            `<button class="table-inline-button danger" data-account-delete="${escapeAttribute(row.id)}" type="button">삭제</button>`,
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
