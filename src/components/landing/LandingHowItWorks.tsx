import { LANDING_STEPS } from "../../lib/landing-copy";

export function LandingHowItWorks() {
  return (
    <section id="como" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
        Como você emite
      </h2>
      <ol className="mt-10 grid gap-6 sm:grid-cols-3">
        {LANDING_STEPS.map((step) => (
          <li key={step.n} className="border-t border-[var(--landing-rule)] pt-4">
            <p className="landing-display text-sm">{step.n}</p>
            <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-[var(--landing-mute)]">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
