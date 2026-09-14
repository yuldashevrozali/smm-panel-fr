"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";
import { api, ApiError } from "@/lib/api";
import { ServiceCascade } from "@/components/service-cascade";
import { normalizeServices, type PlatformName, type NormalizedService } from "@/lib/service-catalog";
import type { Service } from "@/types/api";

function NewOrderContent() {
    const { token, logout } = useAuth();
    const { t } = useLocale();
    const searchParams = useSearchParams();

    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [servicesPending, setServicesPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [selectedPlatform, setSelectedPlatform] = useState<PlatformName | "">("");
    const [selectedServiceType, setSelectedServiceType] = useState("");
    const [selectedService, setSelectedService] = useState<NormalizedService | null>(null);
    const [link, setLink] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [orderRequestKey, setOrderRequestKey] = useState<string | null>(null);

    const money = (value: string | number) => `$${Number(value || 0).toFixed(2)}`;

    useEffect(() => {
        if (!token) return;

        api.services(token)
            .then((data) => {
                setServices(Array.isArray(data) ? data : []);
            })
            .catch((cause) => {
                if (cause instanceof ApiError && cause.status === 404) {
                    setServicesPending(true);
                } else if (cause instanceof ApiError && cause.status === 401) {
                    logout();
                } else {
                    setError(cause instanceof Error ? cause.message : t.alerts.unableToLoad);
                }
            })
            .finally(() => {
                setLoadingServices(false);
            });
    }, [token, logout, t.alerts.unableToLoad]);

    const serviceIdFromUrl = searchParams.get("service_id") ?? "";

    const preselectedService = useMemo(() => {
        if (!serviceIdFromUrl) return null;
        return services.find((service) => String(service.service) === serviceIdFromUrl) ?? null;
    }, [serviceIdFromUrl, services]);

    const normalizedServices = useMemo(() => normalizeServices(services), [services]);

    const normalizedPreselectedService = useMemo(() => {
        if (!preselectedService) return null;
        return normalizedServices.find((service) => String(service.service) === serviceIdFromUrl) ?? null;
    }, [normalizedServices, preselectedService, serviceIdFromUrl]);

    const effectiveSelectedService = selectedService ?? normalizedPreselectedService;
    const effectiveSelectedPlatform = selectedPlatform || normalizedPreselectedService?.platform || "";
    const effectiveSelectedServiceType = selectedServiceType || normalizedPreselectedService?.serviceType || "";

    const estimated = effectiveSelectedService && quantity > 0
        ? (Number(effectiveSelectedService.rate) * quantity) / 1000
        : 0;

    function handlePlatformChange(nextPlatform: PlatformName | "") {
        setSelectedPlatform(nextPlatform);
        setSelectedServiceType("");
        setSelectedService(null);
        setQuantity(0);
        setLink("");
        setOrderRequestKey(null);
        setError(null);
    }

    function handleServiceTypeChange(nextServiceType: string) {
        setSelectedServiceType(nextServiceType);
        setSelectedService(null);
        setQuantity(0);
        setLink("");
        setOrderRequestKey(null);
        setError(null);
    }

    function handleServiceChange(service: NormalizedService | null) {
        setSelectedService(service);
        setQuantity(service?.min ?? 0);
        setLink("");
        setOrderRequestKey(null);
        setError(null);
    }

    async function placeOrder(event: FormEvent) {
        event.preventDefault();
        setNotice(null);
        setError(null);

        if (!effectiveSelectedService || !token) return;

        if (!link.trim()) {
            setError("Iltimos, target linkni kiriting.");
            return;
        }

        if (quantity < effectiveSelectedService.min) {
            setError(`Miqdor minimal qiymatdan kam. Minimal miqdor: ${effectiveSelectedService.min.toLocaleString()}.`);
            return;
        }

        if (quantity > effectiveSelectedService.max) {
            setError(`Miqdor maksimal qiymatdan oshib ketdi. Maksimal miqdor: ${effectiveSelectedService.max.toLocaleString()}.`);
            return;
        }

        setSubmitting(true);
        const requestKey = orderRequestKey ?? crypto.randomUUID();
        setOrderRequestKey(requestKey);

        try {
            await api.createOrder(
                token,
                {
                    service_id: effectiveSelectedService.service,
                    link: link.trim(),
                    quantity,
                },
                requestKey
            );

            setOrderRequestKey(null);
            setNotice(t.dashboard.orderSubmitted);
        } catch (cause) {
            if (cause instanceof ApiError && cause.status === 404) {
                setServicesPending(true);
            } else if (cause instanceof ApiError && cause.status === 401) {
                logout();
            } else {
                setError(cause instanceof Error ? cause.message : t.alerts.unableToLoad);
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="order-layout">
            <form className="content-card order-form" onSubmit={placeOrder}>
                <div className="card-heading">
                    <div>
                        <p>{t.dashboard.orderDetails}</p>
                        <h2>{t.dashboard.setUpOrder}</h2>
                    </div>
                </div>

                {error && (
                    <div className="alert error-alert" role="alert">
                        {error}
                        <button onClick={() => setError(null)} aria-label="Close error">×</button>
                    </div>
                )}

                {notice && (
                    <div className="alert success-alert" role="status">
                        {notice}
                        <button onClick={() => setNotice(null)} aria-label="Close notice">×</button>
                    </div>
                )}

                {servicesPending ? (
                    <div className="empty-state">
                        <span>◌</span>
                        <h3>{t.dashboard.servicesIntegration}</h3>
                        <p>{t.dashboard.servicesIntegrationText}</p>
                    </div>
                ) : loadingServices ? (
                    <div className="skeleton large" />
                ) : (
                    <>
                        <ServiceCascade
                            services={services}
                            platform={effectiveSelectedPlatform}
                            serviceType={effectiveSelectedServiceType}
                            serviceId={effectiveSelectedService ? String(effectiveSelectedService.service) : ""}
                            onPlatformChange={handlePlatformChange}
                            onServiceTypeChange={handleServiceTypeChange}
                            onServiceChange={handleServiceChange}
                            disabled={submitting}
                        />

                        {effectiveSelectedService && (
                            <div className="service-detail">
                                <strong>{effectiveSelectedService.name}</strong>
                                <p>{effectiveSelectedService.description || t.dashboard.serviceDetails}</p>
                                <span>
                                    {t.dashboard.minimum} {effectiveSelectedService.min.toLocaleString()} · {t.dashboard.maximum}{" "}
                                    {effectiveSelectedService.max.toLocaleString()}
                                </span>
                            </div>
                        )}

                        <label>
                            {t.dashboard.targetLink}
                            <input
                                type="url"
                                value={link}
                                onChange={(e) => {
                                    setLink(e.target.value);
                                    setOrderRequestKey(null);
                                }}
                                placeholder={t.dashboard.insertLink}
                                required
                                disabled={!effectiveSelectedService || submitting}
                            />
                        </label>

                        <label>
                            {t.dashboard.quantity}
                            <input
                                type="number"
                                value={quantity || ""}
                                onChange={(e) => {
                                    setQuantity(Number(e.target.value));
                                    setOrderRequestKey(null);
                                }}
                                min={effectiveSelectedService?.min}
                                max={effectiveSelectedService?.max}
                                required
                                disabled={!effectiveSelectedService || submitting}
                            />
                        </label>

                        <button type="submit" className="primary-btn full" disabled={submitting || !effectiveSelectedService}>
                            {submitting ? t.dashboard.submitting : t.dashboard.submitOrder}
                        </button>
                    </>
                )}
            </form>

            <aside className="summary-card">
                <p>{t.dashboard.orderSummary}</p>
                <h2>
                    {effectiveSelectedService
                        ? effectiveSelectedService.name
                        : effectiveSelectedServiceType
                            ? `${effectiveSelectedPlatform} · ${effectiveSelectedServiceType}`
                            : effectiveSelectedPlatform || t.dashboard.chooseService}
                </h2>

                <div>
                    <span>{t.dashboard.rate}</span>
                    <strong>{effectiveSelectedService ? `${money(effectiveSelectedService.rate)} / 1K` : "—"}</strong>
                </div>

                <div>
                    <span>{t.dashboard.estimatedPrice}</span>
                    <strong>{effectiveSelectedService ? money(estimated) : "—"}</strong>
                </div>

                <small>{t.dashboard.estimateOnly}</small>
            </aside>
        </section>
    );
}

export default function NewOrderPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="skeleton large" />}>
                <AppShell activeNavId="new-order">
                    <NewOrderContent />
                </AppShell>
            </Suspense>
        </ProtectedRoute>
    );
}
