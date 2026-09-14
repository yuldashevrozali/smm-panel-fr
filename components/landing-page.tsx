"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { Service } from "@/types/api";
import { ServiceCard } from "@/components/service-card";

export function LandingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLocale();

    const benefits = [
        {
            title: t.landing.benefitAffordablePricesTitle,
            copy: t.landing.benefitAffordablePricesCopy,
        },
        {
            title: t.landing.benefitFastDeliveryTitle,
            copy: t.landing.benefitFastDeliveryCopy,
        },
        {
            title: t.landing.benefitWideRangeTitle,
            copy: t.landing.benefitWideRangeCopy,
        },
        {
            title: t.landing.benefitReliableSupportTitle,
            copy: t.landing.benefitReliableSupportCopy,
        },
    ];

    const faqPreview = [
        { q: t.landing.faqPreviewQuestionAccount, a: t.landing.faqPreviewAnswerAccount },
        { q: t.landing.faqPreviewQuestionTelegramLogin, a: t.landing.faqPreviewAnswerTelegramLogin },
        { q: t.landing.faqPreviewQuestionOrder, a: t.landing.faqPreviewAnswerOrder },
    ];
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        api.publicServices()
            .then((result) => {
                if (active) {
                    const list = Array.isArray(result) ? result : [];
                    setServices(list.slice(0, 6));
                }
            })
            .catch(() => {
                if (active) setError(t.landing.servicesUnavailable);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [t.landing.servicesUnavailable]);

    return (
        <div className="landing-page">
            <section className="hero-section">
                <div className="hero-copy">
                    <p className="eyebrow eyebrow--purple">{t.landing.eyebrow}</p>
                    <h1>{t.landing.title}</h1>
                    <p className="hero-copy__text">{t.landing.text}</p>

                    <div className="hero-actions">
                        <Link href="/services" className="button-primary">
                            {t.landing.exploreServices}
                        </Link>
                        <button
                            type="button"
                            className="button-ghost"
                            onClick={() => router.push(user ? "/dashboard" : "/login?next=/dashboard")}
                        >
                            {user ? t.landing.openDashboard : t.landing.getStarted}
                        </button>
                    </div>

                    <div className="hero-metrics" aria-label="Service marketplace statistics">
                        <div>
                            <strong>{loading ? "…" : services.length}</strong>
                            <span>{t.landing.metricsLiveServices}</span>
                        </div>
                        <div>
                            <strong>24/7</strong>
                            <span>{t.landing.metricsSupport}</span>
                        </div>
                        <div>
                            <strong>{t.landing.metricsFastDelivery}</strong>
                            <span>{t.landing.metricsFastDelivery}</span>
                        </div>
                    </div>
                </div>

                <div className="hero-panel" aria-label="Service overview panel">
                    <div className="hero-panel__top">
                        <span className="pill">{t.landing.marketplace}</span>
                        <span className="hero-panel__mini">{t.landing.liveCatalog}</span>
                    </div>
                    <div className="hero-panel__content">
                        <div className="hero-panel__item">
                            <span>{t.landing.popularPlatforms}</span>
                            <strong>Instagram, TikTok, YouTube, Telegram</strong>
                        </div>
                        <div className="hero-panel__item">
                            <span>{t.landing.orderFlow}</span>
                            <strong>{t.landing.heroOrderFlow}</strong>
                        </div>
                        <div className="hero-panel__item hero-panel__item--accent">
                            <span>{t.landing.privateAreas}</span>
                            <strong>{t.landing.heroPrivateAreas}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-block">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.landing.popularServices}</p>
                        <h2>{t.landing.browseMostRequested}</h2>
                    </div>
                    <Link href="/services" className="button-link">
                        {t.landing.viewAllServices}
                    </Link>
                </div>

                {loading ? (
                    <div className="card-grid card-grid--loading">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="service-card service-card--loading" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="empty-state empty-state--simple">
                        <span aria-hidden="true">◌</span>
                        <h3>{t.landing.catalogUnavailable}</h3>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {services.map((service) => (
                            <ServiceCard key={String(service.service)} service={service} />
                        ))}
                    </div>
                )}
            </section>

            <section className="section-block">
                <div className="section-heading section-heading--centered">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.landing.whySmmly}</p>
                        <h2>{t.landing.builtFor}</h2>
                    </div>
                </div>

                <div className="info-grid">
                    {benefits.map((benefit) => (
                        <article key={benefit.title} className="info-card">
                            <span className="info-card__icon" aria-hidden="true">
                                ✦
                            </span>
                            <h3>{benefit.title}</h3>
                            <p>{benefit.copy}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section-block">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.landing.faq}</p>
                        <h2>{t.landing.everythingCustomersAsk}</h2>
                    </div>
                    <Link href="/faq" className="button-link">
                        {t.landing.readAllFaqs}
                    </Link>
                </div>

                <div className="faq-preview">
                    {faqPreview.map((item) => (
                        <div key={item.q} className="faq-preview__item">
                            <h3>{item.q}</h3>
                            <p>{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
