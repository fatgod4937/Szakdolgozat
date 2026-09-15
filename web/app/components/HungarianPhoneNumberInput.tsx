import type { InputHTMLAttributes, ReactElement } from "react";
import {
  formatHungarianPhoneNumber,
  getHungarianNationalNumber,
  toHungarianPhoneNumber,
} from "../utils/hungarian-phone-number";

interface HungarianPhoneNumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> {
  value: string;
  onChange: (value: string) => void;
}

/** Displays an immutable Hungarian country code and a digit-only national input. */
export default function HungarianPhoneNumberInput({
  className,
  onChange,
  value,
  ...inputProps
}: HungarianPhoneNumberInputProps): ReactElement {
  const nationalNumber = getHungarianNationalNumber(value);
  const displayValue = formatHungarianPhoneNumber(nationalNumber);

  return (
    <div className="flex w-full overflow-hidden rounded-2xl border border-black/10 bg-[#fffdf9] transition focus-within:border-black/25">
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center border-r border-black/10 bg-black/[0.035] px-4 text-sm text-black/40"
      >
        +36
      </span>
      <div className="relative min-w-0 flex-1">
        <input
          {...inputProps}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={(event) =>
            onChange(toHungarianPhoneNumber(event.target.value))
          }
          aria-label={`${inputProps["aria-label"] ?? "Phone number"}, Hungarian country code +36`}
          className={`relative z-10 w-full bg-transparent px-4 py-3 font-mono text-transparent caret-black outline-none placeholder:text-transparent ${className ?? ""}`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 font-mono text-black/80 ${nationalNumber ? "" : "text-black/30"}`}
        >
          {displayValue || "20 123 4567"}
        </span>
      </div>
    </div>
  );
}
