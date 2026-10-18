import type { Metadata } from "next";

import { brl } from "@/components/dashboard/format";
import { Panel } from "@/components/dashboard/dashboard-grid";
import { ThemeColorCard } from "@/components/product/theme-color-card";
import { ProfileForm } from "@/components/product/profile-form";
import { WALLET_FEE_CENTS } from "@/lib/gateways";
import { getApprovedVolume, getProfile } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Meu Perfil", robots: { index: false } };

function Bar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-steel">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-3" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const { user, orgId } = await requireApproved();
  const [profile, volume] = await Promise.all([getProfile(user.id), getApprovedVolume(orgId)]);

  return (
    <div className="mx-auto max-w-2xl">
      <ThemeColorCard />
      <h1 className="mb-1 text-center text-title font-extrabold">Meu Perfil</h1>
      <p className="mb-6 text-center text-sm text-steel">Taxa de transação {brl(WALLET_FEE_CENTS)} por transação aprovada</p>
      <div className="rounded-2xl card-neon p-6 sm:p-8">
        <ProfileForm
          initial={{ name: user.name, email: user.email, phone: profile.phone, cpf: profile.cpf, avatarUrl: profile.avatarUrl, revenue: brl(volume) }}
        />
      </div>
      <div className="mt-4">
        <Panel title="Segurança">
          <div className="grid gap-4">
            <Bar label="Verificação KYC" percent={100} color="#C70000" />
            <Bar label="CPF cadastrado" percent={profile.cpf ? 100 : 0} color="#8b0000" />
            <Bar label="Telefone cadastrado" percent={profile.phone ? 100 : 0} color="#C70000" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
