import type { Client } from '@libsql/client'

import { companyExists } from './companies'
import type { Product, ServiceResult } from './types'

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    sku: row.sku == null ? null : String(row.sku),
    name: String(row.name),
    ncm: row.ncm == null ? null : String(row.ncm),
    unit: String(row.unit ?? 'UN'),
    priceCents: Number(row.price_cents ?? 0),
    active: Number(row.active ?? 1) === 1,
    notes: row.notes == null ? null : String(row.notes),
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  }
}

function normalizeNcm(ncm: string | null | undefined): string | null {
  if (ncm == null || ncm.trim() === '') return null
  const digits = ncm.replace(/\D/g, '')
  return digits || null
}

export async function listProducts(
  client: Client,
  companyId: number,
  options?: { activeOnly?: boolean },
): Promise<ServiceResult<{ products: Product[] }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const activeOnly = options?.activeOnly ?? false
  const result = await client.execute({
    sql: activeOnly
      ? `SELECT * FROM products WHERE company_id = ? AND active = 1
         ORDER BY name ASC`
      : `SELECT * FROM products WHERE company_id = ? ORDER BY name ASC`,
    args: [companyId],
  })

  return {
    ok: true,
    data: {
      products: result.rows.map((r) =>
        mapProduct(r as unknown as Record<string, unknown>),
      ),
    },
  }
}

export async function createProduct(
  client: Client,
  companyId: number,
  payload: {
    name?: string
    sku?: string | null
    ncm?: string | null
    unit?: string
    priceCents?: number
    notes?: string | null
  },
): Promise<ServiceResult<{ product: Product }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const name = payload.name?.trim()
  if (!name) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Nome do produto é obrigatório' },
    }
  }

  const priceCents = payload.priceCents ?? 0
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Preço inválido' },
    }
  }

  const ncm = normalizeNcm(payload.ncm)
  if (ncm != null && ncm.length !== 8) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'NCM deve ter 8 dígitos quando informado',
      },
    }
  }

  const result = await client.execute({
    sql: `INSERT INTO products (company_id, sku, name, ncm, unit, price_cents, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      companyId,
      payload.sku?.trim() || null,
      name,
      ncm,
      payload.unit?.trim() || 'UN',
      Math.round(priceCents),
      payload.notes?.trim() || null,
    ],
  })

  return {
    ok: true,
    data: {
      product: mapProduct(result.rows[0] as unknown as Record<string, unknown>),
    },
  }
}

export async function updateProduct(
  client: Client,
  companyId: number,
  productId: number,
  payload: {
    name?: string
    sku?: string | null
    ncm?: string | null
    unit?: string
    priceCents?: number
    active?: boolean
    notes?: string | null
  },
): Promise<ServiceResult<{ product: Product }>> {
  const existing = await client.execute({
    sql: 'SELECT * FROM products WHERE id = ? AND company_id = ?',
    args: [productId, companyId],
  })
  if (existing.rows.length === 0) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Produto não encontrado' },
    }
  }

  const current = mapProduct(
    existing.rows[0] as unknown as Record<string, unknown>,
  )
  const name = payload.name?.trim() ?? current.name
  if (!name) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Nome do produto é obrigatório' },
    }
  }

  const priceCents = payload.priceCents ?? current.priceCents
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Preço inválido' },
    }
  }

  const ncm =
    payload.ncm !== undefined ? normalizeNcm(payload.ncm) : current.ncm
  if (ncm != null && ncm.length !== 8) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'NCM deve ter 8 dígitos quando informado',
      },
    }
  }

  const result = await client.execute({
    sql: `UPDATE products SET
            sku = ?, name = ?, ncm = ?, unit = ?, price_cents = ?,
            active = ?, notes = ?, updated_at = unixepoch()
          WHERE id = ? AND company_id = ?
          RETURNING *`,
    args: [
      payload.sku !== undefined
        ? payload.sku?.trim() || null
        : current.sku,
      name,
      ncm,
      payload.unit?.trim() || current.unit,
      Math.round(priceCents),
      payload.active !== undefined
        ? payload.active
          ? 1
          : 0
        : current.active
          ? 1
          : 0,
      payload.notes !== undefined
        ? payload.notes?.trim() || null
        : current.notes,
      productId,
      companyId,
    ],
  })

  return {
    ok: true,
    data: {
      product: mapProduct(result.rows[0] as unknown as Record<string, unknown>),
    },
  }
}

export async function deleteProduct(
  client: Client,
  companyId: number,
  productId: number,
): Promise<ServiceResult<{ deleted: true }>> {
  const result = await client.execute({
    sql: 'DELETE FROM products WHERE id = ? AND company_id = ?',
    args: [productId, companyId],
  })
  if (result.rowsAffected === 0) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Produto não encontrado' },
    }
  }
  return { ok: true, data: { deleted: true } }
}
