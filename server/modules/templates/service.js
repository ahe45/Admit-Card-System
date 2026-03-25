const { randomUUID } = require("crypto");

const { createTemplateRenderingService } = require("./rendering");

function createTemplateService({
  createHttpError,
  escapeHtml,
  formatDateAsYmd,
  getPool,
  query,
  templateTagDefinitions,
}) {
  const templateRenderingService = createTemplateRenderingService({
    createHttpError,
    escapeHtml,
    formatDateAsYmd,
    templateTagDefinitions,
  });
  const { buildTemplateGeneratedObjectSvg, renderTemplateWithExaminee } = templateRenderingService;

  function normalizeTemplatePayload(payload, existingTemplate = {}) {
    const name = String(payload.name ?? existingTemplate.name ?? "").trim();
    const description = String(payload.description ?? existingTemplate.description ?? "").trim();
    const version = String(payload.version ?? existingTemplate.version ?? "").trim();
    const status = payload.status ?? existingTemplate.status ?? "unused";
    const contentHtml = String(payload.contentHtml ?? existingTemplate.contentHtml ?? "");

    if (!name) {
      throw createHttpError(400, "양식 이름이 필요합니다.");
    }

    if (!version) {
      throw createHttpError(400, "양식 버전이 필요합니다.");
    }

    if (!["used", "unused"].includes(status)) {
      throw createHttpError(400, "양식 상태는 used 또는 unused 여야 합니다.");
    }

    if (!contentHtml.trim()) {
      throw createHttpError(400, "양식 HTML 내용이 비어 있습니다.");
    }

    return {
      id: existingTemplate.id || `template-${randomUUID()}`,
      name,
      description,
      version,
      status,
      contentHtml,
    };
  }

  async function getTemplates() {
    return query(`
      SELECT
        id,
        name,
        description,
        version_label AS version,
        status,
        content_html AS contentHtml
      FROM templates
      ORDER BY created_at ASC, updated_at ASC
    `);
  }

  async function getTemplatesById(templateId) {
    return query(
      `
        SELECT
          id,
          name,
          description,
          version_label AS version,
          status,
          content_html AS contentHtml
        FROM templates
        WHERE id = ?
      `,
      [templateId],
    );
  }

  async function createTemplate(payload) {
    const template = normalizeTemplatePayload(payload);

    await query(
      `
        INSERT INTO templates (id, name, description, version_label, status, content_html)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [template.id, template.name, template.description, template.version, template.status, template.contentHtml],
    );

    return template;
  }

  async function updateTemplate(templateId, payload) {
    const [existingTemplate] = await getTemplatesById(templateId);

    if (!existingTemplate) {
      throw createHttpError(404, "수정할 양식을 찾을 수 없습니다.");
    }

    const template = normalizeTemplatePayload(payload, existingTemplate);

    await query(
      `
        UPDATE templates
        SET
          name = ?,
          description = ?,
          version_label = ?,
          status = ?,
          content_html = ?
        WHERE id = ?
      `,
      [template.name, template.description, template.version, template.status, template.contentHtml, templateId],
    );

    return template;
  }

  async function activateTemplate(templateId) {
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const [templateRows] = await connection.query(`SELECT id FROM templates WHERE id = ?`, [templateId]);

      if (templateRows.length === 0) {
        throw createHttpError(404, "적용할 양식을 찾을 수 없습니다.");
      }

      await connection.query(`UPDATE templates SET status = 'unused'`);
      await connection.query(`UPDATE templates SET status = 'used' WHERE id = ?`, [templateId]);

      await connection.commit();

      return getTemplates();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function deleteTemplate(templateId) {
    const [existingTemplate] = await getTemplatesById(templateId);

    if (!existingTemplate) {
      throw createHttpError(404, "삭제할 양식을 찾을 수 없습니다.");
    }

    if (existingTemplate.status === "used") {
      throw createHttpError(409, "사용 중인 양식은 삭제할 수 없습니다.");
    }

    await query(`DELETE FROM templates WHERE id = ?`, [templateId]);
    return { id: templateId };
  }

  async function getActiveTemplate() {
    const [template] = await query(`
      SELECT
        id,
        name,
        description,
        version_label AS version,
        status,
        content_html AS contentHtml
      FROM templates
      WHERE status = 'used'
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (!template) {
      throw createHttpError(404, "사용중인 수험표 양식을 찾을 수 없습니다.");
    }

    return template;
  }

  return Object.freeze({
    activateTemplate,
    buildTemplateGeneratedObjectSvg,
    createTemplate,
    deleteTemplate,
    getActiveTemplate,
    getTemplates,
    normalizeTemplatePayload,
    renderTemplateWithExaminee,
    updateTemplate,
  });
}

module.exports = {
  createTemplateService,
};
