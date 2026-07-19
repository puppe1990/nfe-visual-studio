import type { Client } from '@libsql/client'

import { companyExists } from './companies'
import { createProduct, listProducts, updateProduct } from './products'
import type { Product, ServiceResult } from './types'

export type ImportedProductLine = {
  name: string
  ncm: string | null
  quantity: number
  unitPriceCents: number
}

/**
 * Extrai linhas de produto de um XML de NF-e (estrutura simplificada ou SEFAZ).
 * Parser leve por regex — suficiente para MVP sem dependência XML DOM no server.
 */
export function parseProductsFromXml(xml: string): ImportedProductLine[] {
  const lines: ImportedProductLine[] = []
  const detBlocks = xml.match(/<det[\s\S]*?<\/det>/gi) ?? []

  for (const block of detBlocks) {
    const name =
      block.match(/<xProd>([\s\S]*?)<\/xProd>/i)?.[1]?.trim() ??
      block.match(/<xprod>([\s\S]*?)<\/xprod>/i)?.[1]?.trim()
    if (!name) continue

    const ncmRaw =
      block.match(/<NCM>([\s\S]*?)<\/NCM>/i)?.[1]?.trim() ??
      block.match(/<ncm>([\s\S]*?)<\/ncm>/i)?.[1]?.trim()
    const ncm = ncmRaw ? ncmRaw.replace(/\D/g, '') : null

    const qtyRaw =
      block.match(/<qCom>([\s\S]*?)<\/qCom>/i)?.[1]?.trim() ?? '1'
    const priceRaw =
      block.match(/<vUnCom>([\s\S]*?)<\/vUnCom>/i)?.[1]?.trim() ?? '0'

    const quantity = Number(qtyRaw.replace(',', '.')) || 1
    const unitPrice = Number(priceRaw.replace(',', '.')) || 0
    const unitPriceCents = Math.round(unitPrice * 100)

    lines.push({
      name: decodeXml(name),
      ncm: ncm && ncm.length === 8 ? ncm : null,
      quantity,
      unitPriceCents,
    })
  }

  return lines
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

/**
 * Importa produtos a partir de XML de NF-e (upsert por nome na empresa).
 */
export async function importProductsFromXml(
  client: Client,
  companyId: number,
  xml: string,
): Promise<
  ServiceResult<{
    created: number
    updated: number
    skipped: number
    products: Product[]
  }>
> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const lines = parseProductsFromXml(xml)
  if (lines.length === 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Nenhum produto encontrado no XML',
      },
    }
  }

  const existing = await listProducts(client, companyId)
  if (!existing.ok) return existing

  const byName = new Map(
    existing.data.products.map((p) => [p.name.toLowerCase(), p]),
  )

  let created = 0
  let updated = 0
  let skipped = 0
  const products: Product[] = []

  for (const line of lines) {
    const key = line.name.toLowerCase()
    const found = byName.get(key)
    if (found) {
      // update price/ncm if changed
      const result = await updateProduct(client, companyId, found.id, {
        ncm: line.ncm,
        priceCents: line.unitPriceCents,
      })
      if (result.ok) {
        updated++
        products.push(result.data.product)
        byName.set(key, result.data.product)
      } else {
        skipped++
      }
      continue
    }

    const result = await createProduct(client, companyId, {
      name: line.name,
      ncm: line.ncm,
      priceCents: line.unitPriceCents,
    })
    if (result.ok) {
      created++
      products.push(result.data.product)
      byName.set(key, result.data.product)
    } else {
      skipped++
    }
  }

  return {
    ok: true,
    data: { created, updated, skipped, products },
  }
}
