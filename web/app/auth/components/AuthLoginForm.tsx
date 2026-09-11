"use client";

import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import NotificationBanner from "../../components/NotificationBanner/NotificationBanner";
import { useEffect, useState } from "react";
import { showError } from "../../utils/notification";
import { useTranslation } from "react-i18next";

export type LoginFormValues = {
  email: string;
  password: string;
};

type AuthLoginFormProps = {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  submitError?: string | null;
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-[#fffdf9] px-4 py-3 outline-none transition placeholder:text-black/30 focus:border-black/25";

export default function AuthLoginForm({
  onSubmit,
  submitError,
}: AuthLoginFormProps) {
  const { t } = useTranslation();
  const loginForm = useForm<LoginFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (submitError) {
      showError(submitError);
    }
  }, [submitError]);
  const submitHandler = loginForm.handleSubmit(onSubmit, (errors) => {
    const message =
      errors.email?.message ??
      errors.password?.message ??
      t("auth.checkFields");

    showError(message);
  });

  return (
    <form className="mt-8 space-y-4" onSubmit={submitHandler} noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-black/70">
          {t("auth.email")}
        </span>
        <input
          type="email"
          placeholder="name@example.com"
          className={inputClassName}
          aria-invalid={Boolean(loginForm.formState.errors.email)}
          {...loginForm.register("email", {
            required: t("auth.emailRequired"),
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: t("auth.emailInvalid"),
            },
          })}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-black/70">
          {t("auth.password")}
        </span>
        <input
          type="password"
          placeholder="••••••••"
          className={inputClassName}
          aria-invalid={Boolean(loginForm.formState.errors.password)}
          {...loginForm.register("password", {
            required: t("auth.passwordRequired"),
            minLength: {
              value: 6,
              message: t("auth.passwordMin", { count: 6 }),
            },
          })}
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-2xl bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(254,200,233,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ffb9df] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loginForm.formState.isSubmitting}
      >
        {loginForm.formState.isSubmitting
          ? t("auth.loggingIn")
          : t("auth.login")}
      </button>
      <Link
        to="/forgot-password"
        className="block text-center text-sm font-medium text-black/65 underline decoration-black/25 underline-offset-4 transition hover:text-black"
      >
        {t("passwordReset.forgotPassword")}
      </Link>
    </form>
  );
}
