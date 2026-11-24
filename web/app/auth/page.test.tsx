import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { sha256 } from "js-sha256";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n";
import { getAccessToken, getRefreshToken } from "../utils/token-storage";
import AuthPage from "./page";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getBackup: vi.fn(),
  saveBackup: vi.fn(),
  registerDevice: vi.fn(),
  createBackup: vi.fn(),
  createDevice: vi.fn(),
  publicDevice: vi.fn(),
  restoreDevice: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../utils/auth-api", async (original) => ({
  ...(await original<typeof import("../utils/auth-api")>()),
  login: mocks.login,
  register: mocks.register,
}));
vi.mock("../utils/chat-api", async (original) => ({
  ...(await original<typeof import("../utils/chat-api")>()),
  getChatKeyBackup: mocks.getBackup,
  saveChatKeyBackup: mocks.saveBackup,
  registerChatDevice: mocks.registerDevice,
}));
vi.mock("../utils/chat-crypto", async (original) => ({
  ...(await original<typeof import("../utils/chat-crypto")>()),
  getOrCreateChatDevice: mocks.createDevice,
  getPublicChatDevice: mocks.publicDevice,
  createChatKeyBackup: mocks.createBackup,
  restoreChatKeyBackup: mocks.restoreDevice,
}));
vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

function renderAuth(path = "/auth") {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pets" element={<p>Browse destination</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function submitLogin(email = "ada@example.test", password = "StrongPass1!") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  const form = screen.getByLabelText("Email").closest("form");
  if (!form) throw new Error("Login form not found");
  fireEvent.click(
    within(form).getByRole("button", { name: i18n.t("auth.login") }),
  );
}

function fillRegistration() {
  for (const [label, value] of Object.entries({
    "First name": "Ada",
    "Last name": "Example",
    Email: "ada@example.test",
    Password: "StrongPass1!",
    "Confirm password": "StrongPass1!",
  })) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  }
  fireEvent.click(screen.getByRole("checkbox"));
}

function submitRegistration() {
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("auth.completeRegistration") }),
  );
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
  mocks.createDevice.mockReturnValue({ id: "device-1", privateKey: "private" });
  mocks.publicDevice.mockReturnValue({ id: "device-1", publicKey: "public" });
  mocks.createBackup.mockReturnValue({ ciphertext: "encrypted" });
  mocks.saveBackup.mockResolvedValue({});
  mocks.registerDevice.mockResolvedValue({});
});
afterEach(cleanup);

describe("authentication page", () => {
  it("hashes the password, creates a chat backup, saves tokens and opens browsing", async () => {
    const token = `header.${btoa(JSON.stringify({ sub: "user-1" }))}.signature`;
    mocks.login.mockResolvedValue({
      accessToken: token,
      refreshToken: "refresh-token",
    });
    mocks.getBackup.mockResolvedValue({ backup: null });
    renderAuth();
    submitLogin();
    await screen.findByText("Browse destination");
    expect(mocks.login).toHaveBeenCalledWith({
      email: "ada@example.test",
      passwordHash: sha256("StrongPass1!"),
    });
    expect(getAccessToken()).toBe(token);
    expect(getRefreshToken()).toBe("refresh-token");
    expect(mocks.createDevice).toHaveBeenCalledWith("user-1");
    expect(mocks.createBackup).toHaveBeenCalledWith(
      { id: "device-1", privateKey: "private" },
      "StrongPass1!",
    );
    expect(mocks.saveBackup).toHaveBeenCalledWith({ ciphertext: "encrypted" });
    expect(mocks.registerDevice).toHaveBeenCalledWith({
      id: "device-1",
      publicKey: "public",
    });
  });

  it("restores an existing chat key rather than replacing its backup", async () => {
    const token = `header.${btoa(JSON.stringify({ sub: "user-1" }))}.signature`;
    const backup = { ciphertext: "existing" };
    const device = { id: "restored", privateKey: "private" };
    mocks.login.mockResolvedValue({
      accessToken: token,
      refreshToken: "refresh-token",
    });
    mocks.getBackup.mockResolvedValue({ backup });
    mocks.restoreDevice.mockReturnValue(device);
    renderAuth();
    submitLogin();
    await screen.findByText("Browse destination");
    expect(mocks.restoreDevice).toHaveBeenCalledWith(
      "user-1",
      "StrongPass1!",
      backup,
    );
    expect(mocks.publicDevice).toHaveBeenCalledWith(device);
    expect(mocks.createDevice).not.toHaveBeenCalled();
    expect(mocks.saveBackup).not.toHaveBeenCalled();
  });

  it("does not submit invalid login details", async () => {
    renderAuth();
    submitLogin("invalid", "123");
    await waitFor(() => expect(mocks.showError).toHaveBeenCalled());
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("opens registration directly from the URL and links to shelter registration", () => {
    renderAuth("/auth?mode=register");
    expect(screen.getByLabelText("First name")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: i18n.t("shelterRegistration.useForm") })
        .getAttribute("href"),
    ).toBe("/shelter-registration");
  });

  it("rejects weak passwords and missing terms during registration", async () => {
    renderAuth("/auth?mode=register");
    fillRegistration();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password" },
    });
    submitRegistration();
    await screen.findByText(i18n.t("auth.passwordNotStrong"));
    expect(screen.getByText(i18n.t("auth.termsRequired"))).toBeTruthy();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation during registration", async () => {
    renderAuth("/auth?mode=register");
    fillRegistration();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Different1!" },
    });
    submitRegistration();
    await screen.findByText(i18n.t("auth.passwordsDoNotMatch"));
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("registers an adopter with a hashed password and returns to login", async () => {
    mocks.register.mockResolvedValue({ message: "Created" });
    renderAuth("/auth?mode=register");
    fillRegistration();
    submitRegistration();
    await screen.findByPlaceholderText("name@example.com");
    expect(mocks.register).toHaveBeenCalledWith({
      email: "ada@example.test",
      firstName: "Ada",
      lastName: "Example",
      phoneNumber: "",
      passwordHash: sha256("StrongPass1!"),
      acceptDataSafety: true,
    });
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      i18n.t("auth.registrationSuccess"),
    );
  });
});
