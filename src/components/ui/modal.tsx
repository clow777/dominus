"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Modal sobre o `<dialog>` nativo: foco preso e Esc fechando já vêm do navegador. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className="m-auto w-[min(28rem,92vw)] rounded-lg border border-line bg-ink-2 p-0 text-paper backdrop:bg-black/70"
    >
      {open ? (
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
