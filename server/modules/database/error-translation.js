function createDatabaseErrorTranslator({ createHttpError }) {
  return function translateDatabaseError(error) {
    if (error.statusCode) {
      return error;
    }

    if (error.code === "AUTH_SWITCH_PLUGIN_ERROR" || String(error.message || "").includes("auth_gssapi_client")) {
      return createHttpError(
        500,
        "현재 MariaDB 계정은 auth_gssapi_client 인증을 사용 중입니다. Node에서는 전용 mysql_native_password 계정을 만들어 `.env`에 설정해야 합니다.",
      );
    }

    if (error.code === "ER_BAD_DB_ERROR") {
      return createHttpError(500, "DB가 아직 생성되지 않았습니다. `npm run db:setup`을 먼저 실행하세요.");
    }

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      return createHttpError(500, "MariaDB 접속 정보가 올바르지 않습니다. `.env`의 계정 정보를 확인하세요.");
    }

    if (error.code === "ECONNREFUSED") {
      return createHttpError(500, "MariaDB 서버에 연결할 수 없습니다. 서비스 실행 여부와 포트를 확인하세요.");
    }

    if (error.cause instanceof Error && !error.code) {
      return createHttpError(400, error.message);
    }

    return createHttpError(500, "서버 처리 중 오류가 발생했습니다.");
  };
}

module.exports = {
  createDatabaseErrorTranslator,
};
