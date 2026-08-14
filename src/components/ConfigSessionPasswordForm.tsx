import { useState } from "react";

import { changePasswordFn } from "../fns/auth-functions";
import {
  ConfigFormField,
  type ConfigFormFeedback,
} from "./ConfigFormField";

export function ConfigSessionPasswordForm({
  userEmail,
  feedback,
}: {
  userEmail: string | null;
  feedback: ConfigFormFeedback;
}) {
  const { saving, setSaving, setError, setSuccess } = feedback;
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="font-semibold">Sessão e senha</h2>
      <p className="text-sm text-muted-foreground">
        Conta logada:{" "}
        <strong className="text-foreground">{userEmail ?? "—"}</strong>. A troca
        vale só para este usuário.
      </p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          setSuccess(null);
          if (nextPassword !== nextPasswordConfirm) {
            setError("A confirmação da nova senha não confere.");
            setSaving(false);
            return;
          }
          const result = await changePasswordFn({
            data: { currentPassword, nextPassword },
          });
          setSaving(false);
          if (!result.ok) {
            setError(result.error.message);
            return;
          }
          setCurrentPassword("");
          setNextPassword("");
          setNextPasswordConfirm("");
          setSuccess("Senha alterada. A sessão continua ativa.");
        }}
      >
        <ConfigFormField
          label="Senha atual"
          value={currentPassword}
          onChange={setCurrentPassword}
          type="password"
          required
        />
        <div />
        <ConfigFormField
          label="Nova senha"
          value={nextPassword}
          onChange={setNextPassword}
          type="password"
          required
        />
        <ConfigFormField
          label="Confirmar nova senha"
          value={nextPasswordConfirm}
          onChange={setNextPasswordConfirm}
          type="password"
          required
        />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Trocar senha"}
          </button>
        </div>
      </form>
    </section>
  );
}
