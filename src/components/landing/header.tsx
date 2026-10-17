"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { MobileTrack } from "./mobile-track";

const NAV = [
  { href: "#produto", label: "Produto" },
  { href: "#solucoes", label: "Soluções" },
  { href: "#seguranca", label: "Segurança" },
  { href: "#desenvolvedores", label: "Desenvolvedores" },
  { href: "#precos", label: "Preços" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md supports-[backdrop-filter]:bg-ink/65">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex h-16 max-w-[1520px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Dominus Payments — início" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm text-steel-light">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors duration-(--duration-fast) hover:text-paper">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/entrar" variant="ghost">
            Entrar
          </ButtonLink>
          <ButtonLink href="/criar-conta" variant="secondary">
            Criar conta
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md border border-line text-paper lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 6.5h14M3 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <MobileTrack />

      <div id={menuId} hidden={!open} className="border-t border-line px-4 pt-2 pb-6 sm:px-8 lg:hidden">
        <nav aria-label="Principal (mobile)">
          <ul className="grid">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-3.5 text-[1.0625rem] text-paper-soft"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <ButtonLink href="/entrar" variant="secondary" size="lg">
            Entrar
          </ButtonLink>
          <ButtonLink href="/criar-conta" size="lg">
            Criar conta
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
