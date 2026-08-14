# AGENTS.md — NFeFácil

Emissor oficial de NFS-e Paulistana (Pref. SP, SOAP 1.1 + mTLS A1) e NF-e 55 (SEFAZ direta). Multi-tenant por `company_members`. Produção: Netlify + Turso HTTP.

## Commands

```bash
npm test            # vitest run — domínio, file: SQLite temp
npm run typecheck
npm run verify      # format:check + lint + typecheck + test + build
npm run dev         # precisa TURSO_DATABASE_URL=libsql://… (não file:)
```

Tests must stay F.I.R.S.T. New domain function → test. Bugfix → regression test. Use `createFileDbClient({ url: 'file:…' })` + `migrate()` in a temp dir. Never mock SQL. Never import `src/db/client.ts` in tests (web client rejects `file:`).

## Code style

- Functions: 4–20 lines. Files: under 500 (target 200–300). Split by responsibility.
- One reason to change per module. Unique greppable names (no `data`, `handler`, `Manager`).
- Types explicit. No `any` on public surfaces. `ServiceResult<T>` for domain I/O.
- Early returns. Max 2 control-flow indent levels.
- Errors include the offending value and expected shape.
- WHY / provenance comments stay. Do not strip them on refactor.
- Formatter: Prettier. Do not bikeshed style.

## Layout

```
src/
  db/           # client.ts = Turso HTTP only; file-client.ts = tests
  domain/       # rules + adapters. invoices* and service-invoice* are split
  fns/          # createServerFn only. Do not put handlers in server/
  routes/       # TanStack file routes
  components/   # App UI. src/components/ui = shadcn — do not split
  lib/          # parseNfseSearch, parseDashboardSearch, money, iso-date
```

| Symbol | File |
|--------|------|
| `createInvoiceDraft` | `domain/invoices.ts` (re-exports read/lifecycle/delivery/dashboard) |
| `getInvoice` / `listInvoices` | `domain/invoice-read.ts` |
| `transmitInvoice` / `cancelInvoice` | `domain/invoice-lifecycle.ts` |
| `getDashboardMetrics` | `domain/invoice-dashboard.ts` (merge NF-e + NFS-e, then paginate) |
| `createServiceInvoiceDraft` / `listServiceInvoices` | `domain/service-invoices.ts` |
| `transmitServiceInvoice` | `domain/service-invoice-transmit.ts` |
| `importHistoricServiceInvoices` | `domain/service-invoice-import.ts` |
| `consultIssuerCnpj` | `domain/service-invoice-consult.ts` |
| `callNfseSoap` | `domain/nfse-client.ts` |
| `requireWorkspace` | `fns/auth-workspace.server.ts` (dynamic import only) |

## Routes

| Path | Role |
|------|------|
| `/` | Public landing |
| `/painel` | Auth dashboard (not `/`) |
| `/nfse` `/emitir-nfse` | NFS-e list / emit |
| `/notas` `/emitir` | NF-e 55 list / emit |
| `/login` `/cadastro` `/configuracoes` | Session + emitente |

Auth: cookie session. Client never statically imports `*.server.ts`. After login/cadastro navigate to `/painel`.

## Env / deploy

- App client: `createDbClient` in `src/db/client.ts` (`@libsql/client/web`). Rejects `file:` so Netlify Linux never loads a native SQLite binary.
- Tests only: `createFileDbClient` in `src/db/file-client.ts`.
- `OWNER_BOOTSTRAP_*` only if both env vars are set. Never hardcode passwords.
- Nitro preset `netlify`; publish `dist` (not `dist/client`).
- NFS-e consult window max 31 days. IM/CCM on company required for Pref SP.

## Defensive programming (implement these; do not invent others)

- Timeouts 60s: Pref SP SOAP (`nfseSoapPostHttps`) and SEFAZ SOAP (`sefaz-soap`).
- Fallback: if primary `NFSE_SP_ENDPOINT` is unreachable, retry once on `NFSE_SP_FALLBACK`.
- Inject SOAP `postFn` in tests (named fake), never hit the real Pref/SEFAZ from Vitest.
