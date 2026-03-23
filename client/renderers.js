function renderView() {
  updateAuthChrome();
  const activeView = isLoginPage() ? "" : syncCurrentViewFromLocation();
  const activeTitle = isLoginPage() ? titles.login || "로그인" : titles[activeView] || titles[DEFAULT_VIEW] || "대시보드";

  if (pageTitle) {
    pageTitle.textContent = activeTitle;
  }

  document.title = `${activeTitle} | Admit Card System`;

  if (isLoginPage()) {
    navItems.forEach((item) => {
      item.classList.remove("active");
    });

    viewRoot.innerHTML = renderLoginScreen();
    syncGridSelectionIndicators();
    syncPdfGenerationOverlay();
    syncUploadOverlay();
    syncExamineeDetailModal();
    syncLoginFormAutofocus();
    return;
  }

  if (state.auth.status === "loading") {
    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === state.currentView);
    });

    viewRoot.innerHTML = renderPageLoading(activeTitle);
    syncGridSelectionIndicators();
    syncPdfGenerationOverlay();
    syncUploadOverlay();
    syncExamineeDetailModal();
    return;
  }

  if (!isUserAuthenticated()) {
    navItems.forEach((item) => {
      item.classList.remove("active");
    });

    viewRoot.innerHTML = renderPageLoading("로그인 페이지로 이동 중입니다.");
    syncGridSelectionIndicators();
    syncPdfGenerationOverlay();
    syncUploadOverlay();
    syncExamineeDetailModal();
    return;
  }

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === state.currentView);
  });

  const renderer = renderers[state.currentView] || renderDashboard;
  viewRoot.innerHTML = renderer();
  decorateSelectFields();
  syncHeaderSelectOptions();
  updateMetricBadges();
  syncGridSelectionIndicators();
  syncOpenGridFilterMenuPosition?.();
  syncPdfGenerationOverlay();
  syncUploadOverlay();
  syncExamineeDetailModal();
}

function renderPageLoading(title = "페이지를 불러오고 있습니다.") {
  return `
    <section class="view-stack">
      <article class="empty-state">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>잠시만 기다려 주세요.</p>
        </div>
      </article>
    </section>
  `;
}

function getLoginNoticeMarkup(html, placeholder = "공지사항을 입력하세요.") {
  const normalizedHtml = String(html || "").trim();

  return normalizedHtml || `<p>${escapeHtml(placeholder)}</p>`;
}

function renderLoginStage({
  noticeHtml,
  heading,
  description,
  submitLabel,
  interactive = false,
  errorMessage = "",
  accountIdValue = "",
  passwordValue = "",
  isDisabled = false,
  shellClassName = "",
  noticeCardClassName = "",
  panelClassName = "",
  noticeContentClassName = "",
  noticeContentId = "",
  noticeContentAttributes = "",
  useEditorMarkup = false,
}) {
  const shellClassNames = ["login-shell", shellClassName].filter(Boolean).join(" ");
  const noticeCardClassNames = ["login-hero-card", "login-notice-card", noticeCardClassName].filter(Boolean).join(" ");
  const panelClassNames = ["login-panel-card", "login-stage-panel", panelClassName].filter(Boolean).join(" ");
  const noticeContentClassNames = ["login-notice-content", noticeContentClassName].filter(Boolean).join(" ");
  const noticeContentMarkup = useEditorMarkup ? buildLoginNoticeEditorMarkup(noticeHtml) : getLoginNoticeMarkup(noticeHtml);
  const noticeContentIdMarkup = noticeContentId ? ` id="${noticeContentId}"` : "";
  const noticeContentAttributesMarkup = noticeContentAttributes ? ` ${noticeContentAttributes}` : "";
  const formBody = interactive
    ? `
        <form class="login-form login-stage-form" id="loginForm">
          <h3>${escapeHtml(heading)}</h3>
          <label class="field login-field" for="loginAccountId">
            <span>계정 ID</span>
            <input
              id="loginAccountId"
              type="text"
              value="${escapeAttribute(accountIdValue)}"
              autocomplete="username"
              ${isDisabled ? "disabled" : ""}
            />
          </label>
          <label class="field login-field" for="loginPassword">
            <span>비밀번호</span>
            <input
              id="loginPassword"
              type="password"
              value="${escapeAttribute(passwordValue)}"
              autocomplete="current-password"
              ${isDisabled ? "disabled" : ""}
            />
          </label>
          <p class="login-error ${errorMessage ? "" : "hidden"}" id="loginError">${escapeHtml(errorMessage)}</p>
          <button class="primary-button login-submit-button" data-auth-login="true" type="submit" ${
            isDisabled ? "disabled" : ""
          }>
            ${escapeHtml(submitLabel)}
          </button>
        </form>
      `
    : `
        <div class="login-form login-stage-form login-stage-form-preview">
          <h3>${escapeHtml(heading)}</h3>
          <label class="field login-field">
            <span>계정 ID</span>
            <input type="text" value="${escapeAttribute(accountIdValue)}" readonly tabindex="-1" />
          </label>
          <label class="field login-field">
            <span>비밀번호</span>
            <input type="password" value="${escapeAttribute(passwordValue)}" readonly tabindex="-1" />
          </label>
          <button class="primary-button login-submit-button" type="button" tabindex="-1">${escapeHtml(submitLabel)}</button>
        </div>
      `;

  return `
    <section class="${shellClassNames}">
      <article class="${noticeCardClassNames}">
        <div class="login-notice-head">
          <p class="page-kicker">Login Notice</p>
          <h2>공지사항</h2>
        </div>
        <div${noticeContentIdMarkup} class="${noticeContentClassNames}"${noticeContentAttributesMarkup}>${noticeContentMarkup}</div>
      </article>

      <article class="${panelClassNames}">
        <div class="login-stage-brand">
          <img
            class="login-stage-brand-mark"
            src="/client/assets/login-stage-brand-mark.png"
            alt=""
            width="68"
            height="68"
          />
          <div class="login-stage-brand-copy">
            <span>Admit Card System</span>
            <strong>수험표시스템</strong>
          </div>
        </div>
        <div class="login-stage-panel-inner">${formBody}</div>
      </article>
      <p class="login-shell-copyright">COPYRIGHT(c) 2026 BY U-PLUS SYSTEM. ALL RIGHTS RESERVED.</p>
    </section>
  `;
}

function renderLoginScreen() {
  const isLoading = state.auth.status === "loading";
  const isPasswordSetup = state.auth.status === "password_setup";
  const heading = isLoading ? "세션 확인 중" : "로그인";
  const description = isLoading
    ? "현재 로그인 세션을 확인하고 있습니다."
    : isPasswordSetup
      ? `${state.auth.currentUser?.id || "선택한 계정"} 계정의 초기 비밀번호가 확인되었습니다. 새 비밀번호를 설정하세요.`
      : "계정 관리에 등록된 계정 ID와 비밀번호로 로그인합니다.";

  return renderLoginStage({
    noticeHtml: state.loginNotice.savedHtml,
    heading,
    description,
    submitLabel: state.auth.isSubmittingLogin ? "로그인 중..." : "로그인",
    interactive: true,
    errorMessage: state.auth.error || "",
    accountIdValue: state.auth.loginForm.id,
    passwordValue: state.auth.loginForm.password,
    isDisabled: isLoading || isPasswordSetup || state.auth.isSubmittingLogin,
  });
}

function getLoginNoticeEditorElement() {
  return document.getElementById("loginNoticeEditor");
}

function getLoginNoticePreviewElement() {
  return document.getElementById("loginNoticePreviewContent");
}

function getLoginNoticeFontFamilyElement() {
  return document.getElementById("loginNoticeFontFamily");
}

function getLoginNoticeFontSizeElement() {
  return document.getElementById("loginNoticeFontSize");
}

function getLoginNoticeTextColorElement() {
  return document.getElementById("loginNoticeTextColor");
}

function getLoginNoticeTextShadingElement() {
  return document.getElementById("loginNoticeTextShading");
}

function getLoginNoticeTableInsertPanel() {
  return document.getElementById("loginNoticeTableInsertPanel");
}

function getLoginNoticeTableRowsElement() {
  return document.getElementById("loginNoticeTableRows");
}

function getLoginNoticeTableColumnsElement() {
  return document.getElementById("loginNoticeTableColumns");
}

function getLoginNoticeCellShadingElement() {
  return document.getElementById("loginNoticeCellShading");
}

function getLoginNoticeImageInputElement() {
  return document.getElementById("loginNoticeImageInput");
}

function getLoginNoticeDefaultFontFamily() {
  return typeof TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY === "string"
    ? TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY
    : "'Noto Sans KR', sans-serif";
}

function getLoginNoticeDefaultFontSize() {
  return Number(TEMPLATE_EDITOR_DEFAULT_FONT_SIZE) || 14;
}

function getLoginNoticeEditorEmptyMarkup() {
  return "<p><br /></p>";
}

function isLoginNoticeMeaningfulHtml(rawHtml) {
  const container = document.createElement("div");

  container.innerHTML = String(rawHtml || "").trim();

  if (container.querySelector("img, table, hr, iframe, video, audio, ul li, ol li")) {
    return true;
  }

  return String(container.textContent || "")
    .replaceAll("\u200b", "")
    .trim() !== "";
}

function buildLoginNoticeEditorMarkup(rawHtml) {
  const container = document.createElement("div");

  container.innerHTML = String(rawHtml || "").trim() || getLoginNoticeEditorEmptyMarkup();
  stripTemplateEditorTransientState(container);
  normalizeTemplateEditorFontNodes(container);
  normalizeTemplateEditorTables(container);
  return container.innerHTML;
}

function syncLoginNoticePreview() {
  const previewElement = getLoginNoticePreviewElement();

  if (!previewElement) {
    return;
  }

  previewElement.innerHTML = getLoginNoticeMarkup(state.loginNotice.draftHtml);
}

function getLoginNoticeSelectionNode() {
  const noticeEditor = getLoginNoticeEditorElement();
  const selection = window.getSelection();
  const activeNode = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
  const baseElement = activeNode?.nodeType === Node.ELEMENT_NODE ? activeNode : activeNode?.parentElement;

  if (baseElement && noticeEditor?.contains(baseElement)) {
    return activeNode;
  }

  return null;
}

function getClosestLoginNoticeElement(node, selector) {
  const noticeEditor = getLoginNoticeEditorElement();
  const baseElement = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;

  if (!baseElement || !noticeEditor?.contains(baseElement)) {
    return null;
  }

  return baseElement.closest(selector);
}

function getLoginNoticeSelectedCell() {
  return getClosestLoginNoticeElement(getLoginNoticeSelectionNode(), "td, th");
}

function getLoginNoticeSelectedCells() {
  const selectedCell = getLoginNoticeSelectedCell();
  const selection = window.getSelection();
  const noticeEditor = getLoginNoticeEditorElement();
  const table = selectedCell?.closest("table");

  if (!selectedCell || !selection || selection.rangeCount === 0 || !table || !noticeEditor?.contains(selection.anchorNode)) {
    return selectedCell ? [selectedCell] : [];
  }

  const range = selection.getRangeAt(0);
  const selectedCells = Array.from(table.querySelectorAll("td, th")).filter((cell) => {
    try {
      return range.intersectsNode(cell);
    } catch (error) {
      return false;
    }
  });

  return selectedCells.length > 0 ? selectedCells : [selectedCell];
}

function clearLoginNoticeEditorActiveCell() {
  getLoginNoticeEditorElement()
    ?.querySelectorAll(".is-active-cell")
    .forEach((cell) => cell.classList.remove("is-active-cell"));
}

function updateLoginNoticeEditorActiveCell() {
  clearLoginNoticeEditorActiveCell();

  const activeCell = getLoginNoticeSelectedCell();

  if (activeCell) {
    activeCell.classList.add("is-active-cell");
  }
}

function updateLoginNoticeFormattingControls() {
  const noticeEditor = getLoginNoticeEditorElement();
  const fontFamilyElement = getLoginNoticeFontFamilyElement();
  const fontSizeElement = getLoginNoticeFontSizeElement();
  const textColorElement = getLoginNoticeTextColorElement();
  const textShadingElement = getLoginNoticeTextShadingElement();
  const cellShadingElement = getLoginNoticeCellShadingElement();

  if (
    !noticeEditor ||
    state.currentView !== "loginNoticeSettings" ||
    document.activeElement === fontFamilyElement ||
    document.activeElement === fontSizeElement ||
    document.activeElement === textColorElement ||
    document.activeElement === cellShadingElement ||
    document.activeElement === textShadingElement
  ) {
    return;
  }

  const selectionNode = getLoginNoticeSelectionNode();
  const contextElement = getLoginNoticeSelectedCell();

  updateEditorToolbarFormattingState({
    rootElement: noticeEditor,
    commandAttributeName: "data-notice-command",
    fontFamilyElement,
    fontSizeElement,
    textColorElement,
    textShadingElement,
    selectionNode,
    contextElement,
    defaultFontFamily: getLoginNoticeDefaultFontFamily(),
    defaultFontSize: getLoginNoticeDefaultFontSize(),
  });

  if (cellShadingElement) {
    const selectedCell = getLoginNoticeSelectedCell();
    const fallbackValue =
      selectedCell?.tagName === "TH" && typeof TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND === "string"
        ? TEMPLATE_EDITOR_DEFAULT_TABLE_HEADER_BACKGROUND
        : "#ffffff";

    syncEditorToolbarColorControls({
      colorInputElement: cellShadingElement,
      colorValue: selectedCell?.style.backgroundColor || window.getComputedStyle(selectedCell || noticeEditor).backgroundColor,
      fallbackValue,
    });
  }
}

function focusLoginNoticeEditorCell(cell) {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor) {
    return;
  }

  if (!cell) {
    placeCaretAtEndOfLoginNoticeEditor();
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
  captureLoginNoticeEditorSelection();
  updateLoginNoticeEditorActiveCell();
  updateLoginNoticeFormattingControls();
}

function getLoginNoticeNodePath(node) {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor || !node) {
    return null;
  }

  const path = [];
  let currentNode = node;

  while (currentNode && currentNode !== noticeEditor) {
    const parentNode = currentNode.parentNode;

    if (!parentNode) {
      return null;
    }

    path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
    currentNode = parentNode;
  }

  return currentNode === noticeEditor ? path : null;
}

function resolveLoginNoticeNodePath(path) {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor || !Array.isArray(path)) {
    return null;
  }

  let currentNode = noticeEditor;

  for (const index of path) {
    currentNode = currentNode?.childNodes?.[index] || null;

    if (!currentNode) {
      return null;
    }
  }

  return currentNode;
}

function getLoginNoticeNodeMaxOffset(node) {
  if (!node) {
    return 0;
  }

  return node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
}

function createLoginNoticeSelectionSnapshot() {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor) {
    return null;
  }

  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && noticeEditor.contains(selection.anchorNode)
      ? selection.getRangeAt(0)
      : null;

  if (!range) {
    return state.loginNotice.selectionSnapshot;
  }

  const startPath = getLoginNoticeNodePath(range.startContainer);
  const endPath = getLoginNoticeNodePath(range.endContainer);

  if (!startPath || !endPath) {
    return null;
  }

  return {
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset,
  };
}

function restoreLoginNoticeSelectionSnapshot(snapshot) {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor || !snapshot) {
    return false;
  }

  const startNode = resolveLoginNoticeNodePath(snapshot.startPath);
  const endNode = resolveLoginNoticeNodePath(snapshot.endPath);

  if (!startNode || !endNode) {
    return false;
  }

  const range = document.createRange();
  const selection = window.getSelection();

  try {
    range.setStart(startNode, Math.min(snapshot.startOffset, getLoginNoticeNodeMaxOffset(startNode)));
    range.setEnd(endNode, Math.min(snapshot.endOffset, getLoginNoticeNodeMaxOffset(endNode)));
  } catch (error) {
    return false;
  }

  selection.removeAllRanges();
  selection.addRange(range);
  state.loginNotice.selectionSnapshot = createLoginNoticeSelectionSnapshot();
  return true;
}

function captureLoginNoticeEditorSelection() {
  const snapshot = createLoginNoticeSelectionSnapshot();

  if (snapshot) {
    state.loginNotice.selectionSnapshot = snapshot;
  }
}

function placeCaretAtEndOfLoginNoticeEditor() {
  const documentElement = getLoginNoticeEditorElement();
  const selection = window.getSelection();

  if (!documentElement || !selection) {
    return;
  }

  const range = document.createRange();

  range.selectNodeContents(documentElement);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  captureLoginNoticeEditorSelection();
}

function restoreLoginNoticeEditorSelection() {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor) {
    return;
  }

  if (restoreLoginNoticeSelectionSnapshot(state.loginNotice.selectionSnapshot)) {
    return;
  }

  noticeEditor.focus();
  placeCaretAtEndOfLoginNoticeEditor();
}

function getLoginNoticeSerializedHtml() {
  const documentElement = getLoginNoticeEditorElement();

  if (!documentElement) {
    return state.loginNotice.draftHtml;
  }

  const clone = documentElement.cloneNode(true);

  stripTemplateEditorTransientState(clone);
  normalizeTemplateEditorFontNodes(clone);
  normalizeTemplateEditorTables(clone);

  const html = clone.innerHTML.trim();
  return isLoginNoticeMeaningfulHtml(html) ? html : "";
}

function setLoginNoticeEditorStatus(message, type = "") {
  state.loginNotice.statusMessage = message;
  state.loginNotice.statusType = type;
}

function recordLoginNoticeHistorySnapshot({ force = false } = {}) {
  if (!getLoginNoticeEditorElement() || state.loginNotice.isRestoringHistory) {
    return;
  }

  const snapshot = {
    html: getLoginNoticeSerializedHtml(),
    selection: createLoginNoticeSelectionSnapshot(),
  };
  const currentSnapshot = state.loginNotice.historyEntries[state.loginNotice.historyIndex];

  if (!force && currentSnapshot?.html === snapshot.html) {
    if (currentSnapshot) {
      currentSnapshot.selection = snapshot.selection;
    }
    return;
  }

  state.loginNotice.historyEntries = state.loginNotice.historyEntries.slice(0, state.loginNotice.historyIndex + 1);
  state.loginNotice.historyEntries.push(snapshot);

  if (state.loginNotice.historyEntries.length > LOGIN_NOTICE_EDITOR_HISTORY_LIMIT) {
    state.loginNotice.historyEntries.shift();
  }

  state.loginNotice.historyIndex = state.loginNotice.historyEntries.length - 1;
}

function restoreLoginNoticeHistorySnapshot(index) {
  const noticeEditor = getLoginNoticeEditorElement();
  const documentElement = getLoginNoticeEditorElement();
  const snapshot = state.loginNotice.historyEntries[index];

  if (!noticeEditor || !documentElement || !snapshot) {
    return;
  }

  state.loginNotice.isRestoringHistory = true;
  state.loginNotice.historyIndex = index;
  state.loginNotice.draftHtml = snapshot.html || "";
  state.loginNotice.selectionSnapshot = snapshot.selection || null;

  documentElement.innerHTML = snapshot.html || getLoginNoticeEditorEmptyMarkup();
  normalizeTemplateEditorFontNodes(documentElement);
  syncLoginNoticePreview();
  setLoginNoticeEditorStatus("로그인화면 공지사항을 편집 중입니다.");

  noticeEditor.focus();

  if (!restoreLoginNoticeSelectionSnapshot(snapshot.selection)) {
    placeCaretAtEndOfLoginNoticeEditor();
  }

  state.loginNotice.isRestoringHistory = false;
  updateLoginNoticeEditorActiveCell();
  updateLoginNoticeFormattingControls();
}

function undoLoginNoticeEditorHistory() {
  if (state.loginNotice.historyIndex <= 0) {
    return;
  }

  restoreLoginNoticeHistorySnapshot(state.loginNotice.historyIndex - 1);
}

function redoLoginNoticeEditorHistory() {
  if (state.loginNotice.historyIndex >= state.loginNotice.historyEntries.length - 1) {
    return;
  }

  restoreLoginNoticeHistorySnapshot(state.loginNotice.historyIndex + 1);
}

function syncLoginNoticeEditorDraft({ forceHistory = false } = {}) {
  const documentElement = getLoginNoticeEditorElement();

  if (!documentElement) {
    return;
  }

  normalizeTemplateEditorFontNodes(documentElement);
  normalizeTemplateEditorTables(documentElement);
  documentElement.querySelectorAll("img[data-template-object-type]").forEach((imageElement) => {
    decorateTemplateGeneratedObjectImage(imageElement);
  });
  state.loginNotice.draftHtml = getLoginNoticeSerializedHtml();
  captureLoginNoticeEditorSelection();
  recordLoginNoticeHistorySnapshot({ force: forceHistory });
  setLoginNoticeEditorStatus("로그인화면 공지사항을 편집 중입니다.");
  updateLoginNoticeEditorActiveCell();
  updateLoginNoticeFormattingControls();
  syncLoginNoticePreview();
}

function setLoginNoticeTableInsertPanelVisibility(isVisible) {
  if (typeof setEditorToolbarTableInsertPanelVisibility === "function") {
    setEditorToolbarTableInsertPanelVisibility("loginNoticeTableInsertPanel", Boolean(isVisible));
    return;
  }

  getLoginNoticeTableInsertPanel()?.classList.toggle("hidden", !isVisible);
}

function getLoginNoticeTableInsertConfig() {
  const rowCount = Math.round(Number(getLoginNoticeTableRowsElement()?.value || 0));
  const columnCount = Math.round(Number(getLoginNoticeTableColumnsElement()?.value || 0));

  if (!Number.isFinite(rowCount) || rowCount < 1 || rowCount > 20) {
    setLoginNoticeEditorStatus("표 행 수는 1개 이상 20개 이하로 입력하세요.", "warning");
    getLoginNoticeTableRowsElement()?.focus();
    return null;
  }

  if (!Number.isFinite(columnCount) || columnCount < 1 || columnCount > 8) {
    setLoginNoticeEditorStatus("표 열 수는 1개 이상 8개 이하로 입력하세요.", "warning");
    getLoginNoticeTableColumnsElement()?.focus();
    return null;
  }

  return {
    rowCount,
    columnCount,
  };
}

function insertLoginNoticeHtml(markup) {
  const noticeEditor = getLoginNoticeEditorElement();
  const documentElement = getLoginNoticeEditorElement();

  if (!noticeEditor || !documentElement) {
    return;
  }

  noticeEditor.focus();
  restoreLoginNoticeEditorSelection();
  document.execCommand("styleWithCSS", false, true);
  document.execCommand("insertHTML", false, markup);

  if (markup.includes("<table")) {
    normalizeTemplateEditorTables(documentElement);
  }

  captureLoginNoticeEditorSelection();
  syncLoginNoticeEditorDraft();
}

function insertLoginNoticeImage(file) {
  if (!file) {
    return;
  }

  const fileReader = new FileReader();

  fileReader.addEventListener("load", () => {
    insertLoginNoticeHtml(`<img src="${fileReader.result}" alt="${escapeAttribute(file.name)}" />`);
  });

  fileReader.readAsDataURL(file);
}

function getLoginNoticeEqualizeColumnIndexes(table, selectedCell, selectedCells) {
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [];
  }

  if (selectedCells.length > 1) {
    const indexes = new Set();

    selectedCells.forEach((cell) => {
      const entry = entries.get(cell);

      if (!entry) {
        return;
      }

      for (let columnIndex = entry.colIndex; columnIndex < entry.colIndex + entry.colSpan; columnIndex += 1) {
        indexes.add(columnIndex);
      }
    });

    return Array.from(indexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
  }

  return (matrix[selectedEntry.rowIndex] || [])
    .map((cell, columnIndex) => (cell ? columnIndex : null))
    .filter((columnIndex) => columnIndex !== null);
}

function getLoginNoticeEqualizeRowIndexes(table, selectedCell, selectedCells) {
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    return [];
  }

  if (selectedCells.length > 1) {
    const indexes = new Set();

    selectedCells.forEach((cell) => {
      const entry = entries.get(cell);

      if (!entry) {
        return;
      }

      for (let rowIndex = entry.rowIndex; rowIndex < entry.rowIndex + entry.rowSpan; rowIndex += 1) {
        indexes.add(rowIndex);
      }
    });

    return Array.from(indexes).sort((leftIndex, rightIndex) => leftIndex - rightIndex);
  }

  return matrix
    .map((row, rowIndex) => (row?.[selectedEntry.colIndex] ? rowIndex : null))
    .filter((rowIndex) => rowIndex !== null);
}

function mergeLoginNoticeTableSelection() {
  const selectedCells = getLoginNoticeSelectedCells();
  const selectedCell = selectedCells[0] || null;

  if (!selectedCell || selectedCells.length < 2) {
    setLoginNoticeEditorStatus("병합할 셀 범위를 드래그로 선택하세요.", "warning");
    return selectedCell;
  }

  const table = selectedCell.closest("table");
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntries = selectedCells.map((cell) => entries.get(cell)).filter(Boolean);
  const startRowIndex = Math.min(...selectedEntries.map((entry) => entry.rowIndex));
  const endRowIndex = Math.max(...selectedEntries.map((entry) => entry.rowIndex + entry.rowSpan - 1));
  const startColIndex = Math.min(...selectedEntries.map((entry) => entry.colIndex));
  const endColIndex = Math.max(...selectedEntries.map((entry) => entry.colIndex + entry.colSpan - 1));
  const targetCell = matrix[startRowIndex]?.[startColIndex] || selectedCell;
  const selectionCellSet = new Set(selectedCells);

  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex += 1) {
    for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex += 1) {
      const cell = matrix[rowIndex]?.[colIndex];

      if (!cell || !selectionCellSet.has(cell)) {
        setLoginNoticeEditorStatus("병합 범위에 빈 셀이나 겹치는 셀이 있어 병합할 수 없습니다.", "warning");
        return selectedCell;
      }
    }
  }

  targetCell.rowSpan = endRowIndex - startRowIndex + 1;
  targetCell.colSpan = endColIndex - startColIndex + 1;

  selectedCells
    .filter((cell) => cell !== targetCell)
    .forEach((cell) => {
      appendMergedTemplateCellContent(targetCell, cell);
      cell.remove();
    });

  if (isTemplateTableCellEmpty(targetCell)) {
    targetCell.innerHTML = "<br />";
  }

  return targetCell;
}

function insertLoginNoticeTableRow(position) {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행을 추가하세요.", "warning");
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

function insertLoginNoticeTableColumn(position) {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열을 추가하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const { matrix, entries } = buildTemplateTableCellMap(table);
  const selectedEntry = entries.get(selectedCell);

  if (!selectedEntry) {
    setLoginNoticeEditorStatus("선택한 셀 위치를 계산할 수 없습니다.", "warning");
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

function deleteLoginNoticeTableRow() {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행을 삭제하세요.", "warning");
    return null;
  }

  const sourceRow = selectedCell.parentElement;
  const siblingRows = Array.from(sourceRow.parentElement.children).filter((element) => element.tagName === "TR");

  if (siblingRows.length <= 1) {
    setLoginNoticeEditorStatus("표에는 최소 한 개의 행이 필요합니다.", "warning");
    return selectedCell;
  }

  const fallbackRow = sourceRow.nextElementSibling || sourceRow.previousElementSibling;
  const fallbackCell =
    fallbackRow?.children[Math.min(selectedCell.cellIndex, fallbackRow.children.length - 1)] || fallbackRow?.firstElementChild;

  sourceRow.remove();
  return fallbackCell || null;
}

function deleteLoginNoticeTableColumn() {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열을 삭제하세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const rows = Array.from(table.rows).filter((row) => row.cells.length > 0);
  const maxColumnCount = Math.max(...rows.map((row) => row.cells.length));

  if (maxColumnCount <= 1) {
    setLoginNoticeEditorStatus("표에는 최소 한 개의 열이 필요합니다.", "warning");
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

function equalizeLoginNoticeTableColumnWidths() {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 열 너비를 맞추세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const targetColumnIndexes = getLoginNoticeEqualizeColumnIndexes(table, selectedCell, getLoginNoticeSelectedCells());

  if (targetColumnIndexes.length === 0) {
    setLoginNoticeEditorStatus("같은 너비로 맞출 열을 찾을 수 없습니다.", "warning");
    return selectedCell;
  }

  const medianWidth = getTemplateEditorMedianValue(
    targetColumnIndexes.map((columnIndex) => getTemplateEditorTableLogicalColumnWidth(table, columnIndex)),
  );
  const { columns } = ensureTemplateEditorTableColGroup(table);

  targetColumnIndexes.forEach((columnIndex) => {
    const columnElement = columns[columnIndex];

    if (columnElement) {
      columnElement.style.width = `${medianWidth}px`;
    }
  });

  syncTemplateEditorTableWidth(table, columns);
  return selectedCell;
}

function equalizeLoginNoticeTableRowHeights() {
  const selectedCell = getLoginNoticeSelectedCell();

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 행 높이를 맞추세요.", "warning");
    return null;
  }

  const table = selectedCell.closest("table");
  const targetRowIndexes = getLoginNoticeEqualizeRowIndexes(table, selectedCell, getLoginNoticeSelectedCells());

  if (targetRowIndexes.length === 0) {
    setLoginNoticeEditorStatus("같은 높이로 맞출 행을 찾을 수 없습니다.", "warning");
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

function applyLoginNoticeCellShading(colorValue = "") {
  const selectedCells = getLoginNoticeSelectedCells();
  const selectedCell = selectedCells[0] || null;

  if (!selectedCell) {
    setLoginNoticeEditorStatus("표 안의 셀을 선택한 뒤 음영을 적용하세요.", "warning");
    return null;
  }

  const shadingValue = normalizeTemplateEditorColorValue(colorValue || getLoginNoticeCellShadingElement()?.value || "", "#ffffff");

  selectedCells.forEach((cell) => {
    cell.style.backgroundColor = shadingValue;
  });

  return selectedCell;
}

function handleLoginNoticeTableAction(action, { colorValue = "" } = {}) {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor) {
    return;
  }

  noticeEditor.focus();
  restoreLoginNoticeEditorSelection();

  let focusCell = null;

  if (action === "insert-row-before") {
    focusCell = insertLoginNoticeTableRow("before");
  }

  if (action === "insert-row-after") {
    focusCell = insertLoginNoticeTableRow("after");
  }

  if (action === "insert-column-before") {
    focusCell = insertLoginNoticeTableColumn("before");
  }

  if (action === "insert-column-after") {
    focusCell = insertLoginNoticeTableColumn("after");
  }

  if (action === "delete-row") {
    focusCell = deleteLoginNoticeTableRow();
  }

  if (action === "delete-column") {
    focusCell = deleteLoginNoticeTableColumn();
  }

  if (action === "merge-selection") {
    focusCell = mergeLoginNoticeTableSelection();
  }

  if (action === "equalize-column-widths") {
    focusCell = equalizeLoginNoticeTableColumnWidths();
  }

  if (action === "equalize-row-heights") {
    focusCell = equalizeLoginNoticeTableRowHeights();
  }

  if (action === "apply-cell-shading") {
    focusCell = applyLoginNoticeCellShading(colorValue);
  }

  if (!focusCell) {
    return;
  }

  focusLoginNoticeEditorCell(focusCell);
  syncLoginNoticeEditorDraft();
}

function applyLoginNoticeEditorCommand(command, value = "") {
  const noticeEditor = getLoginNoticeEditorElement();

  if (!noticeEditor) {
    return;
  }

  const normalizedValue =
    command === "hiliteColor" && !String(value || "").trim()
      ? getLoginNoticeTextShadingElement()?.value || "#fff59d"
      : command === "foreColor" && !String(value || "").trim()
        ? getLoginNoticeTextColorElement()?.value ||
          (typeof EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR === "string" ? EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR : "#152033")
      : value;

  applySharedEditorCommand({
    rootElement: noticeEditor,
    focusElement: noticeEditor,
    restoreSelection: restoreLoginNoticeEditorSelection,
    syncContent: syncLoginNoticeEditorDraft,
    onUndo: undoLoginNoticeEditorHistory,
    onRedo: redoLoginNoticeEditorHistory,
    command,
    value: normalizedValue,
    enableStyleWithCss: true,
    fontFamilyElement: getLoginNoticeFontFamilyElement(),
    defaultFontFamily: getLoginNoticeDefaultFontFamily(),
    fontSizeElement: getLoginNoticeFontSizeElement(),
    defaultFontSize: getLoginNoticeDefaultFontSize(),
    setStatus: setLoginNoticeEditorStatus,
  });
}

async function saveLoginNoticeContent() {
  syncLoginNoticeEditorDraft();

  try {
    const payload = await apiRequest("/api/login-notice", {
      method: "PUT",
      body: JSON.stringify({
        html: state.loginNotice.draftHtml,
      }),
    });

    applyLoginNoticePayload(payload.html || payload.loginNoticeHtml || state.loginNotice.draftHtml);
    renderView();
    showToast("로그인화면 공지사항을 저장했습니다.");
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    setLoginNoticeEditorStatus(error.message, "warning");
  }
}

async function handleLoginNoticeAction(action) {
  if (action === "link") {
    const url = window.prompt("링크 주소를 입력하세요.", "https://");

    if (!url) {
      return;
    }

    applyLoginNoticeEditorCommand("createLink", url);
    return;
  }

  if (action === "save") {
    await saveLoginNoticeContent();
  }
}

function handleLoginNoticeInsert(insertType) {
  if (insertType === "table") {
    const tableInsertPanel = getLoginNoticeTableInsertPanel();
    const shouldOpen = tableInsertPanel?.classList.contains("hidden") ?? true;

    setLoginNoticeTableInsertPanelVisibility(shouldOpen);
    if (shouldOpen) {
      getLoginNoticeTableRowsElement()?.focus();
      getLoginNoticeTableRowsElement()?.select();
    }
    return;
  }

  if (insertType === "table-confirm") {
    const tableConfig = getLoginNoticeTableInsertConfig();

    if (!tableConfig) {
      return;
    }

    insertLoginNoticeHtml(buildTemplateEditorTableMarkup(tableConfig.rowCount, tableConfig.columnCount));
    setLoginNoticeTableInsertPanelVisibility(false);
    return;
  }

  if (insertType === "barcode" || insertType === "qrcode") {
    insertLoginNoticeHtml(buildTemplateGeneratedObjectMarkup(insertType));
    setLoginNoticeTableInsertPanelVisibility(false);
    return;
  }

  if (insertType === "rule") {
    insertLoginNoticeHtml("<hr /><p></p>");
    setLoginNoticeTableInsertPanelVisibility(false);
  }
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
    imageInputId: "loginNoticeImageInput",
  });
}

function renderLoginNoticeSettings() {
  const defaultFontFamily = getLoginNoticeDefaultFontFamily();
  const defaultFontSize = getLoginNoticeDefaultFontSize();

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

function formatDashboardCount(value, suffix = "") {
  const normalizedValue = Number(value || 0);
  return `${normalizedValue.toLocaleString("ko-KR")}${suffix}`;
}

function buildDashboardGroupedItems(rows, getLabel) {
  const groupedItems = new Map();

  rows.forEach((row) => {
    const label = String(getLabel(row) || "미분류").trim() || "미분류";
    groupedItems.set(label, (groupedItems.get(label) || 0) + 1);
  });

  return Array.from(groupedItems.entries())
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 6);
}

function getDashboardData() {
  const filteredExamineeRows = getHeaderFilteredRows(examineeGridRows);
  const filteredPrintHistoryRows = getHeaderFilteredRows(printHistoryRows);
  const printedExamineeNos = new Set(filteredPrintHistoryRows.map((row) => row.examineeNo));
  const filteredExamineeCount = filteredExamineeRows.length;
  const photoRegisteredCount = filteredExamineeRows.filter((row) => row.hasPhoto).length;
  const missingPhotoCount = Math.max(0, filteredExamineeCount - photoRegisteredCount);
  const pendingPrintCount = filteredExamineeRows.filter((row) => !printedExamineeNos.has(row.examineeNo)).length;
  const photoRegisteredRate =
    filteredExamineeCount > 0 ? Math.round((photoRegisteredCount / filteredExamineeCount) * 100) : 0;
  const activeTemplate = state.templateCards.find((card) => card.status === "used") || null;
  const printedExamineeCount = printedExamineeNos.size;

  return {
    currentRole: getCurrentUserRole(),
    hasHeaderFilters: Object.values(state.headerFilters).some(Boolean),
    filteredExamineeCount,
    filteredPrintCount: filteredPrintHistoryRows.length,
    printedExamineeCount,
    photoRegisteredCount,
    missingPhotoCount,
    pendingPrintCount,
    photoRegisteredRate,
    activeTemplateName: activeTemplate?.name || "미설정",
    usedTemplateCount: state.templateCards.filter((card) => card.status === "used").length,
    totalTemplateCount: state.templateCards.length,
    todayPrintCount: state.metrics.todayPrints,
    totalPrintCount: state.metrics.totalPrints,
    sessionDistribution: buildDashboardGroupedItems(
      filteredExamineeRows,
      (row) => [row.date, row.time].filter(Boolean).join(" · "),
    ),
    trackDistribution: buildDashboardGroupedItems(
      filteredExamineeRows,
      (row) => [row.track, row.admission].filter(Boolean).join(" · "),
    ),
  };
}

function renderDashboardHeroTags(dashboardData) {
  const { currentRole, activeTemplateName, hasHeaderFilters } = dashboardData;
  const filterSummary = hasHeaderFilters
    ? [
        state.headerFilters.track || "모집시기 전체",
        state.headerFilters.admission || "전형 전체",
        state.headerFilters.date || "시험일자 전체",
        state.headerFilters.time || "시간 전체",
      ].join(" / ")
    : "상단 필터 미적용";

  return [
    `<span class="hero-tag">${escapeHtml(currentRole || "운영")} 권한</span>`,
    `<span class="hero-tag">${escapeHtml(filterSummary)}</span>`,
    `<span class="hero-tag">사용 양식 ${escapeHtml(activeTemplateName)}</span>`,
  ].join("");
}

function renderDashboardMetricCards(dashboardData) {
  const {
    filteredExamineeCount,
    photoRegisteredRate,
    photoRegisteredCount,
    missingPhotoCount,
    todayPrintCount,
    totalPrintCount,
  } = dashboardData;

  return `
    <article class="metric-card">
      <p>필터 기준 수험생</p>
      <strong>${formatDashboardCount(filteredExamineeCount, "명")}</strong>
      <span class="metric-meta">전체 ${formatDashboardCount(state.metrics.registeredExaminees, "명")} 중 집계</span>
    </article>
    <article class="metric-card">
      <p>사진 등록률</p>
      <strong>${formatDashboardCount(photoRegisteredRate, "%")}</strong>
      <span class="metric-meta">등록 ${formatDashboardCount(photoRegisteredCount, "명")} · 미등록 ${formatDashboardCount(
        missingPhotoCount,
        "명",
      )}</span>
    </article>
    <article class="metric-card">
      <p>오늘 출력</p>
      <strong>${formatDashboardCount(todayPrintCount, "건")}</strong>
      <span class="metric-meta">오늘 생성된 출력 이력 기준</span>
    </article>
    <article class="metric-card">
      <p>누적 출력</p>
      <strong>${formatDashboardCount(totalPrintCount, "건")}</strong>
      <span class="metric-meta">전체 발급 이력 누적 집계</span>
    </article>
  `;
}

function renderDashboardBarChart(items, fillClass = "blue", valueSuffix = "명") {
  if (items.length === 0) {
    return `
      <div class="dashboard-chart-empty">
        <strong>집계할 데이터가 없습니다.</strong>
        <span>상단 필터를 조정하거나 데이터를 업로드하면 차트가 표시됩니다.</span>
      </div>
    `;
  }

  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return items
    .map((row) => {
      const widthPercent = Math.max(12, Math.round((row.count / maxValue) * 100));

      return `
        <div class="dashboard-bar-item">
          <div class="dashboard-bar-head">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(formatDashboardCount(row.count, valueSuffix))}</span>
          </div>
          <div class="dashboard-bar-track">
            <span class="dashboard-bar-fill ${fillClass}" style="width: ${widthPercent}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderDashboardStatusChart(dashboardData) {
  const {
    filteredExamineeCount,
    photoRegisteredCount,
    printedExamineeCount,
    pendingPrintCount,
    totalTemplateCount,
    usedTemplateCount,
    activeTemplateName,
  } = dashboardData;

  if (filteredExamineeCount === 0) {
    return `
      <div class="dashboard-chart-empty">
        <strong>운영 상태를 집계할 데이터가 없습니다.</strong>
        <span>수험생 데이터가 들어오면 사진 등록, 출력 완료, 출력 대기 비율이 표시됩니다.</span>
      </div>
    `;
  }

  const statusItems = [
    {
      label: "사진 등록",
      count: photoRegisteredCount,
      percent: Math.round((photoRegisteredCount / filteredExamineeCount) * 100),
      className: "blue",
    },
    {
      label: "출력 완료",
      count: printedExamineeCount,
      percent: Math.round((printedExamineeCount / filteredExamineeCount) * 100),
      className: "green",
    },
    {
      label: "출력 대기",
      count: pendingPrintCount,
      percent: Math.round((pendingPrintCount / filteredExamineeCount) * 100),
      className: "orange",
    },
  ];

  return `
    <div class="dashboard-bar-list">
      ${statusItems
        .map(
          (item) => `
            <div class="dashboard-bar-item">
              <div class="dashboard-bar-head">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(`${formatDashboardCount(item.count, "명")} · ${formatDashboardCount(item.percent, "%")}`)}</span>
              </div>
              <div class="dashboard-bar-track">
                <span class="dashboard-bar-fill ${item.className}" style="width: ${Math.max(item.percent, 12)}%"></span>
              </div>
            </div>`,
        )
        .join("")}
    </div>
    <p class="muted">사용 중 양식 ${escapeHtml(activeTemplateName)} · 전체 양식 ${formatDashboardCount(
      totalTemplateCount,
      "개",
    )} 중 ${formatDashboardCount(usedTemplateCount, "개")} 활성</p>
  `;
}

function renderDashboard() {
  const dashboardData = getDashboardData();
  const scopeLabel = dashboardData.hasHeaderFilters ? "현재 필터" : "전체 운영";
  const heroTitle =
    dashboardData.filteredExamineeCount > 0
      ? `${scopeLabel} 기준 통계를 한눈에 확인합니다.`
      : `${scopeLabel} 기준으로 표시할 수험생 데이터가 없습니다.`;
  const heroDescription =
    dashboardData.filteredExamineeCount > 0
      ? `수험생 ${formatDashboardCount(dashboardData.filteredExamineeCount, "명")}을 기준으로 사진 등록, 출력 현황, 분포 차트를 간결하게 요약했습니다.`
      : "상단 필터를 조정하거나 수험생 데이터를 업로드하면 운영 현황이 이 화면에 집계됩니다.";

  return `
    <section class="view-stack">
      <article class="hero-card">
        <p class="page-kicker">Dashboard</p>
        <h3>${escapeHtml(heroTitle)}</h3>
        <p>${escapeHtml(heroDescription)}</p>
        <div class="hero-tags">
          ${renderDashboardHeroTags(dashboardData)}
        </div>
      </article>

      <section class="metric-grid">
        ${renderDashboardMetricCards(dashboardData)}
      </section>

      <section class="dashboard-chart-grid">
        <article class="panel-card dashboard-chart-card">
          <div class="section-header">
            <div>
              <h3>시험일자/시간 분포</h3>
              <p>현재 필터 기준 수험생이 많이 몰린 시험 일정을 표시합니다.</p>
            </div>
          </div>
          <div class="dashboard-bar-list">
            ${renderDashboardBarChart(dashboardData.sessionDistribution, "blue", "명")}
          </div>
        </article>

        <article class="panel-card dashboard-chart-card">
          <div class="section-header">
            <div>
              <h3>모집시기/전형 분포</h3>
              <p>모집시기와 전형 조합별 수험생 분포 상위 항목을 집계합니다.</p>
            </div>
          </div>
          <div class="dashboard-bar-list">
            ${renderDashboardBarChart(dashboardData.trackDistribution, "green", "명")}
          </div>
        </article>

        <article class="panel-card dashboard-chart-card dashboard-chart-card-wide">
          <div class="section-header">
            <div>
              <h3>운영 상태 비율</h3>
              <p>사진 등록, 출력 완료, 출력 대기 상태를 비율 중심으로 요약합니다.</p>
            </div>
          </div>
          ${renderDashboardStatusChart(dashboardData)}
        </article>
      </section>
    </section>
  `;
}

const EXAMINEE_DETAIL_FIELDS = Object.freeze([
  Object.freeze({ key: "date", label: "시험일자", type: "date" }),
  Object.freeze({ key: "time", label: "시간", type: "time" }),
  Object.freeze({ key: "track", label: "모집시기", type: "text" }),
  Object.freeze({ key: "admission", label: "전형", type: "text" }),
  Object.freeze({ key: "unit", label: "모집단위", type: "text" }),
  Object.freeze({ key: "major", label: "전공", type: "text" }),
  Object.freeze({ key: "building", label: "고사건물", type: "text" }),
  Object.freeze({ key: "room", label: "고사실", type: "text" }),
  Object.freeze({ key: "group", label: "조", type: "text" }),
  Object.freeze({ key: "examineeNo", label: "수험번호", type: "text" }),
  Object.freeze({ key: "name", label: "이름", type: "text" }),
  Object.freeze({ key: "birth", label: "생년월일", type: "date" }),
]);

function getSelectedExamineeDetailRow() {
  const selectedExamineeNo = String(state.examineeDetail?.selectedExamineeNo || "").trim();

  if (!selectedExamineeNo) {
    return null;
  }

  return examineeGridRows.find((row) => row.examineeNo === selectedExamineeNo) || null;
}

function isExamineeDetailDirty() {
  return !areExamineeDetailDraftsEqual(state.examineeDetail?.draftRecord, state.examineeDetail?.baseRecord);
}

function getDirtyExamineeDetailFieldLabels() {
  if (!state.examineeDetail?.draftRecord || !state.examineeDetail?.baseRecord) {
    return [];
  }

  return EXAMINEE_DETAIL_FIELDS.filter(
    (field) => String(state.examineeDetail.draftRecord?.[field.key] ?? "") !== String(state.examineeDetail.baseRecord?.[field.key] ?? ""),
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

  const selectedRow = examineeGridRows.find((row) => row.examineeNo === normalizedExamineeNo);

  if (!selectedRow) {
    return false;
  }

  const draftRecord = buildExamineeDetailDraft(selectedRow);

  state.examineeDetail = {
    ...createExamineeDetailState(),
    selectedExamineeNo: selectedRow.examineeNo,
    originalExamineeNo: selectedRow.examineeNo,
    baseRecord: draftRecord,
    draftRecord: draftRecord,
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

function buildExamineeDetailPhotoUrl(examinee) {
  const examineeNo = String(examinee?.examineeNo || "").trim();

  if (!examineeNo || !examinee?.hasPhoto) {
    return "";
  }

  const versionQuery = examinee.photoVersion ? `?v=${encodeURIComponent(examinee.photoVersion)}` : "";
  return `${buildApiUrl(`/api/examinees/${encodeURIComponent(examineeNo)}/photo`)}${versionQuery}`;
}

async function uploadExamineeDetailPhoto(file) {
  const selectedExamineeNo = String(state.examineeDetail.selectedExamineeNo || state.examineeDetail.originalExamineeNo || "").trim();
  const normalizedFileName = String(file?.name || "").trim();
  const fileExtension =
    normalizedFileName && normalizedFileName.includes(".") ? normalizedFileName.slice(normalizedFileName.lastIndexOf(".")).toLowerCase() : "";
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

  if (examineeDetailSaveButton) {
    examineeDetailSaveButton.textContent = isSaving ? "저장 중..." : "저장";
    examineeDetailSaveButton.disabled = !hasDraftRecord || isSaving || isPhotoUploading;
  }

  if (examineeDetailBody) {
    examineeDetailBody.innerHTML = renderExamineeDetailModalContent();
  }
}

function renderExamineeRegistration() {
  return `
    <section class="view-stack table-view-stack">
      ${renderExamineeResultTable({
        title: "수험생 등록",
        gridKey: "examineeRegistrationGrid",
        showPrintColumn: false,
        selectable: false,
        showRowNumber: true,
        headerActionsMarkup: renderUploadHeaderAction(),
      })}
    </section>
  `;
}

function renderAdmitCardLookup() {
  const filters = state.lookupFilters;
  const optionMap = getLookupOptionMap();

  return `
    <section class="view-stack lookup-view-stack" id="admitCardLookupViewMount">
      <article class="form-card lookup-filter-card">
        <div class="section-header">
          <div>
            <h3>수험표 출력</h3>
          </div>
        </div>

        <div class="search-grid four">
          <div class="field">
            <label for="searchDate">시험날짜</label>
            <select id="searchDate">
              ${buildOptionMarkup(optionMap.date, filters.date)}
            </select>
          </div>
          <div class="field">
            <label for="searchTime">시간</label>
            <select id="searchTime">
              ${buildOptionMarkup(optionMap.time, filters.time)}
            </select>
          </div>
          <div class="field">
            <label for="searchTrack">모집시기</label>
            <select id="searchTrack">
              ${buildOptionMarkup(optionMap.track, filters.track)}
            </select>
          </div>
          <div class="field">
            <label for="searchAdmission">전형</label>
            <select id="searchAdmission">
              ${buildOptionMarkup(optionMap.admission, filters.admission)}
            </select>
          </div>
        </div>

        <div class="search-grid four">
          <div class="field">
            <label for="searchUnit">모집단위</label>
            <select id="searchUnit">
              ${buildOptionMarkup(optionMap.unit, filters.unit)}
            </select>
          </div>
          <div class="field">
            <label for="searchMajor">전공</label>
            <select id="searchMajor">
              ${buildOptionMarkup(optionMap.major, filters.major)}
            </select>
          </div>
          <div class="field">
            <label for="searchBuilding">고사건물</label>
            <select id="searchBuilding">
              ${buildOptionMarkup(optionMap.building, filters.building)}
            </select>
          </div>
          <div class="field">
            <label for="searchRoom">고사실</label>
            <select id="searchRoom">
              ${buildOptionMarkup(optionMap.room, filters.room)}
            </select>
          </div>
        </div>

        <div class="search-grid four lookup-search-grid-actions">
          <div class="field">
            <label for="searchExamineeNo">수험번호</label>
            <input
              id="searchExamineeNo"
              value="${escapeAttribute(filters.examineeNo)}"
              placeholder="수험번호 전체 또는 일부를 입력하세요"
            />
          </div>
          <div class="field">
            <label for="searchExamineeName">이름</label>
            <input
              id="searchExamineeName"
              value="${escapeAttribute(filters.examineeName)}"
              placeholder="이름 전체 또는 일부를 입력하세요"
            />
          </div>
          <div class="lookup-filter-actions" aria-label="수험표 출력 작업">
            ${renderBatchPrintButton()}
            <button class="outline-button" data-reset-lookup="true" type="button">초기화</button>
          </div>
        </div>
      </article>

      ${renderAdmitCardLookupGridSection()}
    </section>
  `;
}

function renderAdmitCardLookupGridSection() {
  return `
    <div id="admitCardLookupResultMount" class="table-view-mount">
      ${renderExamineeResultTable({
        title: "검색 결과",
        gridKey: "admitCardLookupGrid",
        showPrintColumn: true,
        showRowNumber: true,
        checkboxFirst: true,
        showSectionHeader: false,
      })}
    </div>
  `;
}

function getWindowScrollTop() {
  return Math.max(
    0,
    Math.round(
      Number(
        window.scrollY ??
          window.pageYOffset ??
          document.documentElement?.scrollTop ??
          document.body?.scrollTop ??
          0,
      ) || 0,
    ),
  );
}

function restoreWindowScrollTop(scrollTop) {
  const nextScrollTop = Math.max(0, Math.round(Number(scrollTop) || 0));

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.scrollTo(0, nextScrollTop);
    });
    return;
  }

  window.setTimeout(() => {
    window.scrollTo(0, nextScrollTop);
  }, 0);
}

function refreshAdmitCardLookupView({ preserveScroll = true } = {}) {
  const mount = document.getElementById("admitCardLookupViewMount");

  if (!mount) {
    renderView();
    return;
  }

  const scrollTop = preserveScroll ? getWindowScrollTop() : 0;
  mount.outerHTML = renderAdmitCardLookup();
  decorateSelectFields();
  syncGridSelectionIndicators();
  syncOpenGridFilterMenuPosition?.();

  if (preserveScroll) {
    restoreWindowScrollTop(scrollTop);
  }
}

function refreshAdmitCardLookupGrid({ preserveScroll = true } = {}) {
  const mount = document.getElementById("admitCardLookupResultMount");

  if (!mount) {
    renderView();
    return;
  }

  const scrollTop = preserveScroll ? getWindowScrollTop() : 0;
  mount.outerHTML = renderAdmitCardLookupGridSection();
  syncGridSelectionIndicators();
  syncOpenGridFilterMenuPosition?.();

  if (preserveScroll) {
    restoreWindowScrollTop(scrollTop);
  }
}

function renderExamineeResultTable({
  title,
  gridKey,
  showPrintColumn,
  headerActionsMarkup = "",
  showSectionHeader = true,
  selectable = true,
  showRowNumber = false,
  checkboxFirst = false,
  emptyMessage = "검색 결과가 없습니다.",
}) {
  const columns = getGridColumns(gridKey);
  const rows = getGridRows(gridKey);
  const tableState = getTableState(gridKey);
  const totalRows = rows.length;
  const totalPages = getTotalPages(totalRows, tableState.pageSize);
  const currentPage = getGridPage(gridKey, totalPages);
  const startIndex = (currentPage - 1) * tableState.pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + tableState.pageSize);
  const selectableRowIds = selectable ? getGridSelectableRowIds(gridKey) : [];
  const selectionState = getGridSelectionState(gridKey, selectableRowIds);
  const visiblePageNumbers = getVisiblePageNumbers(totalPages, currentPage);
  const startRowNumber = totalRows === 0 ? 0 : startIndex + 1;
  const endRowNumber = totalRows === 0 ? 0 : startIndex + visibleRows.length;
  const totalColumnCount = (showRowNumber ? 1 : 0) + (selectable ? 1 : 0) + columns.length + (showPrintColumn ? 1 : 0);
  const cardClasses = ["table-card", "result-grid-card"];
  const tbodyClassNames = ["table-body", visibleRows.length === 0 ? "is-empty" : ""].filter(Boolean).join(" ");
  const tableWrapClassNames = ["table-wrap", visibleRows.length === 0 ? "is-empty" : ""].filter(Boolean).join(" ");

  if (showPrintColumn) {
    cardClasses.push("has-print-column");
  }

  if (["examineeRegistrationGrid", "admitCardLookupGrid", "printHistoryGrid"].includes(gridKey)) {
    cardClasses.push("examinee-data-table");
  }

  if (gridKey === "examineeRegistrationGrid") {
    cardClasses.push("examinee-registration-table");
  }

  if (gridKey === "admitCardLookupGrid") {
    cardClasses.push("admit-card-lookup-table");
  }

  if (gridKey === "printHistoryGrid") {
    cardClasses.push("print-history-table");
  }

  if (gridKey === "accountManagementGrid") {
    cardClasses.push("account-management-table");
  }

  return `
    <article class="${cardClasses.join(" ")}">
      ${
        showSectionHeader
          ? `
            <div class="section-header">
              <div>
                <h3>${title}</h3>
              </div>
              <div class="inline-actions table-header-actions">
                ${headerActionsMarkup}
              </div>
            </div>
          `
          : ""
      }
      ${renderTableFilterStrip(gridKey)}
      <div class="${tableWrapClassNames}">
        <table>
          <thead>
            <tr>
              ${renderLeadingGridHeaders({ gridKey, selectable, showRowNumber, checkboxFirst, selectionState })}
              ${columns.map((column) => renderTableHeaderCell(gridKey, column)).join("")}
              ${showPrintColumn ? "<th>인쇄</th>" : ""}
            </tr>
          </thead>
          <tbody class="${tbodyClassNames}">
            ${
              visibleRows.length === 0
                ? `<tr class="table-empty-row">
                    <td class="table-empty-cell" colspan="${totalColumnCount}">${emptyMessage}</td>
                  </tr>`
                : visibleRows
                    .map(
                      (row, rowIndex) => {
                        const rowId = getGridRowId(gridKey, row);
                        const isRowClickable = isGridRowClickable(gridKey);
                        const isRowHighlighted = isGridRowHighlighted(gridKey, row, rowId);
                        const rowClassNames = [
                          isRowClickable ? "is-clickable" : "",
                          isRowHighlighted ? "is-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return `
                        <tr
                          class="${rowClassNames}"
                          ${isRowClickable ? `data-grid-row-clickable="true" data-grid-key="${gridKey}" data-grid-row-id="${escapeAttribute(rowId)}"` : ""}
                          ${isRowClickable ? `aria-selected="${isRowHighlighted ? "true" : "false"}"` : ""}
                        >
                          ${renderLeadingGridCells({
                            gridKey,
                            selectable,
                            showRowNumber,
                            checkboxFirst,
                            rowIndex: startIndex + rowIndex + 1,
                            row,
                          })}
                          ${columns.map((column) => renderTableCell(gridKey, column, row)).join("")}
                          ${
                            showPrintColumn
                              ? `<td>
                                  <button
                                    class="row-action"
                                    data-print-examinee="${escapeAttribute(row.examineeNo)}"
                                    type="button"
                                    aria-label="${escapeAttribute(row.name)} 수험표 인쇄"
                                  >
                                    <svg class="row-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <path d="M7 8V4.5h10V8"></path>
                                      <path d="M6 18H5a2 2 0 0 1-2-2v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5a2 2 0 0 1-2 2h-1"></path>
                                      <path d="M7 14h10v5.5H7z"></path>
                                      <path d="M16 11.5h2"></path>
                                    </svg>
                                  </button>
                                </td>`
                              : ""
                          }
                        </tr>
                      `;
                      },
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
      <div class="table-pagination">
        <div class="table-page-size">
          <span>표시 개수</span>
          <div class="table-page-size-select">
            <button
              type="button"
              class="page-size-trigger"
              data-grid-key="${gridKey}"
              data-page-size-trigger="true"
              aria-expanded="${tableState.pageSizeMenuOpen ? "true" : "false"}"
            >
              <span>${tableState.pageSize}개</span>
              <span class="page-size-caret">${tableState.pageSizeMenuOpen ? "▴" : "▾"}</span>
            </button>
            ${
              tableState.pageSizeMenuOpen
                ? `<div class="page-size-menu">
                    ${[10, 20, 50, 100]
                      .map(
                        (size) => `
                          <button
                            type="button"
                            class="page-size-option ${size === tableState.pageSize ? "active" : ""}"
                            data-grid-key="${gridKey}"
                            data-page-size-option="${size}"
                          >
                            ${size}개
                          </button>
                        `,
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        </div>
        <div class="table-pagination-actions">
          <button
            type="button"
            class="page-btn"
            data-grid-key="${gridKey}"
            data-grid-nav="prev"
            ${currentPage === 1 ? "disabled" : ""}
          >
            이전
          </button>
          ${visiblePageNumbers
            .map((page, index) => {
              const previousPage = visiblePageNumbers[index - 1];
              const ellipsis =
                typeof previousPage === "number" && page - previousPage > 1
                  ? '<span class="table-pagination-ellipsis">…</span>'
                  : "";

              return `${ellipsis}
                <button
                  type="button"
                  class="page-btn ${page === currentPage ? "active" : ""}"
                  data-grid-key="${gridKey}"
                  data-grid-page="${page}"
                >
                  ${page}
                </button>`;
            })
            .join("")}
          <button
            type="button"
            class="page-btn"
            data-grid-key="${gridKey}"
            data-grid-nav="next"
            ${currentPage === totalPages ? "disabled" : ""}
          >
            다음
          </button>
        </div>
        <div class="table-pagination-summary">${startRowNumber}-${endRowNumber} / 총 ${totalRows}건</div>
      </div>
    </article>
    ${renderActiveGridFilterMenu(gridKey)}
  `;
}

function renderLeadingGridHeaders({ gridKey, selectable, showRowNumber, checkboxFirst, selectionState }) {
  const rowNumberHeader = showRowNumber ? '<th class="row-number-col">순번</th>' : "";
  const selectHeader = selectable
    ? `<th class="select-col">
        <input
          type="checkbox"
          data-grid-key="${gridKey}"
          data-grid-select-all="true"
          aria-label="전체 선택"
          ${selectionState.allSelected ? "checked" : ""}
          ${selectionState.isIndeterminate ? 'data-indeterminate="true"' : ""}
        />
      </th>`
    : "";

  return checkboxFirst ? `${selectHeader}${rowNumberHeader}` : `${rowNumberHeader}${selectHeader}`;
}

function renderLeadingGridCells({ gridKey, selectable, showRowNumber, checkboxFirst, rowIndex, row }) {
  const rowNumberCell = showRowNumber ? `<td class="row-number-col">${rowIndex}</td>` : "";
  const rowId = getGridRowId(gridKey, row);
  const selectCell = selectable
    ? `<td class="select-col">
        <input
          type="checkbox"
          data-grid-key="${gridKey}"
          data-grid-select-row="${escapeAttribute(rowId)}"
          aria-label="${escapeAttribute(row.name || row.examineeNo || "행")} 선택"
          ${isGridRowSelected(gridKey, rowId) ? "checked" : ""}
        />
      </td>`
    : "";

  return checkboxFirst ? `${selectCell}${rowNumberCell}` : `${rowNumberCell}${selectCell}`;
}

function getGridRowId(gridKey, row) {
  if (gridKey === "accountManagementGrid") {
    return row.id || "";
  }

  if (gridKey === "printHistoryGrid") {
    return String(row.historyId || `${row.examineeNo}-${row.printedAt}`);
  }

  return row.examineeNo || `${row.name}-${row.birth}-${row.date}`;
}

function getGridSelectableRowIds(gridKey) {
  return getGridRows(gridKey).map((row) => getGridRowId(gridKey, row));
}

function getGridSelectedRowIds(gridKey) {
  const tableState = getTableState(gridKey);
  return Array.isArray(tableState.selectedRowIds) ? tableState.selectedRowIds : [];
}

function getGridSelectionAnchorRowId(gridKey) {
  return String(getTableState(gridKey).selectionAnchorRowId || "").trim();
}

function setGridSelectedRowIds(gridKey, rowIds, anchorRowId = "") {
  const tableState = getTableState(gridKey);
  const nextRowIds = Array.isArray(rowIds) ? rowIds.filter((rowId, index) => rowId && rowIds.indexOf(rowId) === index) : [];

  tableState.selectedRowIds = nextRowIds;
  tableState.selectionAnchorRowId = nextRowIds.length > 0 ? String(anchorRowId || nextRowIds[nextRowIds.length - 1] || "").trim() : "";
}

function isGridRowSelected(gridKey, rowId) {
  return getGridSelectedRowIds(gridKey).includes(rowId);
}

function isGridRowClickable(gridKey) {
  return gridKey === "examineeRegistrationGrid" || gridKey === "admitCardLookupGrid";
}

function isGridRowHighlighted(gridKey, row, rowId = getGridRowId(gridKey, row)) {
  if (gridKey === "examineeRegistrationGrid") {
    return String(state.examineeDetail?.selectedExamineeNo || "").trim() === String(row?.examineeNo || rowId || "").trim();
  }

  if (gridKey === "admitCardLookupGrid") {
    return isGridRowSelected(gridKey, rowId);
  }

  return false;
}

function getGridSelectionState(gridKey, selectableRowIds) {
  const selectedRowIds = getGridSelectedRowIds(gridKey);
  const selectedVisibleCount = selectableRowIds.filter((rowId) => selectedRowIds.includes(rowId)).length;
  const totalVisibleCount = selectableRowIds.length;

  return {
    allSelected: totalVisibleCount > 0 && selectedVisibleCount === totalVisibleCount,
    isIndeterminate: selectedVisibleCount > 0 && selectedVisibleCount < totalVisibleCount,
  };
}

function toggleGridSelectAll(gridKey) {
  const selectableRowIds = getGridSelectableRowIds(gridKey);
  const selectionState = getGridSelectionState(gridKey, selectableRowIds);
  const selectedRowIdSet = new Set(getGridSelectedRowIds(gridKey));

  if (selectionState.allSelected) {
    selectableRowIds.forEach((rowId) => selectedRowIdSet.delete(rowId));
  } else {
    selectableRowIds.forEach((rowId) => selectedRowIdSet.add(rowId));
  }

  setGridSelectedRowIds(
    gridKey,
    Array.from(selectedRowIdSet),
    selectionState.allSelected ? "" : selectableRowIds[0] || getGridSelectionAnchorRowId(gridKey),
  );
}

function toggleGridRowSelection(gridKey, rowId) {
  const selectedRowIdSet = new Set(getGridSelectedRowIds(gridKey));

  if (selectedRowIdSet.has(rowId)) {
    selectedRowIdSet.delete(rowId);
  } else {
    selectedRowIdSet.add(rowId);
  }

  setGridSelectedRowIds(gridKey, Array.from(selectedRowIdSet), rowId);
}

function handleAdmitCardLookupRowSelection(rowId, { shiftKey = false, ctrlKey = false, metaKey = false } = {}) {
  const normalizedRowId = String(rowId || "").trim();

  if (!normalizedRowId) {
    return;
  }

  const selectableRowIds = getGridSelectableRowIds("admitCardLookupGrid");
  const targetIndex = selectableRowIds.indexOf(normalizedRowId);

  if (targetIndex < 0) {
    return;
  }

  const useRangeSelection = shiftKey && selectableRowIds.length > 0;
  const useToggleSelection = ctrlKey || metaKey;

  if (useRangeSelection) {
    const anchorRowId = getGridSelectionAnchorRowId("admitCardLookupGrid") || normalizedRowId;
    const anchorIndex = selectableRowIds.indexOf(anchorRowId);
    const rangeStartIndex = Math.min(anchorIndex >= 0 ? anchorIndex : targetIndex, targetIndex);
    const rangeEndIndex = Math.max(anchorIndex >= 0 ? anchorIndex : targetIndex, targetIndex);
    const rangeRowIds = selectableRowIds.slice(rangeStartIndex, rangeEndIndex + 1);

    if (useToggleSelection) {
      const selectedRowIdSet = new Set(getGridSelectedRowIds("admitCardLookupGrid"));
      rangeRowIds.forEach((entryRowId) => selectedRowIdSet.add(entryRowId));
      setGridSelectedRowIds("admitCardLookupGrid", Array.from(selectedRowIdSet), normalizedRowId);
      return;
    }

    setGridSelectedRowIds("admitCardLookupGrid", rangeRowIds, normalizedRowId);
    return;
  }

  if (useToggleSelection) {
    toggleGridRowSelection("admitCardLookupGrid", normalizedRowId);
    return;
  }

  if (isGridRowSelected("admitCardLookupGrid", normalizedRowId)) {
    toggleGridRowSelection("admitCardLookupGrid", normalizedRowId);
    return;
  }

  setGridSelectedRowIds("admitCardLookupGrid", [normalizedRowId], normalizedRowId);
}

function handleGridRowClickSelection(gridKey, rowId, options = {}) {
  if (gridKey === "examineeRegistrationGrid") {
    return openExamineeDetail(rowId);
  }

  if (gridKey === "admitCardLookupGrid") {
    handleAdmitCardLookupRowSelection(rowId, options);
    return true;
  }

  return false;
}

function syncGridSelectionIndicators() {
  document.querySelectorAll("[data-grid-select-all]").forEach((checkbox) => {
    checkbox.indeterminate = checkbox.dataset.indeterminate === "true";
  });
  syncGridFilterMenuIndicators();
}

function getGridColumns(gridKey) {
  const baseColumns =
    gridKey === "printHistoryGrid"
      ? printHistoryGridColumns
      : gridKey === "accountManagementGrid"
        ? accountGridColumns
        : gridKey === "examineeRegistrationGrid"
        ? [...examineeRegistrationGridColumns, examineePhotoColumn]
        : gridKey === "admitCardLookupGrid"
        ? admitCardLookupGridColumns
        : resultGridColumns;
  const allowFilters =
    gridKey === "examineeRegistrationGrid" ||
    gridKey === "printHistoryGrid" ||
    gridKey === "accountManagementGrid";

  return baseColumns.map((column) => ({
    ...column,
    filterable: allowFilters ? column.filterable : false,
  }));
}

function renderTableHeaderCell(gridKey, column) {
  const tableState = getTableState(gridKey);
  const activeSortRules = getActiveGridSortRules(gridKey);
  const activeSortRuleIndex = activeSortRules.findIndex((rule) => rule.key === column.key);
  const activeSortRule = activeSortRuleIndex >= 0 ? activeSortRules[activeSortRuleIndex] : null;
  const isSorted = Boolean(activeSortRule);
  const hasFilter = hasGridFilter(gridKey, column.key);
  const classes = ["table-header-enhanced", `table-column-${column.key}`];
  const isAccountActionColumn =
    gridKey === "accountManagementGrid" &&
    ["editAction", "resetAction", "deleteAction"].includes(column.key);

  if (isSorted) {
    classes.push(activeSortRule.direction === "desc" ? "sorted-desc" : "sorted-asc");
  }

  if (hasFilter) {
    classes.push("filter-active");
  }

  if (isAccountActionColumn) {
    classes.push("table-action-column");
  }

  return `
    <th class="${classes.join(" ")}">
      <div class="table-header-shell ${column.filterable ? "has-filter" : "no-filter"}">
        ${
          column.sortable === false
            ? `<div class="table-header-static">
                <span class="table-header-label">${escapeHtml(column.label)}</span>
              </div>`
            : `<button
                type="button"
                class="table-sort-button"
                data-grid-key="${gridKey}"
                data-grid-sort="${column.key}"
                title="${escapeAttribute(column.label)} 정렬"
              >
                <span class="table-header-label">${escapeHtml(column.label)}</span>
                <span class="table-sort-icon" aria-hidden="true">${renderTableSortIcon(activeSortRule, activeSortRuleIndex, activeSortRules.length)}</span>
              </button>`
        }
        ${
          column.filterable
            ? `<button
                type="button"
                class="table-filter-button"
                data-grid-key="${gridKey}"
                data-grid-filter="${column.key}"
                aria-label="${escapeAttribute(column.label)} 필터"
                title="${escapeAttribute(column.label)} 필터"
              >
                <span class="table-filter-glyph" aria-hidden="true"></span>
              </button>`
            : ""
        }
      </div>
    </th>
  `;
}

function renderTableSortIcon(sortRule, sortRuleIndex, totalSortRuleCount) {
  const directionLabel = sortRule?.direction === "desc" ? "▼" : sortRule ? "▲" : "↕";
  const orderLabel = sortRule && totalSortRuleCount > 1 ? String(sortRuleIndex + 1) : "";

  return orderLabel
    ? `<span class="table-sort-arrow">${directionLabel}</span><span class="table-sort-order">${orderLabel}</span>`
    : `<span class="table-sort-arrow">${directionLabel}</span>`;
}

function normalizeGridFilterSearchTerm(value) {
  return String(value ?? "").trim().toLocaleLowerCase("ko");
}

function filterGridFilterOptionValues(optionValues, searchTerm = "") {
  const normalizedSearchTerm = normalizeGridFilterSearchTerm(searchTerm);

  if (!normalizedSearchTerm) {
    return optionValues;
  }

  return optionValues.filter((value) =>
    String(value ?? "")
      .toLocaleLowerCase("ko")
      .includes(normalizedSearchTerm),
  );
}

function getGridFilterSelectionState(gridKey, columnKey, optionValues = getGridFilterOptionValues(gridKey, columnKey)) {
  const tableState = getTableState(gridKey);
  const availableValues = optionValues.filter((value, index) => optionValues.indexOf(value) === index);
  const hasExplicitFilter = Object.prototype.hasOwnProperty.call(tableState.filters || {}, columnKey);
  const explicitValues = getGridFilterValues(gridKey, columnKey).filter((value) => availableValues.includes(value));
  const selectedValues = hasExplicitFilter ? explicitValues : availableValues;

  return {
    availableValues,
    selectedValues,
    selectedValueSet: new Set(selectedValues),
    hasExplicitFilter,
  };
}

function renderGridFilterOptionItems(gridKey, columnKey, optionValues, selectedValueSet) {
  if (optionValues.length === 0) {
    return '<div class="table-filter-empty">검색 결과가 없습니다.</div>';
  }

  return optionValues
    .map(
      (value) => `
        <label class="table-filter-option" title="${escapeAttribute(value)}">
          <input
            type="checkbox"
            data-grid-key="${gridKey}"
            data-grid-filter-option-input="${columnKey}"
            data-grid-filter-value="${escapeAttribute(value)}"
            ${selectedValueSet.has(value) ? "checked" : ""}
          />
          <span>${escapeHtml(value)}</span>
        </label>
      `,
    )
    .join("");
}

function renderTableFilterMenu(gridKey, column, { overlay = false } = {}) {
  const tableState = getTableState(gridKey);
  const optionValues = getGridFilterOptionValues(gridKey, column.key);
  const visibleOptions = filterGridFilterOptionValues(optionValues, tableState.filterMenuSearch);
  const selectionState = getGridFilterSelectionState(gridKey, column.key, optionValues);
  const visibleSelectedCount = visibleOptions.filter((value) => selectionState.selectedValueSet.has(value)).length;
  const isAllVisibleSelected = visibleOptions.length > 0 && visibleSelectedCount === visibleOptions.length;
  const isPartiallyVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleOptions.length;
  const className = ["table-filter-menu", overlay ? "table-filter-menu-overlay" : ""].filter(Boolean).join(" ");
  const overlayAttributes = overlay
    ? ` data-grid-key="${gridKey}" data-grid-filter-menu-overlay="${column.key}" style="visibility: hidden;"`
    : "";

  return `
    <div class="${className}"${overlayAttributes}>
      <div class="table-filter-menu-header">
        <strong>${escapeHtml(column.label)}</strong>
        <button
          type="button"
          class="table-filter-close"
          data-grid-key="${gridKey}"
          data-grid-filter-close="${column.key}"
          aria-label="${escapeAttribute(column.label)} 필터 닫기"
        >
          ×
        </button>
      </div>
      <label class="table-filter-search">
        <span>검색</span>
        <input
          type="search"
          value="${escapeAttribute(tableState.filterMenuSearch)}"
          data-grid-key="${gridKey}"
          data-grid-filter-search-input="${column.key}"
          placeholder="데이터 검색"
          autocomplete="off"
        />
      </label>
      <label class="table-filter-option table-filter-option-all">
        <input
          type="checkbox"
          data-grid-key="${gridKey}"
          data-grid-filter-select-all="${column.key}"
          data-indeterminate="${isPartiallyVisibleSelected ? "true" : "false"}"
          ${isAllVisibleSelected ? "checked" : ""}
        />
        <span>(전체)</span>
      </label>
      <div class="table-filter-option-list">
        ${renderGridFilterOptionItems(gridKey, column.key, visibleOptions, selectionState.selectedValueSet)}
      </div>
      <div class="table-filter-menu-footer">
        <button
          type="button"
          class="mini-btn subtle"
          data-grid-key="${gridKey}"
          data-grid-filter-clear="${column.key}"
        >
          초기화
        </button>
        <button
          type="button"
          class="mini-btn"
          data-grid-key="${gridKey}"
          data-grid-filter-close="${column.key}"
        >
          닫기
        </button>
      </div>
    </div>
  `;
}

function renderActiveGridFilterMenu(gridKey) {
  const tableState = getTableState(gridKey);
  const activeColumnKey = String(tableState.filterMenuKey || "").trim();

  if (!activeColumnKey) {
    return "";
  }

  const activeColumn = getGridColumns(gridKey).find((column) => column.key === activeColumnKey && column.filterable);

  if (!activeColumn) {
    return "";
  }

  return renderTableFilterMenu(gridKey, activeColumn, { overlay: true });
}

function syncOpenGridFilterMenuPosition() {
  document.querySelectorAll(".table-filter-menu-overlay").forEach((menuElement) => {
    const gridKey = menuElement.dataset.gridKey || "";
    const columnKey = menuElement.dataset.gridFilterMenuOverlay || "";
    const escapedGridKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(gridKey) : gridKey;
    const escapedColumnKey = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(columnKey) : columnKey;
    const triggerSelector = `button[data-grid-key="${escapedGridKey}"][data-grid-filter="${escapedColumnKey}"]`;
    const triggerElement = document.querySelector(triggerSelector);

    if (!(triggerElement instanceof HTMLElement)) {
      menuElement.style.visibility = "hidden";
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();
    const viewportPadding = 12;
    const nextLeft = Math.min(
      Math.max(viewportPadding, triggerRect.right - menuRect.width),
      window.innerWidth - menuRect.width - viewportPadding,
    );
    const nextTop = Math.min(triggerRect.bottom + 8, window.innerHeight - menuRect.height - viewportPadding);

    menuElement.style.left = `${Math.max(viewportPadding, Math.round(nextLeft))}px`;
    menuElement.style.top = `${Math.max(viewportPadding, Math.round(nextTop))}px`;
    menuElement.style.visibility = "visible";
  });
}

function syncGridFilterMenuIndicators() {
  document.querySelectorAll("[data-grid-filter-select-all]").forEach((checkbox) => {
    checkbox.indeterminate = checkbox.dataset.indeterminate === "true";
  });
}

function refreshGridFilterMenu(menuElement = null) {
  const targetMenu =
    menuElement instanceof HTMLElement ? menuElement : document.querySelector(".table-filter-menu-overlay");

  if (!(targetMenu instanceof HTMLElement)) {
    return;
  }

  const gridKey = targetMenu.dataset.gridKey || "";
  const columnKey = targetMenu.dataset.gridFilterMenuOverlay || "";

  if (!gridKey || !columnKey) {
    return;
  }

  const optionListElement = targetMenu.querySelector(".table-filter-option-list");
  const selectAllInput = targetMenu.querySelector("[data-grid-filter-select-all]");
  const optionValues = getGridFilterOptionValues(gridKey, columnKey);
  const visibleOptions = filterGridFilterOptionValues(optionValues, getTableState(gridKey).filterMenuSearch);
  const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
  const visibleSelectedCount = visibleOptions.filter((value) => selectionState.selectedValueSet.has(value)).length;

  if (optionListElement) {
    optionListElement.innerHTML = renderGridFilterOptionItems(gridKey, columnKey, visibleOptions, selectionState.selectedValueSet);
  }

  if (selectAllInput instanceof HTMLInputElement) {
    const isAllVisibleSelected = visibleOptions.length > 0 && visibleSelectedCount === visibleOptions.length;
    const isPartiallyVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleOptions.length;

    selectAllInput.checked = isAllVisibleSelected;
    selectAllInput.dataset.indeterminate = isPartiallyVisibleSelected ? "true" : "false";
  }

  syncGridFilterMenuIndicators();
  syncOpenGridFilterMenuPosition();
}

function renderAccountRoleOptions(selectedRole) {
  return accountRoleOptions
    .map(
      (role) =>
        `<option value="${escapeAttribute(role)}" ${role === selectedRole ? "selected" : ""}>${escapeHtml(role)}</option>`,
    )
    .join("");
}

function isAccountRowEditing(accountId) {
  return state.accountEditor.editingId === accountId;
}

function renderTableDataCell(columnKey, content, extraClasses = []) {
  const classes = [`table-column-${columnKey}`, ...extraClasses].filter(Boolean);

  return `<td class="${classes.join(" ")}">${content}</td>`;
}

function renderTableTruncatedTextContent(value, { strong = false } = {}) {
  const normalizedValue = String(value ?? "");
  const content = strong ? `<strong>${escapeHtml(normalizedValue)}</strong>` : escapeHtml(normalizedValue);

  return `<span class="table-cell-text" data-grid-cell-text="true" data-grid-cell-full-text="${escapeAttribute(normalizedValue)}">${content}</span>`;
}

function renderTableTextCell(columnKey, value, extraClasses = [], options = {}) {
  return renderTableDataCell(columnKey, renderTableTruncatedTextContent(value, options), extraClasses);
}

function renderAccountActionCell(columnKey, content) {
  return renderTableDataCell(columnKey, content, ["table-action-column"]);
}

function renderTableCell(gridKey, column, row) {
  if (gridKey === "accountManagementGrid") {
    const isEditing = isAccountRowEditing(row.id);

    if (column.key === "name") {
      return isEditing
        ? renderTableDataCell(
            column.key,
            `
            <div class="table-inline-field-shell">
              <input
                class="table-inline-input"
                data-account-field="name"
                data-account-id="${escapeAttribute(row.id)}"
                value="${escapeAttribute(state.accountEditor.draftName)}"
              maxlength="100"
              />
            </div>
          `,
          )
        : renderTableTextCell(column.key, row.name, [], { strong: true });
    }

    if (column.key === "role") {
      return isEditing
        ? renderTableDataCell(
            column.key,
            `
            <div class="table-inline-field-shell">
              <select class="table-inline-select" data-account-field="role" data-account-id="${escapeAttribute(row.id)}">
                ${renderAccountRoleOptions(state.accountEditor.draftRole)}
              </select>
            </div>
          `,
          )
        : renderTableTextCell(column.key, row.role);
    }

    if (column.key === "editAction") {
      return isEditing
        ? renderAccountActionCell(
            column.key,
            `
            <div class="table-inline-actions table-inline-actions-compact table-inline-actions-dual">
              <button class="table-inline-button primary" data-account-save="${escapeAttribute(row.id)}" type="button">저장</button>
              <button class="table-inline-button" data-account-cancel="${escapeAttribute(row.id)}" type="button">취소</button>
            </div>
          `,
          )
        : renderAccountActionCell(
            column.key,
            `<div class="table-inline-actions table-inline-actions-compact table-inline-actions-dual table-inline-actions-reserved">
              <button class="table-inline-button table-inline-button-span-2" data-account-edit="${escapeAttribute(row.id)}" type="button">수정</button>
            </div>`,
          );
    }

    if (column.key === "resetAction") {
      return renderAccountActionCell(
        column.key,
        `<button class="table-inline-button" data-account-reset="${escapeAttribute(row.id)}" type="button">초기화</button>`,
      );
    }

    if (column.key === "deleteAction") {
      return renderAccountActionCell(
        column.key,
        `<button class="table-inline-button danger" data-account-delete="${escapeAttribute(row.id)}" type="button">삭제</button>`,
      );
    }
  }

  const value = row[column.key];

  if (column.key === "examineeNo") {
    return renderTableTextCell(column.key, value, [], { strong: true });
  }

  if (column.key === "hasPhoto") {
    return renderTableDataCell(column.key, row.hasPhoto ? "O" : "X", [
      "table-photo-cell",
      row.hasPhoto ? "available" : "missing",
    ]);
  }

  return renderTableTextCell(column.key, value);
}

function renderTableFilterStrip(gridKey) {
  const activeFilters = getActiveGridFilters(gridKey);

  if (activeFilters.length === 0) {
    return "";
  }

  return `
    <div class="filter-strip">
      ${activeFilters
        .map(
          ({ key, label, value }) => `
            <button
              type="button"
              class="filter-chip active"
              data-grid-key="${gridKey}"
              data-grid-filter-chip="${key}"
              data-grid-filter-value="${escapeAttribute(value)}"
            >
              <span>${escapeHtml(label)}: ${escapeHtml(value)}</span>
              <span>×</span>
            </button>
          `,
        )
        .join("")}
      <button type="button" class="filter-chip" data-grid-key="${gridKey}" data-grid-filter-clear-all="true">전체 해제</button>
    </div>
  `;
}

function renderGridHeaderActions({ gridKey, includeBatchPrint = false }) {
  return `
    ${includeBatchPrint ? renderBatchPrintButton() : ""}
    ${
      gridKey === "accountManagementGrid"
        ? `<button class="primary-button" data-open-modal="accountCreateModal" type="button">계정 등록</button>`
        : ""
    }
    ${
      gridKey === "printHistoryGrid"
        ? `<button class="outline-button" data-download-print-history="true" type="button">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4v10"></path>
              <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
              <path d="M4 20h16"></path>
            </svg>
            <span>다운로드</span>
          </button>`
        : ""
    }
    <button class="outline-button" data-refresh-grid="${gridKey}" type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66"></path>
        <path d="M20 4v6h-6"></path>
      </svg>
      <span>새로고침</span>
    </button>
  `;
}

function renderUploadHeaderAction() {
  return `
    <button class="outline-button" data-download-examinees="true" type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v10"></path>
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
        <path d="M4 20h16"></path>
      </svg>
      <span>다운로드</span>
    </button>
    <button class="primary-button" data-open-modal="uploadModal" type="button">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 16V4"></path>
        <path d="M7.5 8.5 12 4l4.5 4.5"></path>
        <path d="M4 20h16"></path>
      </svg>
      <span>데이터 업로드</span>
    </button>
  `;
}

function renderBatchPrintButton() {
  const selectedCount = typeof getSelectedAdmitCardExamineeCount === "function"
    ? getSelectedAdmitCardExamineeCount()
    : 0;
  const isLoading = Boolean(state.batchPrint?.isLoading);
  const label = isLoading
    ? "PDF 생성 중..."
    : selectedCount > 0
      ? `일괄 인쇄 (${selectedCount}명)`
      : "일괄 인쇄";

  return `
    <button
      class="secondary-button"
      data-batch-print="true"
      type="button"
      ${selectedCount === 0 || isLoading ? "disabled" : ""}
    >
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8V4.5h10V8"></path>
        <path d="M6 18H5a2 2 0 0 1-2-2v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5a2 2 0 0 1-2 2h-1"></path>
        <path d="M7 14h10v5.5H7z"></path>
        <path d="M16 11.5h2"></path>
      </svg>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function getGridRows(gridKey) {
  const baseRows = getBaseGridRows(gridKey);
  const filteredRows = applyGridFilters(baseRows, gridKey);
  return applyGridSort(filteredRows, gridKey);
}

function getPrintHistorySummaryExamineeRows() {
  const rows = getHeaderFilteredRows(examineeGridRows);
  const tableState = getTableState("printHistoryGrid");
  const filterEntries = Object.entries(tableState.filters || {}).filter(([key, values]) => key !== "printedAt" && Array.isArray(values));
  const sortRules = getActiveGridSortRules("printHistoryGrid").filter((rule) => rule.key !== "printedAt");
  const filteredRows =
    filterEntries.length === 0
      ? rows
      : rows.filter((row) => filterEntries.every(([key, values]) => values.includes(getGridFilterComparableValue(row, key))));

  if (sortRules.length === 0) {
    return filteredRows;
  }

  return filteredRows
    .map((row, index) => ({ row, index }))
    .sort((leftEntry, rightEntry) => {
      for (const rule of sortRules) {
        const comparison = compareGridValues(leftEntry.row[rule.key], rightEntry.row[rule.key]);

        if (comparison !== 0) {
          return rule.direction === "desc" ? comparison * -1 : comparison;
        }
      }

      return leftEntry.index - rightEntry.index;
    })
    .map((entry) => entry.row);
}

function getHeaderFilteredRows(rows, excludedKey = "") {
  return rows.filter((row) => matchesHeaderFilters(row, excludedKey));
}

function getBaseGridRows(gridKey) {
  if (gridKey === "admitCardLookupGrid") {
    return getFilteredLookupRows();
  }

  if (gridKey === "printHistoryGrid") {
    return getHeaderFilteredRows(printHistoryRows);
  }

  if (gridKey === "accountManagementGrid") {
    return accountGridRows;
  }

  return getHeaderFilteredRows(examineeGridRows);
}

function getGridFilterComparableValue(row, key) {
  if (key === "hasPhoto") {
    return row?.hasPhoto ? "등록" : "미등록";
  }

  return String(row?.[key] ?? "");
}

function applyGridFilters(rows, gridKey) {
  const tableState = getTableState(gridKey);
  const filterEntries = Object.entries(tableState.filters || {}).filter(([, values]) => Array.isArray(values));

  if (filterEntries.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    filterEntries.every(([key, values]) => values.includes(getGridFilterComparableValue(row, key))),
  );
}

function applyGridSort(rows, gridKey) {
  const activeSortRules = getActiveGridSortRules(gridKey);

  if (!activeSortRules.length) {
    return rows;
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((leftEntry, rightEntry) => {
      for (const rule of activeSortRules) {
        const leftValue = leftEntry.row[rule.key];
        const rightValue = rightEntry.row[rule.key];
        const comparison = compareGridValues(leftValue, rightValue);

        if (comparison !== 0) {
          return rule.direction === "desc" ? comparison * -1 : comparison;
        }
      }

      return leftEntry.index - rightEntry.index;
    })
    .map((entry) => entry.row);
}

function getActiveGridSortRules(gridKey) {
  return getTableState(gridKey).sortRules;
}

function compareGridValues(leftValue, rightValue) {
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "ko", {
    numeric: true,
    sensitivity: "base",
  });
}

function toggleGridSort(gridKey, columnKey) {
  const tableState = getTableState(gridKey);
  const currentRuleIndex = tableState.sortRules.findIndex((rule) => rule.key === columnKey);

  if (currentRuleIndex < 0) {
    tableState.sortRules.push({
      key: columnKey,
      direction: "asc",
    });
  } else if (tableState.sortRules[currentRuleIndex].direction === "asc") {
    tableState.sortRules[currentRuleIndex].direction = "desc";
  } else {
    tableState.sortRules.splice(currentRuleIndex, 1);
  }

  tableState.page = 1;
  tableState.filterMenuKey = "";
  tableState.filterMenuSearch = "";
  closeAllPageSizeMenus();
}

function toggleGridFilterMenu(gridKey, columnKey) {
  const tableState = getTableState(gridKey);
  const shouldOpen = tableState.filterMenuKey !== columnKey;

  closeAllGridFilterMenus(gridKey, shouldOpen ? columnKey : "");
  closeAllPageSizeMenus();
  tableState.filterMenuKey = shouldOpen ? columnKey : "";
  tableState.filterMenuSearch = "";
}

function closeGridFilterMenu(gridKey, columnKey = "") {
  const tableState = getTableState(gridKey);

  if (!columnKey || tableState.filterMenuKey === columnKey) {
    tableState.filterMenuKey = "";
    tableState.filterMenuSearch = "";
  }
}

function closeAllGridFilterMenus(exceptGridKey = "", exceptColumnKey = "") {
  let changed = false;

  Object.entries(state.tableSettings).forEach(([gridKey, tableState]) => {
    const shouldKeepOpen = gridKey === exceptGridKey && tableState.filterMenuKey === exceptColumnKey;

    if (!shouldKeepOpen && tableState.filterMenuKey) {
      tableState.filterMenuKey = "";
      tableState.filterMenuSearch = "";
      changed = true;
    }
  });

  return changed;
}

function toggleGridFilterValue(gridKey, columnKey, value) {
  const optionValues = getGridFilterOptionValues(gridKey, columnKey);
  const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
  const selectedValueSet = new Set(selectionState.selectedValues);

  if (selectedValueSet.has(value)) {
    selectedValueSet.delete(value);
  } else {
    selectedValueSet.add(value);
  }

  setGridFilterValues(gridKey, columnKey, Array.from(selectedValueSet), optionValues);
}

function setGridFilterValues(gridKey, columnKey, values, optionValues = getGridFilterOptionValues(gridKey, columnKey)) {
  const tableState = getTableState(gridKey);
  const normalizedOptionValues = getSortedDistinctValues(optionValues);
  const nextValues = getSortedDistinctValues(values).filter((value) => normalizedOptionValues.includes(value));

  if (nextValues.length === normalizedOptionValues.length) {
    delete tableState.filters[columnKey];
  } else {
    tableState.filters[columnKey] = nextValues;
  }

  tableState.page = 1;
  closeAllPageSizeMenus();
}

function clearGridFilter(gridKey, columnKey) {
  const tableState = getTableState(gridKey);
  delete tableState.filters[columnKey];
  tableState.page = 1;
  closeAllPageSizeMenus();
}

function clearAllGridFilters(gridKey) {
  const tableState = getTableState(gridKey);
  tableState.filters = {};
  tableState.filterMenuKey = "";
  tableState.filterMenuSearch = "";
  tableState.page = 1;
  closeAllPageSizeMenus();
}

function removeGridFilterValue(gridKey, columnKey, value) {
  const optionValues = getGridFilterOptionValues(gridKey, columnKey);
  const selectionState = getGridFilterSelectionState(gridKey, columnKey, optionValues);
  const nextValues = selectionState.selectedValues.filter((entry) => entry !== value);

  setGridFilterValues(gridKey, columnKey, nextValues, optionValues);
}

function getGridFilterValues(gridKey, columnKey) {
  const tableState = getTableState(gridKey);
  return Array.isArray(tableState.filters[columnKey]) ? tableState.filters[columnKey] : [];
}

function hasGridFilter(gridKey, columnKey) {
  return Object.prototype.hasOwnProperty.call(getTableState(gridKey).filters || {}, columnKey);
}

function getGridFilterOptionValues(gridKey, targetKey) {
  const tableState = getTableState(gridKey);

  return getSortedDistinctValues(
    getBaseGridRows(gridKey)
      .filter((row) => matchesGridTableFilters(row, tableState.filters, targetKey))
      .map((row) => getGridFilterComparableValue(row, targetKey)),
  );
}

function matchesGridTableFilters(row, filters, excludedKey = "") {
  return Object.entries(filters || {}).every(([key, values]) => {
    if (key === excludedKey || !Array.isArray(values)) {
      return true;
    }

    return values.includes(getGridFilterComparableValue(row, key));
  });
}

function getSortedDistinctValues(values) {
  return Array.from(new Set(values)).sort(compareGridValues);
}

function getActiveGridFilters(gridKey) {
  const columnsByKey = Object.fromEntries(getGridColumns(gridKey).map((column) => [column.key, column]));
  const tableState = getTableState(gridKey);

  return Object.entries(tableState.filters || []).flatMap(([key, values]) => {
    if (!Array.isArray(values) || values.length === 0 || !columnsByKey[key]) {
      return [];
    }

    return values.map((value) => ({
      key,
      label: columnsByKey[key].label,
      value,
    }));
  });
}

function getGridPage(gridKey, totalPages) {
  const tableState = getTableState(gridKey);
  const currentPage = clampPage(tableState.page || 1, totalPages);
  tableState.page = currentPage;
  return currentPage;
}

function getTotalPages(totalRows, pageSize) {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

function clampPage(page, totalPages) {
  return Math.min(Math.max(Number(page) || 1, 1), totalPages);
}

function getVisiblePageNumbers(totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page > 0 && page <= totalPages)
    .sort((left, right) => left - right);
}

function getTableState(gridKey) {
  if (!state.tableSettings[gridKey]) {
    state.tableSettings[gridKey] = createTableState();
  }

  const tableState = state.tableSettings[gridKey];
  const legacySortRules =
    String(tableState.sortKey || "").trim() && String(tableState.sortDirection || "").trim()
      ? [
          {
            key: tableState.sortKey,
            direction: tableState.sortDirection,
          },
        ]
      : [];
  const defaultSortRules = normalizeGridSortRules(tableState.defaultSortRules);
  const activeSortRules = Array.isArray(tableState.sortRules)
    ? tableState.sortRules
    : legacySortRules.length
      ? legacySortRules
      : defaultSortRules;

  tableState.defaultSortRules = defaultSortRules;
  tableState.sortRules = normalizeGridSortRules(activeSortRules);
  tableState.filterMenuSearch = String(tableState.filterMenuSearch || "");

  return tableState;
}

function closeAllPageSizeMenus(exceptGridKey = "") {
  let changed = false;

  Object.entries(state.tableSettings).forEach(([gridKey, tableState]) => {
    if (gridKey !== exceptGridKey && tableState.pageSizeMenuOpen) {
      tableState.pageSizeMenuOpen = false;
      changed = true;
    }
  });

  return changed;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  if (modalId === "accountCreateModal") {
    prepareAccountCreateModal();
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

let examineeDetailCloseConfirmResolver = null;

function closeExamineeDetailCloseConfirmModal(action = "cancel") {
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

  if (examineeDetailCloseConfirmMessage) {
    examineeDetailCloseConfirmMessage.textContent = "저장하지 않은 변경 사항이 있습니다. 저장하고 종료하시겠습니까?";
  }

  if (examineeDetailCloseConfirmSummary) {
    examineeDetailCloseConfirmSummary.innerHTML = summaryMarkup;
  }
}

function promptExamineeDetailCloseAction() {
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

async function requestCloseModal(modalId) {
  const normalizedModalId = String(modalId || "").trim();

  if (!normalizedModalId) {
    return false;
  }

  if (normalizedModalId === "examineeDetailCloseConfirmModal") {
    closeExamineeDetailCloseConfirmModal("cancel");
    return true;
  }

  if (normalizedModalId === "examineeDetailModal") {
    if (state.examineeDetail.isSaving || state.examineeDetail.isPhotoUploading) {
      return false;
    }

    if (isExamineeDetailDirty()) {
      const closeAction = await promptExamineeDetailCloseAction();

      if (closeAction === "cancel") {
        return false;
      }

      if (closeAction === "save") {
        await saveExamineeDetail();

        if (isExamineeDetailDirty() || state.examineeDetail.isSaving) {
          return false;
        }
      }
    }
  }

  closeModal(normalizedModalId);
  return true;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  if (modalId === "templateEditorModal") {
    clearTemplateEditorImageSelection();
    releaseTemplateEditorTableResizeSession({ sync: false });
    releaseTemplateEditorTableSelectionSession({ keepSelection: false });
    clearTemplateEditorTableSelection();
    clearTemplateEditorTableHoverState();
    state.templateEditor = createTemplateEditorState();
    clearTemplateEditorActiveCell();
    if (templateEditorName) {
      templateEditorName.value = "";
    }
    if (templateEditorDescription) {
      templateEditorDescription.value = "";
    }
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
    setTemplateEditorTableInsertPanelVisibility(false);
  }

  if (modalId === "templatePreviewModal") {
    state.templatePreview = createTemplatePreviewState();
    if (templatePreviewStage) {
      templatePreviewStage.innerHTML = "";
    }
  }

  if (modalId === "uploadModal") {
    resetUploadState();
    clearSelectedUploadFiles();
  }

  if (modalId === "accountCreateModal") {
    resetAccountCreateFormState();
  }

  if (modalId === "examineeDetailCloseConfirmModal") {
    closeExamineeDetailCloseConfirmModal("cancel");
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function closeAllModals() {
  [
    uploadModal,
    accountCreateModal,
    examineeDetailModal,
    examineeDetailCloseConfirmModal,
    templatePreviewModal,
    templateEditorModal,
  ].forEach((modal) => {
    if (!modal) {
      return;
    }

    closeModal(modal.id);
  });
}

async function requestCloseAllModals() {
  const modalList = [uploadModal, accountCreateModal, examineeDetailModal, templatePreviewModal, templateEditorModal];

  for (const modal of modalList) {
    if (!modal || modal.classList.contains("hidden")) {
      continue;
    }

    const didClose = await requestCloseModal(modal.id);

    if (!didClose) {
      return false;
    }
  }

  return true;
}

function getHeaderOptionValues(targetKey) {
  return getOrderedValues(getHeaderFilteredRows(examineeGridRows, targetKey).map((row) => row[targetKey]));
}

function matchesHeaderFilters(row, excludedKey = "") {
  return Object.entries(state.headerFilters).every(([key, value]) => {
    if (!value || key === excludedKey) {
      return true;
    }

    return row[key] === value;
  });
}

function reconcileHeaderFilters() {
  let changed = false;

  do {
    changed = false;

    Object.keys(state.headerFilters).forEach((key) => {
      const currentValue = state.headerFilters[key];

      if (currentValue && !getHeaderOptionValues(key).includes(currentValue)) {
        state.headerFilters[key] = "";
        changed = true;
      }
    });
  } while (changed);
}

function syncHeaderSelectOptions() {
  headerFilterFields.forEach(({ id, key }) => {
    const selectElement = document.getElementById(id);

    if (!selectElement) {
      return;
    }

    syncSelectElementOptions(selectElement, getHeaderOptionValues(key), state.headerFilters[key]);
    syncHeaderCombo(selectElement);
  });
}

function getLookupOptionMap() {
  return lookupSelectKeys.reduce((optionMap, key) => {
    optionMap[key] = getLookupOptionValues(key);
    return optionMap;
  }, {});
}

function getLookupOptionValues(targetKey) {
  const selectFilters = getLookupSelectFilters();

  return getOrderedValues(
    getHeaderFilteredRows(examineeGridRows)
      .filter((row) => matchesLookupFilters(row, selectFilters, targetKey))
      .map((row) => row[targetKey]),
  );
}

function getFilteredLookupRows() {
  return getHeaderFilteredRows(examineeGridRows).filter((row) => matchesLookupFilters(row, state.lookupFilters));
}

function getLookupSelectFilters() {
  return lookupSelectKeys.reduce((filters, key) => {
    filters[key] = state.lookupFilters[key];
    return filters;
  }, {});
}

function matchesLookupFilters(row, filters, excludedKey = "") {
  return Object.entries(filters).every(([key, value]) => {
    if (!value || key === excludedKey) {
      return true;
    }

    if (key === "examineeNo") {
      return row.examineeNo.includes(value.trim());
    }

    if (key === "examineeName") {
      return row.name.includes(value.trim());
    }

    return row[key] === value;
  });
}

function reconcileLookupFilters() {
  let changed = false;

  do {
    changed = false;

    lookupSelectKeys.forEach((key) => {
      const currentValue = state.lookupFilters[key];

      if (currentValue && !getLookupOptionValues(key).includes(currentValue)) {
        state.lookupFilters[key] = "";
        changed = true;
      }
    });
  } while (changed);
}

function updateLookupTextFilter(key, value) {
  state.lookupFilters[key] = value;
  reconcileLookupFilters();
  getTableState("admitCardLookupGrid").page = 1;
}

function rerenderWithFocus(activeElement) {
  const selectionStart =
    typeof activeElement.selectionStart === "number" ? activeElement.selectionStart : null;
  const selectionEnd = typeof activeElement.selectionEnd === "number" ? activeElement.selectionEnd : null;
  const targetId = activeElement.id;

  renderView();

  if (!targetId) {
    return;
  }

  const nextElement = document.getElementById(targetId);

  if (!nextElement) {
    return;
  }

  nextElement.focus();

  if (selectionStart !== null && selectionEnd !== null) {
    nextElement.setSelectionRange(selectionStart, selectionEnd);
  }
}

function buildOptionMarkup(values, selectedValue = "") {
  const normalizedSelectedValue = selectedValue && values.includes(selectedValue) ? selectedValue : "";

  return [`<option value="" ${normalizedSelectedValue === "" ? "selected" : ""}>전체</option>`]
    .concat(
      values.map(
        (value) =>
          `<option value="${escapeAttribute(value)}" ${normalizedSelectedValue === value ? "selected" : ""}>${escapeHtml(value)}</option>`,
      ),
    )
    .join("");
}

let headerComboMeasureContext = null;

function getHeaderComboMeasureContext() {
  if (headerComboMeasureContext) {
    return headerComboMeasureContext;
  }

  const canvas = document.createElement("canvas");
  headerComboMeasureContext = canvas.getContext("2d");
  return headerComboMeasureContext;
}

function measureHeaderComboMenuWidth(selectElement) {
  const measureContext = getHeaderComboMeasureContext();

  if (!measureContext || !(selectElement instanceof HTMLElement)) {
    return 150;
  }

  const referenceElement = selectElement.closest(".header-chip")?.querySelector(".header-chip-combo-trigger") || selectElement;
  const computedStyle = window.getComputedStyle(referenceElement);

  measureContext.font = [
    computedStyle.fontStyle,
    computedStyle.fontVariant,
    computedStyle.fontWeight,
    computedStyle.fontSize,
    computedStyle.fontFamily,
  ]
    .filter(Boolean)
    .join(" ");
  const optionWidths = Array.from(selectElement.options).map((option) =>
    measureContext.measureText(String(option.textContent || "").trim()).width,
  );

  return Math.max(150, Math.min(420, Math.ceil((optionWidths.length > 0 ? Math.max(...optionWidths) : 0) + 42)));
}

function getHeaderComboElement(selectId = "") {
  return document.getElementById(selectId)?.closest(".header-chip")?.querySelector(".header-chip-combo") || null;
}

function setHeaderComboOpen(selectId = "", isOpen = false) {
  const comboElement = getHeaderComboElement(selectId);

  if (!comboElement) {
    return false;
  }

  comboElement.classList.toggle("is-open", Boolean(isOpen));
  comboElement.querySelector("[data-header-combo-trigger]")?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  comboElement.querySelector(".header-chip-combo-menu")?.classList.toggle("hidden", !isOpen);
  return true;
}

function closeAllHeaderCombos(exceptSelectId = "") {
  let didClose = false;

  document.querySelectorAll(".header-chip-combo.is-open").forEach((comboElement) => {
    const selectId = String(comboElement.dataset.headerComboFor || "").trim();

    if (exceptSelectId && selectId === exceptSelectId) {
      return;
    }

    comboElement.classList.remove("is-open");
    comboElement.querySelector("[data-header-combo-trigger]")?.setAttribute("aria-expanded", "false");
    comboElement.querySelector(".header-chip-combo-menu")?.classList.add("hidden");
    didClose = true;
  });

  return didClose;
}

function buildHeaderComboOptionMarkup(selectElement) {
  return Array.from(selectElement.options)
    .map((option) => {
      const optionText = String(option.textContent || "").trim();

      return `
        <button
          class="header-chip-combo-option ${option.selected ? "active" : ""}"
          data-header-combo-option="${escapeAttribute(selectElement.id)}"
          data-header-combo-value="${escapeAttribute(option.value)}"
          type="button"
        >
          <span>${escapeHtml(optionText)}</span>
        </button>
      `;
    })
    .join("");
}

function syncHeaderCombo(selectElement) {
  if (!(selectElement instanceof HTMLSelectElement)) {
    return;
  }

  const headerChipElement = selectElement.closest(".header-chip");

  if (!headerChipElement) {
    return;
  }

  let comboElement = headerChipElement.querySelector(".header-chip-combo");

  if (!comboElement) {
    comboElement = document.createElement("div");
    comboElement.className = "header-chip-combo";
    headerChipElement.append(comboElement);
  }

  const selectedOption = selectElement.selectedOptions?.[0] || selectElement.options[selectElement.selectedIndex] || selectElement.options[0] || null;
  const menuWidth = measureHeaderComboMenuWidth(selectElement);
  const isOpen = comboElement.classList.contains("is-open");

  comboElement.dataset.headerComboFor = selectElement.id;
  comboElement.innerHTML = `
    <button
      class="header-chip-combo-trigger"
      data-header-combo-trigger="${escapeAttribute(selectElement.id)}"
      type="button"
      aria-expanded="${isOpen ? "true" : "false"}"
    >
      <span class="header-chip-combo-label">${escapeHtml(selectedOption?.textContent || "전체")}</span>
      <span class="header-chip-combo-caret" aria-hidden="true"></span>
    </button>
    <div class="header-chip-combo-menu ${isOpen ? "" : "hidden"}" style="width: ${menuWidth}px;">
      ${buildHeaderComboOptionMarkup(selectElement)}
    </div>
  `;
  selectElement.setAttribute("tabindex", "-1");
  selectElement.setAttribute("aria-hidden", "true");
}

function syncSelectElementOptions(selectElement, values, selectedValue = "") {
  selectElement.innerHTML = buildOptionMarkup(values, selectedValue);
}

function getOrderedValues(values) {
  return Array.from(new Set(values));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function decorateSelectFields() {
  document.querySelectorAll(".field").forEach((field) => {
    field.classList.toggle("select-field", Boolean(field.querySelector("select")));
  });
}

function startAccountEdit(accountId) {
  const account = accountGridRows.find((row) => row.id === accountId);

  if (!account) {
    return;
  }

  state.accountEditor = {
    editingId: account.id,
    draftName: account.name,
    draftRole: account.role,
  };
}

function cancelAccountEdit() {
  state.accountEditor = createAccountEditorState();
}

function updateAccountEditorField(fieldKey, value) {
  if (!state.accountEditor.editingId) {
    return;
  }

  state.accountEditor[fieldKey] = value;
}

async function saveAccountEdit(accountId) {
  try {
    const updatedAccount = await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: state.accountEditor.draftName,
        role: state.accountEditor.draftRole,
      }),
    });

    accountGridRows = accountGridRows.map((row) => (row.id === accountId ? normalizeAccountRecord(updatedAccount) : row));

    if (state.auth.currentUser?.id === accountId) {
      state.auth.currentUser = {
        ...state.auth.currentUser,
        name: updatedAccount.name,
        role: updatedAccount.role,
      };
    }

    cancelAccountEdit();
    renderView();
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    window.alert(error.message);
  }
}

async function resetAccountPasswordAction(accountId) {
  try {
    const result = await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}/reset-password`, {
      method: "POST",
    });
    const initialPassword = String(result?.password || getSystemInitialPassword());

    if (state.auth.currentUser?.id === accountId) {
      window.alert(`현재 로그인한 계정의 비밀번호를 ${initialPassword}로 초기화했습니다. 다시 로그인하세요.`);
      await logoutCurrentUser();
      return;
    }

    window.alert(`비밀번호를 ${initialPassword}로 초기화했습니다.`);
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    window.alert(error.message);
  }
}

async function deleteAccountAction(accountId) {
  const account = accountGridRows.find((row) => row.id === accountId);

  if (!account) {
    return;
  }

  if (!window.confirm(`${account.id} 계정을 삭제하시겠습니까?`)) {
    return;
  }

  try {
    await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    });
    accountGridRows = accountGridRows.filter((row) => row.id !== accountId);

    if (state.accountEditor.editingId === accountId) {
      cancelAccountEdit();
    }

    if (state.auth.currentUser?.id === accountId) {
      await logoutCurrentUser();
      return;
    }

    renderView();
  } catch (error) {
    if (handleAuthenticationFailure(error)) {
      return;
    }

    window.alert(error.message);
  }
}

function renderPrintHistory() {
  return `
    <section class="view-stack table-view-stack">
      ${renderExamineeResultTable({
        title: "수험표 출력 이력",
        gridKey: "printHistoryGrid",
        showPrintColumn: false,
        selectable: false,
        showRowNumber: true,
        emptyMessage: "출력 이력이 없습니다.",
        headerActionsMarkup: renderGridHeaderActions({ gridKey: "printHistoryGrid" }),
      })}
    </section>
  `;
}

function renderTemplateManagement() {
  return `
    <section class="view-stack template-management-view">
      <article class="form-card template-management-panel">
        <div class="section-header template-management-header">
          <div>
            <h3>수험표 양식 관리</h3>
            <p>등록된 수험표 양식을 확인하고 관리합니다.</p>
          </div>
          <button class="primary-button" data-add-template="true" type="button">새 양식 등록</button>
        </div>

        <div class="template-grid">
          ${
            state.templateCards.length > 0
              ? state.templateCards.map((card) => renderTemplateCard(card)).join("")
              : `
                <article class="panel-card">
                  <p>등록된 수험표 양식이 없습니다.</p>
                  <span class="muted">새 양식 등록 버튼으로 사용할 첫 양식을 생성하세요.</span>
                </article>
              `
          }
        </div>
      </article>
    </section>
  `;
}

function renderAccountManagement() {
  return `
    <section class="view-stack table-view-stack">
      ${renderExamineeResultTable({
        title: "계정 관리",
        gridKey: "accountManagementGrid",
        showPrintColumn: false,
        selectable: false,
        showRowNumber: true,
        emptyMessage: "등록된 계정이 없습니다.",
        headerActionsMarkup: renderGridHeaderActions({ gridKey: "accountManagementGrid" }),
      })}
    </section>
  `;
}
const renderers = {
  dashboard: renderDashboard,
  examineeRegistration: renderExamineeRegistration,
  admitCardLookup: renderAdmitCardLookup,
  printHistory: renderPrintHistory,
  templateManagement: renderTemplateManagement,
  accountManagement: renderAccountManagement,
  loginNoticeSettings: renderLoginNoticeSettings,
  systemSettings: renderSystemSettings,
};
