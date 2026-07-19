import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileCheck,
  Package,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "../components/AppShell";
import {
  formatDateTime,
  formatInvoiceNumber,
  invoiceStatusLabels,
} from "../lib/invoice-labels";
import { formatCents } from "../lib/money";
import { getDashboardFn } from "../fns/nfe-functions";
import type { Invoice, InvoiceStatus } from "../domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — NFeFácil" },
      {
        name: "description",
        content: "Visão geral das suas Notas Fiscais Eletrônicas (NF-e).",
      },
    ],
  }),
  loader: async () => {
    const result = await getDashboardFn();
    if (!result.ok) {
      return {
        error: result.error.message,
        company: null,
        metrics: null,
      };
    }
    return {
      error: null as string | null,
      company: result.data.company,
      metrics: result.data.metrics,
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { company, metrics, error } = Route.useLoaderData();

  if (error || !company || !metrics) {
    return (
      <AppShell>
        <p className="text-destructive" role="alert">
          {error ?? "Não foi possível carregar o painel."}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell companyName={company.tradeName ?? company.name}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Painel de emissão</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão geral das suas notas fiscais eletrônicas
            </p>
          </div>
          <Link
            to="/emitir"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Emitir nova NF-e
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Notas emitidas"
            value={String(metrics.authorizedCount)}
            icon={<FileCheck className="size-5" />}
            tone="primary"
          />
          <StatCard
            label="Faturamento"
            value={formatCents(metrics.revenueCents)}
            icon={<DollarSign className="size-5" />}
            tone="success"
          />
          <StatCard
            label="Pendentes / rascunhos"
            value={String(metrics.pendingCount)}
            icon={<Clock className="size-5" />}
            tone="warning"
          />
          <StatCard
            label="Rejeitadas"
            value={String(metrics.rejectedCount)}
            icon={<AlertCircle className="size-5" />}
            tone="destructive"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Emissões nos últimos 7 dias</h2>
                <p className="text-xs text-muted-foreground">
                  Quantidade de NF-e autorizadas por dia
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3.5" style={{ color: "var(--success)" }} />
                Dados reais do banco
              </div>
            </div>
            <BarChart
              data={metrics.last7Days.map(
                (d: { day: string; count: number }) => d.count,
              )}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">Ações rápidas</h2>
            <div className="space-y-2">
              <QuickLink
                to="/emitir"
                icon={<Plus className="size-4" />}
                label="Nova NF-e"
                desc="Emitir para cliente"
              />
              <QuickLink
                to="/clientes"
                icon={<Users className="size-4" />}
                label="Novo cliente"
                desc="Cadastrar destinatário"
              />
              <QuickLink
                to="/produtos"
                icon={<Package className="size-4" />}
                label="Novo produto"
                desc="Adicionar ao catálogo"
              />
              <QuickLink
                to="/notas"
                icon={<FileCheck className="size-4" />}
                label="Ver notas"
                desc="Histórico completo"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-semibold">Últimas notas emitidas</h2>
            <Link
              to="/notas"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver todas <ChevronRight className="size-4" />
            </Link>
          </div>
          <RecentTable rows={metrics.recentInvoices} />
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneColor: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div
          className="grid size-10 place-items-center rounded-lg"
          style={{
            background: `color-mix(in oklch, ${toneColor[tone]} 12%, transparent)`,
            color: toneColor[tone],
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Hoje"];
  return (
    <div className="flex h-52 items-end justify-between gap-3">
      {data.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-primary to-[oklch(0.6_0.14_215)] transition-all hover:opacity-80"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
              title={`${v} notas`}
            />
          </div>
          <div className="text-xs text-muted-foreground">{days[i]}</div>
        </div>
      ))}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary"
    >
      <div className="grid size-9 place-items-center rounded-md bg-secondary text-primary group-hover:bg-background">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function RecentTable({ rows }: { rows: Invoice[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Nenhuma nota ainda. Emita a primeira NF-e.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="px-6 py-3 font-medium">Nº</th>
            <th className="px-6 py-3 font-medium">Cliente</th>
            <th className="px-6 py-3 font-medium">Data</th>
            <th className="px-6 py-3 font-medium">Valor</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id} className="border-t border-border hover:bg-secondary/50">
              <td className="px-6 py-3 font-mono text-xs">
                {formatInvoiceNumber(n.series, n.number)}
              </td>
              <td className="px-6 py-3">{n.customerName ?? "—"}</td>
              <td className="px-6 py-3 text-muted-foreground">
                {formatDateTime(n.issuedAt ?? n.createdAt)}
              </td>
              <td className="px-6 py-3 font-medium">{formatCents(n.totalCents)}</td>
              <td className="px-6 py-3">
                <StatusBadge status={n.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      icon: <AlertCircle className="size-3" />,
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
