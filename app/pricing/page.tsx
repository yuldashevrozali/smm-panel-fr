"use client";

import { PublicShell } from "@/components/public-shell";
import { useLocale } from "@/lib/i18n";

export default function PricingPage() {
    const { t } = useLocale();

    return (
        <PublicShell>
            <section className="page-section">
                <div className="page-header page-header--stacked">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.pricing.heading}</p>
                        <h1>{t.pricing.heading}</h1>
                    </div>
                    <p className="page-header__copy">
                        {t.pricing.copy}
                    </p>
                </div>

                <div className="info-grid info-grid--wide">
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">$</span>
                        <h3>{t.pricing.servicePricing}</h3>
                        <p>
                            {t.pricing.servicePricingText}
                        </p>
                    </article>
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">◌</span>
                        <h3>{t.pricing.walletBalance}</h3>
                        <p>
                            {t.pricing.walletBalanceText}
                        </p>
                    </article>
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">✓</span>
                        <h3>{t.pricing.ordering}</h3>
                        <p>
                            {t.pricing.orderingText}
                        </p>
                    </article>
                </div>
            </section>
        </PublicShell>
    );
}
