import type { BlogPost } from "../domain/blog";

export const SITEMAP_STATIC_PATHS = ["/", "/blog"] as const;

export const ROBOTS_DISALLOW = [
  "/painel",
  "/nfse",
  "/emitir-nfse",
  "/notas",
  "/emitir",
  "/clientes",
  "/produtos",
  "/configuracoes",
] as const;

const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export type SitemapEntry = {
  path: string;
  lastModified?: string;
};

export function buildSitemapEntries(posts: readonly BlogPost[]): SitemapEntry[] {
  const entries: SitemapEntry[] = SITEMAP_STATIC_PATHS.map((path) => ({ path }));
  const knownPaths = new Set(entries.map((entry) => entry.path));

  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    if (knownPaths.has(path)) continue;
    knownPaths.add(path);
    entries.push({ path, lastModified: post.updatedAt ?? post.publishedAt });
  }

  return entries;
}

export function renderSitemapXml(entries: readonly SitemapEntry[], siteUrl: string): string {
  const urls = entries.map((entry) => renderUrlEntry(entry, siteUrl)).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobotsTxt(siteUrl: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function escapeXmlText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ENTITIES[character]);
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function renderUrlEntry(entry: SitemapEntry, siteUrl: string): string {
  const lines = [`    <loc>${escapeXmlText(absoluteUrl(siteUrl, entry.path))}</loc>`];
  if (entry.lastModified) {
    lines.push(`    <lastmod>${escapeXmlText(entry.lastModified)}</lastmod>`);
  }
  return ["  <url>", ...lines, "  </url>"].join("\n");
}
