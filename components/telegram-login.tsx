"use client";

import { useEffect, useId, useState } from "react";
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

  useEffect(() => {
    if (!botName) return;
    const callback = `telegramLogin_${id}`;
    window[callback] = async (data: unknown) => {
      setBusy(true); setError(null);
      try {
        const authResponse = await api.telegramLogin(data as TelegramAuthData);
        login(authResponse);
        const next = searchParams.get("next") || "/dashboard";
        router.replace(next);
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : t.login.configHint);
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
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callback}(user)`);
    document.getElementById(id)?.appendChild(script);
    return () => { delete window[callback]; };
  }, [botName, id, login, router, searchParams, t.login.configHint]);

  if (!botName) return <p className="form-error">{t.login.configHint}</p>;
  return <div className="telegram-login"><div id={id} />{busy && <span>{t.login.verifying}</span>}{error && <p className="form-error">{error}</p>}</div>;
}
