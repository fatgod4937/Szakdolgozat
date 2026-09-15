import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "./password-strength";

describe("password strength", () => {
  it("scores progressively stronger passwords", () => {
    expect(getPasswordStrength("")).toEqual({ level: "empty", score: 0 });
    expect(getPasswordStrength("password")).toEqual({
      level: "weak",
      score: 1,
    });
    expect(getPasswordStrength("Password1")).toEqual({
      level: "strong",
      score: 3,
    });
    expect(getPasswordStrength("Password1!")).toEqual({
      level: "veryStrong",
      score: 4,
    });
  });
});
