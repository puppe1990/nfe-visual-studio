import { createFileRoute } from "@tanstack/react-router";

import { listBlogPosts } from "../domain/blog";
import { buildSitemapEntries, renderSitemapXml } from "../domain/blog-sitemap";
import { SITE_URL } from "../lib/site";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderSitemapXml(buildSitemapEntries(listBlogPosts()), SITE_URL), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
