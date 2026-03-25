(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardExamineeFields = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const createFieldDefinition = ({
    key,
    label,
    gridLabel = label,
    detailLabel = label,
    inputType = "text",
    templateWidth = 16,
    exportWidth = 16,
    sample = "",
  }) =>
    Object.freeze({
      key,
      label,
      gridLabel,
      detailLabel,
      inputType,
      templateWidth,
      exportWidth,
      sample,
    });

  const examineeFieldDefinitions = Object.freeze([
    createFieldDefinition({
      key: "date",
      label: "시험날짜",
      gridLabel: "날짜",
      detailLabel: "시험일자",
      inputType: "date",
      templateWidth: 16,
      exportWidth: 14,
      sample: "2026-03-28",
    }),
    createFieldDefinition({
      key: "time",
      label: "시간",
      inputType: "time",
      templateWidth: 12,
      exportWidth: 10,
      sample: "08:40",
    }),
    createFieldDefinition({
      key: "track",
      label: "모집시기",
      templateWidth: 16,
      exportWidth: 14,
      sample: "수시",
    }),
    createFieldDefinition({
      key: "admission",
      label: "전형",
      templateWidth: 18,
      exportWidth: 18,
      sample: "음악특기자",
    }),
    createFieldDefinition({
      key: "series",
      label: "계열",
      templateWidth: 16,
      exportWidth: 16,
      sample: "예체능",
    }),
    createFieldDefinition({
      key: "unit",
      label: "모집단위",
      templateWidth: 18,
      exportWidth: 18,
      sample: "실용음악과",
    }),
    createFieldDefinition({
      key: "major",
      label: "전공",
      templateWidth: 16,
      exportWidth: 16,
      sample: "피아노",
    }),
    createFieldDefinition({
      key: "building",
      label: "고사건물",
      templateWidth: 16,
      exportWidth: 16,
      sample: "A동",
    }),
    createFieldDefinition({
      key: "room",
      label: "고사실",
      templateWidth: 16,
      exportWidth: 16,
      sample: "101",
    }),
    createFieldDefinition({
      key: "group",
      label: "조",
      templateWidth: 14,
      exportWidth: 10,
      sample: "A조",
    }),
    createFieldDefinition({
      key: "examineeNo",
      label: "수험번호",
      templateWidth: 18,
      exportWidth: 16,
      sample: "173600001",
    }),
    createFieldDefinition({
      key: "name",
      label: "이름",
      templateWidth: 16,
      exportWidth: 14,
      sample: "홍길동",
    }),
    createFieldDefinition({
      key: "birth",
      label: "생년월일",
      inputType: "date",
      templateWidth: 16,
      exportWidth: 14,
      sample: "2006-01-02",
    }),
  ]);

  const examineeFieldDefinitionMap = Object.freeze(
    examineeFieldDefinitions.reduce((definitionsByKey, definition) => {
      definitionsByKey[definition.key] = definition;
      return definitionsByKey;
    }, {}),
  );

  const examineeGridFieldKeys = Object.freeze([
    "date",
    "time",
    "track",
    "admission",
    "series",
    "unit",
    "major",
    "building",
    "room",
    "group",
    "examineeNo",
    "name",
    "birth",
  ]);

  const examineeDetailFieldKeys = Object.freeze([...examineeGridFieldKeys]);
  const headerFilterFieldKeys = Object.freeze(["track", "admission", "series", "date", "time"]);
  const lookupSelectFieldKeys = Object.freeze(["date", "time", "track", "admission", "series", "unit", "major", "building", "room"]);
  const optionalTemplateFieldKeys = Object.freeze(["major", "group"]);
  const legacyTemplateHeaders = Object.freeze({
    date: "시험일자",
    time: "교시",
    track: "전형",
    admission: "시험",
  });

  const getFieldDefinition = (key) => examineeFieldDefinitionMap[String(key || "").trim()] || null;

  const createGridColumns = ({ keys = examineeGridFieldKeys, dateLabel = "날짜" } = {}) =>
    Object.freeze(
      keys
        .map((key) => getFieldDefinition(key))
        .filter(Boolean)
        .map((definition) =>
          Object.freeze({
            key: definition.key,
            label: definition.key === "date" ? dateLabel : definition.gridLabel,
            sortable: true,
            filterable: true,
          }),
        ),
    );

  const createDetailFields = (keys = examineeDetailFieldKeys) =>
    Object.freeze(
      keys
        .map((key) => getFieldDefinition(key))
        .filter(Boolean)
        .map((definition) =>
          Object.freeze({
            key: definition.key,
            label: definition.detailLabel,
            type: definition.inputType,
          }),
        ),
    );

  const createTemplateColumns = (keys = examineeGridFieldKeys) =>
    Object.freeze(
      keys
        .map((key) => getFieldDefinition(key))
        .filter(Boolean)
        .map((definition) =>
          Object.freeze({
            header: definition.label,
            key: definition.key,
            width: definition.templateWidth,
            sample: definition.sample,
          }),
        ),
    );

  const createWorkbookTextColumns = ({ keys = examineeGridFieldKeys, dateLabel = "시험날짜" } = {}) =>
    Object.freeze(
      keys
        .map((key) => getFieldDefinition(key))
        .filter(Boolean)
        .map((definition) =>
          Object.freeze({
            header: definition.key === "date" ? dateLabel : definition.label,
            key: definition.key,
            width: definition.exportWidth,
            text: true,
          }),
        ),
    );

  return {
    createDetailFields,
    createGridColumns,
    createTemplateColumns,
    createWorkbookTextColumns,
    examineeDetailFieldKeys,
    examineeFieldDefinitions,
    examineeGridFieldKeys,
    getFieldDefinition,
    headerFilterFieldKeys,
    legacyTemplateHeaders,
    lookupSelectFieldKeys,
    optionalTemplateFieldKeys,
  };
});
