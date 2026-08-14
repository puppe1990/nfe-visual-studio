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
