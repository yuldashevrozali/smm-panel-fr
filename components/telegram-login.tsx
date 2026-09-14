"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";
import type { TelegramAuthData } from "@/types/api";

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function TelegramLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Clean element ID for DOM lookup
  const rawId = useId();
  const [containerId] = useState(() => `telegram_widget_${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`);

  // Clean environment bot name (strip accidental '@' prefix or whitespace if present)
  const rawBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const botName = rawBotName ? rawBotName.trim().replace(/^@/, "") : "";

  const loginRef = useRef(login);
  const routerRef = useRef(router);
  const searchParamsRef = useRef(searchParams);
  const configHintRef = useRef(t.login.configHint);
  const authenticatingRef = useRef(false);

  useEffect(() => {
    loginRef.current = login;
    routerRef.current = router;
    searchParamsRef.current = searchParams;
    configHintRef.current = t.login.configHint;
  }, [login, router, searchParams, t.login.configHint]);

  const handleAuth = useCallback(async (data: TelegramAuthData) => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const authResponse = await api.telegramLogin(data);
      loginRef.current(authResponse);

      const next = searchParamsRef.current.get("next") || "/dashboard";
      routerRef.current.replace(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : configHintRef.current);
      authenticatingRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!botName) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous elements if re-mounting
    container.innerHTML = "";

    const callbackName = `telegramLoginCallback_${containerId}`;

    window[callbackName] = (user: unknown) => {
      if (user && typeof user === "object") {
        void handleAuth(user as TelegramAuthData);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", `${callbackName}(user)`);

    container.appendChild(script);

    return () => {
      delete window[callbackName];
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [botName, containerId, handleAuth]);

  if (!botName) {
    return <p className="form-error">{t.login.configHint}</p>;
  }

  return (
    <div className="telegram-login">
      <div id={containerId} className="telegram-widget-container" />
      {busy && <div className="telegram-busy-status">{t.login.verifying}</div>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
