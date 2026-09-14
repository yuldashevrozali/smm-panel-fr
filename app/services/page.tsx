"use client";

import { PublicShell } from "@/components/public-shell";
import { ServicesPage } from "@/components/services-page";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";

export default function ServicesRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <PublicShell>
                <ServicesPage />
            </PublicShell>
        );
    }

    if (user) {
        return (
            <AppShell activeNavId="services">
                <ServicesPage />
            </AppShell>
        );
    }

    return (
        <PublicShell>
            <ServicesPage />
        </PublicShell>
    );
}
