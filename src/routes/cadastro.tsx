import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { registerFn } from "../fns/auth-functions";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — NFeFácil" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await registerFn({
      data: { email, name, password, companyName, document },
    });
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
          <h1 className="mt-2 text-xl font-semibold">Nova conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cria um workspace isolado para o seu CNPJ.
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <label className="block text-sm">
          <span className="text-muted-foreground">Seu nome</span>
          <input
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
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
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Razão social</span>
          <input
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">CNPJ</span>
          <input
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Criando…" : "Criar conta"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem acesso?{" "}
          <Link to="/login" className="text-primary underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
