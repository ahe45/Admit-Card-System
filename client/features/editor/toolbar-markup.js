(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardEditorToolbarMarkup = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createEditorToolbarMarkupRenderer({
    EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
    EDITOR_TOOLBAR_FONT_OPTIONS,
    EDITOR_TOOLBAR_FONT_SIZE_OPTIONS,
    EDITOR_TOOLBAR_ICON_MARKUP,
    EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
    isEditorToolbarPresetFontSize,
    normalizeEditorToolbarColorValue,
  }) {
    function escapeEditorToolbarHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function escapeEditorToolbarAttribute(value) {
      return escapeEditorToolbarHtml(value)
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderEditorToolbarAttribute(attributeName, attributeValue) {
      if (!attributeName) {
        return "";
      }

      return ` ${attributeName}="${escapeEditorToolbarAttribute(attributeValue)}"`;
    }

    function renderEditorToolbarIconButton({
      attributeName = "",
      attributeValue = "",
      label = "",
      title = label,
      iconMarkup = "",
      extraClassName = "",
    }) {
      const className = ["template-tool-button", "icon-only", extraClassName].filter(Boolean).join(" ");

      return `
        <button class="${className}"${renderEditorToolbarAttribute(attributeName, attributeValue)} type="button" aria-label="${escapeEditorToolbarAttribute(label)}" title="${escapeEditorToolbarAttribute(title)}">
          ${iconMarkup}
          <span class="sr-only">${escapeEditorToolbarHtml(label)}</span>
        </button>
      `;
    }

    function renderEditorToolbarTextButton({
      attributeName = "",
      attributeValue = "",
      label = "",
      title = label,
      textContent = "",
    }) {
      return `
        <button class="template-tool-button type-emphasis icon-only"${renderEditorToolbarAttribute(attributeName, attributeValue)} type="button" aria-label="${escapeEditorToolbarAttribute(label)}" title="${escapeEditorToolbarAttribute(title)}">
          <span aria-hidden="true">${escapeEditorToolbarHtml(textContent)}</span>
          <span class="sr-only">${escapeEditorToolbarHtml(label)}</span>
        </button>
      `;
    }

    function renderEditorToolbarFontOptions(selectedValue = "") {
      const normalizedSelectedValue = String(selectedValue || "").trim();

      return EDITOR_TOOLBAR_FONT_OPTIONS.map((option) => `
        <option value="${escapeEditorToolbarAttribute(option.value)}"${option.value === normalizedSelectedValue ? " selected" : ""}>${escapeEditorToolbarHtml(option.label)}</option>
      `).join("");
    }

    function renderEditorToolbarFontSizeOptionButtons(selectedValue = 14) {
      const normalizedSelectedValue = Math.round(Number(selectedValue));
      const activeValue = Number.isFinite(normalizedSelectedValue) && isEditorToolbarPresetFontSize(normalizedSelectedValue)
        ? String(normalizedSelectedValue)
        : "";

      return EDITOR_TOOLBAR_FONT_SIZE_OPTIONS.map((fontSize) => {
        const fontSizeValue = String(fontSize);
        const isActive = fontSizeValue === activeValue;

        return `
          <button
            class="template-toolbar-combo-option${isActive ? " active" : ""}"
            data-editor-font-size-option="${escapeEditorToolbarAttribute(fontSizeValue)}"
            type="button"
            role="option"
            aria-selected="${isActive ? "true" : "false"}"
          >
            ${escapeEditorToolbarHtml(fontSizeValue)}px
          </button>
        `;
      }).join("");
    }

    const EDITOR_TOOLBAR_BORDER_TARGET_OPTIONS = Object.freeze([
      Object.freeze({ label: "모든 테두리", value: "all" }),
      Object.freeze({ label: "바깥쪽 테두리", value: "outside" }),
      Object.freeze({ label: "안쪽 테두리", value: "inside" }),
      Object.freeze({ label: "위쪽 테두리", value: "top" }),
      Object.freeze({ label: "오른쪽 테두리", value: "right" }),
      Object.freeze({ label: "아래쪽 테두리", value: "bottom" }),
      Object.freeze({ label: "왼쪽 테두리", value: "left" }),
    ]);

    const EDITOR_TOOLBAR_BORDER_STYLE_OPTIONS = Object.freeze([
      Object.freeze({ label: "실선", value: "solid" }),
      Object.freeze({ label: "파선", value: "dashed" }),
      Object.freeze({ label: "점선", value: "dotted" }),
      Object.freeze({ label: "이중선", value: "double" }),
      Object.freeze({ label: "선 없음", value: "none" }),
    ]);

    function renderEditorToolbarBorderTargetIcon(target = "all") {
      const activeByTarget = {
        all: `
          <rect class="template-toolbar-border-icon-active" x="5" y="5" width="14" height="14" rx="1.5"></rect>
          <path class="template-toolbar-border-icon-active" d="M5 12h14"></path>
          <path class="template-toolbar-border-icon-active" d="M12 5v14"></path>
        `,
        outside: '<rect class="template-toolbar-border-icon-active" x="5" y="5" width="14" height="14" rx="1.5"></rect>',
        inside: `
          <path class="template-toolbar-border-icon-active" d="M5 12h14"></path>
          <path class="template-toolbar-border-icon-active" d="M12 5v14"></path>
        `,
        top: '<path class="template-toolbar-border-icon-active" d="M5 5h14"></path>',
        right: '<path class="template-toolbar-border-icon-active" d="M19 5v14"></path>',
        bottom: '<path class="template-toolbar-border-icon-active" d="M5 19h14"></path>',
        left: '<path class="template-toolbar-border-icon-active" d="M5 5v14"></path>',
      };

      return `
        <svg class="template-toolbar-dropdown-icon template-toolbar-border-target-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect class="template-toolbar-border-icon-muted" x="5" y="5" width="14" height="14" rx="1.5"></rect>
          <path class="template-toolbar-border-icon-muted" d="M5 12h14"></path>
          <path class="template-toolbar-border-icon-muted" d="M12 5v14"></path>
          ${activeByTarget[target] || activeByTarget.all}
        </svg>
      `;
    }

    function renderEditorToolbarBorderStyleIcon(style = "solid") {
      const iconMarkupByStyle = {
        solid: '<path class="template-toolbar-border-icon-active" d="M5 12h14"></path>',
        dashed: '<path class="template-toolbar-border-icon-active" d="M5 12h14" stroke-dasharray="4 3"></path>',
        dotted: '<path class="template-toolbar-border-icon-active" d="M5 12h14" stroke-linecap="round" stroke-dasharray="1 4"></path>',
        double: `
          <path class="template-toolbar-border-icon-active" d="M5 10h14"></path>
          <path class="template-toolbar-border-icon-active" d="M5 14h14"></path>
        `,
        none: `
          <path class="template-toolbar-border-icon-muted" d="M5 12h14"></path>
          <path class="template-toolbar-border-icon-active" d="M7 17 17 7"></path>
        `,
      };

      return `
        <svg class="template-toolbar-dropdown-icon template-toolbar-border-style-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          ${iconMarkupByStyle[style] || iconMarkupByStyle.solid}
        </svg>
      `;
    }

    function renderEditorToolbarBorderDropdown({
      id = "",
      ariaLabel = "",
      options = [],
      renderIcon = () => "",
      selectWrapClassName = "",
      selectedValue = "",
    } = {}) {
      const normalizedSelectedValue = String(selectedValue || options[0]?.value || "").trim();
      const selectedOption = options.find((option) => option.value === normalizedSelectedValue) || options[0] || null;
      const menuId = `${id}Menu`;
      const optionMarkup = options.map((option) => {
        const isActive = option.value === selectedOption?.value;

        return `
          <button
            class="template-toolbar-icon-select-option${isActive ? " active" : ""}"
            data-editor-border-select-option="${escapeEditorToolbarAttribute(option.value)}"
            type="button"
            role="option"
            aria-selected="${isActive ? "true" : "false"}"
          >
            <span class="template-toolbar-icon-select-option-icon" data-editor-border-select-option-icon aria-hidden="true">
              ${renderIcon(option.value)}
            </span>
            <span class="template-toolbar-icon-select-option-label">${escapeEditorToolbarHtml(option.label)}</span>
          </button>
        `;
      }).join("");

      return `
        <span class="template-toolbar-select-wrap template-toolbar-icon-select ${selectWrapClassName}" data-editor-border-select="${escapeEditorToolbarAttribute(id)}">
          <select class="template-toolbar-select template-toolbar-border-select template-toolbar-border-native-select" id="${escapeEditorToolbarAttribute(id)}" aria-label="${escapeEditorToolbarAttribute(ariaLabel)}" tabindex="-1">
            ${options.map((option) => `
              <option value="${escapeEditorToolbarAttribute(option.value)}"${option.value === selectedOption?.value ? " selected" : ""}>${escapeEditorToolbarHtml(option.label)}</option>
            `).join("")}
          </select>
          <button
            class="template-toolbar-icon-select-button"
            data-editor-border-select-toggle="${escapeEditorToolbarAttribute(id)}"
            type="button"
            aria-label="${escapeEditorToolbarAttribute(ariaLabel)}"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="${escapeEditorToolbarAttribute(menuId)}"
          >
            <span class="template-toolbar-icon-select-current-icon" data-editor-border-select-current-icon aria-hidden="true">
              ${selectedOption ? renderIcon(selectedOption.value) : ""}
            </span>
            <span class="template-toolbar-icon-select-label" data-editor-border-select-label>${escapeEditorToolbarHtml(selectedOption?.label || "")}</span>
            <span class="template-toolbar-icon-select-caret" aria-hidden="true"></span>
          </button>
          <div class="template-toolbar-icon-select-menu hidden" id="${escapeEditorToolbarAttribute(menuId)}" data-editor-border-select-menu-for="${escapeEditorToolbarAttribute(id)}" role="listbox" aria-label="${escapeEditorToolbarAttribute(ariaLabel)}">
            ${optionMarkup}
          </div>
        </span>
      `;
    }

    function renderEditorToolbarColorPresetButtons({
      inputId = "",
      inputValue = "#ffffff",
      presetColors = [],
      colorCommand = "",
      colorTableAction = "",
      fallbackValue = "#ffffff",
    }) {
      const normalizedSelectedValue = normalizeEditorToolbarColorValue(inputValue, fallbackValue);

      return presetColors
        .map((preset) => {
          const normalizedPresetValue = normalizeEditorToolbarColorValue(preset.value, fallbackValue);
          const isActive = normalizedPresetValue === normalizedSelectedValue;

          return `
            <button
              class="template-toolbar-color-swatch${isActive ? " active" : ""}"
              data-editor-color-input="${escapeEditorToolbarAttribute(inputId)}"
              data-editor-color-preset="${escapeEditorToolbarAttribute(normalizedPresetValue)}"
              ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
              ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
              type="button"
              aria-label="${escapeEditorToolbarAttribute(preset.label)}"
              aria-pressed="${isActive ? "true" : "false"}"
              title="${escapeEditorToolbarAttribute(preset.label)}"
              style="--editor-toolbar-swatch-color: ${escapeEditorToolbarAttribute(normalizedPresetValue)};"
            >
              <span class="sr-only">${escapeEditorToolbarHtml(preset.label)}</span>
            </button>
          `;
        })
        .join("");
    }

    function renderEditorToolbarColorPickerSection({
      sectionLabel = "색상",
      inputId = "",
      inputValue = "#ffffff",
      presetColors = [],
      colorCommand = "",
      colorTableAction = "",
      fallbackValue = "#ffffff",
      sectionClassName = "",
      pickerClassName = "",
      triggerLabel = "선택",
    } = {}) {
      const panelId = `${inputId}Panel`;
      const normalizedInputValue = normalizeEditorToolbarColorValue(inputValue, fallbackValue);
      const sectionClassNames = ["template-toolbar-section", sectionClassName].filter(Boolean).join(" ");
      const pickerClassNames = ["template-toolbar-color-picker", pickerClassName].filter(Boolean).join(" ");

      return `
        <div class="${escapeEditorToolbarAttribute(sectionClassNames)}">
          <span class="template-toolbar-section-label">${escapeEditorToolbarHtml(sectionLabel)}</span>
          <div class="template-toolbar-group-controls">
            <div
              class="${escapeEditorToolbarAttribute(pickerClassNames)}"
              data-editor-color-picker="${escapeEditorToolbarAttribute(inputId)}"
              style="--editor-toolbar-current-color: ${escapeEditorToolbarAttribute(normalizedInputValue)};"
            >
              <button
                class="template-toolbar-color-trigger"
                data-editor-color-toggle="${escapeEditorToolbarAttribute(inputId)}"
                type="button"
                aria-expanded="false"
                aria-controls="${escapeEditorToolbarAttribute(panelId)}"
              >
                <span class="template-toolbar-color-trigger-swatch" aria-hidden="true"></span>
                <span class="template-toolbar-color-trigger-label">${escapeEditorToolbarHtml(triggerLabel)}</span>
                <span class="template-toolbar-color-trigger-caret" aria-hidden="true"></span>
              </button>
              <div class="template-toolbar-color-panel hidden" id="${escapeEditorToolbarAttribute(panelId)}">
                <div class="template-toolbar-color-presets" role="group" aria-label="${escapeEditorToolbarAttribute(`${sectionLabel} 프리셋`)}">
                  ${renderEditorToolbarColorPresetButtons({
                    inputId,
                    inputValue: normalizedInputValue,
                    presetColors,
                    colorCommand,
                    colorTableAction,
                    fallbackValue,
                  })}
                </div>
                <div class="template-toolbar-color-panel-actions">
                  <button
                    class="template-toolbar-color-direct-button"
                    data-editor-color-direct="true"
                    data-editor-color-input="${escapeEditorToolbarAttribute(inputId)}"
                    ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
                    ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
                    type="button"
                  >
                    <span class="template-toolbar-color-direct-swatch" aria-hidden="true"></span>
                    <span>직접 선택</span>
                  </button>
                </div>
                <input
                  class="template-toolbar-color template-toolbar-color-input-hidden"
                  id="${escapeEditorToolbarAttribute(inputId)}"
                  ${colorCommand ? renderEditorToolbarAttribute("data-editor-color-command", colorCommand) : ""}
                  ${colorTableAction ? renderEditorToolbarAttribute("data-editor-color-table-action", colorTableAction) : ""}
                  type="color"
                  value="${escapeEditorToolbarAttribute(normalizedInputValue)}"
                  tabindex="-1"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderEditorToolbarTableInsertPopover({
      insertAttr = "",
      panelId = "",
      rowsId = "",
      columnsId = "",
    } = {}) {
      return `
        <div
          class="template-toolbar-table-insert-popover"
          data-editor-table-insert-popover="${escapeEditorToolbarAttribute(panelId)}"
        >
          <button
            class="template-tool-button icon-only template-toolbar-table-insert-toggle"
            ${renderEditorToolbarAttribute(insertAttr, "table")}
            ${renderEditorToolbarAttribute("data-editor-table-insert-toggle", panelId)}
            type="button"
            aria-label="표 삽입"
            title="표 삽입"
            aria-expanded="false"
            aria-controls="${escapeEditorToolbarAttribute(panelId)}"
          >
            ${EDITOR_TOOLBAR_ICON_MARKUP.insertTable}
            <span class="sr-only">표 삽입</span>
          </button>
          <div
            class="template-table-insert-panel hidden"
            id="${escapeEditorToolbarAttribute(panelId)}"
            role="group"
            aria-label="표 삽입 설정"
          >
            <label class="template-toolbar-subfield" for="${escapeEditorToolbarAttribute(rowsId)}">
              <span>행</span>
              <input class="template-toolbar-number" id="${escapeEditorToolbarAttribute(rowsId)}" type="number" min="1" max="20" step="1" value="3" />
            </label>
            <label class="template-toolbar-subfield" for="${escapeEditorToolbarAttribute(columnsId)}">
              <span>열</span>
              <input class="template-toolbar-number" id="${escapeEditorToolbarAttribute(columnsId)}" type="number" min="1" max="8" step="1" value="2" />
            </label>
            <button class="template-tool-button"${renderEditorToolbarAttribute(insertAttr, "table-confirm")} type="button">표 추가</button>
          </div>
        </div>
      `;
    }

    function renderEditorToolbarCellSplitPopover({
      panelId = "",
      countId = "",
      axisName = "",
      axisRowId = "",
      axisColumnId = "",
    } = {}) {
      return `
        <div
          class="template-toolbar-table-insert-popover template-toolbar-cell-split-popover"
          data-editor-table-insert-popover="${escapeEditorToolbarAttribute(panelId)}"
        >
          <button
            class="template-tool-button icon-only template-toolbar-table-insert-toggle template-toolbar-cell-split-toggle"
            ${renderEditorToolbarAttribute("data-template-cell-split-toggle", panelId)}
            ${renderEditorToolbarAttribute("data-editor-table-insert-toggle", panelId)}
            type="button"
            aria-label="셀 분할"
            title="셀 분할"
            aria-expanded="false"
            aria-controls="${escapeEditorToolbarAttribute(panelId)}"
          >
            ${EDITOR_TOOLBAR_ICON_MARKUP.splitCell}
            <span class="sr-only">셀 분할</span>
          </button>
          <div
            class="template-table-insert-panel template-toolbar-cell-split-panel hidden"
            id="${escapeEditorToolbarAttribute(panelId)}"
            role="group"
            aria-label="셀 분할 설정"
          >
            <fieldset class="template-toolbar-subfield template-toolbar-subfield-wide template-toolbar-choice-field">
              <legend>편집</legend>
              <div class="template-toolbar-choice-group" role="radiogroup" aria-label="셀 분할 방향">
                <label class="template-toolbar-choice-option" for="${escapeEditorToolbarAttribute(axisRowId)}">
                  <input
                    class="sr-only"
                    id="${escapeEditorToolbarAttribute(axisRowId)}"
                    name="${escapeEditorToolbarAttribute(axisName)}"
                    type="radio"
                    value="row"
                  />
                  <span>행</span>
                </label>
                <label class="template-toolbar-choice-option" for="${escapeEditorToolbarAttribute(axisColumnId)}">
                  <input
                    class="sr-only"
                    id="${escapeEditorToolbarAttribute(axisColumnId)}"
                    name="${escapeEditorToolbarAttribute(axisName)}"
                    type="radio"
                    value="column"
                    checked
                  />
                  <span>열</span>
                </label>
              </div>
            </fieldset>
            <label class="template-toolbar-subfield template-toolbar-subfield-wide" for="${escapeEditorToolbarAttribute(countId)}">
              <span>칸</span>
              <span class="template-toolbar-number-stepper">
                <input class="template-toolbar-number template-toolbar-number-stepper-input" id="${escapeEditorToolbarAttribute(countId)}" type="number" min="2" step="1" value="2" />
                <span class="template-toolbar-number-stepper-controls">
                  <button class="template-toolbar-number-stepper-button" data-template-cell-split-step="up" type="button" aria-label="분할 칸 수 증가" title="증가">
                    <span aria-hidden="true">▲</span>
                  </button>
                  <button class="template-toolbar-number-stepper-button" data-template-cell-split-step="down" type="button" aria-label="분할 칸 수 감소" title="감소">
                    <span aria-hidden="true">▼</span>
                  </button>
                </span>
              </span>
            </label>
            <button class="template-tool-button" data-template-cell-split-confirm="true" type="button">셀 분할</button>
          </div>
        </div>
      `;
    }

    function renderEditorToolbarBorderSection({
      tableActionAttr = "",
      borderTargetId = "",
      borderStyleId = "",
      borderWidthId = "",
      borderColorId = "",
    } = {}) {
      if (!borderTargetId || !borderStyleId || !borderWidthId || !borderColorId) {
        return "";
      }

      return `
        <div class="template-toolbar-section template-toolbar-border-section">
          <span class="template-toolbar-section-label">테두리</span>
          <div class="template-toolbar-border-controls">
            ${renderEditorToolbarBorderDropdown({
              id: borderTargetId,
              ariaLabel: "테두리 적용 위치",
              options: EDITOR_TOOLBAR_BORDER_TARGET_OPTIONS,
              renderIcon: renderEditorToolbarBorderTargetIcon,
              selectWrapClassName: "template-toolbar-select-wrap-border-target",
              selectedValue: "all",
            })}
            ${renderEditorToolbarBorderDropdown({
              id: borderStyleId,
              ariaLabel: "테두리 선 스타일",
              options: EDITOR_TOOLBAR_BORDER_STYLE_OPTIONS,
              renderIcon: renderEditorToolbarBorderStyleIcon,
              selectWrapClassName: "template-toolbar-select-wrap-border-style",
              selectedValue: "solid",
            })}
            <label class="template-toolbar-border-width-field" for="${escapeEditorToolbarAttribute(borderWidthId)}">
              <span class="sr-only">테두리 굵기</span>
              <input class="template-toolbar-number template-toolbar-border-width" id="${escapeEditorToolbarAttribute(borderWidthId)}" type="number" min="0" max="12" step="1" value="1" aria-label="테두리 굵기" />
              <span aria-hidden="true">px</span>
            </label>
            ${renderEditorToolbarColorPickerSection({
              sectionLabel: "색상",
              inputId: borderColorId,
              inputValue: "#000000",
              presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
              colorTableAction: "apply-cell-border",
              fallbackValue: "#000000",
              sectionClassName: "template-toolbar-section-border-color",
              pickerClassName: "template-toolbar-color-picker-compact template-toolbar-color-picker-align-end",
              triggerLabel: "색상",
            })}
            <button class="template-tool-button template-toolbar-border-apply" ${renderEditorToolbarAttribute(tableActionAttr, "apply-cell-border")} type="button">적용</button>
          </div>
        </div>
      `;
    }

    function renderEditorToolbarInner({
      commandAttr = "",
      commandSelectAttr = "",
      actionAttr = "",
      tableActionAttr = "",
      insertAttr = "",
      openImageAttr = "",
      showLinkAction = false,
      linkActionValue = "link",
      tableInsertLocation = "insert-group",
      tableLayout = "default",
      fontFamilyId = "",
      fontFamilyValue = EDITOR_TOOLBAR_FONT_OPTIONS[0].value,
      fontSizeId = "",
      fontSizeValue = 14,
      textColorId = "",
      textColorValue = EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR,
      textShadingId = "",
      textShadingValue = "#fff59d",
      cellShadingId = "",
      cellShadingValue = "#ffffff",
      tableInsertPanelId = "",
      tableRowsId = "",
      tableColumnsId = "",
      cellSplitPanelId = "",
      cellSplitCountId = "",
      cellSplitAxisName = "",
      cellSplitAxisRowId = "",
      cellSplitAxisColumnId = "",
      borderTargetId = "",
      borderStyleId = "",
      borderWidthId = "",
      borderColorId = "",
      imageInputId = "",
    }) {
      const resolvedFontSizeMenuId = `${fontSizeId}Menu`;
      const shouldRenderTableInsertInTableAddSection = tableInsertLocation === "table-add-section";
      const shouldRenderTableInsertInInsertGroup = !shouldRenderTableInsertInTableAddSection;
      const useNoticeTableLayout = tableLayout === "notice";
      const tableInsertPopoverMarkup = renderEditorToolbarTableInsertPopover({
        insertAttr,
        panelId: tableInsertPanelId,
        rowsId: tableRowsId,
        columnsId: tableColumnsId,
      });
      const tablePlacementSectionMarkup = `
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">배치</span>
          <div class="template-toolbar-group-controls">
            ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "cell-vertical-align-top", label: "셀 위쪽 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.cellVerticalAlignTop })}
            ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "cell-vertical-align-middle", label: "셀 가운데 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.cellVerticalAlignMiddle })}
            ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "cell-vertical-align-bottom", label: "셀 아래쪽 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.cellVerticalAlignBottom })}
          </div>
        </div>
      `;
      const tableFitSectionMarkup = `
        <div class="template-toolbar-section">
          <span class="template-toolbar-section-label">맞춤</span>
          <div class="template-toolbar-group-controls">
            ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "equalize-column-widths", label: "열 너비 맞춤", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.equalizeColumnWidths })}
            ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "equalize-row-heights", label: "행 높이 맞춤", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.equalizeRowHeights })}
          </div>
        </div>
      `;
      const tableShadingSectionMarkup = renderEditorToolbarColorPickerSection({
        sectionLabel: "음영",
        inputId: cellShadingId,
        inputValue: cellShadingValue,
        presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS,
        colorTableAction: "apply-cell-shading",
        fallbackValue: "#ffffff",
        sectionClassName: useNoticeTableLayout ? "" : "template-toolbar-section-compact",
        pickerClassName: useNoticeTableLayout
          ? ""
          : "template-toolbar-color-picker-compact template-toolbar-color-picker-align-end",
      });
      const tableBorderSectionMarkup = renderEditorToolbarBorderSection({
        tableActionAttr,
        borderTargetId,
        borderStyleId,
        borderWidthId,
        borderColorId,
      });

      return `
        <div class="template-toolbar-group">
          <span class="template-toolbar-group-label">서식</span>
          <div class="template-toolbar-section-row template-toolbar-section-row-dual">
            <div class="template-toolbar-section template-toolbar-section-compact">
              <span class="template-toolbar-section-label">글꼴</span>
              <div class="template-toolbar-group-controls">
                <span class="template-toolbar-select-wrap">
                  <select class="template-toolbar-select template-toolbar-select-wide" id="${escapeEditorToolbarAttribute(fontFamilyId)}"${renderEditorToolbarAttribute(commandSelectAttr, "fontName")}>
                    ${renderEditorToolbarFontOptions(fontFamilyValue)}
                  </select>
                  <span class="template-toolbar-select-caret" aria-hidden="true"></span>
                </span>
              </div>
            </div>
            <div class="template-toolbar-section template-toolbar-section-compact">
              <span class="template-toolbar-section-label">크기</span>
              <div class="template-toolbar-group-controls template-toolbar-font-size-controls">
                <div class="template-toolbar-font-size-combo" data-editor-font-size-combo="${escapeEditorToolbarAttribute(fontSizeId)}">
                  <input class="template-toolbar-number template-toolbar-font-size-input" id="${escapeEditorToolbarAttribute(fontSizeId)}" type="text" inputmode="numeric" autocomplete="off" value="${escapeEditorToolbarAttribute(String(fontSizeValue))}" aria-label="글꼴 크기 직접 입력" />
                  <button class="template-toolbar-combo-toggle" data-editor-font-size-toggle="${escapeEditorToolbarAttribute(fontSizeId)}" type="button" aria-label="글꼴 크기 목록 열기" aria-expanded="false" aria-controls="${escapeEditorToolbarAttribute(resolvedFontSizeMenuId)}">
                    <span class="template-toolbar-combo-caret" aria-hidden="true"></span>
                  </button>
                  <div class="template-toolbar-combo-menu hidden" id="${escapeEditorToolbarAttribute(resolvedFontSizeMenuId)}" data-editor-font-size-menu-for="${escapeEditorToolbarAttribute(fontSizeId)}" role="listbox" aria-label="글꼴 크기 목록">
                    ${renderEditorToolbarFontSizeOptionButtons(fontSizeValue)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="template-toolbar-section">
            <span class="template-toolbar-section-label">스타일</span>
            <div class="template-toolbar-group-controls">
              ${renderEditorToolbarTextButton({ attributeName: commandAttr, attributeValue: "bold", label: "굵게", textContent: "B" })}
              ${renderEditorToolbarTextButton({ attributeName: commandAttr, attributeValue: "italic", label: "기울임", textContent: "I" })}
              ${renderEditorToolbarTextButton({ attributeName: commandAttr, attributeValue: "underline", label: "밑줄", textContent: "U" })}
              ${renderEditorToolbarIconButton({ attributeName: commandAttr, attributeValue: "insertUnorderedList", label: "목록", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.unorderedList })}
            </div>
          </div>
          <div class="template-toolbar-section">
            <span class="template-toolbar-section-label">정렬</span>
            <div class="template-toolbar-group-controls">
              ${renderEditorToolbarIconButton({ attributeName: commandAttr, attributeValue: "justifyLeft", label: "왼쪽 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyLeft })}
              ${renderEditorToolbarIconButton({ attributeName: commandAttr, attributeValue: "justifyCenter", label: "가운데 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyCenter })}
              ${renderEditorToolbarIconButton({ attributeName: commandAttr, attributeValue: "justifyRight", label: "오른쪽 정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyRight })}
              ${renderEditorToolbarIconButton({ attributeName: commandAttr, attributeValue: "justifyFull", label: "배분정렬", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.justifyFull })}
            </div>
          </div>
          <div class="template-toolbar-section-row template-toolbar-section-row-dual">
            ${renderEditorToolbarColorPickerSection({ sectionLabel: "글자색", inputId: textColorId, inputValue: textColorValue, presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS, colorCommand: "foreColor", fallbackValue: EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR, sectionClassName: "template-toolbar-section-compact", pickerClassName: "template-toolbar-color-picker-compact" })}
            ${renderEditorToolbarColorPickerSection({ sectionLabel: "음영", inputId: textShadingId, inputValue: textShadingValue, presetColors: EDITOR_TOOLBAR_TEXT_COLOR_PRESETS, colorCommand: "hiliteColor", fallbackValue: "#fff59d", sectionClassName: "template-toolbar-section-compact", pickerClassName: "template-toolbar-color-picker-compact template-toolbar-color-picker-align-end" })}
          </div>
        </div>
        <div class="template-toolbar-group">
          <span class="template-toolbar-group-label">표</span>
          <div class="template-toolbar-section">
            <span class="template-toolbar-section-label">추가</span>
            <div class="template-toolbar-group-controls">
              ${shouldRenderTableInsertInTableAddSection ? tableInsertPopoverMarkup : ""}
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "insert-row-before", label: "위에 행 추가", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertRowBefore })}
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "insert-row-after", label: "아래에 행 추가", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertRowAfter })}
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "insert-column-before", label: "왼쪽에 열 추가", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertColumnBefore })}
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "insert-column-after", label: "오른쪽에 열 추가", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.insertColumnAfter })}
            </div>
          </div>
          <div class="template-toolbar-section">
            <span class="template-toolbar-section-label">삭제</span>
            <div class="template-toolbar-group-controls">
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "delete-row", label: "행 삭제", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.deleteRow })}
              ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "delete-column", label: "열 삭제", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.deleteColumn })}
            </div>
          </div>
          ${useNoticeTableLayout
            ? `
              <div class="template-toolbar-section-row template-toolbar-section-row-dual">
                <div class="template-toolbar-section">
                  <span class="template-toolbar-section-label">편집</span>
                  <div class="template-toolbar-group-controls">
                    ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "merge-selection", label: "선택한 셀 병합", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.mergeSelection })}
                    ${renderEditorToolbarCellSplitPopover({
                      panelId: cellSplitPanelId,
                      countId: cellSplitCountId,
                      axisName: cellSplitAxisName,
                      axisRowId: cellSplitAxisRowId,
                      axisColumnId: cellSplitAxisColumnId,
                    })}
                  </div>
                </div>
                ${tableFitSectionMarkup}
              </div>
              ${tablePlacementSectionMarkup}
              ${tableShadingSectionMarkup}
              ${tableBorderSectionMarkup}
            `
            : `
              <div class="template-toolbar-section-row template-toolbar-section-row-dual">
                <div class="template-toolbar-section">
                  <span class="template-toolbar-section-label">편집</span>
                  <div class="template-toolbar-group-controls">
                    ${renderEditorToolbarIconButton({ attributeName: tableActionAttr, attributeValue: "merge-selection", label: "선택한 셀 병합", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.mergeSelection })}
                    ${renderEditorToolbarCellSplitPopover({
                      panelId: cellSplitPanelId,
                      countId: cellSplitCountId,
                      axisName: cellSplitAxisName,
                      axisRowId: cellSplitAxisRowId,
                      axisColumnId: cellSplitAxisColumnId,
                    })}
                  </div>
                </div>
                ${tableFitSectionMarkup}
              </div>
              <div class="template-toolbar-section-row template-toolbar-section-row-dual">
                ${tablePlacementSectionMarkup}
                ${tableShadingSectionMarkup}
              </div>
              ${tableBorderSectionMarkup}
            `}
        </div>
        <div class="template-toolbar-group">
          <span class="template-toolbar-group-label">삽입</span>
          <div class="template-toolbar-section">
            <span class="template-toolbar-section-label">개체</span>
            <div class="template-toolbar-group-controls">
              ${shouldRenderTableInsertInInsertGroup ? tableInsertPopoverMarkup : ""}
              ${renderEditorToolbarIconButton({ attributeName: openImageAttr, attributeValue: "true", label: "이미지 삽입", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.openImage })}
              ${showLinkAction
                ? renderEditorToolbarIconButton({ attributeName: actionAttr, attributeValue: linkActionValue, label: "링크 삽입", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.link })
                : ""}
              ${renderEditorToolbarIconButton({ attributeName: insertAttr, attributeValue: "barcode", label: "바코드 삽입", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.barcode })}
              ${renderEditorToolbarIconButton({ attributeName: insertAttr, attributeValue: "qrcode", label: "QR코드 삽입", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.qrcode })}
              ${renderEditorToolbarIconButton({ attributeName: insertAttr, attributeValue: "rule", label: "구분선", iconMarkup: EDITOR_TOOLBAR_ICON_MARKUP.rule })}
            </div>
          </div>
        </div>
        <input class="upload-file-input" id="${escapeEditorToolbarAttribute(imageInputId)}" type="file" accept="image/*" />
      `;
    }

    function renderEditorToolbar({
      toolbarClassName = "",
      ariaLabel = "편집 도구",
      ...options
    }) {
      const className = ["editor-toolbar", toolbarClassName].filter(Boolean).join(" ");

      return `
        <div class="${escapeEditorToolbarAttribute(className)}" role="toolbar" aria-label="${escapeEditorToolbarAttribute(ariaLabel)}">
          ${renderEditorToolbarInner(options)}
        </div>
      `;
    }

    return Object.freeze({
      renderEditorToolbar,
      renderEditorToolbarInner,
    });
  }

  return Object.freeze({
    createEditorToolbarMarkupRenderer,
  });
});
