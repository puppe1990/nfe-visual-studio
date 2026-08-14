import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
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
import { DashboardRecentTable } from "../components/DashboardRecentTable";
import {
  DashboardBarChart,
  DashboardQuickLink,
  DashboardStatCard,
} from "../components/DashboardWidgets";
import { NotesPager } from "../components/NotesPager";
import type { Customer } from "../domain/types";
import {
  parseDashboardSearch,
  type DashboardSearch,
} from "../lib/dashboard-search";
import { isoDate } from "../lib/iso-date";
import { formatCents } from "../lib/money";
import { getDashboardFn, listCustomersFn } from "../fns/nfe-functions";
import type {
  DashboardKindFilter,
  DashboardStatusFilter,
} from "../domain/types";

export const Route = createFileRoute("/painel")({
  validateSearch: parseDashboardSearch,
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
  const navigate = useNavigate({ from: "/painel" });

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
          <DashboardStatCard
            label="Notas emitidas"
            value={String(metrics.authorizedCount)}
            icon={<FileCheck className="size-5" />}
            tone="primary"
          />
          <DashboardStatCard
            label="Faturamento"
            value={formatCents(metrics.revenueCents)}
            icon={<DollarSign className="size-5" />}
            tone="success"
          />
          <DashboardStatCard
            label="Pendentes / rascunhos"
            value={String(metrics.pendingCount)}
            icon={<Clock className="size-5" />}
            tone="warning"
          />
          <DashboardStatCard
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
            <DashboardBarChart
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
              <DashboardQuickLink
                to="/emitir-nfse"
                icon={<Plus className="size-4" />}
                label="Nova NFS-e"
                desc="Emitir nota de serviço"
              />
              <DashboardQuickLink
                to="/nfse"
                icon={<FileCheck className="size-4" />}
                label="NFS-e emitidas"
                desc="Histórico e PDF"
              />
              <DashboardQuickLink
                to="/clientes"
                icon={<Users className="size-4" />}
                label="Novo cliente"
                desc="Cadastrar destinatário"
              />
              <DashboardQuickLink
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
          <DashboardRecentTable rows={metrics.recentItems} />
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

