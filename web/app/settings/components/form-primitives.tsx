import type { ReactNode } from "react";

type SettingsFieldProps = {
  label: string;
  children: ReactNode;
};

export const inputClassName =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35";

export const primaryButtonClassName =
  "rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50";

export function SettingsField({ label, children }: SettingsFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
