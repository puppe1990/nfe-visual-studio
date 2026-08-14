import { LANDING_FAQ } from "../../lib/landing-copy";

export function LandingFaq() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <h2 className="landing-display text-3xl font-semibold sm:text-4xl">
        Perguntas de quem já emite
      </h2>
      <dl className="mt-10 divide-y divide-[var(--landing-rule)] border-y border-[var(--landing-rule)]">
        {LANDING_FAQ.map((item) => (
          <div key={item.q} className="grid gap-2 py-6 sm:grid-cols-[1fr_1.2fr]">
            <dt className="font-semibold">{item.q}</dt>
            <dd className="text-sm leading-relaxed text-[var(--landing-mute)]">
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
