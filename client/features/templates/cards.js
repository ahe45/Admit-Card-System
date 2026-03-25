(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateCards = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const TEMPLATE_PREVIEW_PHOTO_PATH = "/client/assets/template-preview-photo.png";

  const TEMPLATE_CARD_INLINE_EDIT_ICON = `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H13"></path>
      <path d="M18.5 11V18A1.5 1.5 0 0 1 17 19.5H6.5A1.5 1.5 0 0 1 5 18V5.5"></path>
      <path d="m10 14 7.5-7.5 2 2L12 16l-3 .5z"></path>
    </svg>
  `;

  const TEMPLATE_CARD_INLINE_SAVE_ICON = `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5 9.2 16.7 19 7.5"></path>
    </svg>
  `;

  const TEMPLATE_CARD_INLINE_CANCEL_ICON = `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 7 10 10"></path>
      <path d="M17 7 7 17"></path>
    </svg>
  `;

  function getTemplateCreationSeed() {
    const sourceTemplate = state.templateCards.find((card) => card.status === "used") || state.templateCards[0] || null;

    return {
      description: String(sourceTemplate?.description || "").trim() || "기본 수험표 레이아웃",
      version: String(sourceTemplate?.version || "").trim() || "초안 버전 v1.0",
      contentHtml: String(sourceTemplate?.contentHtml || "").trim() || getDefaultTemplateContent(),
    };
  }

  function getTemplatePreviewDate() {
    const serverDate = String(state.bootstrap?.serverDate || "").trim();

    if (serverDate) {
      return serverDate;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderTemplateCardThumbnail(card) {
    try {
      const previewExaminee = getTemplatePreviewExaminee();
      const sourceHtml = String(card?.contentHtml || "").trim() || getDefaultTemplateContent();
      const renderedHtml = renderTemplateWithExaminee(sourceHtml, previewExaminee);
      const thumbnailContainer = document.createElement("div");

      thumbnailContainer.innerHTML = renderedHtml;
      thumbnailContainer.querySelectorAll("img").forEach((imageElement) => {
        imageElement.loading = "lazy";
        imageElement.decoding = "async";
        imageElement.draggable = false;
      });

      return `
        <article class="template-render-sheet template-card-thumbnail-sheet" aria-hidden="true">
          ${thumbnailContainer.innerHTML}
        </article>
      `;
    } catch (error) {
      return `
        <div class="template-sheet-placeholder" aria-hidden="true">
          <span class="template-sheet-placeholder-title"></span>
          <span class="template-sheet-placeholder-line long"></span>
          <span class="template-sheet-placeholder-line"></span>
          <span class="template-sheet-placeholder-line"></span>
          <span class="template-sheet-placeholder-block"></span>
        </div>
      `;
    }
  }

  function isTemplateCardMetaEditorActive(templateId, field) {
    return state.templateCardEditor.activeTemplateId === templateId && state.templateCardEditor.field === field;
  }

  function getTemplateCardMetaEditorInputId(templateId, field) {
    return `templateCardMetaEditor-${templateId}-${field}`;
  }

  function focusTemplateCardMetaEditor(templateId, field) {
    const inputId = getTemplateCardMetaEditorInputId(templateId, field);

    window.requestAnimationFrame(() => {
      const inputElement = document.getElementById(inputId);

      if (!(inputElement instanceof HTMLInputElement)) {
        return;
      }

      inputElement.focus();
      inputElement.select();
    });
  }

  function openTemplateCardMetaEditor(templateId, field) {
    const templateCard = findTemplateCard(templateId);

    if (!templateCard || !["name", "description"].includes(field)) {
      return;
    }

    state.templateCardEditor = {
      activeTemplateId: templateId,
      field,
      draftValue: String(templateCard[field] || ""),
      isSaving: false,
    };
    renderView();
    focusTemplateCardMetaEditor(templateId, field);
  }

  function updateTemplateCardMetaEditorDraft(templateId, field, nextValue) {
    if (!isTemplateCardMetaEditorActive(templateId, field)) {
      return;
    }

    state.templateCardEditor.draftValue = String(nextValue ?? "");
  }

  function closeTemplateCardMetaEditor() {
    state.templateCardEditor = createTemplateCardEditorState();
    renderView();
  }

  async function saveTemplateCardMetaEditor(templateId, field) {
    const templateCard = findTemplateCard(templateId);

    if (!templateCard || !isTemplateCardMetaEditorActive(templateId, field)) {
      return;
    }

    const draftValue = String(state.templateCardEditor.draftValue || "").trim();

    if (field === "name" && !draftValue) {
      showToast("양식 제목을 입력하세요.", "error", 4200);
      focusTemplateCardMetaEditor(templateId, field);
      return;
    }

    state.templateCardEditor.isSaving = true;
    renderView();

    try {
      const updatedTemplate = await apiRequest(`/api/templates/${encodeURIComponent(templateId)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: field === "name" ? draftValue : templateCard.name,
          description: field === "description" ? draftValue : templateCard.description,
          version: templateCard.version || "초안 버전 v1.0",
          status: templateCard.status || "unused",
          contentHtml: templateCard.contentHtml,
        }),
      });

      updateTemplateCard(templateId, updatedTemplate);

      if (state.templateEditor.activeTemplateId === templateId) {
        state.templateEditor.name = updatedTemplate.name;
        state.templateEditor.description = updatedTemplate.description;
      }

      state.templateCardEditor = createTemplateCardEditorState();
      renderView();
      showToast(field === "name" ? "양식 제목을 수정했습니다." : "양식 설명을 수정했습니다.");
    } catch (error) {
      state.templateCardEditor.isSaving = false;
      renderView();
      showToast(error.message, "error", 4200);
      focusTemplateCardMetaEditor(templateId, field);
    }
  }

  function renderTemplateCardMetaEditButton(templateId, field, label) {
    return `
      <button
        class="icon-button template-card-meta-edit-button"
        data-template-card-edit="${escapeAttribute(templateId)}"
        data-template-card-field="${escapeAttribute(field)}"
        type="button"
        aria-label="${escapeAttribute(label)}"
        title="${escapeAttribute(label)}"
      >
        ${TEMPLATE_CARD_INLINE_EDIT_ICON}
      </button>
    `;
  }

  function renderTemplateCardMetaEditor(card, field, options = {}) {
    const isActive = isTemplateCardMetaEditorActive(card.id, field);
    const inputId = getTemplateCardMetaEditorInputId(card.id, field);
    const draftValue = isActive ? state.templateCardEditor.draftValue : String(card[field] || "");
    const inputLabel = options.inputLabel || "";
    const placeholder = options.placeholder || "";
    const displayValue = String(card[field] || "").trim();
    const isSaving = isActive && state.templateCardEditor.isSaving;

    if (!isActive) {
      const fallbackValue = field === "description" ? "설명이 없습니다." : "";
      const tagName = options.tagName || "p";

      return `
        <div class="template-card-meta-row template-card-meta-row-${escapeAttribute(field)}">
          <${tagName}>${escapeHtml(displayValue || fallbackValue)}</${tagName}>
          ${renderTemplateCardMetaEditButton(card.id, field, inputLabel)}
        </div>
      `;
    }

    return `
      <div class="template-card-meta-editor template-card-meta-editor-${escapeAttribute(field)}">
        <label class="sr-only" for="${escapeAttribute(inputId)}">${escapeHtml(inputLabel)}</label>
        <input
          class="template-card-meta-input"
          id="${escapeAttribute(inputId)}"
          data-template-card-input="${escapeAttribute(card.id)}"
          data-template-card-field="${escapeAttribute(field)}"
          type="text"
          maxlength="${field === "name" ? "200" : "255"}"
          value="${escapeAttribute(draftValue)}"
          placeholder="${escapeAttribute(placeholder)}"
          ${isSaving ? "disabled" : ""}
        />
        <div class="template-card-meta-editor-actions">
          <button
            class="icon-button template-card-meta-action-button template-card-meta-save-button"
            data-template-card-save="${escapeAttribute(card.id)}"
            data-template-card-field="${escapeAttribute(field)}"
            type="button"
            aria-label="저장"
            title="저장"
            ${isSaving ? "disabled" : ""}
          >
            ${TEMPLATE_CARD_INLINE_SAVE_ICON}
          </button>
          <button
            class="icon-button template-card-meta-action-button template-card-meta-cancel-button"
            data-template-card-cancel="${escapeAttribute(card.id)}"
            type="button"
            aria-label="취소"
            title="취소"
            ${isSaving ? "disabled" : ""}
          >
            ${TEMPLATE_CARD_INLINE_CANCEL_ICON}
          </button>
        </div>
      </div>
    `;
  }

  function renderTemplateCard(card) {
    const badgeClass = card.status === "used" ? "green" : "gray";
    const badgeLabel = card.status === "used" ? "사용중" : "사용 안 함";
    const isActiveTemplate = card.status === "used";
    const applyButtonMarkup = `<button class="secondary-button template-card-action-button" ${
      isActiveTemplate ? "disabled" : `data-template-apply="${escapeAttribute(card.id)}"`
    } type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12.5 9.2 16.7 19 7.5"></path>
      </svg>
      <span>사용 적용</span>
    </button>`;
    const deleteButtonMarkup = `<button class="icon-button template-card-delete-button danger-button" ${
      isActiveTemplate
        ? 'disabled title="사용 중 양식은 삭제할 수 없습니다."'
        : `data-template-delete="${escapeAttribute(card.id)}"`
    } type="button" aria-label="양식 삭제">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16"></path>
        <path d="M9.5 3.5h5"></path>
        <path d="M8 7v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 18V7"></path>
        <path d="M10 10.5v5"></path>
        <path d="M14 10.5v5"></path>
      </svg>
    </button>`;
    const previewButtonMarkup = `<button class="outline-button template-card-action-button" data-template-preview="${escapeAttribute(
      card.id,
    )}" type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      <span>미리보기</span>
    </button>`;
    const editButtonMarkup = `<button class="primary-button template-card-action-button" data-template-edit="${escapeAttribute(
      card.id,
    )}" type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"></path>
        <path d="m12.5 7 4.5 4.5"></path>
      </svg>
      <span>수정</span>
    </button>`;

    return `
      <article class="template-card" data-template-id="${escapeAttribute(card.id)}">
        <div class="section-header template-card-header">
          <div class="template-card-heading">
            ${renderTemplateCardMetaEditor(card, "name", {
              tagName: "h3",
              inputLabel: "양식 제목 수정",
              placeholder: "양식 제목을 입력하세요.",
            })}
            ${renderTemplateCardMetaEditor(card, "description", {
              tagName: "p",
              inputLabel: "양식 설명 수정",
              placeholder: "양식 설명을 입력하세요.",
            })}
          </div>
          <div class="template-card-header-tools">
            <span class="badge ${badgeClass}">${badgeLabel}</span>
            ${deleteButtonMarkup}
          </div>
        </div>
        <div class="template-preview">${renderTemplateCardThumbnail(card)}</div>
        <div class="template-card-actions">
          ${applyButtonMarkup}
          ${previewButtonMarkup}
          ${editButtonMarkup}
        </div>
      </article>
    `;
  }

  return {
    TEMPLATE_PREVIEW_PHOTO_PATH,
    closeTemplateCardMetaEditor,
    getTemplateCreationSeed,
    getTemplatePreviewDate,
    openTemplateCardMetaEditor,
    renderTemplateCard,
    saveTemplateCardMetaEditor,
    updateTemplateCardMetaEditorDraft,
  };
});
