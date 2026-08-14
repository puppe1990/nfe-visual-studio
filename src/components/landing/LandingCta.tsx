import { Link } from "@tanstack/react-router";

import {
  landingPrimaryLabel,
  landingPrimaryTo,
} from "../../lib/landing-session";

export function LandingCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-t border-[var(--landing-rule)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center sm:px-8">
        <h2 className="landing-display max-w-lg text-3xl font-semibold sm:text-4xl">
          Pronto para a próxima NFS-e.
        </h2>
        <Link to={landingPrimaryTo(signedIn)} className="landing-btn h-12 px-6">
          {landingPrimaryLabel(signedIn, "cta")}
        </Link>
      </div>
    </section>
  );
}
