# NFeFácil — status do projeto

Documento de referência do emissor de NF-e (modelo 55) com **SEFAZ direta** (sem provedor comercial intermediário).

Atualizado em: 2026-07-19  
Branch / PR de origem: `feat/nfe-mvp-turso-tdd`

---

## Objetivo

Sistema online para:

- cadastrar emitente, clientes e produtos  
- montar e validar XML NF-e 4.00  
- assinar com certificado **A1**  
- transmitir **direto** aos webservices da SEFAZ  
- cancelar, inutilizar numeração e exportar/enviar XML  

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | TanStack Start, React 19, Tailwind |
| DB | Turso / libSQL (`@libsql/client`) |
| Domínio | `src/domain/*` + `ServiceResult` |
| SEFAZ | SOAP 1.2 + mTLS + XMLDSig (`node-forge`, `xml-crypto`) |
| Testes | Vitest + DB file temp |
| CI | GitHub Actions (`typecheck` + `test` + `build`) |

---

## Como rodar

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

### Variáveis relevantes

```env
TURSO_DATABASE_URL=file:local-nfe.db
TURSO_AUTH_TOKEN=

# simulated = não chama rede (default)
# real = SOAP + mTLS + assinatura nos endpoints oficiais
SEFAZ_MODE=simulated
SEFAZ_UF=SP
```

### Fluxo manual

1. **Configurações** — emitente, ambiente (homolog/prod), série/numeração  
2. **Configurações** — upload do certificado A1 (obrigatório em produção e em `SEFAZ_MODE=real`)  
3. **Clientes** / **Produtos** — cadastro com documento e endereço reais  
4. **Emitir NF-e** — rascunho ou transmitir  
5. **Notas** — XML, e-mail, cancelar  

---

## Arquitetura (pastas)

```
src/
  db/                 # schema.sql, client Turso, migrate
  domain/
    companies.ts      # emitente
    customers.ts      # destinatários
    products.ts
    invoices.ts       # draft, transmit, cancel, e-mail
    inutilizations.ts
    certificates.ts   # A1 (PFX)
    xml-export.ts     # layout NF-e 4.00
    nfe-schema-validate.ts  # validação pré-envio
    sefaz-cstat.ts    # mensagens cStat
    sefaz.ts          # adapter + Simulated/Fake
    sefaz-real.ts     # SEFAZ direta
    sefaz-endpoints.ts
    sefaz-sign.ts
    sefaz-soap.ts
    mail.ts
  fns/                # createServerFn (não usar pasta server/)
  routes/             # UI
  components/         # AppShell
```

---

## O que já está pronto

### Produto / UI

- Painel (métricas)
- Emitir NF-e
- Notas (filtros, XML, e-mail, cancelar, retransmitir rascunho)
- Clientes e produtos (CRUD + import XML de produtos)
- Configurações (emitente, A1, inutilização)

### Domínio fiscal técnico

- Multi-tenant por `companies` (workspace demo sem login)
- Rascunho → transmissão (simulada ou real)
- XML **layout 4.00** com grupos obrigatórios + chave de acesso 44 dígitos
- Validação estrutural pré-envio (regras alinhadas ao XSD 4.00)
- Mapa de `cStat` com “o que fazer”
- `RealSefazClient`: autorizar, cancelar, inutilizar (SOAP + A1)
- Endpoints SP + SVRS (homologação e produção)
- E-mail com anexo XML via `InMemoryMailSender` (dev)

### Qualidade

- Testes de domínio (Vitest)
- CI no GitHub Actions

---

## SEFAZ direta (importante)

| Item | Resposta |
|------|----------|
| Precisa API comercial (Focus, etc.)? | **Não** — caminho escolhido é SEFAZ direta |
| Precisa API key da SEFAZ no app? | **Não** |
| Auth das chamadas | Certificado A1 (assinatura XML + mTLS) |
| Credenciamento do CNPJ | Fora do app (portal SEFAZ da UF do **emitente**) |

Ativar modo real:

```bash
SEFAZ_MODE=real
SEFAZ_UF=SP   # ou outra UF mapeada / SVRS
```

---

## O que ainda falta

### Prioridade alta (produção fiscal estável)

1. **Regras de imposto completas**  
   CST/CSOSN além do stub, ICMS interestadual, ST, DIFAL, FCP, IPI, reforma tributária.

2. **XSD oficial multi-arquivo**  
   Hoje há validador estrutural; não está embutido o pacote PL completo da SEFAZ.

3. **Cadastros fortes**  
   Endereço/IE sem fallback fraco, IBGE completo, NCM/CFOP guiados, consulta CNPJ/Receita.

4. **Auth multi-empresa**  
   Login real (hoje workspace demo automático).

5. **Segurança do A1**  
   Criptografia de senha de produção (hoje cifra MVP).

### Prioridade média (operacional)

- Endpoints nativos de todas as UFs (MG, PR, RS, etc.)
- Retry/fila e status do serviço SEFAZ
- DANFE PDF
- CC-e (carta de correção)
- SMTP real para e-mail
- Mensageria de rejeição ainda mais rica na UI

### Fora do software (cliente final)

- CNPJ + IE + habilitação NF-e na SEFAZ  
- Certificado A1 válido  
- Testes em homologação com numeração real  

---

## Próximos passos sugeridos

1. Cadastro de emitente/cliente/produto sem defaults fracos + IBGE  
2. Impostos por operação (top 5 cenários Simples/normal)  
3. Auth multi-tenant + A1 com KMS/secret store  
4. DANFE + SMTP  
5. (Opcional) plugar validador XSD oficial  

---

## Referências internas

- `AGENTS.md` — guia operacional para agentes/devs  
- `.env.example` — variáveis  
- `src/domain/sefaz-endpoints.ts` — URLs por UF  
- `src/domain/sefaz-cstat.ts` — códigos de retorno  
- `src/domain/nfe-schema-validate.ts` — validação pré-envio  

---

## Licença / uso

Software em evolução. Emissão em **produção** só após credenciamento SEFAZ, A1 válido e validação fiscal completa da operação. Homologação primeiro (`tpAmb=2`).
