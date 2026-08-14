import { Link } from "@tanstack/react-router";
import { Stamp } from "lucide-react";

import { LANDING_RPS } from "../../lib/landing-copy";
import {
  landingPrimaryLabel,
  landingPrimaryTo,
} from "../../lib/landing-session";

export function LandingHero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
      <div className="landing-hero-in">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--landing-rule)] bg-[var(--landing-sheet)]/70 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--landing-ink)] uppercase">
          <Stamp className="size-3.5" />
          Pref. SP · SEFAZ
        </p>
        <h1 className="landing-display text-[2.7rem] leading-[1.08] font-semibold tracking-tight sm:text-6xl">
          A nota sai daqui.
          <span className="mt-1 block">Sem atravessador.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--landing-mute)] sm:text-lg">
          NFS-e da Prefeitura de São Paulo e NF-e 55 na SEFAZ, assinadas com o
          certificado A1 da sua empresa. O XML vai direto ao webservice oficial.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to={landingPrimaryTo(signedIn)} className="landing-btn h-12 px-6">
            {landingPrimaryLabel(signedIn, "hero")}
          </Link>
          {!signedIn && (
            <Link to="/login" className="landing-btn-ghost h-12 px-6">
              Já tenho conta
            </Link>
          )}
        </div>
      </div>

      <div className="landing-sheet landing-hero-in-delay relative overflow-hidden rounded-[var(--radius)] border border-[var(--landing-rule)] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-[var(--landing-mute)] uppercase">
              Recibo provisório
            </p>
            <p className="landing-display mt-1 text-2xl font-semibold">
              RPS {LANDING_RPS.series} / {LANDING_RPS.number}
            </p>
          </div>
          <span className="rounded-full border border-[var(--landing-rule)] px-2.5 py-1 text-[11px] font-semibold">
            Autorizada
          </span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-dashed border-[var(--landing-rule)] pb-3">
            <dt className="text-[var(--landing-mute)]">Tomador</dt>
            <dd className="text-right font-medium">{LANDING_RPS.customer}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-dashed border-[var(--landing-rule)] pb-3">
            <dt className="text-[var(--landing-mute)]">Serviço</dt>
            <dd className="text-right font-medium">{LANDING_RPS.service}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--landing-mute)]">Valor</dt>
            <dd className="landing-display text-right text-2xl font-semibold">
              {LANDING_RPS.amount}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-[11px] tracking-[0.12em] text-[var(--landing-mute)] uppercase">
          Envio RPS · Pref. São Paulo · A1
        </p>
      </div>
    </section>
  );
}
