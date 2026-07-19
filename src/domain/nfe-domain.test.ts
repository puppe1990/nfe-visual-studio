import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDbClient, migrate } from '../db/client'
import type { LibsqlClient } from '../db/client'
import * as companies from './companies'
import * as customers from './customers'
import * as invoices from './invoices'
import * as products from './products'
import { importProductsFromXml, parseProductsFromXml } from './xml-import'

const VALID_CNPJ = '04252011000110'
const VALID_CPF = '52998224725'

describe('nfe domain (turso file)', () => {
  let client: LibsqlClient
  let dbDir: string
  let companyId: number

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'nfe-domain-'))
    client = createDbClient({ url: `file:${join(dbDir, 'test.db')}` })
    await migrate(client)

    const company = await companies.createCompany(client, {
      name: 'Comercial LTDA',
      document: VALID_CNPJ,
      taxRegime: 'simples',
      nfeSeries: 1,
      nextNfeNumber: 1,
    })
    expect(company.ok).toBe(true)
    if (!company.ok) throw new Error('setup company failed')
    companyId = company.data.company.id
  })

  afterEach(() => {
    client.close()
    rmSync(dbDir, { recursive: true, force: true })
  })

  describe('products', () => {
    it('creates product and validates ncm/price', async () => {
      const ok = await products.createProduct(client, companyId, {
        name: 'Consultoria',
        ncm: '99999999',
        priceCents: 150_000,
      })
      expect(ok.ok).toBe(true)
      if (!ok.ok) return
      expect(ok.data.product.name).toBe('Consultoria')
      expect(ok.data.product.ncm).toBe('99999999')

      const badNcm = await products.createProduct(client, companyId, {
        name: 'X',
        ncm: '123',
        priceCents: 100,
      })
      expect(badNcm.ok).toBe(false)
      if (!badNcm.ok) expect(badNcm.error.code).toBe('VALIDATION')

      const badPrice = await products.createProduct(client, companyId, {
        name: 'Y',
        priceCents: -1,
      })
      expect(badPrice.ok).toBe(false)
    })

    it('requires product name', async () => {
      const r = await products.createProduct(client, companyId, {
        name: '  ',
        priceCents: 10,
      })
      expect(r.ok).toBe(false)
    })
  })

  describe('customers', () => {
    it('creates customer with valid document', async () => {
      const r = await customers.createCustomer(client, companyId, {
        name: 'Cliente ME',
        document: VALID_CPF,
        email: 'a@b.com',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.data.customer.document).toBe(VALID_CPF)
    })

    it('rejects invalid document', async () => {
      const r = await customers.createCustomer(client, companyId, {
        name: 'X',
        document: '123',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('invoices', () => {
    async function seedCustomerAndProduct() {
      const customer = await customers.createCustomer(client, companyId, {
        name: 'Mercado Bom Preço',
        document: VALID_CPF,
      })
      if (!customer.ok) throw new Error('customer')
      const product = await products.createProduct(client, companyId, {
        name: 'Serviço de consultoria',
        ncm: '99999999',
        priceCents: 150_000,
      })
      if (!product.ok) throw new Error('product')
      return {
        customerId: customer.data.customer.id,
        productId: product.data.product.id,
      }
    }

    it('requires customer and items on draft', async () => {
      const noCustomer = await invoices.createInvoiceDraft(client, companyId, {
        items: [{ description: 'A', quantity: 1, unitPriceCents: 100 }],
      })
      expect(noCustomer.ok).toBe(false)

      const { customerId } = await seedCustomerAndProduct()
      const noItems = await invoices.createInvoiceDraft(client, companyId, {
        customerId,
        items: [],
      })
      expect(noItems.ok).toBe(false)
    })

    it('creates draft, transmits to authorized, advances number', async () => {
      const { customerId, productId } = await seedCustomerAndProduct()
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId,
        items: [
          {
            productId,
            description: 'Serviço de consultoria',
            ncm: '99999999',
            quantity: 1,
            unitPriceCents: 150_000,
          },
        ],
      })
      expect(draft.ok).toBe(true)
      if (!draft.ok) return
      expect(draft.data.invoice.status).toBe('draft')
      expect(draft.data.invoice.subtotalCents).toBe(150_000)
      expect(draft.data.invoice.taxCents).toBe(9_000) // 6% simples
      expect(draft.data.invoice.totalCents).toBe(159_000)
      expect(draft.data.invoice.items?.length).toBe(1)

      const tx = await invoices.transmitInvoice(
        client,
        companyId,
        draft.data.invoice.id,
      )
      expect(tx.ok).toBe(true)
      if (!tx.ok) return
      expect(tx.data.invoice.status).toBe('authorized')
      expect(tx.data.invoice.number).toBe(1)
      expect(tx.data.invoice.xmlContent).toMatch(/<NFe[\s>]/)

      const company = await companies.getCompany(client, companyId)
      expect(company.ok).toBe(true)
      if (company.ok) expect(company.data.company.nextNfeNumber).toBe(2)

      const xml = await invoices.exportInvoiceXml(
        client,
        companyId,
        draft.data.invoice.id,
      )
      expect(xml.ok).toBe(true)
    })

    it('rejects transmit when total is zero', async () => {
      const { customerId } = await seedCustomerAndProduct()
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId,
        items: [
          { description: 'Grátis', quantity: 1, unitPriceCents: 0 },
        ],
      })
      expect(draft.ok).toBe(true)
      if (!draft.ok) return

      const tx = await invoices.transmitInvoice(
        client,
        companyId,
        draft.data.invoice.id,
      )
      expect(tx.ok).toBe(true)
      if (!tx.ok) return
      expect(tx.data.invoice.status).toBe('rejected')
      expect(tx.data.invoice.rejectionReason).toMatch(/zero/i)
    })

    it('computes dashboard metrics for authorized only', async () => {
      const { customerId, productId } = await seedCustomerAndProduct()
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId,
        items: [
          {
            productId,
            description: 'Item',
            quantity: 1,
            unitPriceCents: 10_000,
          },
        ],
      })
      if (!draft.ok) throw new Error('draft')
      await invoices.transmitInvoice(client, companyId, draft.data.invoice.id)

      // leave a pending draft
      await invoices.createInvoiceDraft(client, companyId, {
        customerId,
        items: [
          { description: 'Pendente', quantity: 1, unitPriceCents: 5_000 },
        ],
      })

      const metrics = await invoices.getDashboardMetrics(client, companyId)
      expect(metrics.ok).toBe(true)
      if (!metrics.ok) return
      expect(metrics.data.authorizedCount).toBe(1)
      expect(metrics.data.revenueCents).toBe(10_600) // 10000 + 6%
      expect(metrics.data.pendingCount).toBe(1)
      expect(metrics.data.recentInvoices.length).toBeGreaterThanOrEqual(1)
      expect(metrics.data.last7Days).toHaveLength(7)
    })
  })

  describe('multi-tenant isolation', () => {
    it('company B cannot see company A invoices', async () => {
      const companyB = await companies.createCompany(client, {
        name: 'Outra SA',
        // Another valid CNPJ: 11.444.777/0001-61
        document: '11444777000161',
      })
      expect(companyB.ok).toBe(true)
      if (!companyB.ok) return

      const customer = await customers.createCustomer(client, companyId, {
        name: 'Cliente A',
        document: VALID_CPF,
      })
      if (!customer.ok) throw new Error('c')
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId: customer.data.customer.id,
        items: [
          { description: 'Item A', quantity: 1, unitPriceCents: 1000 },
        ],
      })
      if (!draft.ok) throw new Error('d')

      const listB = await invoices.listInvoices(
        client,
        companyB.data.company.id,
      )
      expect(listB.ok).toBe(true)
      if (listB.ok) expect(listB.data.invoices).toHaveLength(0)

      const getB = await invoices.getInvoice(
        client,
        companyB.data.company.id,
        draft.data.invoice.id,
      )
      expect(getB.ok).toBe(false)
    })
  })

  describe('xml import', () => {
    it('parses det blocks and upserts products', async () => {
      const xml = `<?xml version="1.0"?>
        <NFe>
          <det nItem="1">
            <prod>
              <xProd>Parafuso M6</xProd>
              <NCM>73181500</NCM>
              <qCom>10</qCom>
              <vUnCom>1.50</vUnCom>
            </prod>
          </det>
          <det nItem="2">
            <prod>
              <xProd>Porca M6</xProd>
              <NCM>73181600</NCM>
              <qCom>10</qCom>
              <vUnCom>0.80</vUnCom>
            </prod>
          </det>
        </NFe>`

      const parsed = parseProductsFromXml(xml)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].name).toBe('Parafuso M6')
      expect(parsed[0].unitPriceCents).toBe(150)

      const imported = await importProductsFromXml(client, companyId, xml)
      expect(imported.ok).toBe(true)
      if (!imported.ok) return
      expect(imported.data.created).toBe(2)

      const again = await importProductsFromXml(client, companyId, xml)
      expect(again.ok).toBe(true)
      if (!again.ok) return
      expect(again.data.created).toBe(0)
      expect(again.data.updated).toBe(2)
    })
  })
})
