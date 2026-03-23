async function addTemplateCard() {
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
}

function getTemplateCreationSeed() {
  const sourceTemplate =
    state.templateCards.find((card) => card.status === "used") ||
    state.templateCards[0] ||
    null;

  return {
    description: String(sourceTemplate?.description || "").trim() || "기본 수험표 레이아웃",
    version: String(sourceTemplate?.version || "").trim() || "초안 버전 v1.0",
    contentHtml: String(sourceTemplate?.contentHtml || "").trim() || getDefaultTemplateContent(),
  };
}

const TEMPLATE_PREVIEW_PHOTO_PATH = "/client/assets/template-preview-photo.png";

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

async function applyTemplateCard(templateId) {
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
}

async function deleteTemplateCard(templateId) {
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
}

const TEMPLATE_GENERATED_OBJECT_CONFIG = Object.freeze({
  barcode: Object.freeze({
    label: "수험번호 바코드",
    altSuffix: "Code128 바코드",
    className: "template-generated-object-barcode",
    width: 240,
    height: 72,
  }),
  qrcode: Object.freeze({
    label: "수험번호 QR코드",
    altSuffix: "QR코드",
    className: "template-generated-object-qrcode",
    width: 112,
    height: 112,
  }),
});

function getTemplateGeneratedObjectConfig(objectType) {
  return TEMPLATE_GENERATED_OBJECT_CONFIG[String(objectType || "").trim().toLowerCase()] || null;
}

function getTemplateGeneratedObjectValue(examinee) {
  const examineeNo = String(examinee?.examineeNo ?? "").trim();
  return examineeNo || "-";
}

function buildTemplateGeneratedObjectPreviewUrl(objectType, examinee) {
  const objectConfig = getTemplateGeneratedObjectConfig(objectType);

  if (!objectConfig) {
    return "";
  }

  const value = getTemplateGeneratedObjectValue(examinee);
  const query = new URLSearchParams({ value }).toString();
  return buildApiUrl(`/api/template-objects/${encodeURIComponent(objectType)}.svg?${query}`);
}

function decorateTemplateGeneratedObjectImage(imageElement, examinee = getTemplatePreviewExaminee()) {
  if (!(imageElement instanceof HTMLImageElement)) {
    return false;
  }

  const objectType = String(imageElement.dataset.templateObjectType || "").trim().toLowerCase();
  const objectConfig = getTemplateGeneratedObjectConfig(objectType);

  imageElement.classList.remove(
    "template-generated-object",
    TEMPLATE_GENERATED_OBJECT_CONFIG.barcode.className,
    TEMPLATE_GENERATED_OBJECT_CONFIG.qrcode.className,
  );

  if (!objectConfig) {
    imageElement.removeAttribute("data-template-object-source");
    return false;
  }

  const value = getTemplateGeneratedObjectValue(examinee);
  const previewUrl = buildTemplateGeneratedObjectPreviewUrl(objectType, examinee);

  imageElement.classList.add("template-generated-object", objectConfig.className);
  imageElement.dataset.templateObjectSource = "examineeNo";
  imageElement.alt = `${value} ${objectConfig.altSuffix}`;
  imageElement.title = objectConfig.label;

  if (!String(imageElement.style.width || "").trim() && !imageElement.getAttribute("width")) {
    imageElement.style.width = `${objectConfig.width}px`;
  }

  if (!String(imageElement.style.height || "").trim() && !imageElement.getAttribute("height")) {
    imageElement.style.height = `${objectConfig.height}px`;
  }

  if (previewUrl) {
    imageElement.src = previewUrl;
  }

  return true;
}

function buildTemplateGeneratedObjectMarkup(objectType) {
  const objectConfig = getTemplateGeneratedObjectConfig(objectType);

  if (!objectConfig) {
    return "";
  }

  const previewExaminee = getTemplatePreviewExaminee();
  const previewUrl = buildTemplateGeneratedObjectPreviewUrl(objectType, previewExaminee);
  const objectValue = getTemplateGeneratedObjectValue(previewExaminee);

  return `
    <img
      class="template-generated-object ${objectConfig.className}"
      data-template-object-type="${escapeAttribute(objectType)}"
      data-template-object-source="examineeNo"
      src="${escapeAttribute(previewUrl)}"
      alt="${escapeAttribute(`${objectValue} ${objectConfig.altSuffix}`)}"
      title="${escapeAttribute(objectConfig.label)}"
      style="width: ${objectConfig.width}px; height: ${objectConfig.height}px;"
    />
  `;
}

function applyTemplateRenderedObjects(rootElement, examinee) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement.querySelectorAll("img[data-template-object-type]").forEach((imageElement) => {
    decorateTemplateGeneratedObjectImage(imageElement, examinee);
  });
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
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">모집단위</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("모집단위")}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">고사건물</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("고사건물")}</td>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">전공</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("전공")}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">고사실</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("고사실")}</td>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">시험날짜</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("시험날짜")}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">조</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("조")}</td>
            <th style="border: 1px solid #5b6e8f; padding: 12px 14px; background: #f6f8fc;">시간</th>
            <td style="border: 1px solid #5b6e8f; padding: 12px 14px;">${token("시간")}</td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; margin-top: 18px;">
        <tbody>
          <tr>
            <th colspan="3" style="border: 1px solid #5b6e8f; padding: 10px 12px; text-align: center; font-weight: 700; background: #f6f8fc;">
              시험 시간 안내
            </th>
          </tr>
          <tr>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>08:40 시작</strong><br />
              08:40 - 10:00
            </td>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>10:30 시작</strong><br />
              10:30 - 12:10
            </td>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>점심시간</strong><br />
              12:10 - 13:00
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>13:10 시작</strong><br />
              13:10 - 14:20
            </td>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>14:50 시작</strong><br />
              14:50 - 16:30
            </td>
            <td style="border: 1px solid #5b6e8f; padding: 10px 8px; text-align: center;">
              <strong>17:00 시작</strong><br />
              17:00 - 17:45
            </td>
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

function updateTemplateEditorHeading() {
  if (!templateEditorTitle) {
    return;
  }

  templateEditorTitle.textContent = "수험표 양식 편집기";
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

  updateTemplateEditorHeading();
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
  if (!state.templateEditor.activeTemplateId || !templateEditorSurface) {
    return;
  }

  syncTemplateEditorContent();
  openTemplatePreview(state.templateEditor.activeTemplateId, state.templateEditor.draftHtml || getTemplateEditorSerializedHtml());
}

async function saveTemplateEditor() {
  if (!state.templateEditor.activeTemplateId || !templateEditorSurface) {
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
}

function applyTemplateEditorCommand(command, value = "") {
  if (!templateEditorSurface) {
    return;
  }

  const normalizedValue =
    command === "hiliteColor" && !String(value || "").trim()
      ? templateEditorTextShading?.value || "#fff59d"
      : command === "foreColor" && !String(value || "").trim()
        ? templateEditorTextColor?.value ||
          (typeof EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR === "string" ? EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR : "#152033")
      : value;

  applySharedEditorCommand({
    rootElement: templateEditorSurface,
    focusElement: templateEditorSurface,
    restoreSelection: restoreTemplateEditorSelection,
    syncContent: syncTemplateEditorContent,
    onUndo: undoTemplateEditorHistory,
    onRedo: redoTemplateEditorHistory,
    applyTableSelectionCommand: applyTemplateEditorTableSelectionCommand,
    command,
    value: normalizedValue,
    fontFamilyElement: templateEditorFontFamily,
    defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    fontSizeElement: templateEditorFontSize,
    defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    setStatus: setTemplateEditorStatus,
    syncOptions: { preserveSelection: true, focusEditor: true },
    onFormatBlockApplied: (nextValue) => {
      if (templateEditorBlockType && nextValue) {
        templateEditorBlockType.value = nextValue;
      }
    },
  });
}

function applyTemplateEditorFontFamily(rawFontFamily) {
  if (!templateEditorSurface) {
    return;
  }

  applySharedEditorFontFamily({
    rootElement: templateEditorSurface,
    focusElement: templateEditorSurface,
    restoreSelection: restoreTemplateEditorSelection,
    syncContent: syncTemplateEditorContent,
    applyTableSelectionFontFamily: applyTemplateEditorTableSelectionFontFamily,
    rawFontFamily,
    fontFamilyElement: templateEditorFontFamily,
    defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    syncOptions: { preserveSelection: true, focusEditor: true },
  });
}

function applyTemplateEditorFontSize(rawFontSize) {
  if (!templateEditorSurface) {
    return;
  }

  applySharedEditorFontSize({
    rootElement: templateEditorSurface,
    focusElement: templateEditorSurface,
    restoreSelection: restoreTemplateEditorSelection,
    syncContent: syncTemplateEditorContent,
    applyTableSelectionFontSize: applyTemplateEditorTableSelectionFontSize,
    rawFontSize,
    fontSizeElement: templateEditorFontSize,
    defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
    setStatus: setTemplateEditorStatus,
    syncOptions: { preserveSelection: true, focusEditor: true },
  });
}

function getTemplateEditorFormattingTargetCells() {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (!tableSelection?.selectedCells?.length) {
    return [];
  }

  return tableSelection.selectedCells.filter((cell) => templateEditorSurface?.contains(cell));
}

function isTemplateEditorCellBold(cell) {
  const fontWeight = String(cell?.style.fontWeight || window.getComputedStyle(cell || document.body).fontWeight || "")
    .trim()
    .toLowerCase();

  if (fontWeight === "bold") {
    return true;
  }

  const numericFontWeight = Number(fontWeight);
  return Number.isFinite(numericFontWeight) && numericFontWeight >= 600;
}

function isTemplateEditorCellItalic(cell) {
  const fontStyle = String(cell?.style.fontStyle || window.getComputedStyle(cell || document.body).fontStyle || "")
    .trim()
    .toLowerCase();
  return fontStyle.includes("italic");
}

function isTemplateEditorCellUnderlined(cell) {
  const inlineValue = `${cell?.style.textDecorationLine || ""} ${cell?.style.textDecoration || ""}`.toLowerCase();
  const computedStyle = cell ? window.getComputedStyle(cell) : null;
  const computedValue = `${computedStyle?.textDecorationLine || ""} ${computedStyle?.textDecoration || ""}`.toLowerCase();
  return inlineValue.includes("underline") || computedValue.includes("underline");
}

function getTemplateEditorCellUnorderedList(cell) {
  if (!cell) {
    return null;
  }

  const meaningfulNodes = Array.from(cell.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return String(node.textContent || "").trim() !== "";
    }

    return true;
  });

  return meaningfulNodes.length === 1 && meaningfulNodes[0] instanceof HTMLUListElement ? meaningfulNodes[0] : null;
}

function unwrapTemplateEditorCellUnorderedList(cell) {
  const listElement = getTemplateEditorCellUnorderedList(cell);

  if (!listElement) {
    return;
  }

  cell.innerHTML = "";
  const items = Array.from(listElement.children).filter((child) => child.tagName === "LI");

  items.forEach((item, index) => {
    while (item.firstChild) {
      cell.appendChild(item.firstChild);
    }

    if (index < items.length - 1) {
      cell.appendChild(document.createElement("br"));
    }
  });

  if (isTemplateTableCellEmpty(cell)) {
    cell.innerHTML = "<br />";
  }
}

function wrapTemplateEditorCellUnorderedList(cell) {
  if (!cell || getTemplateEditorCellUnorderedList(cell)) {
    return;
  }

  const listElement = document.createElement("ul");
  const listItem = document.createElement("li");
  const contentNodes = Array.from(cell.childNodes);
  const hasMeaningfulContent = contentNodes.some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return String(node.textContent || "").trim() !== "";
    }

    return !(node instanceof HTMLBRElement && contentNodes.length === 1);
  });

  if (!hasMeaningfulContent) {
    listItem.appendChild(document.createElement("br"));
  } else {
    contentNodes.forEach((node) => {
      listItem.appendChild(node);
    });
  }

  listElement.appendChild(listItem);
  cell.replaceChildren(listElement);
}

function applyTemplateEditorTableSelectionCommand(command, value = "") {
  const targetCells = getTemplateEditorFormattingTargetCells();

  if (targetCells.length === 0) {
    return false;
  }

  if (command === "bold") {
    const shouldApplyBold = !targetCells.every((cell) => isTemplateEditorCellBold(cell));
    targetCells.forEach((cell) => {
      cell.style.fontWeight = shouldApplyBold ? "700" : "400";
    });
  } else if (command === "italic") {
    const shouldApplyItalic = !targetCells.every((cell) => isTemplateEditorCellItalic(cell));
    targetCells.forEach((cell) => {
      cell.style.fontStyle = shouldApplyItalic ? "italic" : "normal";
    });
  } else if (command === "underline") {
    const shouldApplyUnderline = !targetCells.every((cell) => isTemplateEditorCellUnderlined(cell));
    targetCells.forEach((cell) => {
      if (shouldApplyUnderline) {
        cell.style.textDecoration = "underline";
        cell.style.textDecorationLine = "underline";
        return;
      }

      cell.style.removeProperty("text-decoration");
      cell.style.removeProperty("text-decoration-line");
    });
  } else if (
    command === "justifyLeft" ||
    command === "justifyCenter" ||
    command === "justifyRight" ||
    command === "justifyFull"
  ) {
    const textAlignValue =
      command === "justifyCenter" ? "center" : command === "justifyRight" ? "right" : command === "justifyFull" ? "justify" : "left";
    targetCells.forEach((cell) => {
      cell.style.textAlign = textAlignValue;
    });
  } else if (command === "insertUnorderedList") {
    const shouldApplyList = !targetCells.every((cell) => getTemplateEditorCellUnorderedList(cell));
    targetCells.forEach((cell) => {
      if (shouldApplyList) {
        wrapTemplateEditorCellUnorderedList(cell);
        return;
      }

      unwrapTemplateEditorCellUnorderedList(cell);
    });
  } else {
    return false;
  }

  syncTemplateEditorContent();
  return true;
}

function applyTemplateEditorTableSelectionFontFamily(fontFamily) {
  const targetCells = getTemplateEditorFormattingTargetCells();

  if (targetCells.length === 0) {
    return false;
  }

  targetCells.forEach((cell) => {
    cell.style.fontFamily = fontFamily;
  });

  syncTemplateEditorContent();
  return true;
}

function applyTemplateEditorTableSelectionFontSize(fontSize) {
  const targetCells = getTemplateEditorFormattingTargetCells();

  if (targetCells.length === 0) {
    return false;
  }

  targetCells.forEach((cell) => {
    cell.style.fontSize = `${fontSize}px`;
  });

  syncTemplateEditorContent();
  return true;
}

function setTemplateEditorTableInsertPanelVisibility(isVisible) {
  if (typeof setEditorToolbarTableInsertPanelVisibility === "function") {
    setEditorToolbarTableInsertPanelVisibility("templateEditorTableInsertPanel", Boolean(isVisible));
    return;
  }

  templateEditorTableInsertPanel?.classList.toggle("hidden", !isVisible);
}

function getTemplateEditorTableInsertConfig() {
  const rowCount = Math.round(Number(templateEditorTableRows?.value || 0));
  const columnCount = Math.round(Number(templateEditorTableColumns?.value || 0));

  if (!Number.isFinite(rowCount) || rowCount < 1 || rowCount > 20) {
    setTemplateEditorStatus("표 행 수는 1개 이상 20개 이하로 입력하세요.", "warning");
    templateEditorTableRows?.focus();
    return null;
  }

  if (!Number.isFinite(columnCount) || columnCount < 1 || columnCount > 8) {
    setTemplateEditorStatus("표 열 수는 1개 이상 8개 이하로 입력하세요.", "warning");
    templateEditorTableColumns?.focus();
    return null;
  }

  return {
    rowCount,
    columnCount,
  };
}

function buildTemplateEditorTableMarkup(rowCount, columnCount) {
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
      const cells = Array.from({ length: columnCount }, (_, columnIndex) => {
        if (rowIndex === 0) {
          return `<th style="${TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_STYLE}">제목 ${columnIndex + 1}</th>`;
        }

      return `<td style="${TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_STYLE}"><br /></td>`;
    }).join("");

    return `<tr>${cells}</tr>`;
  }).join("");

  return `
    <table style="${TEMPLATE_EDITOR_DEFAULT_TABLE_STYLE}">
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p></p>
  `;
}

function handleTemplateEditorInsert(insertType) {
  if (insertType === "table") {
    const shouldOpen = templateEditorTableInsertPanel?.classList.contains("hidden") ?? true;
    setTemplateEditorTableInsertPanelVisibility(shouldOpen);

    if (shouldOpen) {
      templateEditorTableRows?.focus();
      templateEditorTableRows?.select();
    }
    return;
  }

  if (insertType === "table-confirm") {
    const tableInsertConfig = getTemplateEditorTableInsertConfig();

    if (!tableInsertConfig) {
      return;
    }

    window.setTimeout(() => {
      insertTemplateHtml(buildTemplateEditorTableMarkup(tableInsertConfig.rowCount, tableInsertConfig.columnCount));
      setTemplateEditorTableInsertPanelVisibility(false);
    }, 0);
    return;
  }

  if (insertType === "rule") {
    insertTemplateHtml("<hr /><p></p>");
    setTemplateEditorTableInsertPanelVisibility(false);
    return;
  }

  if (insertType === "barcode" || insertType === "qrcode") {
    insertTemplateHtml(buildTemplateGeneratedObjectMarkup(insertType));
    setTemplateEditorTableInsertPanelVisibility(false);
  }
}

function handleTemplateTableAction(action, { colorValue = "" } = {}) {
  if (!templateEditorSurface) {
    return;
  }

  restoreTemplateEditorSelection();

  let focusCell = null;

  if (action === "insert-row-before") {
    focusCell = insertTemplateTableRow("before");
  }

  if (action === "insert-row-after") {
    focusCell = insertTemplateTableRow("after");
  }

  if (action === "insert-column-before") {
    focusCell = insertTemplateTableColumn("before");
  }

  if (action === "insert-column-after") {
    focusCell = insertTemplateTableColumn("after");
  }

  if (action === "delete-row") {
    focusCell = deleteTemplateTableRow();
  }

  if (action === "delete-column") {
    focusCell = deleteTemplateTableColumn();
  }

  if (action === "merge-selection") {
    focusCell = mergeTemplateTableSelection();
  }

  if (action === "equalize-column-widths") {
    focusCell = equalizeTemplateTableColumnWidths();
  }

  if (action === "equalize-row-heights") {
    focusCell = equalizeTemplateTableRowHeights();
  }

  if (action === "apply-cell-shading") {
    applyTemplateEditorCellShading(colorValue);
    return;
  }

  if (action === "merge-right") {
    focusCell = mergeTemplateTableCell("right");
  }

  if (action === "merge-down") {
    focusCell = mergeTemplateTableCell("down");
  }

  if (action === "split-cell") {
    focusCell = splitTemplateTableCell();
  }

  if (!focusCell) {
    return;
  }

  focusTemplateEditorCell(focusCell);
  syncTemplateEditorContent();
  updateTemplateTableControls();
}

function applyTemplateTableSize() {
  restoreTemplateEditorSelection();

  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 크기를 조정하세요.", "warning");
    return;
  }

  const scope = String(templateEditorSizeScope?.value || "cell");
  const targetCells = getTemplateEditorSizeScopeCells(selectedCell, scope);

  if (targetCells.length === 0) {
    setTemplateEditorStatus("적용할 셀을 찾을 수 없습니다.", "warning");
    return;
  }

  const widthInput = String(templateEditorCellWidth?.value || "").trim();
  const heightInput = String(templateEditorRowHeight?.value || "").trim();
  const widthValue = widthInput ? Number(widthInput) : null;
  const heightValue = heightInput ? Number(heightInput) : null;

  if (widthValue === null && heightValue === null) {
    setTemplateEditorStatus("셀 가로 또는 세로 값을 입력하세요.", "warning");
    return;
  }

  if (widthValue !== null) {
    if (!Number.isFinite(widthValue) || widthValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
      setTemplateEditorStatus(`셀 가로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
      return;
    }

    if (scope === "cell") {
      applyTemplateEditorTableCellWidth(selectedCell, widthValue);
    } else {
      const targetColumnIndexes = getTemplateEditorSizeScopeColumnIndexes(selectedCell, scope);

      if (targetColumnIndexes.length === 0) {
        setTemplateEditorStatus("적용할 열을 찾을 수 없습니다.", "warning");
        return;
      }

      targetColumnIndexes.forEach((columnIndex) => {
        setTemplateEditorTableLogicalColumnWidth(selectedCell.closest("table"), columnIndex, widthValue);
      });
    }
  }

  if (heightValue !== null) {
    if (!Number.isFinite(heightValue) || heightValue < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
      setTemplateEditorStatus(`셀 세로 길이는 ${TEMPLATE_EDITOR_TABLE_MIN_SIZE}px 이상으로 입력하세요.`, "warning");
      return;
    }

    targetCells.forEach((cell) => {
      cell.style.height = `${heightValue}px`;
      if (cell.parentElement) {
        cell.parentElement.style.height = `${heightValue}px`;
      }
    });
  }

  focusTemplateEditorCell(selectedCell);
  syncTemplateEditorContent();
  updateTemplateTableControls();
}

function insertTemplateTag(tag) {
  if (!tag) {
    return;
  }

  const normalizedTag = normalizeTemplateTag(tag);
  insertTemplateHtml(buildTemplateTokenHtml(normalizedTag));
}

function insertTemplateHtml(html) {
  restoreTemplateEditorSelection();
  const selection = window.getSelection();
  const activeRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : state.templateEditor.savedRange?.cloneRange();

  if (!activeRange) {
    placeCaretAtEnd(templateEditorSurface);
    return;
  }

  const markup = String(html || "").trim();
  const fragment = activeRange.createContextualFragment(markup);
  const lastInsertedNode = fragment.lastChild;

  activeRange.deleteContents();
  activeRange.insertNode(fragment);

  if (selection) {
    const nextRange = document.createRange();

    if (lastInsertedNode) {
      nextRange.setStartAfter(lastInsertedNode);
    } else {
      nextRange.selectNodeContents(templateEditorSurface);
      nextRange.collapse(false);
    }

    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    state.templateEditor.savedRange = nextRange.cloneRange();
  }

  syncTemplateEditorContent();
}

function insertTemplateImage(file) {
  if (!file) {
    return;
  }

  const fileReader = new FileReader();

  fileReader.addEventListener("load", () => {
    insertTemplateHtml(`<img src="${fileReader.result}" alt="${escapeAttribute(file.name)}" />`);
  });

  fileReader.readAsDataURL(file);
}

function decorateTemplateEditorImages(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement.querySelectorAll("img").forEach((imageElement) => {
    decorateTemplateGeneratedObjectImage(imageElement);
    imageElement.classList.add("template-editor-image-object");
    imageElement.setAttribute("draggable", "false");
    imageElement.setAttribute("contenteditable", "false");

    if (!String(imageElement.style.height || "").trim() && !imageElement.getAttribute("height")) {
      imageElement.style.height = "auto";
    }
  });
}

function getTemplateEditorPageElement() {
  return templateEditorSurface?.closest(".template-editor-page") || null;
}

function getTemplateEditorDocumentElement() {
  return templateEditorSurface?.querySelector(".template-doc") || null;
}

function getTemplateEditorImageOverlayContainer() {
  return getTemplateEditorDocumentElement() || getTemplateEditorPageElement();
}

function getTemplateEditorImageTarget(target) {
  const baseElement =
    target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
  const imageElement = baseElement?.closest("img");

  if (!imageElement || !templateEditorSurface?.contains(imageElement)) {
    return null;
  }

  return imageElement;
}

function ensureTemplateEditorImageOverlay() {
  const overlayContainer = getTemplateEditorImageOverlayContainer();

  if (!overlayContainer) {
    return null;
  }

  if (templateEditorImageOverlay) {
    if (!overlayContainer.contains(templateEditorImageOverlay)) {
      overlayContainer.append(templateEditorImageOverlay);
    }

    return templateEditorImageOverlay;
  }

  const overlayElement = document.createElement("div");
  const resizeHandle = document.createElement("button");

  overlayElement.className = "template-editor-image-selection hidden";
  overlayElement.setAttribute("aria-hidden", "true");
  resizeHandle.className = "template-editor-image-resize-handle";
  resizeHandle.type = "button";
  resizeHandle.tabIndex = -1;
  resizeHandle.setAttribute("aria-label", "이미지 크기 조절");
  resizeHandle.addEventListener("pointerdown", handleTemplateEditorImageResizeStart);
  overlayElement.append(resizeHandle);
  overlayContainer.append(overlayElement);
  templateEditorImageOverlay = overlayElement;

  return overlayElement;
}

function updateTemplateEditorImageSelectionOverlay() {
  const overlayElement = ensureTemplateEditorImageOverlay();
  const overlayContainer = getTemplateEditorImageOverlayContainer();
  const selectedImage = state.templateEditor.selectedImageElement;

  if (
    !overlayElement ||
    !overlayContainer ||
    templateEditorModal?.classList.contains("hidden") ||
    !selectedImage ||
    !templateEditorSurface?.contains(selectedImage)
  ) {
    overlayElement?.classList.add("hidden");
    overlayElement?.classList.remove("is-resizing");
    return;
  }

  const imageRect = selectedImage.getBoundingClientRect();
  const overlayRect = overlayContainer.getBoundingClientRect();

  if (imageRect.width < 1 || imageRect.height < 1) {
    overlayElement.classList.add("hidden");
    return;
  }

  overlayElement.style.left = `${Math.round(imageRect.left - overlayRect.left)}px`;
  overlayElement.style.top = `${Math.round(imageRect.top - overlayRect.top)}px`;
  overlayElement.style.width = `${Math.round(imageRect.width)}px`;
  overlayElement.style.height = `${Math.round(imageRect.height)}px`;
  overlayElement.classList.remove("hidden");
}

function selectTemplateEditorImage(imageElement) {
  if (!imageElement || !templateEditorSurface?.contains(imageElement)) {
    clearTemplateEditorImageSelection();
    return;
  }

  if (state.templateEditor.selectedImageElement === imageElement) {
    updateTemplateEditorImageSelectionOverlay();
    return;
  }

  clearTemplateEditorImageSelection();
  state.templateEditor.selectedImageElement = imageElement;
  imageElement.classList.add("is-selected-object");
  clearTemplateEditorActiveCell();
  updateTemplateEditorImageSelectionOverlay();
}

function clearTemplateEditorImageSelection() {
  if (state.templateEditor.imageMoveSession) {
    releaseTemplateEditorImageMoveSession({ sync: false });
  }

  if (state.templateEditor.imageResizeSession) {
    releaseTemplateEditorImageResizeSession({ sync: false });
  }

  if (state.templateEditor.selectedImageElement) {
    state.templateEditor.selectedImageElement.classList.remove("is-selected-object");
  }

  state.templateEditor.selectedImageElement = null;
  templateEditorSurface?.classList.remove("is-image-moving");
  templateEditorSurface?.classList.remove("is-image-resizing");
  templateEditorImageOverlay?.classList.add("hidden");
  templateEditorImageOverlay?.classList.remove("is-resizing");
}

function startTemplateEditorImageMoveSession(imageElement, event) {
  if (!imageElement || !templateEditorSurface?.contains(imageElement)) {
    return;
  }

  state.templateEditor.imageMoveSession = {
    image: imageElement,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: null,
    startTop: null,
    lastLeft: null,
    lastTop: null,
    isActive: false,
    didChange: false,
  };

  window.addEventListener("pointermove", handleTemplateEditorImageMove);
  window.addEventListener("pointerup", handleTemplateEditorImageMoveEnd);
  window.addEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
}

function getTemplateEditorBoundedCoordinate(value, maxValue) {
  const safeMax = Math.max(Math.round(maxValue) || 0, 0);
  return Math.min(Math.max(Math.round(value) || 0, 0), safeMax);
}

function parseTemplateEditorPixelStyle(value, fallback = 0) {
  const parsedValue = Number.parseFloat(String(value || "").replace("px", ""));
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function prepareTemplateEditorImageForMove(imageElement) {
  const documentElement = getTemplateEditorDocumentElement();

  if (!documentElement || !templateEditorSurface?.contains(imageElement)) {
    return null;
  }

  if (imageElement.parentElement === documentElement && imageElement.style.position === "absolute") {
    imageElement.classList.add("is-floating-object");
    return {
      left: parseTemplateEditorPixelStyle(imageElement.style.left, imageElement.offsetLeft),
      top: parseTemplateEditorPixelStyle(imageElement.style.top, imageElement.offsetTop),
    };
  }

  const imageRect = imageElement.getBoundingClientRect();
  const documentRect = documentElement.getBoundingClientRect();
  const boundedLeft = getTemplateEditorBoundedCoordinate(
    imageRect.left - documentRect.left,
    documentElement.clientWidth - imageRect.width,
  );
  const boundedTop = getTemplateEditorBoundedCoordinate(
    imageRect.top - documentRect.top,
    Math.max(documentElement.scrollHeight, documentElement.clientHeight) - imageRect.height,
  );

  imageElement.style.width = `${Math.max(Math.round(imageRect.width), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
  imageElement.style.height = `${Math.max(Math.round(imageRect.height), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
  imageElement.style.position = "absolute";
  imageElement.style.left = `${boundedLeft}px`;
  imageElement.style.top = `${boundedTop}px`;
  imageElement.style.margin = "0";
  imageElement.style.zIndex = "2";
  imageElement.classList.add("is-floating-object");
  documentElement.append(imageElement);

  return {
    left: boundedLeft,
    top: boundedTop,
  };
}

function handleTemplateEditorImageMove(event) {
  const moveSession = state.templateEditor.imageMoveSession;

  if (
    !moveSession ||
    moveSession.pointerId !== event.pointerId ||
    !moveSession.image ||
    !templateEditorSurface?.contains(moveSession.image)
  ) {
    return;
  }

  event.preventDefault();

  const deltaX = event.clientX - moveSession.startX;
  const deltaY = event.clientY - moveSession.startY;

  if (!moveSession.isActive && Math.hypot(deltaX, deltaY) < 4) {
    return;
  }

  if (!moveSession.isActive) {
    const startingPosition = prepareTemplateEditorImageForMove(moveSession.image);

    if (!startingPosition) {
      releaseTemplateEditorImageMoveSession({ sync: false });
      return;
    }

    moveSession.startLeft = startingPosition.left;
    moveSession.startTop = startingPosition.top;
    moveSession.lastLeft = startingPosition.left;
    moveSession.lastTop = startingPosition.top;
    moveSession.isActive = true;
    templateEditorSurface?.classList.add("is-image-moving");
    moveSession.image.classList.add("is-moving-object");
  }

  const documentElement = getTemplateEditorDocumentElement();

  if (!documentElement) {
    return;
  }

  const imageRect = moveSession.image.getBoundingClientRect();
  const nextLeft = getTemplateEditorBoundedCoordinate(
    moveSession.startLeft + deltaX,
    documentElement.clientWidth - imageRect.width,
  );
  const nextTop = getTemplateEditorBoundedCoordinate(
    moveSession.startTop + deltaY,
    Math.max(documentElement.scrollHeight, documentElement.clientHeight) - imageRect.height,
  );

  if (nextLeft === moveSession.lastLeft && nextTop === moveSession.lastTop) {
    return;
  }

  moveSession.lastLeft = nextLeft;
  moveSession.lastTop = nextTop;
  moveSession.didChange = true;
  moveSession.image.style.left = `${nextLeft}px`;
  moveSession.image.style.top = `${nextTop}px`;
  updateTemplateEditorImageSelectionOverlay();
}

function handleTemplateEditorImageMoveEnd(event) {
  const moveSession = state.templateEditor.imageMoveSession;

  if (!moveSession || moveSession.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  releaseTemplateEditorImageMoveSession({ sync: true });
}

function releaseTemplateEditorImageMoveSession({ sync = true } = {}) {
  const moveSession = state.templateEditor.imageMoveSession;

  if (!moveSession) {
    return;
  }

  window.removeEventListener("pointermove", handleTemplateEditorImageMove);
  window.removeEventListener("pointerup", handleTemplateEditorImageMoveEnd);
  window.removeEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
  state.templateEditor.imageMoveSession = null;
  templateEditorSurface?.classList.remove("is-image-moving");
  moveSession.image?.classList.remove("is-moving-object");

  if (sync && moveSession.didChange && moveSession.image && templateEditorSurface?.contains(moveSession.image)) {
    syncTemplateEditorContent();
    selectTemplateEditorImage(moveSession.image);
    return;
  }

  updateTemplateEditorImageSelectionOverlay();
}

function handleTemplateEditorImageResizeStart(event) {
  const selectedImage = state.templateEditor.selectedImageElement;

  if (event.button !== 0 || !selectedImage || !templateEditorSurface?.contains(selectedImage)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const imageRect = selectedImage.getBoundingClientRect();

  state.templateEditor.imageResizeSession = {
    image: selectedImage,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: Math.max(imageRect.width, TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
    startHeight: Math.max(imageRect.height, TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
    lastWidth: Math.max(Math.round(imageRect.width), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
    lastHeight: Math.max(Math.round(imageRect.height), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
    didChange: false,
  };

  templateEditorSurface?.classList.add("is-image-resizing");
  templateEditorImageOverlay?.classList.add("is-resizing");
  window.addEventListener("pointermove", handleTemplateEditorImageResizeMove);
  window.addEventListener("pointerup", handleTemplateEditorImageResizeEnd);
  window.addEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
}

function handleTemplateEditorImageResizeMove(event) {
  const resizeSession = state.templateEditor.imageResizeSession;

  if (
    !resizeSession ||
    resizeSession.pointerId !== event.pointerId ||
    !resizeSession.image ||
    !templateEditorSurface?.contains(resizeSession.image)
  ) {
    return;
  }

  event.preventDefault();

  const widthScale = (resizeSession.startWidth + (event.clientX - resizeSession.startX)) / resizeSession.startWidth;
  const heightScale = (resizeSession.startHeight + (event.clientY - resizeSession.startY)) / resizeSession.startHeight;
  let scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;

  if (!Number.isFinite(scale) || scale <= 0) {
    scale = TEMPLATE_EDITOR_IMAGE_MIN_SIZE / resizeSession.startWidth;
  }

  const nextWidth = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(resizeSession.startWidth * scale));
  const nextHeight = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(resizeSession.startHeight * scale));

  if (nextWidth === resizeSession.lastWidth && nextHeight === resizeSession.lastHeight) {
    return;
  }

  resizeSession.lastWidth = nextWidth;
  resizeSession.lastHeight = nextHeight;
  resizeSession.didChange = true;
  resizeSession.image.style.width = `${nextWidth}px`;
  resizeSession.image.style.height = `${nextHeight}px`;
  updateTemplateEditorImageSelectionOverlay();
}

function handleTemplateEditorImageResizeEnd(event) {
  const resizeSession = state.templateEditor.imageResizeSession;

  if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  releaseTemplateEditorImageResizeSession({ sync: true });
}

function releaseTemplateEditorImageResizeSession({ sync = true } = {}) {
  const resizeSession = state.templateEditor.imageResizeSession;

  if (!resizeSession) {
    return;
  }

  window.removeEventListener("pointermove", handleTemplateEditorImageResizeMove);
  window.removeEventListener("pointerup", handleTemplateEditorImageResizeEnd);
  window.removeEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
  state.templateEditor.imageResizeSession = null;
  templateEditorSurface?.classList.remove("is-image-resizing");
  templateEditorImageOverlay?.classList.remove("is-resizing");

  if (sync && resizeSession.didChange && resizeSession.image && templateEditorSurface?.contains(resizeSession.image)) {
    syncTemplateEditorContent();
    selectTemplateEditorImage(resizeSession.image);
    return;
  }

  updateTemplateEditorImageSelectionOverlay();
}

function saveTemplateEditorSelection() {
  if (!templateEditorSurface || templateEditorModal?.classList.contains("hidden")) {
    return;
  }

  if (state.templateEditor.tableSelectionSession?.isRangeSelecting || getTemplateEditorActiveTableSelection()) {
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !templateEditorSurface.contains(selection.anchorNode)) {
    return;
  }

  state.templateEditor.savedRange = selection.getRangeAt(0).cloneRange();
}

function getTemplateEditorNodePath(node) {
  if (!templateEditorSurface || !node) {
    return null;
  }

  const path = [];
  let currentNode = node;

  while (currentNode && currentNode !== templateEditorSurface) {
    const parentNode = currentNode.parentNode;

    if (!parentNode) {
      return null;
    }

    path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
    currentNode = parentNode;
  }

  return currentNode === templateEditorSurface ? path : null;
}

function resolveTemplateEditorNodePath(path) {
  if (!templateEditorSurface || !Array.isArray(path)) {
    return null;
  }

  let currentNode = templateEditorSurface;

  for (const index of path) {
    currentNode = currentNode?.childNodes?.[index] || null;

    if (!currentNode) {
      return null;
    }
  }

  return currentNode;
}

function getTemplateEditorNodeMaxOffset(node) {
  if (!node) {
    return 0;
  }

  return node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
}

function isTemplateEditorWhitespaceTextNode(node) {
  return node?.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim();
}

function isTemplateEditorTokenElement(node) {
  return node instanceof HTMLElement && node.matches(".template-token[data-template-tag-value]");
}

function getTemplateEditorSelectionToken() {
  if (!templateEditorSurface) {
    return null;
  }

  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
      ? selection.getRangeAt(0)
      : state.templateEditor.savedRange;

  if (!range || !range.collapsed) {
    return null;
  }

  const startNode = range.startContainer;

  if (!startNode || !templateEditorSurface.contains(startNode)) {
    return null;
  }

  if (isTemplateEditorTokenElement(startNode)) {
    return startNode;
  }

  const tokenElement =
    startNode.nodeType === Node.ELEMENT_NODE
      ? startNode.closest?.(".template-token[data-template-tag-value]") || null
      : startNode.parentElement?.closest(".template-token[data-template-tag-value]") || null;

  return tokenElement && templateEditorSurface.contains(tokenElement) ? tokenElement : null;
}

function getTemplateEditorAdjacentNode(parentNode, startIndex, direction) {
  if (!parentNode?.childNodes) {
    return null;
  }

  const step = direction === "backward" ? -1 : 1;
  let currentIndex = startIndex;

  while (currentIndex >= 0 && currentIndex < parentNode.childNodes.length) {
    const siblingNode = parentNode.childNodes[currentIndex];

    if (!isTemplateEditorWhitespaceTextNode(siblingNode)) {
      return siblingNode;
    }

    currentIndex += step;
  }

  return null;
}

function getTemplateEditorBoundaryToken(node, direction) {
  let currentNode = node || null;

  while (currentNode) {
    if (isTemplateEditorWhitespaceTextNode(currentNode)) {
      return null;
    }

    if (isTemplateEditorTokenElement(currentNode)) {
      return currentNode;
    }

    if (!(currentNode instanceof Element) || currentNode.childNodes.length === 0) {
      return null;
    }

    currentNode =
      direction === "backward"
        ? getTemplateEditorAdjacentNode(currentNode, currentNode.childNodes.length - 1, "backward")
        : getTemplateEditorAdjacentNode(currentNode, 0, "forward");
  }

  return null;
}

function getTemplateEditorAdjacentToken(direction) {
  if (!templateEditorSurface) {
    return null;
  }

  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
      ? selection.getRangeAt(0)
      : state.templateEditor.savedRange;

  if (!range || !range.collapsed) {
    return null;
  }

  let currentNode = range.startContainer;
  let currentOffset = range.startOffset;

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textLength = currentNode.textContent?.length || 0;
      const isBoundary = direction === "backward" ? currentOffset === 0 : currentOffset === textLength;

      if (!isBoundary) {
        return null;
      }
    }

    const adjacentNode =
      currentNode.nodeType === Node.TEXT_NODE
        ? getTemplateEditorAdjacentNode(
            currentNode.parentNode,
            Array.prototype.indexOf.call(currentNode.parentNode?.childNodes || [], currentNode) + (direction === "backward" ? -1 : 1),
            direction,
          )
        : getTemplateEditorAdjacentNode(
            currentNode,
            direction === "backward" ? currentOffset - 1 : currentOffset,
            direction,
          );

    const adjacentToken = getTemplateEditorBoundaryToken(adjacentNode, direction);

    if (adjacentToken) {
      return adjacentToken;
    }

    if (adjacentNode) {
      return null;
    }

    if (currentNode === templateEditorSurface) {
      return null;
    }

    const parentNode = currentNode.parentNode;

    if (!parentNode || !templateEditorSurface.contains(parentNode)) {
      return null;
    }

    const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, currentNode);
    currentOffset = direction === "backward" ? currentIndex : currentIndex + 1;
    currentNode = parentNode;
  }

  return null;
}

function setTemplateEditorCollapsedSelection(node, offset) {
  if (!templateEditorSurface || !node) {
    return false;
  }

  const selection = window.getSelection();
  const range = document.createRange();

  try {
    range.setStart(node, Math.min(offset, getTemplateEditorNodeMaxOffset(node)));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    state.templateEditor.savedRange = range.cloneRange();
    return true;
  } catch (error) {
    return false;
  }
}

function removeTemplateEditorAdjacentToken(direction) {
  const targetToken = getTemplateEditorSelectionToken() || getTemplateEditorAdjacentToken(direction);

  if (!targetToken) {
    return false;
  }

  const selection = window.getSelection();
  const activeRange =
    selection && selection.rangeCount > 0 && templateEditorSurface?.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : state.templateEditor.savedRange?.cloneRange();
  const fallbackParent = targetToken.parentNode;
  const fallbackOffset = fallbackParent ? Array.prototype.indexOf.call(fallbackParent.childNodes, targetToken) : 0;

  targetToken.remove();

  if (activeRange && activeRange.startContainer && activeRange.startContainer.isConnected) {
    setTemplateEditorCollapsedSelection(activeRange.startContainer, activeRange.startOffset);
  } else if (fallbackParent) {
    setTemplateEditorCollapsedSelection(fallbackParent, fallbackOffset);
  }

  syncTemplateEditorContent({ preserveSelection: true, focusEditor: true });
  return true;
}

function handleTemplateEditorTokenDeletion(event) {
  if (!templateEditorSurface || templateEditorModal?.classList.contains("hidden")) {
    return false;
  }

  const key = String(event.key || "");
  const direction = key === "Backspace" ? "backward" : key === "Delete" ? "forward" : "";

  if (!direction) {
    return false;
  }

  const didRemove = removeTemplateEditorAdjacentToken(direction);

  if (!didRemove) {
    return false;
  }

  event.preventDefault();
  return true;
}

function createTemplateEditorSelectionSnapshot() {
  if (!templateEditorSurface) {
    return null;
  }

  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
      ? selection.getRangeAt(0)
      : state.templateEditor.savedRange;

  if (!range) {
    return null;
  }

  const startPath = getTemplateEditorNodePath(range.startContainer);
  const endPath = getTemplateEditorNodePath(range.endContainer);

  if (!startPath || !endPath) {
    return null;
  }

  return {
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset,
    collapsed: range.collapsed,
  };
}

function restoreTemplateEditorSelectionSnapshot(snapshot) {
  if (!templateEditorSurface || !snapshot) {
    return false;
  }

  const startNode = resolveTemplateEditorNodePath(snapshot.startPath);
  const endNode = resolveTemplateEditorNodePath(snapshot.endPath);

  if (!startNode || !endNode) {
    return false;
  }

  const range = document.createRange();
  const selection = window.getSelection();

  try {
    range.setStart(startNode, Math.min(snapshot.startOffset, getTemplateEditorNodeMaxOffset(startNode)));
    range.setEnd(endNode, Math.min(snapshot.endOffset, getTemplateEditorNodeMaxOffset(endNode)));
  } catch (error) {
    return false;
  }

  selection.removeAllRanges();
  selection.addRange(range);
  state.templateEditor.savedRange = range.cloneRange();
  return true;
}

function recordTemplateEditorHistorySnapshot({ force = false } = {}) {
  if (!templateEditorSurface || state.templateEditor.isRestoringHistory) {
    return;
  }

  const snapshot = {
    html: getTemplateEditorSerializedHtml(),
    selection: createTemplateEditorSelectionSnapshot(),
  };
  const currentSnapshot = state.templateEditor.historyEntries[state.templateEditor.historyIndex];

  if (!force && currentSnapshot?.html === snapshot.html) {
    if (currentSnapshot) {
      currentSnapshot.selection = snapshot.selection;
    }
    return;
  }

  state.templateEditor.historyEntries = state.templateEditor.historyEntries.slice(0, state.templateEditor.historyIndex + 1);
  state.templateEditor.historyEntries.push(snapshot);

  if (state.templateEditor.historyEntries.length > TEMPLATE_EDITOR_HISTORY_LIMIT) {
    state.templateEditor.historyEntries.shift();
  }

  state.templateEditor.historyIndex = state.templateEditor.historyEntries.length - 1;
}

function initializeTemplateEditorHistory() {
  state.templateEditor.historyEntries = [];
  state.templateEditor.historyIndex = -1;
  recordTemplateEditorHistorySnapshot({ force: true });
}

function applyTemplateEditorHistorySnapshot(snapshot) {
  if (!templateEditorSurface || !snapshot) {
    return;
  }

  state.templateEditor.isRestoringHistory = true;
  clearTemplateEditorImageSelection();
  releaseTemplateEditorTableResizeSession({ sync: false });
  releaseTemplateEditorTableSelectionSession({ keepSelection: false });
  clearTemplateEditorTableSelection();
  templateEditorSurface.innerHTML = snapshot.html;
  decorateTemplateEditorImages(templateEditorSurface);
  syncTemplateEditorContent();

  if (!restoreTemplateEditorSelectionSnapshot(snapshot.selection)) {
    placeCaretAtEnd(templateEditorSurface);
  }

  state.templateEditor.isRestoringHistory = false;
  updateTemplateEditorActiveCell();
  updateTemplateEditorFormattingControls();
  updateTemplateTableControls();
}

function undoTemplateEditorHistory() {
  if (state.templateEditor.historyIndex <= 0) {
    return;
  }

  state.templateEditor.historyIndex -= 1;
  applyTemplateEditorHistorySnapshot(state.templateEditor.historyEntries[state.templateEditor.historyIndex]);
}

function redoTemplateEditorHistory() {
  if (state.templateEditor.historyIndex >= state.templateEditor.historyEntries.length - 1) {
    return;
  }

  state.templateEditor.historyIndex += 1;
  applyTemplateEditorHistorySnapshot(state.templateEditor.historyEntries[state.templateEditor.historyIndex]);
}

function restoreTemplateEditorSelection() {
  if (!templateEditorSurface) {
    return;
  }

  const tableSelection = getTemplateEditorActiveTableSelection();

  if (tableSelection?.anchorCell) {
    focusTemplateEditorCell(tableSelection.anchorCell);
    return;
  }

  templateEditorSurface.focus();

  if (!state.templateEditor.savedRange) {
    placeCaretAtEnd(templateEditorSurface);
    return;
  }

  const selection = window.getSelection();
  selection.removeAllRanges();

  try {
    selection.addRange(state.templateEditor.savedRange);
  } catch (error) {
    placeCaretAtEnd(templateEditorSurface);
  }
}

function updateTemplateEditorActiveCell() {
  if (!templateEditorSurface || templateEditorModal?.classList.contains("hidden")) {
    return;
  }

  clearTemplateEditorActiveCell();

  if (state.templateEditor.selectedImageElement && templateEditorSurface.contains(state.templateEditor.selectedImageElement)) {
    return;
  }

  if (getTemplateEditorActiveTableSelection()) {
    return;
  }

  const activeCell = getTemplateEditorSelectedCell();

  if (activeCell) {
    activeCell.classList.add("is-active-cell");
  }
}

function clearTemplateEditorActiveCell() {
  if (!templateEditorSurface) {
    return;
  }

  templateEditorSurface
    .querySelectorAll(".is-active-cell")
    .forEach((cell) => cell.classList.remove("is-active-cell"));
}

function syncTemplateEditorContent(options = {}) {
  if (!templateEditorSurface) {
    return;
  }

  const preserveSelection = Boolean(options.preserveSelection);
  const focusEditor = Boolean(options.focusEditor);
  const selectionSnapshot = preserveSelection ? createTemplateEditorSelectionSnapshot() : null;

  normalizeTemplateEditorFontNodes(templateEditorSurface);
  normalizeTemplateTagNodes(templateEditorSurface);
  normalizeTemplateEditorTables(templateEditorSurface);
  decorateTemplateEditorImages(templateEditorSurface);
  if (!getTemplateEditorActiveTableSelection()) {
    clearTemplateEditorTableSelection();
  }

  const serializedHtml = getTemplateEditorSerializedHtml();
  state.templateEditor.draftHtml = serializedHtml;
  state.templateEditor.hasOverflow = isTemplateEditorOverflow();

  if (state.templateEditor.hasOverflow) {
    setTemplateEditorStatus("A4 영역을 초과했습니다. 편집은 가능하지만 저장 전 내용 길이를 줄여야 합니다.", "warning");
  } else {
    state.templateEditor.lastValidHtml = serializedHtml;
    setTemplateEditorStatus("A4 영역 안에서 편집 중입니다.");
  }

  if (selectionSnapshot && focusEditor) {
    templateEditorSurface.focus();
  }

  if (!(selectionSnapshot && restoreTemplateEditorSelectionSnapshot(selectionSnapshot))) {
    saveTemplateEditorSelection();
  }

  recordTemplateEditorHistorySnapshot();
  updateTemplateEditorActiveCell();
  updateTemplateEditorFormattingControls();
  if (state.templateEditor.selectedImageElement && !templateEditorSurface.contains(state.templateEditor.selectedImageElement)) {
    clearTemplateEditorImageSelection();
  } else {
    updateTemplateEditorImageSelectionOverlay();
  }
}

function isTemplateEditorOverflow() {
  if (!templateEditorSurface) {
    return false;
  }

  const heightOverflow = templateEditorSurface.scrollHeight - templateEditorSurface.clientHeight;
  const widthOverflow = templateEditorSurface.scrollWidth - templateEditorSurface.clientWidth;

  return (
    heightOverflow > 12 ||
    widthOverflow > 12
  );
}

function setTemplateEditorStatus(message, type = "") {
  state.templateEditor.statusMessage = message;
  state.templateEditor.statusType = type;

  if (!templateEditorStatus) {
    return;
  }

  templateEditorStatus.textContent = message;
  templateEditorStatus.classList.toggle("warning", type === "warning");
}

function normalizeTemplateTag(rawTag) {
  const label = String(rawTag || "")
    .trim()
    .replace(/^@\{?/, "")
    .replace(/^#/, "")
    .replace(/\}$/, "");

  if (!label) {
    return "";
  }

  const matchedDefinition = templateTagDefinitions.find((definition) =>
    (Array.isArray(definition.aliases) ? definition.aliases : [definition.label]).includes(label),
  );
  return matchedDefinition?.token || `@{${label}}`;
}

function getTemplateEditorTagText(rawTag) {
  const normalizedTag = normalizeTemplateTag(rawTag);

  if (!normalizedTag) {
    return "";
  }

  return `#${normalizedTag.replace(/^@\{/, "").replace(/\}$/, "")}`;
}

function setTemplateTokenTextPreservingMarkup(tokenElement, nextText) {
  if (!(tokenElement instanceof Element)) {
    return;
  }

  const normalizedText = String(nextText ?? "");
  const textNodes = [];
  const walker = document.createTreeWalker(tokenElement, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  const meaningfulTextNodes = textNodes.filter((textNode) => String(textNode.textContent || "").replace(/\u00a0/g, " ").trim() !== "");

  if (meaningfulTextNodes.length === 0) {
    tokenElement.textContent = normalizedText;
    return;
  }

  meaningfulTextNodes[0].textContent = normalizedText;
  meaningfulTextNodes.slice(1).forEach((textNode) => textNode.remove());
}

function buildTemplateTokenHtml(rawTag) {
  const normalizedTag = normalizeTemplateTag(rawTag);
  const editorTagText = getTemplateEditorTagText(normalizedTag);

  if (!normalizedTag || !editorTagText) {
    return "";
  }

  return `<span class="template-token" data-template-tag-value="${escapeAttribute(normalizedTag)}">${escapeHtml(
    editorTagText,
  )}</span>`;
}

function createTemplateTokenElement(rawTag) {
  const normalizedTag = normalizeTemplateTag(rawTag);
  const editorTagText = getTemplateEditorTagText(normalizedTag);
  const tokenElement = document.createElement("span");

  tokenElement.className = "template-token";
  tokenElement.dataset.templateTagValue = normalizedTag;
  tokenElement.textContent = editorTagText;
  return tokenElement;
}

function getTemplateTagMatcher() {
  const labels = Array.from(
    new Set(
      templateTagDefinitions.flatMap((definition) =>
        (Array.isArray(definition.aliases) ? definition.aliases : [definition.label]).map((label) => escapeRegExp(label)),
      ),
    ),
  ).join("|");
  return new RegExp(`@\\{(${labels})\\}|@(${labels})|#(${labels})`, "g");
}

function stripTemplateEditorTransientState(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement
    .querySelectorAll(".template-editor-image-selection, .template-editor-image-resize-handle")
    .forEach((element) => element.remove());

  const transientClassNames = [
    "template-editor-image-object",
    "is-selected-object",
    "is-moving-object",
    "is-floating-object",
    "is-active-cell",
    "is-selected-cell",
  ];
  const transientSelector = transientClassNames.map((className) => `.${className}`).join(", ");

  rootElement.querySelectorAll(transientSelector).forEach((element) => {
    transientClassNames.forEach((className) => element.classList.remove(className));
  });

  rootElement.querySelectorAll("img[draggable]").forEach((imageElement) => {
    imageElement.removeAttribute("draggable");
  });

  rootElement.querySelectorAll("img[contenteditable]").forEach((imageElement) => {
    imageElement.removeAttribute("contenteditable");
  });
}

function normalizeTemplateEditorFontNodes(rootElement, { appliedFontSizePx = null } = {}) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  const legacyFontSizeMap = {
    1: 10,
    2: 13,
    3: 16,
    4: 18,
    5: 24,
    6: 32,
    7: 48,
  };

  rootElement.querySelectorAll("font").forEach((fontElement) => {
    const replacementSpan = document.createElement("span");
    const inlineStyle = String(fontElement.getAttribute("style") || "").trim();
    const face = String(fontElement.getAttribute("face") || "").trim();
    const color = String(fontElement.getAttribute("color") || "").trim();
    const size = String(fontElement.getAttribute("size") || "").trim();

    if (inlineStyle) {
      replacementSpan.setAttribute("style", inlineStyle);
    }

    if (face) {
      replacementSpan.style.fontFamily = face;
    }

    if (color) {
      replacementSpan.style.color = color;
    }

    const mappedFontSize =
      size === "7" && appliedFontSizePx ? appliedFontSizePx : legacyFontSizeMap[Number(size)] || null;

    if (mappedFontSize) {
      replacementSpan.style.fontSize = `${mappedFontSize}px`;
    }

    while (fontElement.firstChild) {
      replacementSpan.appendChild(fontElement.firstChild);
    }

    fontElement.replaceWith(replacementSpan);
  });
}

function normalizeTemplateEditorInlineFontSizeStyles(rootElement, appliedFontSizePx = null) {
  if (!rootElement?.querySelectorAll || !appliedFontSizePx) {
    return;
  }

  rootElement.querySelectorAll("[style]").forEach((element) => {
    const fontSizeValue = String(element.style.fontSize || "").trim();

    if (!fontSizeValue || fontSizeValue.endsWith("px")) {
      return;
    }

    element.style.fontSize = `${appliedFontSizePx}px`;
  });
}

function normalizeTemplateTagNodes(rootElement) {
  if (!rootElement) {
    return;
  }

  rootElement.querySelectorAll("[data-template-tag-value]").forEach((tokenElement) => {
    const normalizedTag = normalizeTemplateTag(tokenElement.dataset.templateTagValue || tokenElement.textContent || "");
    tokenElement.classList.remove("template-data-fit");
    tokenElement.classList.add("template-token");
    tokenElement.dataset.templateTagValue = normalizedTag;
    setTemplateTokenTextPreservingMarkup(tokenElement, getTemplateEditorTagText(normalizedTag));
  });

  const tagMatcher = getTemplateTagMatcher();
  const textNodes = [];
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const currentNode = walker.currentNode;

    if (!currentNode.parentElement || currentNode.parentElement.closest("[data-template-tag-value]")) {
      continue;
    }

    textNodes.push(currentNode);
  }

  textNodes.forEach((textNode) => {
    const sourceText = textNode.textContent || "";
    tagMatcher.lastIndex = 0;

    if (!tagMatcher.test(sourceText)) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    sourceText.replace(tagMatcher, (matchedText, bracedLabel, plainLabel, hashLabel, offset) => {
      const label = bracedLabel || plainLabel || hashLabel;

      if (offset > lastIndex) {
        fragment.append(sourceText.slice(lastIndex, offset));
      }

      fragment.append(createTemplateTokenElement(`@{${label}}`));
      lastIndex = offset + matchedText.length;
      return matchedText;
    });

    if (lastIndex < sourceText.length) {
      fragment.append(sourceText.slice(lastIndex));
    }

    textNode.replaceWith(fragment);
  });
}

function prepareTemplateEditorContent(templateHtml) {
  const container = document.createElement("div");
  container.innerHTML = String(templateHtml || "");
  stripTemplateEditorTransientState(container);
  normalizeTemplateEditorFontNodes(container);
  normalizeTemplateTagNodes(container);
  normalizeTemplateEditorTables(container);

  if (!container.querySelector(".template-doc")) {
    const wrapper = document.createElement("div");
    wrapper.className = "template-doc";
    wrapper.innerHTML = container.innerHTML;
    container.innerHTML = "";
    container.append(wrapper);
  }

  decorateTemplateEditorImages(container);

  return container.innerHTML;
}

function getTemplateEditorSerializedHtml() {
  if (!templateEditorSurface) {
    return "";
  }

  const clone = templateEditorSurface.cloneNode(true);
  clone.querySelectorAll("[data-template-tag-value]").forEach((tokenElement) => {
    const normalizedTag = normalizeTemplateTag(tokenElement.dataset.templateTagValue || tokenElement.textContent || "");
    tokenElement.classList.remove("template-data-fit");
    tokenElement.classList.add("template-token");
    tokenElement.dataset.templateTagValue = normalizedTag;
    setTemplateTokenTextPreservingMarkup(tokenElement, getTemplateEditorTagText(normalizedTag));
  });
  stripTemplateEditorTransientState(clone);
  normalizeTemplateEditorFontNodes(clone);
  return clone.innerHTML;
}

function getTemplateEditorSelectionNode() {
  const selection = window.getSelection();
  const activeNode = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
  const baseElement = activeNode?.nodeType === Node.ELEMENT_NODE ? activeNode : activeNode?.parentElement;

  if (baseElement && templateEditorSurface?.contains(baseElement)) {
    return activeNode;
  }

  return state.templateEditor.savedRange?.startContainer || null;
}

function getClosestTemplateEditorElement(node, selector) {
  const baseElement = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

  if (!baseElement || !templateEditorSurface?.contains(baseElement)) {
    return null;
  }

  return baseElement.closest(selector);
}

function getTemplateEditorTableCellTarget(target) {
  const baseElement =
    target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
  const cell = baseElement?.closest("td, th") || null;

  if (!cell || !templateEditorSurface?.contains(cell)) {
    return null;
  }

  return cell;
}

function getTemplateEditorActiveTableSelection() {
  const selection = state.templateEditor.tableSelection;

  if (!selection?.anchorCell || !templateEditorSurface?.contains(selection.anchorCell)) {
    return null;
  }

  return selection;
}

function getTemplateEditorSelectedCell() {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (tableSelection?.anchorCell) {
    return tableSelection.anchorCell;
  }

  return getClosestTemplateEditorElement(getTemplateEditorSelectionNode(), "td, th");
}

function getTemplateEditorSelectedTable() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (selectedCell) {
    return selectedCell.closest("table");
  }

  return getClosestTemplateEditorElement(getTemplateEditorSelectionNode(), "table");
}

function getTemplateEditorSizeScopeCells(selectedCell, scope) {
  const table = selectedCell?.closest("table");

  if (!table || !selectedCell) {
    return [];
  }

  if (scope === "cell") {
    return [selectedCell];
  }

  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [selectedCell];
  }

  const targetCells = new Set();

  if (scope === "row") {
    (matrix[selectedEntry.rowIndex] || []).forEach((cell) => {
      if (cell) {
        targetCells.add(cell);
      }
    });
  }

  if (scope === "column") {
    matrix.forEach((row) => {
      const cell = row?.[selectedEntry.colIndex];

      if (cell) {
        targetCells.add(cell);
      }
    });
  }

  if (scope === "table") {
    entries.forEach((entry) => {
      targetCells.add(entry.cell);
    });
  }

  return Array.from(targetCells);
}

function getTemplateEditorPixelValue(element, property) {
  if (!element) {
    return "";
  }

  const rect = element.getBoundingClientRect();
  const pixelValue = property === "height" ? rect.height : rect.width;

  if (!Number.isFinite(pixelValue) || pixelValue <= 0) {
    return "";
  }

  return String(Math.round(pixelValue));
}

function normalizeTemplateEditorColorValue(rawValue, fallbackValue = "#ffffff") {
  const normalizedValue = String(rawValue || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
    return normalizedValue.toLowerCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(normalizedValue)) {
    const [, shortHex = ""] = normalizedValue.match(/^#([0-9a-f]{3})$/i) || [];
    return `#${shortHex.split("").map((value) => value.repeat(2)).join("").toLowerCase()}`;
  }

  const rgbMatch = normalizedValue.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);

  if (rgbMatch) {
    const [, red = "255", green = "255", blue = "255"] = rgbMatch;
    return `#${[red, green, blue]
      .map((value) => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return fallbackValue;
}

function getTemplateEditorCellShadingValue(cell) {
  if (!cell) {
    return "#ffffff";
  }

  const fallbackValue = cell.tagName === "TH" ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND : "#ffffff";
  return normalizeTemplateEditorColorValue(cell.style.backgroundColor || window.getComputedStyle(cell).backgroundColor, fallbackValue);
}

function updateTemplateEditorFormattingControls() {
  if (
    !templateEditorSurface ||
    !templateEditorModal ||
    templateEditorModal.classList.contains("hidden") ||
    document.activeElement === templateEditorFontFamily ||
    document.activeElement === templateEditorFontSize ||
    document.activeElement === templateEditorTextColor ||
    document.activeElement === templateEditorTextShading
  ) {
    return;
  }

  const selectionNode = getTemplateEditorSelectionNode();
  const contextElement = getTemplateEditorFormattingTargetCells()[0] || getTemplateEditorSelectedCell();

  updateEditorToolbarFormattingState({
    rootElement: templateEditorSurface,
    commandAttributeName: "data-template-command",
    fontFamilyElement: templateEditorFontFamily,
    fontSizeElement: templateEditorFontSize,
    textColorElement: templateEditorTextColor,
    textShadingElement: templateEditorTextShading,
    selectionNode,
    contextElement,
    defaultFontFamily: TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY,
    defaultFontSize: TEMPLATE_EDITOR_DEFAULT_FONT_SIZE,
  });
}

function updateTemplateTableControls() {
  if (
    !templateEditorModal ||
    templateEditorModal.classList.contains("hidden") ||
    document.activeElement === templateEditorCellWidth ||
    document.activeElement === templateEditorRowHeight ||
    document.activeElement === templateEditorCellShading
  ) {
    return;
  }

  const selectedCell = getTemplateEditorSelectedCell();

  if (templateEditorCellWidth) {
    templateEditorCellWidth.value = getTemplateEditorPixelValue(selectedCell, "width");
  }

  if (templateEditorRowHeight) {
    templateEditorRowHeight.value = getTemplateEditorPixelValue(selectedCell, "height");
  }

  if (templateEditorCellShading) {
    syncEditorToolbarColorControls({
      colorInputElement: templateEditorCellShading,
      colorValue: getTemplateEditorCellShadingValue(selectedCell),
      fallbackValue: "#ffffff",
    });
  }
}

function focusTemplateEditorCell(cell) {
  if (!templateEditorSurface) {
    return;
  }

  if (!cell) {
    placeCaretAtEnd(templateEditorSurface);
    return;
  }

  if (!String(cell.innerHTML || "").trim()) {
    cell.innerHTML = "<br />";
  }

  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(cell);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  state.templateEditor.savedRange = range.cloneRange();
  updateTemplateEditorActiveCell();
  updateTemplateEditorFormattingControls();
}

function createTemplateTableCell(tagName, sourceCell = null) {
  const cell = document.createElement(tagName.toLowerCase());
  cell.innerHTML = tagName.toUpperCase() === "TH" ? "제목" : "<br />";
  applyTemplateTableCellPresentation(cell, sourceCell);
  return cell;
}

function applyTemplateTableCellPresentation(cell, sourceCell = null) {
  const computedStyle = sourceCell ? window.getComputedStyle(sourceCell) : null;
  const nextPadding = sourceCell?.style.padding || computedStyle?.padding || TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING;
  const nextTextAlign = sourceCell?.style.textAlign || computedStyle?.textAlign || "left";
  const nextVerticalAlign = sourceCell?.style.verticalAlign || computedStyle?.verticalAlign || "top";
  const nextBackgroundColor =
    sourceCell?.style.backgroundColor ||
    (cell.tagName === "TH" ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND : "");

  cell.style.border = TEMPLATE_EDITOR_DEFAULT_TABLE_BORDER;
  cell.style.padding = nextPadding;
  cell.style.textAlign = nextTextAlign;
  cell.style.verticalAlign = nextVerticalAlign;

  if (nextBackgroundColor) {
    cell.style.backgroundColor = normalizeTemplateEditorColorValue(
      nextBackgroundColor,
      cell.tagName === "TH" ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND : "#ffffff",
    );
  } else {
    cell.style.removeProperty("background-color");
  }
}

function normalizeTemplateEditorTableAppearance(table) {
  if (!(table instanceof HTMLTableElement)) {
    return;
  }

  if (!String(table.style.width || "").trim()) {
    table.style.width = "100%";
  }

  table.style.borderCollapse = "collapse";
  table.style.tableLayout = "fixed";

  Array.from(table.rows).forEach((row) => {
    Array.from(row.cells).forEach((cell) => {
      applyTemplateTableCellPresentation(cell, cell);
    });
  });

  ensureTemplateEditorTableColGroup(table);
}

function normalizeTemplateEditorTables(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement.querySelectorAll("table").forEach((table) => {
    normalizeTemplateEditorTableAppearance(table);
  });
}

function buildTemplateTableCellMap(table) {
  const matrix = [];
  const entries = new Map();

  Array.from(table.rows).forEach((row, rowIndex) => {
    let columnIndex = 0;
    matrix[rowIndex] = matrix[rowIndex] || [];

    Array.from(row.cells).forEach((cell) => {
      while (matrix[rowIndex][columnIndex]) {
        columnIndex += 1;
      }

      const rowSpan = Math.max(Number(cell.rowSpan) || 1, 1);
      const colSpan = Math.max(Number(cell.colSpan) || 1, 1);
      const entry = {
        cell,
        row,
        rowIndex,
        colIndex: columnIndex,
        rowSpan,
        colSpan,
      };

      entries.set(cell, entry);

      for (let nextRowIndex = rowIndex; nextRowIndex < rowIndex + rowSpan; nextRowIndex += 1) {
        matrix[nextRowIndex] = matrix[nextRowIndex] || [];

        for (let nextColIndex = columnIndex; nextColIndex < columnIndex + colSpan; nextColIndex += 1) {
          matrix[nextRowIndex][nextColIndex] = cell;
        }
      }

      columnIndex += colSpan;
    });
  });

  return {
    matrix,
    entries,
  };
}

function getTemplateEditorTableColumnCount(matrix) {
  return matrix.reduce((maxColumnCount, row) => Math.max(maxColumnCount, row?.length || 0), 0);
}

function getTemplateEditorMeasuredColumnWidth(cellMap, columnIndex) {
  const { matrix, entries } = cellMap;

  for (const row of matrix) {
    const cell = row?.[columnIndex];
    const entry = cell ? entries.get(cell) : null;

    if (!entry) {
      continue;
    }

    const measuredWidth = Math.round(cell.getBoundingClientRect().width / entry.colSpan);

    if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
      return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, measuredWidth);
    }
  }

  return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
}

function ensureTemplateEditorTableColGroup(table) {
  const cellMap = buildTemplateTableCellMap(table);
  const columnCount = getTemplateEditorTableColumnCount(cellMap.matrix);
  let colGroup = Array.from(table.children).find((child) => child.tagName === "COLGROUP") || null;

  if (!colGroup) {
    colGroup = document.createElement("colgroup");
    table.insertBefore(colGroup, table.firstElementChild);
  }

  while (colGroup.children.length < columnCount) {
    colGroup.appendChild(document.createElement("col"));
  }

  while (colGroup.children.length > columnCount) {
    colGroup.lastElementChild?.remove();
  }

  const columns = Array.from(colGroup.children);

  columns.forEach((columnElement, columnIndex) => {
    const currentWidth = parseTemplateEditorPixelStyle(columnElement.style.width, 0);

    if (!currentWidth || currentWidth < TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
      columnElement.style.width = `${getTemplateEditorMeasuredColumnWidth(cellMap, columnIndex)}px`;
    }
  });

  return {
    columns,
    cellMap,
  };
}

function syncTemplateEditorTableWidth(table, columns = []) {
  const targetColumns = columns.length > 0 ? columns : ensureTemplateEditorTableColGroup(table).columns;
  const totalWidth = targetColumns.reduce((widthSum, columnElement) => {
    const columnWidth = parseTemplateEditorPixelStyle(columnElement.style.width, TEMPLATE_EDITOR_TABLE_MIN_SIZE);
    return widthSum + Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, columnWidth);
  }, 0);

  table.style.width = `${totalWidth}px`;
  table.style.maxWidth = "none";
}

function getTemplateEditorTableMaxWidth(table) {
  const documentElement = table?.closest(".template-doc") || getTemplateEditorDocumentElement();

  if (documentElement) {
    const documentWidth = Math.floor(documentElement.clientWidth);

    if (documentWidth > 0) {
      return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, documentWidth);
    }
  }

  if (templateEditorSurface) {
    const surfaceStyle = window.getComputedStyle(templateEditorSurface);
    const horizontalPadding =
      parseTemplateEditorPixelStyle(surfaceStyle.paddingLeft, 0) + parseTemplateEditorPixelStyle(surfaceStyle.paddingRight, 0);
    const availableWidth = Math.floor(templateEditorSurface.clientWidth - horizontalPadding);

    if (availableWidth > 0) {
      return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, availableWidth);
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function getTemplateEditorClampedColumnGroupWidth(table, columns, columnIndexes, requestedTotalWidth) {
  const normalizedIndexes = Array.from(new Set((columnIndexes || []).filter((index) => Number.isInteger(index) && index >= 0))).sort(
    (leftIndex, rightIndex) => leftIndex - rightIndex,
  );

  if (normalizedIndexes.length === 0) {
    return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(requestedTotalWidth));
  }

  const minTotalWidth = TEMPLATE_EDITOR_TABLE_MIN_SIZE * normalizedIndexes.length;
  const safeRequestedWidth = Math.max(minTotalWidth, Math.round(requestedTotalWidth));
  const currentWidths = columns.map((columnElement) =>
    Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, parseTemplateEditorPixelStyle(columnElement.style.width, TEMPLATE_EDITOR_TABLE_MIN_SIZE)),
  );
  const currentTableWidth = currentWidths.reduce((widthSum, columnWidth) => widthSum + columnWidth, 0);
  const currentTargetWidth = normalizedIndexes.reduce(
    (widthSum, columnIndex) => widthSum + (currentWidths[columnIndex] || TEMPLATE_EDITOR_TABLE_MIN_SIZE),
    0,
  );
  const tableMaxWidth = getTemplateEditorTableMaxWidth(table);

  if (safeRequestedWidth <= currentTargetWidth) {
    return safeRequestedWidth;
  }

  const maxExpandableWidth =
    currentTableWidth > tableMaxWidth ? currentTargetWidth : currentTargetWidth + Math.max(0, tableMaxWidth - currentTableWidth);

  return Math.min(safeRequestedWidth, Math.max(minTotalWidth, maxExpandableWidth));
}

function getTemplateEditorTableLogicalColumnWidth(table, columnIndex) {
  const { columns, cellMap } = ensureTemplateEditorTableColGroup(table);
  const columnElement = columns[columnIndex];
  const configuredWidth = parseTemplateEditorPixelStyle(columnElement?.style.width, 0);

  if (configuredWidth >= TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
    return configuredWidth;
  }

  return getTemplateEditorMeasuredColumnWidth(cellMap, columnIndex);
}

function setTemplateEditorTableLogicalColumnWidth(table, columnIndex, width) {
  const { columns } = ensureTemplateEditorTableColGroup(table);
  const columnElement = columns[columnIndex];

  if (!columnElement) {
    return false;
  }

  const safeWidth = getTemplateEditorClampedColumnGroupWidth(table, columns, [columnIndex], width);
  columnElement.style.width = `${safeWidth}px`;
  syncTemplateEditorTableWidth(table, columns);
  return true;
}

function getTemplateEditorSizeScopeColumnIndexes(selectedCell, scope) {
  const table = selectedCell?.closest("table");

  if (!table || !selectedCell) {
    return [];
  }

  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [];
  }

  const columnIndexes = new Set();
  const addColumnRange = (startIndex, span) => {
    for (let columnIndex = startIndex; columnIndex < startIndex + span; columnIndex += 1) {
      columnIndexes.add(columnIndex);
    }
  };

  if (scope === "cell" || scope === "column") {
    addColumnRange(selectedEntry.colIndex, selectedEntry.colSpan);
  }

  if (scope === "row") {
    (matrix[selectedEntry.rowIndex] || []).forEach((cell, columnIndex) => {
      if (cell) {
        columnIndexes.add(columnIndex);
      }
    });
  }

  if (scope === "table") {
    const columnCount = getTemplateEditorTableColumnCount(matrix);

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      columnIndexes.add(columnIndex);
    }
  }

  return Array.from(columnIndexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
}

function applyTemplateEditorTableCellWidth(cell, width) {
  const table = cell?.closest("table");

  if (!table || !cell) {
    return false;
  }

  const { entries } = buildTemplateTableCellMap(table);
  const entry = entries.get(cell);

  if (!entry) {
    return false;
  }

  const { columns } = ensureTemplateEditorTableColGroup(table);
  const targetColumnIndexes = Array.from({ length: entry.colSpan }, (_, offset) => entry.colIndex + offset);
  const safeWidth = getTemplateEditorClampedColumnGroupWidth(table, columns, targetColumnIndexes, width);
  const baseWidth = Math.floor(safeWidth / entry.colSpan);
  const remainder = safeWidth - baseWidth * entry.colSpan;

  for (let offset = 0; offset < entry.colSpan; offset += 1) {
    const nextWidth = baseWidth + (offset === entry.colSpan - 1 ? remainder : 0);
    setTemplateEditorTableLogicalColumnWidth(table, entry.colIndex + offset, nextWidth);
  }

  cell.style.width = `${safeWidth}px`;
  return true;
}

function getTemplateEditorMedianValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
  }

  const sortedValues = [...values]
    .filter((value) => Number.isFinite(value))
    .sort((leftValue, rightValue) => leftValue - rightValue);

  if (sortedValues.length === 0) {
    return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
  }

  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return Math.round(sortedValues[middleIndex]);
  }

  return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
}

function getTemplateEditorEqualizeColumnIndexes(table, selectedCell) {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (tableSelection?.table === table) {
    return Array.from(
      { length: tableSelection.endColIndex - tableSelection.startColIndex + 1 },
      (_, index) => tableSelection.startColIndex + index,
    );
  }

  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [];
  }

  return (matrix[selectedEntry.rowIndex] || [])
    .map((cell, columnIndex) => (cell ? columnIndex : null))
    .filter((columnIndex) => columnIndex !== null);
}

function getTemplateEditorEqualizeRowIndexes(table, selectedCell) {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (tableSelection?.table === table) {
    return Array.from(
      { length: tableSelection.endRowIndex - tableSelection.startRowIndex + 1 },
      (_, index) => tableSelection.startRowIndex + index,
    );
  }

  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [];
  }

  return matrix
    .map((row, rowIndex) => (row?.[selectedEntry.colIndex] ? rowIndex : null))
    .filter((rowIndex) => rowIndex !== null);
}

function getTemplateEditorTableLogicalRowHeight(table, rowIndex) {
  const targetRow = table?.rows?.[rowIndex];

  if (!targetRow) {
    return TEMPLATE_EDITOR_TABLE_MIN_SIZE;
  }

  const configuredHeight = parseTemplateEditorPixelStyle(targetRow.style.height, 0);

  if (configuredHeight >= TEMPLATE_EDITOR_TABLE_MIN_SIZE) {
    return configuredHeight;
  }

  return Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(targetRow.getBoundingClientRect().height));
}

function setTemplateEditorTableLogicalRowHeight(table, rowIndex, height) {
  const targetRow = table?.rows?.[rowIndex];

  if (!targetRow) {
    return false;
  }

  const safeHeight = Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(height));
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const rowCells = new Set();

  (matrix[rowIndex] || []).forEach((cell) => {
    const entry = cell ? entries.get(cell) : null;

    if (entry && entry.rowIndex === rowIndex) {
      rowCells.add(cell);
    }
  });

  targetRow.style.height = `${safeHeight}px`;
  rowCells.forEach((cell) => {
    cell.style.height = `${safeHeight}px`;
  });

  return true;
}

function equalizeTemplateTableColumnWidths() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열 너비를 맞추세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const targetColumnIndexes = getTemplateEditorEqualizeColumnIndexes(table, selectedCell);

  if (targetColumnIndexes.length === 0) {
    setTemplateEditorStatus("같은 너비로 맞출 열을 찾을 수 없습니다.", "warning");
    return selectedCell;
  }

  const medianWidth = getTemplateEditorMedianValue(
    targetColumnIndexes.map((columnIndex) => getTemplateEditorTableLogicalColumnWidth(table, columnIndex)),
  );

  targetColumnIndexes.forEach((columnIndex) => {
    setTemplateEditorTableLogicalColumnWidth(table, columnIndex, medianWidth);
  });

  return selectedCell;
}

function equalizeTemplateTableRowHeights() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행 높이를 맞추세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const targetRowIndexes = getTemplateEditorEqualizeRowIndexes(table, selectedCell);

  if (targetRowIndexes.length === 0) {
    setTemplateEditorStatus("같은 높이로 맞출 행을 찾을 수 없습니다.", "warning");
    return selectedCell;
  }

  const medianHeight = getTemplateEditorMedianValue(
    targetRowIndexes.map((rowIndex) => getTemplateEditorTableLogicalRowHeight(table, rowIndex)),
  );

  targetRowIndexes.forEach((rowIndex) => {
    setTemplateEditorTableLogicalRowHeight(table, rowIndex, medianHeight);
  });

  return selectedCell;
}

function getTemplateEditorTableSelectionRange(anchorCell, focusCell) {
  const table = anchorCell?.closest("table");

  if (!table || table !== focusCell?.closest("table")) {
    return null;
  }

  const { matrix, entries } = buildTemplateTableCellMap(table);
  const anchorEntry = entries.get(anchorCell);
  const focusEntry = entries.get(focusCell);

  if (!anchorEntry || !focusEntry) {
    return null;
  }

  let startRowIndex = Math.min(anchorEntry.rowIndex, focusEntry.rowIndex);
  let endRowIndex = Math.max(
    anchorEntry.rowIndex + anchorEntry.rowSpan - 1,
    focusEntry.rowIndex + focusEntry.rowSpan - 1,
  );
  let startColIndex = Math.min(anchorEntry.colIndex, focusEntry.colIndex);
  let endColIndex = Math.max(
    anchorEntry.colIndex + anchorEntry.colSpan - 1,
    focusEntry.colIndex + focusEntry.colSpan - 1,
  );

  let didExpand = true;

  while (didExpand) {
    didExpand = false;

    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
      for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex += 1) {
        const cell = matrix[rowIndex]?.[colIndex];
        const entry = cell ? entries.get(cell) : null;

        if (!entry) {
          continue;
        }

        const entryEndRowIndex = entry.rowIndex + entry.rowSpan - 1;
        const entryEndColIndex = entry.colIndex + entry.colSpan - 1;

        if (entry.rowIndex < startRowIndex) {
          startRowIndex = entry.rowIndex;
          didExpand = true;
        }

        if (entryEndRowIndex > endRowIndex) {
          endRowIndex = entryEndRowIndex;
          didExpand = true;
        }

        if (entry.colIndex < startColIndex) {
          startColIndex = entry.colIndex;
          didExpand = true;
        }

        if (entryEndColIndex > endColIndex) {
          endColIndex = entryEndColIndex;
          didExpand = true;
        }
      }
    }
  }

  const selectedCells = [];
  const selectedCellSet = new Set();

  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
    for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex += 1) {
      const cell = matrix[rowIndex]?.[colIndex];

      if (cell && !selectedCellSet.has(cell)) {
        selectedCellSet.add(cell);
        selectedCells.push(cell);
      }
    }
  }

  selectedCells.sort((leftCell, rightCell) => {
    const leftEntry = entries.get(leftCell);
    const rightEntry = entries.get(rightCell);

    if (!leftEntry || !rightEntry) {
      return 0;
    }

    return leftEntry.rowIndex - rightEntry.rowIndex || leftEntry.colIndex - rightEntry.colIndex;
  });

  return {
    table,
    anchorCell,
    focusCell,
    selectedCells,
    startRowIndex,
    endRowIndex,
    startColIndex,
    endColIndex,
  };
}

function clearTemplateEditorTableSelection() {
  if (templateEditorSurface) {
    templateEditorSurface
      .querySelectorAll(".is-selected-cell")
      .forEach((cell) => cell.classList.remove("is-selected-cell"));
  }

  state.templateEditor.tableSelection = null;
}

function applyTemplateEditorTableSelection(anchorCell, focusCell) {
  const nextSelection = getTemplateEditorTableSelectionRange(anchorCell, focusCell);

  clearTemplateEditorTableSelection();

  if (!nextSelection) {
    return null;
  }

  nextSelection.selectedCells.forEach((cell) => cell.classList.add("is-selected-cell"));
  state.templateEditor.tableSelection = nextSelection;
  updateTemplateTableControls();
  return nextSelection;
}

function updateTemplateEditorTableHoverState(event) {
  if (
    !templateEditorSurface ||
    templateEditorModal?.classList.contains("hidden") ||
    state.templateEditor.tableResizeSession ||
    state.templateEditor.tableSelectionSession ||
    state.templateEditor.imageMoveSession ||
    state.templateEditor.imageResizeSession
  ) {
    clearTemplateEditorTableHoverState();
    return;
  }

  const hoverCell = getTemplateEditorTableCellTarget(event.target);
  const resizeHit = hoverCell ? getTemplateEditorTableResizeHit(hoverCell, event) : null;

  templateEditorSurface.classList.toggle("is-table-column-hover", resizeHit?.kind === "column");
  templateEditorSurface.classList.toggle("is-table-row-hover", resizeHit?.kind === "row");
}

function clearTemplateEditorTableHoverState() {
  templateEditorSurface?.classList.remove("is-table-column-hover", "is-table-row-hover");
}

function getTemplateEditorTableResizeHit(cell, event) {
  const table = cell?.closest("table");

  if (!table) {
    return null;
  }

  const { entries } = buildTemplateTableCellMap(table);
  const entry = entries.get(cell);

  if (!entry) {
    return null;
  }

  const cellRect = cell.getBoundingClientRect();
  const deltaLeft = Math.abs(cellRect.left - event.clientX);
  const deltaTop = Math.abs(cellRect.top - event.clientY);
  const deltaRight = Math.abs(cellRect.right - event.clientX);
  const deltaBottom = Math.abs(cellRect.bottom - event.clientY);
  const hits = [];

  if (deltaLeft <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD && entry.colIndex > 0) {
    hits.push({
      distance: deltaLeft,
      kind: "column",
      lineIndex: entry.colIndex - 1,
    });
  }

  if (deltaRight <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD) {
    hits.push({
      distance: deltaRight,
      kind: "column",
      lineIndex: entry.colIndex + entry.colSpan - 1,
    });
  }

  if (deltaTop <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD && entry.rowIndex > 0) {
    hits.push({
      distance: deltaTop,
      kind: "row",
      lineIndex: entry.rowIndex - 1,
    });
  }

  if (deltaBottom <= TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD) {
    hits.push({
      distance: deltaBottom,
      kind: "row",
      lineIndex: entry.rowIndex + entry.rowSpan - 1,
    });
  }

  if (hits.length === 0) {
    return null;
  }

  hits.sort((leftHit, rightHit) => leftHit.distance - rightHit.distance);
  const targetHit = hits[0];

  return {
    kind: targetHit.kind,
    table,
    cell,
    lineIndex: targetHit.lineIndex,
  };
}

function getTemplateEditorTableLineCells(table, kind, lineIndex) {
  const { matrix } = buildTemplateTableCellMap(table);
  const targetCells = new Set();

  if (kind === "column") {
    matrix.forEach((row) => {
      const cell = row?.[lineIndex];

      if (cell) {
        targetCells.add(cell);
      }
    });
  }

  if (kind === "row") {
    (matrix[lineIndex] || []).forEach((cell) => {
      if (cell) {
        targetCells.add(cell);
      }
    });
  }

  return Array.from(targetCells);
}

function applyTemplateEditorTableResizeValue(table, targetCells, kind, lineIndex, nextSize) {
  if (kind === "column") {
    setTemplateEditorTableLogicalColumnWidth(table, lineIndex, nextSize);
    return;
  }

  setTemplateEditorTableLogicalRowHeight(table, lineIndex, nextSize);
}

function startTemplateEditorTableResizeSession(resizeHit, event) {
  const targetCells =
    resizeHit.kind === "row" ? getTemplateEditorTableLineCells(resizeHit.table, resizeHit.kind, resizeHit.lineIndex) : [];

  if (resizeHit.kind === "row" && targetCells.length === 0) {
    return false;
  }

  const startSize =
    resizeHit.kind === "column"
      ? getTemplateEditorTableLogicalColumnWidth(resizeHit.table, resizeHit.lineIndex)
      : Math.max(Math.round(resizeHit.cell.getBoundingClientRect().height), TEMPLATE_EDITOR_TABLE_MIN_SIZE);

  clearTemplateEditorTableSelection();
  state.templateEditor.tableResizeSession = {
    pointerId: event.pointerId,
    kind: resizeHit.kind,
    table: resizeHit.table,
    cell: resizeHit.cell,
    lineIndex: resizeHit.lineIndex,
    targetCells,
    startX: event.clientX,
    startY: event.clientY,
    startSize,
    lastSize: startSize,
    didChange: false,
  };

  templateEditorSurface?.classList.add("is-table-resizing", resizeHit.kind === "column" ? "is-table-column-resizing" : "is-table-row-resizing");
  clearTemplateEditorTableHoverState();
  window.addEventListener("pointermove", handleTemplateEditorTableResizeMove);
  window.addEventListener("pointerup", handleTemplateEditorTableResizeEnd);
  window.addEventListener("pointercancel", handleTemplateEditorTableResizeEnd);
  return true;
}

function handleTemplateEditorTableResizeMove(event) {
  const resizeSession = state.templateEditor.tableResizeSession;

  if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();

  const delta =
    resizeSession.kind === "column" ? event.clientX - resizeSession.startX : event.clientY - resizeSession.startY;
  const nextSize = Math.max(TEMPLATE_EDITOR_TABLE_MIN_SIZE, Math.round(resizeSession.startSize + delta));

  if (nextSize === resizeSession.lastSize) {
    return;
  }

  resizeSession.lastSize = nextSize;
  resizeSession.didChange = true;
  applyTemplateEditorTableResizeValue(
    resizeSession.table,
    resizeSession.targetCells,
    resizeSession.kind,
    resizeSession.lineIndex,
    nextSize,
  );
  updateTemplateTableControls();
}

function handleTemplateEditorTableResizeEnd(event) {
  const resizeSession = state.templateEditor.tableResizeSession;

  if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  releaseTemplateEditorTableResizeSession({ sync: true });
}

function releaseTemplateEditorTableResizeSession({ sync = true } = {}) {
  const resizeSession = state.templateEditor.tableResizeSession;

  if (!resizeSession) {
    return;
  }

  window.removeEventListener("pointermove", handleTemplateEditorTableResizeMove);
  window.removeEventListener("pointerup", handleTemplateEditorTableResizeEnd);
  window.removeEventListener("pointercancel", handleTemplateEditorTableResizeEnd);
  state.templateEditor.tableResizeSession = null;
  templateEditorSurface?.classList.remove("is-table-resizing", "is-table-column-resizing", "is-table-row-resizing");
  clearTemplateEditorTableHoverState();

  if (sync && resizeSession.didChange) {
    focusTemplateEditorCell(resizeSession.cell);
    syncTemplateEditorContent();
    updateTemplateTableControls();
    return;
  }

  updateTemplateTableControls();
}

function startTemplateEditorTableSelectionSession(anchorCell, event) {
  clearTemplateEditorTableSelection();
  clearTemplateEditorTableHoverState();
  state.templateEditor.tableSelectionSession = {
    pointerId: event.pointerId,
    table: anchorCell.closest("table"),
    anchorCell,
    focusCell: anchorCell,
    startX: event.clientX,
    startY: event.clientY,
    isRangeSelecting: false,
  };

  window.addEventListener("pointermove", handleTemplateEditorTableSelectionMove);
  window.addEventListener("pointerup", handleTemplateEditorTableSelectionEnd);
  window.addEventListener("pointercancel", handleTemplateEditorTableSelectionEnd);
}

function handleTemplateEditorTableSelectionMove(event) {
  const selectionSession = state.templateEditor.tableSelectionSession;

  if (!selectionSession || selectionSession.pointerId !== event.pointerId) {
    return;
  }

  const focusCell = getTemplateEditorTableCellTarget(document.elementFromPoint(event.clientX, event.clientY));
  const pointerDistance = Math.hypot(event.clientX - selectionSession.startX, event.clientY - selectionSession.startY);

  if (
    !selectionSession.isRangeSelecting &&
    (!focusCell || focusCell.closest("table") !== selectionSession.table || pointerDistance < TEMPLATE_EDITOR_TABLE_SELECTION_DRAG_THRESHOLD)
  ) {
    return;
  }

  if (!focusCell || focusCell.closest("table") !== selectionSession.table) {
    return;
  }

  event.preventDefault();

  if (!selectionSession.isRangeSelecting) {
    selectionSession.isRangeSelecting = true;
    templateEditorSurface?.classList.add("is-table-selecting");
  }

  selectionSession.focusCell = focusCell;
  window.getSelection()?.removeAllRanges();
  applyTemplateEditorTableSelection(selectionSession.anchorCell, focusCell);
}

function handleTemplateEditorTableSelectionEnd(event) {
  const selectionSession = state.templateEditor.tableSelectionSession;

  if (!selectionSession || selectionSession.pointerId !== event.pointerId) {
    return;
  }

  if (selectionSession.isRangeSelecting) {
    event.preventDefault();
  }

  releaseTemplateEditorTableSelectionSession({
    keepSelection: selectionSession.isRangeSelecting,
  });
}

function releaseTemplateEditorTableSelectionSession({ keepSelection = false } = {}) {
  window.removeEventListener("pointermove", handleTemplateEditorTableSelectionMove);
  window.removeEventListener("pointerup", handleTemplateEditorTableSelectionEnd);
  window.removeEventListener("pointercancel", handleTemplateEditorTableSelectionEnd);
  state.templateEditor.tableSelectionSession = null;
  templateEditorSurface?.classList.remove("is-table-selecting");
  clearTemplateEditorTableHoverState();

  if (!keepSelection) {
    clearTemplateEditorTableSelection();
  }
}

function handleTemplateEditorTablePointerDown(event) {
  const targetCell = getTemplateEditorTableCellTarget(event.target);

  if (!targetCell) {
    return false;
  }

  clearTemplateEditorImageSelection();

  const resizeHit = getTemplateEditorTableResizeHit(targetCell, event);

  if (resizeHit) {
    event.preventDefault();
    return startTemplateEditorTableResizeSession(resizeHit, event);
  }

  startTemplateEditorTableSelectionSession(targetCell, event);
  return true;
}

function mergeTemplateTableSelection() {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (!tableSelection || tableSelection.selectedCells.length < 2) {
    setTemplateEditorStatus("병합할 셀 범위를 드래그로 선택하세요.", "warning");
    return getTemplateEditorSelectedCell();
  }

  const { matrix, entries } = buildTemplateTableCellMap(tableSelection.table);
  const targetCell = matrix[tableSelection.startRowIndex]?.[tableSelection.startColIndex] || tableSelection.selectedCells[0];
  const targetEntry = entries.get(targetCell);

  if (!targetEntry) {
    setTemplateEditorStatus("선택한 셀 범위를 병합할 수 없습니다.", "warning");
    return tableSelection.anchorCell;
  }

  const selectionCellSet = new Set(tableSelection.selectedCells);

  for (let rowIndex = tableSelection.startRowIndex; rowIndex <= tableSelection.endRowIndex; rowIndex += 1) {
    for (let colIndex = tableSelection.startColIndex; colIndex <= tableSelection.endColIndex; colIndex += 1) {
      const cell = matrix[rowIndex]?.[colIndex];

      if (!cell || !selectionCellSet.has(cell)) {
        setTemplateEditorStatus("병합 범위에 빈 셀이나 겹치는 셀이 있어 병합할 수 없습니다.", "warning");
        return tableSelection.anchorCell;
      }
    }
  }

  const rowSpan = tableSelection.endRowIndex - tableSelection.startRowIndex + 1;
  const colSpan = tableSelection.endColIndex - tableSelection.startColIndex + 1;

  targetCell.rowSpan = rowSpan;
  targetCell.colSpan = colSpan;

  tableSelection.selectedCells
    .filter((cell) => cell !== targetCell)
    .forEach((cell) => {
      appendMergedTemplateCellContent(targetCell, cell);
      cell.remove();
    });

  if (isTemplateTableCellEmpty(targetCell)) {
    targetCell.innerHTML = "<br />";
  }

  clearTemplateEditorTableSelection();
  return targetCell;
}

function isTemplateTableCellEmpty(cell) {
  if (!cell) {
    return true;
  }

  const normalizedHtml = String(cell.innerHTML || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return normalizedHtml === "" && !cell.querySelector("img, table, hr, [data-template-tag-value]");
}

function appendMergedTemplateCellContent(targetCell, sourceCell) {
  if (!targetCell || !sourceCell || isTemplateTableCellEmpty(sourceCell)) {
    return;
  }

  if (isTemplateTableCellEmpty(targetCell)) {
    targetCell.innerHTML = "";
  } else {
    targetCell.appendChild(document.createElement("br"));
  }

  Array.from(sourceCell.childNodes).forEach((node) => {
    targetCell.appendChild(node);
  });
}

function insertTemplateCellAtAbsoluteColumn(row, targetColumnIndex, cell) {
  const table = row.closest("table");
  const { entries } = buildTemplateTableCellMap(table);
  const referenceCell =
    Array.from(row.cells).find((existingCell) => {
      const entry = entries.get(existingCell);
      return entry && entry.colIndex >= targetColumnIndex;
    }) || null;

  row.insertBefore(cell, referenceCell);
}

function mergeTemplateTableCell(direction) {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 병합하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    setTemplateEditorStatus("선택한 셀 정보를 읽을 수 없습니다.", "warning");
    return null;
  }

  let siblingCell = null;
  let siblingEntry = null;

  if (direction === "right") {
    siblingCell = matrix[selectedEntry.rowIndex]?.[selectedEntry.colIndex + selectedEntry.colSpan] || null;
    siblingEntry = siblingCell ? entries.get(siblingCell) : null;

    if (!siblingEntry || siblingEntry.rowIndex !== selectedEntry.rowIndex || siblingEntry.rowSpan !== selectedEntry.rowSpan) {
      setTemplateEditorStatus("오른쪽에 같은 높이의 병합 가능한 셀이 없습니다.", "warning");
      return selectedCell;
    }

    selectedCell.colSpan = selectedEntry.colSpan + siblingEntry.colSpan;
  }

  if (direction === "down") {
    siblingCell = matrix[selectedEntry.rowIndex + selectedEntry.rowSpan]?.[selectedEntry.colIndex] || null;
    siblingEntry = siblingCell ? entries.get(siblingCell) : null;

    if (!siblingEntry || siblingEntry.colIndex !== selectedEntry.colIndex || siblingEntry.colSpan !== selectedEntry.colSpan) {
      setTemplateEditorStatus("아래에 같은 폭의 병합 가능한 셀이 없습니다.", "warning");
      return selectedCell;
    }

    selectedCell.rowSpan = selectedEntry.rowSpan + siblingEntry.rowSpan;
  }

  appendMergedTemplateCellContent(selectedCell, siblingCell);
  siblingCell?.remove();

  if (isTemplateTableCellEmpty(selectedCell)) {
    selectedCell.innerHTML = "<br />";
  }

  return selectedCell;
}

function splitTemplateTableCell() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 분할하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const { entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    setTemplateEditorStatus("선택한 셀 정보를 읽을 수 없습니다.", "warning");
    return null;
  }

  if (selectedEntry.rowSpan === 1 && selectedEntry.colSpan === 1) {
    setTemplateEditorStatus("현재 셀은 이미 분할된 상태입니다.", "warning");
    return selectedCell;
  }

  const originalRowSpan = selectedEntry.rowSpan;
  const originalColSpan = selectedEntry.colSpan;
  const sourceTagName = selectedCell.tagName;

  selectedCell.rowSpan = 1;
  selectedCell.colSpan = 1;

  for (let rowOffset = 0; rowOffset < originalRowSpan; rowOffset += 1) {
    const row = table.rows[selectedEntry.rowIndex + rowOffset];

    for (let colOffset = 0; colOffset < originalColSpan; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      insertTemplateCellAtAbsoluteColumn(
        row,
        selectedEntry.colIndex + colOffset,
        createTemplateTableCell(sourceTagName),
      );
    }
  }

  if (isTemplateTableCellEmpty(selectedCell)) {
    selectedCell.innerHTML = "<br />";
  }

  return selectedCell;
}

function insertTemplateTableRow(position) {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행을 추가하세요.", "warning");
    return null;
  }

  const sourceRow = selectedCell.parentElement;
  const nextRow = document.createElement("tr");

  Array.from(sourceRow.children).forEach((cell) => {
    const nextTagName = position === "before" && cell.tagName === "TH" ? "TH" : "TD";
    nextRow.appendChild(createTemplateTableCell(nextTagName, cell));
  });

  if (position === "before") {
    sourceRow.before(nextRow);
  } else {
    sourceRow.after(nextRow);
  }

  normalizeTemplateEditorTableAppearance(selectedCell.closest("table"));

  return nextRow.children[Math.min(selectedCell.cellIndex, nextRow.children.length - 1)] || nextRow.firstElementChild;
}

function insertTemplateTableColumn(position) {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열을 추가하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    setTemplateEditorStatus("선택한 셀 위치를 계산할 수 없습니다.", "warning");
    return null;
  }

  const targetColumnIndex = position === "before" ? selectedEntry.colIndex : selectedEntry.colIndex + selectedEntry.colSpan;
  const adjustedCells = new Set();
  let focusCell = null;

  matrix.forEach((rowCells, rowIndex) => {
    const row = table.rows[rowIndex];

    if (!row) {
      return;
    }

    const coveringCell = rowCells?.[targetColumnIndex] || null;
    const coveringEntry = coveringCell ? entries.get(coveringCell) : null;

    if (coveringEntry && coveringEntry.colIndex < targetColumnIndex) {
      if (!adjustedCells.has(coveringCell)) {
        coveringCell.colSpan = coveringEntry.colSpan + 1;
        adjustedCells.add(coveringCell);
      }
      return;
    }

    const referenceCell =
      Array.from(row.cells).find((existingCell) => {
        const entry = entries.get(existingCell);
        return entry && entry.colIndex >= targetColumnIndex;
      }) || null;
    const styleSourceCell = referenceCell || row.cells[row.cells.length - 1] || selectedCell;
    const tagName = referenceCell?.tagName || (Array.from(row.cells).every((cell) => cell.tagName === "TH") ? "TH" : "TD");
    const nextCell = createTemplateTableCell(tagName, styleSourceCell);

    insertTemplateCellAtAbsoluteColumn(row, targetColumnIndex, nextCell);

    if (row === selectedCell.parentElement) {
      focusCell = nextCell;
    }
  });

  normalizeTemplateEditorTableAppearance(table);

  return focusCell;
}

function getTemplateEditorShadingTargetCells(selectedCell) {
  const tableSelection = getTemplateEditorActiveTableSelection();

  if (tableSelection?.selectedCells?.length) {
    return tableSelection.selectedCells;
  }

  return selectedCell ? [selectedCell] : [];
}

function applyTemplateEditorCellShading(colorValue = "") {
  const selectedCell = getTemplateEditorSelectedCell() || getTemplateEditorActiveTableSelection()?.anchorCell || null;

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 음영을 적용하세요.", "warning");
    return null;
  }

  const shadingValue = normalizeTemplateEditorColorValue(colorValue || templateEditorCellShading?.value || "", "#ffffff");
  const targetCells = getTemplateEditorShadingTargetCells(selectedCell);

  if (targetCells.length === 0) {
    setTemplateEditorStatus("음영을 적용할 셀을 찾을 수 없습니다.", "warning");
    return selectedCell;
  }

  targetCells.forEach((cell) => {
    cell.style.backgroundColor = shadingValue;
  });

  syncTemplateEditorContent();
  updateTemplateTableControls();
  return selectedCell;
}

function deleteTemplateTableRow() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 행을 삭제하세요.", "warning");
    return null;
  }

  const sourceRow = selectedCell.parentElement;
  const siblingRows = Array.from(sourceRow.parentElement.children).filter((element) => element.tagName === "TR");

  if (siblingRows.length <= 1) {
    setTemplateEditorStatus("표에는 최소 한 개의 행이 필요합니다.", "warning");
    return selectedCell;
  }

  const fallbackRow = sourceRow.nextElementSibling || sourceRow.previousElementSibling;
  const fallbackCell =
    fallbackRow?.children[Math.min(selectedCell.cellIndex, fallbackRow.children.length - 1)] || fallbackRow?.firstElementChild;

  sourceRow.remove();
  return fallbackCell || null;
}

function deleteTemplateTableColumn() {
  const selectedCell = getTemplateEditorSelectedCell();

  if (!selectedCell) {
    setTemplateEditorStatus("표 안의 셀을 선택한 뒤 열을 삭제하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const rows = Array.from(table.rows).filter((row) => row.cells.length > 0);
  const maxColumnCount = Math.max(...rows.map((row) => row.cells.length));

  if (maxColumnCount <= 1) {
    setTemplateEditorStatus("표에는 최소 한 개의 열이 필요합니다.", "warning");
    return selectedCell;
  }

  let focusCell = null;

  rows.forEach((row) => {
    const targetCell = row.cells[selectedCell.cellIndex];

    if (!targetCell) {
      return;
    }

    const fallbackCell = row.cells[selectedCell.cellIndex + 1] || row.cells[selectedCell.cellIndex - 1] || row.cells[0];
    targetCell.remove();

    if (row === selectedCell.parentElement) {
      focusCell =
        (fallbackCell && fallbackCell !== targetCell ? fallbackCell : null) ||
        row.cells[Math.max(selectedCell.cellIndex - 1, 0)] ||
        row.cells[0] ||
        null;
    }
  });

  return focusCell;
}

function placeCaretAtEnd(element) {
  if (!element) {
    return;
  }

  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  saveTemplateEditorSelection();
  updateTemplateEditorActiveCell();
}

function getTemplatePreviewExaminee() {
  return {
    date: getTemplatePreviewDate(),
    currentDate: getTemplatePreviewDate(),
    time: "09:00",
    session: "09:00",
    track: "모집시기명",
    admission: "전형명",
    exam: "전형명",
    unit: "모집단위명",
    major: "전공명",
    building: "고사건물명",
    room: "고사실명",
    group: "조",
    examineeNo: "123100001",
    name: "홍길동",
    birth: "2000-03-01",
    hasPhoto: true,
    photoVersion: 1,
    useTemplatePreviewPhoto: true,
  };
}

function buildExamineePhotoUrl(examinee) {
  if (examinee?.useTemplatePreviewPhoto) {
    return buildApiUrl(TEMPLATE_PREVIEW_PHOTO_PATH);
  }

  const examineeNo = String(examinee?.examineeNo ?? "").trim();

  if (!examineeNo || !examinee?.hasPhoto) {
    return "";
  }

  const versionQuery = examinee.photoVersion ? `?v=${encodeURIComponent(examinee.photoVersion)}` : "";
  return `${buildApiUrl(`/api/examinees/${encodeURIComponent(examineeNo)}/photo`)}${versionQuery}`;
}

function buildExamineePhotoMarkup(examinee) {
  const photoUrl = buildExamineePhotoUrl(examinee);

  if (!photoUrl) {
    return '<span class="examinee-photo-placeholder">사진 미등록</span>';
  }

  return `<img class="examinee-photo-token-image" src="${escapeAttribute(photoUrl)}" alt="${escapeAttribute(
    `${examinee.name || examinee.examineeNo || "수험생"} 사진`,
  )}" />`;
}

function getTemplateTagReplacement(definition, examinee) {
  if (!definition) {
    return "";
  }

  if (definition.token === "@{수험생사진}") {
    return buildExamineePhotoMarkup(examinee);
  }

  if (definition.examineeKey === "currentDate") {
    return escapeHtml(String(examinee?.currentDate || getTemplatePreviewDate()));
  }

  return escapeHtml(String(examinee[definition.examineeKey] ?? ""));
}

function getStyledTemplateTagReplacement(tokenElement, definition, examinee) {
  if (!(tokenElement instanceof HTMLElement)) {
    return getTemplateTagReplacement(definition, examinee);
  }

  if (definition?.token === "@{수험생사진}") {
    return buildExamineePhotoMarkup(examinee);
  }

  const replacementText = getTemplateTagReplacement(definition, examinee);

  if (!replacementText) {
    return "";
  }

  const clone = tokenElement.cloneNode(true);
  const editorTagText = getTemplateEditorTagText(definition?.token || tokenElement.dataset.templateTagValue || "");

  clone.classList.remove("template-token");
  clone.classList.remove("template-data-fit");
  clone.removeAttribute("data-template-tag-value");

  if (!String(clone.className || "").trim()) {
    clone.removeAttribute("class");
  }

  if (editorTagText && String(clone.innerHTML || "").includes(editorTagText)) {
    clone.innerHTML = String(clone.innerHTML).replaceAll(
      editorTagText,
      `<span class="template-data-fit" data-template-data-fit="true">${replacementText}</span>`,
    );
  } else {
    clone.innerHTML = `<span class="template-data-fit" data-template-data-fit="true">${replacementText}</span>`;
  }

  return clone.outerHTML;
}

function replaceNodeWithMarkup(node, markup) {
  if (!node?.parentNode) {
    return;
  }

  if (!/[<&]/.test(markup)) {
    node.replaceWith(document.createTextNode(markup));
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = markup;
  const replacementNodes = Array.from(template.content.childNodes);

  if (replacementNodes.length === 0) {
    node.remove();
    return;
  }

  node.replaceWith(...replacementNodes);
}

function normalizeTemplateEditorExamineePhotoCellClone(node) {
  Array.from(node.childNodes).forEach((childNode) => {
    if (childNode.nodeType === Node.TEXT_NODE) {
      const normalizedText = String(childNode.textContent || "").replace(/\u00a0/g, " ").trim();

      if (!normalizedText) {
        childNode.remove();
      }
      return;
    }

    if (!(childNode instanceof Element)) {
      return;
    }

    normalizeTemplateEditorExamineePhotoCellClone(childNode);

    if (childNode.tagName === "BR") {
      childNode.remove();
      return;
    }

    const normalizedText = String(childNode.textContent || "").replace(/\u00a0/g, " ").trim();

    if (!normalizedText && childNode.children.length === 0) {
      childNode.remove();
    }
  });
}

function normalizeTemplateEditorExamineePhotoCellContent(cell) {
  if (!(cell instanceof HTMLTableCellElement)) {
    return;
  }

  const photoElement = cell.querySelector(".examinee-photo-token-image, .examinee-photo-placeholder");

  if (!photoElement) {
    return;
  }

  const clone = cell.cloneNode(true);
  clone.querySelectorAll(".examinee-photo-token-image, .examinee-photo-placeholder").forEach((element) => element.remove());
  normalizeTemplateEditorExamineePhotoCellClone(clone);

  if (clone.textContent.trim() !== "" || clone.querySelector("*")) {
    return;
  }

  cell.innerHTML = "";
  cell.append(photoElement);
}

function markExamineePhotoTokenCells(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement.querySelectorAll("td, th").forEach((cell) => {
    if (cell.querySelector(".examinee-photo-token-image, .examinee-photo-placeholder")) {
      normalizeTemplateEditorExamineePhotoCellContent(cell);
      cell.classList.add("examinee-photo-token-cell");
      return;
    }

    cell.classList.remove("examinee-photo-token-cell");
  });
}

function renderTemplateWithExaminee(templateHtml, examinee) {
  const container = document.createElement("div");
  container.innerHTML = String(templateHtml || "");
  stripTemplateEditorTransientState(container);
  normalizeTemplateEditorFontNodes(container);
  normalizeTemplateTagNodes(container);

  container.querySelectorAll("[data-template-tag-value]").forEach((tokenElement) => {
    const normalizedTag = normalizeTemplateTag(tokenElement.dataset.templateTagValue);
    const definition = templateTagDefinitions.find((tagDefinition) => tagDefinition.token === normalizedTag);
    replaceNodeWithMarkup(tokenElement, getStyledTemplateTagReplacement(tokenElement, definition, examinee));
  });

  applyTemplateRenderedObjects(container, examinee);

  const markup = templateTagDefinitions.reduce((markup, definition) => {
    const replacement = getTemplateTagReplacement(definition, examinee);
    return [
      definition.token,
      definition.legacyTag,
      definition.editorToken,
      ...(definition.editorTokens || []),
      ...(definition.legacyTokens || []),
      ...(definition.legacyTags || []),
    ]
      .filter(Boolean)
      .reduce((nextMarkup, tag) => nextMarkup.replaceAll(tag, replacement), markup);
  }, container.innerHTML);

  const renderedContainer = document.createElement("div");
  renderedContainer.innerHTML = markup;
  markExamineePhotoTokenCells(renderedContainer);
  return renderedContainer.innerHTML;
}

async function printTemplatePreview() {
  if (!state.templatePreview.renderedHtml) {
    return;
  }

  const printWindow = window.open("", "_blank", "width=1100,height=900");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>수험표 출력</title>
        <style>${getTemplateDocumentStyles()}</style>
      </head>
      <body>
        <article class="template-render-sheet">
          ${state.templatePreview.renderedHtml}
        </article>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);

  if (state.templatePreview.examineeNo && state.templatePreview.examineeNo !== "-") {
    await recordExamineePrint(state.templatePreview.examineeNo);
  }
}

function getTemplateDocumentStyles() {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #eef2f8;
      font-family: "Noto Sans KR", sans-serif;
      color: #152033;
    }
    .template-render-sheet {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 44px 46px;
      background: #ffffff;
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
    }
    .template-render-sheet .template-doc {
      position: relative;
      min-height: 100%;
    }
    .template-render-sheet h1,
    .template-render-sheet h2,
    .template-render-sheet h3,
    .template-render-sheet p { margin-top: 0; }
    .template-render-sheet img { max-width: 100%; height: auto; display: block; }
    .template-render-sheet .examinee-photo-token-image {
      width: 100%;
      max-width: 100%;
      height: 100%;
      min-height: 120px;
      object-fit: cover;
    }
    .template-render-sheet td.examinee-photo-token-cell,
    .template-render-sheet th.examinee-photo-token-cell {
      position: relative;
      overflow: hidden;
      padding: 0 !important;
      line-height: 0;
      text-align: center;
      vertical-align: middle;
    }
    .template-render-sheet .examinee-photo-token-cell .examinee-photo-token-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      object-fit: contain;
      background: #ffffff;
    }
    .template-render-sheet .examinee-photo-token-cell .examinee-photo-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      max-width: none;
      margin: 0;
    }
    .template-render-sheet .template-generated-object,
    .template-preview-stage .template-generated-object {
      background: #ffffff;
    }
    .template-render-sheet .template-generated-object-barcode,
    .template-preview-stage .template-generated-object-barcode {
      object-fit: fill;
    }
    .template-render-sheet .template-generated-object-qrcode,
    .template-preview-stage .template-generated-object-qrcode {
      object-fit: contain;
    }
    .template-render-sheet .examinee-photo-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 1px dashed rgba(138, 154, 181, 0.92);
      color: #53627a;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      background: rgba(246, 248, 252, 0.92);
    }
    .template-render-sheet table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: fixed; }
    .template-render-sheet th,
    .template-render-sheet td { border: 1px solid #000000; padding: 10px 12px; text-align: left; vertical-align: top; }
    .template-render-sheet hr { border: 0; border-top: 1px solid #d8e0ea; margin: 18px 0; }
    @media print {
      body { padding: 0; background: #ffffff; }
      .template-render-sheet { box-shadow: none; }
    }
  `;
}

const TEMPLATE_EDITOR_TABLE_MIN_SIZE = 24;
const TEMPLATE_EDITOR_TABLE_EDGE_THRESHOLD = 8;
const TEMPLATE_EDITOR_TABLE_SELECTION_DRAG_THRESHOLD = 6;
const TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY = "'Noto Sans KR', sans-serif";
const TEMPLATE_EDITOR_DEFAULT_FONT_SIZE = 14;
const TEMPLATE_EDITOR_DEFAULT_TABLE_BORDER = "1px solid #000000";
const TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND = "#f6f8fc";
const TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING = "10px 12px";
const TEMPLATE_EDITOR_DEFAULT_TABLE_STYLE = "width: 100%; border-collapse: collapse; table-layout: fixed;";
const TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_STYLE =
  "border: 1px solid #000000; padding: 10px 12px; text-align: left; vertical-align: top;";
const TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_STYLE =
  "border: 1px solid #000000; padding: 10px 12px; text-align: left; vertical-align: top; background: #f6f8fc;";

renderTemplateEditorToolbar();
