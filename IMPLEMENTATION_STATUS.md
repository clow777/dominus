# Status de implementação — Dominus Payments

Arquivo persistente de progresso. Ao retomar o trabalho, leia este arquivo primeiro e continue do ponto indicado em **Próximo passo**.

_Última atualização: 17/10/2026_

## Bloqueio atual

O ambiente de desenvolvimento em nuvem usado até aqui **não tem acesso ao registry do npm** (`registry.npmjs.org` recusado pela política de rede). Por isso ainda **não foi possível**: instalar dependências, rodar ESLint, `tsc`, Vitest, Playwright nem `next build`, nem inspecionar a landing no navegador.

O que foi possível verificar sem dependências está listado abaixo como **verificado**. Tudo marcado como **escrito** precisa passar por `npm run check` e `npm run test:e2e`.

## Fases

| Fase | Situação |
| --- | --- |
| 1 — Auditoria | ✅ Concluída. Projeto vazio; stack definida (docs/DECISIONS.md). |
| 2 — Fundação | 🟡 Escrita; parcialmente verificada (ver abaixo). |
| 3 — Landing page | 🟡 Escrita; aguardando build e inspeção visual. Peão aguardando imagem de referência. |
| 4 — Autenticação | ⬜ Não iniciada. `/entrar` e `/criar-conta` mostram aviso honesto de "em implantação". |
| 5 — Painel | ⬜ |
| 6 — KYC/KYB | ⬜ (modelagem de dados pronta) |
| 7 — Pagamentos | ⬜ (contrato de adaptadores e máquina de estados prontos) |
| 8 — Administração | ⬜ |
| 9 — Segurança | ⬜ (cabeçalhos e CSP iniciais prontos) |
| 10 — Qualidade | ⬜ |
| 11 — Entrega | ⬜ |

## Verificado

- **79 testes unitários passando** (dinheiro, máquina de estados, contrato de provedores, trajetória e perfil do peão), executados com o runtime TypeScript nativo do Node 22 e um adaptador temporário compatível com a API do Vitest. Confirmado que o adaptador acusa falhas.
- **Triggers de imutabilidade** (`src/server/db/sql/immutability.sql`) testados em PostgreSQL 16.15 real: diário balanceado aceito; desbalanceado recusado; UPDATE, DELETE e TRUNCATE recusados em `ledger_entries`, `transaction_events` e `audit_logs`.

## Escrito, aguardando verificação

- Configuração: `package.json`, `tsconfig` estrito, Next com cabeçalhos de segurança e CSP, ESLint, Vitest, Playwright, Drizzle, `.env.example`.
- Schema completo do banco (`src/server/db/schema.ts`): 33 tabelas cobrindo todos os modelos do brief, mais `auth_tokens`, `consents`, `idempotency_keys`, `transaction_events`, `payment_links` e `support_messages`.
- Design system: tokens em `globals.css`, botão, campo acessível, superfícies, skeleton, estado vazio, badge de status, logo.
- Landing: hero, 10 seções com as frases do brief, prévia do painel (rotulada como ilustração), FAQ, CTA final, rodapé; páginas de termos, privacidade, cookies e contato (minutas); SEO (metadados, Open Graph gerado, sitemap, robots, JSON-LD).
- Peão: cena 3D (lathe + cromado de estúdio local), fallback CSS/SVG, trilha mobile, movimento reduzido, pausa fora da tela, carregamento ocioso, fronteira de erro.
- Testes e2e (`tests/e2e/landing.spec.ts`): CTAs, ordem das seções, overflow horizontal, cabeçalhos de segurança, páginas legais, SEO, trajetória do peão no desktop, palco sem cobrir conteúdo, movimento reduzido, mobile.

## Pendências externas

- Liberar `registry.npmjs.org` no ambiente (ou rodar localmente) para instalar e verificar.
- Imagem de referência do peão.
- Dados societários reais (razão social, CNPJ, endereço, e-mails) e revisão jurídica dos textos.
- Contrato com provedor de pagamentos (não escolhido; ver docs/PROVIDERS.md).

## Próximo passo

1. `npm install` → `npm run check` → corrigir o que aparecer.
2. `npm run build && npx playwright install chromium && npm run test:e2e`.
3. Abrir a landing em desktop e mobile, revisar o peão (material, luz, câmera, trajetória) com capturas de tela.
4. Com a imagem de referência: ajustar perfil e material do peão.
5. Seguir para a Fase 4 (autenticação).
