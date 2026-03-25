const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const DEFAULT_PASSWORD_HASH_PREFIX = "scrypt";

function createPasswordHelpers({ passwordHashPrefix = DEFAULT_PASSWORD_HASH_PREFIX } = {}) {
  function isPasswordHash(value) {
    return new RegExp(`^${passwordHashPrefix}\\$[a-f0-9]+\\$[a-f0-9]+$`, "i").test(String(value || ""));
  }

  function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(String(password), salt, 64).toString("hex");
    return `${passwordHashPrefix}$${salt}$${hash}`;
  }

  function verifyPassword(password, passwordValue) {
    const normalizedPassword = String(password ?? "");
    const normalizedPasswordValue = String(passwordValue ?? "");

    if (!normalizedPasswordValue) {
      return false;
    }

    if (!isPasswordHash(normalizedPasswordValue)) {
      return normalizedPassword === normalizedPasswordValue;
    }

    const [, salt, expectedHash] = normalizedPasswordValue.split("$");
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const derivedBuffer = scryptSync(normalizedPassword, salt, expectedBuffer.length);

    return expectedBuffer.length === derivedBuffer.length && timingSafeEqual(expectedBuffer, derivedBuffer);
  }

  function normalizePasswordSetupValue(value) {
    return String(value ?? "");
  }

  return Object.freeze({
    hashPassword,
    isPasswordHash,
    normalizePasswordSetupValue,
    verifyPassword,
  });
}

module.exports = {
  createPasswordHelpers,
  DEFAULT_PASSWORD_HASH_PREFIX,
};
