(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardDashboardRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createDashboardRenderer(deps) {
    const {
      escapeHtml,
      getCurrentUserRole,
      getExamineeGridRows,
      getHeaderFilteredRows,
      getPrintHistoryRows,
      state,
    } = deps;

    function formatDashboardCount(value, suffix = "") {
      const normalizedValue = Number(value || 0);
      return `${normalizedValue.toLocaleString("ko-KR")}${suffix}`;
    }

    function buildDashboardGroupedItems(rows, getLabel) {
      const groupedItems = new Map();

      rows.forEach((row) => {
        const label = String(getLabel(row) || "미분류").trim() || "미분류";
        groupedItems.set(label, (groupedItems.get(label) || 0) + 1);
      });

      return Array.from(groupedItems.entries())
        .map(([label, count]) => ({
          label,
          count,
        }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
        .slice(0, 6);
    }

    function getDashboardData() {
      const filteredExamineeRows = getHeaderFilteredRows(getExamineeGridRows());
      const filteredPrintHistoryRows = getHeaderFilteredRows(getPrintHistoryRows());
      const printedExamineeNos = new Set(filteredPrintHistoryRows.map((row) => row.examineeNo));
      const filteredExamineeCount = filteredExamineeRows.length;
      const photoRegisteredCount = filteredExamineeRows.filter((row) => row.hasPhoto).length;
      const missingPhotoCount = Math.max(0, filteredExamineeCount - photoRegisteredCount);
      const pendingPrintCount = filteredExamineeRows.filter((row) => !printedExamineeNos.has(row.examineeNo)).length;
      const photoRegisteredRate =
        filteredExamineeCount > 0 ? Math.round((photoRegisteredCount / filteredExamineeCount) * 100) : 0;
      const activeTemplate = state.templateCards.find((card) => card.status === "used") || null;
      const printedExamineeCount = printedExamineeNos.size;

      return {
        currentRole: getCurrentUserRole(),
        hasHeaderFilters: Object.values(state.headerFilters).some(Boolean),
        filteredExamineeCount,
        filteredPrintCount: filteredPrintHistoryRows.length,
        printedExamineeCount,
        photoRegisteredCount,
        missingPhotoCount,
        pendingPrintCount,
        photoRegisteredRate,
        activeTemplateName: activeTemplate?.name || "미설정",
        usedTemplateCount: state.templateCards.filter((card) => card.status === "used").length,
        totalTemplateCount: state.templateCards.length,
        todayPrintCount: state.metrics.todayPrints,
        totalPrintCount: state.metrics.totalPrints,
        sessionDistribution: buildDashboardGroupedItems(
          filteredExamineeRows,
          (row) => [row.date, row.time].filter(Boolean).join(" · "),
        ),
        trackDistribution: buildDashboardGroupedItems(
          filteredExamineeRows,
          (row) => [row.track, row.admission].filter(Boolean).join(" · "),
        ),
      };
    }

    function renderDashboardHeroTags(dashboardData) {
      const { currentRole, activeTemplateName, hasHeaderFilters } = dashboardData;
      const filterSummary = hasHeaderFilters
        ? [
            state.headerFilters.track || "모집시기 전체",
            state.headerFilters.admission || "전형 전체",
            state.headerFilters.series || "계열 전체",
            state.headerFilters.date || "시험일자 전체",
            state.headerFilters.time || "시간 전체",
          ].join(" / ")
        : "상단 필터 미적용";

      return [
        `<span class="hero-tag">${escapeHtml(currentRole || "운영")} 권한</span>`,
        `<span class="hero-tag">${escapeHtml(filterSummary)}</span>`,
        `<span class="hero-tag">사용 양식 ${escapeHtml(activeTemplateName)}</span>`,
      ].join("");
    }

    function renderDashboardMetricCards(dashboardData) {
      const {
        filteredExamineeCount,
        photoRegisteredRate,
        photoRegisteredCount,
        missingPhotoCount,
        todayPrintCount,
        totalPrintCount,
      } = dashboardData;

      return `
        <article class="metric-card">
          <p>필터 기준 수험생</p>
          <strong>${formatDashboardCount(filteredExamineeCount, "명")}</strong>
          <span class="metric-meta">전체 ${formatDashboardCount(state.metrics.registeredExaminees, "명")} 중 집계</span>
        </article>
        <article class="metric-card">
          <p>사진 등록률</p>
          <strong>${formatDashboardCount(photoRegisteredRate, "%")}</strong>
          <span class="metric-meta">등록 ${formatDashboardCount(photoRegisteredCount, "명")} · 미등록 ${formatDashboardCount(
            missingPhotoCount,
            "명",
          )}</span>
        </article>
        <article class="metric-card">
          <p>오늘 출력</p>
          <strong>${formatDashboardCount(todayPrintCount, "건")}</strong>
          <span class="metric-meta">오늘 생성된 출력 이력 기준</span>
        </article>
        <article class="metric-card">
          <p>누적 출력</p>
          <strong>${formatDashboardCount(totalPrintCount, "건")}</strong>
          <span class="metric-meta">전체 발급 이력 누적 집계</span>
        </article>
      `;
    }

    function renderDashboardBarChart(items, fillClass = "blue", valueSuffix = "명") {
      if (items.length === 0) {
        return `
          <div class="dashboard-chart-empty">
            <strong>집계할 데이터가 없습니다.</strong>
            <span>상단 필터를 조정하거나 데이터를 업로드하면 차트가 표시됩니다.</span>
          </div>
        `;
      }

      const maxValue = Math.max(...items.map((item) => item.count), 1);

      return items
        .map((row) => {
          const widthPercent = Math.max(12, Math.round((row.count / maxValue) * 100));

          return `
            <div class="dashboard-bar-item">
              <div class="dashboard-bar-head">
                <strong>${escapeHtml(row.label)}</strong>
                <span>${escapeHtml(formatDashboardCount(row.count, valueSuffix))}</span>
              </div>
              <div class="dashboard-bar-track">
                <span class="dashboard-bar-fill ${fillClass}" style="width: ${widthPercent}%"></span>
              </div>
            </div>
          `;
        })
        .join("");
    }

    function renderDashboardStatusChart(dashboardData) {
      const {
        filteredExamineeCount,
        photoRegisteredCount,
        printedExamineeCount,
        pendingPrintCount,
        totalTemplateCount,
        usedTemplateCount,
        activeTemplateName,
      } = dashboardData;

      if (filteredExamineeCount === 0) {
        return `
          <div class="dashboard-chart-empty">
            <strong>운영 상태를 집계할 데이터가 없습니다.</strong>
            <span>수험생 데이터가 들어오면 사진 등록, 출력 완료, 출력 대기 비율이 표시됩니다.</span>
          </div>
        `;
      }

      const statusItems = [
        {
          label: "사진 등록",
          count: photoRegisteredCount,
          percent: Math.round((photoRegisteredCount / filteredExamineeCount) * 100),
          className: "blue",
        },
        {
          label: "출력 완료",
          count: printedExamineeCount,
          percent: Math.round((printedExamineeCount / filteredExamineeCount) * 100),
          className: "green",
        },
        {
          label: "출력 대기",
          count: pendingPrintCount,
          percent: Math.round((pendingPrintCount / filteredExamineeCount) * 100),
          className: "orange",
        },
      ];

      return `
        <div class="dashboard-bar-list">
          ${statusItems
            .map(
              (item) => `
                <div class="dashboard-bar-item">
                  <div class="dashboard-bar-head">
                    <strong>${escapeHtml(item.label)}</strong>
                    <span>${escapeHtml(`${formatDashboardCount(item.count, "명")} · ${formatDashboardCount(item.percent, "%")}`)}</span>
                  </div>
                  <div class="dashboard-bar-track">
                    <span class="dashboard-bar-fill ${item.className}" style="width: ${Math.max(item.percent, 12)}%"></span>
                  </div>
                </div>`,
            )
            .join("")}
        </div>
        <p class="muted">사용 중 양식 ${escapeHtml(activeTemplateName)} · 전체 양식 ${formatDashboardCount(
          totalTemplateCount,
          "개",
        )} 중 ${formatDashboardCount(usedTemplateCount, "개")} 활성</p>
      `;
    }

    function renderDashboard() {
      const dashboardData = getDashboardData();
      const scopeLabel = dashboardData.hasHeaderFilters ? "현재 필터" : "전체 운영";
      const heroTitle =
        dashboardData.filteredExamineeCount > 0
          ? `${scopeLabel} 기준 통계를 한눈에 확인합니다.`
          : `${scopeLabel} 기준으로 표시할 수험생 데이터가 없습니다.`;
      const heroDescription =
        dashboardData.filteredExamineeCount > 0
          ? `수험생 ${formatDashboardCount(dashboardData.filteredExamineeCount, "명")}을 기준으로 사진 등록, 출력 현황, 분포 차트를 간결하게 요약했습니다.`
          : "상단 필터를 조정하거나 수험생 데이터를 업로드하면 운영 현황이 이 화면에 집계됩니다.";

      return `
        <section class="view-stack">
          <article class="hero-card">
            <p class="page-kicker">Dashboard</p>
            <h3>${escapeHtml(heroTitle)}</h3>
            <p>${escapeHtml(heroDescription)}</p>
            <div class="hero-tags">
              ${renderDashboardHeroTags(dashboardData)}
            </div>
          </article>

          <section class="metric-grid">
            ${renderDashboardMetricCards(dashboardData)}
          </section>

          <section class="dashboard-chart-grid">
            <article class="panel-card dashboard-chart-card">
              <div class="section-header">
                <div>
                  <h3>시험일자/시간 분포</h3>
                  <p>현재 필터 기준 수험생이 많이 몰린 시험 일정을 표시합니다.</p>
                </div>
              </div>
              <div class="dashboard-bar-list">
                ${renderDashboardBarChart(dashboardData.sessionDistribution, "blue", "명")}
              </div>
            </article>

            <article class="panel-card dashboard-chart-card">
              <div class="section-header">
                <div>
                  <h3>모집시기/전형 분포</h3>
                  <p>모집시기와 전형 조합별 수험생 분포 상위 항목을 집계합니다.</p>
                </div>
              </div>
              <div class="dashboard-bar-list">
                ${renderDashboardBarChart(dashboardData.trackDistribution, "green", "명")}
              </div>
            </article>

            <article class="panel-card dashboard-chart-card dashboard-chart-card-wide">
              <div class="section-header">
                <div>
                  <h3>운영 상태 비율</h3>
                  <p>사진 등록, 출력 완료, 출력 대기 상태를 비율 중심으로 요약합니다.</p>
                </div>
              </div>
              ${renderDashboardStatusChart(dashboardData)}
            </article>
          </section>
        </section>
      `;
    }

    return Object.freeze({
      renderDashboard,
    });
  }

  return Object.freeze({
    createDashboardRenderer,
  });
});
