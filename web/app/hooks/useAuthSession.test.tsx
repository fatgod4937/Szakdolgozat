import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthTokens } from "../utils/token-storage";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("../utils/auth-api", () => ({
  refresh: refreshMock,
}));

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

describe("useAuthSession", () => {
  beforeEach(() => {
    localStorage.clear();
    refreshMock.mockReset();
  });

  it("refreshes expired sessions and stores rotated tokens", async () => {
    const expiredAccessToken = createJwt(Math.floor(Date.now() / 1000) - 60);
    const existingRefreshToken = createJwt(
      Math.floor(Date.now() / 1000) + 3600,
    );

    localStorage.setItem("floofs_access_token", expiredAccessToken);
    localStorage.setItem("floofs_refresh_token", existingRefreshToken);

    const renewedAccessToken = createJwt(Math.floor(Date.now() / 1000) + 3600);
    const renewedRefreshToken = createJwt(Math.floor(Date.now() / 1000) + 7200);

    refreshMock.mockResolvedValue({
      accessToken: renewedAccessToken,
      refreshToken: renewedRefreshToken,
    });

    const { default: useAuthSession } = await import("./useAuthSession");

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(refreshMock).toHaveBeenCalledWith({
      refreshToken: existingRefreshToken,
    });
    expect(localStorage.getItem("floofs_access_token")).toBe(
      renewedAccessToken,
    );
    expect(localStorage.getItem("floofs_refresh_token")).toBe(
      renewedRefreshToken,
    );
  });

  it("keeps a valid session without refreshing immediately", async () => {
    const validAccessToken = createJwt(Math.floor(Date.now() / 1000) + 3600);
    const validRefreshToken = createJwt(Math.floor(Date.now() / 1000) + 7200);

    setAuthTokens(validAccessToken, validRefreshToken);
    refreshMock.mockResolvedValue({
      accessToken: validAccessToken,
      refreshToken: validRefreshToken,
    });

    const { default: useAuthSession } = await import("./useAuthSession");

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
