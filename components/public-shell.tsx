"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { locales, useLocale } from "@/lib/i18n";

const navItems = [
    { href: "/", key: "home" },
    { href: "/services", key: "services" },
    { href: "/pricing", key: "pricing" },
    { href: "/faq", key: "faq" },
    { href: "/support", key: "support" },
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { locale, setLocale, t } = useLocale();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActiveLink = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

    return (
        <div className="public-shell">
            <div
                className={mobileMenuOpen ? "mobile-menu-backdrop is-visible" : "mobile-menu-backdrop"}
                onClick={() => setMobileMenuOpen(false)}
            />
            <header className="public-header">
                <div className="public-header__inner public-content">
                    <Link href="/" className="brand-lockup" aria-label="SMMLY home">
                        <span className="brand-lockup__mark">S</span>
                        <span className="brand-lockup__text">SMMLY</span>
                    </Link>

                    <nav
                        className={mobileMenuOpen ? "public-nav is-open" : "public-nav"}
                        aria-label="Primary navigation"
                    >
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActiveLink(item.href) ? "public-nav__link is-active" : "public-nav__link"}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {t.publicShell[item.key]}
                            </Link>
                        ))}
                    </nav>

                    <div className="public-header__actions">
                        <button
                            type="button"
                            className="mobile-menu-toggle"
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen((current) => !current)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>

                        <Link href="/services" className="button-link button-link--muted">
                            {t.publicShell.search}
                        </Link>

                        <label className="language-switcher">
                            <span className="sr-only">{t.dashboard.selectLanguage}</span>
                            <select value={locale} onChange={(event) => setLocale(event.target.value as "en" | "uz" | "ru")}>
                                {locales.map((item) => (
                                    <option key={item.code} value={item.code}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {loading ? (
                            <span className="button-ghost button-ghost--small">{t.publicShell.loading}</span>
                        ) : user ? (
                            <div className="public-user-pill">
                                <span className="public-user-pill__avatar">
                                    {(user.first_name?.[0] ?? user.username?.[0] ?? "U").toUpperCase()}
                                </span>
                                <div className="public-user-pill__copy">
                                    <strong>{user.first_name ?? user.username ?? t.publicShell.account}</strong>
                                </div>
                                <Link href="/dashboard" className="button-ghost button-ghost--small">
                                    {t.publicShell.dashboard}
                                </Link>
                            </div>
                        ) : (
                            <Link href="/login" className="button-primary button-primary--small">
                                {t.publicShell.login}
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="public-content">{children}</main>

            <footer className="public-footer">
                <div className="public-content public-footer__inner">
                    <div>
                        <div className="brand-lockup brand-lockup--footer">
                            <span className="brand-lockup__mark">S</span>
                            <span className="brand-lockup__text">SMMLY</span>
                        </div>
                        <p className="public-footer__copy">{t.publicShell.footerCopy}</p>
                    </div>

                    <div className="public-footer__links">
                        <div>
                            <span className="public-footer__title">{t.publicShell.explore}</span>
                            <Link href="/services">{t.publicShell.services}</Link>
                            <Link href="/pricing">{t.publicShell.pricing}</Link>
                            <Link href="/faq">{t.publicShell.faq}</Link>
                        </div>
                        <div>
                            <span className="public-footer__title">{t.publicShell.support}</span>
                            <Link href="/support">{t.publicShell.support}</Link>
                            <Link href="/login">{t.publicShell.login}</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
