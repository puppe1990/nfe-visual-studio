import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

import {
  buildRobotsTxt,
  buildSitemapEntries,
  escapeXmlText,
  renderSitemapXml,
} from "./blog-sitemap";
import type { BlogPost } from "./blog";

faker.seed(20261030);

const SITE = "https://nfe.gestaobem.com";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
    title: faker.lorem.sentence(4),
    description: faker.lorem.sentence(10),
    publishedAt: "2026-01-10",
    tag: "NFS-e",
    blocks: [{ kind: "paragraph", text: faker.lorem.sentences(2) }],
    ...overrides,
  };
}

describe("buildSitemapEntries", () => {
  it("inclui as páginas públicas fixas", () => {
    const paths = buildSitemapEntries([]).map((entry) => entry.path);

    expect(paths).toEqual(["/", "/blog"]);
  });

  it("inclui cada post com a data de modificação", () => {
    const entries = buildSitemapEntries([
      makePost({ slug: "nota-fiscal", publishedAt: "2026-02-03" }),
      makePost({ slug: "certificado", publishedAt: "2026-02-04", updatedAt: "2026-03-01" }),
    ]);

    expect(entries).toContainEqual({ path: "/blog/nota-fiscal", lastModified: "2026-02-03" });
    expect(entries).toContainEqual({ path: "/blog/certificado", lastModified: "2026-03-01" });
  });

  it("não repete caminhos", () => {
    const entries = buildSitemapEntries([makePost({ slug: "a" }), makePost({ slug: "a" })]);
    const paths = entries.map((entry) => entry.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("escapeXmlText", () => {
  it("escapa os cinco caracteres reservados do XML", () => {
    expect(escapeXmlText(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
  });

  it("não deixa markup cru passar em texto aleatório", () => {
    const raw = faker.lorem.sentence(8) + " <loc>&x</loc>";

    expect(escapeXmlText(raw)).not.toContain("<loc>");
    expect(escapeXmlText(raw)).toContain("&lt;loc&gt;");
  });
});

describe("renderSitemapXml", () => {
  it("gera um urlset válido com as URLs absolutas", () => {
    const xml = renderSitemapXml(
      [{ path: "/", lastModified: "2026-01-01" }, { path: "/blog/nota-fiscal" }],
      SITE,
    );

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/blog/nota-fiscal</loc>`);
    expect(xml).toContain("<lastmod>2026-01-01</lastmod>");
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("omite lastmod quando não há data", () => {
    const xml = renderSitemapXml([{ path: "/blog" }], SITE);

    expect(xml).not.toContain("<lastmod>");
  });

  it("não duplica a barra quando o siteUrl termina em barra", () => {
    const xml = renderSitemapXml([{ path: "/blog" }], `${SITE}/`);

    expect(xml).toContain(`<loc>${SITE}/blog</loc>`);
  });

  it("escapa caracteres especiais no loc", () => {
    const xml = renderSitemapXml([{ path: "/blog/a&b" }], SITE);

    expect(xml).toContain(`<loc>${SITE}/blog/a&amp;b</loc>`);
  });

  it("mantém a ordem das entradas recebidas", () => {
    const xml = renderSitemapXml([{ path: "/" }, { path: "/blog" }, { path: "/blog/x" }], SITE);

    expect(xml.indexOf("<loc>https://nfe.gestaobem.com/</loc>")).toBeLessThan(
      xml.indexOf("<loc>https://nfe.gestaobem.com/blog</loc>"),
    );
    expect(xml.indexOf("<loc>https://nfe.gestaobem.com/blog</loc>")).toBeLessThan(
      xml.indexOf("<loc>https://nfe.gestaobem.com/blog/x</loc>"),
    );
  });
});

describe("buildRobotsTxt", () => {
  it("libera o site e aponta para o sitemap", () => {
    const robots = buildRobotsTxt(SITE);

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it("bloqueia as telas de aplicação autenticada", () => {
    const robots = buildRobotsTxt(SITE);

    for (const path of ["/painel", "/notas", "/emitir", "/configuracoes"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });
});
