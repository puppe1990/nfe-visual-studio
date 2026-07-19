export type ServiceError = { code: string; message: string }
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError }

export type TaxRegime = 'simples' | 'presumido' | 'real'
export type SefazEnvironment = 'homologation' | 'production'
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'authorized'
  | 'rejected'
  | 'canceled'

export type Company = {
  id: number
  name: string
  tradeName: string | null
  document: string
  stateRegistration: string | null
  email: string | null
  phone: string | null
  zip: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  taxRegime: TaxRegime
  nfeSeries: number
  nextNfeNumber: number
  sefazEnvironment: SefazEnvironment
  createdAt: number
  updatedAt: number
}

export type Customer = {
  id: number
  companyId: number
  name: string
  document: string
  stateRegistration: string | null
  email: string | null
  phone: string | null
  zip: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export type Product = {
  id: number
  companyId: number
  sku: string | null
  name: string
  ncm: string | null
  unit: string
  priceCents: number
  active: boolean
  notes: string | null
  createdAt: number
  updatedAt: number
}

export type InvoiceItem = {
  id: number
  invoiceId: number
  productId: number | null
  description: string
  ncm: string | null
  quantity: number
  unitPriceCents: number
  totalCents: number
  createdAt: number
}

export type Invoice = {
  id: number
  companyId: number
  customerId: number
  customerName?: string
  number: number | null
  series: number
  nature: string
  cfop: string
  status: InvoiceStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  xmlContent: string | null
  rejectionReason: string | null
  issuedAt: number | null
  items?: InvoiceItem[]
  createdAt: number
  updatedAt: number
}

export type DashboardMetrics = {
  authorizedCount: number
  revenueCents: number
  pendingCount: number
  rejectedCount: number
  last7Days: { day: string; count: number }[]
  recentInvoices: Invoice[]
}
