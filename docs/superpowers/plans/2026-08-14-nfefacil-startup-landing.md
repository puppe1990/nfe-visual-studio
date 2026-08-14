# NFeFácil Startup Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the public `/` route as a papel-timbrado startup landing that converts an emitente to `/cadastro` (or `/painel` if signed in).

**Architecture:** Keep `/` public. `index.tsx` only loads session and composes sections. Session and copy live in `src/lib/landing-*.ts` (tested). Each section is one file under `src/components/landing/`. Visual tokens stay in `src/styles.css` under `.landing*`. No AppShell, no SOAP, no pricing.

**Tech Stack:** TanStack Start / Router, React 19, Tailwind v4, existing Fraunces + Figtree, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-14-nfefacil-startup-landing-design.md`

---

## File map

| File | Role |
|---|---|
| Create `src/lib/landing-session.ts` | `landingSignedIn`, `landingPrimaryTo`, `landingPrimaryLabel` |
| Create `src/lib/landing-session.test.ts` | session + CTA href/label |
| Create `src/lib/landing-copy.ts` | proof facts, products, steps, FAQ, RPS mock |
| Create `src/lib/landing-copy.test.ts` | four FAQ + four proof facts |
| Create `src/components/landing/LandingHeader.tsx` | nav + session CTAs |
| Create `src/components/landing/LandingHero.tsx` | headline + RPS sheet |
| Create `src/components/landing/LandingProofStrip.tsx` | four facts |
| Create `src/components/landing/LandingProducts.tsx` | NFS-e / NF-e |
| Create `src/components/landing/LandingHowItWorks.tsx` | three steps |
| Create `src/components/landing/LandingFaq.tsx` | four questions |
| Create `src/components/landing/LandingCta.tsx` | closing CTA |
| Create `src/components/landing/LandingFooter.tsx` | footer |
| Modify `src/styles.css` lines 5–36 | warmer ink, paper button, hero motion |
| Modify `src/routes/index.tsx` | compose sections; drop inline Feature/Step |
| Do not modify | `src/routes/__root.tsx` (`/` already in `publicPaths`) |

Do not fetch invoices, certificates, or Pref. SP from the landing loader.

---

### Task 1: Session helpers (TDD)

**Files:**
- Create: `src/lib/landing-session.ts`
- Test: `src/lib/landing-session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  landingPrimaryLabel,
  landingPrimaryTo,
  landingSignedIn,
} from "./landing-session";

describe("landingSignedIn", () => {
  it("is true only when the session result is ok", () => {
    expect(landingSignedIn({ ok: true })).toBe(true);
    expect(landingSignedIn({ ok: false })).toBe(false);
  });
});

describe("landingPrimaryTo", () => {
  it("sends visitors to cadastro and members to painel", () => {
    expect(landingPrimaryTo(false)).toBe("/cadastro");
    expect(landingPrimaryTo(true)).toBe("/painel");
  });
});

describe("landingPrimaryLabel", () => {
  it("uses the spec labels per surface", () => {
    expect(landingPrimaryLabel(false, "header")).toBe("Criar conta");
    expect(landingPrimaryLabel(false, "hero")).toBe("Começar a emitir");
    expect(landingPrimaryLabel(false, "cta")).toBe("Criar conta grátis");
    expect(landingPrimaryLabel(true, "header")).toBe("Abrir painel");
    expect(landingPrimaryLabel(true, "hero")).toBe("Continuar no painel");
    expect(landingPrimaryLabel(true, "cta")).toBe("Abrir painel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/landing-session.test.ts`

Expected: FAIL — `Cannot find module './landing-session'`

- [ ] **Step 3: Write minimal implementation**

```ts
export type LandingSurface = "header" | "hero" | "cta";

export function landingSignedIn(result: { ok: boolean }): boolean {
  return result.ok === true;
}

export function landingPrimaryTo(signedIn: boolean): "/cadastro" | "/painel" {
  return signedIn ? "/painel" : "/cadastro";
}

export function landingPrimaryLabel(
  signedIn: boolean,
  surface: LandingSurface,
): string {
  if (signedIn) {
    return surface === "hero" ? "Continuar no painel" : "Abrir painel";
  }
  if (surface === "hero") return "Começar a emitir";
  if (surface === "cta") return "Criar conta grátis";
  return "Criar conta";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/landing-session.test.ts`

Expected: PASS (3 files not required — 3 describe blocks, 3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/landing-session.ts src/lib/landing-session.test.ts
git commit -m "test: landing session CTAs follow signed-in spec"
```

---

### Task 2: Landing copy (TDD)

**Files:**
- Create: `src/lib/landing-copy.ts`
- Test: `src/lib/landing-copy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { LANDING_FAQ, LANDING_PROOF } from "./landing-copy";

describe("LANDING_FAQ", () => {
  it("is exactly the four spec questions", () => {
    expect(LANDING_FAQ.map((item) => item.q)).toEqual([
      "Preciso de certificado A1?",
      "Emite NFS-e fora de São Paulo?",
      "Vocês passam por Focus ou TecnoSpeed?",
      "Tem mensalidade?",
    ]);
  });
});

describe("LANDING_PROOF", () => {
  it("lists four official facts and no quotes", () => {
    expect(LANDING_PROOF).toHaveLength(4);
    expect(LANDING_PROOF.join(" ")).not.toMatch(/[“”"]/);
    expect(LANDING_PROOF).toEqual([
      "Prefeitura de São Paulo",
      "SEFAZ direta",
      "Certificado A1",
      "Sem Focus / TecnoSpeed",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/landing-copy.test.ts`

Expected: FAIL — `Cannot find module './landing-copy'`

- [ ] **Step 3: Write the copy module**

```ts
export const LANDING_PROOF = [
  "Prefeitura de São Paulo",
  "SEFAZ direta",
  "Certificado A1",
  "Sem Focus / TecnoSpeed",
] as const;

export const LANDING_PRODUCTS = [
  {
    kicker: "Serviço",
    title: "NFS-e Paulistana",
    text: "RPS assinado, lista oficial de códigos e PDF no portal da Prefeitura. Você importa o histórico que já existe no município.",
  },
  {
    kicker: "Mercadoria",
    title: "NF-e modelo 55",
    text: "XML 4.00, autorização, cancelamento e inutilização direto nos webservices da SEFAZ da UF do emitente.",
  },
] as const;

export const LANDING_STEPS = [
  {
    n: "01",
    title: "Cadastre o emitente",
    text: "CNPJ, CCM e o certificado A1 em Configurações.",
  },
  {
    n: "02",
    title: "Inclua o tomador",
    text: "Cliente com documento e endereço — você emite no nome da sua empresa.",
  },
  {
    n: "03",
    title: "Emita a nota",
    text: "NFS-e agora. NF-e quando a SEFAZ estiver no modo real.",
  },
] as const;

export const LANDING_FAQ = [
  {
    q: "Preciso de certificado A1?",
    a: "Sim, o PFX da empresa. Sem token de terceiro.",
  },
  {
    q: "Emite NFS-e fora de São Paulo?",
    a: "Não. Serviço é Pref. SP (Nota do Milhão). Mercadoria é SEFAZ da UF do emitente.",
  },
  {
    q: "Vocês passam por Focus ou TecnoSpeed?",
    a: "Não. SOAP + mTLS no webservice oficial.",
  },
  {
    q: "Tem mensalidade?",
    a: "Conta grátis neste momento. Sem tabela de planos nesta página.",
  },
] as const;

export const LANDING_RPS = {
  series: "A",
  number: "0072",
  customer: "Avant Projetos Ltda",
  service: "01880 · assistência",
  amount: "R$ 2.000,00",
} as const;

export const LANDING_GITHUB =
  "https://github.com/puppe1990/nfe-visual-studio";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/landing-copy.test.ts`

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/landing-copy.ts src/lib/landing-copy.test.ts
git commit -m "feat: lock landing proof and FAQ copy"
```

---

### Task 3: Papel timbrado tokens

**Files:**
- Modify: `src/styles.css` (the `.landing`, `.landing-display`, `.landing-grain` block at the top)

- [ ] **Step 1: Replace the landing token block**

Replace lines 5–36 with:

```css
.landing {
  --landing-ink: oklch(0.18 0.02 70);
  --landing-mute: oklch(0.45 0.02 70);
  --landing-rule: oklch(0.86 0.02 85);
  --landing-paper: oklch(0.96 0.015 90);
  --landing-sheet: oklch(0.99 0.01 95);
  font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
  background-color: var(--landing-paper);
  background-image:
    linear-gradient(180deg, oklch(0.93 0.025 85 / 0.7), transparent 28rem),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 27px,
      oklch(0.18 0.02 70 / 0.05) 28px
    );
  color: var(--landing-ink);
}

.landing-display {
  font-family: Fraunces, ui-serif, Georgia, serif;
  font-optical-sizing: auto;
}

.landing-grain {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 0;
  opacity: 0.2;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.landing-btn {
  display: inline-flex;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--landing-ink);
  padding: 0 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--landing-sheet);
}

.landing-btn:hover {
  opacity: 0.92;
}

.landing-btn-ghost {
  display: inline-flex;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--landing-rule);
  border-radius: var(--radius);
  background: color-mix(in oklch, var(--landing-sheet) 80%, transparent);
  padding: 0 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--landing-ink);
}

.landing-sheet {
  background: var(--landing-sheet);
  box-shadow:
    0 1px 0 oklch(0.18 0.02 70 / 0.06),
    0 18px 40px oklch(0.18 0.02 70 / 0.08);
}

@keyframes landing-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.landing-hero-in {
  animation: landing-rise 0.65s ease both;
}

.landing-hero-in-delay {
  animation: landing-rise 0.65s ease 0.08s both;
}
```

Do not change `:root` `--primary`. Landing buttons must not use `bg-primary`.

- [ ] **Step 2: Typecheck still passes (CSS-only change)**

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style: warm paper tokens and ink buttons for landing"
```

---

### Task 4: LandingHeader

**Files:**
- Create: `src/components/landing/LandingHeader.tsx`

- [ ] **Step 1: Write the header**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/LandingHeader.tsx
git commit -m "feat: landing header with product anchors"
```

---

### Task 5: LandingHero

**Files:**
- Create: `src/components/landing/LandingHero.tsx`

- [ ] **Step 1: Write the hero + RPS sheet**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/LandingHero.tsx
git commit -m "feat: landing hero with paper RPS sheet"
```

---

### Task 6: Proof, products, how-it-works

**Files:**
- Create: `src/components/landing/LandingProofStrip.tsx`
- Create: `src/components/landing/LandingProducts.tsx`
- Create: `src/components/landing/LandingHowItWorks.tsx`

- [ ] **Step 1: Write LandingProofStrip.tsx**

```tsx
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
```

- [ ] **Step 2: Write LandingProducts.tsx**

```tsx
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
```

- [ ] **Step 3: Write LandingHowItWorks.tsx**

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LandingProofStrip.tsx src/components/landing/LandingProducts.tsx src/components/landing/LandingHowItWorks.tsx
git commit -m "feat: landing proof, products and how-it-works"
```

---

### Task 7: FAQ, CTA, footer

**Files:**
- Create: `src/components/landing/LandingFaq.tsx`
- Create: `src/components/landing/LandingCta.tsx`
- Create: `src/components/landing/LandingFooter.tsx`

- [ ] **Step 1: Write LandingFaq.tsx**

```tsx
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
```

- [ ] **Step 2: Write LandingCta.tsx**

```tsx
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
```

- [ ] **Step 3: Write LandingFooter.tsx**

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LandingFaq.tsx src/components/landing/LandingCta.tsx src/components/landing/LandingFooter.tsx
git commit -m "feat: landing FAQ, closing CTA and footer"
```

---

### Task 8: Compose `/` and drop the old page

**Files:**
- Modify: `src/routes/index.tsx` (replace entire file)

- [ ] **Step 1: Replace `src/routes/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { LandingCta } from "../components/landing/LandingCta";
import { LandingFaq } from "../components/landing/LandingFaq";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingHowItWorks } from "../components/landing/LandingHowItWorks";
import { LandingProducts } from "../components/landing/LandingProducts";
import { LandingProofStrip } from "../components/landing/LandingProofStrip";
import { getCurrentUserFn } from "../fns/auth-functions";
import { landingSignedIn } from "../lib/landing-session";

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
    return { signedIn: landingSignedIn(me) };
  },
  component: LandingPage,
});

function LandingPage() {
  const { signedIn } = Route.useLoaderData();

  return (
    <div className="landing min-h-screen">
      <div className="landing-grain" aria-hidden />
      <LandingHeader signedIn={signedIn} />
      <main id="topo" className="relative z-10">
        <LandingHero signedIn={signedIn} />
        <LandingProofStrip />
        <LandingProducts />
        <LandingHowItWorks />
        <LandingFaq />
        <LandingCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
```

Confirm `index.tsx` is under 200 lines and does not import `AppShell`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 3: Run the landing tests + full suite**

Run: `npm test`

Expected: all previous tests plus the new landing-session and landing-copy tests pass.

- [ ] **Step 4: Manual check**

Run: `npm run dev` (or use the existing local server). Open `/`.

- Desktop: seven sections visible; anchors `#produto` `#como` `#faq` scroll; RPS looks like a sheet, not an admin card; buttons are ink, not app-primary blue.
- Mobile: header keeps logo + Criar conta; product/FAQ anchors may hide; stacked columns.
- Logged out: primary CTA → `/cadastro`, ghost → `/login`.
- Logged in: primary CTA → `/painel`. No AppShell chrome.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: compose startup landing on public /"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Header + anchors + session CTAs | 4, 8 |
| Hero copy + RPS Avant / 01880 / R$ 2.000 | 5 |
| Proof strip four facts | 2, 6 |
| NFS-e / NF-e products | 2, 6 |
| How-it-works three steps, “você emite” | 2, 6 |
| FAQ four exact questions | 2, 7 |
| CTA + GitHub footer | 7 |
| Papel timbrado, Fraunces/Figtree, ink button | 3 |
| Hero motion only | 3, 5 |
| Loader fail → signed out, page still renders | 1, 8 |
| `/` stays public | no change to `__root.tsx` |
| No pricing / testimonials / AppShell / SOAP | omitted |
| Files < 300, index < 200 | 4–8 |

## Placeholder / type check

- Helpers: `landingSignedIn`, `landingPrimaryTo`, `landingPrimaryLabel`, `LandingSurface`.
- Copy exports: `LANDING_PROOF`, `LANDING_PRODUCTS`, `LANDING_STEPS`, `LANDING_FAQ`, `LANDING_RPS`, `LANDING_GITHUB`.
- Section props: `{ signedIn: boolean }` only on Header, Hero, Cta.
- No TBD, no “add tests later”, no “similar to Task N” without code.
