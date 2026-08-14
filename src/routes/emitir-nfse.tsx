import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "../components/AppShell";
import { buildNfsePrintUrl } from "../domain/nfse-public-url";
import {
  findNfseServiceCode,
  NFSE_SERVICE_CODES,
} from "../domain/nfse-service-codes";
import type { Customer } from "../domain/types";
import { formatCents, parseMoneyToCents } from "../lib/money";
import {
  createServiceInvoiceDraftFn,
  getWorkspaceFn,
  listCustomersFn,
  transmitServiceInvoiceFn,
} from "../fns/nfe-functions";

export const Route = createFileRoute("/emitir-nfse")({
  head: () => ({ meta: [{ title: "Emitir NFS-e — NFeFácil" }] }),
  loader: async () => {
    const [workspace, customers] = await Promise.all([
      getWorkspaceFn(),
      listCustomersFn(),
    ]);
    return {
      company: workspace.ok ? workspace.data.company : null,
      customers: customers.ok ? customers.data.customers : [],
      error: !workspace.ok
        ? workspace.error.message
        : !customers.ok
          ? customers.error.message
          : null,
    };
  },
  component: EmitirNfsePage,
});

function EmitirNfsePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const avant = data.customers.find((c: Customer) =>
    c.document.includes("25238319"),
  );
  const [customerId, setCustomerId] = useState(
    avant ? String(avant.id) : data.customers[0] ? String(data.customers[0].id) : "",
  );
  const [serviceCode, setServiceCode] = useState("01880");
  const [serviceQuery, setServiceQuery] = useState(
    "01880 — Assistência técnica",
  );
  const [value, setValue] = useState("");
  const [discrimination, setDiscrimination] = useState(
    "Servicos de assistencia tecnica no site institucional.",
  );
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const serviceCents = parseMoneyToCents(value);
  const issCents = Math.round(serviceCents * 0.05);
  const selectedService = findNfseServiceCode(serviceCode);
  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return NFSE_SERVICE_CODES;
    return NFSE_SERVICE_CODES.filter(
      (item) =>
        item.code.includes(q.replace(/\D/g, "")) ||
        item.label.toLowerCase().includes(q),
    );
  }, [serviceQuery]);

  async function submit() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setPrintUrl(null);
    if (!customerId) {
      setError("Selecione o tomador.");
      setSaving(false);
      return;
    }
    const draft = await createServiceInvoiceDraftFn({
      data: {
        customerId: Number(customerId),
        discrimination,
        serviceCents,
        serviceCode,
        issRate: 0.05,
      },
    });
    if (!draft.ok) {
      setError(draft.error.message);
      setSaving(false);
      return;
    }
    const tx = await transmitServiceInvoiceFn({
      data: { invoiceId: draft.data.invoice.id },
    });
    setSaving(false);
    if (!tx.ok) {
      setError(tx.error.message);
      return;
    }
    if (tx.data.invoice.status === "authorized") {
      setSuccess(
        `NFS-e ${tx.data.invoice.nfseNumber} autorizada. Código ${tx.data.invoice.verificationCode}`,
      );
      const url =
        tx.data.invoice.nfseNumber && tx.data.invoice.verificationCode
          ? buildNfsePrintUrl({
              municipalRegistration: data.company?.municipalRegistration ?? "",
              nfseNumber: tx.data.invoice.nfseNumber,
              verificationCode: tx.data.invoice.verificationCode,
            })
          : null;
      setPrintUrl(url);
    } else {
      setError(tx.data.invoice.rejectionReason ?? "Prefeitura rejeitou a NFS-e");
    }
    await router.invalidate();
  }

  return (
    <AppShell companyName={data.company?.tradeName ?? data.company?.name}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Prefeitura de São Paulo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Emitir NFS-e
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transmissão oficial via webservice da Nota do Milhão. Gera nota
            fiscal de serviço de verdade.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-[var(--success)]" role="status">
            {success}
            {printUrl ? (
              <>
                {" "}
                <a
                  href={printUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Ver / imprimir PDF
                </a>
              </>
            ) : null}
          </p>
        )}

        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <label className="block text-sm">
            <span className="text-muted-foreground">Tomador</span>
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

          <label className="block text-sm">
            <span className="text-muted-foreground">Código do serviço</span>
            <input
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={serviceQuery}
              onChange={(e) => {
                const raw = e.target.value;
                setServiceQuery(raw);
                const fromList = raw.match(/^(\d{4,5})\s[—-]/);
                const typed = (fromList?.[1] ?? raw).replace(/\D/g, "");
                if (typed.length === 4 || typed.length === 5) {
                  const match = findNfseServiceCode(typed);
                  if (match) setServiceCode(match.code);
                }
              }}
              placeholder="Buscar por código ou descrição"
              autoComplete="off"
              list="nfse-service-codes"
            />
            <datalist id="nfse-service-codes">
              {NFSE_SERVICE_CODES.map((item) => (
                <option key={item.code} value={`${item.code} — ${item.label}`} />
              ))}
            </datalist>
            <select
              className="mt-2 h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              size={8}
              value={serviceCode}
              onChange={(e) => {
                setServiceCode(e.target.value);
                const item = findNfseServiceCode(e.target.value);
                if (item) setServiceQuery(`${item.code} — ${item.label}`);
              }}
            >
              {filteredServices.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {filteredServices.length} código(s)
              {selectedService
                ? ` · selecionado ${selectedService.code} — ${selectedService.label}`
                : ""}
            </p>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Valor do serviço (R$)</span>
            <input
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="1.500,00"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Discriminação</span>
            <textarea
              className="mt-1.5 min-h-24 w-full rounded-md border border-border bg-background p-3 text-sm"
              value={discrimination}
              onChange={(e) => setDiscrimination(e.target.value)}
            />
          </label>

          <p className="text-sm text-muted-foreground">
            ISS 5% estimado: {formatCents(issCents)} · Total da nota:{" "}
            {formatCents(serviceCents)}
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Send className="size-4" />
            {saving ? "Transmitindo…" : "Transmitir NFS-e oficial"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
