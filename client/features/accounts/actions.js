(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.AdmitCardAccountActions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createAccountActionController({
    apiRequest,
    createAccountEditorState,
    getAccountGridRows,
    getSystemInitialPassword,
    handleAuthenticationFailure,
    logoutCurrentUser,
    normalizeAccountRecord,
    renderView,
    setAccountGridRows,
    state,
  }) {
    function startAccountEdit(accountId) {
      const account = getAccountGridRows().find((row) => row.id === accountId);

      if (!account) {
        return;
      }

      state.accountEditor = {
        editingId: account.id,
        draftName: account.name,
        draftRole: account.role,
      };
    }

    function cancelAccountEdit() {
      state.accountEditor = createAccountEditorState();
    }

    function updateAccountEditorField(fieldKey, value) {
      if (!state.accountEditor.editingId) {
        return;
      }

      state.accountEditor[fieldKey] = value;
    }

    async function saveAccountEdit(accountId) {
      try {
        const updatedAccount = await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: state.accountEditor.draftName,
            role: state.accountEditor.draftRole,
          }),
        });

        setAccountGridRows(
          getAccountGridRows().map((row) => (row.id === accountId ? normalizeAccountRecord(updatedAccount) : row)),
        );

        if (state.auth.currentUser?.id === accountId) {
          state.auth.currentUser = {
            ...state.auth.currentUser,
            name: updatedAccount.name,
            role: updatedAccount.role,
          };
        }

        cancelAccountEdit();
        renderView();
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        window.alert(error.message);
      }
    }

    async function resetAccountPasswordAction(accountId) {
      try {
        const result = await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}/reset-password`, {
          method: "POST",
        });
        const initialPassword = String(result?.password || getSystemInitialPassword());

        if (state.auth.currentUser?.id === accountId) {
          window.alert(`현재 로그인한 계정의 비밀번호를 ${initialPassword}로 초기화했습니다. 다시 로그인하세요.`);
          await logoutCurrentUser();
          return;
        }

        window.alert(`비밀번호를 ${initialPassword}로 초기화했습니다.`);
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        window.alert(error.message);
      }
    }

    async function deleteAccountAction(accountId) {
      const account = getAccountGridRows().find((row) => row.id === accountId);

      if (!account) {
        return;
      }

      if (!window.confirm(`${account.id} 계정을 삭제하시겠습니까?`)) {
        return;
      }

      try {
        await apiRequest(`/api/accounts/${encodeURIComponent(accountId)}`, {
          method: "DELETE",
        });
        setAccountGridRows(getAccountGridRows().filter((row) => row.id !== accountId));

        if (state.accountEditor.editingId === accountId) {
          cancelAccountEdit();
        }

        if (state.auth.currentUser?.id === accountId) {
          await logoutCurrentUser();
          return;
        }

        renderView();
      } catch (error) {
        if (handleAuthenticationFailure(error)) {
          return;
        }

        window.alert(error.message);
      }
    }

    return Object.freeze({
      cancelAccountEdit,
      deleteAccountAction,
      resetAccountPasswordAction,
      saveAccountEdit,
      startAccountEdit,
      updateAccountEditorField,
    });
  }

  return Object.freeze({
    createAccountActionController,
  });
});
