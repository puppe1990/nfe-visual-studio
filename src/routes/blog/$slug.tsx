import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { BlogPostBody } from "../../components/blog/BlogPostBody";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { LandingHeader } from "../../components/landing/LandingHeader";
import { blogPath, estimateReadingMinutes, formatBlogDate, getBlogPost } from "../../domain/blog";
import { absoluteUrl } from "../../domain/blog-sitemap";
import { landingPrimaryLabel, landingPrimaryTo } from "../../lib/landing-session";
import { OG_IMAGE_URL, SITE_URL } from "../../lib/site";
import { readVisitorSignedIn } from "../../lib/visitor-session";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return { post, signedIn: await readVisitorSignedIn() };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post } = loaderData;
    const url = absoluteUrl(SITE_URL, blogPath(post.slug));
    return {
      meta: [
        { title: `${post.title} — NFeFácil` },
        { name: "description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:image", content: OG_IMAGE_URL },
        { property: "article:published_time", content: post.publishedAt },
        { property: "article:tag", content: post.tag },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { name: "twitter:image", content: OG_IMAGE_URL },
      ],
      links: [
        { rel: "canonical", href: url },
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
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post, signedIn } = Route.useLoaderData();

  return (
    <div className="landing min-h-screen">
      <div className="landing-grain" aria-hidden />
      <LandingHeader signedIn={signedIn} />
      <main className="relative z-10 mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <Link
          to="/blog"
          className="text-sm text-[var(--landing-mute)] hover:text-[var(--landing-ink)]"
        >
          ← Blog
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.14em] text-[var(--landing-mute)] uppercase">
          <span>{post.tag}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{estimateReadingMinutes(post.blocks)} min de leitura</span>
        </div>
        <h1 className="landing-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--landing-mute)]">
          {post.description}
        </p>
        <BlogPostBody blocks={post.blocks} />
        <div className="mt-12 border-t border-[var(--landing-rule)] pt-6">
          <Link to={landingPrimaryTo(signedIn)} className="landing-btn">
            {landingPrimaryLabel(signedIn, "cta")}
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
