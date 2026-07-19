# AGENTS.md — NFeFácil

Emissor de NF-e online (MVP). Visual em TanStack Start; domínio em Turso/libSQL com TDD.

## Stack

| Camada | Tecnologia |
|--------|------------|
| UI | TanStack Start, React 19, Tailwind |
| DB | Turso / libSQL (`@libsql/client`) |
| Domínio | `src/domain/*` + `ServiceResult` |
| Testes | Vitest + DB file temp |

## Estrutura

```
src/
  db/           # schema.sql, client (createDbClient, migrate)
  domain/       # companies, customers, products, invoices, tax, xml-*, bootstrap
  fns/          # createServerFn (nfe-functions.ts) — não usar pasta server/ (import protection)
  routes/       # / painel, /emitir, /notas, /clientes, /produtos, /configuracoes
  components/   # AppShell
```

## Rotas (UI ligada ao domínio)

| Rota | Função |
|------|--------|
| `/` | Painel com métricas reais |
| `/emitir` | Rascunho + transmitir (simulado) |
| `/notas` | Lista, filtros, XML, retransmitir |
| `/clientes` | CRUD destinatários |
| `/produtos` | CRUD + import XML |
| `/configuracoes` | Emitente + série/numeração |

MVP sem login: `ensureWorkspace()` cria empresa demo na 1ª execução.

## Env

```env
TURSO_DATABASE_URL=file:local-nfe.db
TURSO_AUTH_TOKEN=
```

## Comandos

```bash
npm install
npm test          # domínio TDD
npm run dev
npm run verify    # format + lint + typecheck + test + build
```

## MVP vs Fase 2

**MVP (implementado no domínio):**
- Multi-tenant por `companies`
- CRUD clientes e produtos
- Rascunho de NF-e + transmissão **simulada** (authorized/rejected)
- Métricas do painel
- Export XML simplificado (não assinado)
- Import de produtos via XML de NF-e
- Cálculo de impostos simplificado (stub por regime)

**Fase 2 (não fazer no MVP):**
- SEFAZ real + certificado A1
- Inutilização de numeração
- E-mail DANFE
- ST / reforma tributária completa
- Cobrança mensal

## TDD

Testes em `src/domain/*.test.ts`. Sempre usar `createDbClient({ url: 'file:...' })` + `migrate()` em temp dir — não mockar o SQL.
