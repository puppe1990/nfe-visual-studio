import type { Client } from '@libsql/client'

import { getCustomer } from './customers'
import { addInvoiceEvent } from './invoice-row'
import { getInvoice } from './invoice-read'
import type { MailSender } from './mail'
import { getMailSender } from './mail'
import type { ServiceResult } from './types'

export async function sendInvoiceEmail(
  client: Client,
  companyId: number,
  invoiceId: number,
  recipient?: string | null,
  mail: MailSender = getMailSender(),
): Promise<ServiceResult<{ messageId: string }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'authorized' && invoice.status !== 'canceled') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Envie e-mail apenas para notas autorizadas ou canceladas',
      },
    }
  }

  const customer = await getCustomer(client, companyId, invoice.customerId)
  if (!customer.ok) return customer

  const to = (recipient?.trim() || customer.data.customer.email || '').trim()
  if (!to) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Destinatário sem e-mail cadastrado',
      },
    }
  }

  const subject = `NF-e ${invoice.series}/${invoice.number ?? '—'} — ${customer.data.customer.name}`
  const body = `Segue XML da NF-e ${invoice.series}/${invoice.number ?? ''}.\nProtocolo: ${invoice.sefazProtocol ?? '—'}\nChave: ${invoice.accessKey ?? '—'}`

  const result = await mail.send({
    to,
    subject,
    body,
    attachments: invoice.xmlContent
      ? [
          {
            filename: `nfe-${invoice.id}.xml`,
            content: invoice.xmlContent,
            contentType: 'application/xml',
          },
        ]
      : [],
  })

  if (!result.ok) {
    await client.execute({
      sql: `INSERT INTO invoice_mail_log (invoice_id, recipient, subject, status, error_message)
            VALUES (?, ?, ?, 'failed', ?)`,
      args: [invoiceId, to, subject, result.error],
    })
    return {
      ok: false,
      error: { code: 'MAIL', message: result.error },
    }
  }

  await client.execute({
    sql: `INSERT INTO invoice_mail_log (invoice_id, recipient, subject, status)
          VALUES (?, ?, ?, 'sent')`,
    args: [invoiceId, to, subject],
  })
  await addInvoiceEvent(client, invoiceId, 'email_sent', `E-mail enviado para ${to}`)

  return { ok: true, data: { messageId: result.messageId } }
}

export async function exportInvoiceXml(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ xml: string }>> {
  const invoice = await getInvoice(client, companyId, invoiceId)
  if (!invoice.ok) return invoice

  if (invoice.data.invoice.xmlContent) {
    return { ok: true, data: { xml: invoice.data.invoice.xmlContent } }
  }

  if (invoice.data.invoice.status !== 'authorized') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente notas autorizadas possuem XML de exportação',
      },
    }
  }

  return {
    ok: false,
    error: { code: 'NOT_FOUND', message: 'XML não disponível' },
  }
}
