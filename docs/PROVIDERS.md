# Conectar um provedor de pagamentos

A Dominus fala com provedores por adaptadores que implementam `PaymentProviderAdapter` (`src/server/payments/provider.ts`). Hoje só existe o adaptador `none`, que recusa toda operação.

## O que é preciso do provedor

- Contrato assinado e credenciais de **teste** e de **produção**.
- Documentação da API: criação/consulta/cancelamento de cobrança, reembolso, webhooks.
- Esquema de assinatura dos webhooks (algoritmo, cabeçalhos, tolerância de tempo).
- Lista de status do provedor, para o mapeamento.
- Tabela de tarifas contratada por método e a regra de arredondamento.

## Passo a passo

1. Crie `src/server/payments/adapters/<provedor>.ts` implementando o contrato.
2. `getCapabilities()` deve refletir **o que o contrato permite**, não o que a API do provedor tem em teoria.
3. `mapStatus()` converte cada status do provedor para um dos estados internos. Status desconhecido → lançar `ProviderError("INVALID_PROVIDER_RESPONSE")`, nunca adivinhar.
4. `verifyWebhook()` calcula a assinatura sobre o **corpo bruto**, compara em tempo constante e rejeita eventos fora da janela de tempo.
5. Mapeie erros HTTP/de negócio do provedor para `ProviderErrorCode`. Timeouts e 5xx são retentáveis; o resto não.
6. Adicione as credenciais em `src/server/env.ts` (validadas com zod, sem prefixo `NEXT_PUBLIC_`).
7. Registre o adaptador em `src/server/payments/registry.ts` e defina `PAYMENT_PROVIDER=<id>`.
8. Escreva testes com respostas gravadas do ambiente de teste do provedor: sucesso, recusa, timeout, resposta inválida, webhook duplicado, webhook fora de ordem, assinatura inválida.

## Regras que não mudam

- Dados de cartão: só checkout hospedado ou componente seguro do provedor. Nada de formulário que envie número de cartão ao backend da Dominus.
- CVV nunca é armazenado.
- Redirecionamento do navegador não é prova de pagamento.
- Credenciais nunca aparecem em logs, respostas de API ou no painel depois de cadastradas.
