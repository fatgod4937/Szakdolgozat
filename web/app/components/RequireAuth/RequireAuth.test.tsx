import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import RequireAuth from "./RequireAuth";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  getUser: vi.fn(),
  showError: vi.fn(),
}));
vi.mock("../../hooks/useAuthSession", () => ({ default: mocks.session }));
vi.mock("../../utils/auth-api", async (original) => ({
  ...(await original<typeof import("../../utils/auth-api")>()),
  getCurrentUser: mocks.getUser,
}));
vi.mock("../../utils/notification", () => ({ showError: mocks.showError }));

function renderProtected(allowUnverified = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth allowUnverified={allowUnverified}>
                <p>Protected content</p>
              </RequireAuth>
            }
          />
          <Route path="/auth" element={<p>Login page</p>} />
          <Route path="/onboarding" element={<p>Onboarding page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("protected routes", () => {
  it("does not display content or request user details while session is loading", () => {
    mocks.session.mockReturnValue({ status: "loading" });
    renderProtected();
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated visitors to login", async () => {
    mocks.session.mockReturnValue({ status: "unauthenticated" });
    renderProtected();
    await screen.findByText("Login page");
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(mocks.showError).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("redirects users who have not completed identity verification", async () => {
    mocks.session.mockReturnValue({ status: "authenticated" });
    mocks.getUser.mockResolvedValue({
      role: "USER",
      identityVerificationStatus: "IN_REVIEW",
    });
    renderProtected();
    await screen.findByText("Onboarding page");
    expect(screen.queryByText("Protected content")).toBeNull();
  });

  it("allows verified users to access protected content", async () => {
    mocks.session.mockReturnValue({ status: "authenticated" });
    mocks.getUser.mockResolvedValue({
      role: "USER",
      identityVerificationStatus: "APPROVED",
    });
    renderProtected();
    await screen.findByText("Protected content");
  });

  it("allows administrators without requiring identity verification", async () => {
    mocks.session.mockReturnValue({ status: "authenticated" });
    mocks.getUser.mockResolvedValue({
      role: "ADMIN",
      identityVerificationStatus: "NOT_STARTED",
    });
    renderProtected();
    await screen.findByText("Protected content");
  });

  it("allows unverified users on onboarding routes without fetching their profile", () => {
    mocks.session.mockReturnValue({ status: "authenticated" });
    renderProtected(true);
    expect(screen.getByText("Protected content")).toBeTruthy();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("does not expose content if loading the current user fails", async () => {
    mocks.session.mockReturnValue({ status: "authenticated" });
    mocks.getUser.mockRejectedValue(new Error("Service unavailable"));
    renderProtected();
    await vi.waitFor(() => expect(mocks.getUser).toHaveBeenCalled());
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(screen.queryByText("Login page")).toBeNull();
  });
});
