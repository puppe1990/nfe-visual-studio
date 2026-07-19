import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, FileText, Package, Plus, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "../components/AppShell";
import type { Customer, Product } from "../domain/types";
import { formatCents, parseMoneyToCents } from "../lib/money";
import {
  createInvoiceDraftFn,
  getWorkspaceFn,
  listCustomersFn,
  listProductsFn,
  transmitInvoiceFn,
} from "../fns/nfe-functions";

type Line = {
  key: number;
  productId: number | null;
  description: string;
  ncm: string;
  quantity: string;
  unitPrice: string;
};

export const Route = createFileRoute("/emitir")({
  head: () => ({ meta: [{ title: "Emitir NF-e — NFeFácil" }] }),
  loader: async () => {
    const [workspace, customers, products] = await Promise.all([
      getWorkspaceFn(),
      listCustomersFn(),
      listProductsFn(),
    ]);
    return {
      company: workspace.ok ? workspace.data.company : null,
      customers: customers.ok ? customers.data.customers : [],
      products: products.ok ? products.data.products : [],
      error:
        !workspace.ok
          ? workspace.error.message
          : !customers.ok
            ? customers.error.message
            : !products.ok
              ? products.error.message
              : null,
    };
  },
  component: EmitirPage,
});

function EmitirPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [customerId, setCustomerId] = useState(
    data.customers[0] ? String(data.customers[0].id) : "",
  );
  const [nature, setNature] = useState("Venda de mercadoria");
  const [cfop, setCfop] = useState("5102");
  const [lines, setLines] = useState<Line[]>([
    {
      key: 1,
      productId: null,
      description: "",
      ncm: "",
      quantity: "1",
      unitPrice: "0",
    },
  ]);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subtotalCents = useMemo(() => {
    return lines.reduce((sum, line) => {
      const q = Number(line.quantity.replace(",", ".")) || 0;
      const unit = parseMoneyToCents(line.unitPrice);
      return sum + Math.round(q * unit);
    }, 0);
  }, [lines]);

  const taxCents = Math.round(subtotalCents * 0.06);
  const totalCents = subtotalCents + taxCents;

  function onPickProduct(key: number, productId: string) {
    const product = data.products.find(
      (p: Product) => p.id === Number(productId),
    );
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        if (!product) {
          return { ...line, productId: null };
        }
        return {
          ...line,
          productId: product.id,
          description: product.name,
          ncm: product.ncm ?? "",
          unitPrice: (product.priceCents / 100).toFixed(2).replace(".", ","),
        };
      }),
    );
  }

  async function submit(andTransmit: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!customerId) {
      setError("Selecione um cliente.");
      setSaving(false);
      return;
    }

    const items = lines.map((line) => ({
      productId: line.productId,
      description: line.description,
      ncm: line.ncm || null,
      quantity: Number(line.quantity.replace(",", ".")) || 0,
      unitPriceCents: parseMoneyToCents(line.unitPrice),
    }));

    const draft = await createInvoiceDraftFn({
      data: {
        customerId: Number(customerId),
        nature,
        cfop,
        items,
      },
    });

    if (!draft.ok) {
      setError(draft.error.message);
      setSaving(false);
      return;
    }

    if (andTransmit) {
      const tx = await transmitInvoiceFn({
        data: { invoiceId: draft.data.invoice.id },
      });
      setSaving(false);
      if (!tx.ok) {
        setError(tx.error.message);
        return;
      }
      setSuccess(
        tx.data.invoice.status === "authorized"
          ? `NF-e ${tx.data.invoice.number} autorizada (simulado).`
          : `Nota rejeitada: ${tx.data.invoice.rejectionReason ?? "erro"}`,
      );
      await router.invalidate();
      return;
    }

    setSaving(false);
    setSuccess(`Rascunho #${draft.data.invoice.id} salvo.`);
    await router.invalidate();
  }

  return (
    <AppShell companyName={data.company?.tradeName ?? data.company?.name}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-wide text-muted-foreground uppercase">
              Nova emissão
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Emitir NF-e</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(false)}
              className="h-10 rounded-md border border-border bg-card px-4 text-sm hover:bg-secondary disabled:opacity-60"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              <Send className="size-4" /> Transmitir (simulado)
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-[var(--success)]" role="status">
            {success}
          </p>
        )}

        {data.customers.length === 0 && (
          <p className="rounded-md border border-border bg-secondary px-4 py-3 text-sm">
            Cadastre um cliente em{" "}
            <a href="/clientes" className="text-primary underline">
              Clientes
            </a>{" "}
            antes de emitir.
          </p>
        )}

        <Section title="Destinatário" icon={<Building2 className="size-4" />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="text-muted-foreground">Cliente *</span>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {data.customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.document}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        <Section title="Produtos e serviços" icon={<Package className="size-4" />}>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Catálogo</th>
                  <th className="px-3 py-2 text-left font-medium">Descrição</th>
                  <th className="w-28 px-3 py-2 text-left font-medium">NCM</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Qtd</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Valor unit.</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const q = Number(line.quantity.replace(",", ".")) || 0;
                  const unit = parseMoneyToCents(line.unitPrice);
                  const total = Math.round(q * unit);
                  return (
                    <tr key={line.key} className="border-t border-border">
                      <td className="px-2 py-2">
                        <select
                          className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-xs outline-none focus:border-border focus:bg-secondary"
                          value={line.productId ?? ""}
                          onChange={(e) => onPickProduct(line.key, e.target.value)}
                        >
                          <option value="">Manual</option>
                          {data.products.map((p: Product) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="h-9 w-full rounded px-2 outline-none focus:bg-secondary"
                          value={line.description}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? { ...l, description: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="h-9 w-full rounded px-2 font-mono text-xs outline-none focus:bg-secondary"
                          value={line.ncm}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? { ...l, ncm: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="h-9 w-full rounded px-2 text-right outline-none focus:bg-secondary"
                          value={line.quantity}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? { ...l, quantity: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className="h-9 w-full rounded px-2 text-right outline-none focus:bg-secondary"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key
                                  ? { ...l, unitPrice: e.target.value }
                                  : l,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCents(total)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setLines((prev) =>
                              prev.filter((l) => l.key !== line.key),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: Date.now(),
                  productId: null,
                  description: "",
                  ncm: "",
                  quantity: "1",
                  unitPrice: "0",
                },
              ])
            }
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Plus className="size-4" /> Adicionar item
          </button>
        </Section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section title="Tributação" icon={<FileText className="size-4" />}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Natureza da operação</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                    value={nature}
                    onChange={(e) => setNature(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">CFOP</span>
                  <input
                    className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                    value={cfop}
                    onChange={(e) => setCfop(e.target.value)}
                  />
                </label>
              </div>
            </Section>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">Totais (estimativa)</h2>
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatCents(subtotalCents)} />
              <Row label="Impostos (~6%)" value={formatCents(taxCents)} />
              <div className="border-t border-border pt-2">
                <Row label="Total" value={formatCents(totalCents)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2 font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
