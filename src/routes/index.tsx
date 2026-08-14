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
import {
  OG_IMAGE_URL,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
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
