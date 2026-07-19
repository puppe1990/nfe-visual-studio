PRAGMA foreign_keys = ON;

-- Emitente (multi-tenant)
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT NOT NULL UNIQUE,
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  zip TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  district TEXT,
  city TEXT,
  state TEXT,
  tax_regime TEXT NOT NULL DEFAULT 'simples',
  nfe_series INTEGER NOT NULL DEFAULT 1,
  next_nfe_number INTEGER NOT NULL DEFAULT 1,
  sefaz_environment TEXT NOT NULL DEFAULT 'homologation',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS company_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(company_id, user_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  zip TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  district TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(company_id, document)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  ncm TEXT,
  unit TEXT NOT NULL DEFAULT 'UN',
  price_cents INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  number INTEGER,
  series INTEGER NOT NULL DEFAULT 1,
  nature TEXT NOT NULL DEFAULT 'Venda de mercadoria',
  cfop TEXT NOT NULL DEFAULT '5102',
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  st_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  xml_content TEXT,
  rejection_reason TEXT,
  sefaz_protocol TEXT,
  access_key TEXT,
  cancel_protocol TEXT,
  cancel_justification TEXT,
  canceled_at INTEGER,
  issued_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  ncm TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS invoice_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Certificado digital A1 (PFX em base64, senha cifrada de forma simples no MVP)
CREATE TABLE IF NOT EXISTS company_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  serial_number TEXT,
  not_before TEXT,
  not_after TEXT,
  pfx_base64 TEXT NOT NULL,
  password_cipher TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Inutilização de numeração SEFAZ
CREATE TABLE IF NOT EXISTS inutilizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  series INTEGER NOT NULL,
  number_from INTEGER NOT NULL,
  number_to INTEGER NOT NULL,
  year INTEGER NOT NULL,
  justification TEXT NOT NULL,
  protocol TEXT,
  status TEXT NOT NULL DEFAULT 'authorized',
  xml_content TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Log de e-mails enviados (DANFE/XML)
CREATE TABLE IF NOT EXISTS invoice_mail_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
