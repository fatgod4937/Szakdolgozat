import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "js-sha256";
import i18n from "./i18n";
import ForgotPasswordPage from "./forgot-password/page";
import ResetPasswordPage from "./reset-password/page";
import VerifyEmailPage from "./verify-email/page";
import EmailVerificationPendingPage from "./email-verification-pending/page";
import AccountDeactivatedPage from "./account-deactivated/page";
import NotFoundPage from "./not-found/page";
import { getAccessToken, getRefreshToken } from "./utils/token-storage";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  getJson: vi.fn(),
}));

vi.mock("./utils/auth-api", () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  resetPassword: mocks.resetPassword,
  verifyEmail: mocks.verifyEmail,
}));
vi.mock("./utils/api", () => ({ getJson: mocks.getJson }));

function renderPage(path: string, element: React.ReactNode, state?: object) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: path.split("?")[0],
            search: path.includes("?") ? `?${path.split("?")[1]}` : "",
            state,
          },
        ]}
      >
        <Routes>
          <Route path="/onboarding" element={<p>Onboarding destination</p>} />
          <Route path="*" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
});
afterEach(cleanup);

describe("account pages", () => {
  it("requests a password reset for a valid email", async () => {
    mocks.requestPasswordReset.mockResolvedValue({});
    renderPage("/forgot-password", <ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await screen.findByText(/a reset link has been sent/i);
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("ada@example.test");
  });

  it("displays reset request failures", async () => {
    mocks.requestPasswordReset.mockRejectedValue(new Error("network error"));
    renderPage("/forgot-password", <ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await screen.findByText(/could not request a password reset/i);
  });

  it("rejects a missing reset token and mismatched passwords", async () => {
    const first = renderPage("/reset-password", <ResetPasswordPage />);
    expect(screen.getByText(/reset link is missing or invalid/i)).toBeTruthy();
    first.unmount();
    renderPage("/reset-password?token=reset-token", <ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("sends the reset token and a password hash", async () => {
    mocks.resetPassword.mockResolvedValue({});
    renderPage("/reset-password?token=reset-token", <ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    await screen.findByText(/your password has been reset/i);
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      token: "reset-token",
      passwordHash: sha256("secret123"),
    });
  });

  it("verifies the email, saves tokens, and navigates to onboarding", async () => {
    mocks.verifyEmail.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
    });
    renderPage("/verify-email?token=verification-token", <VerifyEmailPage />);
    await screen.findByText("Onboarding destination");
    expect(mocks.verifyEmail).toHaveBeenCalledWith("verification-token");
    expect(getAccessToken()).toBe("access");
    expect(getRefreshToken()).toBe("refresh");
  });

  it("shows a missing-token error without calling verification", async () => {
    renderPage("/verify-email", <VerifyEmailPage />);
    await screen.findByText(i18n.t("verify.missing"));
    expect(mocks.verifyEmail).not.toHaveBeenCalled();
  });

  it("shows the email waiting for verification and a sign-in link", () => {
    renderPage(
      "/email-verification-pending",
      <EmailVerificationPendingPage />,
      { email: "ada@example.test" },
    );
    expect(screen.getByText(/ada@example.test/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: i18n.t("verificationPending.backToLogin") })
        .getAttribute("href"),
    ).toBe("/auth");
  });

  it("fetches and displays the account deactivation reason", async () => {
    mocks.getJson.mockResolvedValue({
      deactivated: true,
      reason: "Review required",
    });
    renderPage(
      "/account-deactivated?email=ada%40example.test",
      <AccountDeactivatedPage />,
    );
    await screen.findByText(/Review required/);
    expect(mocks.getJson).toHaveBeenCalledWith(
      "/auth/deactivation-status?email=ada%40example.test",
      false,
    );
  });

  it("offers a route home on the not-found page", () => {
    renderPage("/unknown", <NotFoundPage />);
    expect(screen.getByText("404")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: i18n.t("notFound.home") })
        .getAttribute("href"),
    ).toBe("/");
  });
});
