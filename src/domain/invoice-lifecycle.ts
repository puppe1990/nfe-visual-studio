import type { Client } from '@libsql/client'

import {
  getActiveCertificateMaterial,
  hasActiveCertificate,
} from './certificates'
import { getCompany } from './companies'
import { getCustomer } from './customers'
import { addInvoiceEvent } from './invoice-row'
import { getInvoice } from './invoice-read'
import {
  formatSchemaIssues,
  validateNFeXmlSchema,
} from './nfe-schema-validate'
import type { SefazClient } from './sefaz'
import { getSefazClient } from './sefaz'
import { formatSefazRejection } from './sefaz-cstat'
import type { Invoice, ServiceResult } from './types'
import { buildInvoiceXml } from './xml-export'

/**
 * Transmissão via adapter SEFAZ (simulado por padrão).
 * Produção exige certificado A1 ativo.
 */
export async function transmitInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  sefaz: SefazClient = getSefazClient(),
): Promise<ServiceResult<{ invoice: Invoice }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'draft' && invoice.status !== 'rejected') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente rascunhos ou rejeitadas podem ser retransmitidas',
      },
    }
  }

  const items = invoice.items ?? []
  if (items.length === 0) {
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: ['Nota sem itens', invoiceId, companyId],
    })
    await addInvoiceEvent(client, invoiceId, 'rejected', 'Nota sem itens')
    return getInvoice(client, companyId, invoiceId)
  }

  if (invoice.totalCents <= 0) {
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: ['Total da nota deve ser maior que zero', invoiceId, companyId],
    })
    await addInvoiceEvent(client, invoiceId, 'rejected', 'Total inválido')
    return getInvoice(client, companyId, invoiceId)
  }

  const company = await getCompany(client, companyId)
  if (!company.ok) return company

  const number = company.data.company.nextNfeNumber
  const series = company.data.company.nfeSeries
  const customer = await getCustomer(client, companyId, invoice.customerId)
  if (!customer.ok) return customer

  let xml: string
  try {
    xml = buildInvoiceXml({
      company: company.data.company,
      customer: customer.data.customer,
      invoice: {
        ...invoice,
        number,
        series,
        status: 'authorized',
        items,
      },
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Falha ao montar XML da NF-e'
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [message, invoiceId, companyId],
    })
    await addInvoiceEvent(client, invoiceId, 'rejected', message)
    return getInvoice(client, companyId, invoiceId)
  }

  // Validação pré-envio alinhada ao XSD 4.00 (evita cStat 215/225 cegos)
  const schema = validateNFeXmlSchema(xml)
  if (!schema.ok) {
    const message = formatSchemaIssues(schema.issues)
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [message, invoiceId, companyId],
    })
    await addInvoiceEvent(client, invoiceId, 'schema_invalid', message)
    return getInvoice(client, companyId, invoiceId)
  }

  const hasCert = await hasActiveCertificate(client, companyId)
  const certMaterial = await getActiveCertificateMaterial(client, companyId)
  const certificate =
    certMaterial.ok && certMaterial.data ? certMaterial.data : null

  const sefazResult = await sefaz.authorize({
    companyDocument: company.data.company.document,
    series,
    number,
    environment: company.data.company.sefazEnvironment,
    xml,
    hasCertificate: hasCert,
    certificate,
    uf: company.data.company.state ?? 'SP',
  })

  if (!sefazResult.ok) {
    // Se o adapter já formatou cStat, mantém; senão tenta enriquecer
    const reason = sefazResult.rejectionReason.includes('[cStat')
      ? sefazResult.rejectionReason
      : sefazResult.rejectionReason.includes('cStat=')
        ? formatSefazRejection(
            sefazResult.rejectionReason.match(/cStat=(\d+)/)?.[1],
            sefazResult.rejectionReason,
          )
        : sefazResult.rejectionReason
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [reason, invoiceId, companyId],
    })
    await addInvoiceEvent(client, invoiceId, 'rejected', reason)
    return getInvoice(client, companyId, invoiceId)
  }

  await client.execute({
    sql: `UPDATE invoices SET
            status = 'authorized',
            number = ?,
            series = ?,
            xml_content = ?,
            sefaz_protocol = ?,
            access_key = ?,
            rejection_reason = NULL,
            issued_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [
      number,
      series,
      sefazResult.authorizedXml,
      sefazResult.protocol,
      sefazResult.accessKey,
      invoiceId,
      companyId,
    ],
  })

  await client.execute({
    sql: `UPDATE companies SET
            next_nfe_number = ?,
            updated_at = unixepoch()
          WHERE id = ?`,
    args: [number + 1, companyId],
  })

  await addInvoiceEvent(
    client,
    invoiceId,
    'authorized',
    `NF-e ${series}/${number} autorizada · prot ${sefazResult.protocol}`,
  )

  return getInvoice(client, companyId, invoiceId)
}

export async function cancelInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  justification: string,
  sefaz: SefazClient = getSefazClient(),
): Promise<ServiceResult<{ invoice: Invoice }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'authorized') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente notas autorizadas podem ser canceladas',
      },
    }
  }

  const just = justification.trim()
  if (just.length < 15) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Justificativa deve ter ao menos 15 caracteres',
      },
    }
  }

  const company = await getCompany(client, companyId)
  if (!company.ok) return company

  const hasCert = await hasActiveCertificate(client, companyId)
  const certMaterial = await getActiveCertificateMaterial(client, companyId)
  const certificate =
    certMaterial.ok && certMaterial.data ? certMaterial.data : null

  const sefazResult = await sefaz.cancel({
    accessKey: invoice.accessKey ?? '',
    protocol: invoice.sefazProtocol ?? '',
    justification: just,
    environment: company.data.company.sefazEnvironment,
    hasCertificate: hasCert,
    certificate,
    uf: company.data.company.state ?? 'SP',
  })

  if (!sefazResult.ok) {
    return {
      ok: false,
      error: { code: 'SEFAZ', message: sefazResult.rejectionReason },
    }
  }

  await client.execute({
    sql: `UPDATE invoices SET
            status = 'canceled',
            cancel_protocol = ?,
            cancel_justification = ?,
            canceled_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [sefazResult.protocol, just, invoiceId, companyId],
  })
  await addInvoiceEvent(
    client,
    invoiceId,
    'canceled',
    `Cancelada · prot ${sefazResult.protocol}`,
  )

  return getInvoice(client, companyId, invoiceId)
}
