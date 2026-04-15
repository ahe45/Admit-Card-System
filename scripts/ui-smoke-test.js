const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const AdmZip = require("adm-zip");
const ExcelJS = require("exceljs");
const mysql = require("mysql2/promise");
const puppeteer = require("puppeteer-core");

const repoRoot = path.resolve(__dirname, "..");
const tempRoot = path.join(repoRoot, ".tmp-smoke");
const envPath = path.join(repoRoot, ".env");
const examineeFields = require("../shared/domain/examinee-fields");
const onePixelPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxK4AAAAASUVORK5CYII=";
const applicantAssignmentColumns = Object.freeze([
  Object.freeze({ header: "모집시기", key: "track", width: 18 }),
  Object.freeze({ header: "전형", key: "admission", width: 18 }),
  Object.freeze({ header: "계열", key: "series", width: 18 }),
  Object.freeze({ header: "모집단위", key: "unit", width: 22 }),
  Object.freeze({ header: "전공", key: "major", width: 20 }),
  Object.freeze({ header: "날짜", key: "date", width: 14 }),
  Object.freeze({ header: "시간", key: "time", width: 10 }),
  Object.freeze({ header: "고사건물코드", key: "buildingCode", width: 16 }),
  Object.freeze({ header: "고사건물", key: "building", width: 18 }),
  Object.freeze({ header: "고사실코드", key: "roomCode", width: 16 }),
  Object.freeze({ header: "고사실", key: "room", width: 18 }),
  Object.freeze({ header: "배정인원", key: "assignedCount", width: 12 }),
]);
const applicantRecruitmentColumns = Object.freeze([
  Object.freeze({ header: "모집시기", key: "trackName", width: 18 }),
  Object.freeze({ header: "전형코드", key: "admissionCode", width: 16 }),
  Object.freeze({ header: "전형", key: "admissionName", width: 18 }),
  Object.freeze({ header: "계열코드", key: "seriesCode", width: 16 }),
  Object.freeze({ header: "계열", key: "seriesName", width: 18 }),
  Object.freeze({ header: "모집단위코드", key: "unitCode", width: 18 }),
  Object.freeze({ header: "모집단위", key: "unitName", width: 24 }),
  Object.freeze({ header: "전공코드", key: "majorCode", width: 16 }),
  Object.freeze({ header: "전공", key: "majorName", width: 24 }),
]);

function padDatePart(value) {
  return String(value ?? "").padStart(2, "0");
}

function formatScheduleDateTime(value) {
  const parsedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid schedule date value.");
  }

  return `${parsedDate.getFullYear()}-${padDatePart(parsedDate.getMonth() + 1)}-${padDatePart(parsedDate.getDate())}T${padDatePart(parsedDate.getHours())}:${padDatePart(parsedDate.getMinutes())}`;
}

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

async function upsertSystemSettings(pool, entries = {}) {
  const normalizedEntries = Object.entries(entries).filter(([key]) => Boolean(String(key || "").trim()));

  for (const [settingKey, settingValue] of normalizedEntries) {
    await pool.query(
      `
        INSERT INTO system_set (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value)
      `,
      [settingKey, String(settingValue ?? "")],
    );
  }
}

async function insertApplicantRecruitmentUnit(pool, unit = {}) {
  const [sortOrderRows] = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM app_unit`);
  const nextSortOrder = Number(sortOrderRows?.[0]?.nextSortOrder || 1);
  const [result] = await pool.query(
    `
      INSERT INTO app_unit (
        track_name,
        admission_code,
        admission_name,
        series_code,
        series_name,
        unit_code,
        unit_name,
        major_code,
        major_name,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      String(unit.trackName || "").trim(),
      String(unit.admissionCode || "").trim(),
      String(unit.admissionName || "").trim(),
      String(unit.seriesCode || "").trim(),
      String(unit.seriesName || "").trim(),
      String(unit.unitCode || "").trim(),
      String(unit.unitName || "").trim(),
      String(unit.majorCode || "").trim(),
      String(unit.majorName || "").trim(),
      nextSortOrder,
    ],
  );

  return Number(result?.insertId || 0);
}

async function upsertApplicantSchedule(pool, schedule = {}) {
  await pool.query(
    `
      INSERT INTO app_schedule (
        track_name,
        admission_code,
        admission_name,
        applicant_schedule_start_at,
        applicant_schedule_end_at,
        admit_card_lookup_schedule_start_at,
        admit_card_lookup_schedule_end_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        applicant_schedule_start_at = VALUES(applicant_schedule_start_at),
        applicant_schedule_end_at = VALUES(applicant_schedule_end_at),
        admit_card_lookup_schedule_start_at = VALUES(admit_card_lookup_schedule_start_at),
        admit_card_lookup_schedule_end_at = VALUES(admit_card_lookup_schedule_end_at)
    `,
    [
      String(schedule.trackName || "").trim(),
      String(schedule.admissionCode || "").trim(),
      String(schedule.admissionName || "").trim(),
      String(schedule.applicantScheduleStartAt || "").trim() || null,
      String(schedule.applicantScheduleEndAt || "").trim() || null,
      String(schedule.admitCardLookupScheduleStartAt || "").trim() || null,
      String(schedule.admitCardLookupScheduleEndAt || "").trim() || null,
    ],
  );
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

async function fetchJson(baseUrl, urlPath, options = {}) {
  const response = await fetch(new URL(urlPath, baseUrl).toString(), options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    contentType,
    payload,
  };
}

async function createUploadArtifacts(workspacePath) {
  fs.mkdirSync(workspacePath, { recursive: true });

  const workbookPath = path.join(workspacePath, "smoke-examinees.xlsx");
  const sampleExamineeNo = "20260001";
  const photoPath = path.join(workspacePath, `${sampleExamineeNo}.png`);
  const photoArchivePath = path.join(workspacePath, "smoke-examinee-photos.zip");
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

  fs.writeFileSync(photoPath, Buffer.from(onePixelPngBase64, "base64"));
  {
    const zip = new AdmZip();
    zip.addLocalFile(photoPath);
    zip.writeZip(photoArchivePath);
  }

  return {
    workbookPath,
    photoPath,
    photoArchivePath,
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

async function fetchBinaryBase64InPage(page, url, options = {}) {
  return page.evaluate(async ({ requestUrl, requestOptions }) => {
    const response = await fetch(requestUrl, {
      credentials: "same-origin",
      ...requestOptions,
    });
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      base64: btoa(binary),
      length: arrayBuffer.byteLength,
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

function enqueueDialogResponse(queue, response = {}) {
  queue.push({
    type: String(response.type || "").trim(),
    messageIncludes: String(response.messageIncludes || "").trim(),
    accept: response.accept !== false,
    promptText: String(response.promptText || ""),
  });
}

async function withQueuedDialogResponses(queue, responses = [], action = null) {
  const pendingResponses = Array.isArray(responses) ? responses : [responses];
  pendingResponses.forEach((response) => enqueueDialogResponse(queue, response));

  try {
    return typeof action === "function" ? await action() : undefined;
  } finally {
    queue.length = 0;
  }
}

async function navigateToView(page, view, pathname) {
  const navigationSelector = `.nav-item[data-view="${view}"]`;
  const hasNavigationItem = Boolean(await page.$(navigationSelector));

  if (hasNavigationItem) {
    try {
      await page.$eval(navigationSelector, (element) => {
        element.scrollIntoView({
          block: "center",
          inline: "center",
        });
      });
      await page.click(navigationSelector);
      await waitForPath(page, pathname);
    } catch (error) {
      await page.goto(new URL(pathname, page.url()).toString(), { waitUntil: "networkidle0" });
      await waitForPath(page, pathname);
    }
  } else {
    await page.goto(new URL(pathname, page.url()).toString(), { waitUntil: "networkidle0" });
    await waitForPath(page, pathname);
  }

  await page.waitForFunction(() => {
    const viewRoot = document.getElementById("viewRoot");
    return document.readyState === "complete" && Boolean(viewRoot) && viewRoot.innerHTML.trim().length > 0;
  });
}

async function openExamineeUploadModal(page, mode = "workbook") {
  await waitForVisible(page, "[data-open-modal='uploadTypeModal']");
  await page.click("[data-open-modal='uploadTypeModal']");
  await page.waitForFunction(() => !document.getElementById("uploadTypeModal").classList.contains("hidden"));
  await page.click(`[data-examinee-upload-mode="${mode}"]`);
  await page.waitForFunction(() => document.getElementById("uploadTypeModal").classList.contains("hidden"));
  await page.waitForFunction(() => !document.getElementById("uploadModal").classList.contains("hidden"));
}

async function waitForDashboardMetricValue(page, metricName, expectedValue, timeout = 30000) {
  await page.waitForFunction(({ name, value }) => {
    const metric = document.querySelector(`[data-dashboard-metric="${name}"]`);
    return Boolean(metric) && metric.textContent.trim() === value;
  }, { timeout }, { name: metricName, value: expectedValue });
}

async function typeIntoField(page, selector, value) {
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}

async function setCheckboxValue(page, selector, shouldBeChecked) {
  const isChecked = await page.$eval(selector, (element) => Boolean(element.checked));

  if (isChecked !== (shouldBeChecked === true)) {
    await page.click(selector);
  }
}

async function setInputValue(page, selector, value) {
  await page.$eval(
    selector,
    (element, nextValue) => {
      element.value = String(nextValue ?? "");
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

async function clickGridRow(page, gridKey, rowId, { shiftKey = false } = {}) {
  const rowSelector = `tr[data-grid-key="${gridKey}"][data-grid-row-id="${rowId}"]`;

  await waitForVisible(page, rowSelector);

  if (shiftKey) {
    await page.keyboard.down("Shift");
  }

  try {
    await page.click(rowSelector);
  } finally {
    if (shiftKey) {
      await page.keyboard.up("Shift");
    }
  }
}

async function getSelectedGridRowCount(page, gridKey) {
  return page.$$eval(`[data-grid-key="${gridKey}"][data-grid-select-row]`, (checkboxes) =>
    checkboxes.filter((checkbox) => checkbox.checked).length,
  );
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

async function createAssignmentWorkbookFile(workspacePath, fileName, rows = []) {
  const workbook = new ExcelJS.Workbook();
  const summaryWorksheet = workbook.addWorksheet("대상자요약");
  const assignmentWorksheet = workbook.addWorksheet("배정표");
  const filePath = path.join(workspacePath, fileName);

  summaryWorksheet.columns = [
    { header: "항목", key: "label", width: 18 },
    { header: "값", key: "value", width: 18 },
  ];
  summaryWorksheet.addRows([
    { label: "행수", value: String(Array.isArray(rows) ? rows.length : 0) },
  ]);
  assignmentWorksheet.columns = applicantAssignmentColumns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  assignmentWorksheet.addRows(Array.isArray(rows) ? rows : []);

  const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  fs.writeFileSync(filePath, workbookBuffer);

  return {
    filePath,
    workbookBuffer,
    base64: workbookBuffer.toString("base64"),
  };
}

async function createApplicantRecruitmentWorkbookFile(workspacePath, fileName, rows = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("전형관리");
  const filePath = path.join(workspacePath, fileName);

  worksheet.columns = applicantRecruitmentColumns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.addRows(Array.isArray(rows) ? rows : []);

  const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  fs.writeFileSync(filePath, workbookBuffer);

  return {
    filePath,
    workbookBuffer,
    base64: workbookBuffer.toString("base64"),
  };
}

async function enableBrowserDownloads(page, downloadPath) {
  fs.mkdirSync(downloadPath, { recursive: true });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath,
  });
  return client;
}

async function waitForDownloadedFile(downloadPath, existingFileNames = [], timeoutMs = 30000) {
  const knownFileNameSet = new Set(Array.isArray(existingFileNames) ? existingFileNames : []);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const currentFileNames = fs.existsSync(downloadPath) ? fs.readdirSync(downloadPath) : [];
    const completedFileName = currentFileNames.find((fileName) => {
      const normalizedFileName = String(fileName || "").trim();
      return normalizedFileName && !knownFileNameSet.has(normalizedFileName) && !normalizedFileName.endsWith(".crdownload");
    });

    if (completedFileName) {
      const filePath = path.join(downloadPath, completedFileName);
      const stats = fs.statSync(filePath);

      if (stats.size > 0) {
        return filePath;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Expected download file was not created in time.");
}

function parseDownloadFileName(contentDispositionValue = "", fallbackFileName = "download.bin") {
  const normalizedValue = String(contentDispositionValue || "").trim();
  const encodedMatch = normalizedValue.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch (error) {
      return String(encodedMatch[1] || fallbackFileName);
    }
  }

  const plainMatch = normalizedValue.match(/filename="([^"]+)"|filename=([^;]+)/i);

  if (plainMatch?.[1] || plainMatch?.[2]) {
    return String(plainMatch[1] || plainMatch[2] || fallbackFileName).trim();
  }

  return fallbackFileName;
}

async function waitForCondition(predicate, {
  timeoutMs = 30000,
  intervalMs = 100,
  errorMessage = "Expected condition was not satisfied in time.",
} = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(errorMessage);
}

async function waitForDialogMessageCount(dialogMessages = [], expectedCount = 1, timeoutMs = 5000) {
  await waitForCondition(
    () => Array.isArray(dialogMessages) && dialogMessages.length >= expectedCount,
    {
      timeoutMs,
      intervalMs: 50,
      errorMessage: `Expected at least ${expectedCount} dialog message(s), but only ${Array.isArray(dialogMessages) ? dialogMessages.length : 0} were captured.`,
    },
  );
}

function buildApplicantAnswerPayload(fields = [], values = {}) {
  const answers = {};

  for (const field of Array.isArray(fields) ? fields : []) {
    const systemFieldKey = String(field?.systemFieldKey || "").trim();
    const fieldKey = String(field?.fieldKey || "").trim();

    if (!fieldKey || systemFieldKey === "name") {
      continue;
    }

    if (systemFieldKey === "track") {
      answers[fieldKey] = values.track || "";
      continue;
    }

    if (systemFieldKey === "date") {
      answers[fieldKey] = values.date || "";
      continue;
    }

    if (systemFieldKey === "time") {
      answers[fieldKey] = values.time || "";
      continue;
    }

    if (systemFieldKey === "birth") {
      answers[fieldKey] = values.birth || "";
      continue;
    }

    if (systemFieldKey === "building") {
      answers[fieldKey] = values.building || "";
      continue;
    }

    if (systemFieldKey === "room") {
      answers[fieldKey] = values.room || "";
      continue;
    }

    if (systemFieldKey === "group") {
      answers[fieldKey] = values.group || "";
      continue;
    }

    if (field.inputType === "photo" && values.photoPayload) {
      answers[fieldKey] = values.photoPayload;
    }
  }

  return answers;
}

async function createApplicantSubmission(baseUrl, fields = [], payload = {}, options = {}) {
  const databasePool = options?.databasePool || null;
  const verificationResult = await fetchJson(baseUrl, "/api/public/email-verifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
    }),
  });
  assert(verificationResult.ok, `Applicant verification code request failed: ${JSON.stringify(verificationResult.payload)}`);
  let verificationCode = String(verificationResult.payload?.debugCode || "").trim();

  if (!verificationCode) {
    assert(databasePool && typeof databasePool.query === "function", "Applicant verification code was not exposed and no database pool was available.");
    await waitForCondition(async () => {
      const [verificationRows] = await databasePool.query(
        `
          SELECT code_value AS codeValue
          FROM app_email_log
          WHERE applicant_name = ? AND email = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [payload.name, payload.email],
      );
      verificationCode = String(verificationRows?.[0]?.codeValue || "").trim();
      return Boolean(verificationCode);
    }, {
      timeoutMs: 5000,
      intervalMs: 200,
      errorMessage: `Applicant verification code request did not create a readable email log row: ${JSON.stringify(verificationResult.payload)}`,
    });
  }

  const verifyResult = await fetchJson(baseUrl, "/api/public/email-verifications/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      code: verificationCode,
    }),
  });
  assert(
    verifyResult.ok && String(verifyResult.payload?.accessToken || "").trim(),
    `Applicant verification failed: ${JSON.stringify(verifyResult.payload)}`,
  );

  const saveResult = await fetchJson(baseUrl, "/api/public/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken: verifyResult.payload.accessToken,
      password: payload.password,
      selectionAnswers: payload.selectionAnswers,
      answers: buildApplicantAnswerPayload(fields, payload),
    }),
  });
  assert(saveResult.ok && Number(saveResult.payload?.id || 0) > 0, `Applicant save failed: ${JSON.stringify(saveResult.payload)}`);

  return saveResult.payload;
}

async function runSmokeTest() {
  const startTimestamp = Date.now();
  const testDatabaseName = `admit_card_smoke_${startTimestamp}`;
  const port = 3200 + Number(String(startTimestamp).slice(-3));
  const baseUrl = `http://127.0.0.1:${port}`;
  const workspacePath = path.join(tempRoot, String(startTimestamp));
  const downloadPath = path.join(workspacePath, "downloads");
  const systemAutoBackupDirectoryPath = path.join(repoRoot, "backups", "system-auto");
  const systemAutoBackupDirectoryExistedBefore = fs.existsSync(systemAutoBackupDirectoryPath);
  const preexistingSystemAutoBackupFileNames = systemAutoBackupDirectoryExistedBefore
    ? fs.readdirSync(systemAutoBackupDirectoryPath)
    : [];
  const browserExecutablePath = findEdgeExecutablePath();
  const baseEnv = loadEnvFile(envPath);
  const dialogMessages = [];
  const queuedDialogResponses = [];
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  let currentSessionPassword = "Smoke1234";
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
    await enableBrowserDownloads(page, downloadPath);
    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      const queuedResponse = queuedDialogResponses.shift() || null;

      if (queuedResponse?.type) {
        assert(queuedResponse.type === dialog.type(), `Unexpected dialog type: expected ${queuedResponse.type}, received ${dialog.type()}.`);
      }

      if (queuedResponse?.messageIncludes) {
        assert(
          dialog.message().includes(queuedResponse.messageIncludes),
          `Dialog message did not contain the expected text.\nExpected: ${queuedResponse.messageIncludes}\nActual: ${dialog.message()}`,
        );
      }

      if (queuedResponse?.accept === false) {
        await dialog.dismiss();
        return;
      }

      if (dialog.type() === "prompt") {
        await dialog.accept(queuedResponse?.promptText || "");
        return;
      }

      await dialog.accept();
    });
    page.on("pageerror", (error) => {
      pageErrors.push(String(error?.stack || error));
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        if (/^Failed to load resource: the server responded with a status of (400|409|500)/.test(message.text())) {
          return;
        }

        consoleErrors.push(message.text());
      }
    });
    page.on("requestfailed", (request) => {
      requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || ""}`);
    });

    console.log("STEP 1/15: Login screen");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle2" });
    await waitForPath(page, "/login");
    await waitForVisible(page, "#loginForm");
    assert(await page.$("#loginForm"), "Login form did not render.");

    console.log("STEP 2/15: Login and password setup");
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

    console.log("STEP 3/15: Examinee workbook upload flow");
    await navigateToView(page, "examineeRegistration", "/examinee-registration");
    await waitForVisible(page, "[data-open-modal='uploadTypeModal']");
    await openExamineeUploadModal(page, "workbook");
    await page.waitForFunction(() => document.getElementById("uploadTitle")?.textContent?.includes("수험생 데이터 업로드"));
    await page.waitForFunction(() => document.getElementById("uploadExecuteButton")?.disabled === true);
    const workbookInput = await page.$("#uploadFileInput");
    await workbookInput.uploadFile(artifacts.workbookPath);
    await page.waitForFunction(() => {
      const previewMount = document.getElementById("uploadPreviewMount");
      const executeButton = document.getElementById("uploadExecuteButton");
      return Boolean(previewMount) && previewMount.innerText.includes("총 업로드 행") && executeButton?.disabled === false;
    });
    await page.click("button[data-upload-examinees='true']");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);
    await navigateToView(page, "dashboard", "/dashboard");
    await waitForDashboardMetricValue(page, "registeredExamineeCount", "1명");

    console.log("STEP 4/15: Examinee photo archive upload flow");
    await navigateToView(page, "examineeRegistration", "/examinee-registration");
    await openExamineeUploadModal(page, "photo-archive");
    await page.waitForFunction(() => document.getElementById("uploadTitle")?.textContent?.includes("수험생 사진 업로드"));
    await page.waitForFunction(() => document.getElementById("uploadExecuteButton")?.disabled === true);
    const photoArchiveInput = await page.$("#uploadPhotoArchiveInput");
    await photoArchiveInput.uploadFile(artifacts.photoArchivePath);
    await page.waitForFunction(() => {
      const previewMount = document.getElementById("uploadPreviewMount");
      const executeButton = document.getElementById("uploadExecuteButton");
      return Boolean(previewMount) && previewMount.innerText.includes("수험번호 매칭 예정") && executeButton?.disabled === false;
    });
    await page.click("button[data-upload-examinees='true']");
    await page.waitForFunction(() => document.getElementById("uploadExecuteButton")?.disabled === true);
    const uploadedPhotoBinary = await fetchBinaryInPage(page, `/api/examinees/${artifacts.sampleExamineeNo}/photo`);
    assert(
      uploadedPhotoBinary.ok && uploadedPhotoBinary.length > 0,
      "Examinee photo archive upload did not store the matching photo.",
    );

    console.log("STEP 5/15: Examinee detail edit and direct photo upload");
    await page.goto(`${baseUrl}/examinee-registration`, { waitUntil: "networkidle0" });
    await waitForPath(page, "/examinee-registration");
    await clickGridRow(page, "examineeRegistrationGrid", artifacts.sampleExamineeNo);
    await page.waitForFunction(() => !document.getElementById("examineeDetailModal").classList.contains("hidden"));
    await typeIntoField(page, "#examineeDetailField-room", "202");
    const photoInput = await page.$("#examineeDetailPhotoInput");
    await photoInput.uploadFile(artifacts.photoPath);
    await page.waitForSelector(".examinee-detail-photo-image", { visible: true });
    await page.waitForFunction(() => {
      const saveButton = document.querySelector("button[data-examinee-detail-save='true']");
      return Boolean(saveButton) && saveButton.disabled === false;
    });
    await page.click("button[data-examinee-detail-save='true']");
    await waitForCondition(async () => {
      const [roomRows] = await databasePool.query(
        `
          SELECT room
          FROM examinee
          WHERE examinee_no = ?
          LIMIT 1
        `,
        [artifacts.sampleExamineeNo],
      );
      return String(roomRows?.[0]?.room || "").trim() === "202";
    }, {
      timeoutMs: 30000,
      intervalMs: 250,
      errorMessage: "Examinee detail save did not persist the updated room number.",
    });
    if (!(await page.$eval("#examineeDetailModal", (element) => element.classList.contains("hidden")))) {
      await page.click("#examineeDetailModal .icon-button[data-close-modal='true']");
      await waitForHiddenClass(page, "#examineeDetailModal");
    }

    console.log("STEP 6/15: Admit card lookup, batch print modal, and PDF routes");
    await navigateToView(page, "admitCardLookup", "/admit-cards");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);
    const batchPrintButtonBeforeSelection = await page.$eval("[data-open-modal='batchPrintDownloadModal']", (button) => ({
      disabled: button.disabled,
      text: button.textContent || "",
    }));
    assert(
      batchPrintButtonBeforeSelection.disabled === true && batchPrintButtonBeforeSelection.text.includes("일괄 다운로드(0명)"),
      "Batch print button did not reflect the empty selection state.",
    );
    await clickGridRow(page, "admitCardLookupGrid", artifacts.sampleExamineeNo);
    await page.waitForFunction(() => {
      const button = document.querySelector("[data-open-modal='batchPrintDownloadModal']");
      return Boolean(button) && button.disabled === false && button.textContent.includes("일괄 다운로드(1명)");
    });
    await page.click("[data-open-modal='batchPrintDownloadModal']");
    await page.waitForFunction(() => !document.getElementById("batchPrintDownloadModal").classList.contains("hidden"));
    const batchPrintMeta = await page.$eval("#batchPrintDownloadSelectionMeta", (element) => element.textContent || "");
    assert(batchPrintMeta.includes("1명"), "Batch print modal did not show the selected examinee count.");
    await page.click("#batchPrintDownloadModal .ghost-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#batchPrintDownloadModal");
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

    console.log("STEP 7/15: Print history page");
    await navigateToView(page, "printHistory", "/print-history");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);

    console.log("STEP 8/15: Template management");
    await navigateToView(page, "templateManagement", "/templates");
    const templateCountBefore = await page.$$eval(".template-card", (cards) => cards.length);
    await page.click("[data-add-template='true']");
    await page.waitForFunction((countBefore) => document.querySelectorAll(".template-card").length === countBefore + 1, {}, templateCountBefore);
    const createdTemplateId = await page.$$eval(".template-card", (cards) => cards[cards.length - 1]?.dataset.templateId || "");
    assert(createdTemplateId, "New template card was not created.");
    await waitForVisible(page, `[data-template-preview="${createdTemplateId}"]`);
    await page.evaluate((templateId) => {
      const trigger = document.querySelector(`[data-template-preview="${templateId}"]`);

      if (!(trigger instanceof HTMLButtonElement)) {
        throw new Error("Template preview button was not found.");
      }

      trigger.click();
    }, createdTemplateId);
    await page.waitForFunction(() => !document.getElementById("templatePreviewModal").classList.contains("hidden"));
    await page.waitForFunction(() => {
      const stage = document.getElementById("templatePreviewStage");
      return Boolean(stage) && stage.innerHTML.trim().length > 0;
    });
    await page.click("#templatePreviewModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#templatePreviewModal");
    await waitForVisible(page, `[data-template-edit="${createdTemplateId}"]`);
    await page.evaluate((templateId) => {
      const trigger = document.querySelector(`[data-template-edit="${templateId}"]`);

      if (!(trigger instanceof HTMLButtonElement)) {
        throw new Error("Template edit button was not found.");
      }

      trigger.click();
    }, createdTemplateId);
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
    await waitForVisible(page, `[data-template-edit="${createdTemplateId}"]`);

    console.log("STEP 9/15: System settings, super admin, and accounts");
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
    await page.type("#accountCreateId", "smoke-super");
    await page.type("#accountCreateName", "스모크슈퍼");
    await page.select("#accountCreateRole", "슈퍼관리자");
    await page.click("button[data-account-create-submit='true']");
    await page.waitForFunction(() => document.body.innerText.includes("smoke-super"));

    await page.click("[data-auth-logout='true']");
    await waitForPath(page, "/login");
    await waitForVisible(page, "#loginForm");
    await page.type("#loginAccountId", "smoke-super");
    await page.type("#loginPassword", "2222");
    await page.click("button[data-auth-login='true']");
    await page.waitForFunction(() => !document.getElementById("passwordSetupModal").classList.contains("hidden"));
    await typeIntoField(page, "#passwordSetupNext", "SmokeSuper1234");
    await typeIntoField(page, "#passwordSetupConfirm", "SmokeSuper1234");
    await page.click("button[data-password-setup-submit='true']");
    await waitForPath(page, "/dashboard");
    currentSessionPassword = "SmokeSuper1234";
    await page.waitForFunction(() => {
      const navigationItem = document.querySelector('.nav-item[data-view="superAdminManagement"]');
      return Boolean(navigationItem) && !navigationItem.classList.contains("hidden");
    });

    await navigateToView(page, "superAdminManagement", "/super-admin");
    await waitForVisible(page, "#superAdminSchoolName");
    await typeIntoField(page, "#superAdminSchoolName", "스모크예술학교");
    await page.click("[data-super-admin-action='save']");
    await page.waitForFunction(() => {
      const status = document.getElementById("superAdminStatus");
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
    await waitForDialogMessageCount(dialogMessages, dialogCountBeforeReset + 1);
    assert(dialogMessages.some((message) => message.includes("2222")), "Reset password dialog did not mention the saved initial password.");
    await page.click("[data-account-delete='smoke-user']");
    await page.waitForFunction(() => !document.body.innerText.includes("smoke-user"));

    console.log("STEP 10/15: Applicant admin views and upload modals");
    const applicantRecruitmentUploadWorkbook = await createApplicantRecruitmentWorkbookFile(workspacePath, "applicant-recruitment-ui.xlsx", [
      {
        trackName: "테스트모집",
        admissionCode: "TSU",
        admissionName: "테스트전형",
        seriesCode: "TAR",
        seriesName: "테스트계열",
        unitCode: "TUN",
        unitName: "테스트모집단위",
        majorCode: "TMJ",
        majorName: "테스트전공",
      },
    ]);
    const applicantAssignmentUploadWorkbook = await createAssignmentWorkbookFile(workspacePath, "applicant-assignment-ui.xlsx", [
      {
        track: "테스트모집",
        admission: "테스트전형",
        series: "테스트계열",
        unit: "테스트모집단위",
        major: "테스트전공",
        date: "2026-06-01",
        time: "14:00",
        buildingCode: "TB1",
        building: "테스트관",
        roomCode: "TR1",
        room: "T101",
        assignedCount: 2,
      },
    ]);
    await navigateToView(page, "applicantRecruitmentManagement", "/applicant-recruitment-management");
    await waitForVisible(page, "[data-applicant-recruitment-add='true']");
    await page.click("[data-applicant-recruitment-add='true']");
    await page.waitForFunction(() => !document.getElementById("applicantRecruitmentUnitModal").classList.contains("hidden"));
    await page.click("#applicantRecruitmentUnitModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#applicantRecruitmentUnitModal");
    await page.click("[data-open-modal='applicantUnitUploadModal']");
    await page.waitForFunction(() => !document.getElementById("applicantUnitUploadModal").classList.contains("hidden"));
    await page.waitForFunction(() => document.getElementById("applicantUnitUploadExecuteButton")?.disabled === true);
    const applicantRecruitmentUploadInput = await page.$("#applicantUnitUploadFileInput");
    await applicantRecruitmentUploadInput.uploadFile(applicantRecruitmentUploadWorkbook.filePath);
    await page.waitForFunction(() => {
      const previewMount = document.getElementById("applicantUnitUploadPreviewMount");
      const executeButton = document.getElementById("applicantUnitUploadExecuteButton");
      return Boolean(previewMount) && previewMount.innerText.includes("업로드 행") && executeButton?.disabled === false;
    });
    await page.click("#applicantUnitUploadExecuteButton");
    await waitForHiddenClass(page, "#applicantUnitUploadModal");
    await page.waitForFunction(() => document.body.innerText.includes("테스트모집단위"));
    await navigateToView(page, "applicantQuestionTemplateManagement", "/applicant-question-template-management");
    await waitForVisible(page, "[data-applicant-field-add='true']");
    await page.click("[data-applicant-field-add='true']");
    await page.waitForFunction(() => {
      const editorPanel = document.querySelector(".applicant-field-editor-panel");
      return Boolean(editorPanel) && !editorPanel.classList.contains("is-disabled");
    });
    await navigateToView(page, "applicantScheduleManagement", "/applicant-schedules");
    await waitForVisible(page, ".table-card.applicant-admin-grid-card");
    await page.click("tr[data-grid-row-clickable='true']");
    await page.waitForFunction(() => !document.getElementById("applicantScheduleModal").classList.contains("hidden"));
    await page.click("#applicantScheduleModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#applicantScheduleModal");
    await navigateToView(page, "applicantAssignmentManagement", "/applicant-assignments");
    await waitForVisible(page, "[data-open-modal='applicantAssignmentUploadModal']");
    await page.click("[data-open-modal='applicantAssignmentUploadModal']");
    await page.waitForFunction(() => !document.getElementById("applicantAssignmentUploadModal").classList.contains("hidden"));
    await page.waitForFunction(() => document.getElementById("applicantAssignmentUploadExecuteButton")?.disabled === true);
    const applicantAssignmentUploadInput = await page.$("#applicantAssignmentUploadFileInput");
    await applicantAssignmentUploadInput.uploadFile(applicantAssignmentUploadWorkbook.filePath);
    await page.waitForFunction(() => {
      const previewMount = document.getElementById("applicantAssignmentUploadPreviewMount");
      const executeButton = document.getElementById("applicantAssignmentUploadExecuteButton");
      return Boolean(previewMount) && previewMount.innerText.includes("업로드 행") && executeButton?.disabled === false;
    });
    await page.click("#applicantAssignmentUploadExecuteButton");
    await waitForHiddenClass(page, "#applicantAssignmentUploadModal");
    await page.waitForFunction(() => document.body.innerText.includes("T101"));

    console.log("STEP 11/15: Applicant promotion workflow");
    const applicantRecruitmentUnit = {
      trackName: "수시",
      admissionCode: "SU",
      admissionName: "수시",
      seriesCode: "ART",
      seriesName: "예체능",
      unitCode: "MUS",
      unitName: "실용음악과",
      majorCode: "PNO",
      majorName: "피아노",
    };
    const applicantSelectionAnswers = {
      track: applicantRecruitmentUnit.trackName,
      admission: applicantRecruitmentUnit.admissionName,
      series: applicantRecruitmentUnit.seriesName,
      unit: applicantRecruitmentUnit.unitName,
      major: applicantRecruitmentUnit.majorName,
    };
    const scheduleReferenceDate = new Date();
    const applicantScheduleStartAt = formatScheduleDateTime(new Date(scheduleReferenceDate.getTime() - 5 * 60 * 1000));
    const applicantScheduleEndAtOpen = formatScheduleDateTime(new Date(scheduleReferenceDate.getTime() + 30 * 60 * 1000));
    const applicantScheduleEndAtClosed = formatScheduleDateTime(new Date(scheduleReferenceDate.getTime() - 2 * 60 * 1000));

    await insertApplicantRecruitmentUnit(databasePool, applicantRecruitmentUnit);
    await upsertApplicantSchedule(databasePool, {
      trackName: applicantRecruitmentUnit.trackName,
      admissionCode: applicantRecruitmentUnit.admissionCode,
      admissionName: applicantRecruitmentUnit.admissionName,
      applicantScheduleStartAt,
      applicantScheduleEndAt: applicantScheduleEndAtOpen,
      admitCardLookupScheduleStartAt: applicantScheduleStartAt,
      admitCardLookupScheduleEndAt: applicantScheduleEndAtOpen,
    });

    const applicantFormPayload = await fetchJson(baseUrl, "/api/public/applicant-form");
    assert(applicantFormPayload.ok, "Applicant public form did not load.");
    assert(
      Array.isArray(applicantFormPayload.payload?.recruitmentUnits) &&
        applicantFormPayload.payload.recruitmentUnits.some((unit) => unit.unitCode === applicantRecruitmentUnit.unitCode),
      "Applicant recruitment units were not exposed on the public form.",
    );
    const applicantFields = Array.isArray(applicantFormPayload.payload?.fields) ? applicantFormPayload.payload.fields : [];
    assert(applicantFields.length > 0, "Applicant public fields were not seeded.");
    const successSubmissionOne = await createApplicantSubmission(baseUrl, applicantFields, {
      name: "승격성공1",
      email: `promotion-success-1-${startTimestamp}@example.com`,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-02",
      building: "임시건물",
      room: "임시101",
    }, { databasePool });
    const successSubmissionTwo = await createApplicantSubmission(baseUrl, applicantFields, {
      name: "승격성공2",
      email: `promotion-success-2-${startTimestamp}@example.com`,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-03",
      building: "임시건물",
      room: "임시102",
    }, { databasePool });
    const rollbackSubmissionOne = await createApplicantSubmission(baseUrl, applicantFields, {
      name: "롤백대상",
      email: `promotion-rollback-1-${startTimestamp}@example.com`,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-04",
      building: "임시건물",
      room: "임시201",
    }, { databasePool });
    const rollbackSubmissionTwo = await createApplicantSubmission(baseUrl, applicantFields, {
      name: "롤백실패",
      email: `promotion-rollback-2-${startTimestamp}@example.com`,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-05",
      building: "임시건물",
      room: "임시202",
    }, { databasePool });
    const successSubmissionIds = [successSubmissionOne.id, successSubmissionTwo.id];
    const rollbackSubmissionIds = [rollbackSubmissionOne.id, rollbackSubmissionTwo.id];
    const successAssignmentRows = [
      {
        track: applicantRecruitmentUnit.trackName,
        admission: applicantRecruitmentUnit.admissionName,
        series: applicantRecruitmentUnit.seriesName,
        unit: applicantRecruitmentUnit.unitName,
        major: applicantRecruitmentUnit.majorName,
        date: "2026-05-10",
        time: "09:00",
        buildingCode: "B01",
        building: "예술관",
        roomCode: "R101",
        room: "101",
        assignedCount: 1,
      },
      {
        track: applicantRecruitmentUnit.trackName,
        admission: applicantRecruitmentUnit.admissionName,
        series: applicantRecruitmentUnit.seriesName,
        unit: applicantRecruitmentUnit.unitName,
        major: applicantRecruitmentUnit.majorName,
        date: "2026-05-10",
        time: "09:00",
        buildingCode: "B01",
        building: "예술관",
        roomCode: "R102",
        room: "102",
        assignedCount: 1,
      },
    ];
    const successAssignmentWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-success.xlsx", successAssignmentRows);
    const invalidBuildingWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-invalid-building.xlsx", [
      {
        ...successAssignmentRows[0],
        roomCode: "RB201",
        room: "201",
      },
      {
        ...successAssignmentRows[1],
        time: "10:00",
        buildingCode: "B01",
        building: "음악관",
        roomCode: "RB202",
        room: "202",
      },
    ]);
    const invalidRoomWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-invalid-room.xlsx", [
      {
        ...successAssignmentRows[0],
        roomCode: "RM901",
        room: "901",
      },
      {
        ...successAssignmentRows[1],
        time: "10:00",
        roomCode: "RM901",
        room: "902",
      },
    ]);
    const insufficientWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-insufficient.xlsx", [
      {
        ...successAssignmentRows[0],
      },
    ]);
    const overflowWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-overflow.xlsx", [
      {
        ...successAssignmentRows[0],
        assignedCount: 3,
      },
    ]);
    const rollbackWorkbook = await createAssignmentWorkbookFile(workspacePath, "promotion-rollback.xlsx", [
      {
        track: applicantRecruitmentUnit.trackName,
        admission: applicantRecruitmentUnit.admissionName,
        series: applicantRecruitmentUnit.seriesName,
        unit: applicantRecruitmentUnit.unitName,
        major: applicantRecruitmentUnit.majorName,
        date: "2026-05-11",
        time: "10:00",
        buildingCode: "B02",
        building: "공연관",
        roomCode: "R201",
        room: "201",
        assignedCount: 2,
      },
    ]);

    await page.reload({ waitUntil: "networkidle0" });
    await navigateToView(page, "applicantHistory", "/applicant-history");
    await page.waitForFunction(
      (firstId, secondId) =>
        Boolean(document.querySelector(`[data-grid-select-row="${firstId}"]`)) &&
        Boolean(document.querySelector(`[data-grid-select-row="${secondId}"]`)),
      {},
      successSubmissionOne.id,
      successSubmissionTwo.id,
    );
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionOne.id);
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionTwo.id, { shiftKey: true });
    assert((await getSelectedGridRowCount(page, "applicantHistoryGrid")) === 2, "Applicant history row click selection did not select the expected range.");
    const promotionButtonWhileOpen = await page.$eval("[data-applicant-submission-promotion-open='true']", (button) => ({
      disabled: button.disabled,
      title: button.getAttribute("title") || "",
    }));
    assert(
      promotionButtonWhileOpen.disabled &&
        (promotionButtonWhileOpen.title.includes("접수기간 중") || promotionButtonWhileOpen.title.includes("접수기간 종료 후")),
      "Applicant promotion button was not disabled during the applicant schedule.",
    );

    const openTemplateResult = await fetchBinaryBase64InPage(page, "/api/applicant-assignments/template.xlsx", {
      method: "GET",
    });
    assert(
      openTemplateResult.ok &&
        openTemplateResult.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
        openTemplateResult.length > 0,
      "Applicant assignment management template route was not available during the applicant schedule.",
    );
    const openImportResult = await fetchJsonInPage(page, "/api/applicant-assignments/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileContentBase64: successAssignmentWorkbook.base64,
      }),
    });
    assert(
      openImportResult.ok && Number(openImportResult.payload?.processed || 0) === 2,
      "Applicant assignment management import did not work during the applicant schedule.",
    );
    const openPreviewResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: successSubmissionIds,
        allowMissingPhoto: false,
      }),
    });
    assert(!openPreviewResult.ok && openPreviewResult.status === 409, "Applicant promotion preview route was not blocked during the applicant schedule.");
    const openCommitResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: successSubmissionIds,
        allowMissingPhoto: false,
      }),
    });
    assert(!openCommitResult.ok && openCommitResult.status === 409, "Applicant promotion commit route was not blocked during the applicant schedule.");

    await upsertApplicantSchedule(databasePool, {
      trackName: applicantRecruitmentUnit.trackName,
      admissionCode: applicantRecruitmentUnit.admissionCode,
      admissionName: applicantRecruitmentUnit.admissionName,
      applicantScheduleStartAt,
      applicantScheduleEndAt: applicantScheduleEndAtClosed,
      admitCardLookupScheduleStartAt: applicantScheduleStartAt,
      admitCardLookupScheduleEndAt: applicantScheduleEndAtOpen,
    });
    await page.reload({ waitUntil: "networkidle0" });
    await navigateToView(page, "applicantHistory", "/applicant-history");
    await page.waitForFunction(
      (firstId, secondId) =>
        Boolean(document.querySelector(`[data-grid-select-row="${firstId}"]`)) &&
        Boolean(document.querySelector(`[data-grid-select-row="${secondId}"]`)),
      {},
      successSubmissionOne.id,
      successSubmissionTwo.id,
    );
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionOne.id);
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionTwo.id, { shiftKey: true });
    const promotionButtonAfterClose = await page.$eval("[data-applicant-submission-promotion-open='true']", (button) => ({
      disabled: button.disabled,
      text: button.textContent || "",
    }));
    assert(
      promotionButtonAfterClose.disabled !== true && promotionButtonAfterClose.text.includes("2"),
      "Applicant promotion button did not enable after the applicant schedule ended.",
    );
    await page.click("[data-applicant-submission-promotion-open='true']");
    await page.waitForFunction(() => !document.getElementById("applicantPromotionModal").classList.contains("hidden"));
    const promotionModalMeta = await page.$eval("#applicantPromotionSelectionMeta", (element) => element.textContent || "");
    assert(promotionModalMeta.includes("2건"), "Applicant promotion modal did not show the selected submission count.");
    await page.click("#applicantPromotionModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#applicantPromotionModal");

    await navigateToView(page, "applicantAssignmentManagement", "/applicant-assignments");
    await waitForVisible(page, "[data-open-modal='applicantAssignmentUploadModal']");
    const assignmentTemplateResult = await fetchBinaryBase64InPage(page, "/api/applicant-assignments/export.xlsx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: successAssignmentRows,
      }),
    });
    assert(
      assignmentTemplateResult.ok &&
        assignmentTemplateResult.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
        assignmentTemplateResult.length > 0,
      "Applicant assignment management export failed after the applicant schedule closed.",
    );
    const assignmentTemplateWorkbook = new ExcelJS.Workbook();
    await assignmentTemplateWorkbook.xlsx.load(Buffer.from(assignmentTemplateResult.base64, "base64"));
    const assignmentSheetNames = assignmentTemplateWorkbook.worksheets.map((worksheet) => worksheet.name);
    assert(
      assignmentSheetNames.includes("배정표"),
      "Applicant assignment workbook did not contain the assignment worksheet.",
    );
    const assignmentSheet = assignmentTemplateWorkbook.getWorksheet("배정표");
    const assignmentHeaders = applicantAssignmentColumns.map((column, index) => assignmentSheet.getRow(1).getCell(index + 1).text);
    assert(
      assignmentHeaders.includes("고사건물코드") && assignmentHeaders.includes("고사실코드") && assignmentHeaders.includes("배정인원"),
      "Applicant assignment workbook headers did not contain the expected code columns.",
    );
    await navigateToView(page, "applicantHistory", "/applicant-history");
    await page.waitForFunction(
      (firstId, secondId) =>
        Boolean(document.querySelector(`[data-grid-select-row="${firstId}"]`)) &&
        Boolean(document.querySelector(`[data-grid-select-row="${secondId}"]`)),
      {},
      successSubmissionOne.id,
      successSubmissionTwo.id,
    );
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionOne.id);
    await clickGridRow(page, "applicantHistoryGrid", successSubmissionTwo.id, { shiftKey: true });

    const promotionPreviewResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: successSubmissionIds,
        allowMissingPhoto: false,
      }),
    });
    assert(promotionPreviewResult.ok, `Applicant promotion preview failed: ${JSON.stringify(promotionPreviewResult.payload)}`);
    assert(
      Number(promotionPreviewResult.payload?.summary?.missingPhotoCount || 0) === 2 &&
        promotionPreviewResult.payload?.summary?.canCommit !== true &&
        Array.isArray(promotionPreviewResult.payload?.rows) &&
        promotionPreviewResult.payload.rows.some((row) => row.status === "warning" && row.photoStatusLabel === "미등록"),
      "Applicant promotion preview did not expose the missing-photo warning state.",
    );
    const promotionPreviewExport = await fetchBinaryBase64InPage(page, "/api/applicant-submissions/promotions/preview.xlsx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: promotionPreviewResult.payload.rows,
        summary: promotionPreviewResult.payload.summary,
      }),
    });
    assert(
      promotionPreviewExport.ok &&
        promotionPreviewExport.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
        promotionPreviewExport.length > 0,
      "Applicant promotion preview workbook download failed.",
    );
    const promotionPreviewWorkbook = new ExcelJS.Workbook();
    await promotionPreviewWorkbook.xlsx.load(Buffer.from(promotionPreviewExport.base64, "base64"));
    const promotionPreviewSheets = promotionPreviewWorkbook.worksheets.map((worksheet) => worksheet.name);
    assert(
      promotionPreviewSheets.includes("배정결과") && promotionPreviewSheets.includes("요약"),
      "Applicant promotion preview workbook did not contain the expected worksheets.",
    );
    const blockedCommitResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: successSubmissionIds,
        allowMissingPhoto: false,
      }),
    });
    assert(
      !blockedCommitResult.ok &&
        blockedCommitResult.status === 409 &&
        String(blockedCommitResult.payload?.error || "").includes("사진 미등록"),
      "Applicant promotion commit did not block missing-photo submissions when allowMissingPhoto was false.",
    );

    await page.click("[data-applicant-submission-promotion-open='true']");
    await page.waitForFunction(() => !document.getElementById("applicantPromotionModal").classList.contains("hidden"));
    const promotionAssignmentInfo = await page.$eval("#applicantPromotionAssignmentInfo", (element) => element.textContent || "");
    assert(String(promotionAssignmentInfo || "").trim().length > 0, "Applicant promotion modal did not render the assignment summary block.");
    const promotionDefaults = await page.evaluate(() => ({
      sortField1: document.getElementById("applicantPromotionSortField1")?.value || "",
      sortField2: document.getElementById("applicantPromotionSortField2")?.value || "",
      sortField3: document.getElementById("applicantPromotionSortField3")?.value || "",
      breakField: document.getElementById("applicantPromotionBreakField")?.value || "",
    }));
    assert(
      promotionDefaults.sortField1 === "examineeNo" &&
        promotionDefaults.sortField2 === "" &&
        promotionDefaults.sortField3 === "" &&
        promotionDefaults.breakField === "unit",
      "Applicant promotion modal did not apply the expected default assignment settings.",
    );
    await page.click("#applicantPromotionModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#applicantPromotionModal");
    const successfulCommitResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: successSubmissionIds,
        allowMissingPhoto: true,
      }),
    });
    assert(successfulCommitResult.ok, `Applicant promotion commit failed: ${JSON.stringify(successfulCommitResult.payload)}`);
    await waitForCondition(async () => {
      const [statusRows] = await databasePool.query(
        `
          SELECT id, status
          FROM app_subm
          WHERE id IN (?, ?)
          GROUP BY id, status
        `,
        successSubmissionIds,
      );
      return statusRows.length === 2 && statusRows.every((row) => row.status === "promoted");
    }, {
      timeoutMs: 30000,
      intervalMs: 250,
      errorMessage: "Applicant promotion commit did not promote the selected submissions in the database.",
    });

    const [promotedStatusRows] = await databasePool.query(
      `
        SELECT id, status
        FROM app_subm
        WHERE id IN (?, ?)
        GROUP BY id, status
      `,
      successSubmissionIds,
    );
    assert(
      promotedStatusRows.length === 2 && promotedStatusRows.every((row) => row.status === "promoted"),
      "Applicant promotion commit did not update app_subm status for every selected submission.",
    );
    const [promotedExamineeRows] = await databasePool.query(
      `
        SELECT
          name,
          admission_code AS admissionCode,
          series_code AS seriesCode,
          unit_code AS unitCode,
          major_code AS majorCode,
          building_code AS buildingCode,
          room_code AS roomCode
        FROM examinee
        WHERE name IN (?, ?)
        ORDER BY name
      `,
      [successSubmissionOne.name, successSubmissionTwo.name],
    );
    assert(promotedExamineeRows.length === 2, "Applicant promotion commit did not create examinee rows for every selected submission.");
    assert(
      promotedExamineeRows.every(
        (row) =>
          row.admissionCode === applicantRecruitmentUnit.admissionCode &&
          row.seriesCode === applicantRecruitmentUnit.seriesCode &&
          row.unitCode === applicantRecruitmentUnit.unitCode &&
          row.majorCode === applicantRecruitmentUnit.majorCode &&
          row.buildingCode === "B01" &&
          ["R101", "R102"].includes(row.roomCode),
      ),
      "Applicant promotion commit did not persist the expected code columns into examinee rows.",
    );
    const [promotionMetaRows] = await databasePool.query(
      `
        SELECT
          id,
          promoted_examinee_no AS promotedExamineeNo,
          promoted_at AS promotedAt,
          promotion_override_json AS promotionOverrideJson
        FROM app_meta
        WHERE id IN (?, ?)
        ORDER BY id
      `,
      successSubmissionIds,
    );
    assert(
      promotionMetaRows.length === 2 &&
        promotionMetaRows.every(
          (row) =>
            String(row.promotedExamineeNo || "").trim() &&
            row.promotedAt &&
            String(row.promotionOverrideJson || "").includes("\"buildingCode\":\"B01\""),
        ),
      "Applicant promotion metadata was not stored consistently in app_meta.",
    );

    const bootstrapPayload = await fetchJsonInPage(page, "/api/bootstrap");
    assert(bootstrapPayload.ok && Array.isArray(bootstrapPayload.payload?.examinees), "Bootstrap payload did not return examinee rows after promotion.");
    const examineeExportResult = await fetchBinaryBase64InPage(page, "/api/examinees/export.xlsx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: bootstrapPayload.payload.examinees,
      }),
    });
    assert(
      examineeExportResult.ok &&
        examineeExportResult.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      "Examinee export workbook download failed after applicant promotion commit.",
    );
    const examineeExportWorkbook = new ExcelJS.Workbook();
    await examineeExportWorkbook.xlsx.load(Buffer.from(examineeExportResult.base64, "base64"));
    const examineeExportSheet = examineeExportWorkbook.worksheets[0];
    const examineeExportHeaders = Array.from({ length: examineeExportSheet.columnCount }, (_, index) =>
      examineeExportSheet.getRow(1).getCell(index + 1).text,
    );
    assert(
      ["전형코드", "계열코드", "모집단위코드", "전공코드", "고사건물코드", "고사실코드"].every((header) => examineeExportHeaders.includes(header)),
      "Examinee export workbook did not include the new code columns.",
    );
    const reopenedApplicantScheduleEndAt = formatScheduleDateTime(new Date(Date.now() + 30 * 60 * 1000));
    await upsertApplicantSchedule(databasePool, {
      trackName: applicantRecruitmentUnit.trackName,
      admissionCode: applicantRecruitmentUnit.admissionCode,
      admissionName: applicantRecruitmentUnit.admissionName,
      applicantScheduleStartAt,
      applicantScheduleEndAt: reopenedApplicantScheduleEndAt,
      admitCardLookupScheduleStartAt: applicantScheduleStartAt,
      admitCardLookupScheduleEndAt: reopenedApplicantScheduleEndAt,
    });
    const rollbackResubmissionOne = await createApplicantSubmission(baseUrl, applicantFields, {
      name: rollbackSubmissionOne.name,
      email: rollbackSubmissionOne.email,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-04",
      building: "임시건물",
      room: "임시201",
    }, { databasePool });
    const rollbackResubmissionTwo = await createApplicantSubmission(baseUrl, applicantFields, {
      name: rollbackSubmissionTwo.name,
      email: rollbackSubmissionTwo.email,
      password: "Promote1234!",
      selectionAnswers: applicantSelectionAnswers,
      track: "수시",
      date: "2026-05-01",
      time: "09:00",
      birth: "2006-01-05",
      building: "임시건물",
      room: "임시202",
    }, { databasePool });
    const rollbackCandidateIds = [rollbackResubmissionOne.id, rollbackResubmissionTwo.id];
    assert(
      rollbackCandidateIds.every((candidateId) => rollbackSubmissionIds.includes(candidateId)),
      "Applicant rollback submissions were recreated under unexpected submission IDs.",
    );
    await upsertApplicantSchedule(databasePool, {
      trackName: applicantRecruitmentUnit.trackName,
      admissionCode: applicantRecruitmentUnit.admissionCode,
      admissionName: applicantRecruitmentUnit.admissionName,
      applicantScheduleStartAt,
      applicantScheduleEndAt: applicantScheduleEndAtClosed,
      admitCardLookupScheduleStartAt: applicantScheduleStartAt,
      admitCardLookupScheduleEndAt: reopenedApplicantScheduleEndAt,
    });
    await databasePool.query(`DROP TRIGGER IF EXISTS smoke_examinee_insert_fail`);
    await databasePool.query(`
      CREATE TRIGGER smoke_examinee_insert_fail
      BEFORE INSERT ON examinee
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'smoke rollback trigger'
    `);
    const rollbackAssignmentImport = await fetchJsonInPage(page, "/api/applicant-assignments/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileContentBase64: rollbackWorkbook.base64,
      }),
    });
    assert(rollbackAssignmentImport.ok, "Applicant rollback assignment workbook import failed.");
    const rollbackCommitResult = await fetchJsonInPage(page, "/api/applicant-submissions/promotions/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionIds: rollbackCandidateIds,
        allowMissingPhoto: true,
      }),
    });
    assert(
      !rollbackCommitResult.ok && rollbackCommitResult.status >= 500,
      "Applicant promotion rollback scenario did not surface the injected transaction failure.",
    );
    await databasePool.query(`DROP TRIGGER IF EXISTS smoke_examinee_insert_fail`);
    const [rollbackStatusRows] = await databasePool.query(
      `
        SELECT id, status
        FROM app_subm
        WHERE id IN (?, ?)
        GROUP BY id, status
      `,
      rollbackCandidateIds,
    );
    assert(
      rollbackStatusRows.length === 2 && rollbackStatusRows.every((row) => row.status === "submitted"),
      "Applicant promotion rollback scenario still changed submission status after a transaction failure.",
    );
    const [rollbackExamineeRows] = await databasePool.query(
      `
        SELECT name
        FROM examinee
        WHERE name IN (?, ?)
      `,
      [rollbackSubmissionOne.name, rollbackSubmissionTwo.name],
    );
    assert(rollbackExamineeRows.length === 0, "Applicant promotion rollback scenario still inserted examinee rows.");
    const [rollbackMetaRows] = await databasePool.query(
      `
        SELECT id, promoted_at AS promotedAt
        FROM app_meta
        WHERE id IN (?, ?)
        ORDER BY id
      `,
      rollbackCandidateIds,
    );
    assert(
      rollbackMetaRows.length === 2 && rollbackMetaRows.every((row) => row.promotedAt == null),
      "Applicant promotion rollback scenario still persisted promoted_at metadata.",
    );

    const [examineeCountRowsBeforeBackup] = await databasePool.query(`SELECT COUNT(*) AS totalCount FROM examinee`);
    const totalExamineeCountBeforeBackup = Number(examineeCountRowsBeforeBackup?.[0]?.totalCount || 0);

    console.log("STEP 12/15: System backup, restore, audit logs, and automation");
    await navigateToView(page, "systemBackupRestore", "/system-backup-restore");
    await waitForVisible(page, "[data-system-data-backup='export']");
    await setCheckboxValue(page, "[data-system-backup-asset-key='database']", true);
    await setCheckboxValue(page, "[data-system-backup-asset-key='examinee-photos']", true);
    await setCheckboxValue(page, "[data-system-backup-asset-key='applicant-photos']", false);
    await setCheckboxValue(page, "[data-system-backup-asset-key='applicant-files']", false);
    const manualBackupSelectionState = await page.evaluate(() => ({
      database: document.querySelector("[data-system-backup-asset-key='database']")?.checked === true,
      examineePhotos: document.querySelector("[data-system-backup-asset-key='examinee-photos']")?.checked === true,
      applicantPhotos: document.querySelector("[data-system-backup-asset-key='applicant-photos']")?.checked === true,
      applicantFiles: document.querySelector("[data-system-backup-asset-key='applicant-files']")?.checked === true,
    }));
    assert(
      manualBackupSelectionState.database &&
        manualBackupSelectionState.examineePhotos &&
        manualBackupSelectionState.applicantPhotos !== true &&
        manualBackupSelectionState.applicantFiles !== true,
      "Manual system backup asset selections did not apply the expected database/photo combination.",
    );

    if (!(await page.$eval("#systemBackupAutomationEnabled", (element) => element.checked === true))) {
      await page.click("label[for='systemBackupAutomationEnabled']");
    }

    await page.select("select[data-system-backup-automation-field='scheduleType']", "weekly");
    await page.waitForFunction(() => {
      const weeklyDayField = document.querySelector("select[data-system-backup-automation-field='weeklyDay']");
      return Boolean(weeklyDayField) && weeklyDayField.disabled !== true;
    });
    await page.select("select[data-system-backup-automation-field='weeklyDay']", "2");
    await setInputValue(page, "input[data-system-backup-automation-field='time']", "04:15");
    await setInputValue(page, "input[data-system-backup-automation-field='retentionCount']", "1");
    await setCheckboxValue(page, "[data-system-backup-automation-item-key='database']", true);
    await setCheckboxValue(page, "[data-system-backup-automation-item-key='examinee-photos']", true);
    await setCheckboxValue(page, "[data-system-backup-automation-item-key='applicant-photos']", false);
    await setCheckboxValue(page, "[data-system-backup-automation-item-key='applicant-files']", false);
    await page.waitForFunction(() => {
      const saveButton = document.querySelector("[data-system-backup-automation-action='save']");
      return Boolean(saveButton) && saveButton.disabled === false;
    });
    await page.click("[data-system-backup-automation-action='save']");
    await page.waitForFunction(() => {
      const status = document.getElementById("systemBackupAutomationStatus");
      return Boolean(status) && status.textContent.includes("자동 백업 설정을 저장했습니다.");
    });
    const automationRuntimeSummary = await page.evaluate(() => ({
      enabled: document.getElementById("systemBackupAutomationEnabled")?.checked === true,
      scheduleType: document.querySelector("select[data-system-backup-automation-field='scheduleType']")?.value || "",
      weeklyDay: document.querySelector("select[data-system-backup-automation-field='weeklyDay']")?.value || "",
      time: document.querySelector("input[data-system-backup-automation-field='time']")?.value || "",
      retentionCount: document.querySelector("input[data-system-backup-automation-field='retentionCount']")?.value || "",
    }));
    assert(
      automationRuntimeSummary.enabled &&
        automationRuntimeSummary.scheduleType === "weekly" &&
        automationRuntimeSummary.weeklyDay === "2" &&
        automationRuntimeSummary.time === "04:15" &&
        automationRuntimeSummary.retentionCount === "1",
      "Automatic system backup settings were not persisted with the expected values.",
    );

    await withQueuedDialogResponses(
      queuedDialogResponses,
      [
        {
          type: "confirm",
          messageIncludes: "현재 자동 백업 설정 기준으로 즉시 백업 ZIP을 생성합니다.",
        },
      ],
      async () => {
        await page.click("[data-system-backup-automation-action='run-now']");
        await page.waitForFunction(() => {
          const status = document.getElementById("systemBackupAutomationStatus");
          return Boolean(status) && status.textContent.includes("자동 백업 ZIP을 생성했습니다.");
        }, { timeout: 60000 });
      },
    );

    const sessionCookies = await page.cookies();
    const sessionCookieHeader = sessionCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const manualBackupResponse = await fetch(`${baseUrl}/api/system-backup/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookieHeader,
      },
      body: JSON.stringify({
        currentPassword: currentSessionPassword,
        includeDatabase: true,
        includedAssetKeys: ["examinee-photos"],
      }),
    });
    const manualBackupFileName = parseDownloadFileName(
      manualBackupResponse.headers.get("content-disposition"),
      "system-backup.zip",
    );
    if (!manualBackupResponse.ok) {
      throw new Error(`System backup export failed: ${await manualBackupResponse.text()}`);
    }
    const manualBackupArchivePath = path.join(downloadPath, manualBackupFileName);
    fs.mkdirSync(downloadPath, { recursive: true });
    fs.writeFileSync(manualBackupArchivePath, Buffer.from(await manualBackupResponse.arrayBuffer()));
    const manualBackupArchiveFileName = path.basename(manualBackupArchivePath);
    assert(/\.zip$/i.test(manualBackupArchiveFileName), "Manual system backup did not produce a ZIP download.");

    await navigateToView(page, "systemDataDeletion", "/system-data-deletion");
    await waitForVisible(page, "[data-system-data-delete='print-history']");
    const dataDeletionViewState = await page.evaluate(() => {
      const navViews = Array.from(document.querySelectorAll(".nav-item[data-view]"))
        .filter((item) => !item.classList.contains("hidden"))
        .map((item) => String(item.dataset.view || "").trim());
      const deleteFields = Array.from(document.querySelectorAll(".system-data-delete-form .field.system-settings-field")).map((field) => ({
        label: field.querySelector(".system-settings-label")?.textContent?.trim() || "",
        description: field.querySelector(".system-settings-help")?.textContent?.trim() || "",
      }));

      return {
        navViews,
        deleteFields,
      };
    });
    assert(
      dataDeletionViewState.navViews.indexOf("systemDataDeletion") === dataDeletionViewState.navViews.indexOf("systemSettings") + 1,
      "Data deletion menu item was not placed directly below system settings.",
    );
    const examineeDeleteFieldIndex = dataDeletionViewState.deleteFields.findIndex((field) => field.label === "수험생 데이터");
    const photoDeleteFieldIndex = dataDeletionViewState.deleteFields.findIndex((field) => field.label === "사진 데이터");
    assert(examineeDeleteFieldIndex >= 0, "Examinee deletion field did not render.");
    assert(photoDeleteFieldIndex >= 0, "Photo deletion field did not render.");
    assert(examineeDeleteFieldIndex < photoDeleteFieldIndex, "Examinee deletion field was not placed above photo deletion.");
    assert(
      dataDeletionViewState.deleteFields.some((field) => field.description === "수험생 데이터와 사진 파일을 삭제합니다."),
      "Examinee deletion description did not match the requested copy.",
    );
    await withQueuedDialogResponses(
      queuedDialogResponses,
      [
        {
          type: "confirm",
          messageIncludes: "수험표 출력 이력을 삭제하시겠습니까?",
        },
      ],
      async () => {
        await page.click("[data-system-data-delete='print-history']");
        await page.waitForFunction(() => {
          const status = document.getElementById("systemDataDeletionStatus");
          return Boolean(status) && status.textContent.includes("수험표 출력 이력");
        });
      },
    );
    await withQueuedDialogResponses(
      queuedDialogResponses,
      [
        {
          type: "confirm",
          messageIncludes: "수험생 데이터를 삭제하시겠습니까?",
        },
      ],
      async () => {
        await page.click("[data-system-data-delete='examinees']");
        await page.waitForFunction(() => {
          const status = document.getElementById("systemDataDeletionStatus");
          return Boolean(status) && status.textContent.includes("수험생 데이터");
        }, { timeout: 60000 });
      },
    );
    await navigateToView(page, "dashboard", "/dashboard");
    await waitForDashboardMetricValue(page, "registeredExamineeCount", "0명");

    await navigateToView(page, "systemBackupRestore", "/system-backup-restore");
    await waitForVisible(page, "#systemBackupRestoreFileInput");
    const restoreFileInput = await page.$("#systemBackupRestoreFileInput");
    await restoreFileInput.uploadFile(manualBackupArchivePath);
    await page.waitForFunction(() => {
      const validationMessage = document.querySelector(".system-backup-restore-validation");
      const importButton = document.querySelector("[data-system-backup-restore='import']");
      return (
        Boolean(validationMessage) &&
        validationMessage.textContent.includes("유효한 백업 ZIP입니다.") &&
        Boolean(importButton) &&
        importButton.disabled === false
      );
    }, { timeout: 60000 });
    const restoreSelectionAvailability = await page.evaluate(() => ({
      database: {
        disabled: document.querySelector("[data-system-backup-restore-item-key='database']")?.disabled === true,
        checked: document.querySelector("[data-system-backup-restore-item-key='database']")?.checked === true,
      },
      examineePhotos: {
        disabled: document.querySelector("[data-system-backup-restore-item-key='examinee-photos']")?.disabled === true,
        checked: document.querySelector("[data-system-backup-restore-item-key='examinee-photos']")?.checked === true,
      },
      applicantPhotos: {
        disabled: document.querySelector("[data-system-backup-restore-item-key='applicant-photos']")?.disabled === true,
        checked: document.querySelector("[data-system-backup-restore-item-key='applicant-photos']")?.checked === true,
      },
      applicantFiles: {
        disabled: document.querySelector("[data-system-backup-restore-item-key='applicant-files']")?.disabled === true,
        checked: document.querySelector("[data-system-backup-restore-item-key='applicant-files']")?.checked === true,
      },
    }));
    assert(
      restoreSelectionAvailability.database.disabled !== true &&
        restoreSelectionAvailability.database.checked === true &&
        restoreSelectionAvailability.examineePhotos.disabled !== true &&
        restoreSelectionAvailability.examineePhotos.checked === true &&
        restoreSelectionAvailability.applicantPhotos.disabled === true &&
        restoreSelectionAvailability.applicantFiles.disabled === true,
      "System backup restore selections did not reflect the included backup database/photo assets.",
    );

    await withQueuedDialogResponses(
      queuedDialogResponses,
      [
        {
          type: "confirm",
          messageIncludes: "선택한 복원 항목 기준으로 현재 운영 데이터와 업로드 파일을 교체합니다.",
        },
        {
          type: "prompt",
          messageIncludes: "시스템 백업을 복원하려면",
          promptText: currentSessionPassword,
        },
      ],
      async () => {
        await page.click("[data-system-backup-restore='import']");
        await page.waitForFunction(() => {
          const status = document.getElementById("systemBackupRestoreStatus");
          return Boolean(status) && status.textContent.includes("선택한 백업 항목을 복원했습니다.");
        }, { timeout: 60000 });
      },
    );
    await navigateToView(page, "dashboard", "/dashboard");
    await waitForDashboardMetricValue(page, "registeredExamineeCount", `${totalExamineeCountBeforeBackup}명`);
    await navigateToView(page, "printHistory", "/print-history");
    await page.waitForFunction((examineeNo) => document.body.innerText.includes(examineeNo), {}, artifacts.sampleExamineeNo);
    const restoredPhotoBinary = await fetchBinaryInPage(page, `/api/examinees/${artifacts.sampleExamineeNo}/photo`);
    assert(restoredPhotoBinary.ok && restoredPhotoBinary.length > 0, "System backup restore did not recover the examinee photo.");

    await navigateToView(page, "systemBackupRestore", "/system-backup-restore");
    await waitForVisible(page, "[data-system-audit-log-action='open']");
    await page.click("[data-system-audit-log-action='open']");
    await page.waitForFunction(() => !document.getElementById("systemAuditLogModal").classList.contains("hidden"));
    await page.waitForFunction(() => {
      const modalBody = document.getElementById("systemAuditLogModalBody");
      const modalText = modalBody?.innerText || "";
      return (
        modalText.includes("자동 백업 설정 저장") &&
        modalText.includes("자동 백업 실행") &&
        modalText.includes("백업 다운로드") &&
        modalText.includes("데이터 삭제") &&
        modalText.includes("백업 복원")
      );
    }, { timeout: 60000 });
    const auditLogModalText = await page.$eval("#systemAuditLogModalBody", (element) => element.innerText);
    assert(
      auditLogModalText.includes(manualBackupArchiveFileName) &&
        auditLogModalText.includes("선택 항목") &&
        auditLogModalText.includes("복원 파일"),
      "System audit log modal did not expose the backup/restore detail summary.",
    );
    const auditLogScrollState = await page.evaluate(() => {
      const modalBody = document.getElementById("systemAuditLogModalBody");

      if (!modalBody) {
        return null;
      }

      modalBody.style.height = "160px";
      modalBody.style.maxHeight = "160px";
      modalBody.scrollTop = modalBody.scrollHeight;

      return {
        clientHeight: modalBody.clientHeight,
        scrollHeight: modalBody.scrollHeight,
        scrollTop: modalBody.scrollTop,
      };
    });
    assert(
      auditLogScrollState &&
        auditLogScrollState.scrollHeight > auditLogScrollState.clientHeight &&
        auditLogScrollState.scrollTop > 0,
      "System audit log modal body did not allow scrolling through the recorded entries.",
    );
    await page.click("#systemAuditLogModal .icon-button[data-close-modal='true']");
    await waitForHiddenClass(page, "#systemAuditLogModal");

    console.log("STEP 13/15: Login notice settings");
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

    console.log("STEP 14/15: Logout and final login notice check");
    await page.click("[data-auth-logout='true']");
    await waitForPath(page, "/login");
    await waitForVisible(page, "#loginForm");
    const loginPageText = await page.$eval("#viewRoot", (element) => element.innerText);
    assert(loginPageText.includes(updatedNoticeText), "Updated login notice was not visible after logout.");

    console.log("STEP 15/15: Public applicant pages");
    await page.goto(`${baseUrl}/applicant`, { waitUntil: "networkidle0" });
    await waitForPath(page, "/applicant");
    await waitForVisible(page, "[data-applicant-action='go-verify']");
    await page.goto(`${baseUrl}/applicant/lookup`, { waitUntil: "networkidle0" });
    await waitForPath(page, "/applicant/lookup");
    await waitForVisible(page, "#lookupName");
    await waitForVisible(page, "#lookupEmail");

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

    if (fs.existsSync(systemAutoBackupDirectoryPath)) {
      const knownSystemAutoBackupFileNames = new Set(preexistingSystemAutoBackupFileNames);

      for (const fileName of fs.readdirSync(systemAutoBackupDirectoryPath)) {
        if (knownSystemAutoBackupFileNames.has(fileName)) {
          continue;
        }

        try {
          fs.rmSync(path.join(systemAutoBackupDirectoryPath, fileName), { recursive: true, force: true });
        } catch (error) {
        }
      }

      if (!systemAutoBackupDirectoryExistedBefore) {
        try {
          const remainingEntries = fs.readdirSync(systemAutoBackupDirectoryPath);

          if (remainingEntries.length === 0) {
            fs.rmSync(systemAutoBackupDirectoryPath, { recursive: true, force: true });
          }
        } catch (error) {
        }
      }
    }

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
