import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function EmailVerificationPendingPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-xl items-center px-6 py-24">
      <div className="w-full rounded-2xl border border-black/10 bg-[#fff8f1] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-semibold text-black/55">
          {t("verificationPending.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-black">
          {t("verificationPending.title")}
        </h1>
        <p className="mt-4 leading-7 text-black/70">
          {t("verificationPending.description", {
            email: email ?? t("verificationPending.yourEmail"),
          })}
        </p>
        <Link
          to="/auth"
          className="mt-7 inline-flex rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb9df]"
        >
          {t("verificationPending.backToLogin")}
        </Link>
      </div>
    </section>
  );
}
