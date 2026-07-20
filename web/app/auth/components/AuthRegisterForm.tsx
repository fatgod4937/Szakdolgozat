"use client";

import { useForm } from "react-hook-form";

export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type AuthRegisterFormProps = {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  submitError?: string | null;
};

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-[#fffdf9] px-4 py-3 outline-none transition placeholder:text-black/30 focus:border-black/25";

type PasswordStrength = {
  score: number;
  label: string;
  barClassName: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return { score, label: "Gyenge", barClassName: "bg-red-400" };
  }

  if (score === 2) {
    return { score, label: "Közepes", barClassName: "bg-amber-400" };
  }

  if (score === 3) {
    return { score, label: "Erős", barClassName: "bg-lime-500" };
  }

  return { score, label: "Nagyon erős", barClassName: "bg-emerald-500" };
}

export default function AuthRegisterForm({
  onSubmit,
  submitError,
}: AuthRegisterFormProps) {
  const registerForm = useForm<RegisterFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = registerForm.watch("password");
  const passwordStrength = getPasswordStrength(password);
  const submitHandler = registerForm.handleSubmit(onSubmit);

  const passwordStrengthLabel =
    password.length > 0 ? passwordStrength.label : "Írj be egy jelszót";

  return (
    <form className="mt-8 space-y-4" onSubmit={submitHandler} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/70">Vezetéknév</span>
          <input
            type="text"
            placeholder="Kovács"
            className={inputClassName}
            aria-invalid={Boolean(registerForm.formState.errors.lastName)}
            {...registerForm.register("lastName", {
              required: "A vezetéknév kötelező.",
            })}
          />
          {registerForm.formState.errors.lastName ? (
            <span className="text-sm text-[#b45309]">
              {registerForm.formState.errors.lastName.message}
            </span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/70">Keresztnév</span>
          <input
            type="text"
            placeholder="Anna"
            className={inputClassName}
            aria-invalid={Boolean(registerForm.formState.errors.firstName)}
            {...registerForm.register("firstName", {
              required: "A keresztnév kötelező.",
            })}
          />
          {registerForm.formState.errors.firstName ? (
            <span className="text-sm text-[#b45309]">
              {registerForm.formState.errors.firstName.message}
            </span>
          ) : null}
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-black/70">E-mail</span>
        <input
          type="email"
          placeholder="valami@pelda.hu"
          className={inputClassName}
          aria-invalid={Boolean(registerForm.formState.errors.email)}
          {...registerForm.register("email", {
            required: "Az e-mail mező kötelező.",
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: "Adj meg egy érvényes e-mail címet.",
            },
          })}
        />
        {registerForm.formState.errors.email ? (
          <span className="text-sm text-[#b45309]">
            {registerForm.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <div className="grid gap-4 grid-cols-1">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/70">Jelszó</span>
          <input
            type="password"
            placeholder="••••••••"
            className={inputClassName}
            aria-invalid={Boolean(registerForm.formState.errors.password)}
            {...registerForm.register("password", {
              required: "A jelszó mező kötelező.",
              minLength: {
                value: 8,
                message: "A jelszó legalább 8 karakter hosszú legyen.",
              },
              validate: (value) => {
                const strength = getPasswordStrength(value);

                return strength.score >= 3 || "A jelszó nem elég erős.";
              },
            })}
          />
          {registerForm.formState.errors.password ? (
            <span className="text-sm text-[#b45309]">
              {registerForm.formState.errors.password.message}
            </span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/70">
            Jelszó megerősítése
          </span>
          <input
            type="password"
            placeholder="••••••••"
            className={inputClassName}
            aria-invalid={Boolean(
              registerForm.formState.errors.confirmPassword,
            )}
            {...registerForm.register("confirmPassword", {
              required: "A jelszó megerősítése kötelező.",
              validate: (value) =>
                value === password || "A két jelszó nem egyezik.",
            })}
          />
          {registerForm.formState.errors.confirmPassword ? (
            <span className="text-sm text-[#b45309]">
              {registerForm.formState.errors.confirmPassword.message}
            </span>
          ) : null}
        </label>
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-black/50">
            <span>Jelszóerősség</span>
            <span>{passwordStrengthLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={`h-2 rounded-full transition ${
                  index < passwordStrength.score
                    ? passwordStrength.barClassName
                    : "bg-black/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-3xl border border-black/10 bg-[#fffdf9] p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-black/20 text-black focus:ring-black"
          aria-invalid={Boolean(registerForm.formState.errors.acceptTerms)}
          {...registerForm.register("acceptTerms", {
            required: "El kell fogadnod a feltételeket.",
          })}
        />
        <span className="text-sm leading-6 text-black/70">
          Elfogadom a felhasználási feltételeket és az adatkezelési
          tájékoztatót.
        </span>
      </label>
      {registerForm.formState.errors.acceptTerms ? (
        <span className="text-sm text-[#b45309]">
          {registerForm.formState.errors.acceptTerms.message}
        </span>
      ) : null}

      {submitError ? (
        <p className="text-sm text-[#b45309]">{submitError}</p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-2xl bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(254,200,233,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ffb9df] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={registerForm.formState.isSubmitting}
      >
        {registerForm.formState.isSubmitting
          ? "Regisztráció..."
          : "Regisztráció befejezése"}
      </button>
    </form>
  );
}
