(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeDetailEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createExamineeDetailEventHandlers({
    closeExamineeDetailCloseConfirmModal,
    renderView,
    resetExamineeDetailEditor,
    saveExamineeDetail,
    updateExamineeDetailField,
    uploadExamineeDetailPhoto,
  }) {
    async function handleClick(event) {
      const examineeDetailSaveTrigger = event.target.closest("[data-examinee-detail-save]");
      const examineeDetailResetTrigger = event.target.closest("[data-examinee-detail-reset]");
      const examineeDetailPhotoUploadTrigger = event.target.closest("[data-examinee-detail-photo-upload]");
      const examineeDetailCloseDismissTrigger = event.target.closest("[data-examinee-detail-close-dismiss]");
      const examineeDetailCloseActionTrigger = event.target.closest("[data-examinee-detail-close-action]");

      if (examineeDetailSaveTrigger) {
        await saveExamineeDetail();
        return true;
      }

      if (examineeDetailResetTrigger) {
        resetExamineeDetailEditor();
        renderView();
        return true;
      }

      if (examineeDetailPhotoUploadTrigger) {
        document.getElementById("examineeDetailPhotoInput")?.click();
        return true;
      }

      if (examineeDetailCloseDismissTrigger) {
        closeExamineeDetailCloseConfirmModal("cancel");
        return true;
      }

      if (examineeDetailCloseActionTrigger) {
        closeExamineeDetailCloseConfirmModal(examineeDetailCloseActionTrigger.dataset.examineeDetailCloseAction);
        return true;
      }

      return false;
    }

    async function handleChange(event) {
      const examineeDetailField = event.target.closest("[data-examinee-detail-field]");

      if (event.target.id === "examineeDetailPhotoInput") {
        const selectedPhotoFile = event.target.files?.[0];
        event.target.value = "";

        if (selectedPhotoFile) {
          await uploadExamineeDetailPhoto(selectedPhotoFile);
        }

        return true;
      }

      if (examineeDetailField?.dataset.examineeDetailField) {
        updateExamineeDetailField(examineeDetailField.dataset.examineeDetailField, event.target.value);
        return true;
      }

      return false;
    }

    function handleInput(event) {
      const examineeDetailField = event.target.closest("[data-examinee-detail-field]");

      if (examineeDetailField?.dataset.examineeDetailField) {
        updateExamineeDetailField(examineeDetailField.dataset.examineeDetailField, event.target.value);
        return true;
      }

      return false;
    }

    function handleKeydown(event) {
      const examineeDetailCloseConfirmModal = document.getElementById("examineeDetailCloseConfirmModal");

      if (event.key === "Escape" && !examineeDetailCloseConfirmModal?.classList.contains("hidden")) {
        event.preventDefault();
        closeExamineeDetailCloseConfirmModal("cancel");
        return true;
      }

      return false;
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleInput,
      handleKeydown,
    });
  }

  return Object.freeze({
    createExamineeDetailEventHandlers,
  });
});
