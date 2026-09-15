const HUNGARIAN_COUNTRY_CODE = "36";
const NATIONAL_PHONE_NUMBER_LENGTH = 9;
const HUNGARIAN_PHONE_NUMBER_PATTERN = /^\+36\d{9}$/;

function removeCountryCode(value: string): string {
  const trimmedValue = value.trim();
  const digits = value.replace(/\D/g, "");

  if (trimmedValue.startsWith("+36") || trimmedValue.startsWith("0036")) {
    return digits.replace(/^(36|0036)/, "");
  }

  if (trimmedValue.startsWith("+") || trimmedValue.startsWith("00")) {
    return "";
  }

  return digits.startsWith(HUNGARIAN_COUNTRY_CODE) &&
    digits.length > NATIONAL_PHONE_NUMBER_LENGTH
    ? digits.slice(HUNGARIAN_COUNTRY_CODE.length)
    : digits;
}

/** Gets at most nine digits for the editable Hungarian national phone number. */
export function getHungarianNationalNumber(value: string): string {
  return removeCountryCode(value).slice(0, NATIONAL_PHONE_NUMBER_LENGTH);
}

/** Formats a national Hungarian phone number for display as XX XXX XXXX. */
export function formatHungarianPhoneNumber(value: string): string {
  const digits = getHungarianNationalNumber(value);

  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)]
    .filter(Boolean)
    .join(" ");
}

/** Converts a national phone number to the canonical E.164 form used by the API. */
export function toHungarianPhoneNumber(value: string): string {
  const digits = getHungarianNationalNumber(value);
  return digits ? `+36${digits}` : "";
}

/** Checks whether a value is a complete Hungarian phone number. */
export function isValidHungarianPhoneNumber(value: string): boolean {
  return HUNGARIAN_PHONE_NUMBER_PATTERN.test(value.replace(/[\s-]/g, ""));
}
