"use client";

import { useForm } from "react-hook-form";

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
  const loginForm = useForm<LoginFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const submitHandler = loginForm.handleSubmit(onSubmit);

  return (
    <form className="mt-8 space-y-4" onSubmit={submitHandler} noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-black/70">E-mail</span>
        <input
          type="email"
          placeholder="valami@pelda.hu"
          className={inputClassName}
          aria-invalid={Boolean(loginForm.formState.errors.email)}
          {...loginForm.register("email", {
            required: "Az e-mail mező kötelező.",
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: "Adj meg egy érvényes e-mail címet.",
            },
          })}
        />
        {loginForm.formState.errors.email ? (
          <span className="text-sm text-[#b45309]">
            {loginForm.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-black/70">Jelszó</span>
        <input
          type="password"
          placeholder="••••••••"
          className={inputClassName}
          aria-invalid={Boolean(loginForm.formState.errors.password)}
          {...loginForm.register("password", {
            required: "A jelszó mező kötelező.",
            minLength: {
              value: 6,
              message: "A jelszó legalább 6 karakter hosszú legyen.",
            },
          })}
        />
        {loginForm.formState.errors.password ? (
          <span className="text-sm text-[#b45309]">
            {loginForm.formState.errors.password.message}
          </span>
        ) : null}
      </label>

      {submitError ? (
        <p className="text-sm text-[#b45309]">{submitError}</p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-2xl bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(254,200,233,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ffb9df] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loginForm.formState.isSubmitting}
      >
        {loginForm.formState.isSubmitting ? "Belépés..." : "Bejelentkezés"}
      </button>
    </form>
  );
}
