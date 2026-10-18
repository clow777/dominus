import type { Metadata } from "next";
import Link from "next/link";

import { brl } from "@/components/dashboard/format";
import { Panel } from "@/components/dashboard/dashboard-grid";
import { ConnectGatewayButton, SandboxButton, TestElevaButton } from "@/components/product/gateway-controls";
import { grayButton, redButton } from "@/components/product/styles";
import { Pawn } from "@/components/ui/pawn";
import { SANDBOX_KEY, THIRD_PARTY_GATEWAYS, WALLET_FEE_CENTS, WALLET_MIN_BALANCE_CENTS } from "@/lib/gateways";
import { getBalance } from "@/server/actions/dashboard";
import { getGatewayStatuses } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";
import { getElevaSummary } from "@/server/payments/eleva-summary";

export const metadata: Metadata = { title: "Gateways", robots: { index: false } };

export default async function GatewaysPage() {
  const { orgId } = await requireApproved();
  const [statuses, balance, eleva] = await Promise.all([getGatewayStatuses(orgId), getBalance(orgId), getElevaSummary(orgId)]);

  const thirdParty = THIRD_PARTY_GATEWAYS.map((g) => ({ ...g, status: statuses[g.key] ?? "inactive" }));
  const configured = thirdParty.filter((g) => g.status !== "inactive").length;
  const sandboxActive = statuses[SANDBOX_KEY] === "active";
  const active = 1 + (sandboxActive ? 1 : 0) + thirdParty.filter((g) => g.status === "active").length;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-title font-semibold">Gateways</h1>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel title="Gateways Ativos"><p className="text-3xl font-semibold">{active}</p></Panel>
        <Panel title="Configurados"><p className="text-3xl font-semibold">{configured}</p></Panel>
        <Panel title="Disponíveis"><p className="text-3xl font-semibold">{thirdParty.length}</p></Panel>
      </div>

      <section className="mb-4 rounded-lg border border-brand-red bg-ink-2 p-5" aria-labelledby="wallet-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-lg bg-brand-red"><Pawn className="size-7 text-paper" /></span>
            <div>
              <h2 id="wallet-title" className="text-lg font-semibold">Dominus Wallet</h2>
              <span className="text-xs font-medium text-brand-red">● Ativo</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/perfil" className={redButton}>Configurar</Link>
            <button type="button" disabled className={grayButton} title="Indisponível: o gateway principal é sempre ativo">Desativar</button>
            <Link href="/dashboard" className={grayButton}>Ver Saldo</Link>
            <button type="button" disabled className={grayButton} title="Split de pagamentos ainda não habilitado">Split</button>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-steel">Taxa</dt><dd>{brl(WALLET_FEE_CENTS)}</dd></div>
          <div><dt className="text-steel">Saldo mínimo</dt><dd>{brl(WALLET_MIN_BALANCE_CENTS)}</dd></div>
          <div><dt className="text-steel">Saque</dt><dd>Qualquer chave PIX</dd></div>
          <div><dt className="text-steel">Saldo atual</dt><dd>{brl(balance)}</dd></div>
        </dl>
      </section>

      <section className="mb-4 rounded-lg border border-line bg-ink-2 p-5" aria-labelledby="eleva-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-lg bg-brand-red"><Pawn className="size-7 text-paper" /></span>
            <div>
              <h2 id="eleva-title" className="text-lg font-semibold">DOMINUS PAY (Eleva)</h2>
              <span className="text-xs font-medium text-brand-red">{eleva.configured ? "● Conectado" : "○ Credenciais ausentes"}</span>
            </div>
          </div>
          {eleva.configured ? <TestElevaButton /> : null}
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-steel">Saldo (Eleva)</dt><dd data-testid="eleva-balance">{eleva.balanceCents === null ? "—" : brl(eleva.balanceCents)}</dd></div>
          <div><dt className="text-steel">Método</dt><dd>PIX</dd></div>
          <div><dt className="text-steel">Webhook</dt><dd className="break-all">/api/webhooks/eleva</dd></div>
        </dl>
        {eleva.error ? <p role="alert" className="mt-3 text-xs text-danger-text">{eleva.error}</p> : null}
      </section>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-ink-2/60 p-5">
        <div>
          <h2 className="text-lg font-semibold">Dominus Test</h2>
          <p className="text-sm text-steel">Sandbox para testes, sem movimentar dinheiro real.</p>
        </div>
        <SandboxButton active={sandboxActive} />
      </section>

      <h2 className="mb-3 text-lg font-semibold">Gateways disponíveis</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {thirdParty.map((g) => (
          <li key={g.key} className="rounded-lg border border-line bg-ink-2/60 p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático pequeno */}
                <img src={`/gateways/logos/${g.key}.svg`} alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg bg-white p-0.5" />
                <h3 className="font-medium">{g.name}</h3>
              </div>
              <span className="text-xs text-steel">
                {g.status === "active" ? "Ativo" : g.status === "configured" ? "Configurado" : "Não conectado"}
              </span>
            </div>
            <p className="mb-4 text-xs text-steel">A chave fica guardada; a integração de cobrança ainda não está habilitada.</p>
            <ConnectGatewayButton gatewayKey={g.key} name={g.name} status={g.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
