"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { ServiceCard } from "@/components/service-card";
import { api, ApiError } from "@/lib/api";
import { normalizeServices, PLATFORM_ORDER, type PlatformName } from "@/lib/service-catalog";
import type { AdminPayment, AdminStats, Order, Service, User } from "@/types/api";

type AdminTab = "overview" | "users" | "orders" | "services" | "payments" | "admins";

function formatMoney(value: string | number | undefined) {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
}

function AdminApp() {
    const { user, token, logout } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<AdminTab>("overview");
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Users state
    const [users, setUsers] = useState<User[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [usersPage, setUsersPage] = useState(0);
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Orders state
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [ordersPage, setOrdersPage] = useState(0);
    const [orderSearch, setOrderSearch] = useState("");
    const [orderStatusFilter, setOrderStatusFilter] = useState("");
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Services state
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformName | "">("");

    // Admins state
    const [admins, setAdmins] = useState<User[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [addingAdmin, setAddingAdmin] = useState(false);

    // Payments state
    const [payments, setPayments] = useState<AdminPayment[]>([]);
    const [totalPayments, setTotalPayments] = useState(0);
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [paymentsPage, setPaymentsPage] = useState(0);
    const [paymentSearch, setPaymentSearch] = useState("");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Reject Modal state
    const [rejectingPayment, setRejectingPayment] = useState<AdminPayment | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processingAction, setProcessingAction] = useState(false);

    // Mobile sidebar drawer state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [sidebarOpen]);

    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const isSuperAdmin = user?.role === "super_admin";

    // Redirect non-admins
    useEffect(() => {
        if (user && user.role !== "admin" && user.role !== "super_admin") {
            router.replace("/dashboard");
        }
    }, [user, router]);

    // Load overview stats
    useEffect(() => {
        if (!token) return;

        let active = true;
        api.adminStats(token)
            .then((data) => {
                if (active) setStats(data);
            })
            .catch((cause) => {
                if (!active) return;
                if (cause instanceof ApiError && cause.status === 403) {
                    router.replace("/dashboard");
                } else {
                    setError(cause instanceof Error ? cause.message : "Failed to load admin stats");
                }
            })
            .finally(() => {
                if (active) setLoadingStats(false);
            });

        return () => { active = false; };
    }, [token, router]);

    // Load Users tab data
    useEffect(() => {
        if (!token || tab !== "users") return;

        let active = true;
        api.adminUsers(token, {
            search: userSearch.trim() || undefined,
            role: userRoleFilter || undefined,
            limit: 20,
            offset: usersPage * 20,
        })
            .then((data) => {
                if (active) {
                    setUsers(data.items);
                    setTotalUsers(data.total);
                }
            })
            .catch((cause) => {
                if (active) setError(cause instanceof Error ? cause.message : "Failed to load users");
            })
            .finally(() => {
                if (active) setLoadingUsers(false);
            });

        return () => { active = false; };
    }, [token, tab, userSearch, userRoleFilter, usersPage]);

    // Load Orders tab data
    useEffect(() => {
        if (!token || tab !== "orders") return;

        let active = true;
        api.adminOrders(token, {
            search: orderSearch.trim() || undefined,
            status: orderStatusFilter || undefined,
            limit: 20,
            offset: ordersPage * 20,
        })
            .then((data) => {
                if (active) {
                    setOrders(data.items);
                    setTotalOrders(data.total);
                }
            })
            .catch((cause) => {
                if (active) setError(cause instanceof Error ? cause.message : "Failed to load orders");
            })
            .finally(() => {
                if (active) setLoadingOrders(false);
            });

        return () => { active = false; };
    }, [token, tab, orderSearch, orderStatusFilter, ordersPage]);

    // Load Services tab data
    useEffect(() => {
        if (!token || tab !== "services") return;

        let active = true;
        api.adminServices(token)
            .then((data) => {
                if (active) setServices(data);
            })
            .catch((cause) => {
                if (active) setError(cause instanceof Error ? cause.message : "Failed to load services");
            })
            .finally(() => {
                if (active) setLoadingServices(false);
            });

        return () => { active = false; };
    }, [token, tab]);

    // Load Admins tab data
    useEffect(() => {
        if (!token || tab !== "admins") return;

        let active = true;
        api.adminAdmins(token)
            .then((data) => {
                if (active) setAdmins(data);
            })
            .catch((cause) => {
                if (active) setError(cause instanceof Error ? cause.message : "Failed to load admin list");
            })
            .finally(() => {
                if (active) setLoadingAdmins(false);
            });

        return () => { active = false; };
    }, [token, tab]);

    // Load Payments tab data (and keep pending count updated)
    useEffect(() => {
        if (!token) return;

        let active = true;
        api.adminPayments(token, {
            search: tab === "payments" ? (paymentSearch.trim() || undefined) : undefined,
            status: tab === "payments" ? (paymentStatusFilter || undefined) : undefined,
            limit: 20,
            offset: paymentsPage * 20,
        })
            .then((data) => {
                if (active) {
                    setPendingPaymentsCount(data.pending_count);
                    if (tab === "payments") {
                        setPayments(data.items);
                        setTotalPayments(data.total);
                    }
                }
            })
            .catch((cause) => {
                if (active && tab === "payments") {
                    setError(cause instanceof Error ? cause.message : "Failed to load payments");
                }
            })
            .finally(() => {
                if (active && tab === "payments") setLoadingPayments(false);
            });

        return () => { active = false; };
    }, [token, tab, paymentSearch, paymentStatusFilter, paymentsPage]);

    const handleApprovePayment = async (paymentId: number) => {
        if (!token || processingAction) return;
        setProcessingAction(true);
        setError(null);
        setNotice(null);

        try {
            const approved = await api.adminApprovePayment(token, paymentId);
            setNotice(`Payment #${approved.id} for ${formatMoney(approved.amount)} approved successfully.`);

            const updated = await api.adminPayments(token, {
                search: paymentSearch.trim() || undefined,
                status: paymentStatusFilter || undefined,
                limit: 20,
                offset: paymentsPage * 20,
            });
            setPayments(updated.items);
            setTotalPayments(updated.total);
            setPendingPaymentsCount(updated.pending_count);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to approve payment.");
        } finally {
            setProcessingAction(false);
        }
    };

    const handleConfirmReject = async (e: FormEvent) => {
        e.preventDefault();
        if (!token || !rejectingPayment || processingAction) return;
        setProcessingAction(true);
        setError(null);
        setNotice(null);

        try {
            const rejected = await api.adminRejectPayment(token, rejectingPayment.id, rejectionReason.trim() || undefined);
            setNotice(`Payment #${rejected.id} rejected.`);
            setRejectingPayment(null);
            setRejectionReason("");

            const updated = await api.adminPayments(token, {
                search: paymentSearch.trim() || undefined,
                status: paymentStatusFilter || undefined,
                limit: 20,
                offset: paymentsPage * 20,
            });
            setPayments(updated.items);
            setTotalPayments(updated.total);
            setPendingPaymentsCount(updated.pending_count);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to reject payment.");
        } finally {
            setProcessingAction(false);
        }
    };

    const handleAddAdmin = async (e: FormEvent) => {
        e.preventDefault();
        if (!token || !newAdminEmail.trim() || !isSuperAdmin) return;

        setAddingAdmin(true);
        setError(null);
        setNotice(null);

        try {
            const added = await api.adminAddAdmin(token, newAdminEmail.trim());
            setNotice(`Successfully assigned admin role to ${added.email || added.first_name || "user"}.`);
            setNewAdminEmail("");
            const updatedAdmins = await api.adminAdmins(token);
            setAdmins(updatedAdmins);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to add admin.");
        } finally {
            setAddingAdmin(false);
        }
    };

    const handleRemoveAdmin = async (adminId: number) => {
        if (!token || !isSuperAdmin) return;
        if (!confirm("Are you sure you want to demote this admin to a regular user?")) return;

        setError(null);
        setNotice(null);

        try {
            const res = await api.adminRemoveAdmin(token, adminId);
            setNotice(res.message);
            const updatedAdmins = await api.adminAdmins(token);
            setAdmins(updatedAdmins);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to remove admin.");
        }
    };

    const normalizedCatalog = useMemo(() => normalizeServices(services), [services]);
    const platformServices = useMemo(
        () => (selectedPlatform ? normalizedCatalog.filter((item) => item.platform === selectedPlatform) : normalizedCatalog),
        [normalizedCatalog, selectedPlatform]
    );

    return (
        <div className="saas-shell">
            <div
                className={sidebarOpen ? "mobile-drawer-overlay is-visible" : "mobile-drawer-overlay"}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            <aside
                className={sidebarOpen ? "app-sidebar is-open" : "app-sidebar"}
                role="dialog"
                aria-modal={sidebarOpen ? "true" : undefined}
                aria-label="Admin sidebar navigation"
            >
                <div className="app-sidebar__header">
                    <div className="app-brand">
                        <Image
                            src="/logo1.png"
                            alt="Sifat SMM"
                            width={28}
                            height={28}
                            className="brand-logo-img brand-logo-img--small"
                        />
                        <span className="brand-text-full">Sifat SMM Admin</span>
                        <span className="brand-text-medium">Sifat Admin</span>
                    </div>
                    <button
                        type="button"
                        className="mobile-drawer-close"
                        aria-label="Close navigation"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <nav>
                    <button
                        className={tab === "overview" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("overview"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>📊</span> Overview
                    </button>
                    <button
                        className={tab === "users" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("users"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>👥</span> Users
                    </button>
                    <button
                        className={tab === "orders" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("orders"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>📦</span> Orders
                    </button>
                    <button
                        className={tab === "services" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("services"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>⚡</span> Services
                    </button>
                    <button
                        className={tab === "payments" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("payments"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>💳</span> Payments {pendingPaymentsCount > 0 && `(${pendingPaymentsCount})`}
                    </button>
                    <button
                        className={tab === "admins" ? "side-link active" : "side-link"}
                        onClick={() => { setTab("admins"); setError(null); setNotice(null); setSidebarOpen(false); }}
                    >
                        <span>🛡️</span> Admins
                    </button>
                    <Link href="/dashboard" className="side-link" onClick={() => setSidebarOpen(false)}>
                        <span>←</span> User Dashboard
                    </Link>
                </nav>

                <button className="logout-link" onClick={() => { setSidebarOpen(false); logout(); }}>
                    Sign out <span>→</span>
                </button>
            </aside>

            <main className="app-main">
                <header className="app-topbar">
                    <div className="app-topbar__start">
                        <button
                            type="button"
                            className="mobile-nav-toggle"
                            aria-label="Open navigation"
                            aria-expanded={sidebarOpen}
                            onClick={() => setSidebarOpen(true)}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>

                        <Link href="/admin" className="mobile-topbar-brand" aria-label="Sifat SMM Admin home">
                            <Image
                                src="/logo1.png"
                                alt="Sifat SMM"
                                width={26}
                                height={26}
                                className="brand-logo-img"
                            />
                            <span className="brand-text-full">Sifat SMM Admin</span>
                            <span className="brand-text-medium">Sifat Admin</span>
                        </Link>

                        <div className="app-topbar__title">
                            <p className="section-kicker">ADMINISTRATION PANEL</p>
                            <h1>
                                {tab === "overview" && "System Overview"}
                                {tab === "users" && "User Management"}
                                {tab === "orders" && "Order Management"}
                                {tab === "services" && "Provider Service Catalog"}
                                {tab === "payments" && "Payment Requests"}
                                {tab === "admins" && "Admin Access Control"}
                            </h1>
                        </div>
                    </div>

                    <div className="account-chip">
                        <span>{(user?.first_name?.[0] ?? "A").toUpperCase()}</span>
                        <div>
                            <strong>{user?.first_name ?? "Admin"}</strong>
                            <small className="admin-badge">
                                {user?.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}
                            </small>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="alert error-alert" role="alert">
                        {error}
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {notice && (
                    <div className="alert success-alert" role="status">
                        {notice}
                        <button onClick={() => setNotice(null)}>×</button>
                    </div>
                )}

                {/* OVERVIEW TAB */}
                {tab === "overview" && (
                    <div className="admin-overview-stack">
                        {loadingStats ? (
                            <div className="skeleton large" />
                        ) : (
                            <section className="stat-grid">
                                <div className="stat-card accent">
                                    <p>Total Revenue</p>
                                    <strong>{formatMoney(stats?.total_revenue)}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Total User Balance</p>
                                    <strong>{formatMoney(stats?.total_user_balance)}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Total Registered Users</p>
                                    <strong>{stats?.total_users ?? 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Total Orders</p>
                                    <strong>{stats?.total_orders ?? 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Pending / In Progress</p>
                                    <strong>{stats?.pending_orders ?? 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Completed Orders</p>
                                    <strong>{stats?.completed_orders ?? 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <p>Failed / Canceled</p>
                                    <strong>{stats?.failed_orders ?? 0}</strong>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* USERS TAB */}
                {tab === "users" && (
                    <section className="content-card">
                        <div className="admin-filter-bar">
                            <input
                                type="text"
                                placeholder="Search by ID, email, username, or name..."
                                value={userSearch}
                                onChange={(e) => { setUserSearch(e.target.value); setUsersPage(0); }}
                                className="admin-search-input"
                            />
                            <select
                                value={userRoleFilter}
                                onChange={(e) => { setUserRoleFilter(e.target.value); setUsersPage(0); }}
                                className="admin-select-input"
                            >
                                <option value="">All Roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>

                        {loadingUsers ? (
                            <div className="skeleton large" />
                        ) : !users.length ? (
                            <div className="empty-state">
                                <span>👥</span>
                                <h3>No users found</h3>
                                <p>Try adjusting your search criteria or role filter.</p>
                            </div>
                        ) : (
                            <div className="orders-table">
                                <div className="table-head admin-user-head">
                                    <span>ID</span>
                                    <span>Identity / Email</span>
                                    <span>Username</span>
                                    <span>Role</span>
                                    <span>Balance</span>
                                    <span>Joined</span>
                                </div>
                                {users.map((u) => (
                                    <div key={u.id} className="table-row admin-user-row">
                                        <span>#{u.id}</span>
                                        <div>
                                            <strong>{u.email || u.first_name || "Anonymous User"}</strong>
                                            {u.telegram_id && <small>TG: {u.telegram_id}</small>}
                                            {u.google_sub && <small>G-Sub: {u.google_sub.slice(0, 10)}…</small>}
                                        </div>
                                        <span>{u.username ? `@${u.username}` : "—"}</span>
                                        <span>
                                            <span className={`role-pill role-pill--${u.role ?? "user"}`}>
                                                {u.role ?? "user"}
                                            </span>
                                        </span>
                                        <strong>{formatMoney(u.balance)}</strong>
                                        <small>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</small>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="admin-pagination">
                            <button
                                disabled={usersPage === 0 || loadingUsers}
                                onClick={() => setUsersPage((p) => Math.max(0, p - 1))}
                                className="secondary-btn compact"
                            >
                                Previous
                            </button>
                            <span>
                                Page {usersPage + 1} of {Math.ceil(totalUsers / 20) || 1}
                            </span>
                            <button
                                disabled={(usersPage + 1) * 20 >= totalUsers || loadingUsers}
                                onClick={() => setUsersPage((p) => p + 1)}
                                className="secondary-btn compact"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                )}

                {/* ORDERS TAB */}
                {tab === "orders" && (
                    <section className="content-card">
                        <div className="admin-filter-bar">
                            <input
                                type="text"
                                placeholder="Search by Order ID, User ID, Service ID, or Link..."
                                value={orderSearch}
                                onChange={(e) => { setOrderSearch(e.target.value); setOrdersPage(0); }}
                                className="admin-search-input"
                            />
                            <select
                                value={orderStatusFilter}
                                onChange={(e) => { setOrderStatusFilter(e.target.value); setOrdersPage(0); }}
                                className="admin-select-input"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="in progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="canceled">Canceled</option>
                            </select>
                        </div>

                        {loadingOrders ? (
                            <div className="skeleton large" />
                        ) : !orders.length ? (
                            <div className="empty-state">
                                <span>📦</span>
                                <h3>No orders found</h3>
                                <p>Try adjusting your search criteria or status filter.</p>
                            </div>
                        ) : (
                            <div className="orders-table">
                                <div className="table-head admin-order-head">
                                    <span>ID</span>
                                    <span>User</span>
                                    <span>Service</span>
                                    <span>Link</span>
                                    <span>Qty</span>
                                    <span>Charge</span>
                                    <span>Status</span>
                                    <span>Ext Order ID</span>
                                </div>
                                {orders.map((o) => (
                                    <div key={o.id} className="table-row admin-order-row">
                                        <span>#{o.id}</span>
                                        <span>User #{o.user_id ?? "—"}</span>
                                        <span>#{o.service_id}</span>
                                        <a href={o.link} target="_blank" rel="noreferrer" className="admin-link-truncate">
                                            {o.link}
                                        </a>
                                        <span>{Number(o.quantity).toLocaleString()}</span>
                                        <strong>{formatMoney(o.charge)}</strong>
                                        <span className="status-pill">{o.status}</span>
                                        <small>{o.external_order_id || "—"}</small>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="admin-pagination">
                            <button
                                disabled={ordersPage === 0 || loadingOrders}
                                onClick={() => setOrdersPage((p) => Math.max(0, p - 1))}
                                className="secondary-btn compact"
                            >
                                Previous
                            </button>
                            <span>
                                Page {ordersPage + 1} of {Math.ceil(totalOrders / 20) || 1}
                            </span>
                            <button
                                disabled={(ordersPage + 1) * 20 >= totalOrders || loadingOrders}
                                onClick={() => setOrdersPage((p) => p + 1)}
                                className="secondary-btn compact"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                )}

                {/* SERVICES TAB */}
                {tab === "services" && (
                    <section className="content-card">
                        <div className="admin-filter-bar">
                            <select
                                value={selectedPlatform}
                                onChange={(e) => setSelectedPlatform(e.target.value as PlatformName | "")}
                                className="admin-select-input"
                            >
                                <option value="">All Platforms</option>
                                {PLATFORM_ORDER.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                            <span className="admin-count-badge">
                                {platformServices.length} services listed
                            </span>
                        </div>

                        {loadingServices ? (
                            <div className="skeleton large" />
                        ) : (
                            <div className="card-grid">
                                {platformServices.slice(0, 60).map((service) => (
                                    <ServiceCard key={String(service.service)} service={service} />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ADMINS TAB */}
                {tab === "admins" && (
                    <div className="admin-overview-stack">
                        {isSuperAdmin && (
                            <section className="content-card">
                                <div className="card-heading">
                                    <div>
                                        <p>SUPER ADMIN CONTROL</p>
                                        <h2>Grant Admin Access</h2>
                                    </div>
                                </div>

                                <form onSubmit={handleAddAdmin} className="admin-add-form">
                                    <label className="service-select-field">
                                        <span>User Google / Gmail Address</span>
                                        <input
                                            type="email"
                                            placeholder="e.g. newadmin@gmail.com"
                                            value={newAdminEmail}
                                            onChange={(e) => setNewAdminEmail(e.target.value)}
                                            required
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        className="primary-btn"
                                        disabled={addingAdmin || !newAdminEmail.trim()}
                                    >
                                        {addingAdmin ? "Granting access…" : "+ Add Admin"}
                                    </button>
                                </form>
                            </section>
                        )}

                        <section className="content-card">
                            <div className="card-heading">
                                <div>
                                    <p>ADMINISTRATORS LIST</p>
                                    <h2>Current System Admins</h2>
                                </div>
                            </div>

                            {loadingAdmins ? (
                                <div className="skeleton large" />
                            ) : (
                                <div className="orders-table">
                                    <div className="table-head admin-user-head">
                                        <span>ID</span>
                                        <span>Admin Email / Identity</span>
                                        <span>Username</span>
                                        <span>Role</span>
                                        <span>Actions</span>
                                    </div>
                                    {admins.map((a) => {
                                        const isPrimary = a.email?.toLowerCase().trim() === "yuldashevrozalibek1@gmail.com";
                                        const isSuper = a.role === "super_admin" || isPrimary;

                                        return (
                                            <div key={a.id} className="table-row admin-user-row">
                                                <span>#{a.id}</span>
                                                <div>
                                                    <strong>{a.email || a.first_name || "Admin User"}</strong>
                                                    {isPrimary && <small className="primary-tag">PRIMARY SUPER ADMIN</small>}
                                                </div>
                                                <span>{a.username ? `@${a.username}` : "—"}</span>
                                                <span>
                                                    <span className={`role-pill role-pill--${isSuper ? "super_admin" : "admin"}`}>
                                                        {isSuper ? "super_admin" : "admin"}
                                                    </span>
                                                </span>
                                                <div>
                                                    {isSuperAdmin && !isPrimary && !isSuper && a.id !== user?.id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAdmin(a.id)}
                                                            className="admin-danger-btn"
                                                        >
                                                            Remove Admin
                                                        </button>
                                                    ) : (
                                                        <span className="admin-protected-tag">Protected</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* PAYMENTS TAB */}
                {tab === "payments" && (
                    <section className="content-card">
                        <div className="admin-filter-bar">
                            <input
                                type="text"
                                placeholder="Search by Payment ID, User ID, Email, or Name..."
                                value={paymentSearch}
                                onChange={(e) => { setPaymentSearch(e.target.value); setPaymentsPage(0); }}
                                className="admin-search-input"
                            />
                            <select
                                value={paymentStatusFilter}
                                onChange={(e) => { setPaymentStatusFilter(e.target.value); setPaymentsPage(0); }}
                                className="admin-select-input"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        {loadingPayments ? (
                            <div className="skeleton large" />
                        ) : !payments.length ? (
                            <div className="empty-state">
                                <span>💳</span>
                                <h3>No payment requests found</h3>
                                <p>Try adjusting your search criteria or status filter.</p>
                            </div>
                        ) : (
                            <div className="orders-table">
                                <div className="table-head admin-payment-head">
                                    <span>ID</span>
                                    <span>User / Email</span>
                                    <span>Amount</span>
                                    <span>Method</span>
                                    <span>Status</span>
                                    <span>Created</span>
                                    <span>Reviewed By</span>
                                    <span>Actions</span>
                                </div>
                                {payments.map((p) => (
                                    <div key={p.id} className="table-row admin-payment-row">
                                        <span>#{p.id}</span>
                                        <div>
                                            <strong>{p.user_email || p.user_name || `User #${p.user_id}`}</strong>
                                            <small>User #{p.user_id}</small>
                                        </div>
                                        <strong>{formatMoney(p.amount)}</strong>
                                        <span className="payment-method-tag">{p.method.toUpperCase()}</span>
                                        <span className={`status-pill status-pill--${p.status}`}>{p.status}</span>
                                        <small>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</small>
                                        <small>{p.reviewer_email || (p.reviewed_by ? `Admin #${p.reviewed_by}` : "—")}</small>
                                        <div>
                                            {p.status === "pending" ? (
                                                <div className="admin-action-btn-group">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprovePayment(p.id)}
                                                        disabled={processingAction}
                                                        className="admin-success-btn"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setRejectingPayment(p); setRejectionReason(""); }}
                                                        disabled={processingAction}
                                                        className="admin-danger-btn"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`status-tag status-tag--${p.status}`}>
                                                    {p.status === "approved" ? "Approved" : "Rejected"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="admin-pagination">
                            <button
                                disabled={paymentsPage === 0 || loadingPayments}
                                onClick={() => setPaymentsPage((prev) => Math.max(0, prev - 1))}
                                className="secondary-btn compact"
                            >
                                Previous
                            </button>
                            <span>
                                Page {paymentsPage + 1} of {Math.ceil(totalPayments / 20) || 1}
                            </span>
                            <button
                                disabled={(paymentsPage + 1) * 20 >= totalPayments || loadingPayments}
                                onClick={() => setPaymentsPage((prev) => prev + 1)}
                                className="secondary-btn compact"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                )}

                {/* REJECT PAYMENT MODAL */}
                {rejectingPayment && (
                    <div className="modal-backdrop">
                        <div className="modal-box">
                            <h3>Reject Payment #{rejectingPayment.id}?</h3>
                            <p>
                                Amount: <strong>{formatMoney(rejectingPayment.amount)}</strong> — User:{" "}
                                <strong>{rejectingPayment.user_email || `User #${rejectingPayment.user_id}`}</strong>
                            </p>

                            <form onSubmit={handleConfirmReject} className="admin-reject-form">
                                <label className="service-select-field">
                                    <span>Rejection Reason (Optional)</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. Payment could not be verified."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                </label>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => { setRejectingPayment(null); setRejectionReason(""); }}
                                        disabled={processingAction}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="admin-danger-btn large-btn" disabled={processingAction}>
                                        {processingAction ? "Rejecting…" : "Confirm Rejection"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AdminPage() {
    return (
        <ProtectedRoute>
            <AdminApp />
        </ProtectedRoute>
    );
}
