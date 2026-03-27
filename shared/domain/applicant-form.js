(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardApplicantFormConfig = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const applicantNationalityRegionCodes = Object.freeze([
    "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
    "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
    "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
    "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
    "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
    "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
    "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
    "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
    "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
    "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
    "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
    "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
    "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
    "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
    "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW",
  ]);

  function createRegionNameResolver(locale) {
    try {
      return typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames([locale], { type: "region" })
        : null;
    } catch (error) {
      return null;
    }
  }

  function buildApplicantNationalityOptions() {
    const koreanResolver = createRegionNameResolver("ko");
    const englishResolver = createRegionNameResolver("en");

    return Object.freeze(
      applicantNationalityRegionCodes
        .map((code) => {
          const label = String(koreanResolver?.of(code) || code).trim();
          const englishLabel = String(englishResolver?.of(code) || "").trim();

          return Object.freeze({
            key: code,
            code,
            label,
            englishLabel,
            searchLabel: [label, englishLabel, code].filter(Boolean).join(" ").toLowerCase(),
          });
        })
        .filter((option) => option.label)
        .sort((left, right) => left.label.localeCompare(right.label, "ko")),
    );
  }

  const nationalityOptions = buildApplicantNationalityOptions();

  function findApplicantNationalityOption(value = "") {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return null;
    }

    const upperValue = normalizedValue.toUpperCase();
    const lowerValue = normalizedValue.toLowerCase();
    const exactMatch =
      nationalityOptions.find((option) => option.code === upperValue) ||
      nationalityOptions.find((option) => option.label === normalizedValue) ||
      nationalityOptions.find((option) => option.searchLabel === lowerValue);

    if (exactMatch) {
      return exactMatch;
    }

    const partialMatches = nationalityOptions.filter((option) => option.searchLabel.includes(lowerValue));
    return partialMatches.length === 1 ? partialMatches[0] : null;
  }

  function isApplicantNationalityValue(value = "") {
    return Boolean(findApplicantNationalityOption(value));
  }

  const answerTypeOptions = Object.freeze([
    Object.freeze({ key: "text", label: "텍스트" }),
    Object.freeze({ key: "phone", label: "전화번호" }),
    Object.freeze({ key: "nationality", label: "국적" }),
    Object.freeze({ key: "select", label: "선택지" }),
    Object.freeze({ key: "date", label: "날짜" }),
    Object.freeze({ key: "birthdate", label: "생년월일" }),
    Object.freeze({ key: "photo", label: "사진 업로드" }),
  ]);

  const systemFieldOptions = Object.freeze([
    Object.freeze({ key: "", label: "일반 항목" }),
    Object.freeze({ key: "name", label: "이름" }),
    Object.freeze({ key: "birth", label: "생년월일" }),
    Object.freeze({ key: "date", label: "시험날짜" }),
    Object.freeze({ key: "time", label: "시간" }),
    Object.freeze({ key: "track", label: "모집시기" }),
    Object.freeze({ key: "admission", label: "전형" }),
    Object.freeze({ key: "series", label: "계열" }),
    Object.freeze({ key: "unit", label: "모집단위" }),
    Object.freeze({ key: "major", label: "전공" }),
    Object.freeze({ key: "building", label: "고사건물" }),
    Object.freeze({ key: "room", label: "고사실" }),
    Object.freeze({ key: "group", label: "조" }),
    Object.freeze({ key: "photo", label: "수험생 사진" }),
  ]);

  const applicantStatusOptions = Object.freeze([
    Object.freeze({ key: "submitted", label: "접수 완료" }),
    Object.freeze({ key: "promoted", label: "수험생 등록 완료" }),
  ]);

  const defaultApplicantExamNoPattern = "AD-{YY}{MM}{DD}-{SEQ:4}";
  const defaultApplicantExamNoSequenceStart = 1;
  const protectedApplicantSystemFields = Object.freeze(["name"]);

  const answerTypeLabelMap = Object.freeze(
    answerTypeOptions.reduce(
      (map, option) => {
        map[option.key] = option.label;
        return map;
      },
      {
        textarea: "긴 텍스트",
        time: "시간",
      },
    ),
  );
  const systemFieldLabelMap = Object.freeze(
    systemFieldOptions.reduce((map, option) => {
      map[option.key] = option.label;
      return map;
    }, {}),
  );
  const applicantStatusLabelMap = Object.freeze(
    applicantStatusOptions.reduce((map, option) => {
      map[option.key] = option.label;
      return map;
    }, {}),
  );

  function getApplicantAnswerTypeLabel(answerType = "") {
    return answerTypeLabelMap[String(answerType || "").trim()] || "텍스트";
  }

  function getApplicantSystemFieldLabel(systemFieldKey = "") {
    return systemFieldLabelMap[String(systemFieldKey || "").trim()] || "일반 항목";
  }

  function getApplicantStatusLabel(status = "") {
    return applicantStatusLabelMap[String(status || "").trim()] || "접수 완료";
  }

  return Object.freeze({
    answerTypeOptions,
    applicantNationalityRegionCodes,
    applicantStatusOptions,
    defaultApplicantExamNoPattern,
    defaultApplicantExamNoSequenceStart,
    findApplicantNationalityOption,
    getApplicantAnswerTypeLabel,
    getApplicantStatusLabel,
    getApplicantSystemFieldLabel,
    isApplicantNationalityValue,
    nationalityOptions,
    protectedApplicantSystemFields,
    systemFieldOptions,
  });
});
