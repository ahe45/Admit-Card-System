function createSystemSummaryService({
  formatDateAsYmd,
  getAccounts,
  getApplicantFormFields,
  getApplicantRecruitmentUnits,
  getApplicantNoticeHtml,
  getApplicantSettings,
  getApplicantSubmissions,
  getExaminees,
  getLoginNoticeHtml,
  getPrintHistory,
  getSystemSettings,
  getTemplates,
  query,
}) {
  async function getSummary() {
    const [examineeSummary] = await query(`SELECT COUNT(*) AS registeredExaminees FROM examinee`);
    const [printSummary] = await query(`SELECT COUNT(*) AS totalPrints FROM print_log`);
    const [todayPrintSummary] = await query(`
      SELECT COUNT(*) AS todayPrints
      FROM print_log
      WHERE DATE(printed_at) = CURDATE()
    `);

    return {
      registeredExaminees: Number(examineeSummary?.registeredExaminees || 0),
      totalPrints: Number(printSummary?.totalPrints || 0),
      todayPrints: Number(todayPrintSummary?.todayPrints || 0),
    };
  }

  async function getBootstrapPayload() {
    const [examinees, printHistory, templates, accounts, summary, systemSettings, loginNoticeHtml, applicantNoticeHtml, applicantFormFields, applicantRecruitmentUnits, applicantSubmissions, applicantSettings] = await Promise.all([
      getExaminees(),
      getPrintHistory(),
      getTemplates(),
      getAccounts(),
      getSummary(),
      getSystemSettings(),
      getLoginNoticeHtml(),
      getApplicantNoticeHtml(),
      getApplicantFormFields(),
      getApplicantRecruitmentUnits(),
      getApplicantSubmissions(),
      getApplicantSettings(),
    ]);

    return {
      applicantManager: {
        fields: applicantFormFields,
        recruitmentUnits: applicantRecruitmentUnits,
        settings: applicantSettings,
        submissions: applicantSubmissions,
      },
      examinees,
      printHistory,
      templates,
      accounts,
      summary,
      systemSettings,
      loginNoticeHtml,
      applicantNoticeHtml,
      serverDate: formatDateAsYmd(new Date()),
    };
  }

  return Object.freeze({
    getBootstrapPayload,
    getSummary,
  });
}

module.exports = {
  createSystemSummaryService,
};
