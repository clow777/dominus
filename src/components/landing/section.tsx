"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Seção da landing. A frase-título é o único elemento com entrada animada:
 * aparece com fade e um deslocamento curto quando entra na tela, uma vez.
 */
export function Section({
  id,
  phrase,
  lead,
  children,
  className,
}: {
  id: string;
  phrase: string;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40", className)}
    >
      <div className="max-w-[680px]">
        <motion.h2
          id={headingId}
          data-reveal
          className="text-headline font-semibold text-balance text-paper"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {phrase}
        </motion.h2>
        {lead ? <p className="mt-6 max-w-[60ch] text-lead text-steel-light">{lead}</p> : null}
      </div>
      {children ? <div className="mt-14 max-w-[680px]">{children}</div> : null}
    </section>
  );
}
