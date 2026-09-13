"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import type { Service } from "@/types/api";
import { ServiceCard } from "@/components/service-card";

export function ServicesPage() {
    const { t } = useLocale();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("recommended");

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
                    setError(t.servicesPage.errorText);
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
    }, [t.servicesPage.errorText]);

    const categories = useMemo(
        () => Array.from(new Set(services.map((service) => service.category))).sort(),
        [services],
    );

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();

        const next = services.filter((service) => {
            const matchesCategory = category === "all" || service.category === category;
            const haystack = `${service.name} ${service.category} ${service.description ?? ""}`.toLowerCase();
            const matchesSearch = !query || haystack.includes(query);

            return matchesCategory && matchesSearch;
        });

        switch (sort) {
            case "price-low":
                return [...next].sort((a, b) => Number(a.rate) - Number(b.rate));
            case "price-high":
                return [...next].sort((a, b) => Number(b.rate) - Number(a.rate));
            case "name":
                return [...next].sort((a, b) => a.name.localeCompare(b.name));
            default:
                return next;
        }
    }, [category, search, services, sort]);

    return (
        <section className="page-section">
            <div className="page-header page-header--stacked">
                <div>
                    <p className="eyebrow eyebrow--purple">{t.servicesPage.eyebrow}</p>
                    <h1>{t.servicesPage.heading}</h1>
                </div>
                <p className="page-header__copy">{t.servicesPage.copy}</p>
            </div>

            <div className="filters-panel">
                <label className="filter-field filter-field--wide">
                    <span>{t.servicesPage.searchLabel}</span>
                    <input
                        type="text"
                        placeholder={t.servicesPage.searchPlaceholder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>

                <label className="filter-field">
                    <span>{t.servicesPage.platformLabel}</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                        <option value="all">{t.servicesPage.allPlatforms}</option>
                        {categories.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="filter-field">
                    <span>{t.servicesPage.sortLabel}</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                        <option value="recommended">{t.servicesPage.recommended}</option>
                        <option value="price-low">{t.servicesPage.priceLow}</option>
                        <option value="price-high">{t.servicesPage.priceHigh}</option>
                        <option value="name">{t.servicesPage.name}</option>
                    </select>
                </label>
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
                    <h3>{t.servicesPage.errorTitle}</h3>
                    <p>{error}</p>
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="empty-state empty-state--simple">
                    <span aria-hidden="true">⌕</span>
                    <h3>{t.servicesPage.noResultsTitle}</h3>
                    <p>{t.servicesPage.noResultsText}</p>
                </div>
            ) : (
                <div className="card-grid">
                    {filteredServices.map((service) => (
                        <ServiceCard key={String(service.service)} service={service} />
                    ))}
                </div>
            )}
        </section>
    );
}
