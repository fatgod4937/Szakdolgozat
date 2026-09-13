"use client";

import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};
type Props = {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  submitError?: string | null;
};
const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-[#fffdf9] px-4 py-3 outline-none transition placeholder:text-black/30 focus:border-black/25";

export default function AuthRegisterForm({ onSubmit, submitError }: Props) {
  const { t } = useTranslation();
  const form = useForm<RegisterFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  const password = form.watch("password");
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("auth.lastName")}
          error={form.formState.errors.lastName?.message}
        >
          <input
            className={inputClassName}
            {...form.register("lastName", {
              required: t("auth.lastNameRequired"),
            })}
          />
        </Field>
        <Field
          label={t("auth.firstName")}
          error={form.formState.errors.firstName?.message}
        >
          <input
            className={inputClassName}
            {...form.register("firstName", {
              required: t("auth.firstNameRequired"),
            })}
          />
        </Field>
      </div>
      <Field
        label={t("auth.email")}
        error={form.formState.errors.email?.message}
      >
        <input
          type="email"
          className={inputClassName}
          {...form.register("email", {
            required: t("auth.emailRequired"),
            pattern: { value: /\S+@\S+\.\S+/, message: t("auth.emailInvalid") },
          })}
        />
      </Field>
      <Field
        label={t("auth.phoneNumber")}
        hint={t("auth.phoneHint")}
        error={form.formState.errors.phoneNumber?.message}
      >
        <input
          type="tel"
          className={inputClassName}
          {...form.register("phoneNumber", {
            validate: (value) =>
              !value ||
              /^[+()\d\s-]{6,30}$/.test(value) ||
              t("auth.phoneInvalid"),
          })}
        />
      </Field>
      <Field
        label={t("auth.password")}
        error={form.formState.errors.password?.message}
      >
        <input
          type="password"
          className={inputClassName}
          {...form.register("password", {
            required: t("auth.passwordRequired"),
            minLength: {
              value: 8,
              message: t("auth.passwordMin", { count: 8 }),
            },
            validate: (value) =>
              (/[a-z]/.test(value) &&
                /[A-Z]/.test(value) &&
                /\d/.test(value) &&
                /[^A-Za-z0-9]/.test(value)) ||
              t("auth.passwordNotStrong"),
          })}
        />
      </Field>
      <Field
        label={t("auth.confirmPassword")}
        error={form.formState.errors.confirmPassword?.message}
      >
        <input
          type="password"
          className={inputClassName}
          {...form.register("confirmPassword", {
            required: t("auth.confirmPasswordRequired"),
            validate: (value) =>
              value === password || t("auth.passwordsDoNotMatch"),
          })}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-3xl border border-black/10 bg-[#fffdf9] p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          {...form.register("acceptTerms", {
            required: t("auth.termsRequired"),
          })}
        />
        <span className="text-sm leading-6 text-black/70">
          {t("auth.acceptTerms")}{" "}
          <Link
            to="/data-safety"
            target="_blank"
            className="font-semibold text-[#aa2f75] underline"
          >
            {t("footer.privacy")}
          </Link>
        </span>
      </label>
      {form.formState.errors.acceptTerms ? (
        <p className="text-sm text-[#b45309]">
          {form.formState.errors.acceptTerms.message}
        </p>
      ) : null}
      {submitError ? (
        <p className="text-sm text-[#b45309]">{submitError}</p>
      ) : null}
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full rounded-2xl bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(254,200,233,0.45)] disabled:opacity-70"
      >
        {form.formState.isSubmitting
          ? t("auth.registering")
          : t("auth.completeRegistration")}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-black/70">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-black/50">{hint}</span>
      ) : null}
      {error ? (
        <span className="block text-sm text-[#b45309]">{error}</span>
      ) : null}
    </label>
  );
}
