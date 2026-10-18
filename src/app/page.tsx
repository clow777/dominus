import { redirect } from "next/navigation";

import {
  Developers,
  Faq,
  FinalCta,
  Payments,
  Pricing,
  Product,
  Reports,
  Security,
  Solutions,
  Transactions,
} from "@/components/landing/content";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { LandingShell } from "@/components/landing/landing-shell";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/session";
import { getHomePath } from "@/server/kyc/service";

export default async function HomePage() {
  // Visitante sem sessão continua vendo a landing pública.
  const user = await getCurrentUser();
  if (user) redirect(await getHomePath(user.id));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    slogan: site.tagline,
    ...(site.company.legalName ? { legalName: site.company.legalName } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Conteúdo estático gerado no servidor a partir de constantes; sem entrada de usuário.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <LandingShell header={<Header />} footer={<Footer />}>
        <Hero />
        <Payments />
        <Product />
        <Transactions />
        <Reports />
        <Security />
        <Developers />
        <Solutions />
        <Pricing />
        <Faq />
        <FinalCta />
      </LandingShell>
    </>
  );
}
