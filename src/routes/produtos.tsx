import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import type { Product } from "../domain/types";
import { formatCents, parseMoneyToCents } from "../lib/money";
import {
  createProductFn,
  getWorkspaceFn,
  importProductsXmlFn,
  listProductsFn,
} from "../fns/nfe-functions";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — NFeFácil" }] }),
  loader: async () => {
    const [workspace, list] = await Promise.all([
      getWorkspaceFn(),
      listProductsFn(),
    ]);
    return {
      companyName:
        workspace.ok
          ? (workspace.data.company.tradeName ?? workspace.data.company.name)
          : undefined,
      products: list.ok ? list.data.products : [],
      error: list.ok ? null : list.error.message,
    };
  },
  component: ProdutosPage,
});

function ProdutosPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState("");
  const [ncm, setNcm] = useState("");
  const [price, setPrice] = useState("");
  const [xml, setXml] = useState("");
  const [error, setError] = useState<string | null>(data.error);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await createProductFn({
      data: {
        name,
        ncm: ncm || null,
        priceCents: parseMoneyToCents(price),
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setName("");
    setNcm("");
    setPrice("");
    await router.invalidate();
  }

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await importProductsXmlFn({ data: { xml } });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(
      `Importados: ${result.data.created} criados, ${result.data.updated} atualizados.`,
    );
    setXml("");
    await router.invalidate();
  }

  return (
    <AppShell companyName={data.companyName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo · {data.products.length} item(ns)
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-[var(--success)]" role="status">
            {message}
          </p>
        )}

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-semibold">Novo produto</h2>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm sm:col-span-1">
              <span className="text-muted-foreground">Descrição *</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">NCM (8 dígitos)</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 font-mono"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="99999999"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Preço (R$)</span>
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Cadastrar produto"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-2 font-semibold">Importar produtos via XML</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Cole o XML de uma NF-e para extrair os itens do catálogo.
          </p>
          <form onSubmit={onImport} className="space-y-3">
            <textarea
              className="min-h-28 w-full rounded-md border border-border bg-background p-3 font-mono text-xs"
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              placeholder="<NFe>...</NFe>"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
            >
              Importar XML
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">NCM</th>
                <th className="px-4 py-3 font-medium">Unidade</th>
                <th className="px-4 py-3 font-medium text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {data.products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted-foreground">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                data.products.map((p: Product) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.ncm ?? "—"}</td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCents(p.priceCents)}
                    </td>
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
