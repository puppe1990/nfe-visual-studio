import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { loginFn } from "../fns/auth-functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — NFeFácil" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await loginFn({ data: { email, password } });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await navigate({ to: "/painel" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <Link to="/" className="text-xs font-medium text-primary hover:underline">
            ← NFeFácil
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Entrar no NFeFácil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada e-mail acessa só as empresas vinculadas a ele.
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <label className="block text-sm">
          <span className="text-muted-foreground">E-mail</span>
          <input
            type="email"
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Senha</span>
          <input
            type="password"
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Nova empresa?{" "}
          <Link to="/cadastro" className="text-primary underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
