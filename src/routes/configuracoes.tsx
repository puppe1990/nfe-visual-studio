import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import type { CompanyCertificate } from "../domain/certificates";
import type { Inutilization, SefazEnvironment, TaxRegime } from "../domain/types";
import {
  formatDateTime,
} from "../lib/invoice-labels";
import { changePasswordFn } from "../fns/auth-functions";
import {
  consultIssuerCnpjFn,
  getActiveCertificateFn,
  getWorkspaceFn,
  inutilizeNumbersFn,
  listInutilizationsFn,
  registerCertificateFn,
  updateCompanyFn,
} from "../fns/nfe-functions";

const CONFIG_TABS = ["empresa", "sessao", "certificado", "inutilizacao"] as const;
type ConfigTab = (typeof CONFIG_TABS)[number];

export const Route = createFileRoute("/configuracoes")({
  validateSearch: (search: Record<string, unknown>): { tab: ConfigTab } => ({
    tab: CONFIG_TABS.includes(search.tab as ConfigTab)
      ? (search.tab as ConfigTab)
      : "empresa",
  }),
  head: () => ({ meta: [{ title: "Configurações — NFeFácil" }] }),
  loader: async () => {
    const [workspace, cert, inuts] = await Promise.all([
      getWorkspaceFn(),
      getActiveCertificateFn(),
      listInutilizationsFn(),
    ]);
    if (!workspace.ok) {
      return {
        company: null,
        userEmail: null as string | null,
        certificate: null,
        inutilizations: [] as Inutilization[],
        error: workspace.error.message,
      };
    }
    return {
      company: workspace.data.company,
      userEmail: workspace.data.user?.email ?? null,
      certificate: cert.ok ? cert.data.certificate : null,
      inutilizations: inuts.ok ? inuts.data.inutilizations : [],
      error: null as string | null,
    };
  },
  component: ConfigPage,
});

function ConfigPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/configuracoes" });
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
  const [municipalRegistration, setMunicipalRegistration] = useState(
    company?.municipalRegistration ?? "",
  );
  const [rpsSeries, setRpsSeries] = useState(company?.rpsSeries ?? "A");
  const [nextRpsNumber, setNextRpsNumber] = useState(
    String(company?.nextRpsNumber ?? 1),
  );
  const [sefazEnvironment, setSefazEnvironment] = useState<SefazEnvironment>(
    company?.sefazEnvironment ?? "homologation",
  );

  const [certSubject, setCertSubject] = useState("");
  const [certSerial, setCertSerial] = useState("");
  const [certPassword, setCertPassword] = useState("");
  const [certPfx, setCertPfx] = useState("");

  const [inutFrom, setInutFrom] = useState("");
  const [inutTo, setInutTo] = useState("");
  const [inutJust, setInutJust] = useState("");

  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");

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
        municipalRegistration: municipalRegistration || null,
        rpsSeries,
        nextRpsNumber: Number(nextRpsNumber) || 1,
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

  async function onRegisterCert(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await registerCertificateFn({
      data: {
        subject: certSubject,
        serialNumber: certSerial || null,
        pfxBase64: certPfx,
        password: certPassword,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setCertSubject("");
    setCertSerial("");
    setCertPassword("");
    setCertPfx("");
    setSuccess("Certificado A1 cadastrado.");
    await router.invalidate();
  }

  async function onInutilize(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await inutilizeNumbersFn({
      data: {
        numberFrom: Number(inutFrom),
        numberTo: Number(inutTo),
        justification: inutJust,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setInutFrom("");
    setInutTo("");
    setInutJust("");
    setSuccess(
      `Inutilização autorizada · prot ${result.data.inutilization.protocol}`,
    );
    await router.invalidate();
  }

  async function onPfxFile(file: File | null) {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    setCertPfx(btoa(binary));
    if (!certSubject) setCertSubject(file.name);
  }

  const certificate = data.certificate as CompanyCertificate | null;

  return (
    <AppShell companyName={company.tradeName ?? company.name}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Empresa, sessão, certificado e inutilização em abas
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

        <Tabs
          value={search.tab}
          onValueChange={(value) => {
            void navigate({
              search: { tab: value as ConfigTab },
            });
          }}
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="sessao">Sessão e senha</TabsTrigger>
            <TabsTrigger value="certificado">Certificado A1</TabsTrigger>
            <TabsTrigger value="inutilizacao">Inutilização</TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="font-semibold">Empresa emitente</h2>
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
              label="Próximo número NF-e"
              value={nextNfeNumber}
              onChange={setNextNfeNumber}
            />
            <Field
              label="Inscrição municipal (CCM)"
              value={municipalRegistration}
              onChange={setMunicipalRegistration}
            />
            <Field label="Série RPS" value={rpsSeries} onChange={setRpsSeries} />
            <Field
              label="Próximo número RPS"
              value={nextRpsNumber}
              onChange={setNextRpsNumber}
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
                <option value="production">Produção (exige A1)</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar empresa"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                setSuccess(null);
                const result = await consultIssuerCnpjFn();
                setSaving(false);
                if (!result.ok) {
                  setError(result.error.message);
                  return;
                }
                setMunicipalRegistration(result.data.municipalRegistration);
                setSuccess(
                  `Prefeitura OK. IM ${result.data.municipalRegistration}` +
                    (result.data.emitsNfse ? " · habilitado para NFS-e" : ""),
                );
              }}
              className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
            >
              Testar Prefeitura (ConsultaCNPJ)
            </button>
          </div>
        </form>
          </TabsContent>

          <TabsContent value="sessao">
        <section className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Sessão e senha</h2>
          <p className="text-sm text-muted-foreground">
            Conta logada:{" "}
            <strong className="text-foreground">
              {data.userEmail ?? "—"}
            </strong>
            . A troca vale só para este usuário.
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError(null);
              setSuccess(null);
              if (nextPassword !== nextPasswordConfirm) {
                setError("A confirmação da nova senha não confere.");
                setSaving(false);
                return;
              }
              const result = await changePasswordFn({
                data: { currentPassword, nextPassword },
              });
              setSaving(false);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setCurrentPassword("");
              setNextPassword("");
              setNextPasswordConfirm("");
              setSuccess("Senha alterada. A sessão continua ativa.");
            }}
          >
            <Field
              label="Senha atual"
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
              required
            />
            <div />
            <Field
              label="Nova senha"
              value={nextPassword}
              onChange={setNextPassword}
              type="password"
              required
            />
            <Field
              label="Confirmar nova senha"
              value={nextPasswordConfirm}
              onChange={setNextPasswordConfirm}
              type="password"
              required
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Trocar senha"}
              </button>
            </div>
          </form>
        </section>
          </TabsContent>

          <TabsContent value="certificado">
        <section className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Certificado digital A1</h2>
          {certificate ? (
            <p className="text-sm text-muted-foreground">
              Ativo: <strong className="text-foreground">{certificate.subject}</strong>
              {certificate.serialNumber
                ? ` · série ${certificate.serialNumber}`
                : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum certificado ativo. Obrigatório para ambiente de produção.
            </p>
          )}
          <form onSubmit={onRegisterCert} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Assunto / CN"
              value={certSubject}
              onChange={setCertSubject}
              required
            />
            <Field
              label="Nº de série"
              value={certSerial}
              onChange={setCertSerial}
            />
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted-foreground">Arquivo PFX/P12</span>
              <input
                type="file"
                accept=".pfx,.p12"
                className="mt-1.5 block w-full text-sm"
                onChange={(e) => onPfxFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Field
              label="Senha do certificado"
              value={certPassword}
              onChange={setCertPassword}
              required
            />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !certPfx}
                className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
              >
                Cadastrar certificado
              </button>
            </div>
          </form>
        </section>
          </TabsContent>

          <TabsContent value="inutilizacao">
        <section className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Inutilizar numeração</h2>
          <form onSubmit={onInutilize} className="grid gap-3 sm:grid-cols-2">
            <Field label="Número inicial" value={inutFrom} onChange={setInutFrom} required />
            <Field label="Número final" value={inutTo} onChange={setInutTo} required />
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                Justificativa (mín. 15 caracteres)
              </span>
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-background p-3 text-sm"
                value={inutJust}
                onChange={(e) => setInutJust(e.target.value)}
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-60"
              >
                Inutilizar faixa
              </button>
            </div>
          </form>

          {data.inutilizations.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Faixa</th>
                  <th className="py-2">Protocolo</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.inutilizations.map((row: Inutilization) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">
                      {row.series}/{row.numberFrom}–{row.numberTo}
                    </td>
                    <td className="py-2 font-mono text-xs">{row.protocol}</td>
                    <td className="py-2 text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          SEFAZ direto ligado (`SEFAZ_MODE=real`, UF SP). Ambiente do emitente
          continua em homologação até você trocar para produção. Criptografia
          da senha do certificado é MVP.
        </p>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
