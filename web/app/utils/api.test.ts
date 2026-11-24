import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n";
import { postFormData, postJson } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  void i18n.changeLanguage("en");
});

describe("API language", () => {
  it("sends the selected app language for JSON and multipart requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "{}",
    });
    vi.stubGlobal("fetch", fetchMock);

    await i18n.changeLanguage("hu");
    await postJson("/auth/register", {});
    await i18n.changeLanguage("en");
    await postFormData("/shelter-registrations", new FormData(), false);

    expect(fetchMock.mock.calls[0][1].headers["Accept-Language"]).toBe("hu");
    expect(fetchMock.mock.calls[1][1].headers["Accept-Language"]).toBe("en");
    expect(fetchMock.mock.calls[1][1].headers["Content-Type"]).toBeUndefined();
  });
});
