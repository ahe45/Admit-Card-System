(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardPrintHistoryRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function renderPrintHistory() {
    return `
      <section class="view-stack table-view-stack">
        ${renderExamineeResultTable({
          title: "수험표 출력 이력",
          gridKey: "printHistoryGrid",
          showPrintColumn: false,
          selectable: false,
          showRowNumber: true,
          emptyMessage: "출력 이력이 없습니다.",
          headerActionsMarkup: renderGridHeaderActions({ gridKey: "printHistoryGrid" }),
        })}
      </section>
    `;
  }

  return {
    renderPrintHistory,
  };
});
