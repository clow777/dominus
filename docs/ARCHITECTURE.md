# Arquitetura

## Camadas

```
┌──────────────────────── Next.js (App Router) ────────────────────────┐
│  app/            rotas: páginas (RSC), /api/v1 (Fase 7), webhooks     │
│  components/     interface — nunca contém regra financeira            │
├──────────────────────────────────────────────────────────────────────┤
│  server/domain/  regras puras: estados, transições, cálculos          │
│  server/payments contrato de provedores + adaptadores + registro      │
│  server/db/      schema, cliente, migrações (repositórios na Fase 4+) │
│  lib/            utilitários puros compartilhados (money, motion)     │
└──────────────────────────────────────────────────────────────────────┘
           │                                   │
      PostgreSQL 16                   Provedor de pagamentos autorizado
 (ledger/auditoria append-only)     (Pix, cartão, boleto — via adaptador)
```

Regras de dependência:
- `components/` pode importar `lib/` e tipos/rótulos de `server/domain/` (que são puros), nunca `server/db` nem `server/payments`.
- Módulos com segredos ou acesso a banco importam `server-only`: o build falha se forem parar no cliente.
- Toda mudança de status de transação passa por `server/domain/transactions/state-machine.ts`.

## Fluxo de um pagamento (alvo da Fase 7)

1. `POST /api/v1/payment-intents` com `Idempotency-Key` → valida, grava `payment_intents` e a chave em `idempotency_keys`.
2. O adaptador do provedor cria a cobrança (repassando a chave se o provedor suportar).
3. `transactions` nasce em `created`/`awaiting_payment` com o `external_id` do provedor.
4. O provedor envia webhook → assinatura verificada pelo adaptador → evento gravado em `provider_events` (deduplicado) → `decideProviderUpdate` → `transaction_events` + novo status, na mesma transação de banco.
5. Sem webhook em tempo hábil, um job consulta o status (`getCharge`). A página de retorno do checkout nunca altera status.
6. A conciliação compara periodicamente o estado interno com o relatório do provedor.

## Isolamento entre organizações

Todo registro de negócio carrega `organization_id`. Os repositórios (Fase 4+) recebem a organização do contexto autenticado — nunca de parâmetro da requisição — e toda consulta filtra por ela. Testes de isolamento fazem parte da Fase 9.

## Landing page — o peão

```
scrollY ──► computeAnchors (1× por resize) ──► samplePath ──► Journey (ref + MotionValues)
                                                                 │
                         ┌───────────────────────────┬───────────┴──────────────┐
                    PawnScene (three)          PawnFallback (CSS 3D)       MobileTrack
               frameloop "demand", amortece    mesma trajetória, SVG      6 casas no cabeçalho
               pose e câmera; para fora da tela
```

- `three` e `@react-three/fiber` só carregam no cliente, quando o navegador fica ocioso.
- Sem WebGL, com perda de contexto ou erro de renderização: fica o fallback 2D.
