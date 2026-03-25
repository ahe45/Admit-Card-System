const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ExcelJS = require("exceljs");
const mysql = require("mysql2/promise");
const puppeteer = require("puppeteer-core");

const repoRoot = path.resolve(__dirname, "..");
const tempRoot = path.join(repoRoot, ".tmp-smoke");
const envPath = path.join(repoRoot, ".env");
const examineeFields = require("../shared/domain/examinee-fields");

function loadEnvFile(filePath) {
  const env = { ...process.env };

  if (!fs.existsSync(filePath)) {
    return env;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in env)) {
      env[key] = value;
    }
  }

  return env;
}

function findEdgeExecutablePath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function createTempDatabase(env, databaseName) {
  const connection = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}

async function dropTempDatabase(env, databaseName) {
  const connection = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  } finally {
    await connection.end();
  }
}

async function createDatabasePool(env, databaseName) {
  return mysql.createPool({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: databaseName,
    connectionLimit: 4,
  });
}

async function waitForHealth(baseUrl, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);

      if (response.ok) {
        return;
      }
    } catch (error) {
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Server health check did not become ready in time.");
}

function startServer(envOverrides = {}) {
  const env = {
    ...loadEnvFile(envPath),
    ...envOverrides,
  };
  const child = spawn(process.execPath, ["server.js"], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return {
    child,
    env,
    getStdout: () => stdout.trim(),
    getStderr: () => stderr.trim(),
  };
}

async function stopServer(serverHandle) {
  if (!serverHandle?.child) {
    return;
  }

  if (!serverHandle.child.killed) {
    serverHandle.child.kill();
  }

  await new Promise((resolve) => {
    if (serverHandle.child.exitCode !== null) {
      resolve();
      return;
    }

    serverHandle.child.once("exit", resolve);
  });
}

async function createUploadArtifacts(workspacePath) {
  fs.mkdirSync(workspacePath, { recursive: true });

  const workbookPath = path.join(workspacePath, "smoke-examinees.xlsx");
  const sampleExamineeNo = "20260001";
  const photoPath = path.join(workspacePath, `${sampleExamineeNo}.png`);
  const columns = examineeFields.createTemplateColumns();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("수험생업로드");

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.addRow({
    date: "2026-03-28",
    time: "08:40",
    track: "수시",
    admission: "음악특기자",
    series: "예체능",
    unit: "실용음악과",
    major: "피아노",
    building: "A동",
    room: "101",
    group: "A조",
    examineeNo: sampleExamineeNo,
    name: "스모크테스트",
    birth: "2006-01-02",
  });

  await workbook.xlsx.writeFile(workbookPath);

  const onePixelPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxK4AAAAASUVORK5CYII=";
  fs.writeFileSync(photoPath, Buffer.from(onePixelPngBase64, "base64"));

  return {
    workbookPath,
    photoPath,
    sampleExamineeNo,
  };
}

async function fetchJsonInPage(page, url, options = {}) {
  return page.evaluate(async ({ requestUrl, requestOptions }) => {
    const response = await fetch(requestUrl, {
      credentials: "same-origin",
      ...requestOptions,
    });
    const payload = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  }, {
    requestUrl: url,
    requestOptions: options,
  });
}

async function fetchBinaryInPage(page, url, options = {}) {
  return page.evaluate(async ({ requestUrl, requestOptions }) => {
    const response = await fetch(requestUrl, {
      credentials: "same-origin",
      ...requestOptions,
    });
    const buffer = await response.arrayBuffer();

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      length: buffer.byteLength,
    };
  }, {
    requestUrl: url,
    requestOptions: options,
  });
}

async function waitForPath(page, pathname, timeout = 30000) {
  await page.waitForFunction((expectedPath) => location.pathname === expectedPath, { timeout }, pathname);
}

async function waitForVisible(page, selector, timeout = 30000) {
  await page.waitForSelector(selector, { visible: true, timeout });
}

async function waitForHiddenClass(page, selector, timeout = 30000) {
  await page.waitForFunction((targetSelector) => {
    const element = document.querySelector(targetSelector);
    return Boolean(element) && element.classList.contains("hidden");
  }, { timeout }, selector);
}

async function navigateToView(page, view, pathname) {
  const navigationSelector = `.nav-item[data-view="${view}"]`;
  const hasNavigationItem = Boolean(await page.$(navigationSelector));

  if (hasNavigationItem) {
    await page.click(navigationSelector);
    await waitForPath(page, pathname);
  } else {
    await page.goto(new URL(pathname, page.url()).toString(), { waitUntil: "networkidle0" });
    await waitForPath(page, pathname);
  }

  await page.waitForFunction(() => {
    const viewRoot = document.getElementById("viewRoot");
    return document.readyState === "complete" && Boolean(viewRoot) && viewRoot.innerHTML.trim().length > 0;
  });
}

async function typeIntoField(page, selector, value) {
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}

async function selectEditorTableCell(page, {
  editorSelector,
  markup,
  cellSelector = "td, th",
}) {
  await page.evaluate(({ targetEditorSelector, targetMarkup, targetCellSelector }) => {
    const editor = document.querySelector(targetEditorSelector);

    if (!editor) {
      throw new Error(`Editor was not found for selector: ${targetEditorSelector}`);
    }

    editor.focus();
    editor.innerHTML = targetMarkup;

    const targetCell = editor.querySelector(targetCellSelector);

    if (!targetCell) {
      throw new Error(`Target table cell was not found for selector: ${targetCellSelector}`);
    }

    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(targetCell);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
  }, {
    targetEditorSelector: editorSelector,
    targetMarkup: markup,
    targetCellSelector: cellSelector,
  });
}

async function runSmokeTest() {
  const startTimestamp = Date.now();
  const testDatabaseName = `admit_card_smoke_${startTimestamp}`;
  const port = 3200 + Number(String(startTimestamp).slice(-3));
  const baseUrl = `http://127.0.0.1:${port}`;
  const workspacePath = path.join(tempRoot, String(startTimestamp));
  const browserExecutablePath = findEdgeExecutablePath();
  const baseEnv = loadEnvFile(envPath);
  const dialogMessages = [];
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  let databasePool = null;
  let browser = null;
  let page = null;
  let serverHandle = null;

  assert(browserExecutablePath, "Microsoft Edge executable was not found.");
  fs.mkdirSync(tempRoot, { recursive: true });

  try {
    await createTempDatabase(baseEnv, testDatabaseName);
    databasePool = await createDatabasePool(baseEnv, testDatabaseName);

    serverHandle = startServer({
      PORT: String(port),
      DB_NAME: testDatabaseName,
    });
    await waitForHealth(baseUrl);

    const artifacts = await createUploadArtifacts(workspacePath);

    browser = await puppeteer.launch({
      executablePath: browserExecutablePath,
      headless: "new",
      args: ["--no-sandbox"],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });
    page.setDefaultTimeout(30000);
    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    page.on("pageerror", (error) => {
      pageErrors.push(String(error?.stack || error));
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("requestfailed", (request) => {
      requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || ""}`);
    });

    console.log("STEP 1/11: Login screen");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle2" });
    await waitForPath(page, "/login");
    await waitForVisible(page, "#loginForm");
    assert(await page.$("#loginForm"), "Login form did not render.");

    console.log("STEP 2/11: Login and password setup");
    await page.type("#loginAccountId", "admin");
    await page.type("#loginPassword", "1111");
    await page.click("button[data-auth-login='true']");
    await page.waitForFunction(() => !document.getElementById("passwordSetupModal").classList.contains("hidden"));
    await typeIntoField(page, "#passwordSetupNext", "Smoke1234");
    await typeIntoField(page, "#passwordSetupConfirm", "Smoke1234");
    await page.click("button[data-password-setup-submit='true']");
    await waitForPath(page, "/dashboard");
    await waitForVisible(page, ".hero-card");
    const dashboardText = await page.$eval(".hero-card", (element) => element.innerText);
    assert(dashboardText.includes("DASHBOARD"), "Dashboard view did not render after login.");

    console.log("STEP 3/11: Examinee upload and dashboard metrics");
    await navigateToView(page, "examineeRegistration", "/examinee-registration");
    await waitForVisible(page, "[data-open-modal='uploadModal']");
    await page.click("[data-open-modal='uploadModal']");
    await page.waitForFunction(() => !document.getElementById("uploadModal").classList.contains("hidden"));
    const workbookInput = await page.$("#uploadFileInput");
    await workbookInput.uploadFile(artifacts.workbookPath);
    await page.click("button[data-upload-examinees='true']");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);
    await navigateToView(page, "dashboard", "/dashboard");
    await page.waitForFunction(() => {
      const counter = document.getElementById("registeredExamineeCount");
      return Boolean(counter) && counter.textContent.includes("1명");
    });

    console.log("STEP 4/11: Examinee detail edit and photo upload");
    await navigateToView(page, "examineeRegistration", "/examinee-registration");
    await page.click("tr[data-grid-row-clickable='true']");
    await page.waitForFunction(() => !document.getElementById("examineeDetailModal").classList.contains("hidden"));
    await typeIntoField(page, "#examineeDetailField-room", "202");
    const photoInput = await page.$("#examineeDetailPhotoInput");
    await photoInput.uploadFile(artifacts.photoPath);
    await page.waitForSelector(".examinee-detail-photo-image", { visible: true });
    await page.click("button[data-examinee-detail-save='true']");
    await page.waitForFunction(() => document.body.innerText.includes("202"));
    await page.click("#examineeDetailModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#examineeDetailModal");

    console.log("STEP 5/11: Admit card PDF routes");
    await navigateToView(page, "admitCardLookup", "/admit-cards");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);
    const singlePdf = await fetchBinaryInPage(page, `/api/examinees/${artifacts.sampleExamineeNo}/admit-card.pdf`);
    assert(singlePdf.ok && singlePdf.contentType.includes("application/pdf") && singlePdf.length > 0, "Single admit card PDF generation failed.");
    const batchPdf = await fetchBinaryInPage(page, "/api/examinees/admit-cards.pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examineeNos: [artifacts.sampleExamineeNo],
      }),
    });
    assert(batchPdf.ok && batchPdf.contentType.includes("application/pdf") && batchPdf.length > 0, "Batch admit card PDF generation failed.");
    const printHistoryInsert = await fetchJsonInPage(page, "/api/print-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examineeNo: artifacts.sampleExamineeNo,
      }),
    });
    assert(printHistoryInsert.ok && Number(printHistoryInsert.payload?.printCount || 0) === 1, "Print history record creation failed.");

    console.log("STEP 6/11: Print history page");
    await navigateToView(page, "printHistory", "/print-history");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);

    console.log("STEP 7/11: Template management");
    await navigateToView(page, "templateManagement", "/templates");
    const templateCountBefore = await page.$$eval(".template-card", (cards) => cards.length);
    await page.click("[data-add-template='true']");
    await page.waitForFunction((countBefore) => document.querySelectorAll(".template-card").length === countBefore + 1, {}, templateCountBefore);
    const createdTemplateId = await page.$$eval(".template-card", (cards) => cards[cards.length - 1]?.dataset.templateId || "");
    assert(createdTemplateId, "New template card was not created.");
    await page.click(`[data-template-preview="${createdTemplateId}"]`);
    await page.waitForFunction(() => !document.getElementById("templatePreviewModal").classList.contains("hidden"));
    await page.waitForFunction(() => {
      const stage = document.getElementById("templatePreviewStage");
      return Boolean(stage) && stage.innerHTML.trim().length > 0;
    });
    await page.click("#templatePreviewModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#templatePreviewModal");
    await page.click(`[data-template-edit="${createdTemplateId}"]`);
    await page.waitForFunction(() => !document.getElementById("templateEditorModal").classList.contains("hidden"));
    await page.waitForFunction(() => {
      const surface = document.getElementById("templateEditorSurface");
      return Boolean(surface) && surface.innerHTML.trim().length > 0;
    });
    await waitForVisible(page, "#templateEditorModal [data-template-cell-split-toggle]");
    await selectEditorTableCell(page, {
      editorSelector: "#templateEditorSurface",
      markup: "<table><tbody><tr><td colspan='2'>열 분할</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>",
      cellSelector: "td[colspan='2']",
    });
    await page.click("#templateEditorModal [data-template-cell-split-toggle]");
    await waitForVisible(page, "#templateEditorCellSplitPanel");
    await page.click("#templateEditorCellSplitPanel [data-template-cell-split-step='up']");
    await page.click("#templateEditorCellSplitPanel [data-template-cell-split-step='down']");
    const templateSplitCountAfterStep = await page.$eval("#templateEditorCellSplitCount", (input) => input.value);
    assert(templateSplitCountAfterStep === "2", "Template editor cell split stepper did not stay synchronized.");
    await page.click("#templateEditorCellSplitPanel [data-template-cell-split-confirm]");
    await page.waitForFunction(() => {
      const firstRow = document.querySelector("#templateEditorSurface table tr");
      return Boolean(firstRow) && firstRow.children.length === 2 && Array.from(firstRow.children).every((cell) => cell.colSpan === 1);
    });
    await waitForHiddenClass(page, "#templateEditorCellSplitPanel");

    await selectEditorTableCell(page, {
      editorSelector: "#templateEditorSurface",
      markup: "<table><tbody><tr><td rowspan='2'>행 분할</td><td>A</td></tr><tr><td>B</td></tr></tbody></table>",
      cellSelector: "td[rowspan='2']",
    });
    await page.click("#templateEditorModal [data-template-cell-split-toggle]");
    await waitForVisible(page, "#templateEditorCellSplitPanel");
    await page.click("label[for='templateEditorCellSplitAxisRow']");
    await page.click("#templateEditorCellSplitPanel [data-template-cell-split-confirm]");
    await page.waitForFunction(() => {
      const tableRows = Array.from(document.querySelectorAll("#templateEditorSurface table tr"));
      const splitCells = Array.from(document.querySelectorAll("#templateEditorSurface table td")).filter((cell) => cell.textContent.includes("행 분할"));
      return tableRows.length === 2 && splitCells.length === 1 && splitCells[0].rowSpan === 1 && tableRows[1]?.children.length === 2;
    });
    await waitForHiddenClass(page, "#templateEditorCellSplitPanel");
    await page.click("button[data-save-template-editor='true']");
    await waitForHiddenClass(page, "#templateEditorModal");
    await navigateToView(page, "templateManagement", "/templates");
    await page.waitForSelector(`[data-template-delete="${createdTemplateId}"]`);
    await page.click(`[data-template-delete="${createdTemplateId}"]`);
    await page.waitForFunction((countBefore) => document.querySelectorAll(".template-card").length === countBefore, {}, templateCountBefore);

    console.log("STEP 8/11: System settings and accounts");
    await navigateToView(page, "systemSettings", "/system-settings");
    await waitForVisible(page, "#systemSettingsInitialPassword");
    await typeIntoField(page, "#systemSettingsInitialPassword", "2222");
    await typeIntoField(page, "#systemSettingsAutoLogoutMinutes", "5");
    await page.click("[data-system-settings-action='save']");
    await page.waitForFunction(() => {
      const status = document.getElementById("systemSettingsStatus");
      return Boolean(status) && status.textContent.includes("저장했습니다");
    });
    await navigateToView(page, "accountManagement", "/accounts");
    await waitForVisible(page, "[data-open-modal='accountCreateModal']");
    await page.click("[data-open-modal='accountCreateModal']");
    await page.waitForFunction(() => !document.getElementById("accountCreateModal").classList.contains("hidden"));
    await page.type("#accountCreateId", "smoke-user");
    await page.type("#accountCreateName", "스모크계정");
    await page.select("#accountCreateRole", "운영자");
    await page.click("button[data-account-create-submit='true']");
    await page.waitForFunction(() => document.body.innerText.includes("smoke-user"));
    await page.click("[data-account-edit='smoke-user']");
    await typeIntoField(page, "[data-account-field='name'][data-account-id='smoke-user']", "스모크수정");
    await page.click("[data-account-save='smoke-user']");
    await page.waitForFunction(() => document.body.innerText.includes("스모크수정"));
    const dialogCountBeforeReset = dialogMessages.length;
    await page.click("[data-account-reset='smoke-user']");
    await page.waitForFunction((countBefore) => window.__dialogCountMarker ? true : true, {}, dialogCountBeforeReset);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert(dialogMessages.some((message) => message.includes("2222")), "Reset password dialog did not mention the saved initial password.");
    await page.click("[data-account-delete='smoke-user']");
    await page.waitForFunction(() => !document.body.innerText.includes("smoke-user"));

    console.log("STEP 9/11: Login notice settings");
    const updatedNoticeText = "Smoke Test Notice";
    await navigateToView(page, "loginNoticeSettings", "/login-notice");
    await page.waitForSelector("#loginNoticeEditor");
    await waitForVisible(page, ".login-notice-editor-toolbar [data-template-cell-split-toggle]");

    await selectEditorTableCell(page, {
      editorSelector: "#loginNoticeEditor",
      markup: "<table><tbody><tr><td colspan='2'>열 분할</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>",
      cellSelector: "td[colspan='2']",
    });
    await page.click(".login-notice-editor-toolbar [data-template-cell-split-toggle]");
    await waitForVisible(page, "#loginNoticeCellSplitPanel");
    const loginNoticeCellSplitPanelText = await page.$eval("#loginNoticeCellSplitPanel", (element) => element.innerText);
    assert(
      loginNoticeCellSplitPanelText.includes("편집") && loginNoticeCellSplitPanelText.includes("칸"),
      "Login notice cell split panel did not render the shared toolbar labels.",
    );
    await page.click("#loginNoticeCellSplitPanel [data-template-cell-split-step='up']");
    await page.click("#loginNoticeCellSplitPanel [data-template-cell-split-step='down']");
    const splitCountAfterStep = await page.$eval("#loginNoticeCellSplitCount", (input) => input.value);
    assert(splitCountAfterStep === "2", "Login notice cell split stepper did not stay synchronized.");
    await page.click("#loginNoticeCellSplitPanel [data-template-cell-split-confirm]");
    await page.waitForFunction(() => {
      const firstRow = document.querySelector("#loginNoticeEditor table tr");
      return Boolean(firstRow) && firstRow.children.length === 2 && Array.from(firstRow.children).every((cell) => cell.colSpan === 1);
    });
    await waitForHiddenClass(page, "#loginNoticeCellSplitPanel");

    await selectEditorTableCell(page, {
      editorSelector: "#loginNoticeEditor",
      markup: "<table><tbody><tr><td rowspan='2'>행 분할</td><td>A</td></tr><tr><td>B</td></tr></tbody></table>",
      cellSelector: "td[rowspan='2']",
    });
    await page.click(".login-notice-editor-toolbar [data-template-cell-split-toggle]");
    await waitForVisible(page, "#loginNoticeCellSplitPanel");
    await page.click("label[for='loginNoticeCellSplitAxisRow']");
    await page.click("#loginNoticeCellSplitPanel [data-template-cell-split-confirm]");
    await page.waitForFunction(() => {
      const tableRows = Array.from(document.querySelectorAll("#loginNoticeEditor table tr"));
      const splitCells = Array.from(document.querySelectorAll("#loginNoticeEditor table td")).filter((cell) => cell.textContent.includes("행 분할"));
      return tableRows.length === 2 && splitCells.length === 1 && splitCells[0].rowSpan === 1 && tableRows[1]?.children.length === 2;
    });
    await waitForHiddenClass(page, "#loginNoticeCellSplitPanel");

    await page.evaluate((noticeText) => {
      const editor = document.getElementById("loginNoticeEditor");
      editor.innerHTML = `<p>${noticeText}</p>`;
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "x" }));
    }, updatedNoticeText);
    await page.click("[data-notice-action='save']");
    await page.waitForFunction((noticeText) => document.body.innerText.includes(noticeText), {}, updatedNoticeText);
    const loginNoticePayload = await fetchJsonInPage(page, "/api/login-notice");
    assert(loginNoticePayload.ok && String(loginNoticePayload.payload?.html || "").includes(updatedNoticeText), "Login notice save did not persist.");

    console.log("STEP 10/11: Print history deletion");
    await navigateToView(page, "systemSettings", "/system-settings");
    await waitForVisible(page, "[data-system-data-delete='print-history']");
    await page.click("[data-system-data-delete='print-history']");
    await page.waitForFunction(() => {
      const status = document.getElementById("systemDataDeletionStatus");
      return Boolean(status) && status.textContent.includes("삭제");
    });
    await navigateToView(page, "printHistory", "/print-history");
    await page.waitForFunction((examineeNo) => {
      const viewText = document.getElementById("viewRoot")?.innerText || "";
      return viewText.includes("출력 이력이 없습니다.") || !viewText.includes(examineeNo);
    }, {}, artifacts.sampleExamineeNo);
    assert(!((await page.$eval("#viewRoot", (element) => element.innerText)).includes(artifacts.sampleExamineeNo)), "Print history rows still remained after deletion.");

    console.log("STEP 11/11: Logout and final login notice check");
    await page.click("[data-auth-logout='true']");
    await waitForPath(page, "/login");
    await waitForVisible(page, "#loginForm");
    const loginPageText = await page.$eval("#viewRoot", (element) => element.innerText);
    assert(loginPageText.includes(updatedNoticeText), "Updated login notice was not visible after logout.");

    assert(pageErrors.length === 0, `Page errors were captured:\n${pageErrors.join("\n\n")}`);
    assert(consoleErrors.length === 0, `Console errors were captured:\n${consoleErrors.join("\n\n")}`);
    assert(requestFailures.length === 0, `Request failures were captured:\n${requestFailures.join("\n\n")}`);

    console.log("SMOKE TEST PASSED");
  } finally {
    if (page) {
      const screenshotPath = path.join(workspacePath, "final-state.png");

      try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } catch (error) {
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch (error) {
      }
    }

    if (databasePool) {
      try {
        await databasePool.end();
      } catch (error) {
      }
    }

    await stopServer(serverHandle);

    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }

    await dropTempDatabase(baseEnv, testDatabaseName);
  }
}

runSmokeTest().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
