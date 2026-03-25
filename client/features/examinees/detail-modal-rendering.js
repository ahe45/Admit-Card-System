(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeDetailModalRendering = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createExamineeDetailModalRenderingController({
    EXAMINEE_DETAIL_FIELDS,
    buildExamineePhotoUrl,
    escapeAttribute,
    escapeHtml,
    getDirtyExamineeDetailFieldLabels,
    getExamineeDetailBody,
    getExamineeDetailCloseConfirmMessage,
    getExamineeDetailCloseConfirmSummary,
    getExamineeDetailSaveButton,
    getSelectedExamineeDetailRow,
    state,
  }) {
    const EXAMINEE_DETAIL_FIELD_ROWS = Object.freeze([
      Object.freeze(["examineeNo", "name", "birth"]),
      Object.freeze(["track", "admission", "series"]),
      Object.freeze(["unit", "major"]),
      Object.freeze(["date", "time"]),
      Object.freeze(["building", "room", "group"]),
    ]);

    function buildExamineeDetailPhotoUrl(examinee) {
      return buildExamineePhotoUrl(examinee);
    }

    function renderExamineeDetailField(field, draftRecord, isBusy) {
      if (!field) {
        return "";
      }

      return `
        <div class="field examinee-detail-field">
          <label for="examineeDetailField-${escapeAttribute(field.key)}">${escapeHtml(field.label)}</label>
          <input
            id="examineeDetailField-${escapeAttribute(field.key)}"
            data-examinee-detail-field="${escapeAttribute(field.key)}"
            type="${escapeAttribute(field.type)}"
            value="${escapeAttribute(draftRecord[field.key] || "")}"
            ${isBusy ? "disabled" : ""}
            autocomplete="off"
          />
        </div>
      `;
    }

    function renderExamineeDetailFieldRows(draftRecord, isBusy) {
      const fieldsByKey = new Map(EXAMINEE_DETAIL_FIELDS.map((field) => [field.key, field]));
      const configuredFieldKeys = new Set(EXAMINEE_DETAIL_FIELD_ROWS.flat());
      const configuredRows = EXAMINEE_DETAIL_FIELD_ROWS.map((fieldKeys) => {
        const rowFields = fieldKeys.map((fieldKey) => fieldsByKey.get(fieldKey)).filter(Boolean);

        if (rowFields.length === 0) {
          return "";
        }

        return `
          <div class="examinee-detail-field-row">
            ${rowFields.map((field) => renderExamineeDetailField(field, draftRecord, isBusy)).join("")}
          </div>
        `;
      }).join("");
      const unconfiguredFields = EXAMINEE_DETAIL_FIELDS.filter((field) => !configuredFieldKeys.has(field.key));

      if (unconfiguredFields.length === 0) {
        return configuredRows;
      }

      const extraRows = [];

      for (let fieldIndex = 0; fieldIndex < unconfiguredFields.length; fieldIndex += 3) {
        extraRows.push(`
          <div class="examinee-detail-field-row">
            ${unconfiguredFields
              .slice(fieldIndex, fieldIndex + 3)
              .map((field) => renderExamineeDetailField(field, draftRecord, isBusy))
              .join("")}
          </div>
        `);
      }

      return `${configuredRows}${extraRows.join("")}`;
    }

    function renderExamineeDetailModalContent() {
      const selectedRow = getSelectedExamineeDetailRow();
      const draftRecord = state.examineeDetail.draftRecord;

      if (!selectedRow || !draftRecord) {
        return `
          <article class="form-card examinee-detail-card examinee-detail-empty-card">
            <div class="empty-state examinee-detail-empty-state">
              <div>
                <strong>수험생 상세정보</strong>
                <p>표에서 수험생 행을 클릭하면 상세정보를 확인하고 수정할 수 있습니다.</p>
              </div>
            </div>
          </article>
        `;
      }

      const isSaving = Boolean(state.examineeDetail.isSaving);
      const isPhotoUploading = Boolean(state.examineeDetail.isPhotoUploading);
      const isBusy = isSaving || isPhotoUploading;
      const photoUrl = buildExamineeDetailPhotoUrl(selectedRow);
      const statusClassName = state.examineeDetail.statusType === "warning" ? " warning" : "";

      return `
        <div class="examinee-detail-card">
          <p class="examinee-detail-status${statusClassName}${state.examineeDetail.statusMessage ? "" : " hidden"}">
            ${escapeHtml(state.examineeDetail.statusMessage)}
          </p>
          <div class="examinee-detail-layout">
            <div class="examinee-detail-field-grid">
              ${renderExamineeDetailFieldRows(draftRecord, isBusy)}
            </div>
            <aside class="examinee-detail-photo-panel">
              <div class="examinee-detail-photo-frame">
                ${
                  photoUrl
                    ? `<img
                        class="examinee-detail-photo-image"
                        src="${escapeAttribute(photoUrl)}"
                        alt="${escapeAttribute(`${selectedRow.name || selectedRow.examineeNo || "수험생"} 사진`)}"
                      />`
                    : `<div class="examinee-detail-photo-placeholder">
                        <strong>사진 미등록</strong>
                        <span>등록 가능한 형식</span>
                      </div>`
                }
              </div>
              <button
                class="outline-button examinee-detail-photo-button"
                data-examinee-detail-photo-upload="true"
                type="button"
                ${isBusy ? "disabled" : ""}
              >
                ${isPhotoUploading ? "업로드 중..." : "사진 재등록"}
              </button>
              <input
                class="examinee-detail-photo-input"
                id="examineeDetailPhotoInput"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                hidden
                ${isBusy ? "disabled" : ""}
              />
            </aside>
          </div>
        </div>
      `;
    }

    function syncExamineeDetailModal() {
      const isSaving = Boolean(state.examineeDetail.isSaving);
      const isPhotoUploading = Boolean(state.examineeDetail.isPhotoUploading);
      const hasDraftRecord = Boolean(state.examineeDetail.draftRecord);
      const examineeDetailSaveButton = getExamineeDetailSaveButton?.() || null;
      const examineeDetailBody = getExamineeDetailBody?.() || null;

      if (examineeDetailSaveButton) {
        examineeDetailSaveButton.textContent = isSaving ? "저장 중..." : "저장";
        examineeDetailSaveButton.disabled = !hasDraftRecord || isSaving || isPhotoUploading;
      }

      if (examineeDetailBody) {
        examineeDetailBody.innerHTML = renderExamineeDetailModalContent();
      }
    }

    function syncExamineeDetailCloseConfirmModal() {
      const dirtyFieldLabels = getDirtyExamineeDetailFieldLabels();
      const summaryMarkup =
        dirtyFieldLabels.length > 0
          ? `
            <p class="examinee-detail-confirm-caption">변경된 항목</p>
            <div class="examinee-detail-confirm-chip-list">
              ${dirtyFieldLabels.map((label) => `<span class="examinee-detail-confirm-chip">${escapeHtml(label)}</span>`).join("")}
            </div>
          `
          : "";
      const examineeDetailCloseConfirmMessage = getExamineeDetailCloseConfirmMessage?.() || null;
      const examineeDetailCloseConfirmSummary = getExamineeDetailCloseConfirmSummary?.() || null;

      if (examineeDetailCloseConfirmMessage) {
        examineeDetailCloseConfirmMessage.textContent = "저장하지 않은 변경 사항이 있습니다. 저장하고 종료하시겠습니까?";
      }

      if (examineeDetailCloseConfirmSummary) {
        examineeDetailCloseConfirmSummary.innerHTML = summaryMarkup;
      }
    }

    return Object.freeze({
      buildExamineeDetailPhotoUrl,
      renderExamineeDetailModalContent,
      syncExamineeDetailCloseConfirmModal,
      syncExamineeDetailModal,
    });
  }

  return Object.freeze({
    createExamineeDetailModalRenderingController,
  });
});
