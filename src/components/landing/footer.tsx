import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { site } from "@/lib/site";

const COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { href: "/#pagamentos", label: "Pagamentos" },
      { href: "/#produto", label: "Painel" },
      { href: "/#seguranca", label: "Segurança" },
      { href: "/#desenvolvedores", label: "Desenvolvedores" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/#precos", label: "Preços" },
      { href: "/#faq", label: "Perguntas frequentes" },
      { href: "/contato", label: "Contato" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/termos", label: "Termos de uso" },
      { href: "/privacidade", label: "Política de privacidade" },
      { href: "/cookies", label: "Política de cookies" },
    ],
  },
] as const;

export function Footer() {
  const { legalName, cnpj, address } = site.company;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto grid max-w-[1520px] gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_2fr] lg:px-12">
        <div>
          <Logo />
          <p className="mt-5 max-w-[34ch] text-[0.9375rem] text-steel">{site.tagline}</p>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-medium text-paper">{col.title}</p>
              <ul className="mt-4 grid gap-3 text-sm text-steel">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-paper">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-2 px-4 py-6 text-[0.8125rem] text-steel sm:px-8 lg:flex-row lg:justify-between lg:px-12">
          <p>
            © {year} {legalName ?? site.name}
          </p>
          {legalName && cnpj ? (
            <p>
              {legalName} · CNPJ {cnpj}
              {address ? ` · ${address}` : ""}
            </p>
          ) : (
            <p>Os dados societários serão publicados aqui antes do início das operações.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
