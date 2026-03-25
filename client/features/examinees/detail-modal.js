(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeDetailModal = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const detailModalRenderingModule = globalThis.AdmitCardExamineeDetailModalRendering;

  if (!detailModalRenderingModule?.createExamineeDetailModalRenderingController) {
    throw new Error("client/features/examinees/detail-modal-rendering.js must be loaded before detail-modal.js.");
  }

  const { createExamineeDetailModalRenderingController } = detailModalRenderingModule;

  function createExamineeDetailModalController({
    EXAMINEE_DETAIL_FIELDS,
    EXAMINEE_DETAIL_FIELD_KEYS,
    apiRequest,
    areExamineeDetailDraftsEqual,
    arrayBufferToBase64,
    buildExamineePhotoUrl,
    buildExamineeDetailDraft,
    createExamineeDetailState,
    escapeAttribute,
    escapeHtml,
    getExamineeDetailBody,
    getExamineeDetailCloseConfirmMessage,
    getExamineeDetailCloseConfirmModal,
    getExamineeDetailCloseConfirmSummary,
    getExamineeDetailSaveButton,
    getExamineeGridRows,
    handleAuthenticationFailure,
    loadBootstrapData,
    normalizeExamineeRecord,
    openModal,
    readFileAsArrayBuffer,
    renderView,
    showToast,
    state,
  }) {
    let examineeDetailCloseConfirmResolver = null;

    function getSelectedExamineeDetailRow() {
      const selectedExamineeNo = String(state.examineeDetail?.selectedExamineeNo || "").trim();

      if (!selectedExamineeNo) {
        return null;
      }

      return getExamineeGridRows().find((row) => row.examineeNo === selectedExamineeNo) || null;
    }

    function isExamineeDetailDirty() {
      return !areExamineeDetailDraftsEqual(state.examineeDetail?.draftRecord, state.examineeDetail?.baseRecord);
    }

    function getDirtyExamineeDetailFieldLabels() {
      if (!state.examineeDetail?.draftRecord || !state.examineeDetail?.baseRecord) {
        return [];
      }

      return EXAMINEE_DETAIL_FIELDS.filter(
        (field) =>
          String(state.examineeDetail.draftRecord?.[field.key] ?? "") !==
          String(state.examineeDetail.baseRecord?.[field.key] ?? ""),
      ).map((field) => field.label);
    }

    function setExamineeDetailStatus(message = "", type = "") {
      state.examineeDetail.statusMessage = String(message || "");
      state.examineeDetail.statusType = type;
    }

    function openExamineeDetail(examineeNo, { force = false } = {}) {
      const normalizedExamineeNo = String(examineeNo || "").trim();

      if (!normalizedExamineeNo) {
        return false;
      }

      if (!force && state.examineeDetail.selectedExamineeNo === normalizedExamineeNo && state.examineeDetail.draftRecord) {
        syncExamineeDetailModal();
        openModal("examineeDetailModal");
        return true;
      }

      if (
        !force &&
        state.examineeDetail.selectedExamineeNo &&
        state.examineeDetail.selectedExamineeNo !== normalizedExamineeNo &&
        isExamineeDetailDirty() &&
        !window.confirm("저장하지 않은 수정 내용이 사라집니다. 다른 수험생을 선택할까요?")
      ) {
        return false;
      }

      const selectedRow = getExamineeGridRows().find((row) => row.examineeNo === normalizedExamineeNo);

      if (!selectedRow) {
        return false;
      }

      const draftRecord = buildExamineeDetailDraft(selectedRow);

      state.examineeDetail = {
        ...createExamineeDetailState(),
        selectedExamineeNo: selectedRow.examineeNo,
        originalExamineeNo: selectedRow.examineeNo,
        baseRecord: draftRecord,
        draftRecord,
      };

      syncExamineeDetailModal();
      openModal("examineeDetailModal");
      return true;
    }

    function resetExamineeDetailEditor() {
      if (!state.examineeDetail.baseRecord) {
        return;
      }

      state.examineeDetail = {
        ...state.examineeDetail,
        draftRecord: { ...state.examineeDetail.baseRecord },
        isSaving: false,
        statusMessage: "",
        statusType: "",
      };
    }

    function updateExamineeDetailField(fieldKey, value) {
      if (!state.examineeDetail.draftRecord || !EXAMINEE_DETAIL_FIELD_KEYS.includes(fieldKey)) {
        return;
      }

      state.examineeDetail = {
        ...state.examineeDetail,
        draftRecord: {
          ...state.examineeDetail.draftRecord,
          [fieldKey]: String(value ?? ""),
        },
      };

      if (state.examineeDetail.statusMessage) {
        setExamineeDetailStatus("");
      }
    }

    async function saveExamineeDetail() {
      const originalExamineeNo = String(state.examineeDetail.originalExamineeNo || "").trim();
      const draftRecord = state.examineeDetail.draftRecord;

      if (!originalExamineeNo || !draftRecord || !isExamineeDetailDirty()) {
        return;
      }

      state.examineeDetail = {
        ...state.examineeDetail,
        isSaving: true,
      };
      setExamineeDetailStatus("");
      renderView();

      try {
        const updatedExaminee = normalizeExamineeRecord(
          await apiRequest(`/api/examinees/${encodeURIComponent(originalExamineeNo)}`, {
            method: "PUT",
            body: JSON.stringify(draftRecord),
          }),
        );
        const nextDraftRecord = buildExamineeDetailDraft(updatedExaminee);

        state.examineeDetail = {
          ...createExamineeDetailState(),
          selectedExamineeNo: updatedExaminee.examineeNo,
          originalExamineeNo: updatedExaminee.examineeNo,
          baseRecord: nextDraftRecord,
          draftRecord: nextDraftRecord,
        };

        showToast(`${updatedExaminee.name || updatedExaminee.examineeNo} 정보를 수정했습니다.`);
        await loadBootstrapData({ showLoading: false });
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        state.examineeDetail = {
          ...state.examineeDetail,
          isSaving: false,
        };
        setExamineeDetailStatus(error.message, "warning");
        renderView();
      }
    }

    async function uploadExamineeDetailPhoto(file) {
      const selectedExamineeNo = String(state.examineeDetail.selectedExamineeNo || state.examineeDetail.originalExamineeNo || "").trim();
      const normalizedFileName = String(file?.name || "").trim();
      const fileExtension =
        normalizedFileName && normalizedFileName.includes(".")
          ? normalizedFileName.slice(normalizedFileName.lastIndexOf(".")).toLowerCase()
          : "";
      const fileStem = fileExtension ? normalizedFileName.slice(0, normalizedFileName.length - fileExtension.length).trim() : "";

      if (!selectedExamineeNo || !file) {
        return;
      }

      if (![".jpg", ".jpeg", ".png"].includes(fileExtension)) {
        setExamineeDetailStatus("사진 파일은 JPG, JPEG, PNG 형식만 업로드할 수 있습니다.", "warning");
        renderView();
        return;
      }

      if (fileStem !== selectedExamineeNo) {
        setExamineeDetailStatus(
          `사진 파일명은 ${selectedExamineeNo}.jpg, ${selectedExamineeNo}.jpeg, ${selectedExamineeNo}.png 형식이어야 합니다.`,
          "warning",
        );
        renderView();
        return;
      }

      state.examineeDetail = {
        ...state.examineeDetail,
        isPhotoUploading: true,
      };
      setExamineeDetailStatus("");
      renderView();

      try {
        const fileBuffer = await readFileAsArrayBuffer(file);
        const fileContentBase64 = arrayBufferToBase64(fileBuffer);

        await apiRequest(`/api/examinees/${encodeURIComponent(selectedExamineeNo)}/photo`, {
          method: "PUT",
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileContentBase64,
          }),
        });

        await loadBootstrapData({ showLoading: false });
        state.examineeDetail = {
          ...state.examineeDetail,
          isPhotoUploading: false,
        };
        renderView();
        showToast(`${selectedExamineeNo} 사진을 저장했습니다.`);
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        state.examineeDetail = {
          ...state.examineeDetail,
          isPhotoUploading: false,
        };
        setExamineeDetailStatus(error.message, "warning");
        renderView();
      }
    }
    const examineeDetailModalRenderingController = createExamineeDetailModalRenderingController({
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
    });
    const {
      buildExamineeDetailPhotoUrl,
      renderExamineeDetailModalContent,
      syncExamineeDetailCloseConfirmModal,
      syncExamineeDetailModal,
    } = examineeDetailModalRenderingController;

    function closeExamineeDetailCloseConfirmModal(action = "cancel") {
      const examineeDetailCloseConfirmModal = getExamineeDetailCloseConfirmModal?.() || null;

      if (!examineeDetailCloseConfirmModal) {
        return;
      }

      const resolve = examineeDetailCloseConfirmResolver;
      const normalizedAction = ["save", "discard", "cancel"].includes(String(action || "").trim())
        ? String(action || "").trim()
        : "cancel";

      examineeDetailCloseConfirmResolver = null;
      examineeDetailCloseConfirmModal.classList.add("hidden");
      examineeDetailCloseConfirmModal.setAttribute("aria-hidden", "true");
      resolve?.(normalizedAction);
    }

    function promptExamineeDetailCloseAction() {
      const examineeDetailCloseConfirmModal = getExamineeDetailCloseConfirmModal?.() || null;

      if (!examineeDetailCloseConfirmModal) {
        return Promise.resolve("cancel");
      }

      if (examineeDetailCloseConfirmResolver) {
        const previousResolve = examineeDetailCloseConfirmResolver;
        examineeDetailCloseConfirmResolver = null;
        previousResolve("cancel");
      }

      syncExamineeDetailCloseConfirmModal();
      examineeDetailCloseConfirmModal.classList.remove("hidden");
      examineeDetailCloseConfirmModal.setAttribute("aria-hidden", "false");

      return new Promise((resolve) => {
        examineeDetailCloseConfirmResolver = resolve;
      });
    }

    return Object.freeze({
      buildExamineeDetailPhotoUrl,
      closeExamineeDetailCloseConfirmModal,
      getDirtyExamineeDetailFieldLabels,
      getSelectedExamineeDetailRow,
      isExamineeDetailDirty,
      openExamineeDetail,
      promptExamineeDetailCloseAction,
      renderExamineeDetailModalContent,
      resetExamineeDetailEditor,
      saveExamineeDetail,
      setExamineeDetailStatus,
      syncExamineeDetailCloseConfirmModal,
      syncExamineeDetailModal,
      updateExamineeDetailField,
      uploadExamineeDetailPhoto,
    });
  }

  return Object.freeze({
    createExamineeDetailModalController,
  });
});
