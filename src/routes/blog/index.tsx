import { createFileRoute } from "@tanstack/react-router";

import { BlogCard } from "../../components/blog/BlogCard";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { LandingHeader } from "../../components/landing/LandingHeader";
import { listBlogPosts } from "../../domain/blog";
import { absoluteUrl } from "../../domain/blog-sitemap";
import { OG_IMAGE_URL, SITE_URL } from "../../lib/site";
import { readVisitorSignedIn } from "../../lib/visitor-session";

const BLOG_TITLE = "Blog NFeFácil — NFS-e, NF-e e certificado A1";
const BLOG_DESCRIPTION =
  "Guias curtos sobre NFS-e paulistana, NF-e 55 e certificado A1: o que conferir antes de emitir e o que muda ao falar direto com a Prefeitura e a SEFAZ.";
const BLOG_URL = absoluteUrl(SITE_URL, "/blog");

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: BLOG_TITLE },
      { name: "description", content: BLOG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: BLOG_URL },
      { property: "og:title", content: BLOG_TITLE },
      { property: "og:description", content: BLOG_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: BLOG_TITLE },
      { name: "twitter:description", content: BLOG_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [
      { rel: "canonical", href: BLOG_URL },
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
  loader: async () => ({ signedIn: await readVisitorSignedIn() }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { signedIn } = Route.useLoaderData();
  const posts = listBlogPosts();

  return (
    <div className="landing min-h-screen">
      <div className="landing-grain" aria-hidden />
      <LandingHeader signedIn={signedIn} />
      <main className="relative z-10 mx-auto max-w-4xl px-5 py-14 sm:px-8">
        <p className="text-[11px] tracking-[0.14em] text-[var(--landing-mute)] uppercase">Blog</p>
        <h1 className="landing-display mt-3 text-4xl font-semibold sm:text-5xl">
          Nota fiscal sem mistério
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--landing-mute)]">
          O que a Prefeitura e a SEFAZ exigem, explicado sem jargão de contabilidade. Guias curtos
          para quem emite sozinho.
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
