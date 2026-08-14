import { useSession } from "@tanstack/react-start/server";

const SESSION_NAME = "nfe-session";

function sessionPassword(): string {
  const raw =
    process.env.SESSION_PASSWORD ?? "nfe-facil-local-session-secret-key";
  return raw.length >= 32 ? raw : raw.padEnd(32, "!");
}

function sessionConfig() {
  return {
    password: sessionPassword(),
    name: SESSION_NAME,
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function setUserSession(userId: number): Promise<void> {
  const session = await useSession<{ userId: number }>(sessionConfig());
  await session.update({ userId });
}

export async function clearUserSession(): Promise<void> {
  const session = await useSession<{ userId: number }>(sessionConfig());
  await session.clear();
}

export async function readUserIdFromSession(): Promise<number | null> {
  const session = await useSession<{ userId: number }>(sessionConfig());
  const userId = session.data.userId;
  return typeof userId === "number" ? userId : null;
}
