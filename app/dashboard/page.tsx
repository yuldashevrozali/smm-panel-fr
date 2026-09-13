"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/auth-provider";
import { locales, useLocale } from "@/lib/i18n";
import type { Order, Service } from "@/types/api";

type View = "dashboard" | "new-order" | "orders" | "services" | "balance" | "profile";
const money = (value: string | number) => `$${Number(value || 0).toFixed(2)}`;
const unavailable = (error: unknown) => error instanceof ApiError && error.status === 404;

function DashboardApp() {
  const { user, token, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const navigation: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: t.dashboard.navDashboard, icon: "⌂" }, { id: "new-order", label: t.dashboard.navNewOrder, icon: "+" },
    { id: "orders", label: t.dashboard.navOrders, icon: "▤" }, { id: "services", label: t.dashboard.navServices, icon: "◈" },
    { id: "balance", label: t.dashboard.navBalance, icon: "$" }, { id: "profile", label: t.dashboard.navProfile, icon: "◉" },
  ];
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [servicesPending, setServicesPending] = useState(false);
  const [ordersPending, setOrdersPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderRequestKey, setOrderRequestKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleApiError = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) { logout(); return; }
    setError(cause instanceof Error ? cause.message : t.alerts.unableToLoad);
  };
  useEffect(() => {
    if (!token) return;
    api.services(token).then((data) => { setServices(data); setSelectedService(data[0] ?? null); })
      .catch((cause) => { if (unavailable(cause)) setServicesPending(true); else handleApiError(cause); }).finally(() => setLoadingServices(false));
    api.orders(token).then((data) => setOrders(data.items)).catch((cause) => { if (unavailable(cause)) setOrdersPending(true); else handleApiError(cause); }).finally(() => setLoadingOrders(false));
    // Session token changes only on sign in/out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const categories = useMemo(() => [...new Set(services.map((service) => service.category))], [services]);
  const estimated = selectedService && quantity > 0 ? Number(selectedService.rate) * quantity / 1000 : 0;
  const pending = orders.filter((order) => ["pending", "processing", "in progress"].includes(order.status.toLowerCase())).length;
  const completed = orders.filter((order) => ["completed", "complete"].includes(order.status.toLowerCase())).length;

  function beginOrder(service: Service) { setSelectedService(service); setQuantity(service.min); setOrderRequestKey(null); setView("new-order"); setNotice(null); }
  async function placeOrder(event: FormEvent) {
    event.preventDefault(); setNotice(null); setError(null);
    if (!selectedService || !token) return;
    if (!link.trim() || quantity < selectedService.min || quantity > selectedService.max) { setError(t.dashboard.validLinkWarning.replace("{min}", selectedService.min.toLocaleString()).replace("{max}", selectedService.max.toLocaleString())); return; }
    setSubmitting(true);
    const requestKey = orderRequestKey ?? crypto.randomUUID();
    setOrderRequestKey(requestKey);
    try { const order = await api.createOrder(token, { service_id: selectedService.service, link: link.trim(), quantity }, requestKey); setOrders((current) => [order, ...current]); setOrderRequestKey(null); setNotice(t.dashboard.orderSubmitted); setView("orders"); }
    catch (cause) { if (unavailable(cause)) setOrdersPending(true); else handleApiError(cause); }
    finally { setSubmitting(false); }
  }

  const heading: Record<View, [string, string]> = {
    dashboard: [t.dashboard.overview, `${t.dashboard.welcome}, ${user?.first_name ?? t.dashboard.guestUser}`],
    "new-order": [t.dashboard.newOrder, t.dashboard.createOrderFromLive],
    orders: [t.dashboard.ordersTitle, t.dashboard.trackOrders],
    services: [t.dashboard.servicesTitle, t.dashboard.liveCatalog],
    balance: [t.dashboard.balanceTitle, t.dashboard.accountCredit],
    profile: [t.dashboard.profileTitle, t.dashboard.profileSubtitle],
  };

  return <div className="saas-shell">
    <div className={sidebarOpen ? "mobile-drawer-overlay is-visible" : "mobile-drawer-overlay"} onClick={() => setSidebarOpen(false)} />
    <aside className={sidebarOpen ? "app-sidebar is-open" : "app-sidebar"}>
      <div className="app-brand"><span className="brand-mark small-mark">S</span>SMMLY</div>
      <nav>{navigation.map((item) => <button key={item.id} className={view === item.id ? "side-link active" : "side-link"} onClick={() => { setView(item.id); setError(null); setSidebarOpen(false); }}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <button className="logout-link" onClick={logout}>{t.dashboard.signOut} <span>→</span></button>
    </aside>
    <main className="app-main"><header className="app-topbar"><div className="app-topbar__start"><button type="button" className="mobile-nav-toggle" aria-label="Open dashboard menu" onClick={() => setSidebarOpen(true)}><span /><span /><span /></button><div><p className="section-kicker">{heading[view][0]}</p><h1>{heading[view][1]}</h1></div></div><div className="app-topbar__end"><div className="account-chip"><span>{(user?.first_name?.[0] ?? "U").toUpperCase()}</span><div><strong>{user?.first_name ?? t.dashboard.accountChip}</strong><small>{user?.username ? `@${user.username}` : t.dashboard.telegramUser}</small></div></div><label className="language-switcher language-switcher--inline"><span className="sr-only">{t.dashboard.selectLanguage}</span><select value={locale} onChange={(event) => setLocale(event.target.value as "en" | "uz" | "ru")}>{locales.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label></div></header>
      {error && <div className="alert error-alert" role="alert">{error}<button onClick={() => setError(null)}>×</button></div>}
      {notice && <div className="alert success-alert" role="status">{notice}<button onClick={() => setNotice(null)}>×</button></div>}
      {view === "dashboard" && <><section className="stat-grid"><Stat label={t.dashboard.availableBalance} value={money(user?.balance ?? 0)} accent /><Stat label={t.dashboard.totalOrders} value={loadingOrders ? "…" : ordersPending ? "—" : String(orders.length)} /><Stat label={t.dashboard.inProgress} value={loadingOrders ? "…" : ordersPending ? "—" : String(pending)} /><Stat label={t.dashboard.completed} value={loadingOrders ? "…" : ordersPending ? "—" : String(completed)} /></section><section className="content-card"><div className="card-heading"><div><p>{t.dashboard.recentActivity}</p><h2>{t.dashboard.latestOrders}</h2></div><button className="text-action" onClick={() => setView("orders")}>{t.dashboard.viewAll}</button></div><OrdersTable orders={orders.slice(0, 5)} loading={loadingOrders} pending={ordersPending} title={t.dashboard.noOrdersYet} description={t.dashboard.ordersWillAppear} pendingTitle={t.dashboard.ordersIntegration} pendingText={t.dashboard.ordersIntegrationText} columns={{ order: t.dashboard.tableOrder, service: t.dashboard.tableService, quantity: t.dashboard.tableQuantity, charge: t.dashboard.tableCharge, status: t.dashboard.tableStatus }} /></section><section className="quick-card"><div><p className="section-kicker">{t.dashboard.readyWhenYouAre}</p><h2>{t.dashboard.startCampaign}</h2><p>{t.dashboard.chooseServices}</p></div><button className="primary-btn" onClick={() => setView("new-order")}>{t.dashboard.createOrder} <span>→</span></button></section></>}
      {view === "services" && <section className="content-card"><div className="card-heading"><div><p>{t.dashboard.catalog}</p><h2>{t.dashboard.availableServices}</h2></div></div><ServicesGrid services={services} loading={loadingServices} pending={servicesPending} categories={categories} onSelect={beginOrder} emptyTitle={t.dashboard.noServicesAvailable} emptyText={t.dashboard.checkBackLater} pendingTitle={t.dashboard.servicesIntegration} pendingText={t.dashboard.servicesIntegrationText} /></section>}
      {view === "new-order" && <section className="order-layout"><form className="content-card order-form" onSubmit={placeOrder}><div className="card-heading"><div><p>{t.dashboard.orderDetails}</p><h2>{t.dashboard.setUpOrder}</h2></div></div>{servicesPending ? <IntegrationPending title={t.dashboard.servicesIntegration} description={t.dashboard.servicesIntegrationText} /> : loadingServices ? <div className="skeleton large" /> : <><label>{t.dashboard.serviceSelect}<select value={selectedService?.service ?? ""} onChange={(event) => { const service = services.find((item) => String(item.service) === event.target.value) ?? null; setSelectedService(service); setQuantity(service?.min ?? 0); setOrderRequestKey(null); }}><option value="" disabled>{t.dashboard.selectService}</option>{services.map((service) => <option key={service.service} value={service.service}>{service.category} — {service.name}</option>)}</select></label>{selectedService && <div className="service-detail"><strong>{selectedService.name}</strong><p>{selectedService.description || t.dashboard.serviceDetails}</p><span>{t.dashboard.minimum} {selectedService.min.toLocaleString()} · {t.dashboard.maximum} {selectedService.max.toLocaleString()}</span></div>}<label>{t.dashboard.targetLink}<input type="url" value={link} onChange={(event) => { setLink(event.target.value); setOrderRequestKey(null); }} placeholder={t.dashboard.insertLink} required /></label><label>{t.dashboard.quantity}<input type="number" value={quantity || ""} onChange={(event) => { setQuantity(Number(event.target.value)); setOrderRequestKey(null); }} min={selectedService?.min} max={selectedService?.max} required /></label><button className="primary-btn full" disabled={submitting || !selectedService}>{submitting ? t.dashboard.submitting : t.dashboard.submitOrder}</button></>}</form><aside className="summary-card"><p>{t.dashboard.orderSummary}</p><h2>{selectedService?.name ?? t.dashboard.chooseService}</h2><div><span>{t.dashboard.rate}</span><strong>{selectedService ? `${money(selectedService.rate)} / 1K` : "—"}</strong><small>{t.dashboard.estimateOnly}</small></div><div><span>{t.dashboard.estimatedPrice}</span><strong>{selectedService ? `${money(estimated)}` : "—"}</strong></div></aside></section>}
      {view === "orders" && <section className="content-card"><div className="card-heading"><div><p>{t.dashboard.orderHistory}</p><h2>{t.dashboard.allOrders}</h2></div><button className="primary-btn compact" onClick={() => setView("new-order")}>{t.dashboard.newOrderButton}</button></div><OrdersTable orders={orders} loading={loadingOrders} pending={ordersPending} title={t.dashboard.noOrdersYet} description={t.dashboard.ordersWillAppear} pendingTitle={t.dashboard.ordersIntegration} pendingText={t.dashboard.ordersIntegrationText} columns={{ order: t.dashboard.tableOrder, service: t.dashboard.tableService, quantity: t.dashboard.tableQuantity, charge: t.dashboard.tableCharge, status: t.dashboard.tableStatus }} /></section>}
      {view === "balance" && <section className="balance-card"><p className="section-kicker">{t.dashboard.availableCredit}</p><h2>{money(user?.balance ?? 0)}</h2><p>{t.dashboard.balancesLoaded}</p><button className="secondary-btn" disabled>{t.dashboard.addFundsSoon}</button></section>}
      {view === "profile" && <section className="content-card profile-grid"><ProfileField label={t.dashboard.firstName} value={user?.first_name ?? t.dashboard.notProvided} /><ProfileField label={t.dashboard.telegramUsername} value={user?.username ? `@${user.username}` : t.dashboard.notProvided} /><ProfileField label={t.dashboard.telegramId} value={String(user?.telegram_id ?? "")} /><ProfileField label={t.dashboard.accountId} value={String(user?.id ?? "")} /><ProfileField label={t.dashboard.balanceTitle} value={money(user?.balance ?? 0)} /><ProfileField label={t.dashboard.created} value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : t.dashboard.notProvided} /></section>}
    </main></div>;
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <article className={accent ? "stat-card accent" : "stat-card"}><p>{label}</p><strong>{value}</strong></article>; }
function ProfileField({ label, value }: { label: string; value: string }) { return <div className="profile-field"><span>{label}</span><strong>{value}</strong></div>; }
function IntegrationPending({ title, description }: { title: string; description: string }) { return <div className="empty-state"><span>◌</span><h3>{title}</h3><p>{description}</p></div>; }
function ServicesGrid({ services, loading, pending, categories, onSelect, emptyTitle, emptyText, pendingTitle, pendingText }: { services: Service[]; loading: boolean; pending: boolean; categories: string[]; onSelect: (service: Service) => void; emptyTitle: string; emptyText: string; pendingTitle: string; pendingText: string }) { if (loading) return <div className="skeleton large" />; if (pending) return <IntegrationPending title={pendingTitle} description={pendingText} />; if (!services.length) return <div className="empty-state"><span>◈</span><h3>{emptyTitle}</h3><p>{emptyText}</p></div>; return <div>{categories.map((category) => <div key={category} className="service-category"><h3>{category}</h3><div className="service-grid">{services.filter((service) => service.category === category).map((service) => <button className="service-live-card" key={service.service} onClick={() => onSelect(service)}><span>{service.name}</span><strong>{money(service.rate)} <small>/ 1K</small></strong><em>{service.min.toLocaleString()}–{service.max.toLocaleString()}</em></button>)}</div></div>)}</div>; }
function OrdersTable({ orders, loading, pending, title, description, pendingTitle, pendingText, columns }: { orders: Order[]; loading: boolean; pending: boolean; title: string; description: string; pendingTitle: string; pendingText: string; columns: { order: string; service: string; quantity: string; charge: string; status: string } }) { if (loading) return <div className="skeleton large" />; if (pending) return <IntegrationPending title={pendingTitle} description={pendingText} />; if (!orders.length) return <div className="empty-state"><span>▤</span><h3>{title}</h3><p>{description}</p></div>; return <div className="orders-table"><div className="table-head"><span>{columns.order}</span><span>{columns.service}</span><span>{columns.quantity}</span><span>{columns.charge}</span><span>{columns.status}</span></div>{orders.map((order) => <div className="table-row" key={order.id}><span>#{order.id}</span><span>{order.service_id}</span><span>{Number(order.quantity).toLocaleString()}</span><span>{money(order.charge)}</span><span className="status-pill">{order.status}</span></div>)}</div>; }
export default function DashboardPage() { return <ProtectedRoute><DashboardApp /></ProtectedRoute>; }
