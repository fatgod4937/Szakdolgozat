"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../utils/auth-api";
import { setAuthTokens } from "../utils/token-storage";
import { useTranslation } from "react-i18next";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"verifying" | "verified" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");
  const verifiedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(t("verify.missing"));
      return;
    }

    if (verifiedTokenRef.current === token) {
      return;
    }

    verifiedTokenRef.current = token;

    void verifyEmail(token)
      .then((data) => {
        if (!data.accessToken || !data.refreshToken) {
          throw new Error(t("verify.invalid"));
        }
        setAuthTokens(data.accessToken, data.refreshToken);
        setStatus("verified");
        setMessage(t("verify.success"));
        navigate("/onboarding", { replace: true });
      })
      .catch((error) => {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : t("verify.invalid"),
        );
      });
  }, [searchParams, t]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#fffdf9] px-4 pt-20">
      <div className="w-full max-w-md border border-black/10 bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("verify.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {status === "verified" ? t("verify.verified") : t("verify.title")}
        </h1>
        <p className="mt-4 leading-7 text-black/65">
          {message || t("verify.loading")}
        </p>
        {status === "error" ? (
          <Link
            to="/auth"
            className="mt-7 inline-block rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold"
          >
            {t("verify.login")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
