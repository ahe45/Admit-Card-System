(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFilterColumns = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridColumnHelpers({
    applicantAssignmentGridColumns,
    applicantHistoryGridColumns,
    applicantRecruitmentGridColumns,
    applicantScheduleGridColumns,
    accountGridColumns,
    admitCardLookupGridColumns,
    examineePhotoColumn,
    examineeRegistrationGridColumns,
    printHistoryGridColumns,
    resultGridColumns,
  }) {
    function getGridColumns(gridKey) {
      let baseColumns = resultGridColumns;

      if (gridKey === "printHistoryGrid") {
        baseColumns = printHistoryGridColumns;
      } else if (gridKey === "accountManagementGrid") {
        baseColumns = accountGridColumns;
      } else if (gridKey === "applicantHistoryGrid") {
        baseColumns = applicantHistoryGridColumns;
      } else if (gridKey === "applicantAssignmentGrid") {
        baseColumns = applicantAssignmentGridColumns;
      } else if (gridKey === "applicantRecruitmentGrid") {
        baseColumns = applicantRecruitmentGridColumns;
      } else if (gridKey === "applicantScheduleGrid") {
        baseColumns = applicantScheduleGridColumns;
      } else if (gridKey === "examineeRegistrationGrid") {
        baseColumns = [...examineeRegistrationGridColumns, examineePhotoColumn];
      } else if (gridKey === "admitCardLookupGrid") {
        baseColumns = admitCardLookupGridColumns;
      }

      const allowFilters =
        gridKey === "examineeRegistrationGrid" ||
        gridKey === "printHistoryGrid" ||
        gridKey === "accountManagementGrid" ||
        gridKey === "applicantHistoryGrid" ||
        gridKey === "applicantAssignmentGrid" ||
        gridKey === "applicantRecruitmentGrid" ||
        gridKey === "applicantScheduleGrid";

      return baseColumns.map((column) => ({
        ...column,
        filterable: allowFilters ? column.filterable : false,
      }));
    }

    return Object.freeze({
      getGridColumns,
    });
  }

  return Object.freeze({
    createGridColumnHelpers,
  });
});
