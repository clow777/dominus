import type { Metadata } from "next";
import Link from "next/link";

import { CompanyField, LegalPage } from "@/components/legal/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Dominus Payments trata dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  const c = site.company;
  return (
    <LegalPage title="Política de privacidade" updatedAt={new Date("2026-10-17T12:00:00-03:00")}>
      <section>
        <h2>1. Controlador e encarregado</h2>
        <p>
          O controlador dos dados é <CompanyField value={c.legalName} placeholder="razão social" />, CNPJ{" "}
          <CompanyField value={c.cnpj} placeholder="CNPJ" />. Solicitações sobre dados pessoais podem ser enviadas ao
          encarregado pelo e-mail <CompanyField value={c.privacyEmail} placeholder="e-mail do encarregado" />.
        </p>
      </section>

      <section>
        <h2>2. Dados que tratamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail, senha (armazenada apenas como hash), registros de acesso e sessão.</li>
          <li>
            <strong>Verificação cadastral:</strong> dados de identificação de pessoas e empresas, documentos e
            informações sobre a atividade comercial, na medida necessária para o tipo de conta.
          </li>
          <li>
            <strong>Operações:</strong> dados das cobranças e de quem paga (nome, e-mail e documento quando exigidos pelo
            provedor). Dados completos de cartão e CVV não são armazenados pela Dominus.
          </li>
          <li><strong>Técnicos:</strong> endereço IP, navegador e registros de segurança.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidades e bases legais</h2>
        <ul>
          <li>Prestar o serviço contratado (execução de contrato).</li>
          <li>Verificar identidade, prevenir fraude e cumprir obrigações legais e regulatórias.</li>
          <li>Garantir a segurança da plataforma e das contas (legítimo interesse).</li>
          <li>Enviar comunicações operacionais sobre a conta.</li>
        </ul>
        <p>Não usamos documentos de verificação para nenhuma finalidade além das informadas aqui.</p>
      </section>

      <section>
        <h2>4. Compartilhamento</h2>
        <p>
          Compartilhamos dados apenas com quem é necessário para prestar o serviço: provedores de pagamento, provedores
          de verificação cadastral, infraestrutura de nuvem e autoridades, quando exigido por lei. A lista de operadores
          será publicada na versão revisada desta política.
        </p>
      </section>

      <section>
        <h2>5. Retenção</h2>
        <p>
          Mantemos os dados pelo tempo necessário às finalidades acima e ao cumprimento de obrigações legais e
          regulatórias. Encerrado esse prazo, os dados são eliminados ou anonimizados.
        </p>
      </section>

      <section>
        <h2>6. Seus direitos</h2>
        <p>
          Nos termos do art. 18 da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
          portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento, além de se opor a
          tratamentos irregulares e peticionar à ANPD.
        </p>
      </section>

      <section>
        <h2>7. Segurança</h2>
        <p>
          Adotamos criptografia em trânsito, controle de acesso por função, armazenamento privado de documentos, registro
          de auditoria e separação entre ambientes. Incidentes relevantes serão comunicados aos titulares e à ANPD nos
          termos da lei.
        </p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>
          Veja a <Link className="text-paper underline" href="/cookies">Política de cookies</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
