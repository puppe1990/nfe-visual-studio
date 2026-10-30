import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

import {
  blogPath,
  estimateReadingMinutes,
  findBlogPost,
  formatBlogDate,
  listBlogPosts,
  postLastModified,
  sortBlogPosts,
} from "./blog";
import type { BlogPost } from "./blog";

faker.seed(20261030);

function makeSlug(): string {
  return faker.helpers.slugify(faker.lorem.words(3)).toLowerCase();
}

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  const publishedAt = faker.date.past({ years: 2 }).toISOString().slice(0, 10);
  return {
    slug: makeSlug(),
    title: faker.lorem.sentence(4),
    description: faker.lorem.sentence(10),
    publishedAt,
    tag: faker.helpers.arrayElement(["NFS-e", "NF-e", "Certificado"]),
    blocks: [
      { kind: "paragraph", text: faker.lorem.sentences(3) },
      { kind: "heading", text: faker.lorem.words(3) },
      { kind: "list", items: [faker.lorem.sentence(), faker.lorem.sentence()] },
    ],
    ...overrides,
  };
}

describe("sortBlogPosts", () => {
  it("ordena do mais recente para o mais antigo", () => {
    const posts = [
      makePost({ publishedAt: "2026-01-05" }),
      makePost({ publishedAt: "2026-09-20" }),
      makePost({ publishedAt: "2025-12-31" }),
    ];

    expect(sortBlogPosts(posts).map((post) => post.publishedAt)).toEqual([
      "2026-09-20",
      "2026-01-05",
      "2025-12-31",
    ]);
  });

  it("não muta a lista original", () => {
    const posts = [
      makePost({ publishedAt: "2026-01-05" }),
      makePost({ publishedAt: "2026-09-20" }),
    ];

    sortBlogPosts(posts);

    expect(posts[0].publishedAt).toBe("2026-01-05");
  });

  it("desempata pelo slug quando a data é a mesma", () => {
    const posts = [
      makePost({ slug: "zebra", publishedAt: "2026-02-02" }),
      makePost({ slug: "abelha", publishedAt: "2026-02-02" }),
    ];

    expect(sortBlogPosts(posts).map((post) => post.slug)).toEqual(["abelha", "zebra"]);
  });
});

describe("findBlogPost", () => {
  it("encontra pelo slug exato", () => {
    const post = makePost({ slug: "certificado-a1" });

    expect(findBlogPost([makePost(), post], "certificado-a1")).toBe(post);
  });

  it("devolve undefined quando o slug não existe", () => {
    expect(findBlogPost([makePost()], makeSlug())).toBeUndefined();
  });
});

describe("blogPath", () => {
  it("monta a rota pública do post", () => {
    expect(blogPath("nfse-sp")).toBe("/blog/nfse-sp");
  });

  it("preserva slugs gerados aleatoriamente", () => {
    const slug = makeSlug();

    expect(blogPath(slug)).toBe(`/blog/${slug}`);
  });
});

describe("postLastModified", () => {
  it("usa updatedAt quando existe", () => {
    const post = makePost({ publishedAt: "2026-01-01", updatedAt: "2026-04-09" });

    expect(postLastModified(post)).toBe("2026-04-09");
  });

  it("cai para publishedAt quando não foi atualizado", () => {
    const post = makePost({ publishedAt: "2026-01-01", updatedAt: undefined });

    expect(postLastModified(post)).toBe("2026-01-01");
  });
});

describe("estimateReadingMinutes", () => {
  it("conta 200 palavras como um minuto", () => {
    const words = faker.lorem.words(200);

    expect(estimateReadingMinutes([{ kind: "paragraph", text: words }])).toBe(1);
  });

  it("arredonda para cima e nunca devolve zero", () => {
    expect(estimateReadingMinutes([{ kind: "paragraph", text: "nota" }])).toBe(1);
    expect(estimateReadingMinutes([{ kind: "paragraph", text: faker.lorem.words(201) }])).toBe(2);
  });

  it("conta texto de títulos, listas, citações e destaques", () => {
    const minutes = estimateReadingMinutes([
      { kind: "heading", text: faker.lorem.words(100) },
      { kind: "list", items: [faker.lorem.words(50), faker.lorem.words(50)] },
      { kind: "quote", text: faker.lorem.words(100) },
      { kind: "callout", title: faker.lorem.words(50), text: faker.lorem.words(50) },
    ]);

    expect(minutes).toBe(2);
  });
});

describe("formatBlogDate", () => {
  it("formata a data em português", () => {
    expect(formatBlogDate("2026-03-12")).toBe("12 de março de 2026");
  });

  it("não desloca o dia por fuso horário", () => {
    expect(formatBlogDate("2026-01-01")).toBe("1 de janeiro de 2026");
  });
});

describe("listBlogPosts", () => {
  it("devolve os posts publicados do mais novo para o mais antigo", () => {
    const posts = listBlogPosts();

    expect(posts.length).toBeGreaterThanOrEqual(4);
    expect(sortBlogPosts(posts)).toEqual(posts);
  });

  it("mantém slugs únicos e URLs válidas", () => {
    const slugs = listBlogPosts().map((post) => post.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("preenche metadados de SEO em todo post", () => {
    for (const post of listBlogPosts()) {
      expect(post.title.length).toBeGreaterThan(10);
      expect(post.description.length).toBeGreaterThan(40);
      expect(post.description.length).toBeLessThanOrEqual(200);
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.blocks.length).toBeGreaterThan(3);
    }
  });
});
