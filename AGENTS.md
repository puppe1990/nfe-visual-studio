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

## Fases

**Fase 1 (core):**
- Multi-tenant por `companies`
- CRUD clientes e produtos
- Rascunho de NF-e + transmissão via adapter SEFAZ
- Métricas do painel
- Export XML simplificado + import produtos via XML
- Cálculo de impostos por regime (+ ST opcional)

**Fase 2 (fiscal / ops):**
- Adapter `SefazClient` (`SimulatedSefazClient` default, `FakeSefazClient` em testes)
- Certificado A1 (upload PFX base64 + senha cifrada MVP)
- Produção exige A1; homologação não
- Cancelamento de NF-e autorizada
- Inutilização de faixa de numeração
- Envio de e-mail com XML (`InMemoryMailSender` por padrão)
- Protocolo SEFAZ + chave de acesso na nota

**SEFAZ direto (sem API comercial):**
- `SEFAZ_MODE=real` ativa `RealSefazClient`
- Assina XML com A1 (`node-forge` + `xml-crypto`)
- mTLS SOAP para NFeAutorizacao4 / RetAutorizacao / RecepcaoEvento / Inutilizacao
- Endpoints por UF em `sefaz-endpoints.ts` (SP + SVRS)
- `SEFAZ_UF=SP` (default)

```bash
SEFAZ_MODE=real SEFAZ_UF=SP npm run dev
```

Cadastre o A1 em **Configurações** antes de transmitir em modo real.
Homologação SEFAZ ainda exige CNPJ credenciado + XML layout oficial completo
(o builder atual gera XML simplificado — expandir layout para produção fiscal).

**Ainda não:**
- Layout NF-e 4.00 100% completo (todos os grupos fiscais)
- SMTP real em produção
- Cobrança mensal

## TDD

Testes em `src/domain/*.test.ts`. Sempre usar `createDbClient({ url: 'file:...' })` + `migrate()` em temp dir — não mockar o SQL.
