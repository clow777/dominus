import type { Metadata } from "next";

import { CompanyField, LegalPage } from "@/components/legal/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a equipe da Dominus Payments.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  const c = site.company;
  return (
    <LegalPage title="Contato" updatedAt={new Date("2026-10-17T12:00:00-03:00")}>
      <section>
        <h2>Comercial e suporte</h2>
        <p>
          {c.contactEmail ? (
            <a className="text-paper underline" href={`mailto:${c.contactEmail}`}>
              {c.contactEmail}
            </a>
          ) : (
            <CompanyField value={null} placeholder="e-mail de contato" />
          )}
        </p>
      </section>
      <section>
        <h2>Privacidade e dados pessoais</h2>
        <p>
          <CompanyField value={c.privacyEmail} placeholder="e-mail do encarregado" />
        </p>
      </section>
      <section>
        <h2>Empresa</h2>
        <p>
          <CompanyField value={c.legalName} placeholder="razão social" />
          <br />
          CNPJ <CompanyField value={c.cnpj} placeholder="CNPJ" />
          <br />
          <CompanyField value={c.address} placeholder="endereço" />
        </p>
      </section>
    </LegalPage>
  );
}
