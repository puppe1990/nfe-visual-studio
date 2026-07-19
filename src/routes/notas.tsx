import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import type { Invoice, InvoiceStatus } from "../domain/types";
import {
  formatDateTime,
  formatInvoiceNumber,
  invoiceStatusLabels,
} from "../lib/invoice-labels";
import { formatCents } from "../lib/money";
import {
  cancelInvoiceFn,
  exportInvoiceXmlFn,
  getWorkspaceFn,
  listInvoicesFn,
  sendInvoiceEmailFn,
  transmitInvoiceFn,
} from "../fns/nfe-functions";

const filters: Array<{ id: InvoiceStatus | "all"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "authorized", label: "Autorizadas" },
  { id: "draft", label: "Rascunhos" },
  { id: "pending", label: "Pendentes" },
  { id: "rejected", label: "Rejeitadas" },
  { id: "canceled", label: "Canceladas" },
];

export const Route = createFileRoute("/notas")({
  head: () => ({ meta: [{ title: "Notas emitidas — NFeFácil" }] }),
  validateSearch: (search: Record<string, unknown>): {
    status?: InvoiceStatus | "all";
  } => ({
    status:
      typeof search.status === "string"
        ? (search.status as InvoiceStatus | "all")
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ status: search.status ?? "all" }),
  loader: async ({ deps }) => {
    const status = (deps.status ?? "all") as InvoiceStatus | "all";
    const [workspace, list] = await Promise.all([
      getWorkspaceFn(),
      listInvoicesFn({ data: { status } }),
    ]);
    return {
      companyName:
        workspace.ok
          ? (workspace.data.company.tradeName ?? workspace.data.company.name)
          : undefined,
      invoices: list.ok ? list.data.invoices : [],
      error: list.ok ? null : list.error.message,
      status,
    };
  },
  component: NotasPage,
});

function NotasPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const [error, setError] = useState<string | null>(data.error);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onTransmit(invoiceId: number) {
    setBusyId(invoiceId);
    setError(null);
    const result = await transmitInvoiceFn({ data: { invoiceId } });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await router.invalidate();
  }

  async function onDownloadXml(invoiceId: number) {
    setBusyId(invoiceId);
    setError(null);
    const result = await exportInvoiceXmlFn({ data: { invoiceId } });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const blob = new Blob([result.data.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfe-${invoiceId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onCancel(invoiceId: number) {
    const justification = window.prompt(
      "Justificativa do cancelamento (mín. 15 caracteres):",
    );
    if (justification == null) return;
    setBusyId(invoiceId);
    setError(null);
    const result = await cancelInvoiceFn({
      data: { invoiceId, justification },
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await router.invalidate();
  }

  async function onEmail(invoiceId: number) {
    setBusyId(invoiceId);
    setError(null);
    const result = await sendInvoiceEmailFn({ data: { invoiceId } });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    window.alert("E-mail enfileirado/enviado (sender em memória no MVP).");
    await router.invalidate();
  }

  return (
    <AppShell companyName={data.companyName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas emitidas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico completo de NF-e · {data.invoices.length} registro(s)
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() =>
                navigate({
                  to: "/notas",
                  search: { status: f.id },
                })
              }
              className={
                "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                (data.status === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-3 font-medium">Nº</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Valor</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-muted-foreground">
                    Nenhuma nota neste filtro.
                  </td>
                </tr>
              ) : (
                data.invoices.map((n: Invoice) => (
                  <tr key={n.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="px-6 py-3 font-mono text-xs">
                      {formatInvoiceNumber(n.series, n.number)}
                    </td>
                    <td className="px-6 py-3">{n.customerName ?? "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDateTime(n.issuedAt ?? n.createdAt)}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {formatCents(n.totalCents)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={n.status} />
                      {n.rejectionReason && (
                        <div className="mt-1 text-xs text-destructive">
                          {n.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(n.status === "draft" || n.status === "rejected") && (
                          <button
                            type="button"
                            disabled={busyId === n.id}
                            onClick={() => onTransmit(n.id)}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50"
                          >
                            Transmitir
                          </button>
                        )}
                        {n.status === "authorized" && (
                          <>
                            <button
                              type="button"
                              title="Baixar XML"
                              disabled={busyId === n.id}
                              onClick={() => onDownloadXml(n.id)}
                              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                            >
                              <Download className="size-4" />
                            </button>
                            <button
                              type="button"
                              title="Enviar e-mail"
                              disabled={busyId === n.id}
                              onClick={() => onEmail(n.id)}
                              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                            >
                              <Mail className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === n.id}
                              onClick={() => onCancel(n.id)}
                              className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-secondary disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map = {
    authorized: {
      color: "var(--success)",
      icon: <CheckCircle2 className="size-3" />,
    },
    pending: { color: "var(--warning)", icon: <Clock className="size-3" /> },
    draft: { color: "var(--muted-foreground)", icon: <Clock className="size-3" /> },
    rejected: {
      color: "var(--destructive)",
      icon: <XCircle className="size-3" />,
    },
    canceled: {
      color: "var(--muted-foreground)",
      icon: <AlertCircle className="size-3" />,
    },
  } as const;
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
      style={{
        background: `color-mix(in oklch, ${s.color} 14%, transparent)`,
        color: s.color,
      }}
    >
      {s.icon}
      {invoiceStatusLabels[status]}
    </span>
  );
}
