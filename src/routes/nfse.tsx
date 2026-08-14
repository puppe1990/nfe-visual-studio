import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import { NotesPager } from "../components/NotesPager";
import { NfseSortHeader } from "../components/NfseSortHeader";
import { buildNfsePrintUrl } from "../domain/nfse-public-url";
import type {
  Customer,
  InvoiceStatus,
  NfseListDir,
  NfseListSort,
  ServiceInvoice,
} from "../domain/types";
import { formatDateTime, invoiceStatusLabels } from "../lib/invoice-labels";
import { isoDate } from "../lib/iso-date";
import { formatCents } from "../lib/money";
import { parseNfseSearch, type NfseSearch } from "../lib/nfse-search";
import {
  getWorkspaceFn,
  importHistoricServiceInvoicesFn,
  listCustomersFn,
  listServiceInvoicesFn,
} from "../fns/nfe-functions";

export const Route = createFileRoute("/nfse")({
  head: () => ({ meta: [{ title: "NFS-e emitidas — NFeFácil" }] }),
  validateSearch: parseNfseSearch,
  loaderDeps: ({ search }) => ({
    status: search.status,
    customerId: search.customerId,
    from: search.from,
    to: search.to,
    page: search.page,
    sort: search.sort,
    dir: search.dir,
  }),
  loader: async ({ deps }) => {
    const [workspace, list, customers] = await Promise.all([
      getWorkspaceFn(),
      listServiceInvoicesFn({
        data: {
          status: deps.status,
          customerId: deps.customerId,
          dateFrom: deps.from,
          dateTo: deps.to,
          page: deps.page,
          sort: deps.sort,
          dir: deps.dir,
        },
      }),
      listCustomersFn(),
    ]);
    return {
      company: workspace.ok ? workspace.data.company : null,
      invoices: list.ok ? list.data.invoices : [],
      total: list.ok ? list.data.total : 0,
      page: list.ok ? list.data.page : 1,
      pageSize: list.ok ? list.data.pageSize : 10,
      sort: list.ok ? list.data.sort : "issuedAt",
      dir: list.ok ? list.data.dir : "desc",
      customers: customers.ok ? customers.data.customers : [],
      error: !workspace.ok
        ? workspace.error.message
        : !list.ok
          ? list.error.message
          : null,
    };
  },
  component: NfseListPage,
});

function NfseListPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/nfse" });
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function patchSearch(next: Partial<NfseSearch>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...next,
        page: "page" in next ? next.page : undefined,
      }),
    });
  }

  function toggleSort(column: NfseListSort) {
    const current = data.sort;
    const currentDir = data.dir;
    if (current === column) {
      patchSearch({
        sort: column,
        dir: currentDir === "asc" ? "desc" : "asc",
      });
      return;
    }
    patchSearch({
      sort: column,
      dir: column === "customer" ? "asc" : "desc",
    });
  }

  async function importHistoric() {
    setImporting(true);
    setImportMsg(null);
    const result = await importHistoricServiceInvoicesFn();
    setImporting(false);
    if (!result.ok) {
      setImportMsg(result.error.message);
      return;
    }
    setImportMsg(
      `Importadas ${result.data.imported} · já existentes ${result.data.skipped} · lidas ${result.data.fetched}`,
    );
    await router.invalidate();
  }

  const fromLabel =
    data.total === 0
      ? "Nenhuma nota"
      : `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} de ${data.total}`;

  return (
    <AppShell companyName={data.company?.tradeName ?? data.company?.name}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">NFS-e emitidas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Notas de serviço da Prefeitura de São Paulo
            </p>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={() => void importHistoric()}
            className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
          >
            {importing ? "Buscando…" : "Buscar notas da Prefeitura"}
          </button>
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
                      search.from ===
                        isoDate(
                          new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1,
                          ),
                        ) &&
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
            <span className="text-muted-foreground">Status</span>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={search.status ?? "all"}
              onChange={(e) =>
                patchSearch({
                  status:
                    e.target.value === "all"
                      ? undefined
                      : (e.target.value as InvoiceStatus),
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
          <label className="block text-sm">
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
              {data.customers.map((c: Customer) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {importMsg && (
          <p className="text-sm text-muted-foreground" role="status">
            {importMsg}
          </p>
        )}
        {data.error && (
          <p className="text-sm text-destructive" role="alert">
            {data.error}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-semibold">Notas</h2>
            <span className="text-xs text-muted-foreground">{fromLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <NfseSortHeader
                    label="NFS-e"
                    column="nfseNumber"
                    active={data.sort}
                    dir={data.dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-2 text-left font-medium">RPS</th>
                  <NfseSortHeader
                    label="Tomador"
                    column="customer"
                    active={data.sort}
                    dir={data.dir}
                    onSort={toggleSort}
                  />
                  <NfseSortHeader
                    label="Status"
                    column="status"
                    active={data.sort}
                    dir={data.dir}
                    onSort={toggleSort}
                  />
                  <NfseSortHeader
                    label="Valor"
                    column="total"
                    align="right"
                    active={data.sort}
                    dir={data.dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-2 text-left font-medium">Código</th>
                  <NfseSortHeader
                    label="Data"
                    column="issuedAt"
                    active={data.sort}
                    dir={data.dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-2 text-left font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      Nenhuma NFS-e neste filtro.
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((row: ServiceInvoice) => {
                    const printUrl =
                      row.status === "authorized" &&
                      row.nfseNumber &&
                      row.verificationCode
                        ? buildNfsePrintUrl({
                            municipalRegistration:
                              data.company?.municipalRegistration ?? "",
                            nfseNumber: row.nfseNumber,
                            verificationCode: row.verificationCode,
                          })
                        : null;
                    return (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-2 font-mono">
                          {row.nfseNumber ?? "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {row.rpsSeries}/{row.rpsNumber}
                        </td>
                        <td className="px-4 py-2">{row.customerName}</td>
                        <td className="px-4 py-2">
                          {invoiceStatusLabels[row.status]}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCents(row.totalCents)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {row.verificationCode ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {row.issuedAt ? formatDateTime(row.issuedAt) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {printUrl ? (
                            <a
                              href={printUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Ver / imprimir
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <NotesPager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={(page) => patchSearch({ page: page > 1 ? page : undefined })}
            padClass="px-4"
          />
        </div>
        {data.invoices.some((row: ServiceInvoice) => row.rejectionReason) && (
          <ul className="space-y-1 text-sm text-destructive">
            {data.invoices
              .filter((row: ServiceInvoice) => row.rejectionReason)
              .map((row: ServiceInvoice) => (
                <li key={row.id}>
                  RPS {row.rpsSeries}/{row.rpsNumber}: {row.rejectionReason}
                </li>
              ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

