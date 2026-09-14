"use client";

import { useMemo } from "react";
import type { Service } from "@/types/api";
import {
    getPlatformServices,
    getServiceTypes,
    getServicesByType,
    normalizeServices,
    PLATFORM_ORDER,
    type PlatformName,
    type NormalizedService,
} from "@/lib/service-catalog";

type ServiceCascadeProps = {
    services: Service[];
    platform: PlatformName | "";
    serviceType: string;
    serviceId: string;
    onPlatformChange: (platform: PlatformName | "") => void;
    onServiceTypeChange: (serviceType: string) => void;
    onServiceChange: (service: NormalizedService | null) => void;
    disabled?: boolean;
};

export function ServiceCascade({
    services,
    platform,
    serviceType,
    serviceId,
    onPlatformChange,
    onServiceTypeChange,
    onServiceChange,
    disabled = false,
}: ServiceCascadeProps) {
    const normalizedServices = useMemo(
        () => normalizeServices(services),
        [services],
    );

    const availablePlatforms = PLATFORM_ORDER.filter((platformName) =>
        normalizedServices.some(
            (service) => service.platform === platformName,
        ),
    );

    const platformServices = useMemo(
        () =>
            platform
                ? getPlatformServices(normalizedServices, platform)
                : [],
        [normalizedServices, platform],
    );

    const serviceTypes = useMemo(
        () =>
            platform
                ? getServiceTypes(normalizedServices, platform)
                : [],
        [normalizedServices, platform],
    );

    const exactServices = useMemo(
        () =>
            platform && serviceType
                ? getServicesByType(
                    normalizedServices,
                    platform,
                    serviceType,
                )
                : [],
        [normalizedServices, platform, serviceType],
    );

    return (
        <div className="service-cascade">
            <label>
                <span>Ijtimoiy tarmoq</span>

                <select
                    value={platform}
                    disabled={disabled}
                    onChange={(event) => {
                        const next = event.target.value as PlatformName | "";

                        onPlatformChange(next);
                    }}
                >
                    <option value="" disabled>
                        Ijtimoiy tarmoqni tanlang
                    </option>

                    {availablePlatforms.map((platformName) => (
                        <option key={platformName} value={platformName}>
                            {platformName}
                        </option>
                    ))}
                </select>
            </label>

            <label>
                <span>Xizmat turi</span>

                <select
                    value={serviceType}
                    disabled={disabled || !platform}
                    onChange={(event) => {
                        onServiceTypeChange(event.target.value);
                    }}
                >
                    <option value="" disabled>
                        {platform
                            ? "Xizmat turini tanlang"
                            : "Avval ijtimoiy tarmoqni tanlang"}
                    </option>

                    {serviceTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </label>

            <label>
                <span>Aniq xizmat</span>

                <select
                    value={serviceId}
                    disabled={disabled || !platform || !serviceType}
                    onChange={(event) => {
                        const next = exactServices.find(
                            (service) =>
                                String(service.service) === event.target.value,
                        );

                        onServiceChange(next ?? null);
                    }}
                >
                    <option value="" disabled>
                        {!platform
                            ? "Avval ijtimoiy tarmoqni tanlang"
                            : !serviceType
                                ? "Avval xizmat turini tanlang"
                                : "Aniq xizmatni tanlang"}
                    </option>

                    {exactServices.map((service) => (
                        <option
                            key={String(service.service)}
                            value={String(service.service)}
                        >
                            {service.name}
                        </option>
                    ))}
                </select>
            </label>

            {platform && !platformServices.length && (
                <p className="service-cascade-empty">
                    Bu platforma uchun hozircha xizmat mavjud emas.
                </p>
            )}

            {platform && serviceType && !exactServices.length && (
                <p className="service-cascade-empty">
                    Bu turdagi xizmat hozircha mavjud emas.
                </p>
            )}
        </div>
    );
}