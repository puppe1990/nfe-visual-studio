import { Link } from "@tanstack/react-router";

import { LANDING_GITHUB } from "../../lib/landing-copy";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--landing-rule)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[var(--landing-mute)] sm:px-8">
        <span>NFeFácil · emissão direta de NFS-e e NF-e</span>
        <span className="flex flex-wrap items-center gap-4">
          <Link to="/blog" className="hover:text-[var(--landing-ink)]">
            Blog
          </Link>
          <a href="/sitemap.xml" className="hover:text-[var(--landing-ink)]">
            Sitemap
          </a>
          <a href={LANDING_GITHUB} className="hover:text-[var(--landing-ink)]">
            Código no GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
