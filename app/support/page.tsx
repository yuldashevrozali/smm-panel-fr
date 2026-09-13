"use client";

import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { useLocale } from "@/lib/i18n";

export default function SupportPage() {
    const { t } = useLocale();

    return (
        <PublicShell>
            <section className="page-section">
                <div className="page-header page-header--stacked">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.support.heading}</p>
                        <h1>{t.support.heading}</h1>
                    </div>
                    <p className="page-header__copy">
                        {t.support.copy}
                    </p>
                </div>

                <div className="info-grid info-grid--wide">
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">✦</span>
                        <h3>{t.support.card1Title}</h3>
                        <p>
                            {t.support.card1Text}
                        </p>
                    </article>
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">◌</span>
                        <h3>{t.support.card2Title}</h3>
                        <p>
                            {t.support.card2Text}
                        </p>
                    </article>
                    <article className="info-card info-card--large">
                        <span className="info-card__icon" aria-hidden="true">→</span>
                        <h3>{t.support.card3Title}</h3>
                        <p>
                            Visit <Link href="/services">{t.publicShell.services}</Link> {t.support.card3Text}
                        </p>
                    </article>
                </div>
            </section>
        </PublicShell>
    );
}
