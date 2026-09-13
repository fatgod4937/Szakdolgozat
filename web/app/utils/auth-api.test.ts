import { beforeEach, describe, expect, it, vi } from "vitest";

const postJsonMock = vi.hoisted(() => vi.fn());

vi.mock("./api", () => ({
  postJson: postJsonMock,
}));

describe("auth-api refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    postJsonMock.mockReset();
  });

  it("deduplicates concurrent refresh calls", async () => {
    postJsonMock.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const { refresh } = await import("./auth-api");

    const [first, second] = await Promise.all([
      refresh({ refreshToken: "refresh-token" }),
      refresh({ refreshToken: "refresh-token" }),
    ]);

    expect(postJsonMock).toHaveBeenCalledTimes(1);
    expect(postJsonMock).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "refresh-token",
    });
    expect(first).toEqual(second);
  });
});
