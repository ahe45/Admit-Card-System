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
          description: "수험표 발급 이력을 조회하고, 조건별로 필터링한 결과를 다운로드합니다.",
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
