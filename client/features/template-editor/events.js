(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorEventHandlers({
    addTemplateCard,
    applyTemplateCard,
    applyTemplateEditorCommand,
    applyTemplateEditorFontFamily,
    applyTemplateEditorFontSize,
    applyTemplateTableSize,
    clearTemplateEditorImageSelection,
    clearTemplateEditorTableHoverState,
    clearTemplateEditorTableSelection,
    closeTemplateCardMetaEditor,
    deleteTemplateCard,
    getTemplateEditorImageInput,
    getTemplateEditorImageTarget,
    getTemplateEditorModal,
    getTemplateEditorSurface,
    getTemplateEditorTableInsertPanel,
    handleTemplateEditorInsert,
    handleTemplateEditorTablePointerDown,
    handleTemplateEditorTokenDeletion,
    handleTemplateTableAction,
    insertTemplateImage,
    insertTemplateTag,
    openTemplateCardMetaEditor,
    openTemplateEditor,
    openTemplatePreview,
    printTemplatePreview,
    redoTemplateEditorHistory,
    saveTemplateCardMetaEditor,
    saveTemplateEditor,
    saveTemplateEditorSelection,
    selectTemplateEditorImage,
    setEditorToolbarFontSizeMenuVisibility,
    setTemplateEditorTableInsertPanelVisibility,
    startTemplateEditorImageMoveSession,
    state,
    syncEditorToolbarFontSizeMenuSelection,
    syncTemplateEditorContent,
    undoTemplateEditorHistory,
    updateTemplateCardMetaEditorDraft,
    updateTemplateEditorActiveCell,
    updateTemplateEditorFormattingControls,
    updateTemplateEditorImageSelectionOverlay,
    updateTemplateEditorTableHoverState,
    updateTemplateTableControls,
  }) {
    function handleClick(event) {
      const fontSizeToggleTrigger = event.target.closest("#templateEditorModal [data-editor-font-size-toggle]");
      const fontSizeOptionTrigger = event.target.closest("#templateEditorModal [data-editor-font-size-option]");
      const addTemplateTrigger = event.target.closest("[data-add-template]");
      const templatePreviewTrigger = event.target.closest("[data-template-preview]");
      const templateCardEditTrigger = event.target.closest("[data-template-card-edit]");
      const templateCardSaveTrigger = event.target.closest("[data-template-card-save]");
      const templateCardCancelTrigger = event.target.closest("[data-template-card-cancel]");
      const templateEditTrigger = event.target.closest("[data-template-edit]");
      const templateDeleteTrigger = event.target.closest("[data-template-delete]");
      const templateCommandTrigger = event.target.closest("[data-template-command]");
      const templateBlockTrigger = event.target.closest("[data-template-block]");
      const templateTableActionTrigger = event.target.closest("[data-template-table-action]");
      const templateTableSizeTrigger = event.target.closest("[data-template-table-size]");
      const templateInsertTrigger = event.target.closest("[data-template-insert]");
      const templateTagTrigger = event.target.closest("[data-template-tag]");
      const templateOpenImageTrigger = event.target.closest("[data-template-open-image]");
      const templateSaveTrigger = event.target.closest("[data-save-template-editor]");
      const templatePrintTrigger = event.target.closest("[data-print-template-preview]");
      const templateApplyTrigger = event.target.closest("[data-template-apply]");

      if (fontSizeToggleTrigger) {
        const inputId = fontSizeToggleTrigger.dataset.editorFontSizeToggle;
        const comboElement = fontSizeToggleTrigger.closest(".template-toolbar-font-size-combo");
        const menuElement = comboElement?.querySelector(".template-toolbar-combo-menu");
        const nextOpen = menuElement?.classList.contains("hidden") ?? true;

        setEditorToolbarFontSizeMenuVisibility(inputId, nextOpen);
        return true;
      }

      if (fontSizeOptionTrigger) {
        const comboMenu = fontSizeOptionTrigger.closest(".template-toolbar-combo-menu");
        const inputId = comboMenu?.dataset.editorFontSizeMenuFor || "";
        const fontSize = fontSizeOptionTrigger.dataset.editorFontSizeOption || "";

        if (!inputId || !fontSize) {
          return true;
        }

        const inputElement = document.getElementById(inputId);

        if (inputElement) {
          inputElement.value = fontSize;
        }

        if (inputId === "templateEditorFontSize") {
          applyTemplateEditorFontSize(fontSize);
        }

        setEditorToolbarFontSizeMenuVisibility(inputId, false);
        return true;
      }

      if (addTemplateTrigger) {
        void addTemplateCard();
        return true;
      }

      if (templatePreviewTrigger) {
        openTemplatePreview(templatePreviewTrigger.dataset.templatePreview);
        return true;
      }

      if (templateCardEditTrigger) {
        openTemplateCardMetaEditor(templateCardEditTrigger.dataset.templateCardEdit, templateCardEditTrigger.dataset.templateCardField);
        return true;
      }

      if (templateCardSaveTrigger) {
        void saveTemplateCardMetaEditor(templateCardSaveTrigger.dataset.templateCardSave, templateCardSaveTrigger.dataset.templateCardField);
        return true;
      }

      if (templateCardCancelTrigger) {
        closeTemplateCardMetaEditor();
        return true;
      }

      if (templateEditTrigger) {
        openTemplateEditor(templateEditTrigger.dataset.templateEdit);
        return true;
      }

      if (templateDeleteTrigger) {
        void deleteTemplateCard(templateDeleteTrigger.dataset.templateDelete);
        return true;
      }

      if (templateCommandTrigger) {
        applyTemplateEditorCommand(templateCommandTrigger.dataset.templateCommand);
        return true;
      }

      if (templateBlockTrigger) {
        applyTemplateEditorCommand("formatBlock", templateBlockTrigger.dataset.templateBlock);
        return true;
      }

      if (templateTableActionTrigger) {
        handleTemplateTableAction(templateTableActionTrigger.dataset.templateTableAction);
        return true;
      }

      if (templateTableSizeTrigger) {
        applyTemplateTableSize();
        return true;
      }

      if (templateInsertTrigger) {
        handleTemplateEditorInsert(templateInsertTrigger.dataset.templateInsert);
        return true;
      }

      if (templateTagTrigger) {
        insertTemplateTag(templateTagTrigger.dataset.templateTag);
        return true;
      }

      if (templateOpenImageTrigger) {
        setTemplateEditorTableInsertPanelVisibility(false);
        getTemplateEditorImageInput()?.click();
        return true;
      }

      if (templateSaveTrigger) {
        void saveTemplateEditor();
        return true;
      }

      if (templatePrintTrigger) {
        void printTemplatePreview();
        return true;
      }

      if (templateApplyTrigger) {
        void applyTemplateCard(templateApplyTrigger.dataset.templateApply);
        return true;
      }

      return false;
    }

    function handleKeydown(event) {
      const templateEditorModal = getTemplateEditorModal();
      const templateEditorSurface = getTemplateEditorSurface();
      const isTemplateEditorShortcutTarget =
        !templateEditorModal?.classList.contains("hidden") &&
        (event.target === templateEditorSurface || templateEditorSurface?.contains(event.target));
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const normalizedKey = String(event.key || "").toLowerCase();
      const isTemplateTableInsertField =
        event.target?.id === "templateEditorTableRows" || event.target?.id === "templateEditorTableColumns";
      const isTemplateEditorFontSizeField = event.target?.id === "templateEditorFontSize";
      const isTemplateCardMetaField = event.target?.matches?.("[data-template-card-input]") ?? false;

      if (isTemplateCardMetaField && event.key === "Enter") {
        event.preventDefault();
        void saveTemplateCardMetaEditor(event.target.dataset.templateCardInput, event.target.dataset.templateCardField);
        return true;
      }

      if (isTemplateCardMetaField && event.key === "Escape") {
        event.preventDefault();
        closeTemplateCardMetaEditor();
        return true;
      }

      if (isTemplateEditorShortcutTarget && isModifierPressed && !event.altKey) {
        if (normalizedKey === "z" && event.shiftKey) {
          event.preventDefault();
          redoTemplateEditorHistory();
          return true;
        }

        if (normalizedKey === "z") {
          event.preventDefault();
          undoTemplateEditorHistory();
          return true;
        }

        if (normalizedKey === "y") {
          event.preventDefault();
          redoTemplateEditorHistory();
          return true;
        }
      }

      if (isTemplateEditorShortcutTarget && !isModifierPressed && (event.key === "Backspace" || event.key === "Delete")) {
        if (handleTemplateEditorTokenDeletion(event)) {
          return true;
        }
      }

      if (
        !templateEditorModal?.classList.contains("hidden") &&
        isTemplateTableInsertField &&
        event.key === "Enter" &&
        !getTemplateEditorTableInsertPanel()?.classList.contains("hidden")
      ) {
        event.preventDefault();
        handleTemplateEditorInsert("table-confirm");
        return true;
      }

      if (isTemplateEditorFontSizeField && event.key === "Enter") {
        event.preventDefault();
        applyTemplateEditorFontSize(event.target.value);
        return true;
      }

      return false;
    }

    function handlePointerDown(event) {
      const templateEditorModal = getTemplateEditorModal();
      const templateEditorSurface = getTemplateEditorSurface();

      if (templateEditorModal?.classList.contains("hidden")) {
        return false;
      }

      const toolbarTrigger = event.target.closest(
        "[data-template-command], [data-template-table-action], [data-template-insert], [data-template-open-image], [data-template-tag], [data-save-template-editor], [data-editor-color-preset], [data-editor-color-apply], [data-editor-color-toggle], [data-editor-color-direct]",
      );
      const templateFontSizeTrigger = event.target.closest(
        "#templateEditorModal [data-editor-font-size-toggle], #templateEditorModal [data-editor-font-size-option]",
      );
      const toolbarSelectionControl = event.target.closest(
        "#templateEditorBlockType, #templateEditorFontFamily, #templateEditorFontSize, #templateEditorTextColor, #templateEditorTextShading, #templateEditorCellShading, #templateEditorTableRows, #templateEditorTableColumns",
      );

      if (toolbarTrigger || templateFontSizeTrigger) {
        saveTemplateEditorSelection();
        event.preventDefault();
        return true;
      }

      if (toolbarSelectionControl) {
        saveTemplateEditorSelection();
        return false;
      }

      if (
        !templateEditorSurface ||
        event.button !== 0 ||
        state.templateEditor.imageResizeSession ||
        state.templateEditor.imageMoveSession ||
        state.templateEditor.tableResizeSession ||
        state.templateEditor.tableSelectionSession
      ) {
        return false;
      }

      if (handleTemplateEditorTablePointerDown(event)) {
        return true;
      }

      const selectedImage = getTemplateEditorImageTarget(event.target);

      if (selectedImage) {
        event.preventDefault();
        clearTemplateEditorTableSelection();
        clearTemplateEditorTableHoverState();
        selectTemplateEditorImage(selectedImage);
        startTemplateEditorImageMoveSession(selectedImage, event);
        return true;
      }

      if (event.target instanceof Element && templateEditorSurface.contains(event.target)) {
        clearTemplateEditorImageSelection();
        clearTemplateEditorTableSelection();
        clearTemplateEditorTableHoverState();
      }

      return false;
    }

    function handleChange(event) {
      if (event.target.id === "templateEditorImageInput") {
        insertTemplateImage(event.target.files?.[0]);
        event.target.value = "";
        return true;
      }

      if (event.target.id === "templateEditorBlockType") {
        applyTemplateEditorCommand("formatBlock", event.target.value || "p");
        return true;
      }

      if (event.target.id === "templateEditorFontFamily") {
        applyTemplateEditorFontFamily(event.target.value);
        return true;
      }

      if (event.target.id === "templateEditorFontSize") {
        applyTemplateEditorFontSize(event.target.value);
        return true;
      }

      return false;
    }

    function handleInput(event) {
      if (event.target.id === "templateEditorFontSize") {
        syncEditorToolbarFontSizeMenuSelection(event.target, event.target.value);
        return true;
      }

      if (event.target.id === "templateEditorSurface") {
        syncTemplateEditorContent();
        return true;
      }

      if (event.target.matches("[data-template-card-input]")) {
        updateTemplateCardMetaEditorDraft(event.target.dataset.templateCardInput, event.target.dataset.templateCardField, event.target.value);
        return true;
      }

      return false;
    }

    function handleSelectionChange() {
      saveTemplateEditorSelection();
      updateTemplateEditorActiveCell();
      updateTemplateEditorFormattingControls();
      updateTemplateTableControls();
    }

    function handlePaste(event) {
      if (event.target.id === "templateEditorSurface") {
        window.setTimeout(() => {
          syncTemplateEditorContent();
        }, 0);
        return true;
      }

      return false;
    }

    function handleDragStart(event) {
      if (getTemplateEditorImageTarget(event.target)) {
        event.preventDefault();
        return true;
      }

      return false;
    }

    function handleSurfacePointerMove(event) {
      updateTemplateEditorTableHoverState(event);
    }

    function handleSurfacePointerLeave() {
      clearTemplateEditorTableHoverState();
    }

    function handleSurfaceScroll() {
      clearTemplateEditorTableHoverState();
      updateTemplateEditorImageSelectionOverlay();
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleDragStart,
      handleInput,
      handleKeydown,
      handlePaste,
      handlePointerDown,
      handleSelectionChange,
      handleSurfacePointerLeave,
      handleSurfacePointerMove,
      handleSurfaceScroll,
    });
  }

  return Object.freeze({
    createTemplateEditorEventHandlers,
  });
});
