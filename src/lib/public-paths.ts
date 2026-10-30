const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/login",
  "/cadastro",
  "/blog",
  "/sitemap.xml",
  "/robots.txt",
]);

const PUBLIC_PREFIX_PATHS = ["/blog/"] as const;

export function isPublicPath(pathname: string): boolean {
  const normalized = normalizeTrailingSlash(pathname);
  if (PUBLIC_EXACT_PATHS.has(normalized)) return true;
  return PUBLIC_PREFIX_PATHS.some(
    (prefix) => normalized.startsWith(prefix) && normalized.length > prefix.length,
  );
}

function normalizeTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}
