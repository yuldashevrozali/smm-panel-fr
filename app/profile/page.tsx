"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";

function ProfileContent() {
    const { user } = useAuth();
    const { t } = useLocale();

    const money = (value: string | number) => `$${Number(value || 0).toFixed(2)}`;

    return (
        <section className="content-card profile-grid">
            <div className="profile-field">
                <span>{t.dashboard.firstName}</span>
                <strong>{user?.first_name ?? t.dashboard.notProvided}</strong>
            </div>
            <div className="profile-field">
                <span>{t.dashboard.telegramUsername}</span>
                <strong>{user?.username ? `@${user.username}` : t.dashboard.notProvided}</strong>
            </div>
            <div className="profile-field">
                <span>{t.dashboard.telegramId}</span>
                <strong>{String(user?.telegram_id ?? t.dashboard.notProvided)}</strong>
            </div>
            <div className="profile-field">
                <span>{t.dashboard.accountId}</span>
                <strong>{String(user?.id ?? "")}</strong>
            </div>
            <div className="profile-field">
                <span>{t.dashboard.balanceTitle}</span>
                <strong>{money(user?.balance ?? 0)}</strong>
            </div>
            <div className="profile-field">
                <span>{t.dashboard.created}</span>
                <strong>
                    {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : t.dashboard.notProvided}
                </strong>
            </div>
        </section>
    );
}

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <AppShell activeNavId="profile">
                <ProfileContent />
            </AppShell>
        </ProtectedRoute>
    );
}
