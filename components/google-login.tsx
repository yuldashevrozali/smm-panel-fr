"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: unknown) => void;
                    renderButton: (parent: HTMLElement, options: unknown) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

export function GoogleLogin() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLocale();
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientId = rawClientId ? rawClientId.trim() : "";

    const loginRef = useRef(login);
    const routerRef = useRef(router);
    const searchParamsRef = useRef(searchParams);
    const authenticatingRef = useRef(false);

    useEffect(() => {
        loginRef.current = login;
        routerRef.current = router;
        searchParamsRef.current = searchParams;
    }, [login, router, searchParams]);

    const handleCredentialResponse = useCallback(
        async (response: { credential?: string }) => {
            if (!response.credential || authenticatingRef.current) return;
            authenticatingRef.current = true;
            setBusy(true);
            setError(null);

            try {
                const authResponse = await api.googleLogin({ credential: response.credential });
                loginRef.current(authResponse);

                const next = searchParamsRef.current.get("next") || "/dashboard";
                routerRef.current.replace(next);
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Google authentication failed.");
                authenticatingRef.current = false;
                setBusy(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!clientId) return;

        let isMounted = true;
        const container = containerRef.current;

        const initGis = () => {
            if (!isMounted || !window.google?.accounts?.id || !containerRef.current) return;

            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });

                containerRef.current.innerHTML = "";
                window.google.accounts.id.renderButton(containerRef.current, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    text: "continue_with",
                    shape: "rectangular",
                    logo_alignment: "left",
                    width: 280,
                });
            } catch {
                if (isMounted) {
                    setError("Failed to initialize Google Sign-In.");
                }
            }
        };

        if (window.google?.accounts?.id) {
            initGis();
        } else {
            const existingScript = document.getElementById("google-gis-script");
            if (!existingScript) {
                const script = document.createElement("script");
                script.id = "google-gis-script";
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    if (isMounted) initGis();
                };
                script.onerror = () => {
                    if (isMounted) setError("Failed to load Google Sign-In SDK.");
                };
                document.body.appendChild(script);
            } else {
                existingScript.addEventListener("load", initGis);
            }
        }

        return () => {
            isMounted = false;
            if (container) {
                container.innerHTML = "";
            }
        };
    }, [clientId, handleCredentialResponse]);

    if (!clientId) {
        return <p className="form-error">Google login is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.</p>;
    }

    return (
        <div className="google-login">
            <div ref={containerRef} className="google-widget-container" />
            {busy && <div className="google-busy-status">{t.login.verifying}</div>}
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
