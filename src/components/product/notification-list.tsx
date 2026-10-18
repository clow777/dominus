"use client";

import { useState, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { setNotification } from "@/server/actions/product";

interface Item {
  key: string;
  label: string;
  description: string;
}

export function NotificationList({ items, initial }: { items: Item[]; initial: Record<string, boolean> }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(key: string, next: boolean) {
    const previous = state[key];
    setState((s) => ({ ...s, [key]: next }));
    setError(null);
    start(async () => {
      const res = await setNotification(key, next);
      if (!res.ok) {
        setState((s) => ({ ...s, [key]: previous ?? false }));
        setError(res.error);
      }
    });
  }

  return (
    <>
      {error ? <p role="alert" className="mb-3 text-sm text-danger-text">{error}</p> : null}
      <ul className="divide-y divide-line rounded-lg border border-line bg-ink-2/60">
        {items.map((n) => (
          <li key={n.key} className="flex items-center justify-between gap-4 p-4">
            <span>
              <span className="block text-sm font-medium text-paper">{n.label}</span>
              <span className="block text-xs text-steel">{n.description}</span>
            </span>
            <Switch checked={state[n.key] ?? false} onChange={(v) => toggle(n.key, v)} label={n.label} />
          </li>
        ))}
      </ul>
    </>
  );
}
