import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShelterApplicationPage from "./page";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  application: vi.fn(),
  submit: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock("../utils/auth-api", async (original) => ({
  ...(await original<typeof import("../utils/auth-api")>()),
  getCurrentUser: mocks.user,
}));
vi.mock("../utils/shelter-api", async (original) => ({
  ...(await original<typeof import("../utils/shelter-api")>()),
  getMyShelterApplication: mocks.application,
  submitShelterApplication: mocks.submit,
}));
vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/shelter-application"]}>
        <Routes>
          <Route
            path="/shelter-application"
            element={<ShelterApplicationPage />}
          />
          <Route path="/pets" element={<p>Browse destination</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "shelter-user", role: "SHELTER" });
  mocks.application.mockResolvedValue(null);
});
afterEach(cleanup);

describe("shelter application", () => {
  it("redirects users who do not have a shelter account", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", role: "USER" });
    renderPage();
    await screen.findByText("Browse destination");
    expect(mocks.application).not.toHaveBeenCalled();
  });

  it.each([
    ["PENDING", "Application under review"],
    ["APPROVED", "Shelter application approved"],
  ])("shows %s status and prevents resubmission", async (status, heading) => {
    mocks.application.mockResolvedValue({
      name: "Happy Paws",
      applicationStatus: status,
    });
    renderPage();
    await screen.findByRole("heading", { name: heading });
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).toBeNull();
  });

  it("shows a declined review reason and pre-fills the resubmission form", async () => {
    mocks.application.mockResolvedValue({
      name: "Happy Paws",
      description: "Shelter details",
      city: "Budapest",
      contactEmail: "contact@example.test",
      websiteUrl: "https://example.test",
      applicationStatus: "DECLINED",
      reviewNote: "Please add proof",
    });
    renderPage();
    await screen.findByText("Please add proof");
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Shelter name") as HTMLInputElement).value,
      ).toBe("Happy Paws"),
    );
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeTruthy();
  });

  it("rejects invalid files and does not submit without documents", async () => {
    renderPage();
    const input = await screen.findByLabelText(/Verification documents/);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "bad.txt", { type: "text/plain" })] },
    });
    expect(mocks.showError).toHaveBeenCalledWith(
      expect.stringContaining("Documents must be"),
    );
    const form = input.closest("form");
    if (!form) throw new Error("Application form not found");
    fireEvent.submit(form);
    expect(mocks.showError).toHaveBeenCalledWith(
      "Upload between 1 and 5 documents.",
    );
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("submits shelter details and documents, then clears the selected files", async () => {
    mocks.submit.mockResolvedValue({});
    renderPage();
    const input = await screen.findByLabelText(/Verification documents/);
    const file = new File(["proof"], "proof.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Shelter name"), {
      target: { value: "Happy Paws" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Animal shelter" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Budapest" },
    });
    fireEvent.change(screen.getByLabelText("Contact email"), {
      target: { value: "contact@example.test" },
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("proof.pdf")).toBeTruthy();
    const form = input.closest("form");
    if (!form) throw new Error("Application form not found");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(mocks.showSuccess).toHaveBeenCalledWith(
        "Your shelter application has been submitted for review.",
      ),
    );
    expect(mocks.submit).toHaveBeenCalledWith(
      {
        name: "Happy Paws",
        description: "Animal shelter",
        city: "Budapest",
        contactEmail: "contact@example.test",
        websiteUrl: "",
      },
      [file],
    );
    expect(screen.queryByText("proof.pdf")).toBeNull();
  });

  it("reports submission errors and preserves selected documents", async () => {
    mocks.submit.mockRejectedValue(new Error("Upload failed"));
    renderPage();
    const input = await screen.findByLabelText(/Verification documents/);
    fireEvent.change(input, {
      target: {
        files: [new File(["proof"], "proof.pdf", { type: "application/pdf" })],
      },
    });
    const form = input.closest("form");
    if (!form) throw new Error("Application form not found");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(mocks.showError).toHaveBeenCalledWith("Upload failed"),
    );
    expect(screen.getByText("proof.pdf")).toBeTruthy();
  });
});
