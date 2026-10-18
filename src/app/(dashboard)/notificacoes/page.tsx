import type { Metadata } from "next";

import { NotificationList } from "@/components/product/notification-list";
import { NOTIFICATION_TYPES } from "@/lib/preferences";
import { getNotificationPrefs } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };

export default async function NotificationsPage() {
  const { user } = await requireApproved();
  const prefs = await getNotificationPrefs(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-title font-semibold">Centro de Notificações</h1>
      <p className="mb-6 text-sm text-steel">Escolha quais eventos você quer acompanhar.</p>
      <NotificationList items={NOTIFICATION_TYPES.map(({ key, label, description }) => ({ key, label, description }))} initial={prefs} />
    </div>
  );
}
