(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAppDocumentEvents = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const authDocumentEventsModule = globalThis.AdmitCardAuthDocumentEvents;
  const editorToolbarDocumentEventsModule = globalThis.AdmitCardEditorToolbarDocumentEvents;
  const gridDocumentEventsModule = globalThis.AdmitCardGridDocumentEvents;

  if (!authDocumentEventsModule?.createAuthDocumentEventHandlers) {
    throw new Error("client/features/app/auth-document-events.js must be loaded before client/features/app/document-events.js.");
  }

  if (!editorToolbarDocumentEventsModule?.createEditorToolbarDocumentEventHandlers) {
    throw new Error(
      "client/features/app/editor-toolbar-document-events.js must be loaded before client/features/app/document-events.js.",
    );
  }

  if (!gridDocumentEventsModule?.createGridDocumentEventHandlers) {
    throw new Error("client/features/app/grid-document-events.js must be loaded before client/features/app/document-events.js.");
  }

  const { createAuthDocumentEventHandlers } = authDocumentEventsModule;
  const { createEditorToolbarDocumentEventHandlers } = editorToolbarDocumentEventsModule;
  const { createGridDocumentEventHandlers } = gridDocumentEventsModule;

  function createAppDocumentEventHandlers({
    applyEditorToolbarColorTrigger,
    applyLoginNoticeEditorCommand,
    batchPrintSelectedExaminees,
    cancelAccountEdit,
    changeSystemAutoLogoutMinutes,
    clearAllGridFilters,
    clearGridFilter,
    clearHeaderFilters,
    clampPage,
    closeAllEditorToolbarColorPanels,
    closeAllEditorToolbarFontSizeMenus,
    closeAllEditorToolbarTableInsertPanels,
    closeAllGridFilterMenus,
    closeAllHeaderCombos,
    closeAllPageSizeMenus,
    closeGridFilterMenu,
    closePasswordSetupPrompt,
    deleteAccountAction,
    deleteSystemDataAction,
    downloadExamineeGridWorkbook,
    downloadExamineeTemplate,
    downloadPrintHistoryGridWorkbook,
    examineeDetailEventHandlers,
    filterGridFilterOptionValues,
    getGridFilterOptionValues,
    getGridFilterSelectionState,
    getGridPage,
    getGridRows,
    getEditorToolbarColorPickerElements,
    getHeaderComboElement,
    getSidebar,
    getTableState,
    getTotalPages,
    headerFilterFields,
    hideGridCellTooltip,
    handleGridRowClickSelection,
    isBusyOverlayActive,
    loadBootstrapData,
    loginNoticeEventHandlers,
    logoutCurrentUser,
    lookupSelectFields,
    lookupTextFields,
    openModal,
    persistHeaderFilters,
    printExamineeAdmitCard,
    recordAutoLogoutActivity,
    refreshAdmitCardLookupGrid,
    refreshGridFilterMenu,
    reconcileHeaderFilters,
    reconcileLookupFilters,
    removeGridFilterValue,
    renderView,
    requestCloseAllModals,
    requestCloseModal,
    rerenderGridInteraction,
    rerenderLookupViewInteraction,
    createLookupFilters,
    resetAccountPasswordAction,
    resetGridPages,
    saveAccountEdit,
    saveSystemSettings,
    setAccountCreateError,
    setEditorToolbarColorPanelVisibility,
    setEditorToolbarFontSizeMenuVisibility,
    setGridFilterValues,
    setHeaderComboOpen,
    setSystemSettingsStatus,
    startAccountEdit,
    state,
    submitAccountCreate,
    submitLogin,
    submitPasswordSetup,
    syncLoginErrorMessage,
    syncPasswordSetupModal,
    templateEditorEventHandlers,
    toggleGridFilterMenu,
    toggleGridFilterValue,
    toggleGridRowSelection,
    toggleGridSelectAll,
    toggleGridSort,
    updateAccountEditorField,
    updateLookupTextFilter,
    uploadSelectedExamineeFile,
  }) {
    const gridDocumentEventHandlers = createGridDocumentEventHandlers({
      batchPrintSelectedExaminees,
      clearAllGridFilters,
      clearGridFilter,
      clearHeaderFilters,
      clampPage,
      closeAllGridFilterMenus,
      closeAllHeaderCombos,
      closeAllPageSizeMenus,
      closeGridFilterMenu,
      createLookupFilters,
      downloadExamineeGridWorkbook,
      downloadPrintHistoryGridWorkbook,
      filterGridFilterOptionValues,
      getGridFilterOptionValues,
      getGridFilterSelectionState,
      getGridPage,
      getGridRows,
      getHeaderComboElement,
      getTableState,
      getTotalPages,
      handleGridRowClickSelection,
      headerFilterFields,
      loadBootstrapData,
      lookupSelectFields,
      lookupTextFields,
      persistHeaderFilters,
      printExamineeAdmitCard,
      refreshAdmitCardLookupGrid,
      refreshGridFilterMenu,
      reconcileHeaderFilters,
      reconcileLookupFilters,
      removeGridFilterValue,
      renderView,
      rerenderGridInteraction,
      rerenderLookupViewInteraction,
      resetGridPages,
      setGridFilterValues,
      setHeaderComboOpen,
      state,
      toggleGridFilterMenu,
      toggleGridFilterValue,
      toggleGridRowSelection,
      toggleGridSelectAll,
      toggleGridSort,
      updateLookupTextFilter,
      uploadSelectedExamineeFile,
    });
    const authDocumentEventHandlers = createAuthDocumentEventHandlers({
      cancelAccountEdit,
      changeSystemAutoLogoutMinutes,
      closePasswordSetupPrompt,
      deleteAccountAction,
      deleteSystemDataAction,
      downloadExamineeTemplate,
      logoutCurrentUser,
      openModal,
      renderView,
      requestCloseModal,
      resetAccountPasswordAction,
      saveAccountEdit,
      saveSystemSettings,
      setAccountCreateError,
      setSystemSettingsStatus,
      startAccountEdit,
      state,
      submitAccountCreate,
      submitLogin,
      submitPasswordSetup,
      syncLoginErrorMessage,
      syncPasswordSetupModal,
      updateAccountEditorField,
    });
    const editorToolbarDocumentEventHandlers = createEditorToolbarDocumentEventHandlers({
      applyEditorToolbarColorTrigger,
      applyLoginNoticeEditorCommand,
      closeAllEditorToolbarColorPanels,
      closeAllEditorToolbarFontSizeMenus,
      closeAllEditorToolbarTableInsertPanels,
      getEditorToolbarColorPickerElements,
      setEditorToolbarColorPanelVisibility,
      setEditorToolbarFontSizeMenuVisibility,
    });

    async function handleClick(event) {
      if (isBusyOverlayActive()) {
        event.preventDefault();
        return;
      }

      hideGridCellTooltip();
      editorToolbarDocumentEventHandlers.prepareClick(event);

      if (gridDocumentEventHandlers.handlePriorityClick(event)) {
        return;
      }

      if (await loginNoticeEventHandlers.handleClick(event)) {
        return;
      }

      if (templateEditorEventHandlers.handleClick(event)) {
        return;
      }

      if (editorToolbarDocumentEventHandlers.handleClick(event)) {
        return;
      }

      if (await examineeDetailEventHandlers.handleClick(event)) {
        return;
      }

      if (await gridDocumentEventHandlers.handleGridActionClick(event)) {
        return;
      }

      if (gridDocumentEventHandlers.handleTrailingClick(event)) {
        return;
      }

      if (await authDocumentEventHandlers.handleClick(event)) {
        return;
      }
    }

    async function handleKeydown(event) {
      if (isBusyOverlayActive()) {
        event.preventDefault();
        return;
      }

      recordAutoLogoutActivity();

      if (loginNoticeEventHandlers.handleKeydown(event)) {
        return;
      }

      if (templateEditorEventHandlers.handleKeydown(event)) {
        return;
      }

      if (event.key === "Escape" && editorToolbarDocumentEventHandlers.handleEscape()) {
        event.preventDefault();
        return;
      }

      if (event.key === "Escape" && closeAllHeaderCombos()) {
        event.preventDefault();
        return;
      }

      if (event.key === "Escape" && state.auth.status === "password_setup") {
        event.preventDefault();
        void closePasswordSetupPrompt();
        return;
      }

      if (examineeDetailEventHandlers.handleKeydown(event)) {
        return;
      }

      if (event.key === "Escape") {
        const didCloseModals = await requestCloseAllModals();

        if (didCloseModals === false) {
          return;
        }

        if (gridDocumentEventHandlers.handleEscape()) {
          renderView();
        }

        getSidebar()?.classList.remove("open");
      }
    }

    async function handleSubmit(event) {
      if (isBusyOverlayActive()) {
        event.preventDefault();
        return;
      }

      if (await authDocumentEventHandlers.handleSubmit(event)) {
        return;
      }
    }

    async function handleChange(event) {
      if (isBusyOverlayActive()) {
        event.preventDefault();
        return;
      }

      if (await loginNoticeEventHandlers.handleChange(event)) {
        return;
      }

      if (templateEditorEventHandlers.handleChange(event)) {
        return;
      }

      if (editorToolbarDocumentEventHandlers.handleChange(event)) {
        return;
      }

      if (await examineeDetailEventHandlers.handleChange(event)) {
        return;
      }

      if (await authDocumentEventHandlers.handleChange(event)) {
        return;
      }

      if (await gridDocumentEventHandlers.handleChange(event)) {
        return;
      }
    }

    function handleCompositionStart(event) {
      gridDocumentEventHandlers.handleCompositionStart(event);
    }

    function handleCompositionEnd(event) {
      gridDocumentEventHandlers.handleCompositionEnd(event);
    }

    function handleInput(event) {
      if (loginNoticeEventHandlers.handleInput(event)) {
        return;
      }

      if (editorToolbarDocumentEventHandlers.handleInput(event)) {
        return;
      }

      if (templateEditorEventHandlers.handleInput(event)) {
        return;
      }

      if (examineeDetailEventHandlers.handleInput(event)) {
        return;
      }

      if (authDocumentEventHandlers.handleInput(event)) {
        return;
      }

      gridDocumentEventHandlers.handleInput(event);
    }

    return Object.freeze({
      handleChange,
      handleClick,
      handleCompositionEnd,
      handleCompositionStart,
      handleInput,
      handleKeydown,
      handleSubmit,
    });
  }

  return Object.freeze({
    createAppDocumentEventHandlers,
  });
});
