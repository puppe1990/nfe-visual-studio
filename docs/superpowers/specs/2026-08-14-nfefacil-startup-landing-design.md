# NFeFácil — landing de startup (papel timbrado)

Data: 2026-08-14  
Status: aprovado no brainstorm (aguardando review do arquivo)

## Problema

A `/` pública já existe, mas não convence como site de startup. Parece um recorte do app: hero + cards + passos, sem prova oficial, sem FAQ e sem hierarquia de marketing. Quem chega com CNPJ, CCM e A1 precisa entender em dez segundos que a nota vai **direto** à Prefeitura de SP / SEFAZ.

## Objetivo

Reescrever só a rota pública `/` para parecer um produto próprio (papel timbrado), converter o emitente para `/cadastro` (ou `/painel` se já logado) e explicar NFS-e Paulistana + NF-e 55 sem intermediário.

Público: dono de empresa de serviço em SP (ênfase). Contador / escritório é secundário — a copy fala “você emite”, não “seu cliente”.

## Fora de escopo

- Pricing, waitlist, depoimento, logo de cliente, blog
- Dark mode na landing
- Mudar tema, rotas ou shell do app autenticado (`/painel`, `/nfse`, login visual além do CTA)
- Novo produto, posicionamento SaaS com planos, ou outra marca
- Chamadas à Pref. SP / SEFAZ na landing

## Abordagem

Rota fina + uma peça por seção em `src/components/landing/`. Tokens e grain em `styles.css` (`.landing*`). Sem CSS module paralelo.

## Seções (ordem fixa)

1. **Header** — FileCheck + “NFeFácil”; âncoras `#produto` `#como` `#faq`; `Entrar` → `/login`; `Criar conta` → `/cadastro`. Se `signedIn`: um botão `Abrir painel` → `/painel`.
2. **Hero** — kicker `Pref. SP · SEFAZ`; H1 `A nota sai daqui.` + linha `Sem atravessador.`; subtítulo: NFS-e Paulistana e NF-e 55 assinadas com o A1 da empresa, XML no webservice oficial. CTAs: `Começar a emitir` / `Já tenho conta` (ou `Continuar no painel`). À direita, folha de RPS (não card de dashboard): série A / 0072, tomador Avant Projetos Ltda, serviço 01880, R$ 2.000,00, selo Autorizada.
3. **Faixa de prova** (`#prova`) — quatro fatos, sem aspas: Prefeitura de São Paulo · SEFAZ direta · certificado A1 · sem Focus / TecnoSpeed.
4. **Produto** (`#produto`) — duas colunas: NFS-e Paulistana (RPS, códigos oficiais, PDF da Prefeitura, importar histórico) e NF-e 55 (XML 4.00, autorizar, cancelar, inutilizar).
5. **Como emite** (`#como`) — 01 cadastre emitente (CNPJ, CCM, A1) · 02 inclua o tomador · 03 emita a nota.
6. **FAQ** (`#faq`) — exatamente estas quatro:
   - Preciso de certificado A1? — Sim, PFX da empresa. Sem token de terceiro.
   - Emite NFS-e fora de São Paulo? — Não. Serviço é Pref. SP (Nota do Milhão). Mercadoria é SEFAZ da UF do emitente.
   - Vocês passam por Focus ou TecnoSpeed? — Não. SOAP + mTLS no webservice oficial.
   - Tem mensalidade? — Conta grátis neste momento. Sem tabela de planos nesta página.
7. **CTA + rodapé** — `Pronto para a próxima NFS-e.` + `Criar conta grátis` (ou painel). Rodapé: uma linha + link GitHub `https://github.com/puppe1990/nfe-visual-studio`.

## Visual

- Papel: fundo creme, grain, linhas de caderno leves (já em `.landing`).
- Display: Fraunces. Corpo: Figtree.
- Tinta `#1c1914` (oklch equivalente). Regras cor de papel. Botão primário = tinta sólida, cantos do `--radius` do app, não pill.
- RPS: folha branca-quente, sombra de papel, linhas tracejadas, não card cinza de admin.
- Motion: fade/slide curto só no hero (CSS). Sem scroll-jack.
- Não usar Inter, gradiente roxo, nem o azul `--primary` do painel como fundo da landing.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/routes/index.tsx` | `head`, `loader`, compõe seções. Sem markup longo. |
| `src/components/landing/LandingHeader.tsx` | nav + CTAs de sessão |
| `src/components/landing/LandingHero.tsx` | headline + RPS |
| `src/components/landing/LandingProofStrip.tsx` | quatro fatos |
| `src/components/landing/LandingProducts.tsx` | NFS-e / NF-e |
| `src/components/landing/LandingHowItWorks.tsx` | três passos |
| `src/components/landing/LandingFaq.tsx` | quatro perguntas |
| `src/components/landing/LandingCta.tsx` | bloco final |
| `src/components/landing/LandingFooter.tsx` | rodapé |
| `src/styles.css` | tokens `.landing*` |

Cada arquivo < 300 linhas. `index.tsx` < 200. Peças recebem `signedIn: boolean` só onde o CTA muda.

## Dados e erros

- Loader: `getCurrentUserFn()`. `ok` → `signedIn: true`. Qualquer falha → `signedIn: false`. A página sempre renderiza.
- `/` permanece em `publicPaths` de `__root.tsx`. Não autenticar a landing.
- Sem fetch de notas, métricas ou certificado na `/`.

## Teste

Sem teste de pixel. Sem mock de SOAP. Typecheck + suite atual bastam. Se o loader da `/` quebrar o typecheck (props das peças), corrigir antes de merge.

## Critério de pronto

- `/` no desktop e no mobile mostra as sete seções, âncoras funcionam, CTAs batem na sessão.
- Visitante chega em `/cadastro`; usuário logado chega em `/painel`.
- Não parece UI kit: papel, serifada, RPS como documento.
- `AppShell` não envolve a landing.
