"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";
import type { Service } from "@/types/api";

function formatPrice(value: string | number | undefined) {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
}

export function ServiceCard({ service }: { service: Service }) {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLocale();

    const handleOrderClick = () => {
        const nextUrl = `/dashboard?service_id=${encodeURIComponent(String(service.service))}`;

        if (user) {
            router.push(nextUrl);
            return;
        }

        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
    };

    return (
        <article className="service-card">
            <div className="service-card__header">
                <span className="service-card__platform">{service.category}</span>
                <span className="service-card__minmax">
                    {service.min.toLocaleString()}–{service.max.toLocaleString()}
                </span>
            </div>

            <div className="service-card__body">
                <h3>{service.name}</h3>
                <p>{service.description || t.serviceCard.verified}</p>
            </div>

            <div className="service-card__meta">
                <div>
                    <span>{t.serviceCard.startingFrom}</span>
                    <strong>{formatPrice(service.rate)}</strong>
                </div>
                <div>
                    <span>{t.serviceCard.minQuantity}</span>
                    <strong>{service.min.toLocaleString()}</strong>
                </div>
            </div>

            <div className="service-card__actions">
                <Link href={`/services/${encodeURIComponent(String(service.service))}`} className="button-link">
                    {t.serviceCard.viewDetails}
                </Link>
                <button type="button" className="button-primary button-primary--small" onClick={handleOrderClick}>
                    {t.serviceCard.order}
                </button>
            </div>
        </article>
    );
}
