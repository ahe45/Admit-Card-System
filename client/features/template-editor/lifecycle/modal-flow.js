(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorLifecycleModalFlow = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateLifecycleModalFlowController({
    EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    apiRequest,
    clearTemplateEditorImageSelection,
    createTemplateEditorState,
    decorateTemplateEditorImages,
    findTemplateCard,
    getTemplateEditorFontFamilyElement,
    getTemplateEditorFontSizeElement,
    getTemplateEditorModal,
    getTemplateEditorSerializedHtml,
    getTemplateEditorSurface,
    getTemplateEditorTableColumnsInput,
    getTemplateEditorTableRowsInput,
    getTemplateEditorTitleElement,
    getTemplatePreviewExaminee,
    getTemplatePreviewMetaElement,
    getTemplatePreviewStageElement,
    getTemplatePreviewTitleElement,
    initializeTemplateEditorHistory,
    closeModal,
    openModal,
    placeCaretAtEnd,
    prepareTemplateEditorContent,
    refreshTemplateEditorToolbarElements,
    renderEditorToolbarInner,
    renderTemplateWithExaminee,
    renderView,
    setTemplateEditorCellSplitPanelVisibility,
    setTemplateEditorStatus,
    setTemplateEditorTableInsertPanelVisibility,
    state,
    syncEditorToolbarFontSizeControls,
    syncTemplateEditorContent,
    updateTemplateCard,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateTableControls,
  }) {
    function renderTemplateEditorToolbar() {
      const toolbarHost = document.getElementById("templateEditorToolbarHost");

      if (!toolbarHost || typeof renderEditorToolbarInner !== "function") {
        return;
      }

      toolbarHost.innerHTML = renderEditorToolbarInner({
        commandAttr: "data-template-command",
        tableActionAttr: "data-template-table-action",
        insertAttr: "data-template-insert",
        openImageAttr: "data-template-open-image",
        fontFamilyId: "templateEditorFontFamily",
        fontFamilyValue: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
        fontSizeId: "templateEditorFontSize",
        fontSizeValue: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
        textColorId: "templateEditorTextColor",
        textColorValue: typeof EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR === "string" ? EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR : "#152033",
        textShadingId: "templateEditorTextShading",
        cellShadingId: "templateEditorCellShading",
        tableInsertPanelId: "templateEditorTableInsertPanel",
        tableRowsId: "templateEditorTableRows",
        tableColumnsId: "templateEditorTableColumns",
        cellSplitPanelId: "templateEditorCellSplitPanel",
        cellSplitCountId: "templateEditorCellSplitCount",
        cellSplitAxisName: "templateEditorCellSplitAxis",
        cellSplitAxisRowId: "templateEditorCellSplitAxisRow",
        cellSplitAxisColumnId: "templateEditorCellSplitAxisColumn",
        imageInputId: "templateEditorImageInput",
      });

      refreshTemplateEditorToolbarElements?.();
    }

    function openTemplateEditor(templateId) {
      const templateCard = findTemplateCard(templateId);
      const templateEditorModal = getTemplateEditorModal();
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateCard || !templateEditorModal || !templateEditorSurface) {
        return;
      }

      const editorMarkup = prepareTemplateEditorContent(templateCard.contentHtml);

      state.templateEditor = {
        ...createTemplateEditorState(),
        activeTemplateId: templateId,
        name: templateCard.name || "",
        description: templateCard.description || "",
        version: templateCard.version || "초안 버전 v1.0",
        draftHtml: editorMarkup,
        lastValidHtml: editorMarkup,
        statusMessage: "A4 영역 안에서 편집 중입니다.",
        statusType: "",
      };

      const templateEditorFontFamily = getTemplateEditorFontFamilyElement();
      const templateEditorFontSize = getTemplateEditorFontSizeElement();
      const templateEditorTableRows = getTemplateEditorTableRowsInput();
      const templateEditorTableColumns = getTemplateEditorTableColumnsInput();
      const templateEditorCellSplitCount = document.getElementById("templateEditorCellSplitCount");
      const templateEditorCellSplitAxisColumn = document.getElementById("templateEditorCellSplitAxisColumn");
      const templateEditorTitle = getTemplateEditorTitleElement();

      if (templateEditorFontFamily) {
        templateEditorFontFamily.value = TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY;
      }

      if (templateEditorFontSize) {
        syncEditorToolbarFontSizeControls({
          fontSizeElement: templateEditorFontSize,
          fontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
          defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
        });
      }

      if (templateEditorTableRows) {
        templateEditorTableRows.value = "3";
      }

      if (templateEditorTableColumns) {
        templateEditorTableColumns.value = "2";
      }

      if (templateEditorCellSplitCount) {
        templateEditorCellSplitCount.value = "2";
      }

      if (templateEditorCellSplitAxisColumn instanceof HTMLInputElement) {
        templateEditorCellSplitAxisColumn.checked = true;
      }

      if (templateEditorTitle) {
        templateEditorTitle.textContent = "수험표 양식 편집기";
      }

      templateEditorSurface.innerHTML = editorMarkup;
      decorateTemplateEditorImages(templateEditorSurface);
      clearTemplateEditorImageSelection();
      setTemplateEditorCellSplitPanelVisibility(false);
      setTemplateEditorTableInsertPanelVisibility(false);
      setTemplateEditorStatus(state.templateEditor.statusMessage);
      openModal("templateEditorModal");
      placeCaretAtEnd(templateEditorSurface);
      initializeTemplateEditorHistory();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
      updateTemplateTableControls();
    }

    function openTemplatePreview(templateId, sourceHtml = "") {
      const templateCard = findTemplateCard(templateId);
      const examinee = getTemplatePreviewExaminee();
      const templatePreviewStage = getTemplatePreviewStageElement();
      const previewName =
        state.templateEditor.activeTemplateId === templateId && String(state.templateEditor.name || "").trim()
          ? state.templateEditor.name.trim()
          : templateCard?.name || "";

      if (!templateCard || !templatePreviewStage) {
        return;
      }

      const renderedHtml = renderTemplateWithExaminee(sourceHtml || templateCard.contentHtml, examinee);

      state.templatePreview = {
        activeTemplateId: templateId,
        renderedHtml,
        examineeLabel: `${examinee.name} (${examinee.examineeNo})`,
        examineeNo: examinee.examineeNo,
      };

      const templatePreviewTitle = getTemplatePreviewTitleElement();
      const templatePreviewMeta = getTemplatePreviewMetaElement();

      if (templatePreviewTitle) {
        templatePreviewTitle.textContent = previewName;
      }

      if (templatePreviewMeta) {
        templatePreviewMeta.textContent = `${examinee.name} (${examinee.examineeNo}) 데이터 적용`;
      }

      templatePreviewStage.innerHTML = `<article class="template-render-sheet">${renderedHtml}</article>`;
      openModal("templatePreviewModal");
    }

    function previewTemplateEditorDraft() {
      if (!state.templateEditor.activeTemplateId || !getTemplateEditorSurface()) {
        return;
      }

      syncTemplateEditorContent();
      openTemplatePreview(state.templateEditor.activeTemplateId, state.templateEditor.draftHtml || getTemplateEditorSerializedHtml());
    }

    function saveTemplateEditor() {
      return (async () => {
        if (!state.templateEditor.activeTemplateId || !getTemplateEditorSurface()) {
          return;
        }

        try {
          const name = String(state.templateEditor.name || "").trim();
          const description = String(state.templateEditor.description || "").trim();

          if (!name) {
            setTemplateEditorStatus("양식 제목을 입력한 뒤 저장하세요.", "warning");
            return;
          }

          state.templateEditor.name = name;
          state.templateEditor.description = description;
          syncTemplateEditorContent();

          if (state.templateEditor.hasOverflow) {
            setTemplateEditorStatus("A4 영역을 초과한 상태에서는 저장할 수 없습니다. 저장 전 내용 길이를 줄이세요.", "warning");
            return;
          }

          const updatedTemplate = await apiRequest(`/api/templates/${encodeURIComponent(state.templateEditor.activeTemplateId)}`, {
            method: "PUT",
            body: JSON.stringify({
              name: state.templateEditor.name,
              description: state.templateEditor.description,
              version: state.templateEditor.version || "초안 버전 v1.0",
              contentHtml: state.templateEditor.draftHtml,
            }),
          });

          state.bootstrap.error = "";
          updateTemplateCard(state.templateEditor.activeTemplateId, updatedTemplate);
          closeModal("templateEditorModal");
          renderView();
        } catch (error) {
          setTemplateEditorStatus(error.message, "warning");
        }
      })();
    }

    return Object.freeze({
      openTemplateEditor,
      openTemplatePreview,
      previewTemplateEditorDraft,
      renderTemplateEditorToolbar,
      saveTemplateEditor,
    });
  }

  return Object.freeze({
    createTemplateLifecycleModalFlowController,
  });
});
