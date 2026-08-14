export type AuthUser = {
  id: number
  email: string
  name: string
}

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
  municipalRegistration: string | null
  rpsSeries: string
  nextRpsNumber: number
  createdAt: number
  updatedAt: number
}

export type NfseListSort =
  | "issuedAt"
  | "nfseNumber"
  | "total"
  | "customer"
  | "status"
export type NfseListDir = "asc" | "desc"

export type NfseListFilter = {
  status?: InvoiceStatus | "all"
  customerId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  pageSize?: number
  sort?: NfseListSort
  dir?: NfseListDir
}

export type NfseListResult = {
  invoices: ServiceInvoice[]
  total: number
  page: number
  pageSize: number
  sort: NfseListSort
  dir: NfseListDir
}

export type ServiceInvoice = {
  id: number
  companyId: number
  customerId: number
  customerName?: string
  rpsSeries: string
  rpsNumber: number
  nfseNumber: number | null
  verificationCode: string | null
  serviceCode: string
  discrimination: string
  taxation: string
  issRate: number
  issWithheld: boolean
  status: InvoiceStatus
  subtotalCents: number
  issCents: number
  totalCents: number
  xmlContent: string | null
  returnXml: string | null
  rejectionReason: string | null
  issuedAt: number | null
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
  stCents: number
  totalCents: number
  xmlContent: string | null
  rejectionReason: string | null
  sefazProtocol: string | null
  accessKey: string | null
  cancelProtocol: string | null
  cancelJustification: string | null
  canceledAt: number | null
  issuedAt: number | null
  items?: InvoiceItem[]
  createdAt: number
  updatedAt: number
}

export type Inutilization = {
  id: number
  companyId: number
  series: number
  numberFrom: number
  numberTo: number
  year: number
  justification: string
  protocol: string | null
  status: string
  xmlContent: string | null
  createdAt: number
}

export type DashboardRecentItem = {
  id: string
  kind: 'nfe' | 'nfse'
  numberLabel: string
  customerName: string
  issuedAt: number | null
  createdAt: number
  totalCents: number
  status: InvoiceStatus
}

export type DashboardKindFilter = 'all' | 'nfse' | 'nfe'
export type DashboardStatusFilter = 'all' | InvoiceStatus

export type DashboardFilter = {
  kind?: DashboardKindFilter
  status?: DashboardStatusFilter
  customerId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  pageSize?: number
}

export type DashboardMetrics = {
  authorizedCount: number
  revenueCents: number
  pendingCount: number
  rejectedCount: number
  last7Days: { day: string; count: number }[]
  recentInvoices: Invoice[]
  recentItems: DashboardRecentItem[]
  recentTotal: number
  page: number
  pageSize: number
}
