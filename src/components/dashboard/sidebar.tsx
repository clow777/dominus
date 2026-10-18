"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";

/** Ordem fixa do menu. "Meu Perfil" fica sempre por último. */
const ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transações", href: "/transacoes" },
  { label: "Clientes", href: "/clientes" },
  { label: "Pendências KYC", href: "/pendencias-kyc" },
  { label: "Fluxos", href: "/fluxos" },
  { label: "Robôs", href: "/robos" },
  { label: "Trackeamento", href: "/trackeamento" },
  { label: "Status PIX", href: "/status-pix" },
  { label: "Premiações", href: "/premiacoes" },
  { label: "Notificações", href: "/notificacoes" },
  { label: "Gateways", href: "/gateways" },
  { label: "Meu Perfil", href: "/perfil" },
] as const;

/** Peão Staunton branco desenhado à mão sobre quadrado com degradê vermelho. */
function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dp-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C70000" />
          <stop offset="1" stopColor="#8B0000" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="9" fill="url(#dp-logo-bg)" />
      <g fill="#fff">
        <circle cx="20" cy="11.500" r="4.500" />
        <rect x="14.500" y="16" width="11" height="2.400" rx="1.200" />
        <path d="M17.200 18.400h5.600c.2 3.200 1.500 5.800 3.600 7.600H13.600c2.100-1.800 3.400-4.400 3.600-7.600Z" />
        <rect x="11.500" y="26" width="17" height="2.600" rx="1.300" />
        <path d="M9.500 30h21a1.500 1.500 0 0 1 1.500 1.500v1H8v-1A1.500 1.500 0 0 1 9.500 30Z" />
      </g>
    </svg>
  );
}

export function DashboardSidebar({
  userName,
  balance,
  revenue,
  rank,
  avatarUrl,
}: {
  userName: string;
  balance: string;
  revenue: string;
  rank: number | null;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const rankLabel = rank ? `#${rank}` : "# --";
  const avatar = (
    <span className="relative shrink-0">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt=""         className="size-10 rounded-full border-2 border-ruby object-cover shadow-[0_0_10px_var(--ruby-glow)]" />
      ) : (
                <span className="ruby-neon grid size-10 place-items-center rounded-full border-2 border-ruby text-sm font-black text-white">
          {userName.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-black bg-white" aria-label="Online" />
    </span>
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-svh shrink-0 flex-col border-r border-line bg-[#050505] transition-[width] duration-(--duration-base)",
        collapsed ? "w-[4.25rem]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden" aria-label="Dominus Pay — dashboard">
          <Logo className="size-9 shrink-0 drop-shadow-[0_0_10px_var(--ruby-glow)]" />
          {collapsed ? null : <span className="text-lg font-black tracking-[0.1em] whitespace-nowrap text-white">DOMINUS PAY</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
          className="grid size-7 shrink-0 place-items-center rounded text-steel hover:text-white"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className={cn("mx-3 rounded-md border border-line bg-ink-2 p-3", collapsed && "hidden")}>
        <p className="text-[11px] text-steel">Saldo disponível</p>
        <p className="mt-1 text-lg font-bold text-white" data-testid="sidebar-balance">
          {balance}
        </p>
      </div>

      <nav aria-label="Principal" className="mt-4 flex-1 overflow-y-auto px-3">
        <ul className="grid gap-1.5">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.label}>
                <Link href={item.href} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} className={cn("dp-menu-item", collapsed && "justify-center px-0")}>
                  {collapsed ? <span aria-hidden="true">{item.label.charAt(0)}</span> : <span className="truncate">{item.label}</span>}
                  {collapsed ? <span className="sr-only">{item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ruby-dark/40 bg-[#0a0a0a] p-4">
        {collapsed ? (
          <div className="flex justify-center">{avatar}</div>
        ) : (
          <div className="flex items-center gap-3">
            {avatar}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">{userName}</p>
              <p className="text-xs font-black text-neon" data-testid="sidebar-revenue">{revenue}</p>
              <p className="text-[11px] font-bold text-[#e5e5e5]" data-testid="sidebar-rank">{rankLabel}</p>
            </div>
            <span
              className="ruby-neon grid h-8 min-w-8 shrink-0 place-items-center rounded-md px-1 text-[10px] font-black text-white"
              aria-hidden="true"
            >
              {rankLabel}
            </span>
          </div>
        )}
        <button type="button" onClick={logout} className="mt-3 text-xs text-[#e5e5e5] hover:text-white">
          {collapsed ? "⏻" : "Sair"}
        </button>
      </div>
    </aside>
  );
}
