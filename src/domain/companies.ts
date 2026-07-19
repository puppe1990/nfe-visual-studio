import type { Client } from '@libsql/client'

import { digitsOnly, isValidDocument } from './document'
import type { Company, ServiceResult, SefazEnvironment, TaxRegime } from './types'

function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: Number(row.id),
    name: String(row.name),
    tradeName: row.trade_name == null ? null : String(row.trade_name),
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
    taxRegime: String(row.tax_regime) as TaxRegime,
    nfeSeries: Number(row.nfe_series),
    nextNfeNumber: Number(row.next_nfe_number),
    sefazEnvironment: String(row.sefaz_environment) as SefazEnvironment,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  }
}

export async function createCompany(
  client: Client,
  payload: {
    name?: string
    document?: string
    tradeName?: string | null
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
    taxRegime?: TaxRegime
    nfeSeries?: number
    nextNfeNumber?: number
    sefazEnvironment?: SefazEnvironment
  },
): Promise<ServiceResult<{ company: Company }>> {
  const name = payload.name?.trim()
  if (!name) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Nome da empresa é obrigatório' },
    }
  }
  const document = digitsOnly(payload.document ?? '')
  if (!isValidDocument(document)) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'CNPJ/CPF do emitente inválido' },
    }
  }

  try {
    const result = await client.execute({
      sql: `INSERT INTO companies (
              name, trade_name, document, state_registration, email, phone,
              zip, street, number, complement, district, city, state,
              tax_regime, nfe_series, next_nfe_number, sefaz_environment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *`,
      args: [
        name,
        payload.tradeName?.trim() || null,
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
        payload.taxRegime ?? 'simples',
        payload.nfeSeries ?? 1,
        payload.nextNfeNumber ?? 1,
        payload.sefazEnvironment ?? 'homologation',
      ],
    })
    const row = result.rows[0] as unknown as Record<string, unknown>
    return { ok: true, data: { company: mapCompany(row) } }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE')) {
      return {
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'Já existe empresa com este documento',
        },
      }
    }
    throw err
  }
}

export async function getCompany(
  client: Client,
  companyId: number,
): Promise<ServiceResult<{ company: Company }>> {
  const result = await client.execute({
    sql: 'SELECT * FROM companies WHERE id = ?',
    args: [companyId],
  })
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }
  return {
    ok: true,
    data: {
      company: mapCompany(result.rows[0] as unknown as Record<string, unknown>),
    },
  }
}

export async function updateCompany(
  client: Client,
  companyId: number,
  payload: {
    name?: string
    tradeName?: string | null
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
    taxRegime?: TaxRegime
    nfeSeries?: number
    nextNfeNumber?: number
    sefazEnvironment?: SefazEnvironment
  },
): Promise<ServiceResult<{ company: Company }>> {
  const existing = await getCompany(client, companyId)
  if (!existing.ok) return existing

  const name = payload.name?.trim() ?? existing.data.company.name
  if (!name) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Nome da empresa é obrigatório' },
    }
  }

  await client.execute({
    sql: `UPDATE companies SET
            name = ?, trade_name = ?, state_registration = ?, email = ?, phone = ?,
            zip = ?, street = ?, number = ?, complement = ?, district = ?,
            city = ?, state = ?, tax_regime = ?, nfe_series = ?,
            next_nfe_number = ?, sefaz_environment = ?,
            updated_at = unixepoch()
          WHERE id = ?`,
    args: [
      name,
      payload.tradeName !== undefined
        ? payload.tradeName?.trim() || null
        : existing.data.company.tradeName,
      payload.stateRegistration !== undefined
        ? payload.stateRegistration?.trim() || null
        : existing.data.company.stateRegistration,
      payload.email !== undefined
        ? payload.email?.trim() || null
        : existing.data.company.email,
      payload.phone !== undefined
        ? payload.phone?.trim() || null
        : existing.data.company.phone,
      payload.zip !== undefined
        ? payload.zip?.trim() || null
        : existing.data.company.zip,
      payload.street !== undefined
        ? payload.street?.trim() || null
        : existing.data.company.street,
      payload.number !== undefined
        ? payload.number?.trim() || null
        : existing.data.company.number,
      payload.complement !== undefined
        ? payload.complement?.trim() || null
        : existing.data.company.complement,
      payload.district !== undefined
        ? payload.district?.trim() || null
        : existing.data.company.district,
      payload.city !== undefined
        ? payload.city?.trim() || null
        : existing.data.company.city,
      payload.state !== undefined
        ? payload.state?.trim()?.toUpperCase() || null
        : existing.data.company.state,
      payload.taxRegime ?? existing.data.company.taxRegime,
      payload.nfeSeries ?? existing.data.company.nfeSeries,
      payload.nextNfeNumber ?? existing.data.company.nextNfeNumber,
      payload.sefazEnvironment ?? existing.data.company.sefazEnvironment,
      companyId,
    ],
  })

  return getCompany(client, companyId)
}

export async function companyExists(
  client: Client,
  companyId: number,
): Promise<boolean> {
  const r = await client.execute({
    sql: 'SELECT id FROM companies WHERE id = ?',
    args: [companyId],
  })
  return r.rows.length > 0
}
