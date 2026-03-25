(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAccountRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function renderAccountRoleOptions(selectedRole) {
    return accountRoleOptions
      .map(
        (role) =>
          `<option value="${escapeAttribute(role)}" ${role === selectedRole ? "selected" : ""}>${escapeHtml(role)}</option>`,
      )
      .join("");
  }

  function renderAccountManagement() {
    return `
      <section class="view-stack table-view-stack">
        ${renderExamineeResultTable({
          title: "계정 관리",
          gridKey: "accountManagementGrid",
          showPrintColumn: false,
          selectable: false,
          showRowNumber: true,
          emptyMessage: "등록된 계정이 없습니다.",
          headerActionsMarkup: renderGridHeaderActions({ gridKey: "accountManagementGrid" }),
        })}
      </section>
    `;
  }

  return {
    renderAccountManagement,
    renderAccountRoleOptions,
  };
});
