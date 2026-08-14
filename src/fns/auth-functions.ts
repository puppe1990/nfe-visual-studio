import { createServerFn } from "@tanstack/react-start";

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getMigratedDb } = await import("../db/client");
    const { getWorkspaceForUser } = await import("../domain/auth");
    const { readUserIdFromSession } = await import(
      "../lib/auth-session.server"
    );
    const db = await getMigratedDb();
    const userId = await readUserIdFromSession();
    if (userId == null) {
      return {
        ok: false as const,
        error: { code: "UNAUTHENTICATED", message: "Faça login" },
      };
    }
    return getWorkspaceForUser(db, userId);
  },
);

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { getMigratedDb } = await import("../db/client");
    const { loginUser } = await import("../domain/auth");
    const { setUserSession } = await import("../lib/auth-session.server");
    const db = await getMigratedDb();
    const result = await loginUser(db, data.email, data.password);
    if (!result.ok) return result;
    await setUserSession(result.data.user.id);
    return result;
  });

export const registerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      name: string;
      password: string;
      companyName: string;
      document: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { getMigratedDb } = await import("../db/client");
    const { registerTenant } = await import("../domain/auth");
    const { setUserSession } = await import("../lib/auth-session.server");
    const db = await getMigratedDb();
    const result = await registerTenant(db, data);
    if (!result.ok) return result;
    await setUserSession(result.data.user.id);
    return result;
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { clearUserSession } = await import("../lib/auth-session.server");
  await clearUserSession();
  return { ok: true as const };
});

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator(
    (data: { currentPassword: string; nextPassword: string }) => data,
  )
  .handler(async ({ data }) => {
    const { getMigratedDb } = await import("../db/client");
    const { changePassword } = await import("../domain/auth");
    const { readUserIdFromSession } = await import(
      "../lib/auth-session.server"
    );
    const userId = await readUserIdFromSession();
    if (userId == null) {
      return {
        ok: false as const,
        error: { code: "UNAUTHENTICATED", message: "Faça login para trocar a senha" },
      };
    }
    const db = await getMigratedDb();
    return changePassword(
      db,
      userId,
      data.currentPassword,
      data.nextPassword,
    );
  });
