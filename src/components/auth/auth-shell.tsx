import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo";

export function AuthShell({ title, description, children, wide }: { title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main id="conteudo" className="board-texture grid min-h-svh place-items-center px-4 py-12">
      <div className={wide ? "w-full max-w-xl" : "w-full max-w-md"}>
        <Link href="/" aria-label="Dominus Payments — início">
          <Logo />
        </Link>
        <h1 className="mt-10 text-headline font-semibold text-paper">{title}</h1>
        {description ? <p className="mt-3 text-steel-light">{description}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
