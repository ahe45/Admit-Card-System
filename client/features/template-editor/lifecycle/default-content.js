(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardTemplateEditorDefaultContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createDefaultTemplateContentBuilder({ buildTemplateTokenHtml }) {
    return function getDefaultTemplateContent() {
      const token = (label) => buildTemplateTokenHtml(`@{${label}}`);

      return `
        <div class="template-doc" style="color: #16233b; font-family: 'Noto Sans KR', sans-serif;">
          <div style="text-align: center; margin-bottom: 22px;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">2026학년도 대학입학전형</p>
            <h1 style="margin: 0; font-size: 42px; line-height: 1.15;">수험표</h1>
          </div>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 15px;">
            <colgroup>
              <col style="width: 150px;" />
              <col style="width: 201px;" />
              <col style="width: 150px;" />
              <col style="width: 201px;" />
            </colgroup>
            <tbody>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">수험번호</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("수험번호")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">모집시기</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("모집시기")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">성명</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("이름")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">전형</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("전형")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">생년월일</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("생년월일")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">계열</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("계열")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">고사건물</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("고사건물")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">모집단위</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("모집단위")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">고사실</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("고사실")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">전공</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("전공")}</td>
              </tr>
              <tr>
                <th rowspan="2" style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">조</th>
                <td rowspan="2" style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("조")}</td>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">시험날짜</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("시험날짜")}</td>
              </tr>
              <tr>
                <th style="border: 1px solid #5b6e8f; padding: 6px 7px; background: #f6f8fc;">시간</th>
                <td style="border: 1px solid #5b6e8f; padding: 6px 7px;">${token("시간")}</td>
              </tr>
            </tbody>
          </table>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; margin-top: 18px;">
            <tbody>
              <tr>
                <th colspan="3" style="border: 1px solid #5b6e8f; padding: 5px 6px; text-align: center; font-weight: 700; background: #f6f8fc;">시험 시간 안내</th>
              </tr>
              <tr>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>08:40 시작</strong><br />08:40 - 10:00</td>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>10:30 시작</strong><br />10:30 - 12:10</td>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>점심시간</strong><br />12:10 - 13:00</td>
              </tr>
              <tr>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>13:10 시작</strong><br />13:10 - 14:20</td>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>14:50 시작</strong><br />14:50 - 16:30</td>
                <td style="border: 1px solid #5b6e8f; padding: 5px 4px; text-align: center;"><strong>17:00 시작</strong><br />17:00 - 17:45</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 18px; font-size: 14px; line-height: 1.7;">
            <p style="margin: 0; font-weight: 700;">[유의사항]</p>
            <p style="margin: 0;">1. 반드시 신분증과 수험표를 함께 지참해야 합니다.</p>
            <p style="margin: 0;">2. 시험 시작 30분 전까지 지정된 고사실에 입실해야 합니다.</p>
            <p style="margin: 0;">3. 휴대전화 및 전자기기 소지는 제한됩니다.</p>
          </div>
          <div style="margin-top: 34px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
            <div style="flex: 1; border-top: 1px solid #5b6e8f; padding-top: 10px;">수험생 서명 :</div>
            <div style="min-width: 220px; text-align: right; font-weight: 700;">(직인) 입학본부장</div>
          </div>
        </div>
      `;
    };
  }

  return Object.freeze({
    createDefaultTemplateContentBuilder,
  });
});
