"use client";

import { useEffect, useState } from "react";
import { locales, translations, type Locale } from "@/lib/translations";

const STORAGE_KEY = "smmly-locale";

export { locales, type Locale };
export const defaultLocale: Locale = "en";

export function getStoredLocale(): Locale {
    if (typeof window === "undefined") return defaultLocale;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "uz" || saved === "ru") return saved;
    return defaultLocale;
}

export function setStoredLocale(locale: Locale) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    window.dispatchEvent(new Event("smmly-locale-changed"));
}

export function useLocale() {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);

    useEffect(() => {
        const syncLocale = () => {
            const nextLocale = getStoredLocale();
            setLocaleState(nextLocale);
            document.documentElement.lang = nextLocale;
        };

        syncLocale();

        const onChange = () => syncLocale();
        window.addEventListener("smmly-locale-changed", onChange);

        return () => window.removeEventListener("smmly-locale-changed", onChange);
    }, []);

    const setLocale = (nextLocale: Locale) => {
        setStoredLocale(nextLocale);
        setLocaleState(nextLocale);
    };

    return {
        locale,
        setLocale,
        t: translations[locale],
    };
}
