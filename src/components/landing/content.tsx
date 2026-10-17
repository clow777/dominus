import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";
import { DashboardPreview } from "./dashboard-preview";
import { Section } from "./section";

/* ───────── Pagamentos ───────── */

const METHODS = [
  {
    name: "Pix",
    text: "Cobrança com QR Code e copia-e-cola, com validade definida. O pagamento só é dado como recebido quando o provedor confirma.",
  },
  {
    name: "Cartão de crédito e débito",
    text: "Checkout seguro do provedor. Os dados do cartão não passam pelos servidores da Dominus, e o CVV nunca é armazenado.",
  },
  {
    name: "Boleto",
    text: "Emissão, vencimento e acompanhamento até a compensação, com o status atualizado por notificação assinada.",
  },
  {
    name: "Links de pagamento",
    text: "Uma cobrança pronta para enviar: valor, descrição, validade, limite de pagamentos e endereço de retorno definidos por você.",
  },
] as const;

export function Payments() {
  return (
    <Section
      id="pagamentos"
      phrase="Grandes resultados começam com movimentos precisos."
      lead="Uma integração para receber por Pix, cartão e boleto. Sua conta mostra exatamente quais métodos o provedor conectado oferece — nada aparece como disponível antes de estar."
    >
      <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {METHODS.map((m) => (
          <div key={m.name} className="border-t border-line pt-5">
            <dt className="text-[1.0625rem] font-medium text-paper">{m.name}</dt>
            <dd className="mt-2 text-[0.9375rem] leading-relaxed text-steel-light">{m.text}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ───────── Produto (painel) ───────── */

export function Product() {
  return (
    <Section
      id="produto"
      phrase="Seus pagamentos. Sua operação. Sua visão."
      lead="Volume, aprovações, pendências e reembolsos no mesmo painel. Cada indicador traz a própria definição, para que todos na equipe leiam o mesmo número da mesma forma."
    >
      <DashboardPreview />
    </Section>
  );
}

/* ───────── Transações ───────── */

const LIFECYCLE = [
  { status: "Criada", detail: "Cobrança registrada com chave de idempotência. Repetir a requisição não gera uma segunda cobrança." },
  { status: "Aguardando pagamento", detail: "QR Code, boleto ou checkout entregues pelo provedor, com prazo de expiração." },
  { status: "Aprovada", detail: "Confirmada por notificação assinada do provedor ou por consulta autenticada — nunca pela página de retorno." },
  { status: "Reembolsada parcialmente", detail: "Reembolso com motivo, autorizado por quem tem permissão e registrado no histórico." },
] as const;

export function Transactions() {
  return (
    <Section
      id="transacoes"
      phrase="Cada transação merece clareza."
      lead="Toda mudança de status fica registrada: o que mudou, quando, e quem ou o que causou a mudança. O histórico não é editado, só acrescentado."
    >
      <ol className="relative grid gap-8 border-l border-line pl-8">
        {LIFECYCLE.map((step, i) => (
          <li key={step.status} className="relative">
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-[37px] size-2.5 rounded-full border ${
                i === 2 ? "border-success bg-success" : "border-line-strong bg-ink"
              }`}
            />
            <p className="font-medium text-paper">{step.status}</p>
            <p className="mt-1.5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-steel-light">{step.detail}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ───────── Relatórios e conciliação ───────── */

const RECON = [
  { label: "Conciliadas", value: "1.271", tone: "text-success-text" },
  { label: "Divergência de valor", value: "2", tone: "text-warning-text" },
  { label: "Ausentes no provedor", value: "1", tone: "text-danger-text" },
  { label: "Pagas após expirar", value: "1", tone: "text-warning-text" },
] as const;

export function Reports() {
  return (
    <Section
      id="relatorios"
      phrase="Controle financeiro sem perder o foco."
      lead="Volume processado, valores a receber e saldo disponível são números diferentes e aparecem separados. A conciliação compara seus registros com os do provedor e aponta cada divergência para resolução."
    >
      <figure className="m-0">
        <div className="rounded-lg border border-line bg-ink-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="text-sm font-medium text-paper">Conciliação do período</p>
            <p className="text-[0.8125rem] text-steel">Exportar CSV</p>
          </div>
          <ul className="divide-y divide-line">
            {RECON.map((r) => (
              <li key={r.label} className="flex items-center justify-between px-5 py-3.5 text-[0.9375rem]">
                <span className="text-steel-light">{r.label}</span>
                <span className={`tabular font-medium ${r.tone}`}>{r.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <figcaption className="mt-3 text-[0.8125rem] text-steel">Ilustração com valores fictícios.</figcaption>
      </figure>
    </Section>
  );
}

/* ───────── Segurança e verificação ───────── */

const CONTROLS = [
  { title: "Permissões verificadas no servidor", text: "Cada função — financeiro, operador, desenvolvedor, suporte — vê e faz só o que lhe cabe. Esconder um botão nunca é o controle." },
  { title: "Organizações isoladas", text: "Trocar um identificador na requisição não dá acesso aos dados de outra empresa." },
  { title: "Autenticação reforçada", text: "Verificação em duas etapas para reembolsos, chaves de API e outras operações sensíveis." },
  { title: "Auditoria permanente", text: "Ações administrativas exigem justificativa e entram numa trilha que não pode ser alterada." },
  { title: "Dados de cartão fora do escopo", text: "A Dominus não armazena número completo de cartão nem CVV. A captura acontece no ambiente do provedor." },
  { title: "Privacidade desde o desenho", text: "Coleta mínima, documentos em armazenamento privado e prazos de retenção definidos, conforme a LGPD." },
] as const;

const VERIFICATION = [
  "Cadastro da conta e confirmação do e-mail",
  "Dados do responsável e, para empresas, da pessoa jurídica",
  "Envio dos documentos solicitados",
  "Análise da equipe ou do provedor de verificação",
  "Liberação para operar em produção",
] as const;

export function Security() {
  return (
    <Section
      id="seguranca"
      phrase="Segurança construída em várias camadas."
      lead="Nenhuma camada sozinha protege a operação. Por isso a Dominus combina controle de acesso, isolamento de dados, auditoria e verificação cadastral."
    >
      <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {CONTROLS.map((c) => (
          <div key={c.title} className="border-t border-line pt-5">
            <dt className="font-medium text-paper">{c.title}</dt>
            <dd className="mt-2 text-[0.9375rem] leading-relaxed text-steel-light">{c.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-20">
        <h3 className="text-title font-semibold text-paper">Verificação cadastral</h3>
        <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-steel-light">
          Toda conta passa por verificação (KYC para pessoas, KYB para empresas) antes de receber pagamentos reais.
          Você pode salvar o progresso e continuar depois, e acompanha cada etapa no painel.
        </p>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line">
          {VERIFICATION.map((step, i) => (
            <li key={step} className="flex items-baseline gap-5 bg-ink-2 px-5 py-4">
              <span className="tabular w-5 shrink-0 text-sm text-steel">{i + 1}</span>
              <span className="text-[0.9375rem] text-paper-soft">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ───────── Desenvolvedores ───────── */

const SNIPPET = `curl https://api.dominus.example/v1/payment-intents \\
  -H "Authorization: Bearer $DOMINUS_SECRET_KEY" \\
  -H "Idempotency-Key: pedido-48213" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 24900,
    "currency": "BRL",
    "method": "pix",
    "external_reference": "pedido-48213",
    "expires_in": 3600
  }'`;

const DEV_POINTS = [
  { title: "REST versionada", text: "Contrato em /v1 descrito em OpenAPI, erros estruturados e um identificador de correlação em cada resposta." },
  { title: "Idempotência", text: "Envie a mesma Idempotency-Key e receba a mesma resposta, sem cobrança duplicada." },
  { title: "Webhooks assinados", text: "Assinatura HMAC com carimbo de tempo, retentativas com intervalo crescente e reenvio pelo painel." },
  { title: "Teste e produção separados", text: "Chaves, dados e webhooks independentes para cada ambiente." },
] as const;

export function Developers() {
  return (
    <Section
      id="desenvolvedores"
      phrase="Integrações que conectam sua operação."
      lead="Uma API previsível para criar cobranças, consultar transações, solicitar reembolsos e receber notificações. Valores sempre em centavos."
    >
      <figure className="m-0">
        <pre className="overflow-x-auto rounded-lg border border-line bg-ink-2 p-5 font-mono text-[0.8125rem] leading-relaxed text-steel-light">
          <code>{SNIPPET}</code>
        </pre>
        <figcaption className="mt-3 text-[0.8125rem] text-steel">
          Prévia do contrato da API v1. A documentação completa acompanha a abertura das contas.
        </figcaption>
      </figure>
      <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {DEV_POINTS.map((p) => (
          <div key={p.title} className="border-t border-line pt-5">
            <dt className="font-medium text-paper">{p.title}</dt>
            <dd className="mt-2 text-[0.9375rem] leading-relaxed text-steel-light">{p.text}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ───────── Soluções / funcionalidades ───────── */

const FEATURES = [
  ["Links de pagamento", "Cobranças avulsas sem escrever código."],
  ["Reembolsos e disputas", "Fluxo com motivo, permissão e histórico, do pedido à confirmação."],
  ["Equipe e permissões", "Convide pessoas com a função certa para cada responsabilidade."],
  ["Clientes", "Histórico de pagamentos de cada cliente num só lugar."],
  ["Relatórios exportáveis", "Transações, tarifas e conciliação por período, em CSV."],
  ["Notificações", "Avisos de pagamentos, disputas e verificação no painel."],
] as const;

export function Solutions() {
  return (
    <Section
      id="solucoes"
      phrase="Menos complexidade. Mais controle."
      lead="O essencial para operar pagamentos no dia a dia, sem planilhas paralelas."
    >
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="border-t border-line py-5">
            <dt className="font-medium text-paper">{title}</dt>
            <dd className="mt-1.5 text-[0.9375rem] text-steel-light">{text}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ───────── Preços ───────── */

export function Pricing() {
  const contact = site.company.contactEmail;
  return (
    <section id="precos" aria-labelledby="precos-titulo" className="scroll-mt-24 px-4 pb-24 sm:px-8 lg:px-12">
      <div className="max-w-[680px] rounded-lg border border-line bg-ink-2 p-8 sm:p-10">
        <h2 id="precos-titulo" className="text-title font-semibold text-paper">
          Preços
        </h2>
        <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-steel-light">
          As tarifas dependem do método de pagamento, do volume e do provedor contratado. Você recebe a tabela completa
          por escrito antes de assinar, e o painel mostra as tarifas exatamente como foram contratadas.
        </p>
        <div className="mt-6">
          {contact ? (
            <ButtonLink href={`mailto:${contact}?subject=Proposta%20Dominus%20Payments`} variant="secondary">
              Solicitar proposta
            </ButtonLink>
          ) : (
            <ButtonLink href="/contato" variant="secondary">
              Solicitar proposta
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────── FAQ ───────── */

const FAQ = [
  {
    q: "Quais métodos de pagamento estão disponíveis?",
    a: "Pix, cartão e boleto podem ser oferecidos conforme o provedor de pagamentos conectado à sua conta e a elegibilidade do seu negócio. O painel mostra apenas os métodos que estão de fato ativos.",
  },
  {
    q: "A Dominus guarda o dinheiro recebido?",
    a: "Não. A Dominus é a camada de tecnologia: os recursos são processados e liquidados pelo provedor autorizado contratado, nos prazos do contrato com ele.",
  },
  {
    q: "Em quanto tempo recebo os valores?",
    a: "O prazo de liquidação depende do método e do contrato com o provedor. Ele é informado antes da contratação e aparece no painel para cada transação.",
  },
  {
    q: "Os dados de cartão passam pela Dominus?",
    a: "Não. Os dados do cartão são capturados no ambiente seguro do provedor. A Dominus recebe apenas um identificador da transação e nunca armazena o CVV.",
  },
  {
    q: "Por que preciso enviar documentos?",
    a: "A verificação cadastral é exigida para operar pagamentos e protege você e seus clientes contra fraude. Pedimos apenas os documentos necessários para o seu tipo de conta.",
  },
  {
    q: "Posso testar antes de receber pagamentos reais?",
    a: "Sim. Toda conta tem um ambiente de teste com chaves e dados separados, que nunca se misturam com operações reais.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-titulo" className="scroll-mt-24 px-4 py-24 sm:px-8 lg:px-12">
      <div className="max-w-[680px]">
        <h2 id="faq-titulo" className="text-headline font-semibold text-paper">
          Perguntas frequentes
        </h2>
        <div className="mt-10 border-b border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-t border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.0625rem] text-paper [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0 text-steel transition-transform duration-(--duration-base) group-open:rotate-45"
                  aria-hidden="true"
                >
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="max-w-[60ch] pb-6 text-[0.9375rem] leading-relaxed text-steel-light">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── CTA final ───────── */

export function FinalCta() {
  return (
    <Section
      id="comecar"
      phrase="O próximo movimento é seu."
      lead="Crie sua conta, conclua a verificação e conecte sua operação."
      className="lg:flex lg:min-h-[92svh] lg:flex-col lg:justify-center"
    >
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/criar-conta" size="lg">
          Começar agora
        </ButtonLink>
        <ButtonLink href="#faq" variant="ghost" size="lg">
          Ver perguntas frequentes
        </ButtonLink>
      </div>
    </Section>
  );
}
