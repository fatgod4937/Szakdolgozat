import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { getPasswordStrength } from "../utils/password-strength";

interface PasswordStrengthMeterProps {
  password: string;
}

const labels = {
  empty: "auth.enterPassword",
  weak: "auth.passwordWeak",
  medium: "auth.passwordMedium",
  strong: "auth.passwordStrong",
  veryStrong: "auth.passwordVeryStrong",
} as const;

const colors = {
  empty: "bg-black/10",
  weak: "bg-[#d9776d]",
  medium: "bg-[#d99b54]",
  strong: "bg-[#7d9d62]",
  veryStrong: "bg-[#4c8a6a]",
} as const;

/** Renders accessible local feedback about the password currently being entered. */
export default function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps): ReactElement {
  const { t } = useTranslation();
  const { level, score } = getPasswordStrength(password);

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-black/55">
        <span>{t("auth.passwordStrength")}</span>
        <span className="font-medium text-black/70">{t(labels[level])}</span>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={`h-1 rounded-full ${index < score ? colors[level] : "bg-black/10"}`}
          />
        ))}
      </div>
    </div>
  );
}
