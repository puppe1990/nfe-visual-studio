import { Link } from "@tanstack/react-router";

import { estimateReadingMinutes, formatBlogDate } from "../../domain/blog";
import type { BlogPost } from "../../domain/blog";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="border-t border-[var(--landing-rule)] pt-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.14em] text-[var(--landing-mute)] uppercase">
        <span>{post.tag}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
        <span aria-hidden>·</span>
        <span>{estimateReadingMinutes(post.blocks)} min</span>
      </div>
      <h2 className="landing-display mt-3 text-2xl font-semibold leading-snug">
        <Link
          to="/blog/$slug"
          params={{ slug: post.slug }}
          className="decoration-1 underline-offset-4 hover:underline"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--landing-mute)]">
        {post.description}
      </p>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="mt-4 inline-flex text-sm font-medium underline decoration-1 underline-offset-4"
      >
        Ler artigo
      </Link>
    </article>
  );
}
