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
    function buildExamineeDetailPhotoUrl(examinee) {
      return buildExamineePhotoUrl(examinee);
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
              ${EXAMINEE_DETAIL_FIELDS.map(
                (field) => `
                  <div class="field">
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
                `,
              ).join("")}
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
