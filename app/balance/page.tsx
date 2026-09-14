"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { BalanceSection } from "@/components/balance-section";

export default function BalancePage() {
    return (
        <ProtectedRoute>
            <AppShell activeNavId="balance">
                <BalanceSection />
            </AppShell>
        </ProtectedRoute>
    );
}
