import Link from "next/link";
import type { ReactNode } from "react";

import { Footer } from "@/components/landing/footer";
import { Logo } from "@/components/ui/logo";
import { companyInfoComplete, site } from "@/lib/site";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: Date; children: ReactNode }) {
  const isDraft = !site.legalReviewed || !companyInfoComplete();
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center px-4 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Dominus Payments — início">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="conteudo" className="px-4 py-16 sm:px-8 sm:py-24 lg:px-12">
        <article className="mx-auto max-w-[68ch]">
          {isDraft ? (
            <div role="note" className="mb-10 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-text">
              Minuta em revisão jurídica. Este texto ainda não tem validade contratual e será substituído pela versão
              revisada, com os dados societários completos, antes do início das operações.
            </div>
          ) : null}
          <h1 className="text-headline font-semibold text-paper">{title}</h1>
          <p className="mt-4 text-sm text-steel">Atualizado em {dateFmt.format(updatedAt)}</p>
          <div className="legal-prose mt-12 grid gap-10 text-[0.9375rem] leading-relaxed text-steel-light [&_h2]:text-title [&_h2]:font-semibold [&_h2]:text-paper [&_li]:mt-2 [&_p]:mt-3 [&_strong]:text-paper-soft [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** Mostra o dado societário quando configurado, ou um marcador explícito de pendência. */
export function CompanyField({ value, placeholder }: { value: string | null; placeholder: string }) {
  return value ? <>{value}</> : <span className="rounded-sm bg-ink-3 px-1.5 py-0.5 text-warning-text">[{placeholder}]</span>;
}
