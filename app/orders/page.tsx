"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/types/api";

function OrdersContent() {
    const { token, logout } = useAuth();
    const { t } = useLocale();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersPending, setOrdersPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const money = (value: string | number) => `$${Number(value || 0).toFixed(2)}`;

    useEffect(() => {
        if (!token) return;

        api.orders(token)
            .then((data) => {
                const list = Array.isArray(data)
                    ? data
                    : data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown }).items)
                        ? (data as { items: Order[] }).items
                        : [];
                setOrders(list);
            })
            .catch((cause) => {
                if (cause instanceof ApiError && cause.status === 404) {
                    setOrdersPending(true);
                } else if (cause instanceof ApiError && cause.status === 401) {
                    logout();
                } else {
                    setError(cause instanceof Error ? cause.message : t.alerts.unableToLoad);
                }
            })
            .finally(() => {
                setLoadingOrders(false);
            });
    }, [token, logout, t.alerts.unableToLoad]);

    return (
        <section className="content-card">
            <div className="card-heading">
                <div>
                    <p>{t.dashboard.orderHistory}</p>
                    <h2>{t.dashboard.allOrders}</h2>
                </div>
                <Link href="/new-order" className="primary-btn compact">
                    {t.dashboard.newOrderButton}
                </Link>
            </div>

            {error && (
                <div className="alert error-alert" role="alert">
                    {error}
                    <button onClick={() => setError(null)} aria-label="Close error">×</button>
                </div>
            )}

            {loadingOrders ? (
                <div className="skeleton large" />
            ) : ordersPending ? (
                <div className="empty-state">
                    <span>◌</span>
                    <h3>{t.dashboard.ordersIntegration}</h3>
                    <p>{t.dashboard.ordersIntegrationText}</p>
                </div>
            ) : !orders.length ? (
                <div className="empty-state">
                    <span>▤</span>
                    <h3>{t.dashboard.noOrdersYet}</h3>
                    <p>{t.dashboard.ordersWillAppear}</p>
                </div>
            ) : (
                <div className="orders-table">
                    <div className="table-head">
                        <span>{t.dashboard.tableOrder}</span>
                        <span>{t.dashboard.tableService}</span>
                        <span>{t.dashboard.tableQuantity}</span>
                        <span>{t.dashboard.tableCharge}</span>
                        <span>{t.dashboard.tableStatus}</span>
                    </div>
                    {orders.map((order) => (
                        <div className="table-row" key={order.id}>
                            <span>#{order.id}</span>
                            <span>{order.service_id}</span>
                            <span>{Number(order.quantity).toLocaleString()}</span>
                            <span>{money(order.charge)}</span>
                            <span className="status-pill">{order.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function OrdersPage() {
    return (
        <ProtectedRoute>
            <AppShell activeNavId="orders">
                <OrdersContent />
            </AppShell>
        </ProtectedRoute>
    );
}
