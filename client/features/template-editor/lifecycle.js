(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorLifecycle = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorLifecycleController({
    EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    apiRequest,
    buildTemplateTokenHtml,
    clearTemplateEditorImageSelection,
    closeModal,
    createTemplateCardEditorState,
    createTemplateEditorState,
    decorateTemplateEditorImages,
    getTemplateCreationSeed,
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
    openModal,
    placeCaretAtEnd,
    prepareTemplateEditorContent,
    refreshTemplateEditorToolbarElements,
    renderEditorToolbarInner,
    renderTemplateWithExaminee,
    renderView,
    setTemplateEditorStatus,
    setTemplateEditorTableInsertPanelVisibility,
    showToast,
    state,
    syncEditorToolbarFontSizeControls,
    syncTemplateEditorContent,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateTableControls,
  }) {
    function addTemplateCard() {
      return (async () => {
        try {
          const nextIndex = state.templateCards.length + 1;
          const templateSeed = getTemplateCreationSeed();
          const createdTemplate = await apiRequest("/api/templates", {
            method: "POST",
            body: JSON.stringify({
              name: `신규 수험표 양식 ${nextIndex}`,
              description: templateSeed.description,
              version: templateSeed.version,
              status: "unused",
              contentHtml: templateSeed.contentHtml,
            }),
          });

          state.bootstrap.error = "";
          state.templateCards = [...state.templateCards, createdTemplate];
          renderView();
        } catch (error) {
          state.bootstrap.error = error.message;
          window.alert(error.message);
          renderView();
        }
      })();
    }

    function applyTemplateCard(templateId) {
      return (async () => {
        const templateCard = findTemplateCard(templateId);

        if (!templateCard) {
          return;
        }

        try {
          const templates = await apiRequest(`/api/templates/${encodeURIComponent(templateId)}/activate`, {
            method: "POST",
          });

          state.templateCards = Array.isArray(templates) ? templates : state.templateCards;
          renderView();
          const appliedTemplateName = String(templateCard.name || "").trim() || "선택한";
          showToast(`${appliedTemplateName} 양식을 사용 적용했습니다.`);
        } catch (error) {
          window.alert(error.message);
        }
      })();
    }

    function deleteTemplateCard(templateId) {
      return (async () => {
        const templateCard = findTemplateCard(templateId);

        if (!templateCard) {
          return;
        }

        if (!window.confirm(`"${templateCard.name}" 양식을 삭제하시겠습니까?`)) {
          return;
        }

        try {
          await apiRequest(`/api/templates/${encodeURIComponent(templateId)}`, {
            method: "DELETE",
          });

          state.templateCards = state.templateCards.filter((card) => card.id !== templateId);
          if (state.templateCardEditor.activeTemplateId === templateId) {
            state.templateCardEditor = createTemplateCardEditorState();
          }

          if (state.templateEditor.activeTemplateId === templateId) {
            closeModal("templateEditorModal");
          }

          if (state.templatePreview.activeTemplateId === templateId) {
            closeModal("templatePreviewModal");
          }

          renderView();
        } catch (error) {
          window.alert(error.message);
        }
      })();
    }

    function getDefaultTemplateContent() {
      const token = (label) => buildTemplateTokenHtml(`@{${label}}`);

      return `
        <div class="template-doc" style="color: #16233b; font-family: 'Noto Sans KR', sans-serif;">
          <div style="text-align: center; margin-bottom: 22px;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">2026학년도 대학입학전형</p>
            <h1 style="margin: 0; font-size: 42px; line-height: 1.15;">수험표</h1>
          </div>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 15px;">
            <colgroup>
              <col style="width: 150px;" />
              <col style="width: 201px;" />
              <col style="width: 150px;" />
              <col style="width: 201px;" />
            </colgroup>
            <tbody>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">수험번호</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("수험번호")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">모집시기</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("모집시기")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">성명</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("이름")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">전형</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("전형")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">생년월일</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("생년월일")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">계열</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("계열")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">고사건물</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("고사건물")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">모집단위</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("모집단위")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">고사실</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("고사실")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">전공</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("전공")}</td>
              </tr>
              <tr>
                <th rowspan="2" style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">조</th>
                <td rowspan="2" style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("조")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">시험날짜</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("시험날짜")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">시간</th>
                <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("시간")}</td>
              </tr>
            </tbody>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; margin-top: 18px;">
            <tbody>
              <tr>
                <th colspan="3" style="border: 1px solid #5b6e8f; padding: 10px 12px; text-align: center; font-weight: 700; background: #f6f8fc;">시험 시간 안내</th>
              </tr>
              <tr>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>08:40 시작</strong><br />08:40 - 10:00</td>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>10:30 시작</strong><br />10:30 - 12:10</td>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>점심시간</strong><br />12:10 - 13:00</td>
              </tr>
              <tr>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>13:10 시작</strong><br />13:10 - 14:20</td>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>14:50 시작</strong><br />14:50 - 16:30</td>
                <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;"><strong>17:00 시작</strong><br />17:00 - 17:45</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 18px; font-size: 14px; line-height: 1.7;">
            <p style="margin: 0; font-weight: 700;">[유의사항]</p>
            <p style="margin: 0;">1. 반드시 신분증과 수험표를 함께 지참해야 합니다.</p>
            <p style="margin: 0;">2. 시험 시작 30분 전까지 지정된 고사실에 입실해야 합니다.</p>
            <p style="margin: 0;">3. 휴대전화 및 전자기기 소지는 제한됩니다.</p>
          </div>
          <div style="margin-top: 34px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
            <div style="flex: 1; border-top: 1px solid #5b6e8f; padding-top: 10px;">수험생 서명 :</div>
            <div style="min-width: 220px; text-align: right; font-weight: 700;">(직인) 입학본부장</div>
          </div>
        </div>
      `;
    }

    function findTemplateCard(templateId) {
      return state.templateCards.find((card) => card.id === templateId);
    }

    function updateTemplateCard(templateId, updates) {
      state.templateCards = state.templateCards.map((card) =>
        card.id === templateId
          ? {
              ...card,
              ...updates,
            }
          : card,
      );
    }

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

      if (templateEditorTitle) {
        templateEditorTitle.textContent = "수험표 양식 편집기";
      }

      templateEditorSurface.innerHTML = editorMarkup;
      decorateTemplateEditorImages(templateEditorSurface);
      clearTemplateEditorImageSelection();
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
      addTemplateCard,
      applyTemplateCard,
      deleteTemplateCard,
      findTemplateCard,
      getDefaultTemplateContent,
      openTemplateEditor,
      openTemplatePreview,
      previewTemplateEditorDraft,
      renderTemplateEditorToolbar,
      saveTemplateEditor,
      updateTemplateCard,
    });
  }

  return Object.freeze({
    createTemplateEditorLifecycleController,
  });
});
