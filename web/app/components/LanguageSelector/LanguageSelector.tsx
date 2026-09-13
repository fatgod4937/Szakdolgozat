"use client";

import { useTranslation } from "react-i18next";

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const isHungarian = i18n.language.startsWith("hu");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isHungarian}
      aria-label={t("language.switch")}
      onClick={() => void i18n.changeLanguage(isHungarian ? "en" : "hu")}
      className="relative flex h-8 w-[4.5rem] items-center rounded-full border border-black/10 bg-white/80 px-1 text-xs font-semibold text-black shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      <span
        className={`absolute top-1 h-6 w-8 rounded-full bg-[#fec8e9] shadow-sm transition-transform duration-300 ease-out ${isHungarian ? "translate-x-8" : "translate-x-0"}`}
      />
      <span
        className={`relative z-10 w-1/2 text-center transition-colors duration-300 ${isHungarian ? "text-black/50" : "text-black"}`}
      >
        EN
      </span>
      <span
        className={`relative z-10 w-1/2 text-center transition-colors duration-300 ${isHungarian ? "text-black" : "text-black/50"}`}
      >
        HU
      </span>
    </button>
  );
}
