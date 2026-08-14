import { useState } from "react";

import type { Company, SefazEnvironment, TaxRegime } from "../domain/types";
import {
  consultIssuerCnpjFn,
  updateCompanyFn,
} from "../fns/nfe-functions";
import {
  ConfigFormField,
  type ConfigFormFeedback,
} from "./ConfigFormField";

export function ConfigCompanyForm({
  company,
  feedback,
  onSaved,
}: {
  company: Company;
  feedback: ConfigFormFeedback;
  onSaved: () => Promise<void>;
}) {
  const { saving, setSaving, setError, setSuccess } = feedback;
  const [name, setName] = useState(company.name);
  const [tradeName, setTradeName] = useState(company.tradeName ?? "");
  const [stateRegistration, setStateRegistration] = useState(
    company.stateRegistration ?? "",
  );
  const [email, setEmail] = useState(company.email ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [city, setCity] = useState(company.city ?? "");
  const [state, setState] = useState(company.state ?? "");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(company.taxRegime);
  const [nfeSeries, setNfeSeries] = useState(String(company.nfeSeries));
  const [nextNfeNumber, setNextNfeNumber] = useState(
    String(company.nextNfeNumber),
  );
  const [municipalRegistration, setMunicipalRegistration] = useState(
    company.municipalRegistration ?? "",
  );
  const [rpsSeries, setRpsSeries] = useState(company.rpsSeries);
  const [nextRpsNumber, setNextRpsNumber] = useState(
    String(company.nextRpsNumber),
  );
  const [sefazEnvironment, setSefazEnvironment] = useState<SefazEnvironment>(
    company.sefazEnvironment,
  );

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
    await onSaved();
  }

  return (
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
        <ConfigFormField
          label="Razão social"
          value={name}
          onChange={setName}
          required
        />
        <ConfigFormField
          label="Nome fantasia"
          value={tradeName}
          onChange={setTradeName}
        />
        <ConfigFormField
          label="Inscrição estadual"
          value={stateRegistration}
          onChange={setStateRegistration}
        />
        <ConfigFormField label="E-mail" value={email} onChange={setEmail} />
        <ConfigFormField label="Telefone" value={phone} onChange={setPhone} />
        <ConfigFormField label="Cidade" value={city} onChange={setCity} />
        <ConfigFormField label="UF" value={state} onChange={setState} />
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
        <ConfigFormField
          label="Série NF-e"
          value={nfeSeries}
          onChange={setNfeSeries}
        />
        <ConfigFormField
          label="Próximo número NF-e"
          value={nextNfeNumber}
          onChange={setNextNfeNumber}
        />
        <ConfigFormField
          label="Inscrição municipal (CCM)"
          value={municipalRegistration}
          onChange={setMunicipalRegistration}
        />
        <ConfigFormField
          label="Série RPS"
          value={rpsSeries}
          onChange={setRpsSeries}
        />
        <ConfigFormField
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
  );
}
