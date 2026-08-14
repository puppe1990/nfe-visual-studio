<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="NFeFácil" />
</p>

# NFeFácil

Emissor de **NFS-e** (Prefeitura de São Paulo) e **NF-e modelo 55** (SEFAZ direta) com certificado A1, multi-tenant e painel de emissão.

Produção: [nfefacil.netlify.app](https://nfefacil.netlify.app)

Sem provedor comercial no meio: a NFS-e vai no webservice da Nota do Milhão e a NF-e nos webservices da SEFAZ.

## O que faz

- Emitir NFS-e oficial em São Paulo (RPS → NFS-e, códigos de serviço, impressão)
- Importar o histórico de NFS-e da Prefeitura
- Emitir NF-e 55 (rascunho, XML 4.00, autorizar, cancelar, inutilizar)
- Assinar e autenticar com certificado **A1** (PKCS#12)
- Login por e-mail, várias empresas e isolamento de dados
- Painel e listagem de NFS-e com filtro, ordenação e paginação
- PWA (favicon e ícones para atalho)

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | TanStack Start, React 19, Tailwind |
| Banco | Turso / libSQL |
| Assinatura | `node-forge`, `xml-crypto` (XMLDSig + mTLS) |
| Testes | Vitest |
| CI | GitHub Actions (`typecheck`, `test`, `build`) |

## Como rodar

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Abre em [http://127.0.0.1:3000](http://127.0.0.1:3000). Crie uma conta em `/cadastro` ou defina `OWNER_BOOTSTRAP_*` no `.env` para ligar o emitente já existente ao seu e-mail.

### Variáveis

```env
TURSO_DATABASE_URL=file:local-nfe.db
TURSO_AUTH_TOKEN=

# cookie de sessão (mín. 32 caracteres em produção)
SESSION_PASSWORD=

# opcional: liga a primeira empresa do banco a este login
OWNER_BOOTSTRAP_EMAIL=
OWNER_BOOTSTRAP_PASSWORD=

# simulated = não chama a SEFAZ (padrão)
# real = SOAP + mTLS + assinatura nos endpoints oficiais
SEFAZ_MODE=simulated
SEFAZ_UF=SP
```

`.env`, `*.pfx`, `*.p12` e o SQLite local não entram no git.

## Fluxo

1. **Cadastro / login** — cada e-mail só vê as empresas vinculadas
2. **Configurações** — emitente, inscrição municipal, A1, senha
3. **Clientes** — tomador / destinatário
4. **Emitir NFS-e** — serviço, valor, código da lista oficial
5. **NFS-e emitidas** — filtro, ordenação, PDF da Prefeitura
6. **Emitir NF-e** — mercadoria (homologação ou produção, conforme o certificado)

Para NFS-e de São Paulo o emitente precisa de CCM/IM e A1 já habilitado na Prefeitura. Para NF-e real, o CNPJ precisa estar credenciado na SEFAZ da UF.

## Rotas

| Rota | Função |
|------|--------|
| `/` | Landing pública |
| `/painel` | Painel de emissão |
| `/emitir-nfse` | Nova NFS-e |
| `/nfse` | Histórico de NFS-e |
| `/emitir` | Nova NF-e 55 |
| `/notas` | Histórico de NF-e |
| `/clientes` | Cadastro de tomadores |
| `/produtos` | Cadastro de produtos |
| `/configuracoes` | Empresa, certificado e senha |

## Desenvolvimento

```bash
npm test          # Vitest
npm run typecheck
npm run build
npm run verify    # format + lint + typecheck + test + build
```

Detalhes internos em [`docs/STATUS.md`](docs/STATUS.md) e na spec da NFS-e em [`docs/superpowers/specs/2026-08-14-nfse-sp-design.md`](docs/superpowers/specs/2026-08-14-nfse-sp-design.md).
