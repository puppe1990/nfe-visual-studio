import type { Client } from '@libsql/client'

import { companyExists } from './companies'
import { digitsOnly, isValidDocument } from './document'
import type { Customer, ServiceResult } from './types'

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    name: String(row.name),
    document: String(row.document),
    stateRegistration:
      row.state_registration == null ? null : String(row.state_registration),
    email: row.email == null ? null : String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    zip: row.zip == null ? null : String(row.zip),
    street: row.street == null ? null : String(row.street),
    number: row.number == null ? null : String(row.number),
    complement: row.complement == null ? null : String(row.complement),
    district: row.district == null ? null : String(row.district),
    city: row.city == null ? null : String(row.city),
    state: row.state == null ? null : String(row.state),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  }
}

export async function listCustomers(
  client: Client,
  companyId: number,
): Promise<ServiceResult<{ customers: Customer[] }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const result = await client.execute({
    sql: `SELECT * FROM customers WHERE company_id = ? ORDER BY name ASC`,
    args: [companyId],
  })

  return {
    ok: true,
    data: {
      customers: result.rows.map((r) =>
        mapCustomer(r as unknown as Record<string, unknown>),
      ),
    },
  }
}

export async function getCustomer(
  client: Client,
  companyId: number,
  customerId: number,
): Promise<ServiceResult<{ customer: Customer }>> {
  const result = await client.execute({
    sql: 'SELECT * FROM customers WHERE id = ? AND company_id = ?',
    args: [customerId, companyId],
  })
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' },
    }
  }
  return {
    ok: true,
    data: {
      customer: mapCustomer(
        result.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  }
}

export async function createCustomer(
  client: Client,
  companyId: number,
  payload: {
    name?: string
    document?: string
    stateRegistration?: string | null
    email?: string | null
    phone?: string | null
    zip?: string | null
    street?: string | null
    number?: string | null
    complement?: string | null
    district?: string | null
    city?: string | null
    state?: string | null
    notes?: string | null
  },
): Promise<ServiceResult<{ customer: Customer }>> {
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
      error: { code: 'VALIDATION', message: 'Nome do cliente é obrigatório' },
    }
  }

  const document = digitsOnly(payload.document ?? '')
  if (!isValidDocument(document)) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'CPF/CNPJ do cliente inválido' },
    }
  }

  try {
    const result = await client.execute({
      sql: `INSERT INTO customers (
              company_id, name, document, state_registration, email, phone,
              zip, street, number, complement, district, city, state, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *`,
      args: [
        companyId,
        name,
        document,
        payload.stateRegistration?.trim() || null,
        payload.email?.trim() || null,
        payload.phone?.trim() || null,
        payload.zip?.trim() || null,
        payload.street?.trim() || null,
        payload.number?.trim() || null,
        payload.complement?.trim() || null,
        payload.district?.trim() || null,
        payload.city?.trim() || null,
        payload.state?.trim()?.toUpperCase() || null,
        payload.notes?.trim() || null,
      ],
    })
    return {
      ok: true,
      data: {
        customer: mapCustomer(
          result.rows[0] as unknown as Record<string, unknown>,
        ),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE')) {
      return {
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'Já existe cliente com este documento nesta empresa',
        },
      }
    }
    throw err
  }
}

export async function updateCustomer(
  client: Client,
  companyId: number,
  customerId: number,
  payload: {
    name?: string
    stateRegistration?: string | null
    email?: string | null
    phone?: string | null
    zip?: string | null
    street?: string | null
    number?: string | null
    complement?: string | null
    district?: string | null
    city?: string | null
    state?: string | null
    notes?: string | null
  },
): Promise<ServiceResult<{ customer: Customer }>> {
  const existing = await getCustomer(client, companyId, customerId)
  if (!existing.ok) return existing

  const c = existing.data.customer
  const name = payload.name?.trim() ?? c.name
  if (!name) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Nome do cliente é obrigatório' },
    }
  }

  const result = await client.execute({
    sql: `UPDATE customers SET
            name = ?, state_registration = ?, email = ?, phone = ?,
            zip = ?, street = ?, number = ?, complement = ?, district = ?,
            city = ?, state = ?, notes = ?, updated_at = unixepoch()
          WHERE id = ? AND company_id = ?
          RETURNING *`,
    args: [
      name,
      payload.stateRegistration !== undefined
        ? payload.stateRegistration?.trim() || null
        : c.stateRegistration,
      payload.email !== undefined
        ? payload.email?.trim() || null
        : c.email,
      payload.phone !== undefined
        ? payload.phone?.trim() || null
        : c.phone,
      payload.zip !== undefined ? payload.zip?.trim() || null : c.zip,
      payload.street !== undefined
        ? payload.street?.trim() || null
        : c.street,
      payload.number !== undefined
        ? payload.number?.trim() || null
        : c.number,
      payload.complement !== undefined
        ? payload.complement?.trim() || null
        : c.complement,
      payload.district !== undefined
        ? payload.district?.trim() || null
        : c.district,
      payload.city !== undefined ? payload.city?.trim() || null : c.city,
      payload.state !== undefined
        ? payload.state?.trim()?.toUpperCase() || null
        : c.state,
      payload.notes !== undefined
        ? payload.notes?.trim() || null
        : c.notes,
      customerId,
      companyId,
    ],
  })

  return {
    ok: true,
    data: {
      customer: mapCustomer(
        result.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  }
}
