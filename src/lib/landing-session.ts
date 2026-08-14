export type LandingSurface = "header" | "hero" | "cta";

export function landingSignedIn(result: { ok: boolean }): boolean {
  return result.ok === true;
}

export function landingPrimaryTo(signedIn: boolean): "/cadastro" | "/painel" {
  return signedIn ? "/painel" : "/cadastro";
}

export function landingPrimaryLabel(
  signedIn: boolean,
  surface: LandingSurface,
): string {
  if (signedIn) {
    return surface === "hero" ? "Continuar no painel" : "Abrir painel";
  }
  if (surface === "hero") return "Começar a emitir";
  if (surface === "cta") return "Criar conta grátis";
  return "Criar conta";
}
