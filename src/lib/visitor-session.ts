import { getCurrentUserFn } from "../fns/auth-functions";
import { landingSignedIn } from "./landing-session";

/**
 * Páginas públicas de conteúdo não podem depender do banco: se a leitura da
 * sessão falhar, o visitante é tratado como anônimo em vez de derrubar a página.
 */
export async function readVisitorSignedIn(): Promise<boolean> {
  try {
    return landingSignedIn(await getCurrentUserFn());
  } catch (error) {
    console.error("Falha ao ler a sessão do visitante", error);
    return false;
  }
}
