import { describe, expect, it } from "vitest";
import {
  formatHungarianPhoneNumber,
  getHungarianNationalNumber,
  isValidHungarianPhoneNumber,
  toHungarianPhoneNumber,
} from "./hungarian-phone-number";

describe("Hungarian phone number handling", () => {
  it("keeps only nine national digits and formats spaces for display", () => {
    expect(getHungarianNationalNumber("20 123 4567")).toBe("201234567");
    expect(formatHungarianPhoneNumber("201234567")).toBe("20 123 4567");
  });

  it("normalizes a pasted country code to an E.164 value", () => {
    expect(toHungarianPhoneNumber("+36 20 123 4567")).toBe("+36201234567");
  });

  it("accepts only a complete Hungarian number", () => {
    expect(isValidHungarianPhoneNumber("+36201234567")).toBe(true);
    expect(isValidHungarianPhoneNumber("+3620123456")).toBe(false);
    expect(isValidHungarianPhoneNumber("+442012345678")).toBe(false);
    expect(toHungarianPhoneNumber("+442012345678")).toBe("");
  });
});
