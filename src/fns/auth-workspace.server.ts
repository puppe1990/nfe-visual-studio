import { getMigratedDb } from "../db/client";
import { getWorkspaceForUser } from "../domain/auth";
import { readUserIdFromSession } from "../lib/auth-session.server";

export async function requireWorkspace() {
  const db = await getMigratedDb();
  const userId = await readUserIdFromSession();
  if (userId == null) {
    return {
      db,
      user: null,
      company: null,
      error: {
        ok: false as const,
        error: { code: "UNAUTHENTICATED", message: "Faça login para continuar" },
      },
    };
  }
  const workspace = await getWorkspaceForUser(db, userId);
  if (!workspace.ok) {
    return { db, user: null, company: null, error: workspace };
  }
  return {
    db,
    user: workspace.data.user,
    company: workspace.data.company,
    error: null,
  };
}
