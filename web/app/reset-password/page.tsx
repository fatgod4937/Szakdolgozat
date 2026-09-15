"use client";

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { resetPassword } from "../utils/auth-api";
import { hashPassword } from "../utils/hash-password";

type ResetPasswordValues = { password: string; confirmPassword: string };

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ResetPasswordValues>({
    defaultValues: { password: "", confirmPassword: "" },
  });
  const password = form.watch("password");
  const mutation = useMutation({
    mutationFn: async (values: ResetPasswordValues) =>
      resetPassword({
        token,
        passwordHash: await hashPassword(values.password),
      }),
    onSuccess: () => setSubmitted(true),
  });

  if (!token) {
    return (
      <section className="min-h-screen bg-[#fffaf6] px-4 pb-16 pt-28 text-center">
        <p className="text-sm text-red-700">{t("passwordReset.invalidLink")}</p>
        <Link
          to="/forgot-password"
          className="mt-4 inline-block text-sm underline"
        >
          {t("passwordReset.forgotPassword")}
        </Link>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#fffaf6] px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold text-black">
          {t("passwordReset.resetTitle")}
        </h1>
        {submitted ? (
          <p className="mt-6 rounded-lg bg-[#fff3e8] p-4 text-sm leading-6 text-black/75">
            {t("passwordReset.passwordChanged")}
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-black/70">
                {t("settings.newPassword")}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/30"
                {...form.register("password", { required: true, minLength: 6 })}
              />
            </label>
            <PasswordStrengthMeter password={password} />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-black/70">
                {t("settings.confirmPassword")}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/30"
                {...form.register("confirmPassword", {
                  validate: (value) => value === form.getValues("password"),
                })}
              />
            </label>
            {mutation.error ? (
              <p className="text-sm text-red-700">{mutation.error.message}</p>
            ) : null}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-xl bg-[#fec8e9] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {mutation.isPending
                ? t("common.loading")
                : t("passwordReset.resetPassword")}
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
