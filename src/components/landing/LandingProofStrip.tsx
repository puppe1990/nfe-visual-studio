import { LANDING_PROOF } from "../../lib/landing-copy";

export function LandingProofStrip() {
  return (
    <section
      id="prova"
      className="border-y border-[var(--landing-rule)] bg-[color-mix(in_oklch,var(--landing-sheet)_70%,transparent)]"
    >
      <ul className="mx-auto grid max-w-6xl gap-px bg-[var(--landing-rule)] sm:grid-cols-4">
        {LANDING_PROOF.map((fact) => (
          <li
            key={fact}
            className="bg-[var(--landing-paper)] px-5 py-5 text-center text-[12px] font-semibold tracking-[0.12em] uppercase"
          >
            {fact}
          </li>
        ))}
      </ul>
    </section>
  );
}
