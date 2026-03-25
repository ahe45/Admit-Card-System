(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridFilterColumns = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridColumnHelpers({
    accountGridColumns,
    admitCardLookupGridColumns,
    examineePhotoColumn,
    examineeRegistrationGridColumns,
    printHistoryGridColumns,
    resultGridColumns,
  }) {
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

    return Object.freeze({
      getGridColumns,
    });
  }

  return Object.freeze({
    createGridColumnHelpers,
  });
});
