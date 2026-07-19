import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import type { Customer } from "../domain/types";
import {
  createCustomerFn,
  getWorkspaceFn,
  listCustomersFn,
} from "../fns/nfe-functions";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — NFeFácil" }] }),
  loader: async () => {
    const [workspace, list] = await Promise.all([
      getWorkspaceFn(),
      listCustomersFn(),
    ]);
    return {
      companyName:
        workspace.ok
          ? (workspace.data.company.tradeName ?? workspace.data.company.name)
          : undefined,
      customers: list.ok ? list.data.customers : [],
      error: list.ok ? null : list.error.message,
    };
  },
  component: ClientesPage,
});

function ClientesPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("SP");
  const [error, setError] = useState<string | null>(data.error);
  const [saving, setSaving] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createCustomerFn({
      data: {
        name,
        document,
        email: email || null,
        state: state || null,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setName("");
    setDocument("");
    setEmail("");
    await router.invalidate();
  }

  return (
    <AppShell companyName={data.companyName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Destinatários das NF-e · {data.customers.length} cadastrado(s)
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-semibold">Novo cliente</h2>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Nome / Razão social *</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">CPF / CNPJ *</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="000.000.000-00"
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
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">UF</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={2}
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Cadastrar cliente"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">UF</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                data.customers.map((c: Customer) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.document}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">{c.state ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
