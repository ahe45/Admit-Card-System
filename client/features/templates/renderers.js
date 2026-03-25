(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateManagementRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function renderTemplateManagement() {
    return `
      <section class="view-stack template-management-view">
        <article class="form-card template-management-panel">
          <div class="section-header template-management-header">
            <div>
              <h3>수험표 양식 관리</h3>
              <p>등록된 수험표 양식을 확인하고 관리합니다.</p>
            </div>
            <button class="primary-button" data-add-template="true" type="button">새 양식 등록</button>
          </div>

          <div class="template-grid">
            ${
              state.templateCards.length > 0
                ? state.templateCards.map((card) => renderTemplateCard(card)).join("")
                : `
                  <article class="panel-card">
                    <p>등록된 수험표 양식이 없습니다.</p>
                    <span class="muted">새 양식 등록 버튼으로 사용할 첫 양식을 생성하세요.</span>
                  </article>
                `
            }
          </div>
        </article>
      </section>
    `;
  }

  return {
    renderTemplateManagement,
  };
});
