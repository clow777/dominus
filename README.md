# Dominus Payments

> Cada movimento conta.

Plataforma de pagamentos: landing page, painel do cliente, verificação cadastral (KYC/KYB), API, webhooks e conciliação, sobre provedores de pagamento autorizados conectados por adaptadores.

**Estado atual:** fases 1–3 (auditoria, fundação e landing page). Veja [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) para o que está pronto, testado e pendente.

## Requisitos

- Node.js 20.9+ (desenvolvido em 22)
- PostgreSQL 16+
- npm 10+

## Instalação

```bash
cp .env.example .env          # preencha; nunca versione o .env
npm install
npm run dev                    # http://localhost:3000
```

### Banco de dados

```bash
createdb dominus
npm run db:generate                                   # gera a migração inicial a partir do schema
npx drizzle-kit generate --custom --name immutability # cria a migração customizada vazia
#   copie src/server/db/sql/immutability.sql para o arquivo gerado em drizzle/
npm run db:migrate
```

A migração de imutabilidade torna `ledger_entries`, `transaction_events` e `audit_logs` somente-inserção e exige que todo diário do ledger feche (débitos = créditos).

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos (tsc) |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright; requer `npm run build` e `npx playwright install chromium`) |
| `npm run check` | lint + tipos + testes + build |
| `npm run db:*` | Drizzle: gerar, migrar, abrir o studio |

## Estrutura

```
src/
  app/                    rotas (App Router): landing, páginas legais, SEO, /api
  components/
    ui/                   design system: botão, campo, superfícies, status, logo
    landing/              seções da landing e o palco do peão (stage/)
    legal/                layout das páginas legais e placeholders de acesso
  lib/
    money.ts              dinheiro em centavos inteiros, tarifas, arredondamento
    motion/               trajetória e perfil do peão (funções puras, testadas)
    site.ts               marca e dados societários (vindos do ambiente)
  server/
    db/                   schema Drizzle, cliente, SQL de imutabilidade
    domain/transactions/  máquina de estados de transações
    payments/             contrato de provedores, erros, adaptadores, registro
    env.ts                variáveis de ambiente validadas (somente servidor)
tests/
  unit/                   regras de domínio e trajetória do peão
  e2e/                    landing: responsividade, peão, movimento reduzido, cabeçalhos
docs/                     arquitetura, decisões e guia de provedores
```

## Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Decisões técnicas](./docs/DECISIONS.md)
- [Como conectar um provedor de pagamentos](./docs/PROVIDERS.md)
