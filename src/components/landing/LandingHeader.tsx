import { Link } from "@tanstack/react-router";
import { FileCheck } from "lucide-react";

import {
  landingPrimaryLabel,
  landingPrimaryTo,
} from "../../lib/landing-session";

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <a href="#topo" className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-[var(--radius)] bg-[var(--landing-ink)] text-[var(--landing-sheet)]">
          <FileCheck className="size-5" />
        </span>
        <span>
          <span className="block font-semibold leading-tight">NFeFácil</span>
          <span className="block text-[11px] tracking-[0.14em] text-[var(--landing-mute)] uppercase">
            Emissão direta
          </span>
        </span>
      </a>
      <nav className="flex items-center gap-1 sm:gap-3">
        <a
          href="#produto"
          className="hidden h-10 items-center px-2 text-sm text-[var(--landing-mute)] hover:text-[var(--landing-ink)] sm:inline-flex"
        >
          Produto
        </a>
        <a
          href="#como"
          className="hidden h-10 items-center px-2 text-sm text-[var(--landing-mute)] hover:text-[var(--landing-ink)] sm:inline-flex"
        >
          Como funciona
        </a>
        <a
          href="#faq"
          className="hidden h-10 items-center px-2 text-sm text-[var(--landing-mute)] hover:text-[var(--landing-ink)] md:inline-flex"
        >
          FAQ
        </a>
        {signedIn ? (
          <Link to={landingPrimaryTo(true)} className="landing-btn">
            {landingPrimaryLabel(true, "header")}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="hidden h-10 items-center px-3 text-sm font-medium text-[var(--landing-mute)] hover:text-[var(--landing-ink)] sm:inline-flex"
            >
              Entrar
            </Link>
            <Link to={landingPrimaryTo(false)} className="landing-btn">
              {landingPrimaryLabel(false, "header")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
