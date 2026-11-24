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
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "../utils/token-storage";
import SettingsPage from "./page";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  changeEmail: vi.fn(),
  changePhone: vi.fn(),
  deleteAccount: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock("../utils/auth-api", async (original) => ({
  ...(await original<typeof import("../utils/auth-api")>()),
  getCurrentUser: mocks.user,
  updateCurrentUser: mocks.updateUser,
  changePassword: mocks.changePassword,
  changeEmail: mocks.changeEmail,
  changePhoneNumber: mocks.changePhone,
  deleteCurrentAccount: mocks.deleteAccount,
}));
vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

function renderSettings() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth" element={<p>Login destination</p>} />
          <Route path="/" element={<p>Home destination</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function openSection(key: string) {
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: i18n.t("settings.title") }),
    ).getByRole("button", { name: new RegExp(`^${i18n.t(key)}`) }),
  );
}

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
  mocks.user.mockResolvedValue({
    id: "user-1",
    firstName: "Ada",
    lastName: "Example",
    email: "ada@example.test",
    role: "USER",
    phoneNumber: "",
    bio: "",
    location: "",
  });
  setAuthTokens("access", "refresh");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("account settings", () => {
  it("reports profile update failures and preserves the entered name", async () => {
    mocks.updateUser.mockRejectedValue(new Error("Update failed"));
    renderSettings();
    const firstName = await screen.findByDisplayValue("Ada");
    fireEvent.change(firstName, { target: { value: "Grace" } });
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.save") }),
    );
    await waitFor(() =>
      expect(mocks.showError).toHaveBeenCalledWith("Update failed"),
    );
    expect(screen.getByDisplayValue("Grace")).toBeTruthy();
  });

  it("blocks mismatched passwords without sending a request", async () => {
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.password");
    setValue("Current password", "OldPass1!");
    setValue("New password", "NewPass1!");
    setValue("Confirm new password", "Different1!");
    fireEvent.click(
      screen.getByRole("button", { name: "Change password" }),
    );
    expect(mocks.showError).toHaveBeenCalledWith(
      i18n.t("settings.passwordMismatch"),
    );
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("hashes both passwords and clears fields after a successful change", async () => {
    mocks.changePassword.mockResolvedValue({});
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.password");
    setValue("Current password", "OldPass1!");
    setValue("New password", "NewPass1!");
    setValue("Confirm new password", "NewPass1!");
    fireEvent.click(
      screen.getByRole("button", { name: "Change password" }),
    );
    await waitFor(() =>
      expect(mocks.showSuccess).toHaveBeenCalledWith(
        i18n.t("settings.passwordUpdated"),
      ),
    );
    expect(mocks.changePassword).toHaveBeenCalledWith({
      currentPasswordHash: sha256("OldPass1!"),
      newPasswordHash: sha256("NewPass1!"),
    });
    expect(
      (screen.getByLabelText("Current password") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("New password") as HTMLInputElement).value,
    ).toBe("");
  });

  it("changes email and ends the session only after success", async () => {
    mocks.changeEmail.mockResolvedValue({});
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.email");
    setValue("New email address", "new@example.test");
    setValue("Current password", "OldPass1!");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.updateEmail") }),
    );
    await screen.findByText("Login destination");
    expect(mocks.changeEmail).toHaveBeenCalledWith({
      email: "new@example.test",
      currentPasswordHash: sha256("OldPass1!"),
    });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("retains the session when changing email fails", async () => {
    mocks.changeEmail.mockRejectedValue(new Error("Wrong password"));
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.email");
    setValue("New email address", "new@example.test");
    setValue("Current password", "wrong");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.updateEmail") }),
    );
    await waitFor(() =>
      expect(mocks.showError).toHaveBeenCalledWith("Wrong password"),
    );
    expect(getAccessToken()).toBe("access");
    expect(screen.queryByText("Login destination")).toBeNull();
  });

  it("rejects an invalid phone number and allows clearing it", async () => {
    mocks.changePhone.mockResolvedValue({});
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.phone");
    const phoneLabel = i18n.t("auth.hungarianPhoneLabel", {
      label: i18n.t("settings.phoneNumber"),
    });
    setValue(phoneLabel, "123");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.savePhone") }),
    );
    expect(screen.getByText(i18n.t("auth.phoneInvalid"))).toBeTruthy();
    expect(mocks.changePhone).not.toHaveBeenCalled();
    setValue(phoneLabel, "");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.savePhone") }),
    );
    await waitFor(() => expect(mocks.changePhone).toHaveBeenCalledWith(""));
    expect(screen.queryByText(i18n.t("auth.phoneInvalid"))).toBeNull();
  });

  it("does not delete an account if the confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.delete");
    setValue("Current password", "OldPass1!");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.deleteButton") }),
    );
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access");
  });

  it("deletes the confirmed account using a hash and clears the session", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.deleteAccount.mockResolvedValue({});
    renderSettings();
    await screen.findByDisplayValue("Ada");
    openSection("settings.delete");
    setValue("Current password", "OldPass1!");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.deleteButton") }),
    );
    await screen.findByText("Home destination");
    expect(mocks.deleteAccount).toHaveBeenCalledWith(sha256("OldPass1!"));
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
