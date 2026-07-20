"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AuthLoginForm, {
  type LoginFormValues,
} from "./components/AuthLoginForm";
import AuthRegisterForm, {
  type RegisterFormValues,
} from "./components/AuthRegisterForm";
import { hashPassword } from "../utils/hash-password";
import { setAuthTokens } from "../utils/token-storage";
import { showError, showSuccess } from "../utils/notification";
import { login, type AuthResponse, register } from "../utils/auth-api";

type AuthMode = "login" | "register";

const authHighlights = [
  "Gyors belépés meglévő fiókkal.",
  "Egyszerű regisztráció új felhasználóknak.",
  "A backend hitelesítés később ide kapcsolható.",
];

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginSubmitError, setLoginSubmitError] = useState<string | null>(null);
  const [registerSubmitError, setRegisterSubmitError] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const loginMutation = useMutation<AuthResponse, Error, LoginFormValues>({
    mutationFn: async (values) =>
      login({
        email: values.email,
        passwordHash: await hashPassword(values.password),
      }),
    onSuccess: (data) => {
      if (data.accessToken && data.refreshToken) {
        setAuthTokens(data.accessToken, data.refreshToken);
      }

      showSuccess("Login successful.");
      navigate("/pets");
    },
    onError: (error) => {
      setLoginSubmitError(error.message);
      showError(error.message);
    },
  });

  const registerMutation = useMutation<AuthResponse, Error, RegisterFormValues>(
    {
      mutationFn: async (values) =>
        register({
          email: values.email,
          passwordHash: await hashPassword(values.password),
          firstName: values.firstName,
          lastName: values.lastName,
        }),
      onSuccess: (data) => {
        if (data.accessToken && data.refreshToken) {
          setAuthTokens(data.accessToken, data.refreshToken);
        }

        showSuccess("Registration successful.");
        navigate("/pets");
      },
      onError: (error) => {
        setRegisterSubmitError(error.message);
        showError(error.message);
      },
    },
  );

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoginSubmitError(null);
    await loginMutation.mutateAsync(values);
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setRegisterSubmitError(null);
    await registerMutation.mutateAsync(values);
  };

  const activeButtonClass =
    "rounded-full px-5 py-2 text-sm font-medium transition shadow-lg bg-black text-white";
  const inactiveButtonClass =
    "rounded-full px-5 py-2 text-sm font-medium transition bg-black/5 text-black/60 hover:bg-black/10";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fffdf9] via-white to-[#fff3e8] pt-12 pb-12">
      <div className="absolute left-[-6rem] top-24 h-56 w-56 rounded-full bg-[#fec8e9]/35 blur-3xl" />
      <div className="absolute right-[-4rem] top-40 h-72 w-72 rounded-full bg-[#ffd8b0]/40 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-7xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-xl space-y-6">
          <span className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
            Fiókkezelés
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            Jelentkezz be, vagy hozz létre egy új örökbefogadói profilt.
          </h1>
          <p className="max-w-lg text-base leading-7 text-black/70">
            A felület később a valós backendhez kapcsolódik, de már most
            ugyanazt a puha, tiszta vizuális nyelvet használja, mint a főoldal.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {authHighlights.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-black/8 bg-white/80 p-4 text-sm leading-6 shadow-[0_12px_40px_rgba(0,0,0,0.05)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 w-full max-w-xl lg:mt-0 lg:pl-12">
          <div className="rounded-[2rem] border border-black/8 bg-white/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur md:p-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setRegisterSubmitError(null);
                }}
                className={
                  mode === "login" ? activeButtonClass : inactiveButtonClass
                }
              >
                Bejelentkezés
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setLoginSubmitError(null);
                }}
                className={
                  mode === "register" ? activeButtonClass : inactiveButtonClass
                }
              >
                Regisztráció
              </button>
            </div>

            {mode === "login" ? (
              <AuthLoginForm
                onSubmit={onLoginSubmit}
                submitError={loginSubmitError}
              />
            ) : (
              <AuthRegisterForm
                onSubmit={onRegisterSubmit}
                submitError={registerSubmitError}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
