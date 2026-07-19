import { createServerFn } from "@tanstack/react-start";

import { getMigratedDb } from "../db/client";
import { ensureWorkspace } from "../domain/bootstrap";
import * as certificates from "../domain/certificates";
import * as companies from "../domain/companies";
import * as customers from "../domain/customers";
import * as invoices from "../domain/invoices";
import type { DraftItemInput } from "../domain/invoices";
import * as inutilizations from "../domain/inutilizations";
import * as products from "../domain/products";
import type { InvoiceStatus, SefazEnvironment, TaxRegime } from "../domain/types";
import { importProductsFromXml } from "../domain/xml-import";

async function workspace() {
  const db = await getMigratedDb();
  const company = await ensureWorkspace(db);
  if (!company.ok) {
    return { db, company: null as null, error: company };
  }
  return { db, company: company.data.company, error: null as null };
}

// —— Workspace / company ——

export const getWorkspaceFn = createServerFn({ method: "GET" }).handler(async () => {
  const { company, error } = await workspace();
  if (error) return error;
  return { ok: true as const, data: { company: company! } };
});

export const updateCompanyFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name?: string;
      tradeName?: string | null;
      stateRegistration?: string | null;
      email?: string | null;
      phone?: string | null;
      zip?: string | null;
      street?: string | null;
      number?: string | null;
      complement?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      taxRegime?: TaxRegime;
      nfeSeries?: number;
      nextNfeNumber?: number;
      sefazEnvironment?: SefazEnvironment;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return companies.updateCompany(db, company.id, data);
  });

// —— Products ——

export const listProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, company, error } = await workspace();
  if (error || !company) return error!;
  return products.listProducts(db, company.id);
});

export const createProductFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      sku?: string | null;
      ncm?: string | null;
      unit?: string;
      priceCents?: number;
      notes?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return products.createProduct(db, company.id, data);
  });

export const updateProductFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      productId: number;
      name?: string;
      sku?: string | null;
      ncm?: string | null;
      unit?: string;
      priceCents?: number;
      active?: boolean;
      notes?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    const { productId, ...payload } = data;
    return products.updateProduct(db, company.id, productId, payload);
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator((data: { productId: number }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return products.deleteProduct(db, company.id, data.productId);
  });

export const importProductsXmlFn = createServerFn({ method: "POST" })
  .validator((data: { xml: string }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return importProductsFromXml(db, company.id, data.xml);
  });

// —— Customers ——

export const listCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, company, error } = await workspace();
  if (error || !company) return error!;
  return customers.listCustomers(db, company.id);
});

export const createCustomerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      document: string;
      stateRegistration?: string | null;
      email?: string | null;
      phone?: string | null;
      zip?: string | null;
      street?: string | null;
      number?: string | null;
      city?: string | null;
      state?: string | null;
      notes?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return customers.createCustomer(db, company.id, data);
  });

export const updateCustomerFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      customerId: number;
      name?: string;
      stateRegistration?: string | null;
      email?: string | null;
      phone?: string | null;
      zip?: string | null;
      street?: string | null;
      number?: string | null;
      city?: string | null;
      state?: string | null;
      notes?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    const { customerId, ...payload } = data;
    return customers.updateCustomer(db, company.id, customerId, payload);
  });

// —— Invoices ——

export const getDashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const { db, company, error } = await workspace();
  if (error || !company) return error!;
  const metrics = await invoices.getDashboardMetrics(db, company.id);
  if (!metrics.ok) return metrics;
  return {
    ok: true as const,
    data: { company, metrics: metrics.data },
  };
});

export const listInvoicesFn = createServerFn({ method: "GET" })
  .validator((data?: { status?: InvoiceStatus | "all" }) => data ?? {})
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.listInvoices(db, company.id, {
      status: data.status ?? "all",
    });
  });

export const getInvoiceFn = createServerFn({ method: "GET" })
  .validator((data: { invoiceId: number }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.getInvoice(db, company.id, data.invoiceId);
  });

export const createInvoiceDraftFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      customerId: number;
      nature?: string;
      cfop?: string;
      items: DraftItemInput[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.createInvoiceDraft(db, company.id, data);
  });

export const transmitInvoiceFn = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: number }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.transmitInvoice(db, company.id, data.invoiceId);
  });

export const exportInvoiceXmlFn = createServerFn({ method: "GET" })
  .validator((data: { invoiceId: number }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.exportInvoiceXml(db, company.id, data.invoiceId);
  });

export const cancelInvoiceFn = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: number; justification: string }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.cancelInvoice(
      db,
      company.id,
      data.invoiceId,
      data.justification,
    );
  });

export const sendInvoiceEmailFn = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: number; recipient?: string | null }) => data)
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return invoices.sendInvoiceEmail(
      db,
      company.id,
      data.invoiceId,
      data.recipient,
    );
  });

// —— Certificates A1 ——

export const getActiveCertificateFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return certificates.getActiveCertificate(db, company.id);
  },
);

export const listCertificatesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return certificates.listCertificates(db, company.id);
  },
);

export const registerCertificateFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      serialNumber?: string | null;
      notBefore?: string | null;
      notAfter?: string | null;
      pfxBase64: string;
      password: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return certificates.registerCertificate(db, company.id, data);
  });

// —— Inutilizations ——

export const listInutilizationsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return inutilizations.listInutilizations(db, company.id);
  },
);

export const inutilizeNumbersFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      series?: number;
      numberFrom: number;
      numberTo: number;
      year?: number;
      justification: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, company, error } = await workspace();
    if (error || !company) return error!;
    return inutilizations.inutilizeNumbers(db, company.id, data);
  });
