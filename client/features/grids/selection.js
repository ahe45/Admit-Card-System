(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridSelection = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridSelectionController({ getGridRows, getTableState, openExamineeDetail, startApplicantRecruitmentUnitEdit, state }) {
    function getGridRowId(gridKey, row) {
      if (gridKey === "accountManagementGrid") {
        return row.id || "";
      }

      if (gridKey === "printHistoryGrid") {
        return String(row.historyId || `${row.examineeNo}-${row.printedAt}`);
      }

      if (gridKey === "applicantHistoryGrid" || gridKey === "applicantRecruitmentGrid") {
        return String(row.id || "");
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
      tableState.selectionAnchorRowId =
        nextRowIds.length > 0 ? String(anchorRowId || nextRowIds[nextRowIds.length - 1] || "").trim() : "";
    }

    function isGridRowSelected(gridKey, rowId) {
      return getGridSelectedRowIds(gridKey).includes(rowId);
    }

    function isGridRowClickable(gridKey) {
      return gridKey === "examineeRegistrationGrid" || gridKey === "admitCardLookupGrid" || gridKey === "applicantRecruitmentGrid";
    }

    function isGridRowHighlighted(gridKey, row, rowId = getGridRowId(gridKey, row)) {
      if (gridKey === "examineeRegistrationGrid") {
        return String(state.examineeDetail?.selectedExamineeNo || "").trim() === String(row?.examineeNo || rowId || "").trim();
      }

      if (gridKey === "admitCardLookupGrid") {
        return isGridRowSelected(gridKey, rowId);
      }

      if (gridKey === "applicantHistoryGrid") {
        return Number(state.applicantManager?.expandedSubmissionId || 0) === Number(row?.id || rowId || 0);
      }

      if (gridKey === "applicantRecruitmentGrid") {
        return Number(state.applicantManager?.recruitmentUnitEditor?.editingId || 0) === Number(row?.id || rowId || 0);
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

      if (gridKey === "applicantRecruitmentGrid") {
        startApplicantRecruitmentUnitEdit(rowId);
        return false;
      }

      return false;
    }

    return Object.freeze({
      getGridRowId,
      getGridSelectableRowIds,
      getGridSelectedRowIds,
      getGridSelectionAnchorRowId,
      getGridSelectionState,
      handleAdmitCardLookupRowSelection,
      handleGridRowClickSelection,
      isGridRowClickable,
      isGridRowHighlighted,
      isGridRowSelected,
      setGridSelectedRowIds,
      toggleGridRowSelection,
      toggleGridSelectAll,
    });
  }

  return Object.freeze({
    createGridSelectionController,
  });
});
