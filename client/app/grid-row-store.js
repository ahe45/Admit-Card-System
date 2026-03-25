(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardGridRowStore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createGridRowStoreController() {
    let examineeGridRows = [];
    let printHistoryRows = [];
    let accountGridRows = [];
    const accountGridColumns = [
      { key: "id", label: "ID", sortable: true, filterable: true },
      { key: "name", label: "이름", sortable: true, filterable: true },
      { key: "role", label: "권한", sortable: true, filterable: true },
      { key: "recentAccess", label: "최근 접속", sortable: true, filterable: true },
      { key: "editAction", label: "수정", sortable: false, filterable: false },
      { key: "resetAction", label: "초기화", sortable: false, filterable: false },
      { key: "deleteAction", label: "삭제", sortable: false, filterable: false },
    ];

    function getAccountGridColumns() {
      return accountGridColumns;
    }

    function getAccountGridRows() {
      return accountGridRows;
    }

    function getExamineeGridRows() {
      return examineeGridRows;
    }

    function getPrintHistoryRows() {
      return printHistoryRows;
    }

    function setAccountGridRows(rows) {
      accountGridRows = Array.isArray(rows) ? rows : [];
    }

    function setExamineeGridRows(rows) {
      examineeGridRows = Array.isArray(rows) ? rows : [];
    }

    function setPrintHistoryRows(rows) {
      printHistoryRows = Array.isArray(rows) ? rows : [];
    }

    function appendAccountGridRow(record) {
      accountGridRows = [...accountGridRows, record];
    }

    return Object.freeze({
      appendAccountGridRow,
      getAccountGridColumns,
      getAccountGridRows,
      getExamineeGridRows,
      getPrintHistoryRows,
      setAccountGridRows,
      setExamineeGridRows,
      setPrintHistoryRows,
    });
  }

  return Object.freeze({
    createGridRowStoreController,
  });
});
