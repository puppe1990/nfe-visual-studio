# NFS-e Prefeitura de São Paulo — spec

Data: 2026-08-14  
Status: aprovado (emissão oficial)

## Problema

O NFeFácil emite só NF-e modelo 55 (SEFAZ). As notas reais do emitente (67 e 71) são **NFS-e da Prefeitura de São Paulo**. Sem o webservice municipal não existe nota de serviço válida.

## Objetivo

Emitir NFS-e oficial (substituição de RPS) no webservice da Nota do Milhão, com o certificado A1 já cadastrado, para o tomador Avant.

## Fora de escopo

- NF-e 55 / SEFAZ
- NFS-e Nacional (ADN) — SP não aderiu
- API comercial (Focus, TecnoSpeed)
- Layout 2 (IBS/CBS) na primeira emissão
- Cancelamento, lote assíncrono, guia de ISS

## Abordagem

Webservice **síncrono direto**:

- Endpoint: `https://nfews.prefeitura.sp.gov.br/lotenfe.asmx`
- Fallback: `https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx`
- Método de emissão: `EnvioRPS` (SOAPAction `http://www.prefeitura.sp.gov.br/nfe/ws/envioRPS`)
- Método de sanidade: `ConsultaCNPJ`
- Schema: `PedidoEnvioRPS` versão 1 (`Cabecalho/@Versao="1"`)
- Auth: mTLS A1 + XMLDSig enveloped RSA-SHA1 no pedido + hash SHA1+RSA na tag `RPS/Assinatura`

## Dados do emitente

| Campo | Valor |
|---|---|
| CNPJ | 24490987000138 |
| IM / CCM | 62105809 (`6.210.580-9`) |
| Razão | MATHEUS NUNES PUPPE 02399708024 |
| Município | São Paulo / SP |

## Primeira nota (produto)

| Campo | Valor |
|---|---|
| Tomador | AVANT-PROJETOS, INVESTIMENTOS E PARTICIPACOES LTDA |
| CNPJ tomador | 25238319000180 |
| Código | 01880 |
| Tributação | T |
| ISS | 5%, sem retenção |
| Tipo RPS | RPS |
| Série RPS | A |

Discriminação e valor são informados na tela no momento da transmissão. `EnvioRPS` em produção **já é nota fiscal**.

## Arquitetura

Novos arquivos em `src/domain/`:

- `nfse-rps.ts` — monta a cadeia ASCII e assina o RPS
- `nfse-xml.ts` — `PedidoEnvioRPS` e `PedidoConsultaCNPJ`
- `nfse-client.ts` — SOAP 1.1 + mTLS
- `service-invoices.ts` — rascunho, transmitir, persistir retorno

Persistência:

- `companies.municipal_registration`, `rps_series`, `next_rps_number`
- tabela `service_invoices` (RPS, número NFS-e, código de verificação, XML, status)

UI:

- `/emitir-nfse` — formulário (cliente, código, valor, discriminação)
- `/nfse` — lista das NFS-e
- Configurações — IM + série/número RPS

Reutiliza: certificado A1, clientes, `loadA1FromPfx`, padrão `ServiceResult`.

## Erros

Retorno `Sucesso=false` com `Erro/Codigo` + `Descricao` vira `rejection_reason`. RPS já usado: orientar a avançar `next_rps_number`. Sem A1 ou sem IM: validação antes do SOAP.

## Testes

- Cadeia de assinatura do RPS com o exemplo oficial do manual v3.3.7
- XML de pedido contém tomador, código 01880 e IM
- Parser de `RetornoEnvioRPS` (sucesso e erro)
- Transmissão com client SOAP injetável (sem rede)

## Critério de pronto

1. `ConsultaCNPJ` com o A1 real responde IM do emitente
2. Usuário consegue transmitir NFS-e da Avant pelo app
3. Número e código de verificação voltam da Prefeitura e ficam gravados
