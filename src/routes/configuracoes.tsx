import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import type { SefazEnvironment, TaxRegime } from "../domain/types";
import { getWorkspaceFn, updateCompanyFn } from "../fns/nfe-functions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NFeFácil" }] }),
  loader: async () => {
    const workspace = await getWorkspaceFn();
    if (!workspace.ok) {
      return { company: null, error: workspace.error.message };
    }
    return { company: workspace.data.company, error: null as string | null };
  },
  component: ConfigPage,
});

function ConfigPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const company = data.company;

  const [name, setName] = useState(company?.name ?? "");
  const [tradeName, setTradeName] = useState(company?.tradeName ?? "");
  const [stateRegistration, setStateRegistration] = useState(
    company?.stateRegistration ?? "",
  );
  const [email, setEmail] = useState(company?.email ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [state, setState] = useState(company?.state ?? "");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(
    company?.taxRegime ?? "simples",
  );
  const [nfeSeries, setNfeSeries] = useState(String(company?.nfeSeries ?? 1));
  const [nextNfeNumber, setNextNfeNumber] = useState(
    String(company?.nextNfeNumber ?? 1),
  );
  const [sefazEnvironment, setSefazEnvironment] = useState<SefazEnvironment>(
    company?.sefazEnvironment ?? "homologation",
  );
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!company) {
    return (
      <AppShell>
        <p className="text-destructive" role="alert">
          {error ?? "Empresa não encontrada"}
        </p>
      </AppShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await updateCompanyFn({
      data: {
        name,
        tradeName: tradeName || null,
        stateRegistration: stateRegistration || null,
        email: email || null,
        phone: phone || null,
        city: city || null,
        state: state || null,
        taxRegime,
        nfeSeries: Number(nfeSeries) || 1,
        nextNfeNumber: Number(nextNfeNumber) || 1,
        sefazEnvironment,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSuccess("Configurações salvas.");
    await router.invalidate();
  }

  return (
    <AppShell companyName={company.tradeName ?? company.name}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados do emitente e numeração da NF-e
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
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <p className="text-sm text-muted-foreground">
            CNPJ:{" "}
            <strong className="font-mono text-foreground">{company.document}</strong>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social" value={name} onChange={setName} required />
            <Field
              label="Nome fantasia"
              value={tradeName}
              onChange={setTradeName}
            />
            <Field
              label="Inscrição estadual"
              value={stateRegistration}
              onChange={setStateRegistration}
            />
            <Field label="E-mail" value={email} onChange={setEmail} />
            <Field label="Telefone" value={phone} onChange={setPhone} />
            <Field label="Cidade" value={city} onChange={setCity} />
            <Field label="UF" value={state} onChange={setState} />
            <label className="block text-sm">
              <span className="text-muted-foreground">Regime tributário</span>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={taxRegime}
                onChange={(e) => setTaxRegime(e.target.value as TaxRegime)}
              >
                <option value="simples">Simples Nacional</option>
                <option value="presumido">Lucro Presumido</option>
                <option value="real">Lucro Real</option>
              </select>
            </label>
            <Field label="Série NF-e" value={nfeSeries} onChange={setNfeSeries} />
            <Field
              label="Próximo número"
              value={nextNfeNumber}
              onChange={setNextNfeNumber}
            />
            <label className="block text-sm">
              <span className="text-muted-foreground">Ambiente SEFAZ</span>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
                value={sefazEnvironment}
                onChange={(e) =>
                  setSefazEnvironment(e.target.value as SefazEnvironment)
                }
              >
                <option value="homologation">Homologação</option>
                <option value="production">Produção</option>
              </select>
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Certificado A1 e transmissão real à SEFAZ entram na Fase 2. Neste MVP a
            autorização é simulada no servidor.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
