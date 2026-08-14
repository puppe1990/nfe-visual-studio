import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Building2,
  FileCheck,
  KeyRound,
  ShieldCheck,
  Stamp,
} from "lucide-react";

import { getCurrentUserFn } from "../fns/auth-functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NFeFácil — NFS-e e NF-e sem intermediário" },
      {
        name: "description",
        content:
          "Emita NFS-e da Prefeitura de São Paulo e NF-e 55 na SEFAZ com o seu certificado A1. Sem provedor no meio.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Figtree:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  loader: async () => {
    const me = await getCurrentUserFn();
    return { signedIn: me.ok };
  },
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = Route.useLoaderData();

  return (
    <div className="landing min-h-screen text-[var(--landing-ink)]">
      <div className="landing-grain" aria-hidden />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#topo" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <FileCheck className="size-5" />
          </span>
          <span>
            <span className="block font-semibold leading-tight">NFeFácil</span>
            <span className="block text-[11px] tracking-[0.14em] text-[var(--landing-mute)] uppercase">
              Emissão direta
            </span>
          </span>
        </a>
        <nav className="flex items-center gap-2 sm:gap-3">
          {signedIn ? (
            <Link
              to="/painel"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Abrir painel
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden h-10 items-center px-3 text-sm font-medium text-[var(--landing-mute)] hover:text-[var(--landing-ink)] sm:inline-flex"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main id="topo" className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--landing-rule)] bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              <Stamp className="size-3.5" />
              Pref. SP · SEFAZ
            </p>
            <h1 className="landing-display text-[2.7rem] leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              A nota sai daqui.
              <span className="mt-1 block whitespace-nowrap">Sem atravessador.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--landing-mute)] sm:text-lg">
              NFS-e da Prefeitura de São Paulo e NF-e 55 na SEFAZ, assinadas com
              o seu certificado A1. O XML vai direto ao webservice oficial.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {signedIn ? (
                <Link
                  to="/painel"
                  className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)]"
                >
                  Continuar no painel
                </Link>
              ) : (
                <>
                  <Link
                    to="/cadastro"
                    className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)]"
                  >
                    Começar a emitir
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center rounded-md border border-[var(--landing-rule)] bg-white/80 px-6 text-sm font-semibold"
                  >
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="landing-sheet relative overflow-hidden rounded-2xl border border-[var(--landing-rule)] bg-[var(--landing-sheet)] p-6 shadow-[var(--shadow-lift)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.18em] text-[var(--landing-mute)] uppercase">
                  Recibo provisório
                </p>
                <p className="landing-display mt-1 text-2xl font-semibold">
                  RPS A / 0072
                </p>
              </div>
              <span className="rounded-full bg-[color-mix(in_oklch,var(--success)_18%,white)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                Autorizada
              </span>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-dashed border-[var(--landing-rule)] pb-3">
                <dt className="text-[var(--landing-mute)]">Tomador</dt>
                <dd className="text-right font-medium">Avant Projetos Ltda</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-dashed border-[var(--landing-rule)] pb-3">
                <dt className="text-[var(--landing-mute)]">Serviço</dt>
                <dd className="text-right font-medium">01880 · assistência</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--landing-mute)]">Valor</dt>
                <dd className="landing-display text-right text-2xl font-semibold">
                  R$ 2.000,00
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-[11px] tracking-[0.12em] text-[var(--landing-mute)] uppercase">
              Envio RPS · Pref. São Paulo · A1
            </p>
          </div>
        </section>

        <section className="border-y border-[var(--landing-rule)] bg-white/50">
          <div className="mx-auto grid max-w-6xl gap-px bg-[var(--landing-rule)] sm:grid-cols-2">
            <article className="bg-[var(--landing-paper)] px-6 py-10 sm:px-10">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
                Serviço
              </p>
              <h2 className="landing-display mt-2 text-3xl font-semibold">
                NFS-e Paulistana
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--landing-mute)]">
                RPS assinado, lista oficial de códigos e impressão no portal da
                Prefeitura. Importa o histórico que já existe no município.
              </p>
            </article>
            <article className="bg-[var(--landing-paper)] px-6 py-10 sm:px-10">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
                Mercadoria
              </p>
              <h2 className="landing-display mt-2 text-3xl font-semibold">
                NF-e modelo 55
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--landing-mute)]">
                XML 4.00, autorização, cancelamento e inutilização direto nos
                webservices da SEFAZ da UF do emitente.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
            Feito para quem já emite de verdade
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<KeyRound className="size-4" />}
              title="Certificado A1"
              text="Assinatura XMLDSig e mTLS com o PFX da empresa. Nada de token de terceiro."
            />
            <Feature
              icon={<ShieldCheck className="size-4" />}
              title="Webservice oficial"
              text="Pref. SP para serviço, SEFAZ para mercadoria. Sem Focus, sem TecnoSpeed."
            />
            <Feature
              icon={<Building2 className="size-4" />}
              title="Multi-empresa"
              text="Cada e-mail só vê as empresas vinculadas. Login, senha e sessão próprias."
            />
            <Feature
              icon={<FileCheck className="size-4" />}
              title="Painel operacional"
              text="Filtro, ordenação e páginas de 10. PDF da nota e histórico municipal."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <ol className="grid gap-6 sm:grid-cols-3">
            <Step n="01" title="Cadastre o emitente" text="CNPJ, CCM e o A1 em Configurações." />
            <Step n="02" title="Inclua o tomador" text="Cliente com documento e endereço." />
            <Step n="03" title="Emita a nota" text="NFS-e agora, NF-e quando a SEFAZ estiver no modo real." />
          </ol>
        </section>

        <section className="border-t border-[var(--landing-rule)]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center sm:px-8">
            <h2 className="landing-display max-w-lg text-3xl font-semibold sm:text-4xl">
              Pronto para a próxima NFS-e.
            </h2>
            {signedIn ? (
              <Link
                to="/painel"
                className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Abrir painel
              </Link>
            ) : (
              <Link
                to="/cadastro"
                className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Criar conta grátis
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--landing-rule)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[var(--landing-mute)] sm:px-8">
          <span>NFeFácil · emissão direta de NFS-e e NF-e</span>
          <a
            href="https://github.com/puppe1990/nfe-visual-studio"
            className="hover:text-[var(--landing-ink)]"
          >
            Código no GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--landing-rule)] bg-white/70 p-5">
      <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--landing-mute)]">{text}</p>
    </article>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="border-t border-[var(--landing-rule)] pt-4">
      <p className="landing-display text-sm text-primary">{n}</p>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--landing-mute)]">{text}</p>
    </li>
  );
}
