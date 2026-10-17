import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="board-texture grid min-h-svh place-items-center px-4">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <h1 className="mt-10 text-headline font-semibold text-paper">Esta casa está vazia.</h1>
        <p className="mt-4 text-steel-light">O endereço que você abriu não existe ou foi movido.</p>
        <ButtonLink href="/" variant="secondary" className="mt-8">
          Voltar ao início
        </ButtonLink>
      </div>
    </main>
  );
}
