"use client";

import Image from "next/image";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TelegramLogin } from "@/components/telegram-login";
import { GoogleLogin } from "@/components/google-login";
import { useAuth } from "@/components/auth-provider";
import { useLocale } from "@/lib/i18n";

function LoginPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  useEffect(() => {
    if (!loading && user) {
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next);
    }
  }, [loading, user, router, searchParams]);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-header">
          <Image
            src="/logo1.png"
            alt="Sifat SMM"
            width={48}
            height={48}
            className="brand-logo-img brand-logo-img--large"
            priority
          />
        </div>
        <p className="eyebrow">{t.login.workspace}</p>
        <h1>{t.login.title}</h1>
        <p className="login-copy">{t.login.copy}</p>

        <div className="login-auth-options">
          <TelegramLogin />

          <div className="auth-divider">
            <span>or</span>
          </div>

          <GoogleLogin />
        </div>

        <p className="login-footer">{t.login.footer}</p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <Suspense fallback={<main className="login-page"><section className="login-card"><div className="login-brand-header"><Image src="/logo1.png" alt="Sifat SMM" width={48} height={48} className="brand-logo-img brand-logo-img--large" priority /></div><p className="eyebrow">{t.login.workspace}</p><h1>{t.login.title}</h1><p className="login-copy">{t.login.loading}</p></section></main>}>
      <LoginPageContent />
    </Suspense>
  );
}
