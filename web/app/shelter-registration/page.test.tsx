import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { sha256 } from "js-sha256";
import i18n from "../i18n";
import ShelterRegistrationPage from "./page";

const mocks = vi.hoisted(() => ({
  registerShelter: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../utils/shelter-api", async (original) => ({
  ...(await original<typeof import("../utils/shelter-api")>()),
  registerShelter: mocks.registerShelter,
}));
vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

function VerificationDestination() {
  const { state } = useLocation();
  return <p>Verify {state?.email}</p>;
}

function renderRegistration() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/shelter-registration"]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route
            path="/shelter-registration"
            element={<ShelterRegistrationPage />}
          />
          <Route
            path="/email-verification-pending"
            element={<VerificationDestination />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  const values = {
    "Shelter name": "Happy Paws",
    Description: "Animal shelter",
    City: "Budapest",
    "Shelter contact email": "contact@example.test",
    "Last name": "Example",
    "First name": "Ada",
    Email: "ada@example.test",
    Password: "StrongPass1!",
    "Confirm password": "StrongPass1!",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  }
  fireEvent.click(screen.getByRole("checkbox"));
}

function chooseDocuments(files: File[]) {
  fireEvent.change(screen.getByLabelText("Browse documents"), {
    target: { files },
  });
}

function submit() {
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("shelterRegistration.submit") }),
  );
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
});
afterEach(() => {
  cleanup();
  void i18n.changeLanguage("en");
});

describe("shelter registration", () => {
  it("translates the form and keeps document browsing and validation usable", async () => {
    await i18n.changeLanguage("en");
    renderRegistration();

    expect(
      screen.getByRole("heading", { name: "Register your shelter" }),
    ).toBeTruthy();
    await act(() => i18n.changeLanguage("hu"));

    expect(
      screen.getByRole("heading", { name: "Regisztráld a menhelyedet" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Menhely neve")).toBeTruthy();
    expect(
      screen.getByLabelText("Telefonszám, magyar országkód +36"),
    ).toBeTruthy();
    const fileInput = screen.getByLabelText("Dokumentumok tallózása");
    expect(fileInput.closest("label")?.textContent).toContain(
      "Dokumentumok tallózása",
    );

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["bad"], "invalid.txt", { type: "text/plain" })],
      },
    });
    expect(screen.getByText(/A dokumentumok PDF-/)).toBeTruthy();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByText(/Documents must be PDF/)).toBeTruthy();
    await act(() => i18n.changeLanguage("hu"));

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["test"], "proof.pdf", { type: "application/pdf" })],
      },
    });
    await waitFor(() => expect(screen.getByText("proof.pdf")).toBeTruthy());
    expect(screen.queryByText(/A dokumentumok PDF-/)).toBeNull();
  });

  it("requires the account and shelter details before submission", async () => {
    renderRegistration();
    submit();
    await screen.findByText(i18n.t("shelterRegistration.nameRequired"));
    expect(screen.getByText(i18n.t("auth.firstNameRequired"))).toBeTruthy();
    expect(screen.getByText(i18n.t("auth.termsRequired"))).toBeTruthy();
    expect(mocks.registerShelter).not.toHaveBeenCalled();
  });

  it("requires at least one document even when all other fields are valid", async () => {
    renderRegistration();
    fillValidForm();
    submit();
    await screen.findByText(i18n.t("shelterRegistration.documentCount"));
    expect(mocks.registerShelter).not.toHaveBeenCalled();
  });

  it("rejects more than five documents and clears the previous selection", () => {
    renderRegistration();
    chooseDocuments([
      new File(["ok"], "proof.pdf", { type: "application/pdf" }),
    ]);
    expect(screen.getByText("proof.pdf")).toBeTruthy();
    chooseDocuments(
      Array.from(
        { length: 6 },
        (_, index) =>
          new File(["ok"], `${index}.pdf`, { type: "application/pdf" }),
      ),
    );
    expect(
      screen.getByText(i18n.t("shelterRegistration.documentLimit")),
    ).toBeTruthy();
    expect(screen.queryByText("proof.pdf")).toBeNull();
    expect(mocks.registerShelter).not.toHaveBeenCalled();
  });

  it("rejects documents larger than 10 MB", () => {
    renderRegistration();
    chooseDocuments([
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ]);
    expect(
      screen.getByText(i18n.t("shelterRegistration.documentInvalid")),
    ).toBeTruthy();
    expect(screen.queryByText("large.pdf")).toBeNull();
  });

  it("rejects insecure shelter websites and mismatched passwords", async () => {
    renderRegistration();
    fillValidForm();
    chooseDocuments([
      new File(["ok"], "proof.pdf", { type: "application/pdf" }),
    ]);
    fireEvent.change(
      screen.getByLabelText(i18n.t("shelterRegistration.website")),
      { target: { value: "http://example.test" } },
    );
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "OtherPass1!" },
    });
    submit();
    await screen.findByText(i18n.t("shelterRegistration.websiteInvalid"));
    expect(screen.getByText(i18n.t("auth.passwordsDoNotMatch"))).toBeTruthy();
    expect(mocks.registerShelter).not.toHaveBeenCalled();
  });

  it("submits a hashed password and documents, then opens email verification", async () => {
    mocks.registerShelter.mockResolvedValue({ message: "Created" });
    renderRegistration();
    fillValidForm();
    const file = new File(["ok"], "proof.pdf", { type: "application/pdf" });
    chooseDocuments([file]);
    submit();
    await screen.findByText("Verify ada@example.test");
    expect(mocks.registerShelter).toHaveBeenCalledWith(
      {
        email: "ada@example.test",
        passwordHash: sha256("StrongPass1!"),
        firstName: "Ada",
        lastName: "Example",
        phoneNumber: "",
        acceptDataSafety: true,
      },
      {
        name: "Happy Paws",
        description: "Animal shelter",
        city: "Budapest",
        contactEmail: "contact@example.test",
        websiteUrl: "",
      },
      [file],
    );
    expect(mocks.showSuccess).toHaveBeenCalled();
  });

  it("shows a registration failure without navigating away", async () => {
    mocks.registerShelter.mockRejectedValue(new Error("Registration failed"));
    renderRegistration();
    fillValidForm();
    chooseDocuments([
      new File(["ok"], "proof.pdf", { type: "application/pdf" }),
    ]);
    submit();
    await screen.findByText("Registration failed");
    expect(mocks.showError).toHaveBeenCalledWith("Registration failed");
    expect(screen.queryByText("Verify ada@example.test")).toBeNull();
  });
});
