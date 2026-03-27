(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(globalScope.AdmitCardApplicantFormConfig);
    return;
  }

  globalScope.AdmitCardApplicantAdmin = factory(globalScope.AdmitCardApplicantFormConfig);
})(typeof globalThis !== "undefined" ? globalThis : this, (applicantFormConfig) => {
  const defaultExamNoPattern = applicantFormConfig?.defaultApplicantExamNoPattern || "AD-{YY}{MM}{DD}-{SEQ:4}";
  const defaultExamNoSequenceStart = applicantFormConfig?.defaultApplicantExamNoSequenceStart || 1;

  function createEmptyApplicantFieldEditor({ isActive = false, isDraft = false } = {}) {
    return {
      isActive,
      isDraft,
      editingId: 0,
      questionText: "",
      questionDescription: "",
      inputType: "text",
      systemFieldKey: "",
      options: [],
      optionDraft: "",
      allowCustomOption: false,
      customOptionLabel: "",
      required: false,
    };
  }

  function createEmptyApplicantRecruitmentUnitEditor({ isActive = false } = {}) {
    return {
      isActive,
      editingId: 0,
      admissionCode: "",
      admissionName: "",
      seriesCode: "",
      seriesName: "",
      unitCode: "",
      unitName: "",
      majorCode: "",
      majorName: "",
    };
  }

  function createApplicantAdminController({
    arrayBufferToBase64,
    apiRequest,
    buildApiUrl,
    getApplicantUnitUploadFileInput,
    getApplicantUnitUploadFileName,
    handleAuthenticationFailure,
    loadBootstrapData,
    openModal,
    readFileAsArrayBuffer,
    renderView,
    requestCloseModal,
    showToast,
    state,
  }) {
    function clearApplicantRecruitmentUnitUploadFiles() {
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const labelElement = typeof getApplicantUnitUploadFileName === "function" ? getApplicantUnitUploadFileName() : null;

      if (inputElement) {
        inputElement.value = "";
      }

      if (labelElement) {
        labelElement.textContent = "선택된 데이터 파일이 없습니다.";
      }
    }

    function triggerBlobDownload(blob, fileName) {
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    function syncApplicantRecruitmentUnitModalForm() {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();
      const modalForm = document.getElementById("applicantRecruitmentUnitForm");
      const deleteButton = document.getElementById("applicantRecruitmentUnitModalDeleteButton");
      const saveButton = document.getElementById("applicantRecruitmentUnitModalSaveButton");
      const isEditorActive = editorState.isActive === true;
      const editingId = Number(editorState.editingId || 0);

      if (modalForm) {
        modalForm.querySelectorAll("[data-applicant-recruitment-input]").forEach((inputElement) => {
          if (!(inputElement instanceof HTMLInputElement)) {
            return;
          }

          const fieldName = String(inputElement.dataset.applicantRecruitmentInput || "").trim();
          inputElement.value = fieldName ? String(editorState[fieldName] || "") : "";
          inputElement.disabled = !isEditorActive;
        });
      }

      if (deleteButton) {
        deleteButton.dataset.applicantRecruitmentDelete = editingId > 0 ? String(editingId) : "";
        deleteButton.disabled = !(isEditorActive && editingId > 0);
      }

      if (saveButton) {
        saveButton.disabled = !isEditorActive;
      }
    }

    function resetApplicantFieldEditor({ render = true } = {}) {
      state.applicantManager.fieldEditor = createEmptyApplicantFieldEditor();

      if (render) {
        renderView();
      }
    }

    function resetApplicantRecruitmentUnitEditor({ render = true } = {}) {
      state.applicantManager.recruitmentUnitEditor = createEmptyApplicantRecruitmentUnitEditor();
      syncApplicantRecruitmentUnitModalForm();

      if (render) {
        renderView();
      }
    }

    function activateApplicantFieldCreation() {
      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "fields";
      state.applicantManager.fieldEditor = createEmptyApplicantFieldEditor({
        isActive: true,
        isDraft: true,
      });
      renderView();
    }

    function activateApplicantRecruitmentUnitCreation() {
      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "recruitment-units";
      state.applicantManager.recruitmentUnitEditor = createEmptyApplicantRecruitmentUnitEditor({
        isActive: true,
      });
      syncApplicantRecruitmentUnitModalForm();
      renderView();
    }

    function setApplicantManagerTab(tab = "templates") {
      const normalizedTab = String(tab || "").trim();

      if (!["templates", "history", "form-settings"].includes(normalizedTab)) {
        return;
      }

      state.applicantManager.activeTab = normalizedTab;
      renderView();
    }

    function setApplicantSettingsSection(section = "recruitment-units") {
      const normalizedSection = String(section || "").trim();

      if (!["fields", "recruitment-units"].includes(normalizedSection)) {
        return;
      }

      state.applicantManager.settingsSection = normalizedSection;
      renderView();
    }

    function toggleApplicantSubmissionDetail(submissionId) {
      const normalizedSubmissionId = Number(submissionId || 0);

      if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
        resetApplicantSubmissionDetail();
        return;
      }

      const submissions = Array.isArray(state.applicantManager?.submissions) ? state.applicantManager.submissions : [];
      const targetSubmission = submissions.find((submission) => Number(submission?.id || 0) === normalizedSubmissionId) || null;

      if (!targetSubmission) {
        showToast("답변을 확인할 접수 이력을 찾을 수 없습니다.", "error", 3200);
        return;
      }

      state.applicantManager.expandedSubmissionId = normalizedSubmissionId;
      renderView();
      openModal?.("applicantSubmissionDetailModal");
    }

    function resetApplicantSubmissionDetail({ render = true } = {}) {
      state.applicantManager.expandedSubmissionId = 0;

      if (render) {
        renderView();
      }
    }

    function startApplicantFieldEdit(fieldId) {
      const field = state.applicantManager.fields.find((candidate) => candidate.id === Number(fieldId || 0));

      if (!field) {
        showToast("수정할 접수 양식 항목을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "fields";
      state.applicantManager.fieldEditor = {
        isActive: true,
        isDraft: false,
        editingId: field.id,
        questionText: field.questionText || "",
        questionDescription: field.questionDescription || "",
        inputType: field.inputType || "text",
        systemFieldKey: field.systemFieldKey || "",
        options: Array.isArray(field.options) ? [...field.options] : [],
        optionDraft: "",
        allowCustomOption: false,
        customOptionLabel: String(field.customOptionLabel || "").trim(),
        required: field.required === true,
      };
      renderView();
    }

    function startApplicantRecruitmentUnitEdit(unitId) {
      const unit = state.applicantManager.recruitmentUnits.find((candidate) => candidate.id === Number(unitId || 0));

      if (!unit) {
        showToast("수정할 접수 설정을 찾을 수 없습니다.", "error");
        return;
      }

      state.applicantManager.activeTab = "form-settings";
      state.applicantManager.settingsSection = "recruitment-units";
      state.applicantManager.recruitmentUnitEditor = {
        isActive: true,
        editingId: unit.id,
        admissionCode: unit.admissionCode || "",
        admissionName: unit.admissionName || "",
        seriesCode: unit.seriesCode || "",
        seriesName: unit.seriesName || "",
        unitCode: unit.unitCode || "",
        unitName: unit.unitName || "",
        majorCode: unit.majorCode || "",
        majorName: unit.majorName || "",
      };
      renderView();
      syncApplicantRecruitmentUnitModalForm();
      openModal?.("applicantRecruitmentUnitModal");
    }

    function updateApplicantFieldEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const normalizedValue =
        fieldName === "required" || fieldName === "allowCustomOption"
          ? value === true || value === "true" || Number(value) === 1
          : String(value ?? "");
      const nextEditorState = {
        ...editorState,
        [fieldName]: normalizedValue,
      };

      if (fieldName === "inputType" && normalizedValue !== "select") {
        nextEditorState.allowCustomOption = false;
        nextEditorState.customOptionLabel = "";
      }

      if (fieldName === "allowCustomOption" && normalizedValue !== true) {
        nextEditorState.customOptionLabel = "";
      }

      state.applicantManager.fieldEditor = nextEditorState;

      if (fieldName === "inputType") {
        renderView();
      }
    }

    function updateApplicantRecruitmentUnitEditorField(fieldName = "", value) {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();

      if (editorState.isActive !== true) {
        return;
      }

      state.applicantManager.recruitmentUnitEditor = {
        ...editorState,
        [fieldName]: String(value ?? ""),
      };
    }

    function updateApplicantSettingsField(fieldName = "", value) {
      state.applicantManager.settings = {
        ...state.applicantManager.settings,
        [fieldName]: fieldName === "examNoSequenceStart" ? Number(value || 0) : String(value ?? ""),
      };
    }

    function resolveApplicantPhotoMimeType(fileName = "", mimeType = "") {
      const normalizedMimeType = String(mimeType || "").trim().toLowerCase();

      if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/png") {
        return normalizedMimeType;
      }

      const normalizedFileName = String(fileName || "").trim().toLowerCase();

      if (normalizedFileName.endsWith(".png")) {
        return "image/png";
      }

      if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
        return "image/jpeg";
      }

      return "";
    }

    async function refreshApplicantBootstrap(successMessage = "") {
      const currentTab = state.applicantManager.activeTab || "form-settings";
      const currentSettingsSection = state.applicantManager.settingsSection || "recruitment-units";

      await loadBootstrapData({ showLoading: false });
      state.applicantManager.activeTab = currentTab;
      state.applicantManager.settingsSection = currentSettingsSection;

      if (successMessage) {
        showToast(successMessage);
      }
    }

    async function saveApplicantFieldEditor() {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        showToast("질문 카드를 먼저 선택하거나 새 질문을 추가하세요.", "error", 3200);
        return;
      }

      const requestPath = editorState.editingId
        ? `/api/applicant-form-fields/${editorState.editingId}`
        : "/api/applicant-form-fields";
      const requestMethod = editorState.editingId ? "PUT" : "POST";

      try {
        await apiRequest(requestPath, {
          method: requestMethod,
          body: JSON.stringify({
            questionText: editorState.questionText,
            questionDescription: editorState.questionDescription,
            inputType: editorState.inputType,
            systemFieldKey: editorState.systemFieldKey,
            options: editorState.inputType === "select" ? editorState.options : [],
            allowCustomOption:
              editorState.inputType === "select" && String(editorState.customOptionLabel || "").trim() !== "",
            customOptionLabel:
              editorState.inputType === "select" ? String(editorState.customOptionLabel || "").trim() : "",
            required: editorState.required,
          }),
        });
        resetApplicantFieldEditor({ render: false });
        await refreshApplicantBootstrap(editorState.editingId ? "접수 양식 항목을 수정했습니다." : "접수 양식 항목을 추가했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 항목을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantRecruitmentUnit() {
      const editorState = state.applicantManager.recruitmentUnitEditor || createEmptyApplicantRecruitmentUnitEditor();

      if (editorState.isActive !== true) {
        showToast("접수 설정을 선택하거나 새로 추가하세요.", "error", 3200);
        return;
      }

      const requestPath = editorState.editingId
        ? `/api/applicant-recruitment-units/${editorState.editingId}`
        : "/api/applicant-recruitment-units";
      const requestMethod = editorState.editingId ? "PUT" : "POST";

      try {
        await apiRequest(requestPath, {
          method: requestMethod,
          body: JSON.stringify({
            admissionCode: editorState.admissionCode,
            admissionName: editorState.admissionName,
            seriesCode: editorState.seriesCode,
            seriesName: editorState.seriesName,
            unitCode: editorState.unitCode,
            unitName: editorState.unitName,
            majorCode: editorState.majorCode,
            majorName: editorState.majorName,
          }),
        });
        await requestCloseModal?.("applicantRecruitmentUnitModal");
        await refreshApplicantBootstrap(editorState.editingId ? "접수 설정을 수정했습니다." : "접수 설정을 추가했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 설정을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function downloadApplicantRecruitmentUnitTemplate() {
      try {
        const response = await fetch(buildApiUrl("/api/applicant-recruitment-units/template.xlsx"), {
          credentials: "same-origin",
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "접수 설정 양식을 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "접수 설정 업로드 양식.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantRecruitmentUnits() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantRecruitmentGrid")
          : state.applicantManager?.recruitmentUnits;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-recruitment-units/export.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "접수 설정 데이터를 다운로드할 수 없습니다.");
        }

        triggerBlobDownload(await response.blob(), "접수 설정 데이터.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantSubmissions() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantHistoryGrid")
          : state.applicantManager?.submissions;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-submissions/export.xlsx"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "접수 이력 데이터를 다운로드할 수 없습니다.");
        }

        await requestCloseModal?.("applicantSubmissionDownloadModal");
        triggerBlobDownload(await response.blob(), "접수 이력 데이터.xlsx");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function downloadApplicantSubmissionPhotos() {
      const filteredRows =
        typeof globalThis.getGridRows === "function"
          ? globalThis.getGridRows("applicantHistoryGrid")
          : state.applicantManager?.submissions;

      if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
        showToast("필터링된 데이터가 없습니다.", "error", 4200);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/applicant-submissions/photos.zip"), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: filteredRows,
          }),
        });
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const payload = contentType.includes("application/json") ? await response.json() : await response.text();
          throw new Error(payload?.error || payload || "수험생 사진 ZIP을 다운로드할 수 없습니다.");
        }

        await requestCloseModal?.("applicantSubmissionDownloadModal");
        triggerBlobDownload(await response.blob(), "접수 이력 수험생 사진.zip");
      } catch (error) {
        showToast(error.message, "error", 4200);
      }
    }

    async function uploadApplicantRecruitmentUnitFile() {
      const inputElement = typeof getApplicantUnitUploadFileInput === "function" ? getApplicantUnitUploadFileInput() : null;
      const file = inputElement?.files?.[0] || null;

      if (!file) {
        showToast("업로드할 XLSX 파일을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        showToast("현재는 XLSX 업로드만 지원합니다.", "error", 3200);
        return;
      }

      try {
        const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

        await apiRequest("/api/applicant-recruitment-units/import", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            fileContentBase64,
          }),
        });

        clearApplicantRecruitmentUnitUploadFiles();
        await requestCloseModal?.("applicantUnitUploadModal");
        await refreshApplicantBootstrap("접수 설정 데이터를 업로드했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 설정 데이터를 업로드하지 못했습니다.", "error", 4200);
      }
    }

    async function uploadApplicantSubmissionPhoto(file, submissionId = 0) {
      const normalizedSubmissionId = Number(submissionId || state.applicantManager?.expandedSubmissionId || 0);
      const normalizedFileName = String(file?.name || "").trim();
      const fileExtension =
        normalizedFileName && normalizedFileName.includes(".")
          ? normalizedFileName.slice(normalizedFileName.lastIndexOf(".")).toLowerCase()
          : "";

      if (!Number.isInteger(normalizedSubmissionId) || normalizedSubmissionId <= 0) {
        showToast("사진을 등록할 접수 이력을 찾을 수 없습니다.", "error", 3200);
        return;
      }

      if (!file || !normalizedFileName) {
        showToast("등록할 사진 파일을 먼저 선택하세요.", "error", 3200);
        return;
      }

      if (![".jpg", ".jpeg", ".png"].includes(fileExtension)) {
        showToast("사진 파일은 JPG, JPEG, PNG 형식만 업로드할 수 있습니다.", "error", 3200);
        return;
      }

      try {
        const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

        await apiRequest(`/api/applicant-submissions/${normalizedSubmissionId}/photo`, {
          method: "PUT",
          body: JSON.stringify({
            fileName: normalizedFileName,
            fileContentBase64,
            mimeType: resolveApplicantPhotoMimeType(normalizedFileName, file.type),
          }),
        });

        await loadBootstrapData({ showLoading: false });
        showToast("접수 사진을 다시 등록했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 사진을 다시 등록하지 못했습니다.", "error", 4200);
      }
    }

    function addApplicantFieldOption() {
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const nextOption = String(editorState.optionDraft || "").trim();
      const existingOptions = Array.isArray(editorState.options) ? editorState.options : [];

      if (!nextOption) {
        showToast("추가할 선택지 항목을 입력하세요.", "error", 3200);
        return;
      }

      if (existingOptions.includes(nextOption)) {
        showToast("같은 선택지 항목이 이미 있습니다.", "error", 3200);
        return;
      }

      state.applicantManager.fieldEditor = {
        ...editorState,
        options: [...existingOptions, nextOption],
        optionDraft: "",
        allowCustomOption: false,
        customOptionLabel:
          editorState.allowCustomOption === true && !String(editorState.customOptionLabel || "").trim()
            ? nextOption
            : String(editorState.customOptionLabel || "").trim(),
      };
      renderView();
    }

    function removeApplicantFieldOption(optionIndex) {
      const normalizedIndex = Number(optionIndex);
      const editorState = state.applicantManager.fieldEditor || createEmptyApplicantFieldEditor();

      if (editorState.isActive !== true) {
        return;
      }

      const existingOptions = Array.isArray(editorState.options) ? editorState.options : [];

      if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= existingOptions.length) {
        return;
      }

      const removedOption = String(existingOptions[normalizedIndex] || "").trim();
      const currentCustomOptionLabel = String(editorState.customOptionLabel || "").trim();

      state.applicantManager.fieldEditor = {
        ...editorState,
        options: existingOptions.filter((_, index) => index !== normalizedIndex),
        customOptionLabel: currentCustomOptionLabel === removedOption ? "" : currentCustomOptionLabel,
      };
      renderView();
    }

    async function deleteApplicantField(fieldId) {
      if (!window.confirm("선택한 접수 양식 항목을 삭제하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}`, {
          method: "DELETE",
        });

        if (state.applicantManager.fieldEditor?.editingId === Number(fieldId || 0)) {
          resetApplicantFieldEditor({ render: false });
        }

        await refreshApplicantBootstrap("접수 양식 항목을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 항목을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    async function moveApplicantField(fieldId, direction = "") {
      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}/move`, {
          method: "POST",
          body: JSON.stringify({ direction }),
        });
        await refreshApplicantBootstrap("접수 양식 순서를 변경했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 순서를 변경하지 못했습니다.", "error", 4200);
      }
    }

    async function reorderApplicantField(fieldId, targetFieldId, placement = "before") {
      try {
        await apiRequest(`/api/applicant-form-fields/${fieldId}/move`, {
          method: "POST",
          body: JSON.stringify({
            targetFieldId,
            placement,
          }),
        });
        await refreshApplicantBootstrap("접수 양식 순서를 변경했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 양식 순서를 변경하지 못했습니다.", "error", 4200);
      }
    }

    async function saveApplicantSettings() {
      try {
        await apiRequest("/api/applicant-settings", {
          method: "PUT",
          body: JSON.stringify({
            examNoPattern: state.applicantManager.settings?.examNoPattern || defaultExamNoPattern,
            examNoSequenceStart: state.applicantManager.settings?.examNoSequenceStart || defaultExamNoSequenceStart,
          }),
        });
        await refreshApplicantBootstrap("접수 수험번호 규칙을 저장했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 수험번호 규칙을 저장하지 못했습니다.", "error", 4200);
      }
    }

    async function promoteApplicantSubmissionAction(submissionId) {
      if (!window.confirm("선택한 접수 이력을 수험생 등록 테이블로 이동하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-submissions/${submissionId}/promote`, {
          method: "POST",
        });
        await refreshApplicantBootstrap("수험생 등록 테이블로 이동했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "수험생 등록 테이블 이동에 실패했습니다.", "error", 4200);
      }
    }

    async function deleteApplicantRecruitmentUnit(unitId) {
      if (!window.confirm("선택한 접수 설정을 삭제하시겠습니까?")) {
        return;
      }

      try {
        await apiRequest(`/api/applicant-recruitment-units/${unitId}`, {
          method: "DELETE",
        });

        if (state.applicantManager.recruitmentUnitEditor?.editingId === Number(unitId || 0)) {
          await requestCloseModal?.("applicantRecruitmentUnitModal");
        }

        await refreshApplicantBootstrap("접수 설정을 삭제했습니다.");
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        showToast(error?.message || "접수 설정을 삭제하지 못했습니다.", "error", 4200);
      }
    }

    function openApplicantFieldPreview() {
      try {
        const previewUrl = new URL(buildApiUrl("/applicant/form"));
        previewUrl.searchParams.set("preview", "1");
        window.open(previewUrl.toString(), "_blank", "noopener,noreferrer");
      } catch (error) {
        showToast("미리보기 페이지를 열지 못했습니다.", "error", 3200);
      }
    }

    return Object.freeze({
      activateApplicantRecruitmentUnitCreation,
      activateApplicantFieldCreation,
      addApplicantFieldOption,
      clearApplicantRecruitmentUnitUploadFiles,
      createEmptyApplicantRecruitmentUnitEditor,
      createEmptyApplicantFieldEditor,
      deleteApplicantRecruitmentUnit,
      deleteApplicantField,
      downloadApplicantSubmissionPhotos,
      downloadApplicantSubmissions,
      downloadApplicantRecruitmentUnits,
      downloadApplicantRecruitmentUnitTemplate,
      moveApplicantField,
      openApplicantFieldPreview,
      promoteApplicantSubmissionAction,
      reorderApplicantField,
      resetApplicantRecruitmentUnitEditor,
      resetApplicantFieldEditor,
      resetApplicantSubmissionDetail,
      removeApplicantFieldOption,
      saveApplicantRecruitmentUnit,
      saveApplicantFieldEditor,
      saveApplicantSettings,
      setApplicantSettingsSection,
      setApplicantManagerTab,
      startApplicantRecruitmentUnitEdit,
      startApplicantFieldEdit,
      toggleApplicantSubmissionDetail,
      uploadApplicantRecruitmentUnitFile,
      uploadApplicantSubmissionPhoto,
      updateApplicantRecruitmentUnitEditorField,
      updateApplicantFieldEditorField,
      updateApplicantSettingsField,
    });
  }

  return Object.freeze({
    createApplicantAdminController,
    createEmptyApplicantRecruitmentUnitEditor,
    createEmptyApplicantFieldEditor,
  });
});
