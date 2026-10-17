import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Exibido em /entrar e /criar-conta até a Fase 4 (autenticação).
 * Diz a verdade em vez de mostrar um formulário que não funciona.
 */
export function AccessPending({ title }: { title: string }) {
  return (
    <main id="conteudo" className="board-texture grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Dominus Payments — início">
          <Logo />
        </Link>
        <h1 className="mt-12 text-headline font-semibold text-paper">{title}</h1>
        <p className="mt-4 text-steel-light">
          A área de clientes está em implantação e ainda não recebe cadastros. Para conversar sobre a sua operação
          enquanto isso, fale com a equipe.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/contato" variant="secondary">
            Falar com a equipe
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Voltar ao início
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
