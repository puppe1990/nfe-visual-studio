import { LANDING_GITHUB } from "../../lib/landing-copy";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--landing-rule)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[var(--landing-mute)] sm:px-8">
        <span>NFeFácil · emissão direta de NFS-e e NF-e</span>
        <a href={LANDING_GITHUB} className="hover:text-[var(--landing-ink)]">
          Código no GitHub
        </a>
      </div>
    </footer>
  );
}
