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
| 4 — Autenticação | 🟡 Cadastro, login, logout e sessão (cookie HttpOnly + tabela `sessions`, scrypt) escritos; sem MFA, verificação de e-mail e recuperação de senha. Não testado contra um banco real. |
| 5 — Painel | ⬜ |
| 6 — KYC/KYB | 🟡 Fluxo de pessoa física (`/kyc`, `/api/kyc/*`) sobre `kyc_cases`/`kyc_documents`; CPF validado (`src/lib/validations/cpf.ts`). Arquivos em `uploads-privados/` (fora de `public/`). Sem revisão/decisão pelo analista (Fase 8) e sem KYB. |
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

## Painel — Fase 1 (verificado)

- Páginas em `src/app/(dashboard)`: `/dashboard` (com Log de Atividade), `/premiacoes`, `/perfil`, `/trackeamento`, `/status-pix`, `/notificacoes`, `/gateways`, `/fluxos` e `/fluxos/[id]`, além de transações, clientes e pendências KYC.
- Acesso: `requireApproved()` em `src/server/auth/guard.ts` (login + KYC aprovado); mutações em `src/server/actions/product.ts` conferem a origem.
- Banco: `platform_gateways`, `tracking_configs`, `notification_preferences`, `user_profiles`, `flows`, `flow_steps`; trigger de imutabilidade em `transactions` (`immutability-transactions.sql`).
- API keys e valores de trackeamento são cifrados com AES-256-GCM (`ENCRYPTION_KEY`).
- Limites assumidos: gateways de terceiros só guardam a chave (cobrança não integrada); trackeamento salva e ativa, mas não envia eventos; `/robos` e Telegram ficam para a Fase 2.
- Verificação: `tsc`, `eslint` (arquivos novos) e `next build` passam; as páginas respondem 200 com sessão válida e sem verde no HTML. Não testado em navegador.
- O trigger de `transactions` recusa TRUNCATE; DELETE/UPDATE ainda não foram exercitados por não haver linhas.

## Painel — ajustes de UI (sidebar, perfil, gateways, premiações)

- Sidebar (`components/dashboard/sidebar.tsx`): sem ícones, texto vermelho `#ff0033` em negrito, item ativo com fundo `#4a0a0a`; logo com peão sobre degradê `#ff0033→#990000` e "DOMINUS PAY" em branco. Ordem: Saldo, Dashboard, Transações, Clientes, Pendências KYC, Fluxos, Robôs, Trackeamento, Status PIX, Premiações, Notificações, Gateways, Meu Perfil. Ranking, Análises, Financeiro, Equipe e itens "em breve" foram removidos do menu (a rota `/ranking` continua existindo).
- Meu Perfil: layout centralizado com foto (`POST /api/profile/avatar`, JPG/PNG/WEBP até 5 MB, tipo checado pelos bytes, grava em `public/avatars/`; coluna `user_profiles.avatar_url`), e-mail travado, CPF, telefone e Faturamento. Em produção sem disco gravável/persistente, trocar o destino por armazenamento de objetos.
- Gateways: "Dominus Wallet" (sem "Pro Max"), taxa R$ 1,00 (`WALLET_FEE_CENTS = 100`), saldo mínimo R$ 12,00. Logos em `public/gateways/logos/*.svg` são placeholders desenhados à mão (não são as logos oficiais); substitua os arquivos mantendo o nome.
- Premiações V2 (`components/product/awards-board.tsx`, `lib/awards.ts`): trilha com Peão/Cavalo/Bispo/Torre/Rainha (+ Rei) em SVG, "Falta R$ X - N%" ou "META BATIDA!", card detalhado por meta, fundo xadrez e barras mensais em SVG com a peça no mês em que a meta foi batida. O volume vem do banco; o navegador só guarda o último volume visto (localStorage). Prêmios de 100 MIL e 500 MIL são textos provisórios.
- Verificação: `tsc` limpo, 100 testes passam, `next build` compila; páginas respondem 200 com sessão temporária. Erros de eslint restantes estão só em `components/landing/stage` (anteriores a este lote). Não conferido visualmente no navegador.

## Motor de fluxos (Telegram)

- Tabela `flow_runs` (uma execução ativa por lead e fluxo, índice único parcial). Código em `src/server/flows/engine.ts`; regras puras em `src/lib/flow-steps.ts`.
- `/start` (primeiro processamento do update) cria a execução do fluxo vinculado ao bot e a executa na hora; o agendador (`runFlowTick`, a cada 5 s) cuida de retentativas, esperas e prazos.
- Passos: **message** (`{nome}` é substituído), **pix** (cria intenção + cobrança no provedor + transação com `bot_id`, envia o copia-e-cola e publica `pix.generated`), **wait_payment** (pausa até a transação ficar `approved` ou o prazo acabar; padrão 30 min, máx. 24 h), **deliver** (link vira botão; texto vai como mensagem).
- Falhas: bot bloqueado cancela; 429 respeita `retry_after`; erro transitório tenta 3 vezes (30 s, 60 s…); erro de configuração ou provedor ausente falha, avisa o cliente e publica `pix.failed`. Prazo esgotado marca `expired`, avisa o cliente e publica `pix.expired`.
- Sem webhook de PIX: nada marca a transação como `approved` ainda. Quando existir, basta aprovar a transação; o próximo ciclo retoma a execução e libera o conteúdo. Com `PAYMENT_PROVIDER=none` o passo PIX falha de propósito (não há adaptador real).
- Verificado com banco real e Telegram/provedor simulados (5 cenários: mensagem+entrega, PIX→espera→aprovado→entrega, prazo esgotado, sem provedor, espera sem PIX), `tsc`, 104 testes e `next build`. O teste de integração foi descartado por depender do banco. Não testado com Telegram nem provedor reais.
- Limite: se o processo cair entre enviar a mensagem e gravar o passo, a mensagem pode ser reenviada.

## Painel — sidebar neon, footer de perfil, Clientes V2

- Sidebar: itens brancos com borda, hover neon cinza com varredura (`.dp-menu-item` em `globals.css`, respeita `prefers-reduced-motion`), item ativo em `#ff0033`. Logo com peão Staunton em SVG. Footer com avatar, faturamento aprovado e ranking (`getOrgRank`, por organização; "# --" sem faturamento).
- Clientes V2 (`/clientes`): métricas, funil Novos/Recorrentes/VIP, tabela estruturada com linha fantasma, busca, filtro, CSV e modal com histórico e bloqueio (`payment_customers.blocked`, aplicado com push).
- Regras: Ativo = comprou nos últimos 30 dias; VIP = volume ≥ R$ 1.000; Recorrente = 2+ compras aprovadas.
- Limites: vendas do Telegram ainda não criam `payment_customers` (depende do webhook de PIX); "conversas" não existe no banco; visual não conferido no navegador.

## Eleva (PIX) — integração

- `src/lib/gateways/eleva.ts` (`createPix`, `getStatus`, `getBalance`, `handleWebhook`), adaptador `server/payments/adapters/eleva.ts` (registrado como `PAYMENT_PROVIDER=eleva`), liquidação em `server/payments/settle.ts` e webhook em `/api/webhooks/eleva`. Toda chamada vai para `gateway_logs`.
- O motor de fluxos já cria cobrança pelo provedor registrado, então o passo PIX passa a usar a Eleva. Aprovado: transação `approved`, ledger (débito `receivable_provider` / crédito `merchant_payable`), cliente criado em `payment_customers`, lead `hasPaid`, evento `pix.paid` e entrega do fluxo no Telegram na hora.
- Segurança do webhook: a Eleva não documenta assinatura, então o payload nunca é confiável; o status é reconsultado na API antes de qualquer alteração. Polling de segurança a cada 20 s (máx. 5 cobranças) cobre webhook perdido e desenvolvimento local sem URL pública.
- **Pendente:** `POST /transactions` responde 405 (`Allow: GET, HEAD`). O caminho real de criação de PIX e o formato da resposta não estão documentados; configure `ELEVA_CREATE_PIX_PATH`. A leitura da resposta (id e código `000201…`) é tolerante, mas não foi testada contra a API real. Auth validada: `GET /balance` e `GET /transactions` → 200. Valores enviados em centavos (a unidade esperada pela Eleva não está confirmada).

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
