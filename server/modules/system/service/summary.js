function createSystemSummaryService({
  formatDateAsYmd,
  getAccounts,
  getApplicantAssignments,
  getApplicantFormFields,
  getApplicantRecruitmentUnits,
  getApplicantNoticeHtml,
  getApplicantSchedules,
  getApplicantSettings,
  getApplicantSubmissions,
  getExaminees,
  getLoginNoticeHtml,
  getPrintHistory,
  getSystemBackupAutomationSettings,
  getSuperAdminSettings,
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
    const [examinees, printHistory, templates, accounts, summary, systemSettings, systemBackupAutomation, superAdminSettings, loginNoticeHtml, applicantNoticeHtml, applicantFormFields, applicantRecruitmentUnits, applicantSchedules, applicantAssignments, applicantSubmissions, applicantSettings] = await Promise.all([
      getExaminees(),
      getPrintHistory(),
      getTemplates(),
      getAccounts(),
      getSummary(),
      getSystemSettings(),
      getSystemBackupAutomationSettings(),
      getSuperAdminSettings(),
      getLoginNoticeHtml(),
      getApplicantNoticeHtml(),
      getApplicantFormFields(),
      getApplicantRecruitmentUnits(),
      getApplicantSchedules(),
      getApplicantAssignments(),
      getApplicantSubmissions(),
      getApplicantSettings(),
    ]);

    return {
      applicantManager: {
        fields: applicantFormFields,
        recruitmentUnits: applicantRecruitmentUnits,
        schedules: applicantSchedules,
        assignments: applicantAssignments,
        settings: applicantSettings,
        submissions: applicantSubmissions,
      },
      examinees,
      printHistory,
      templates,
      accounts,
      summary,
      systemSettings,
      systemBackupAutomation,
      superAdminSettings,
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
