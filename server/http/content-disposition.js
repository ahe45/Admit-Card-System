function escapeHeaderFilename(fileName) {
  return String(fileName || "download")
    .replaceAll("\\", "_")
    .replaceAll('"', "")
    .replaceAll("\r", "")
    .replaceAll("\n", "");
}

function createAsciiHeaderFilename(fileName) {
  const safeFileName = escapeHeaderFilename(fileName);
  const extensionMatch = safeFileName.match(/(\.[A-Za-z0-9]{1,16})$/);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const baseName = extension ? safeFileName.slice(0, -extension.length) : safeFileName;
  const asciiBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[%;=]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "");

  return `${asciiBaseName || "download"}${extension}`;
}

function encodeHeaderFilename(fileName) {
  return encodeURIComponent(escapeHeaderFilename(fileName))
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");
}

function buildContentDisposition(dispositionType, fileName) {
  const normalizedDisposition = String(dispositionType || "").toLowerCase() === "inline" ? "inline" : "attachment";
  const safeFileName = escapeHeaderFilename(fileName);
  const asciiFallback = createAsciiHeaderFilename(safeFileName);
  const encodedFileName = encodeHeaderFilename(safeFileName);

  return `${normalizedDisposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

module.exports = {
  buildContentDisposition,
  createAsciiHeaderFilename,
  encodeHeaderFilename,
  escapeHeaderFilename,
};
