import { useState } from "react";

import type { CompanyCertificate } from "../domain/certificates";
import { registerCertificateFn } from "../fns/nfe-functions";
import {
  ConfigFormField,
  type ConfigFormFeedback,
} from "./ConfigFormField";

export function ConfigCertificateForm({
  certificate,
  feedback,
  onSaved,
}: {
  certificate: CompanyCertificate | null;
  feedback: ConfigFormFeedback;
  onSaved: () => Promise<void>;
}) {
  const { saving, setSaving, setError, setSuccess } = feedback;
  const [certSubject, setCertSubject] = useState("");
  const [certSerial, setCertSerial] = useState("");
  const [certPassword, setCertPassword] = useState("");
  const [certPfx, setCertPfx] = useState("");

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
    await onSaved();
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

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="font-semibold">Certificado digital A1</h2>
      {certificate ? (
        <p className="text-sm text-muted-foreground">
          Ativo:{" "}
          <strong className="text-foreground">{certificate.subject}</strong>
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
        <ConfigFormField
          label="Assunto / CN"
          value={certSubject}
          onChange={setCertSubject}
          required
        />
        <ConfigFormField
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
        <ConfigFormField
          label="Senha do certificado"
          value={certPassword}
          onChange={setCertPassword}
          type="password"
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
  );
}
