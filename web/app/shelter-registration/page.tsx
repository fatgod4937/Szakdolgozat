"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import HungarianPhoneNumberInput from "../components/HungarianPhoneNumberInput";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { hashPassword } from "../utils/hash-password";
import { isValidHungarianPhoneNumber } from "../utils/hungarian-phone-number";
import { showError, showSuccess } from "../utils/notification";
import { registerShelter } from "../utils/shelter-api";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type ShelterRegistrationValues = {
  name: string;
  description: string;
  city: string;
  contactEmail: string;
  websiteUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type DocumentError = "documentCount" | "documentInvalid" | "documentLimit";

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-[#fffdf9] px-4 py-3 outline-none transition placeholder:text-black/30 focus:border-black/25";

export default function ShelterRegistrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentError, setDocumentError] = useState<DocumentError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ShelterRegistrationValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      city: "",
      contactEmail: "",
      websiteUrl: "",
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

  const registerMutation = useMutation({
    mutationFn: async (values: ShelterRegistrationValues) =>
      registerShelter(
        {
          email: values.email,
          passwordHash: await hashPassword(values.password),
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: values.phoneNumber,
          acceptDataSafety: values.acceptTerms,
        },
        {
          name: values.name,
          description: values.description,
          city: values.city,
          contactEmail: values.contactEmail,
          websiteUrl: values.websiteUrl,
        },
        documents,
      ),
    onSuccess: (_data, values) => {
      showSuccess(t("auth.registrationSuccess"));
      navigate("/email-verification-pending", {
        state: { email: values.email },
      });
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
      showError(error.message);
    },
  });

  const onSubmit = async (values: ShelterRegistrationValues) => {
    setSubmitError(null);

    if (documents.length < 1 || documents.length > 5) {
      setDocumentError("documentCount");
      return;
    }

    await registerMutation.mutateAsync(values).catch(() => undefined);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fffdf9] via-white to-[#fff3e8] [padding-top:calc(5rem+env(safe-area-inset-top))] pb-12 sm:[padding-top:6rem]">
      <div className="absolute left-[-6rem] top-24 h-56 w-56 rounded-full bg-[#fec8e9]/35 blur-3xl" />
      <div className="absolute right-[-4rem] top-40 h-72 w-72 rounded-full bg-[#ffd8b0]/40 blur-3xl" />

      <div className="mx-auto flex w-full max-w-7xl flex-col px-6 py-12 lg:flex-row lg:items-start lg:px-12">
        <div className="max-w-xl space-y-6 lg:sticky lg:top-28">
          <span className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
            {t("shelterRegistration.eyebrow")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            {t("shelterRegistration.title")}
          </h1>
          <p className="max-w-lg text-base leading-7 text-black/70">
            {t("shelterRegistration.description")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              t("shelterRegistration.stepDetails"),
              t("shelterRegistration.stepDocuments"),
              t("shelterRegistration.stepVerify"),
              t("shelterRegistration.stepReview"),
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-black/8 bg-white/80 p-4 text-sm leading-6 shadow-[0_12px_40px_rgba(0,0,0,0.05)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="text-sm text-black/60">
            {t("shelterRegistration.alreadyRegistered")}{" "}
            <Link to="/auth" className="font-semibold text-[#aa2f75] underline">
              {t("auth.login")}
            </Link>
            . {t("shelterRegistration.registeringAdopter")}{" "}
            <Link
              to="/auth?mode=register"
              className="font-semibold text-[#aa2f75] underline"
            >
              {t("shelterRegistration.signUpHere")}
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 w-full max-w-xl lg:mt-0 lg:pl-12">
          <form
            className="space-y-4 rounded-[2rem] border border-black/8 bg-white/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur md:p-8"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <h2 className="text-lg font-semibold">{t("shelterRegistration.details")}</h2>
            <Field label={t("shelterRegistration.name")} error={form.formState.errors.name?.message}>
              <input
                className={inputClassName}
                {...form.register("name", { required: t("shelterRegistration.nameRequired") })}
              />
            </Field>
            <Field
              label={t("shelterRegistration.descriptionLabel")}
              error={form.formState.errors.description?.message}
            >
              <textarea
                className={`${inputClassName} min-h-28`}
                {...form.register("description", {
                  required: t("shelterRegistration.descriptionRequired"),
                })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("shelterRegistration.city")} error={form.formState.errors.city?.message}>
                <input
                  className={inputClassName}
                  {...form.register("city", { required: t("shelterRegistration.cityRequired") })}
                />
              </Field>
              <Field
                label={t("shelterRegistration.contactEmail")}
                error={form.formState.errors.contactEmail?.message}
              >
                <input
                  type="email"
                  className={inputClassName}
                  {...form.register("contactEmail", {
                    required: t("auth.emailRequired"),
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: t("auth.emailInvalid"),
                    },
                  })}
                />
              </Field>
            </div>
            <Field
              label={t("shelterRegistration.website")}
              error={form.formState.errors.websiteUrl?.message}
            >
              <input
                type="url"
                placeholder="https://example.org"
                className={inputClassName}
                {...form.register("websiteUrl", {
                  validate: (value) =>
                    !value ||
                    value.startsWith("https://") ||
                    t("shelterRegistration.websiteInvalid"),
                })}
              />
            </Field>

            <Field
              label={t("shelterRegistration.documents")}
              hint={t("shelterRegistration.documentsHint")}
              error={documentError ? t(`shelterRegistration.${documentError}`) : undefined}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                aria-label={t("shelterRegistration.browse")}
                className="peer sr-only"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  const invalid = selected.find(
                    (file) =>
                      !ACCEPTED_TYPES.includes(file.type) ||
                      file.size > MAX_FILE_SIZE_BYTES,
                  );

                  if (invalid || selected.length > 5) {
                    setDocumentError(
                      invalid
                        ? "documentInvalid"
                        : "documentLimit",
                    );
                    event.target.value = "";
                    setDocuments([]);
                    return;
                  }

                  setDocumentError(null);
                  setDocuments(selected);
                }}
              />
              <span className="flex w-fit cursor-pointer items-center rounded-full border border-[#aa2f75] bg-[#fec8e9] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ffb9df] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black">
                {t("shelterRegistration.browse")}
              </span>
            </Field>
            {documents.length > 0 ? (
              <ul className="space-y-1 text-sm text-black/70">
                {documents.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            ) : null}

            <h2 className="pt-4 text-lg font-semibold">{t("shelterRegistration.account")}</h2>
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
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: t("auth.emailInvalid"),
                  },
                })}
              />
            </Field>
            <PasswordStrengthMeter password={password} />
            <Field
              label={t("auth.phoneNumber")}
              hint={t("auth.phoneHint")}
              error={form.formState.errors.phoneNumber?.message}
            >
              <Controller
                control={form.control}
                name="phoneNumber"
                rules={{
                  validate: (value) =>
                    !value ||
                    isValidHungarianPhoneNumber(value) ||
                    t("auth.phoneInvalid"),
                }}
                render={({ field }) => (
                  <HungarianPhoneNumberInput
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    aria-label={t("auth.phoneNumber")}
                  />
                )}
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
                : t("shelterRegistration.submit")}
            </button>
          </form>
        </div>
      </div>
    </section>
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
