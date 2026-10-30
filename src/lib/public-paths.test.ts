import { describe, expect, it } from "vitest";

import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it.each([
    "/",
    "/login",
    "/cadastro",
    "/blog",
    "/blog/nfse-sao-paulo",
    "/sitemap.xml",
    "/robots.txt",
  ])("libera %s sem sessão", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/painel",
    "/nfse",
    "/notas",
    "/emitir",
    "/emitir-nfse",
    "/clientes",
    "/produtos",
    "/configuracoes",
  ])("protege %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it("não confunde prefixo parecido com rota de blog", () => {
    expect(isPublicPath("/blogx")).toBe(false);
    expect(isPublicPath("/bloguinho/post")).toBe(false);
  });

  it("ignora barra final", () => {
    expect(isPublicPath("/blog/")).toBe(true);
    expect(isPublicPath("/login/")).toBe(true);
  });
});
