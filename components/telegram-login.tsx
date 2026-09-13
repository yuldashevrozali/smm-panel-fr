"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";
import type { TelegramAuthData } from "@/types/api";

declare global { interface Window { [key: string]: unknown; } }

export function TelegramLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId().replace(/:/g, "");
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const loginRef = useRef(login);
  const routerRef = useRef(router);
  const searchParamsRef = useRef(searchParams);
  const configHintRef = useRef(t.login.configHint);

  useEffect(() => {
    loginRef.current = login;
    routerRef.current = router;
    searchParamsRef.current = searchParams;
    configHintRef.current = t.login.configHint;
  }, [login, router, searchParams, t.login.configHint]);

  useEffect(() => {
    if (!botName) return;
    const callback = `telegramLogin_${id}`;
    window[callback] = async (data: unknown) => {
      setBusy(true); setError(null);
      try {
        const authResponse = await api.telegramLogin(data as TelegramAuthData);
        loginRef.current(authResponse);
        const next = searchParamsRef.current.get("next") || "/dashboard";
        routerRef.current.replace(next);
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : configHintRef.current);
      }
      finally {
        setBusy(false);
      }
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", `${callback}(user)`);
    document.getElementById(id)?.appendChild(script);
    return () => { delete window[callback]; };
  }, [botName, id]);

  if (!botName) return <p className="form-error">{t.login.configHint}</p>;
  return <div className="telegram-login"><div id={id} />{busy && <span>{t.login.verifying}</span>}{error && <p className="form-error">{error}</p>}</div>;
}
