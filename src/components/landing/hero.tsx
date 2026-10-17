import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";
import { HeroStage } from "./landing-shell";

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="inicio-titulo"
      className="relative px-4 pt-20 pb-16 sm:px-8 sm:pt-28 lg:flex lg:min-h-[calc(100svh-4rem)] lg:flex-col lg:justify-center lg:px-12 lg:pt-16 lg:pb-24"
    >
      <h1 id="inicio-titulo" className="text-display max-w-[9ch] font-semibold text-paper">
        {site.tagline}
      </h1>
      <p className="mt-8 max-w-[46ch] text-lead text-steel-light">{site.description}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/criar-conta" size="lg">
          Começar agora
        </ButtonLink>
        <ButtonLink href="#produto" variant="secondary" size="lg">
          Conhecer a plataforma
        </ButtonLink>
      </div>
      <HeroStage />
    </section>
  );
}
