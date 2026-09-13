import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthTokens,
  getAccessToken,
  getAccessTokenExpiry,
  getRefreshToken,
  hasValidAccessToken,
  isAccessTokenNearExpiry,
  setAuthTokens,
} from "./token-storage";

function createJwt(expiryInSeconds: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const payload = btoa(JSON.stringify({ exp: expiryInSeconds }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${header}.${payload}.signature`;
}

describe("token-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and clears auth tokens", () => {
    setAuthTokens("access-token", "refresh-token");

    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-token");

    clearAuthTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("detects valid and near-expiry access tokens", () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const token = createJwt(futureExpiry);

    expect(hasValidAccessToken(token)).toBe(true);
    expect(getAccessTokenExpiry(token)).toBe(futureExpiry * 1000);
    expect(isAccessTokenNearExpiry(token, 30_000)).toBe(false);
  });

  it("flags near-expiry access tokens", () => {
    const nearExpiry = Math.floor((Date.now() + 10_000) / 1000);
    const token = createJwt(nearExpiry);

    expect(isAccessTokenNearExpiry(token, 30_000)).toBe(true);
  });
});
