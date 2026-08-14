import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
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
import type { Customer } from "../domain/types";
import { formatDateTime, invoiceStatusLabels } from "../lib/invoice-labels";
import { formatCents } from "../lib/money";
import { getDashboardFn, listCustomersFn } from "../fns/nfe-functions";
import type {
  DashboardKindFilter,
  DashboardRecentItem,
  DashboardStatusFilter,
  InvoiceStatus,
} from "../domain/types";

type DashboardSearch = {
  kind?: DashboardKindFilter;
  status?: DashboardStatusFilter;
  customerId?: number;
  from?: string;
  to?: string;
  page?: number;
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    const kind =
      search.kind === "nfe" || search.kind === "nfse" ? search.kind : "all";
    const statusValues = [
      "all",
      "draft",
      "pending",
      "authorized",
      "rejected",
      "canceled",
    ] as const;
    const status = statusValues.includes(search.status as DashboardStatusFilter)
      ? (search.status as DashboardStatusFilter)
      : "all";
    const customerRaw = search.customerId;
    const customerId =
      typeof customerRaw === "number"
        ? customerRaw
        : typeof customerRaw === "string" && customerRaw
          ? Number(customerRaw)
          : undefined;
    const pageRaw = search.page;
    const page =
      typeof pageRaw === "number"
        ? pageRaw
        : typeof pageRaw === "string" && pageRaw
          ? Number(pageRaw)
          : undefined;
    return {
      kind: kind === "all" ? undefined : kind,
      status: status === "all" ? undefined : status,
      customerId: Number.isFinite(customerId) ? customerId : undefined,
      from: typeof search.from === "string" ? search.from : undefined,
      to: typeof search.to === "string" ? search.to : undefined,
      page:
        Number.isFinite(page) && page && page > 1 ? Math.floor(page) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Painel — NFeFácil" },
      {
        name: "description",
        content: "Visão geral das suas Notas Fiscais Eletrônicas (NF-e).",
      },
    ],
  }),
  loaderDeps: ({ search }) => ({
    kind: search.kind,
    status: search.status,
    customerId: search.customerId,
    from: search.from,
    to: search.to,
    page: search.page,
  }),
  loader: async ({ deps }) => {
    const [result, customers] = await Promise.all([
      getDashboardFn({
        data: {
          kind: deps.kind,
          status: deps.status,
          customerId: deps.customerId,
          dateFrom: deps.from,
          dateTo: deps.to,
          page: deps.page,
        },
      }),
      listCustomersFn(),
    ]);
    if (!result.ok) {
      return {
        error: result.error.message,
        company: null,
        metrics: null,
        customers: [] as Customer[],
      };
    }
    return {
      error: null as string | null,
      company: result.data.company,
      metrics: result.data.metrics,
      customers: customers.ok ? customers.data.customers : [],
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { company, metrics, error, customers } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  function patchSearch(next: Partial<DashboardSearch>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...next,
        page: "page" in next ? next.page : undefined,
      }),
    });
  }

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
              Visão geral das NFS-e e NF-e emitidas
            </p>
          </div>
          <Link
            to="/emitir-nfse"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Emitir NFS-e
          </Link>
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm">
            <span className="text-muted-foreground">Período</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={
                !search.from && !search.to
                  ? "all"
                  : search.from &&
                      search.to &&
                      search.from === isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) &&
                      search.to === isoDate(new Date())
                    ? "month"
                    : search.from === `${new Date().getFullYear()}-01-01` &&
                        search.to === isoDate(new Date())
                      ? "year"
                      : "custom"
              }
              onChange={(e) => {
                const today = new Date();
                if (e.target.value === "all") {
                  patchSearch({ from: undefined, to: undefined });
                  return;
                }
                if (e.target.value === "month") {
                  patchSearch({
                    from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                    to: isoDate(today),
                  });
                  return;
                }
                if (e.target.value === "year") {
                  patchSearch({
                    from: `${today.getFullYear()}-01-01`,
                    to: isoDate(today),
                  });
                  return;
                }
                if (e.target.value === "30") {
                  const from = new Date(today);
                  from.setDate(from.getDate() - 29);
                  patchSearch({ from: isoDate(from), to: isoDate(today) });
                }
              }}
            >
              <option value="all">Todo o período</option>
              <option value="month">Este mês</option>
              <option value="year">Este ano</option>
              <option value="30">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">De</span>
            <input
              type="date"
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.from ?? ""}
              onChange={(e) =>
                patchSearch({ from: e.target.value || undefined })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Até</span>
            <input
              type="date"
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.to ?? ""}
              onChange={(e) => patchSearch({ to: e.target.value || undefined })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.kind ?? "all"}
              onChange={(e) =>
                patchSearch({ kind: e.target.value as DashboardKindFilter })
              }
            >
              <option value="all">NFS-e e NF-e</option>
              <option value="nfse">Só NFS-e</option>
              <option value="nfe">Só NF-e</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.status ?? "all"}
              onChange={(e) =>
                patchSearch({
                  status: e.target.value as DashboardStatusFilter,
                })
              }
            >
              <option value="all">Todos</option>
              <option value="authorized">Autorizadas</option>
              <option value="canceled">Canceladas</option>
              <option value="rejected">Rejeitadas</option>
              <option value="draft">Rascunhos</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2 lg:col-span-5">
            <span className="text-muted-foreground">Cliente</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.customerId ?? ""}
              onChange={(e) =>
                patchSearch({
                  customerId: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Todos os clientes</option>
              {customers.map((c: Customer) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
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
                <h2 className="font-semibold">Emissões no período</h2>
                <p className="text-xs text-muted-foreground">
                  Quantidade de notas autorizadas por dia
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
              labels={metrics.last7Days.map((d: { day: string; count: number }) => {
                const [, m, day] = d.day.split("-");
                return `${day}/${m}`;
              })}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">Ações rápidas</h2>
            <div className="space-y-2">
              <QuickLink
                to="/emitir-nfse"
                icon={<Plus className="size-4" />}
                label="Nova NFS-e"
                desc="Emitir nota de serviço"
              />
              <QuickLink
                to="/nfse"
                icon={<FileCheck className="size-4" />}
                label="NFS-e emitidas"
                desc="Histórico e PDF"
              />
              <QuickLink
                to="/clientes"
                icon={<Users className="size-4" />}
                label="Novo cliente"
                desc="Cadastrar destinatário"
              />
              <QuickLink
                to="/notas"
                icon={<Package className="size-4" />}
                label="NF-e de mercadoria"
                desc="Histórico modelo 55"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
            <h2 className="font-semibold">Notas do filtro</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {metrics.recentTotal === 0
                  ? "Nenhuma nota"
                  : `${(metrics.page - 1) * metrics.pageSize + 1}–${Math.min(metrics.page * metrics.pageSize, metrics.recentTotal)} de ${metrics.recentTotal}`}
              </span>
              <Link
                to="/nfse"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver todas <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
          <RecentTable rows={metrics.recentItems} />
          <NotesPager
            page={metrics.page}
            pageSize={metrics.pageSize}
            total={metrics.recentTotal}
            onPage={(page) => patchSearch({ page: page > 1 ? page : undefined })}
          />
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

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  const compact = data.length > 14;
  return (
    <div className="flex h-52 items-end justify-between gap-1 overflow-x-auto">
      {data.map((v, i) => (
        <div key={i} className="flex h-full min-w-4 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-primary to-[oklch(0.6_0.14_215)] transition-all hover:opacity-80"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
              title={`${labels[i] ?? ""}: ${v} notas`}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {compact && i % 4 !== 0 ? "" : (labels[i] ?? "")}
          </div>
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

function NotesPager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-3.5" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function RecentTable({ rows }: { rows: DashboardRecentItem[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Nenhuma nota neste filtro.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="px-6 py-3 font-medium">Nº</th>
            <th className="px-6 py-3 font-medium">Tipo</th>
            <th className="px-6 py-3 font-medium">Cliente</th>
            <th className="px-6 py-3 font-medium">Data</th>
            <th className="px-6 py-3 font-medium">Valor</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id} className="border-t border-border hover:bg-secondary/50">
              <td className="px-6 py-3 font-mono text-xs">{n.numberLabel}</td>
              <td className="px-6 py-3 text-xs text-muted-foreground">
                {n.kind === "nfse" ? "NFS-e" : "NF-e"}
              </td>
              <td className="px-6 py-3">{n.customerName}</td>
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
