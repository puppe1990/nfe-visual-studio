import type { Company, Customer, Invoice } from './types'

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * XML simplificado (não assinado, não SEFAZ-compliant).
 * Serve exportação para contador / download no MVP.
 */
export function buildInvoiceXml(input: {
  company: Company
  customer: Customer
  invoice: Invoice
}): string {
  const { company, customer, invoice } = input
  const items = invoice.items ?? []
  const det = items
    .map(
      (item, index) => `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${esc(String(item.productId ?? index + 1))}</cProd>
        <xProd>${esc(item.description)}</xProd>
        <NCM>${esc(item.ncm ?? '')}</NCM>
        <qCom>${item.quantity}</qCom>
        <vUnCom>${(item.unitPriceCents / 100).toFixed(2)}</vUnCom>
        <vProd>${(item.totalCents / 100).toFixed(2)}</vProd>
      </prod>
    </det>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <!-- MVP: XML simplificado, não assinado. Não enviar à SEFAZ. -->
  <NFe>
    <infNFe Id="NFe${company.document}${invoice.series}${String(invoice.number ?? 0).padStart(9, '0')}">
      <ide>
        <cUF>35</cUF>
        <natOp>${esc(invoice.nature)}</natOp>
        <mod>55</mod>
        <serie>${invoice.series}</serie>
        <nNF>${invoice.number ?? 0}</nNF>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpAmb>${company.sefazEnvironment === 'production' ? '1' : '2'}</tpAmb>
        <finNFe>1</finNFe>
        <CFOP>${esc(invoice.cfop)}</CFOP>
      </ide>
      <emit>
        <CNPJ>${esc(company.document)}</CNPJ>
        <xNome>${esc(company.name)}</xNome>
        <IE>${esc(company.stateRegistration ?? '')}</IE>
      </emit>
      <dest>
        <${customer.document.length === 11 ? 'CPF' : 'CNPJ'}>${esc(customer.document)}</${customer.document.length === 11 ? 'CPF' : 'CNPJ'}>
        <xNome>${esc(customer.name)}</xNome>
        <email>${esc(customer.email ?? '')}</email>
      </dest>
      ${det}
      <total>
        <ICMSTot>
          <vProd>${(invoice.subtotalCents / 100).toFixed(2)}</vProd>
          <vNF>${(invoice.totalCents / 100).toFixed(2)}</vNF>
          <vTotTrib>${(invoice.taxCents / 100).toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>
`
}
