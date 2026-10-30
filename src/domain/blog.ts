import { BLOG_POSTS } from "../content/blog";
import type { BlogBlock, BlogPost } from "../content/blog/post-types";

export type { BlogBlock, BlogPost } from "../content/blog/post-types";

const WORDS_PER_MINUTE = 200;

const BLOG_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function sortBlogPosts(posts: readonly BlogPost[]): BlogPost[] {
  return [...posts].sort((left, right) => {
    if (left.publishedAt !== right.publishedAt) {
      return right.publishedAt.localeCompare(left.publishedAt);
    }
    return left.slug.localeCompare(right.slug);
  });
}

export function findBlogPost(posts: readonly BlogPost[], slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}

export function listBlogPosts(): BlogPost[] {
  return sortBlogPosts(BLOG_POSTS);
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return findBlogPost(BLOG_POSTS, slug);
}

export function blogPath(slug: string): string {
  return `/blog/${slug}`;
}

export function postLastModified(post: BlogPost): string {
  return post.updatedAt ?? post.publishedAt;
}

export function formatBlogDate(isoDate: string): string {
  return BLOG_DATE_FORMATTER.format(new Date(`${isoDate}T12:00:00Z`));
}

export function estimateReadingMinutes(blocks: readonly BlogBlock[]): number {
  const words = blocks.reduce((total, block) => total + blockWordCount(block), 0);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function blockWordCount(block: BlogBlock): number {
  switch (block.kind) {
    case "list":
      return block.items.reduce((total, item) => total + wordCount(item), 0);
    case "callout":
      return wordCount(block.title) + wordCount(block.text);
    default:
      return wordCount(block.text);
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
