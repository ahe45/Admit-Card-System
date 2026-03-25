function createSystemSummaryService({
  formatDateAsYmd,
  getAccounts,
  getExaminees,
  getLoginNoticeHtml,
  getPrintHistory,
  getSystemSettings,
  getTemplates,
  query,
}) {
  async function getSummary() {
    const [examineeSummary] = await query(`SELECT COUNT(*) AS registeredExaminees FROM examinee`);
    const [printSummary] = await query(`SELECT COUNT(*) AS totalPrints FROM print_history`);
    const [todayPrintSummary] = await query(`
      SELECT COUNT(*) AS todayPrints
      FROM print_history
      WHERE DATE(printed_at) = CURDATE()
    `);

    return {
      registeredExaminees: Number(examineeSummary?.registeredExaminees || 0),
      totalPrints: Number(printSummary?.totalPrints || 0),
      todayPrints: Number(todayPrintSummary?.todayPrints || 0),
    };
  }

  async function getBootstrapPayload() {
    const [examinees, printHistory, templates, accounts, summary, systemSettings, loginNoticeHtml] = await Promise.all([
      getExaminees(),
      getPrintHistory(),
      getTemplates(),
      getAccounts(),
      getSummary(),
      getSystemSettings(),
      getLoginNoticeHtml(),
    ]);

    return {
      examinees,
      printHistory,
      templates,
      accounts,
      summary,
      systemSettings,
      loginNoticeHtml,
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
