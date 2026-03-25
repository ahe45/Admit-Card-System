(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineePageRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function renderExamineeRegistration() {
    return `
      <section class="view-stack table-view-stack">
        ${renderExamineeResultTable({
          title: "수험생 등록",
          gridKey: "examineeRegistrationGrid",
          showPrintColumn: false,
          selectable: false,
          showRowNumber: true,
          headerActionsMarkup: renderUploadHeaderAction(),
        })}
      </section>
    `;
  }

  function renderAdmitCardLookup() {
    const filters = state.lookupFilters;
    const optionMap = getLookupOptionMap();

    return `
      <section class="view-stack lookup-view-stack" id="admitCardLookupViewMount">
        <article class="form-card lookup-filter-card">
          <div class="section-header">
            <div>
              <h3>수험표 출력</h3>
            </div>
          </div>

          <div class="search-grid five">
            <div class="field">
              <label for="searchDate">시험날짜</label>
              <select id="searchDate">
                ${buildOptionMarkup(optionMap.date, filters.date)}
              </select>
            </div>
            <div class="field">
              <label for="searchTime">시간</label>
              <select id="searchTime">
                ${buildOptionMarkup(optionMap.time, filters.time)}
              </select>
            </div>
            <div class="field">
              <label for="searchTrack">모집시기</label>
              <select id="searchTrack">
                ${buildOptionMarkup(optionMap.track, filters.track)}
              </select>
            </div>
            <div class="field">
              <label for="searchAdmission">전형</label>
              <select id="searchAdmission">
                ${buildOptionMarkup(optionMap.admission, filters.admission)}
              </select>
            </div>
            <div class="field">
              <label for="searchSeries">계열</label>
              <select id="searchSeries">
                ${buildOptionMarkup(optionMap.series, filters.series)}
              </select>
            </div>
          </div>

          <div class="search-grid four">
            <div class="field">
              <label for="searchUnit">모집단위</label>
              <select id="searchUnit">
                ${buildOptionMarkup(optionMap.unit, filters.unit)}
              </select>
            </div>
            <div class="field">
              <label for="searchMajor">전공</label>
              <select id="searchMajor">
                ${buildOptionMarkup(optionMap.major, filters.major)}
              </select>
            </div>
            <div class="field">
              <label for="searchBuilding">고사건물</label>
              <select id="searchBuilding">
                ${buildOptionMarkup(optionMap.building, filters.building)}
              </select>
            </div>
            <div class="field">
              <label for="searchRoom">고사실</label>
              <select id="searchRoom">
                ${buildOptionMarkup(optionMap.room, filters.room)}
              </select>
            </div>
          </div>

          <div class="search-grid four lookup-search-grid-actions">
            <div class="field">
              <label for="searchExamineeNo">수험번호</label>
              <input
                id="searchExamineeNo"
                value="${escapeAttribute(filters.examineeNo)}"
                placeholder="수험번호 전체 또는 일부를 입력하세요"
              />
            </div>
            <div class="field">
              <label for="searchExamineeName">이름</label>
              <input
                id="searchExamineeName"
                value="${escapeAttribute(filters.examineeName)}"
                placeholder="이름 전체 또는 일부를 입력하세요"
              />
            </div>
            <div class="lookup-filter-actions" aria-label="수험표 출력 작업">
              ${renderBatchPrintButton()}
              <button class="outline-button" data-reset-lookup="true" type="button">초기화</button>
            </div>
          </div>
        </article>

        ${renderAdmitCardLookupGridSection()}
      </section>
    `;
  }

  function renderAdmitCardLookupGridSection() {
    return `
      <div id="admitCardLookupResultMount" class="table-view-mount">
        ${renderExamineeResultTable({
          title: "검색 결과",
          gridKey: "admitCardLookupGrid",
          showPrintColumn: true,
          showRowNumber: true,
          checkboxFirst: true,
          showSectionHeader: false,
        })}
      </div>
    `;
  }

  return {
    renderAdmitCardLookup,
    renderAdmitCardLookupGridSection,
    renderExamineeRegistration,
  };
});
