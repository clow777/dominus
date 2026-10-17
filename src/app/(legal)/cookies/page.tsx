import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Quais cookies a Dominus Payments usa e por quê.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" updatedAt={new Date("2026-10-17T12:00:00-03:00")}>
      <section>
        <h2>1. Cookies que usamos</h2>
        <p>
          Hoje a Dominus usa apenas <strong>cookies estritamente necessários</strong> ao funcionamento e à segurança da
          plataforma:
        </p>
        <ul>
          <li><strong>Sessão:</strong> mantém você conectado à sua conta. Seguro, HttpOnly e restrito ao nosso domínio.</li>
          <li><strong>Proteção de formulários:</strong> impede que outros sites enviem ações em seu nome.</li>
        </ul>
        <p>O site público não usa cookies de análise, publicidade ou rastreamento de terceiros.</p>
      </section>

      <section>
        <h2>2. Se isso mudar</h2>
        <p>
          Se passarmos a usar cookies não essenciais, eles só serão ativados depois do seu consentimento, que poderá ser
          revisto a qualquer momento nas preferências, e esta política será atualizada antes.
        </p>
      </section>

      <section>
        <h2>3. Como controlar</h2>
        <p>
          Você pode apagar ou bloquear cookies nas configurações do navegador. Bloquear os cookies necessários impede o
          acesso à área logada.
        </p>
      </section>
    </LegalPage>
  );
}
