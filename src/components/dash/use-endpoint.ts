"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 30_000;

export interface Endpoint<T> {
  /** `null` enquanto carrega ou em erro. */
  data: T | null;
  error: boolean;
  reload: () => void;
}

/**
 * Carrega `url` ao montar e a cada 30s (pausa com a aba oculta).
 * Trocar a URL (ex.: outro período) volta ao estado de carregamento.
 */
export function useEndpoint<T>(url: string): Endpoint<T> {
  const [state, setState] = useState<{ url: string; data: T | null; error: boolean }>({ url: "", data: null, error: false });
  const latest = useRef(url);

  const load = useCallback(async (u: string) => {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as T;
      if (latest.current === u) setState({ url: u, data, error: false });
    } catch {
      // Falha em atualização periódica mantém os dados já exibidos.
      if (latest.current === u) setState((s) => (s.url === u && s.data ? s : { url: u, data: null, error: true }));
    }
  }, []);

  useEffect(() => {
    latest.current = url;
    const first = setTimeout(() => void load(url), 0);
    const id = setInterval(() => {
      if (!document.hidden) void load(url);
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [url, load]);

  const current = state.url === url;
  return {
    data: current ? state.data : null,
    error: current && state.error,
    reload: () => void load(url),
  };
}
