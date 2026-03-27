(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardSystemRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const applicantExamNoComponentOptions = Object.freeze([
    Object.freeze({ key: "", label: "선택 안 함" }),
    Object.freeze({ key: "admissionCode", label: "전형코드" }),
    Object.freeze({ key: "seriesCode", label: "계열코드" }),
    Object.freeze({ key: "unitCode", label: "모집단위코드" }),
    Object.freeze({ key: "nationalityCode", label: "국적코드" }),
    Object.freeze({ key: "sequence", label: "순번" }),
  ]);
  const systemScheduleWeekdayLabels = Object.freeze(["일", "월", "화", "수", "목", "금", "토"]);
  const systemScheduleTargetDefinitions = Object.freeze({
    "applicant-start": Object.freeze({
      key: "applicant-start",
      edge: "start",
      triggerId: "systemSettingsApplicantScheduleStartTrigger",
      inputIdPrefix: "systemSettingsApplicantScheduleStart",
      ariaPrefix: "접수 시작",
      rangeSuffix: "부터",
    }),
    "applicant-end": Object.freeze({
      key: "applicant-end",
      edge: "end",
      triggerId: "systemSettingsApplicantScheduleEndTrigger",
      inputIdPrefix: "systemSettingsApplicantScheduleEnd",
      ariaPrefix: "접수 종료",
      rangeSuffix: "까지",
    }),
    "admit-card-lookup-start": Object.freeze({
      key: "admit-card-lookup-start",
      edge: "start",
      triggerId: "systemSettingsAdmitCardLookupScheduleStartTrigger",
      inputIdPrefix: "systemSettingsAdmitCardLookupScheduleStart",
      ariaPrefix: "수험표 조회 시작",
      rangeSuffix: "부터",
    }),
    "admit-card-lookup-end": Object.freeze({
      key: "admit-card-lookup-end",
      edge: "end",
      triggerId: "systemSettingsAdmitCardLookupScheduleEndTrigger",
      inputIdPrefix: "systemSettingsAdmitCardLookupScheduleEnd",
      ariaPrefix: "수험표 조회 종료",
      rangeSuffix: "까지",
    }),
  });

  function getSystemScheduleTargetDefinition(scheduleTarget = "") {
    const normalizedTarget = String(scheduleTarget || "").trim();
    return systemScheduleTargetDefinitions[normalizedTarget] || systemScheduleTargetDefinitions["applicant-start"];
  }

  function createEmptySystemScheduleParts() {
    return {
      year: "",
      month: "",
      day: "",
      hour: "",
      minute: "",
    };
  }

  function parseSystemScheduleParts(value = "") {
    const normalizedValue = String(value || "").trim();
    const matchedValue = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

    if (!matchedValue) {
      return createEmptySystemScheduleParts();
    }

    const [, yearValue, monthValue, dayValue, hourValue, minuteValue] = matchedValue;

    return {
      year: yearValue,
      month: monthValue,
      day: dayValue,
      hour: hourValue,
      minute: minuteValue,
    };
  }

  function padSystemScheduleValue(value) {
    return String(value || "").padStart(2, "0");
  }

  function getSystemScheduleYearOptions(selectedYear = "") {
    const currentYear = new Date().getFullYear();
    const normalizedSelectedYear = Number(selectedYear || 0);
    let startYear = currentYear - 1;
    let endYear = currentYear + 5;

    if (Number.isInteger(normalizedSelectedYear) && normalizedSelectedYear > 0) {
      startYear = Math.min(startYear, normalizedSelectedYear);
      endYear = Math.max(endYear, normalizedSelectedYear);
    }

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  }

  function getSystemScheduleMinuteOptions(selectedMinute = "") {
    const minuteOptions = new Set(Array.from({ length: 12 }, (_, index) => padSystemScheduleValue(index * 5)));
    const normalizedSelectedMinute = String(selectedMinute || "").trim();

    minuteOptions.add("59");

    if (/^\d{2}$/.test(normalizedSelectedMinute)) {
      minuteOptions.add(normalizedSelectedMinute);
    }

    return Array.from(minuteOptions).sort((leftValue, rightValue) => Number(leftValue) - Number(rightValue));
  }

  function formatSystemSchedulePartsLabel(parts = {}) {
    const normalizedParts = createEmptySystemScheduleParts();
    const sourceParts = parts && typeof parts === "object" ? parts : {};

    normalizedParts.year = String(sourceParts.year || "").trim();
    normalizedParts.month = padSystemScheduleValue(sourceParts.month || "");
    normalizedParts.day = padSystemScheduleValue(sourceParts.day || "");
    normalizedParts.hour = padSystemScheduleValue(sourceParts.hour || "");
    normalizedParts.minute = padSystemScheduleValue(sourceParts.minute || "");

    if (Object.values(normalizedParts).some((value) => !value)) {
      return "";
    }

    return `${normalizedParts.year}.${normalizedParts.month}.${normalizedParts.day} ${normalizedParts.hour}:${normalizedParts.minute}`;
  }

  function renderSystemScheduleTriggerIcon() {
    return `
      <svg class="system-settings-schedule-trigger-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4.5" y="6" width="15" height="13.5" rx="2"></rect>
        <path d="M8 4.5v3"></path>
        <path d="M16 4.5v3"></path>
        <path d="M4.5 9.5h15"></path>
      </svg>
    `;
  }

  function getSystemScheduleCalendarDays(yearValue = "", monthValue = "") {
    const normalizedYear = Number(yearValue);
    const normalizedMonth = Number(monthValue);

    if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
      return [];
    }

    const firstDateOfMonth = new Date(normalizedYear, normalizedMonth - 1, 1);
    const calendarStartDate = new Date(normalizedYear, normalizedMonth - 1, 1 - firstDateOfMonth.getDay());
    const today = new Date();

    return Array.from({ length: 42 }, (_, index) => {
      const currentDate = new Date(calendarStartDate.getFullYear(), calendarStartDate.getMonth(), calendarStartDate.getDate() + index);

      return {
        year: String(currentDate.getFullYear()),
        month: padSystemScheduleValue(currentDate.getMonth() + 1),
        day: padSystemScheduleValue(currentDate.getDate()),
        isCurrentMonth: currentDate.getMonth() === normalizedMonth - 1,
        isToday:
          currentDate.getFullYear() === today.getFullYear() &&
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getDate() === today.getDate(),
      };
    });
  }

  function renderSystemScheduleSelect({
    inputId,
    scheduleTarget,
    schedulePart,
    selectedValue,
    options,
    ariaLabel,
  }) {
    const normalizedSelectedValue = String(selectedValue || "").trim();

    return `
      <label class="system-settings-schedule-select-shell" for="${escapeAttribute(inputId)}">
        <select
          class="system-settings-input system-settings-schedule-select"
          id="${escapeAttribute(inputId)}"
          aria-label="${escapeAttribute(ariaLabel)}"
          data-system-settings-schedule-target="${escapeAttribute(scheduleTarget)}"
          data-system-settings-schedule-part="${escapeAttribute(schedulePart)}"
        >
          ${options
            .map((value) => {
              const normalizedValue = String(value || "").trim();
              return `
                <option value="${escapeAttribute(normalizedValue)}" ${normalizedSelectedValue === normalizedValue ? "selected" : ""}>
                  ${escapeHtml(normalizedValue)}
                </option>
              `;
            })
            .join("")}
        </select>
      </label>
    `;
  }

  function renderSystemSchedulePopover({
    scheduleTarget,
    scheduleParts,
  }) {
    const scheduleTargetDefinition = getSystemScheduleTargetDefinition(scheduleTarget);
    const scheduleTargetLabel = scheduleTargetDefinition.edge === "end" ? "종료" : "시작";
    const scheduleMonthOptions = Array.from({ length: 12 }, (_, index) => padSystemScheduleValue(index + 1));
    const scheduleHourOptions = Array.from({ length: 24 }, (_, index) => padSystemScheduleValue(index));
    const scheduleMinuteOptions = getSystemScheduleMinuteOptions(scheduleParts.minute);
    const scheduleCalendarDays = getSystemScheduleCalendarDays(scheduleParts.year, scheduleParts.month);
    const selectedDateLabel = formatSystemSchedulePartsLabel(scheduleParts);
    const calendarHeadingLabel = `${scheduleParts.year}년 ${Number(scheduleParts.month || "0")}월`;

    return `
      <div class="system-settings-schedule-popover" data-system-settings-schedule-popover="${escapeAttribute(scheduleTargetDefinition.key)}">
        <div class="system-settings-schedule-popover-head">
          <strong class="system-settings-schedule-popover-title">${escapeHtml(`${scheduleTargetLabel} 일시`)}</strong>
          <p class="system-settings-schedule-popover-summary">${escapeHtml(selectedDateLabel)}</p>
        </div>
        <div class="system-settings-schedule-calendar-toolbar">
          <button
            class="system-settings-schedule-nav-button"
            data-system-settings-schedule-nav="prev"
            type="button"
            aria-label="${escapeAttribute(`${scheduleTargetDefinition.ariaPrefix} 일정 이전 달 보기`)}"
          >
            <span aria-hidden="true">&lsaquo;</span>
          </button>
          ${renderSystemScheduleSelect({
            inputId: `${scheduleTargetDefinition.inputIdPrefix}Year`,
            scheduleTarget: scheduleTargetDefinition.key,
            schedulePart: "year",
            selectedValue: scheduleParts.year,
            options: getSystemScheduleYearOptions(scheduleParts.year),
            ariaLabel: `${scheduleTargetDefinition.ariaPrefix} 일정 연도`,
          })}
          ${renderSystemScheduleSelect({
            inputId: `${scheduleTargetDefinition.inputIdPrefix}Month`,
            scheduleTarget: scheduleTargetDefinition.key,
            schedulePart: "month",
            selectedValue: scheduleParts.month,
            options: scheduleMonthOptions,
            ariaLabel: `${scheduleTargetDefinition.ariaPrefix} 일정 월`,
          })}
          <button
            class="system-settings-schedule-nav-button"
            data-system-settings-schedule-nav="next"
            type="button"
            aria-label="${escapeAttribute(`${scheduleTargetDefinition.ariaPrefix} 일정 다음 달 보기`)}"
          >
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
        <div class="system-settings-schedule-calendar" role="group" aria-label="${escapeAttribute(`${scheduleTargetDefinition.ariaPrefix} 일정 날짜 선택`)}">
          <div class="system-settings-schedule-calendar-weekdays">
            ${systemScheduleWeekdayLabels
              .map(
                (weekdayLabel) => `
                  <span class="system-settings-schedule-calendar-weekday">${escapeHtml(weekdayLabel)}</span>
                `,
              )
              .join("")}
          </div>
          <p class="system-settings-schedule-calendar-caption">${escapeHtml(calendarHeadingLabel)}</p>
          <div class="system-settings-schedule-calendar-grid">
            ${scheduleCalendarDays
              .map((calendarDay) => {
                const isSelected =
                  scheduleParts.year === calendarDay.year &&
                  scheduleParts.month === calendarDay.month &&
                  scheduleParts.day === calendarDay.day;

                return `
                  <button
                    class="system-settings-schedule-calendar-day${calendarDay.isCurrentMonth ? "" : " is-outside-month"}${calendarDay.isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}"
                    data-system-settings-schedule-day="true"
                    data-system-settings-schedule-day-target="${escapeAttribute(scheduleTargetDefinition.key)}"
                    data-system-settings-schedule-day-year="${escapeAttribute(calendarDay.year)}"
                    data-system-settings-schedule-day-month="${escapeAttribute(calendarDay.month)}"
                    data-system-settings-schedule-day-value="${escapeAttribute(calendarDay.day)}"
                    type="button"
                    aria-pressed="${isSelected ? "true" : "false"}"
                  >
                    ${escapeHtml(String(Number(calendarDay.day)))}
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
        <div class="system-settings-schedule-time-row">
          <div class="system-settings-schedule-time-field">
            <span class="system-settings-schedule-time-label">시간</span>
            ${renderSystemScheduleSelect({
              inputId: `${scheduleTargetDefinition.inputIdPrefix}Hour`,
              scheduleTarget: scheduleTargetDefinition.key,
              schedulePart: "hour",
              selectedValue: scheduleParts.hour,
              options: scheduleHourOptions,
              ariaLabel: `${scheduleTargetDefinition.ariaPrefix} 일정 시`,
            })}
          </div>
          <div class="system-settings-schedule-time-field">
            <span class="system-settings-schedule-time-label">분</span>
            ${renderSystemScheduleSelect({
              inputId: `${scheduleTargetDefinition.inputIdPrefix}Minute`,
              scheduleTarget: scheduleTargetDefinition.key,
              schedulePart: "minute",
              selectedValue: scheduleParts.minute,
              options: scheduleMinuteOptions,
              ariaLabel: `${scheduleTargetDefinition.ariaPrefix} 일정 분`,
            })}
          </div>
        </div>
      </div>
    `;
  }

  function renderSystemScheduleField({
    title,
    helpText,
    startTarget,
    endTarget,
    startParts,
    endParts,
    activePopoverTarget,
  }) {
    const startTargetDefinition = getSystemScheduleTargetDefinition(startTarget);
    const endTargetDefinition = getSystemScheduleTargetDefinition(endTarget);
    const isStartPopoverOpen = activePopoverTarget === startTargetDefinition.key;
    const isEndPopoverOpen = activePopoverTarget === endTargetDefinition.key;

    return `
      <div class="field system-settings-field system-settings-schedule-field">
        <div class="system-settings-row">
          <label class="system-settings-label" for="${escapeAttribute(startTargetDefinition.triggerId)}">${escapeHtml(title)}</label>
          <div class="system-settings-control-wrap">
          <div class="system-settings-schedule-range">
            <div class="system-settings-schedule-item" data-system-settings-schedule-popover-root="${escapeAttribute(startTargetDefinition.key)}">
              <button
                class="outline-button system-settings-schedule-trigger${isStartPopoverOpen ? " is-active" : ""}"
                id="${escapeAttribute(startTargetDefinition.triggerId)}"
                data-system-settings-schedule-trigger="${escapeAttribute(startTargetDefinition.key)}"
                type="button"
                aria-expanded="${isStartPopoverOpen ? "true" : "false"}"
              >
                ${renderSystemScheduleTriggerIcon()}
                <strong class="system-settings-schedule-trigger-value">${escapeHtml(formatSystemSchedulePartsLabel(startParts))}</strong>
              </button>
              <span class="system-settings-schedule-suffix">${escapeHtml(startTargetDefinition.rangeSuffix)}</span>
              ${isStartPopoverOpen
                ? renderSystemSchedulePopover({
                    scheduleTarget: startTargetDefinition.key,
                    scheduleParts: startParts,
                  })
                : ""}
            </div>
            <div class="system-settings-schedule-item" data-system-settings-schedule-popover-root="${escapeAttribute(endTargetDefinition.key)}">
              <button
                class="outline-button system-settings-schedule-trigger${isEndPopoverOpen ? " is-active" : ""}"
                id="${escapeAttribute(endTargetDefinition.triggerId)}"
                data-system-settings-schedule-trigger="${escapeAttribute(endTargetDefinition.key)}"
                type="button"
                aria-expanded="${isEndPopoverOpen ? "true" : "false"}"
              >
                ${renderSystemScheduleTriggerIcon()}
                <strong class="system-settings-schedule-trigger-value">${escapeHtml(formatSystemSchedulePartsLabel(endParts))}</strong>
              </button>
              <span class="system-settings-schedule-suffix">${escapeHtml(endTargetDefinition.rangeSuffix)}</span>
              ${isEndPopoverOpen
                ? renderSystemSchedulePopover({
                    scheduleTarget: endTargetDefinition.key,
                    scheduleParts: endParts,
                  })
                : ""}
            </div>
          </div>
        </div>
        </div>
        <small class="muted system-settings-help">${escapeHtml(helpText)}</small>
      </div>
    `;
  }

  function renderSystemAdmitCardDataSourceField(selectedValue = "examinee") {
    const normalizedSelectedValue = ["submission", "examinee"].includes(String(selectedValue || "").trim())
      ? String(selectedValue || "").trim()
      : "examinee";
    const options = [
      { value: "submission", label: "접수 데이터 기준" },
      { value: "examinee", label: "수험생 등록 데이터 기준" },
    ];

    return `
      <div class="field system-settings-field">
        <div class="system-settings-row">
          <label class="system-settings-label" for="systemSettingsAdmitCardDataSourceSubmission">수험표 생성 데이터</label>
          <div class="system-settings-control-wrap system-settings-radio-control-wrap">
            <div class="system-settings-radio-group" role="radiogroup" aria-label="수험표 생성 데이터">
              ${options
                .map(
                  (option) => `
                    <label class="system-settings-radio-card">
                      <input
                        class="system-settings-radio-input"
                        type="radio"
                        name="systemSettingsAdmitCardDataSource"
                        id="${escapeAttribute(option.value === "submission" ? "systemSettingsAdmitCardDataSourceSubmission" : "systemSettingsAdmitCardDataSourceExaminee")}"
                        value="${escapeAttribute(option.value)}"
                        data-system-settings-admit-card-data-source="${escapeAttribute(option.value)}"
                        ${normalizedSelectedValue === option.value ? "checked" : ""}
                      />
                      <span class="system-settings-radio-label">${escapeHtml(option.label)}</span>
                    </label>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
        <small class="muted system-settings-help">수험표 조회 PDF를 생성할 때 사용할 데이터 기준을 선택합니다.</small>
      </div>
    `;
  }

  function getSystemDataDeleteItems() {
    return [
      {
        scope: "all",
        title: "전체 데이터",
        description: "수험생 데이터, 사진 데이터, 접수 설정 데이터, 수험표 출력 이력, 접수 이력 데이터를 모두 삭제합니다.",
        buttonLabel: "삭제",
      },
      {
        scope: "applicant-settings",
        title: "접수 설정 데이터",
        description: "전형, 계열, 모집단위, 전공 코드로 구성된 접수 설정 데이터만 삭제합니다.",
        buttonLabel: "삭제",
      },
      {
        scope: "applicant-history",
        title: "접수 이력 데이터",
        description: "수험생 접수 이력만 삭제하며 수험생 등록 데이터와 출력 이력은 유지합니다.",
        buttonLabel: "삭제",
      },
      {
        scope: "examinees",
        title: "수험생 데이터",
        description: "수험생 데이터와 사진 파일을 삭제합니다.",
        buttonLabel: "삭제",
      },
      {
        scope: "photos",
        title: "사진 데이터",
        description: "업로드된 사진 파일과 사진 데이터를 삭제하고 수험생 기본 정보는 유지합니다.",
        buttonLabel: "삭제",
      },
      {
        scope: "print-history",
        title: "수험표 출력 이력",
        description: "발급 이력만 삭제하며 수험생 데이터와 사진 데이터는 유지합니다.",
        buttonLabel: "삭제",
      },
    ];
  }

  function renderSystemDataDeletion() {
    const isSaving = state.systemSettings.isSaving;
    const isDeletingSystemData = state.systemDataDeletion.isDeleting;
    const deleteStatusClass = state.systemDataDeletion.statusType === "warning" ? " warning" : "";
    const dataDeleteItems = getSystemDataDeleteItems();

    return `
      <section class="view-stack system-settings-view">
        <article class="form-card">
          <div class="section-header">
            <div>
              <h3>데이터 삭제</h3>
              <p>운영 데이터를 범위별로 삭제합니다. 삭제된 데이터는 복구할 수 없습니다.</p>
            </div>
          </div>

          <div class="system-settings-form system-data-delete-form">
            ${dataDeleteItems
              .map((item) => {
                const isDeletingCurrentItem = isDeletingSystemData && state.systemDataDeletion.activeScope === item.scope;

                return `
                  <div class="field system-settings-field">
                    <div class="system-settings-row">
                      <span class="system-settings-label">${item.title}</span>
                      <div class="system-settings-control-wrap">
                        <button
                          class="outline-button danger-button system-data-delete-button"
                          data-system-data-delete="${item.scope}"
                          type="button"
                          ${isSaving || isDeletingSystemData ? "disabled" : ""}
                        >
                          <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4.5 7.5h15"></path>
                            <path d="M9.5 7.5V5.75a1.25 1.25 0 0 1 1.25-1.25h2.5a1.25 1.25 0 0 1 1.25 1.25V7.5"></path>
                            <path d="M7.5 7.5v11a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-11"></path>
                            <path d="M10 11v5.5"></path>
                            <path d="M14 11v5.5"></path>
                          </svg>
                          <span>${escapeHtml(isDeletingCurrentItem ? "삭제 중..." : item.buttonLabel)}</span>
                        </button>
                      </div>
                    </div>
                    <small class="muted system-settings-help">${item.description}</small>
                  </div>
                `;
              })
              .join("")}
          </div>

          <p class="system-data-delete-status${deleteStatusClass}${state.systemDataDeletion.statusMessage ? "" : " hidden"}" id="systemDataDeletionStatus">
            ${escapeHtml(state.systemDataDeletion.statusMessage)}
          </p>
        </article>
      </section>
    `;
  }

  function getApplicantPreviewHomeActionIconMarkup(iconKey = "") {
    if (iconKey === "apply") {
      return `
        <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2"></rect>
          <path d="M9 4h6"></path>
          <path d="M9 9h6"></path>
          <path d="M12 12v5"></path>
          <path d="M9.5 14.5h5"></path>
        </svg>
      `;
    }

    if (iconKey === "summary") {
      return `
        <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="4" width="14" height="16" rx="2"></rect>
          <path d="M9 9h6"></path>
          <path d="M9 13h3"></path>
          <path d="m10 16 1.8 1.8 3.2-3.3"></path>
        </svg>
      `;
    }

    return `
      <svg class="button-icon applicant-public-home-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 9a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 0 6.5 17h11a1.5 1.5 0 0 0 1.5-1.5V13a2 2 0 0 0 0-4V8.5A1.5 1.5 0 0 0 17.5 7h-11A1.5 1.5 0 0 0 5 8.5z"></path>
        <path d="M12 7v10"></path>
        <path d="M9 10h6"></path>
      </svg>
    `;
  }

  function renderApplicantPreviewHomeActionButtonLabel(label = "", iconKey = "") {
    return `${getApplicantPreviewHomeActionIconMarkup(iconKey)}<span>${escapeHtml(label)}</span>`;
  }

  function getAuthRenderers() {
    return globalThis.AdmitCardAuthRenderers || {};
  }

  function getActiveNoticeScope() {
    return state.noticeManagement?.activeScope === "applicant" ? "applicant" : "login";
  }

  function getActiveNoticeScopeLabel() {
    return getActiveNoticeScope() === "applicant" ? "접수화면" : "로그인화면";
  }

  function renderLoginNoticeEditorToolbar(defaultFontFamily, defaultFontSize) {
    return renderEditorToolbar({
      toolbarClassName: "login-notice-editor-toolbar",
      ariaLabel: "공지사항 편집 도구",
      commandAttr: "data-notice-command",
      commandSelectAttr: "data-notice-command",
      tableActionAttr: "data-notice-table-action",
      insertAttr: "data-notice-insert",
      openImageAttr: "data-notice-open-image",
      fontFamilyId: "loginNoticeFontFamily",
      fontFamilyValue: defaultFontFamily,
      fontSizeId: "loginNoticeFontSize",
      fontSizeValue: defaultFontSize,
      textColorId: "loginNoticeTextColor",
      textColorValue: typeof EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR === "string" ? EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR : "#152033",
      textShadingId: "loginNoticeTextShading",
      cellShadingId: "loginNoticeCellShading",
      tableInsertPanelId: "loginNoticeTableInsertPanel",
      tableRowsId: "loginNoticeTableRows",
      tableColumnsId: "loginNoticeTableColumns",
      cellSplitPanelId: "loginNoticeCellSplitPanel",
      cellSplitCountId: "loginNoticeCellSplitCount",
      cellSplitAxisName: "loginNoticeCellSplitAxis",
      cellSplitAxisRowId: "loginNoticeCellSplitAxisRow",
      cellSplitAxisColumnId: "loginNoticeCellSplitAxisColumn",
      imageInputId: "loginNoticeImageInput",
    });
  }

  function renderLoginNoticeSettings() {
    const defaultFontFamily = getLoginNoticeDefaultFontFamily();
    const defaultFontSize = getLoginNoticeDefaultFontSize();
    const { getLoginNoticeMarkup, renderLoginStage } = getAuthRenderers();
    const activeScope = getActiveNoticeScope();
    const noticeTabs = [
      { key: "login", label: "로그인화면" },
      { key: "applicant", label: "접수화면" },
    ];
    const renderApplicantNoticePreview = () => `
      <section class="login-shell login-notice-editor-stage applicant-notice-editor-stage">
        <article class="applicant-public-hero login-hero-card login-notice-card">
          <div class="login-notice-head">
            <p class="page-kicker">Applicant Notice</p>
            <h2>공지사항</h2>
          </div>
          <div
            id="loginNoticeEditor"
            class="login-notice-content template-editor-surface login-notice-editor-surface applicant-public-notice-surface"
            contenteditable="true"
            spellcheck="false"
          >${String(state.loginNotice?.draftHtml || "").trim() || getLoginNoticeMarkup("", "공지사항을 입력하세요.")}</div>
        </article>

        <article class="applicant-public-panel applicant-public-action-grid login-panel-card login-stage-panel applicant-notice-stage-panel">
          <div class="applicant-public-action-header">
            <div class="applicant-public-brand login-stage-brand">
              <img
                class="applicant-public-brand-mark"
                src="/client/assets/login-stage-brand-mark.png"
                alt=""
                width="68"
                height="68"
              />
              <div class="applicant-public-brand-copy login-stage-brand-copy">
                <span>Admit Card System</span>
                <strong>수험생 접수</strong>
              </div>
            </div>
          </div>
          <div class="applicant-public-action-stack applicant-public-home-actions">
            <button class="primary-button" type="button" disabled>${renderApplicantPreviewHomeActionButtonLabel("접수하기", "apply")}</button>
            <button class="ghost-button" type="button" disabled>${renderApplicantPreviewHomeActionButtonLabel("접수결과 조회", "summary")}</button>
            <button class="ghost-button" type="button" disabled>${renderApplicantPreviewHomeActionButtonLabel("수험표 조회", "ticket")}</button>
          </div>
        </article>
        <p class="login-shell-copyright">COPYRIGHT(c) 2026 BY U-PLUS SYSTEM. ALL RIGHTS RESERVED.</p>
      </section>
    `;
    const previewMarkup =
      activeScope === "applicant"
        ? renderApplicantNoticePreview()
        : renderLoginStage({
            noticeHtml: state.loginNotice.draftHtml,
            heading: "로그인",
            description: "계정 관리에 등록된 계정 ID와 비밀번호로 로그인합니다.",
            submitLabel: "로그인",
            accountIdValue: "",
            passwordValue: "",
            shellClassName: "login-notice-editor-stage",
            panelClassName: "login-notice-stage-panel",
            noticeContentClassName: "template-editor-surface login-notice-editor-surface",
            noticeContentId: "loginNoticeEditor",
            noticeContentAttributes: 'contenteditable="true" spellcheck="false"',
            useEditorMarkup: true,
          });

    return `
      <section class="view-stack login-notice-settings-stack">
        <article class="form-card">
          <div class="section-header">
            <div>
              <h3>공지사항 설정</h3>
              <p>로그인화면과 접수화면의 공지사항을 관리합니다.</p>
            </div>
          </div>
          <div class="template-management-tabs notice-settings-tabs" role="tablist" aria-label="공지사항 화면 선택">
            ${noticeTabs
              .map(
                (tab) => `
                  <button
                    class="template-management-tab ${activeScope === tab.key ? "active" : ""}"
                    data-notice-scope="${escapeAttribute(tab.key)}"
                    type="button"
                    role="tab"
                    aria-selected="${activeScope === tab.key ? "true" : "false"}"
                  >
                    ${escapeHtml(tab.label)}
                  </button>
                `,
              )
              .join("")}
          </div>
          <div class="login-notice-editor-shell">
            <div class="editor-toolbar-column login-notice-editor-toolbar-column">
              ${renderLoginNoticeEditorToolbar(defaultFontFamily, defaultFontSize)}
              <div class="editor-toolbar-footer login-notice-editor-toolbar-footer">
                <div class="toolbar-actions">
                  <button class="primary-button" data-notice-action="save" type="button">저장</button>
                </div>
              </div>
            </div>

            <div class="login-notice-editor-page">
              ${previewMarkup}
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderSystemSettings() {
    const isSaving = state.systemSettings.isSaving;
    const statusClass = state.systemSettings.statusType === "warning" ? " warning" : "";
    const isDeletingSystemData = state.systemDataDeletion.isDeleting;
    const applicantExamNoComponents = Array.isArray(state.systemSettings.applicantExamNoComponents)
      ? state.systemSettings.applicantExamNoComponents
      : ["admissionCode", "seriesCode", "unitCode", "sequence", ""];
    const applicantScheduleStartParts =
      state.systemSettings.applicantScheduleStartAtParts && typeof state.systemSettings.applicantScheduleStartAtParts === "object"
        ? state.systemSettings.applicantScheduleStartAtParts
        : parseSystemScheduleParts(state.systemSettings.applicantScheduleStartAt);
    const applicantScheduleEndParts =
      state.systemSettings.applicantScheduleEndAtParts && typeof state.systemSettings.applicantScheduleEndAtParts === "object"
        ? state.systemSettings.applicantScheduleEndAtParts
        : parseSystemScheduleParts(state.systemSettings.applicantScheduleEndAt);
    const admitCardLookupScheduleStartParts =
      state.systemSettings.admitCardLookupScheduleStartAtParts && typeof state.systemSettings.admitCardLookupScheduleStartAtParts === "object"
        ? state.systemSettings.admitCardLookupScheduleStartAtParts
        : parseSystemScheduleParts(state.systemSettings.admitCardLookupScheduleStartAt);
    const admitCardLookupScheduleEndParts =
      state.systemSettings.admitCardLookupScheduleEndAtParts && typeof state.systemSettings.admitCardLookupScheduleEndAtParts === "object"
        ? state.systemSettings.admitCardLookupScheduleEndAtParts
        : parseSystemScheduleParts(state.systemSettings.admitCardLookupScheduleEndAt);
    const activeSchedulePopoverTarget = String(state.systemSettings.applicantSchedulePopoverTarget || "").trim();
    const admitCardDataSource = ["submission", "examinee"].includes(String(state.systemSettings.admitCardDataSource || "").trim())
      ? String(state.systemSettings.admitCardDataSource || "").trim()
      : "examinee";

    return `
      <section class="view-stack system-settings-view">
        <article class="form-card">
          <div class="section-header">
            <div>
              <h3>시스템 설정</h3>
              <p>초기 비밀번호, 자동 로그아웃 시간, 입학처 홈페이지 링크, 접수 기간, 수험표 조회 기간, 수험번호 자동 생성 규칙을 설정합니다.</p>
            </div>
            <div class="inline-actions">
              <button class="primary-button" data-system-settings-action="save" type="button" ${isSaving || isDeletingSystemData ? "disabled" : ""}>
                ${isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>

          <div class="system-settings-form">
            <div class="field system-settings-field">
              <div class="system-settings-row">
                <label class="system-settings-label" for="systemSettingsInitialPassword">초기 비밀번호</label>
                <div class="system-settings-control-wrap">
                  <input
                    class="system-settings-input"
                    id="systemSettingsInitialPassword"
                    type="text"
                    maxlength="100"
                    value="${escapeAttribute(getSystemInitialPassword())}"
                    autocomplete="off"
                  />
                </div>
              </div>
              <small class="muted system-settings-help">새 계정 등록과 비밀번호 초기화에 동일하게 적용됩니다.</small>
            </div>

            <div class="field system-settings-field">
              <div class="system-settings-row">
                <label class="system-settings-label" for="systemSettingsAutoLogoutMinutes">자동 로그아웃 시간(분)</label>
                <div class="system-settings-control-wrap">
                  <input
                    class="system-settings-input system-settings-number-input"
                    id="systemSettingsAutoLogoutMinutes"
                    type="number"
                    min="0"
                    max="${MAX_SYSTEM_AUTO_LOGOUT_MINUTES}"
                    step="1"
                    value="${escapeAttribute(String(state.systemSettings.autoLogoutMinutes))}"
                  />
                </div>
              </div>
              <small class="muted system-settings-help">0분으로 저장하면 자동 로그아웃을 사용하지 않습니다.</small>
            </div>

            <div class="field system-settings-field">
              <div class="system-settings-row">
                <label class="system-settings-label" for="systemSettingsAdmissionHomepageUrl">입학처 홈페이지 링크</label>
                <div class="system-settings-control-wrap">
                  <input
                    class="system-settings-input"
                    id="systemSettingsAdmissionHomepageUrl"
                    type="url"
                    maxlength="500"
                    value="${escapeAttribute(String(state.systemSettings.admissionHomepageUrl || ""))}"
                    placeholder="https://admission.example.ac.kr"
                    autocomplete="off"
                  />
                </div>
              </div>
              <small class="muted system-settings-help">수험생 접수 페이지의 입학처 홈페이지 버튼의 링크를 설정합니다.</small>
            </div>

            ${renderSystemScheduleField({
              title: "접수 기간",
              helpText: "설정한 기간에만 수험생 접수 페이지의 접수하기 버튼이 활성화됩니다. 시작과 종료 일시는 항상 설정되어야 합니다.",
              startTarget: "applicant-start",
              endTarget: "applicant-end",
              startParts: applicantScheduleStartParts,
              endParts: applicantScheduleEndParts,
              activePopoverTarget: activeSchedulePopoverTarget,
            })}

            ${renderSystemScheduleField({
              title: "수험표 조회 기간",
              helpText: "설정한 기간에만 수험표 조회가 가능합니다. 시작과 종료 일시는 항상 설정되어야 합니다.",
              startTarget: "admit-card-lookup-start",
              endTarget: "admit-card-lookup-end",
              startParts: admitCardLookupScheduleStartParts,
              endParts: admitCardLookupScheduleEndParts,
              activePopoverTarget: activeSchedulePopoverTarget,
            })}

            ${renderSystemAdmitCardDataSourceField(admitCardDataSource)}

            <div class="field system-settings-field system-settings-exam-no-field">
              <div class="system-settings-column">
                <div class="system-settings-section-head">
                  <span class="system-settings-label">수험번호 자동 생성</span>
                  <small class="muted system-settings-help">자리수를 먼저 정하고, 최대 5개의 코드/순번을 조합해 자동 생성 순서를 구성합니다.</small>
                </div>
                <div class="system-settings-exam-no-grid">
                  <label class="field system-settings-exam-no-digits" for="systemSettingsApplicantExamNoDigitCount">
                    <span>수험번호 자리수</span>
                    <input
                      class="system-settings-input system-settings-number-input"
                      id="systemSettingsApplicantExamNoDigitCount"
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      value="${escapeAttribute(String(state.systemSettings.applicantExamNoDigitCount || 10))}"
                    />
                  </label>
                  <div class="system-settings-exam-no-components">
                    ${Array.from({ length: 5 }, (_, index) => {
                      const selectedValue = String(applicantExamNoComponents[index] || "");

                      return `
                        <label class="field system-settings-exam-no-component-field" for="systemSettingsApplicantExamNoComponent${index + 1}">
                          <span>조합${index + 1}</span>
                          <select
                            class="system-settings-input"
                            id="systemSettingsApplicantExamNoComponent${index + 1}"
                            data-system-settings-exam-component-index="${index}"
                          >
                            ${applicantExamNoComponentOptions
                              .map(
                                (option) => `
                                  <option value="${escapeAttribute(option.key)}" ${selectedValue === option.key ? "selected" : ""}>
                                    ${escapeHtml(option.label)}
                                  </option>
                                `,
                              )
                              .join("")}
                          </select>
                        </label>
                      `;
                    }).join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p class="system-settings-status${statusClass}${state.systemSettings.statusMessage ? "" : " hidden"}" id="systemSettingsStatus">
            ${escapeHtml(state.systemSettings.statusMessage)}
          </p>
        </article>
      </section>
    `;
  }

  return {
    renderLoginNoticeEditorToolbar,
    renderLoginNoticeSettings,
    renderSystemDataDeletion,
    renderSystemSettings,
  };
});
