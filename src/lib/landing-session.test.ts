import { describe, expect, it } from "vitest";

import {
  landingPrimaryLabel,
  landingPrimaryTo,
  landingSignedIn,
} from "./landing-session";

describe("landingSignedIn", () => {
  it("is true only when the session result is ok", () => {
    expect(landingSignedIn({ ok: true })).toBe(true);
    expect(landingSignedIn({ ok: false })).toBe(false);
  });
});

describe("landingPrimaryTo", () => {
  it("sends visitors to cadastro and members to painel", () => {
    expect(landingPrimaryTo(false)).toBe("/cadastro");
    expect(landingPrimaryTo(true)).toBe("/painel");
  });
});

describe("landingPrimaryLabel", () => {
  it("uses the spec labels per surface", () => {
    expect(landingPrimaryLabel(false, "header")).toBe("Criar conta");
    expect(landingPrimaryLabel(false, "hero")).toBe("Começar a emitir");
    expect(landingPrimaryLabel(false, "cta")).toBe("Criar conta grátis");
    expect(landingPrimaryLabel(true, "header")).toBe("Abrir painel");
    expect(landingPrimaryLabel(true, "hero")).toBe("Continuar no painel");
    expect(landingPrimaryLabel(true, "cta")).toBe("Abrir painel");
  });
});
