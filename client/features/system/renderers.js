(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardSystemRenderers = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function getAuthRenderers() {
    return globalThis.AdmitCardAuthRenderers || {};
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
    const { renderLoginStage } = getAuthRenderers();

    return `
      <section class="view-stack login-notice-settings-stack">
        <article class="form-card">
          <div class="section-header">
            <div>
              <h3>공지사항(로그인화면)</h3>
            </div>
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
              ${renderLoginStage({
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
              })}
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
    const dataDeletionStatusClass = state.systemDataDeletion.statusType === "warning" ? " warning" : "";
    const dataDeleteItems = [
      {
        scope: "all",
        title: "전체 데이터",
        description: "수험생 데이터, 사진 데이터, 수험표 출력 이력을 모두 삭제합니다.",
        buttonLabel: "전체 데이터 삭제",
      },
      {
        scope: "photos",
        title: "사진 데이터",
        description: "업로드된 사진 파일과 사진 데이터를 삭제하고 수험생 기본 정보는 유지합니다.",
        buttonLabel: "사진 데이터 삭제",
      },
      {
        scope: "print-history",
        title: "수험표 출력 이력",
        description: "발급 이력만 삭제하며 수험생 데이터와 사진 데이터는 유지합니다.",
        buttonLabel: "출력 이력 삭제",
      },
    ];

    return `
      <section class="view-stack">
        <article class="form-card">
          <div class="section-header">
            <div>
              <h3>시스템 설정</h3>
              <p>초기 비밀번호와 자동 로그아웃 시간을 설정합니다.</p>
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
                  <div class="system-settings-control system-settings-number-control">
                    <input
                      class="system-settings-input system-settings-number-input"
                      id="systemSettingsAutoLogoutMinutes"
                      type="number"
                      min="0"
                      max="${MAX_SYSTEM_AUTO_LOGOUT_MINUTES}"
                      step="1"
                      value="${escapeAttribute(String(state.systemSettings.autoLogoutMinutes))}"
                    />
                    <div class="system-settings-stepper">
                      <button class="system-settings-stepper-button" data-system-settings-step="up" type="button" aria-label="자동 로그아웃 시간 증가" title="증가">
                        <span aria-hidden="true">▲</span>
                      </button>
                      <button class="system-settings-stepper-button" data-system-settings-step="down" type="button" aria-label="자동 로그아웃 시간 감소" title="감소">
                        <span aria-hidden="true">▼</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <small class="muted system-settings-help">0분으로 저장하면 자동 로그아웃을 사용하지 않습니다.</small>
            </div>
          </div>

          <p class="system-settings-status${statusClass}${state.systemSettings.statusMessage ? "" : " hidden"}" id="systemSettingsStatus">
            ${escapeHtml(state.systemSettings.statusMessage)}
          </p>
        </article>

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
                          class="outline-button"
                          data-system-data-delete="${item.scope}"
                          type="button"
                          ${isSaving || isDeletingSystemData ? "disabled" : ""}
                        >
                          ${isDeletingCurrentItem ? "삭제 중..." : item.buttonLabel}
                        </button>
                      </div>
                    </div>
                    <small class="muted system-settings-help">${item.description}</small>
                  </div>
                `;
              })
              .join("")}
          </div>

          <p class="system-data-delete-status${dataDeletionStatusClass}${state.systemDataDeletion.statusMessage ? "" : " hidden"}" id="systemDataDeletionStatus">
            ${escapeHtml(state.systemDataDeletion.statusMessage)}
          </p>
        </article>
      </section>
    `;
  }

  return {
    renderLoginNoticeEditorToolbar,
    renderLoginNoticeSettings,
    renderSystemSettings,
  };
});
