"use client";

import { useEffect, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useNavigation } from "@/components/navigation-provider";
import { locales, useLocale } from "@/lib/i18n";

type NavId = "dashboard" | "new-order" | "orders" | "services" | "balance" | "profile";

type AppShellProps = {
    children: ReactNode;
    titleKey?: string;
    subtitleKey?: string;
    activeNavId?: NavId;
    onNavSelect?: (id: NavId) => void;
};

export function AppShell({
    children,
    titleKey,
    subtitleKey,
    activeNavId,
    onNavSelect,
}: AppShellProps) {
    const { user, logout } = useAuth();
    const { locale, setLocale, t } = useLocale();
    const { mobileNavOpen, setMobileNavOpen, closeMobileNav } = useNavigation();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (mobileNavOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileNavOpen]);

    // Automatically determine active navigation item if not explicitly provided
    let effectiveActiveId: NavId = activeNavId || "dashboard";
    if (!activeNavId) {
        const tabParam = searchParams.get("tab") || searchParams.get("view");
        if (pathname.startsWith("/new-order") || tabParam === "new-order") {
            effectiveActiveId = "new-order";
        } else if (pathname.startsWith("/orders") || tabParam === "orders") {
            effectiveActiveId = "orders";
        } else if (pathname.startsWith("/services") || tabParam === "services") {
            effectiveActiveId = "services";
        } else if (pathname.startsWith("/balance") || tabParam === "balance") {
            effectiveActiveId = "balance";
        } else if (pathname.startsWith("/profile") || tabParam === "profile") {
            effectiveActiveId = "profile";
        } else {
            effectiveActiveId = "dashboard";
        }
    }

    const defaultTitles: Record<NavId, [string, string]> = {
        dashboard: [t.dashboard.overview, `${t.dashboard.welcome}, ${user?.first_name ?? t.dashboard.guestUser}`],
        "new-order": [t.dashboard.newOrder, t.dashboard.createOrderFromLive],
        orders: [t.dashboard.ordersTitle, t.dashboard.trackOrders],
        services: [t.dashboard.servicesTitle, t.dashboard.liveCatalog],
        balance: [t.dashboard.balanceTitle, t.dashboard.accountCredit],
        profile: [t.dashboard.profileTitle, t.dashboard.profileSubtitle],
    };

    const currentTitle = titleKey ?? defaultTitles[effectiveActiveId]?.[0] ?? t.dashboard.overview;
    const currentSubtitle = subtitleKey ?? defaultTitles[effectiveActiveId]?.[1] ?? t.dashboard.welcome;

    const navigation: {
        id: NavId;
        href: string;
        label: string;
        icon: string;
    }[] = [
            { id: "dashboard", href: "/dashboard", label: t.dashboard.navDashboard, icon: "⌂" },
            { id: "new-order", href: "/new-order", label: t.dashboard.navNewOrder, icon: "+" },
            { id: "orders", href: "/orders", label: t.dashboard.navOrders, icon: "▤" },
            { id: "services", href: "/services", label: t.dashboard.navServices, icon: "◈" },
            { id: "balance", href: "/balance", label: t.dashboard.navBalance, icon: "$" },
            { id: "profile", href: "/profile", label: t.dashboard.navProfile, icon: "◉" },
        ];

    return (
        <div className="saas-shell">
            {/* Mobile Backdrop */}
            <div
                className={mobileNavOpen ? "mobile-drawer-overlay is-visible" : "mobile-drawer-overlay"}
                onClick={closeMobileNav}
                aria-hidden="true"
            />

            {/* Shared Sidebar / Mobile Drawer */}
            <aside
                className={mobileNavOpen ? "app-sidebar is-open" : "app-sidebar"}
                role="dialog"
                aria-modal={mobileNavOpen ? "true" : undefined}
                aria-label="Sidebar navigation"
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
                        <span className="brand-text-full">Sifat SMM</span>
                        <span className="brand-text-medium">Sifat</span>
                    </div>
                    <button
                        type="button"
                        className="mobile-drawer-close"
                        aria-label="Close navigation"
                        onClick={closeMobileNav}
                    >
                        ×
                    </button>
                </div>

                <nav>
                    {navigation.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={effectiveActiveId === item.id ? "side-link active" : "side-link"}
                            onClick={() => {
                                if (onNavSelect) onNavSelect(item.id);
                                closeMobileNav();
                            }}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                        <Link
                            href="/admin"
                            className="side-link side-link--admin"
                            onClick={closeMobileNav}
                        >
                            <span>⚙</span>
                            Admin Panel
                        </Link>
                    )}
                </nav>

                <button
                    className="logout-link"
                    onClick={() => {
                        closeMobileNav();
                        logout();
                    }}
                >
                    {t.dashboard.signOut}
                    <span>→</span>
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="app-main">
                {/* Shared Topbar Header */}
                <header className="app-topbar">
                    <div className="app-topbar__start">
                        <button
                            type="button"
                            className="mobile-nav-toggle"
                            aria-label="Open navigation"
                            aria-expanded={mobileNavOpen}
                            onClick={() => setMobileNavOpen(true)}
                        >
                            <svg
                                width="22"
                                height="22"
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

                        <Link href="/dashboard" className="mobile-topbar-brand" aria-label="Sifat SMM home">
                            <Image
                                src="/logo1.png"
                                alt="Sifat SMM"
                                width={26}
                                height={26}
                                className="brand-logo-img"
                            />
                            <span className="brand-text-full">Sifat SMM</span>
                            <span className="brand-text-medium">Sifat</span>
                        </Link>

                        <div className="app-topbar__title">
                            <p className="section-kicker">{currentTitle}</p>
                            <h1>{currentSubtitle}</h1>
                        </div>
                    </div>

                    <div className="app-topbar__end">
                        <div className="account-chip">
                            <span>{(user?.first_name?.[0] ?? "U").toUpperCase()}</span>
                            <div>
                                <strong>{user?.first_name ?? t.dashboard.accountChip}</strong>
                                <small>{user?.username ? `@${user.username}` : t.dashboard.telegramUser}</small>
                            </div>
                        </div>

                        <label className="language-switcher language-switcher--inline">
                            <span className="sr-only">{t.dashboard.selectLanguage}</span>
                            <select
                                value={locale}
                                onChange={(event) =>
                                    setLocale(event.target.value as "en" | "uz" | "ru")
                                }
                            >
                                {locales.map((item) => (
                                    <option key={item.code} value={item.code}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}
