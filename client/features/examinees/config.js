(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../../../shared/domain/examinee-fields"));
    return;
  }

  globalScope.AdmitCardClientExamineeConfig = factory(globalScope.AdmitCardExamineeFields);
})(typeof globalThis !== "undefined" ? globalThis : this, (examineeFields) => {
  if (!examineeFields) {
    throw new Error("shared/domain/examinee-fields.js must be loaded before client/features/examinees/config.js.");
  }

  const headerFieldIdMap = Object.freeze({
    track: "headerTrack",
    admission: "headerAdmission",
    series: "headerSeries",
    date: "headerExamDate",
    time: "headerTime",
  });
  const lookupFieldIdMap = Object.freeze({
    date: "searchDate",
    time: "searchTime",
    track: "searchTrack",
    admission: "searchAdmission",
    series: "searchSeries",
    unit: "searchUnit",
    major: "searchMajor",
    building: "searchBuilding",
    room: "searchRoom",
  });

  const headerFilterFields = Object.freeze(
    examineeFields.headerFilterFieldKeys.map((key) =>
      Object.freeze({
        id: headerFieldIdMap[key],
        key,
      }),
    ),
  );

  const lookupSelectFields = Object.freeze(
    examineeFields.lookupSelectFieldKeys.map((key) =>
      Object.freeze({
        id: lookupFieldIdMap[key],
        key,
      }),
    ),
  );

  const lookupSelectKeys = Object.freeze(lookupSelectFields.map((field) => field.key));
  const lookupTextFields = Object.freeze([
    Object.freeze({ id: "searchExamineeNo", key: "examineeNo" }),
    Object.freeze({ id: "searchExamineeName", key: "examineeName" }),
  ]);

  return Object.freeze({
    admitCardLookupGridColumns: examineeFields.createGridColumns({ dateLabel: "시험날짜" }),
    examineeDetailFieldKeys: Object.freeze([...examineeFields.examineeDetailFieldKeys]),
    examineeDetailFields: examineeFields.createDetailFields(),
    examineePhotoColumn: Object.freeze({ key: "hasPhoto", label: "사진", sortable: true, filterable: true }),
    examineeRegistrationGridColumns: examineeFields.createGridColumns({ dateLabel: "시험날짜" }),
    headerFilterFields,
    lookupSelectFields,
    lookupSelectKeys,
    lookupTextFields,
    printHistoryGridColumns: Object.freeze([
      ...examineeFields.createGridColumns({ dateLabel: "시험날짜" }),
      Object.freeze({ key: "printedAt", label: "출력시각", sortable: true, filterable: true }),
    ]),
    resultGridColumns: examineeFields.createGridColumns(),
  });
});
