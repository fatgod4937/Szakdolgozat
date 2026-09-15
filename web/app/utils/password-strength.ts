export type PasswordStrength =
  | "empty"
  | "weak"
  | "medium"
  | "strong"
  | "veryStrong";

export type PasswordStrengthResult = {
  level: PasswordStrength;
  score: number;
};

/** Scores a password from length and character variety without persisting it. */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { level: "empty", score: 0 };
  }

  const score = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (score <= 1) {
    return { level: "weak", score: 1 };
  }
  if (score === 2) {
    return { level: "medium", score };
  }
  if (score === 3) {
    return { level: "strong", score };
  }

  return { level: "veryStrong", score };
}
