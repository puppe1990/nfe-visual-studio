import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { Client } from "@libsql/client";

import { createCompany, getCompany } from "./companies";
import type { AuthUser, Company, ServiceResult } from "./types";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(prev, next);
}

function mapUser(row: Record<string, unknown>): AuthUser {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
  };
}

export async function getUserById(
  client: Client,
  userId: number,
): Promise<ServiceResult<{ user: AuthUser }>> {
  const result = await client.execute({
    sql: "SELECT id, email, name FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Usuário não encontrado" } };
  }
  return {
    ok: true,
    data: { user: mapUser(result.rows[0] as unknown as Record<string, unknown>) },
  };
}

export async function getWorkspaceForUser(
  client: Client,
  userId: number,
): Promise<ServiceResult<{ user: AuthUser; company: Company }>> {
  const user = await getUserById(client, userId);
  if (!user.ok) return user;
  const membership = await client.execute({
    sql: `SELECT company_id FROM company_members
          WHERE user_id = ?
          ORDER BY id ASC
          LIMIT 1`,
    args: [userId],
  });
  if (membership.rows.length === 0) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Usuário sem empresa vinculada" },
    };
  }
  const companyId = Number(
    (membership.rows[0] as unknown as { company_id: number }).company_id,
  );
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  return { ok: true, data: { user: user.data.user, company: company.data.company } };
}

export async function registerTenant(
  client: Client,
  payload: {
    email: string;
    name: string;
    password: string;
    companyName: string;
    document: string;
  },
): Promise<ServiceResult<{ user: AuthUser; company: Company }>> {
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const password = payload.password;
  if (!email || !email.includes("@")) {
    return { ok: false, error: { code: "VALIDATION", message: "E-mail inválido" } };
  }
  if (!name) {
    return { ok: false, error: { code: "VALIDATION", message: "Nome é obrigatório" } };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Senha deve ter ao menos 8 caracteres" },
    };
  }

  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length > 0) {
    return { ok: false, error: { code: "CONFLICT", message: "E-mail já cadastrado" } };
  }

  const company = await createCompany(client, {
    name: payload.companyName,
    document: payload.document,
    email,
    taxRegime: "simples",
    sefazEnvironment: "homologation",
  });
  if (!company.ok) return company;

  const inserted = await client.execute({
    sql: `INSERT INTO users (email, name, password_hash)
          VALUES (?, ?, ?)
          RETURNING id, email, name`,
    args: [email, name, hashPassword(password)],
  });
  const user = mapUser(inserted.rows[0] as unknown as Record<string, unknown>);
  await client.execute({
    sql: `INSERT INTO company_members (company_id, user_id, role)
          VALUES (?, ?, 'owner')`,
    args: [company.data.company.id, user.id],
  });
  return { ok: true, data: { user, company: company.data.company } };
}

export async function loginUser(
  client: Client,
  email: string,
  password: string,
): Promise<ServiceResult<{ user: AuthUser; company: Company }>> {
  const normalized = email.trim().toLowerCase();
  const result = await client.execute({
    sql: "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    args: [normalized],
  });
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "E-mail ou senha inválidos" },
    };
  }
  const row = result.rows[0] as unknown as Record<string, unknown>;
  if (!verifyPassword(password, String(row.password_hash))) {
    return {
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "E-mail ou senha inválidos" },
    };
  }
  return getWorkspaceForUser(client, Number(row.id));
}

export async function changePassword(
  client: Client,
  userId: number,
  currentPassword: string,
  nextPassword: string,
): Promise<ServiceResult<{ user: AuthUser }>> {
  if (nextPassword.length < 8) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "A nova senha deve ter ao menos 8 caracteres",
      },
    };
  }
  if (currentPassword === nextPassword) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "A nova senha deve ser diferente da atual",
      },
    };
  }

  const result = await client.execute({
    sql: "SELECT id, email, name, password_hash FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Usuário não encontrado" },
    };
  }
  const row = result.rows[0] as unknown as Record<string, unknown>;
  if (!verifyPassword(currentPassword, String(row.password_hash))) {
    return {
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Senha atual incorreta" },
    };
  }

  await client.execute({
    sql: `UPDATE users SET password_hash = ?, updated_at = unixepoch()
          WHERE id = ?`,
    args: [hashPassword(nextPassword), userId],
  });
  return {
    ok: true,
    data: { user: mapUser(row) },
  };
}

export async function attachOwnerToCompany(
  client: Client,
  input: {
    email: string;
    name: string;
    password: string;
    companyId: number;
  },
): Promise<ServiceResult<{ user: AuthUser }>> {
  const email = input.email.trim().toLowerCase();
  const existing = await client.execute({
    sql: "SELECT id, email, name FROM users WHERE email = ?",
    args: [email],
  });
  let user: AuthUser;
  if (existing.rows.length === 0) {
    const inserted = await client.execute({
      sql: `INSERT INTO users (email, name, password_hash)
            VALUES (?, ?, ?)
            RETURNING id, email, name`,
      args: [email, input.name, hashPassword(input.password)],
    });
    user = mapUser(inserted.rows[0] as unknown as Record<string, unknown>);
  } else {
    user = mapUser(existing.rows[0] as unknown as Record<string, unknown>);
  }
  await client.execute({
    sql: `INSERT OR IGNORE INTO company_members (company_id, user_id, role)
          VALUES (?, ?, 'owner')`,
    args: [input.companyId, user.id],
  });
  return { ok: true, data: { user } };
}
