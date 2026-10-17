/**
 * Informações públicas da marca e da empresa.
 * Dados societários vêm do ambiente e ficam vazios até serem informados —
 * a interface mostra um aviso em vez de inventar CNPJ, endereço ou contato.
 */

function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export const site = {
  name: "Dominus Payments",
  shortName: "Dominus",
  tagline: "Cada movimento conta.",
  description:
    "Receba pagamentos, acompanhe suas transações e tenha mais controle sobre a operação do seu negócio em uma única plataforma.",
  url: (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "pt_BR",
  company: {
    legalName: clean(process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME),
    cnpj: clean(process.env.NEXT_PUBLIC_COMPANY_CNPJ),
    address: clean(process.env.NEXT_PUBLIC_COMPANY_ADDRESS),
    contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    privacyEmail: clean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
  },
  legalReviewed: process.env.NEXT_PUBLIC_LEGAL_REVIEWED === "true",
} as const;

export function companyInfoComplete(): boolean {
  const c = site.company;
  return Boolean(c.legalName && c.cnpj && c.address && c.contactEmail);
}
