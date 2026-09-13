"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../utils/auth-api";

type ForgotPasswordValues = { email: string };

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ForgotPasswordValues>({ defaultValues: { email: "" } });
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) =>
      requestPasswordReset(values.email),
    onSuccess: () => setSubmitted(true),
  });

  return (
    <section className="min-h-screen bg-[#fffaf6] px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold text-black">
          {t("passwordReset.forgotTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/65">
          {t("passwordReset.forgotDescription")}
        </p>
        {submitted ? (
          <p className="mt-6 rounded-lg bg-[#fff3e8] p-4 text-sm leading-6 text-black/75">
            {t("passwordReset.requestSent")}
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-black/70">
                {t("auth.email")}
              </span>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/30"
                {...form.register("email", {
                  required: true,
                  pattern: /\S+@\S+\.\S+/,
                })}
              />
            </label>
            {mutation.error ? (
              <p className="text-sm text-red-700">
                {t("passwordReset.requestFailed")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-xl bg-[#fec8e9] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {mutation.isPending
                ? t("common.loading")
                : t("passwordReset.sendLink")}
            </button>
          </form>
        )}
        <Link
          to="/auth"
          className="mt-6 block text-center text-sm font-medium text-black/65 underline underline-offset-4"
        >
          {t("passwordReset.backToLogin")}
        </Link>
      </div>
    </section>
  );
}
