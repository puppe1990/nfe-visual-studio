import { createFileRoute } from "@tanstack/react-router";

import { buildRobotsTxt } from "../domain/blog-sitemap";
import { SITE_URL } from "../lib/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRobotsTxt(SITE_URL), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
