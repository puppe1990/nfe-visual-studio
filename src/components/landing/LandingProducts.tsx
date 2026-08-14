import { LANDING_PRODUCTS } from "../../lib/landing-copy";

export function LandingProducts() {
  return (
    <section id="produto" className="border-b border-[var(--landing-rule)]">
      <div className="mx-auto grid max-w-6xl gap-px bg-[var(--landing-rule)] sm:grid-cols-2">
        {LANDING_PRODUCTS.map((product) => (
          <article
            key={product.title}
            className="bg-[var(--landing-paper)] px-6 py-12 sm:px-10"
          >
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              {product.kicker}
            </p>
            <h2 className="landing-display mt-2 text-3xl font-semibold">
              {product.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--landing-mute)]">
              {product.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
