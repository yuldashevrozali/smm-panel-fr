"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ServiceCard } from "@/components/service-card";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import {
    normalizeServices,
    getPlatformOptions,
    getPlatformsWithServices,
    type NormalizedService,
    type Platform,
} from "@/lib/service-catalog";
import type { Service } from "@/types/api";

const SEARCH_RESULT_LIMIT = 80;

function formatPrice(value: string | number | undefined) {
    const numeric = Number(value ?? 0);
    return `$${numeric.toFixed(2)}`;
}

export function ServicesPage() {
    const { t } = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | "">("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedServiceId, setSelectedServiceId] = useState("");

    useEffect(() => {
        let active = true;

        api.publicServices()
            .then((result) => {
                if (active) {
                    setServices(Array.isArray(result) ? result : []);
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

    const safeServices = useMemo(() => (Array.isArray(services) ? services : []), [services]);

    const normalizedCatalog = useMemo(
        () => normalizeServices(safeServices),
        [safeServices]
    );
    const platforms = useMemo(() => getPlatformOptions(), []);
    const availablePlatforms = useMemo(() => getPlatformsWithServices(normalizedCatalog), [normalizedCatalog]);

    const platformServices = useMemo(
        () => (selectedPlatform ? normalizedCatalog.filter((item) => item.platform === selectedPlatform) : []),
        [normalizedCatalog, selectedPlatform],
    );

    const serviceTypes = useMemo(
        () => Array.from(new Set(platformServices.map((item) => item.serviceType).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [platformServices],
    );

    const exactServices = useMemo(
        () => (selectedType ? platformServices.filter((item) => item.serviceType === selectedType) : []),
        [platformServices, selectedType],
    );

    const selectedService = useMemo(
        () => exactServices.find((item) => String(item.service) === selectedServiceId) ?? null,
        [exactServices, selectedServiceId],
    );

    const platformOverview = useMemo(
        () =>
            availablePlatforms.map((platform) => {
                const items = normalizedCatalog.filter((item) => item.platform === platform);
                const types = Array.from(new Set(items.map((item) => item.serviceType).filter(Boolean))).sort((a, b) => a.localeCompare(b));

                return {
                    platform,
                    count: items.length,
                    types: types.slice(0, 3),
                };
            }),
        [availablePlatforms, normalizedCatalog],
    );

    const searchResults = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return [] as NormalizedService[];
        }

        let next = normalizedCatalog;

        if (selectedPlatform) {
            next = next.filter((item) => item.platform === selectedPlatform);
        }

        if (selectedType) {
            next = next.filter((item) => item.serviceType === selectedType);
        }

        return next
            .filter((item) => {
                const haystack = `${item.name} ${item.category} ${item.platform} ${item.serviceType}`.toLowerCase();
                return haystack.includes(query);
            })
            .slice(0, SEARCH_RESULT_LIMIT);
    }, [normalizedCatalog, search, selectedPlatform, selectedType]);

    const handlePlatformChange = (nextPlatform: string) => {
        setSelectedPlatform(nextPlatform as Platform | "");
        setSelectedType("");
        setSelectedServiceId("");
    };

    const handleServiceTypeChange = (nextType: string) => {
        setSelectedType(nextType);
        setSelectedServiceId("");
    };

    const handleExactServiceChange = (nextServiceId: string) => {
        setSelectedServiceId(nextServiceId);
    };

    const handleOrderClick = (service: NormalizedService) => {
        const nextUrl = `/dashboard?service_id=${encodeURIComponent(String(service.service))}`;

        if (user) {
            router.push(nextUrl);
            return;
        }

        router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
    };

    return (
        <section className="page-section">
            <div className="page-header page-header--stacked">
                <div>
                    <p className="eyebrow eyebrow--purple">{t.servicesPage.eyebrow}</p>
                    <h1>{t.servicesPage.heading}</h1>
                </div>
                <p className="page-header__copy">{t.servicesPage.copy}</p>
            </div>

            <div className="service-selection-shell">
                <label className="service-select-field service-select-field--wide">
                    <span>{t.servicesPage.searchLabel}</span>
                    <input
                        type="text"
                        value={search}
                        placeholder={t.servicesPage.searchPlaceholder}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>

                <div className="service-selector-grid">
                    <label className="service-select-field">
                        <span>{t.servicesPage.platformLabel}</span>
                        <select value={selectedPlatform} onChange={(event) => handlePlatformChange(event.target.value)}>
                            <option value="">Select platform</option>
                            {platforms.map((platform) => (
                                <option key={platform} value={platform}>
                                    {platform}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="service-select-field">
                        <span>Service type</span>
                        <select value={selectedType} onChange={(event) => handleServiceTypeChange(event.target.value)} disabled={!selectedPlatform}>
                            <option value="">{selectedPlatform ? "Select service type" : "Choose a platform first"}</option>
                            {serviceTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="service-select-field">
                        <span>Exact service</span>
                        <select value={selectedServiceId} onChange={(event) => handleExactServiceChange(event.target.value)} disabled={!selectedType || exactServices.length === 0}>
                            <option value="">{selectedType ? "Select exact service" : "Choose a service type first"}</option>
                            {exactServices.map((service) => (
                                <option key={String(service.service)} value={String(service.service)}>
                                    {service.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
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
            ) : (
                <>
                    {search.trim() ? (
                        <div className="catalog-results">
                            <div className="section-heading">
                                <h2>Search results</h2>
                                <span>{searchResults.length} matches</span>
                            </div>

                            {searchResults.length === 0 ? (
                                <div className="empty-state empty-state--simple">
                                    <span aria-hidden="true">⌕</span>
                                    <h3>{t.servicesPage.noResultsTitle}</h3>
                                    <p>{t.servicesPage.noResultsText}</p>
                                </div>
                            ) : (
                                <div className="card-grid">
                                    {searchResults.map((service) => (
                                        <ServiceCard key={String(service.service)} service={service} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : !selectedPlatform ? (
                        <div className="catalog-results">
                            <div className="section-heading">
                                <h2>Platform overview</h2>
                                <span>{platformOverview.length} platforms</span>
                            </div>

                            <div className="platform-overview-grid">
                                {platformOverview.map((item) => (
                                    <button key={item.platform} type="button" className="platform-overview-card" onClick={() => handlePlatformChange(item.platform)}>
                                        <div className="platform-overview-card__header">
                                            <span>{item.platform}</span>
                                            <strong>{item.count}</strong>
                                        </div>
                                        <p>{item.types.length ? item.types.join(" • ") : "No service types listed"}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="catalog-results">
                            {!selectedType ? (
                                platformServices.length === 0 ? (
                                    <div className="empty-state empty-state--simple empty-state--inline">
                                        <span aria-hidden="true">◌</span>
                                        <h3>No services available</h3>
                                        <p>There are currently no services available for {selectedPlatform}.</p>
                                    </div>
                                ) : (
                                    <div className="empty-state empty-state--simple empty-state--inline">
                                        <span aria-hidden="true">◌</span>
                                        <h3>Choose a service type</h3>
                                        <p>Select the service type for {selectedPlatform} to continue.</p>
                                    </div>
                                )
                            ) : exactServices.length === 0 ? (
                                <div className="empty-state empty-state--simple empty-state--inline">
                                    <span aria-hidden="true">◌</span>
                                    <h3>No exact services available</h3>
                                    <p>There are no matching exact services for {selectedPlatform} / {selectedType} right now.</p>
                                </div>
                            ) : (
                                <div className="results-stack">
                                    {selectedService ? (
                                        <div className="service-detail-card">
                                            <div className="service-detail-card__header">
                                                <div>
                                                    <p className="eyebrow eyebrow--purple">Service details</p>
                                                    <h2>{selectedService.name}</h2>
                                                </div>
                                                <button type="button" className="button-primary button-primary--small" onClick={() => handleOrderClick(selectedService)}>
                                                    {user ? "Buyurtma berish" : "Buyurtma berish"}
                                                </button>
                                            </div>

                                            <div className="service-detail-card__grid">
                                                <div className="service-detail-card__item">
                                                    <span>Platform</span>
                                                    <strong>{selectedService.platform}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Service type</span>
                                                    <strong>{selectedService.serviceType}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Price</span>
                                                    <strong>{formatPrice(selectedService.rate)} / 1K</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Min</span>
                                                    <strong>{selectedService.min.toLocaleString()}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Max</span>
                                                    <strong>{selectedService.max.toLocaleString()}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Refill</span>
                                                    <strong>{selectedService.refill ? "Available" : "Not available"}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Cancel</span>
                                                    <strong>{selectedService.cancel ? "Available" : "Not available"}</strong>
                                                </div>
                                                <div className="service-detail-card__item">
                                                    <span>Dripfeed</span>
                                                    <strong>{selectedService.dripfeed ? "Available" : "Not available"}</strong>
                                                </div>
                                            </div>

                                            <div className="service-detail-card__summary">
                                                <span>Provider service ID</span>
                                                <strong>{selectedService.service}</strong>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
