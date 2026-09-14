"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ServiceCard } from "@/components/service-card";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { Service } from "@/types/api";

function formatPrice(value: string | number | undefined) {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
}

export function ServiceDetailPage({ id }: { id: string }) {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLocale();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        api.publicServices()
            .then((result) => {
                if (active) {
                    setServices(result);
                }
            })
            .catch(() => {
                if (active) {
                    setError(t.serviceDetail.unavailable);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [t.serviceDetail.unavailable]);

    const service = useMemo(
        () => services.find((item) => String(item.service) === id) ?? null,
        [id, services],
    );

    const relatedServices = useMemo(
        () => services.filter((item) => item.category === service?.category && item.service !== service?.service).slice(0, 3),
        [service, services],
    );

    if (loading) {
        return <section className="page-section"><div className="detail-shell"><div className="detail-skeleton" /></div></section>;
    }

    if (error || !service) {
        return (
            <section className="page-section">
                <div className="empty-state empty-state--simple">
                    <span aria-hidden="true">◌</span>
                    <h3>{t.serviceDetail.notFound}</h3>
                    <p>{error ?? t.serviceDetail.noLongerAvailable}</p>
                    <Link href="/services" className="button-primary button-primary--small">
                        {t.serviceDetail.browseAll}
                    </Link>
                </div>
            </section>
        );
    }

    const handleOrderClick = () => {
        const nextUrl = `/dashboard?service_id=${encodeURIComponent(String(service.service))}`;

        if (user) {
            router.push(nextUrl);
            return;
        }

        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
    };

    return (
        <section className="page-section">
            <div className="page-header page-header--compact">
                <div>
                    <p className="eyebrow eyebrow--purple">{t.serviceDetail.serviceDetails}</p>
                    <h1>{service.name}</h1>
                </div>
                <Link href="/services" className="button-link">
                    {t.serviceDetail.back}
                </Link>
            </div>

            <div className="detail-shell">
                <div className="detail-panel">
                    <div className="detail-panel__topline">
                        <span className="pill">{service.category}</span>
                        <span className="detail-panel__meta">
                            {service.min.toLocaleString()} {t.serviceDetail.to} {service.max.toLocaleString()} {t.serviceDetail.units}
                        </span>
                    </div>

                    <h2>{service.name}</h2>
                    <p className="detail-panel__description">
                        {service.description || t.serviceCard.verified}
                    </p>

                    <div className="detail-metrics">
                        <div>
                            <span>{t.serviceDetail.startingPrice}</span>
                            <strong>{formatPrice(service.rate)}</strong>
                        </div>
                        <div>
                            <span>{t.serviceDetail.minimumQuantity}</span>
                            <strong>{service.min.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span>{t.serviceDetail.maximumQuantity}</span>
                            <strong>{service.max.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>

                <aside className="detail-sidebar">
                    <div className="detail-sidebar__box">
                        <p>{t.serviceDetail.readyToOrder}</p>
                        <div className="detail-sidebar__price">
                            <span>{t.serviceDetail.startsAt}</span>
                            <strong>{formatPrice(service.rate)}</strong>
                        </div>
                        <button type="button" className="button-primary button-primary--full" onClick={handleOrderClick}>
                            {user ? t.serviceDetail.orderNow : t.serviceDetail.loginWithTelegram}
                        </button>
                    </div>
                </aside>
            </div>

            {relatedServices.length > 0 && (
                <div className="related-section">
                    <div className="section-header section-header--inline">
                        <div>
                            <p className="eyebrow eyebrow--purple">{t.serviceDetail.relatedServices}</p>
                            <h2>
                                {t.serviceDetail.moreFrom} {service.category}
                            </h2>
                        </div>
                    </div>

                    <div className="card-grid">
                        {relatedServices.map((item) => (
                            <ServiceCard key={String(item.service)} service={item} />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
