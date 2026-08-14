import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "../components/AppShell";
import { ConfigCertificateForm } from "../components/ConfigCertificateForm";
import { ConfigCompanyForm } from "../components/ConfigCompanyForm";
import type { ConfigFormFeedback } from "../components/ConfigFormField";
import { ConfigInutilizationForm } from "../components/ConfigInutilizationForm";
import { ConfigSessionPasswordForm } from "../components/ConfigSessionPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import type { Inutilization } from "../domain/types";
import {
  getActiveCertificateFn,
  getWorkspaceFn,
  listInutilizationsFn,
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

  const feedback: ConfigFormFeedback = {
    saving,
    setSaving,
    setError,
    setSuccess,
  };

  async function onSaved() {
    await router.invalidate();
  }

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
            <ConfigCompanyForm
              company={company}
              feedback={feedback}
              onSaved={onSaved}
            />
          </TabsContent>

          <TabsContent value="sessao">
            <ConfigSessionPasswordForm
              userEmail={data.userEmail}
              feedback={feedback}
            />
          </TabsContent>

          <TabsContent value="certificado">
            <ConfigCertificateForm
              certificate={data.certificate}
              feedback={feedback}
              onSaved={onSaved}
            />
          </TabsContent>

          <TabsContent value="inutilizacao">
            <ConfigInutilizationForm
              inutilizations={data.inutilizations}
              feedback={feedback}
              onSaved={onSaved}
            />
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
