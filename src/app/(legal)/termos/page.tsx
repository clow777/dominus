import type { Metadata } from "next";
import Link from "next/link";

import { CompanyField, LegalPage } from "@/components/legal/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Condições de uso da plataforma Dominus Payments.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  const c = site.company;
  return (
    <LegalPage title="Termos de uso" updatedAt={new Date("2026-10-17T12:00:00-03:00")}>
      <section>
        <h2>1. Quem somos</h2>
        <p>
          A plataforma Dominus Payments é operada por <CompanyField value={c.legalName} placeholder="razão social" />,
          inscrita no CNPJ <CompanyField value={c.cnpj} placeholder="CNPJ" />, com sede em{" "}
          <CompanyField value={c.address} placeholder="endereço" /> (“Dominus”).
        </p>
      </section>

      <section>
        <h2>2. O que a Dominus faz</h2>
        <p>
          A Dominus oferece tecnologia para criar cobranças, acompanhar transações, solicitar reembolsos, conciliar
          registros e integrar sistemas por API. O processamento, a captura e a liquidação dos pagamentos são realizados
          por provedores de pagamento autorizados, contratados para cada operação.
        </p>
        <p>
          <strong>A Dominus não custodia recursos de clientes</strong>, salvo se e quando houver modelo operacional e
          autorização regulatória específicos para isso, comunicados previamente por escrito. Prazos de liquidação,
          tarifas e métodos disponíveis são os definidos no contrato com o provedor e informados no painel.
        </p>
      </section>

      <section>
        <h2>3. Cadastro e verificação</h2>
        <ul>
          <li>Para usar a plataforma é preciso criar uma conta com informações verdadeiras e atualizadas.</li>
          <li>
            Antes de operar em produção, a conta passa por verificação cadastral (KYC/KYB). Podemos solicitar
            documentos e informações adicionais, recusar ou suspender cadastros de forma fundamentada.
          </li>
          <li>Você é responsável pelo sigilo das suas credenciais, chaves de API e pelas ações da sua equipe.</li>
        </ul>
      </section>

      <section>
        <h2>4. Uso permitido</h2>
        <p>
          É proibido usar a plataforma para atividades ilegais, fraudulentas, que violem direitos de terceiros ou que
          sejam vedadas pelas políticas do provedor de pagamentos contratado. A relação de atividades não aceitas será
          publicada junto à versão revisada destes termos.
        </p>
      </section>

      <section>
        <h2>5. Tarifas</h2>
        <p>
          As tarifas são definidas em proposta comercial aceita por escrito e exibidas no painel. Nenhuma tarifa é
          cobrada sem previsão contratual.
        </p>
      </section>

      <section>
        <h2>6. Suspensão e encerramento</h2>
        <p>
          A conta pode ser suspensa em caso de suspeita fundamentada de fraude, descumprimento destes termos ou
          determinação legal, com registro da decisão e comunicação ao titular sempre que permitido.
        </p>
      </section>

      <section>
        <h2>7. Responsabilidades</h2>
        <p>
          A Dominus emprega controles técnicos e organizacionais para manter a plataforma disponível e segura, mas não
          garante funcionamento ininterrupto nem responde por falhas de sistemas de terceiros, incluindo provedores de
          pagamento e instituições financeiras. Os limites de responsabilidade serão detalhados na versão revisada.
        </p>
      </section>

      <section>
        <h2>8. Dados pessoais</h2>
        <p>
          O tratamento de dados pessoais segue a <Link className="text-paper underline" href="/privacidade">Política de privacidade</Link>.
        </p>
      </section>

      <section>
        <h2>9. Alterações e foro</h2>
        <p>
          Mudanças relevantes nestes termos serão comunicadas com antecedência. Aplica-se a legislação brasileira. O foro
          será definido na versão revisada destes termos.
        </p>
      </section>
    </LegalPage>
  );
}
