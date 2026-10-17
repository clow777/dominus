# Decisões técnicas

Registro das escolhas feitas onde o brief deixava espaço. Cada uma segue a regra do brief: na dúvida, a alternativa mais segura e sustentável.

## D-001 — Next.js (App Router) + TypeScript estrito
Um único projeto para landing, painel, API e páginas legais. `strict`, `noUncheckedIndexedAccess` e `noImplicitOverride` ligados: código financeiro não deve aceitar `undefined` silencioso.

## D-002 — Drizzle ORM em vez de Prisma
Ambos atendem o brief. Drizzle foi escolhido porque:
- não depende de baixar binários de engine em tempo de instalação (o ambiente de build pode ter rede restrita);
- o schema é TypeScript puro, com `check` constraints, índices parciais e enums declarados junto do modelo;
- triggers e funções SQL (imutabilidade do ledger) entram como migrações customizadas versionadas.

## D-003 — Dinheiro em centavos inteiros, aritmética em BigInt
`bigint` no banco, `number` inteiro seguro na aplicação, multiplicações em `BigInt`. O arredondamento é explícito (`half-up` ou `half-even`) e definido pela tabela contratual de cada provedor, porque contratos diferentes arredondam de formas diferentes.

## D-004 — Papel da Dominus: gateway tecnológica
Até haver contrato e autorização regulatória específicos, a Dominus **não custodia nem liquida** recursos. A modelagem já inclui `ledger_accounts`/`ledger_entries` para quando houver livro próprio, mas nenhum fluxo trata saldo calculado como dinheiro disponível. O texto dos termos e do FAQ reflete isso.

## D-005 — Sem provedor, nada simula sucesso
`PAYMENT_PROVIDER=none` ativa um adaptador que declara zero métodos e recusa toda operação com `PROVIDER_NOT_CONFIGURED`. A interface usa essas capacidades vazias para mostrar os métodos como pendentes.

## D-006 — Webhooks fora de ordem e duplicados
Deduplicação por `(provider, external_event_id)` em `provider_events`. A decisão de aplicar, ignorar ou mandar para revisão está em `decideProviderUpdate`: um pagamento confirmado depois de expirado **não** reabre a transação — vira item de conciliação (`late_payment`) para análise humana.

## D-007 — CSP estática na Fase 3
As páginas atuais são estáticas; o runtime do Next exige `'unsafe-inline'` em `script-src` sem nonce. Na Fase 9 as rotas autenticadas passam a usar CSP com nonce gerado em `proxy.ts`. A cena 3D não carrega nada externo (sem HDR remoto, sem fontes de CDN), então `connect-src`/`img-src`/`font-src` ficam em `'self'`.

## D-008 — Peão 3D procedural, sem arquivo de modelo
O peão é um sólido de revolução (`LatheGeometry`) gerado de um perfil de pontos em `src/lib/motion/pawn-profile.ts`. O mesmo perfil desenha o SVG de fallback e a imagem Open Graph. Vantagens: zero download de modelo, nitidez em qualquer resolução, e as versões 3D/2D são o mesmo objeto. O cromado vem de um ambiente de estúdio montado em código (painéis de luz + uma faixa vermelha), processado por `PMREMGenerator`.

**Pendente:** ajustar proporções e material quando a imagem de referência for enviada.

## D-009 — Trajetória do peão como função pura
`samplePath(scrollY, anchors)` deriva a pose só da posição de rolagem; as âncoras são medidas uma vez por mudança de layout (ResizeObserver), nunca por quadro. A cena renderiza sob demanda (`frameloop="demand"`) e só enquanto a pose está convergindo; fora da tela não renderiza.

O caminho é uma sequência legal de peão (e2–e4–e5–e6–dxd7–d8): a casa final é literalmente a promoção, e é ela que fica vermelha no CTA final.

## D-010 — Layout em duas colunas no desktop
O palco 3D vive numa coluna `sticky` própria, à direita. Isso garante por construção que a peça nunca cobre textos, formulários ou botões (verificado em teste e2e). No mobile não há palco fixo: a cena aparece no hero e a jornada continua numa trilha de seis casas dentro do cabeçalho.

## D-011 — Movimento reduzido
Com `prefers-reduced-motion`, o peão não interpola nem salta: muda de casa de forma discreta (`snapPath`), a câmera não se move e as frases aparecem sem deslocamento (`MotionConfig reducedMotion="user"`).

## D-012 — Entrar / Criar conta antes da Fase 4
As rotas existem e dizem a verdade: a área de clientes está em implantação. Nenhum formulário falso.

## D-013 — Dados societários e textos legais
Razão social, CNPJ, endereço e e-mails vêm de `NEXT_PUBLIC_COMPANY_*`. Enquanto vazios, a interface mostra marcadores explícitos e as páginas legais exibem o aviso de minuta. `NEXT_PUBLIC_LEGAL_REVIEWED=true` só deve ser ligado após revisão jurídica.

## D-014 — Fonte Geist via pacote `geist`
Servida localmente pelo `next/font`, sem requisição a CDN em tempo de execução — compatível com a CSP `font-src 'self'`.
