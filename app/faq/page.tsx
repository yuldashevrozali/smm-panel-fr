"use client";

import { PublicShell } from "@/components/public-shell";
import { useLocale } from "@/lib/i18n";

export default function FaqPage() {
    const { t } = useLocale();

    const faqs = [
        {
            question: t.faq.q1,
            answer: t.faq.a1,
        },
        {
            question: t.faq.q2,
            answer: t.faq.a2,
        },
        {
            question: t.faq.q3,
            answer: t.faq.a3,
        },
        {
            question: t.faq.q4,
            answer: t.faq.a4,
        },
    ];

    return (
        <PublicShell>
            <section className="page-section">
                <div className="page-header page-header--stacked">
                    <div>
                        <p className="eyebrow eyebrow--purple">{t.faq.heading}</p>
                        <h1>{t.faq.heading}</h1>
                    </div>
                    <p className="page-header__copy">
                        {t.faq.copy}
                    </p>
                </div>

                <div className="faq-accordion">
                    {faqs.map((item) => (
                        <details key={item.question} className="faq-item" open={item.question === faqs[0].question}>
                            <summary>{item.question}</summary>
                            <p>{item.answer}</p>
                        </details>
                    ))}
                </div>
            </section>
        </PublicShell>
    );
}
