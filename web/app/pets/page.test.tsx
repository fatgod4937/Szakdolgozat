import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "../i18n";
import PetsCreatePage from "./page";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  species: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("../utils/image-compression", () => ({
  compressImage: async (file: File) => file,
}));

vi.mock("../utils/pets-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/pets-api")>();
  return {
    ...original,
    createPet: mocks.create,
    updatePet: mocks.update,
    listSpecies: mocks.species,
    getPet: async () => ({
      name: "Milo",
      species: "Dog",
      breedId: null,
      ageYears: 2,
      ageMonths: 0,
      gender: "MALE",
      size: "MEDIUM",
      location: "Budapest",
      description: "A friendly dog looking for a home.",
      adoptionStatus: "AVAILABLE",
      goodWithChildren: true,
      goodWithDogs: true,
      goodWithCats: false,
      vaccinated: true,
      neutered: false,
      houseTrained: true,
      photoUrls: ["/first.jpg", "/second.jpg"],
    }),
  };
});

vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

function renderForm(path = "/pets/new") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/pets/new" element={<PetsCreatePage />} />
          <Route path="/my-listings" element={<p>Listings destination</p>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function fillValidListing() {
  fireEvent.change(screen.getByLabelText(i18n.t("petForm.name")), {
    target: { value: "Milo" },
  });
  fireEvent.change(screen.getAllByPlaceholderText(i18n.t("pets.search"))[0], {
    target: { value: "Dog" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Dog" }));
  fireEvent.change(screen.getByLabelText(i18n.t("petForm.location")), {
    target: { value: "Budapest" },
  });
  fireEvent.change(screen.getByLabelText(i18n.t("petForm.descriptionLabel")), {
    target: { value: "Milo is a friendly dog who loves long walks." },
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
  vi.stubEnv("VITE_API_URL", "https://example.test/api");
  mocks.species.mockResolvedValue([
    { id: "dog", enName: "Dog", huName: "Kutya" },
  ]);
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:photo");
      static revokeObjectURL = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("listing photo previews", () => {
  it("opens existing and newly selected photos without interfering with removal", async () => {
    const NativeURL = URL;
    vi.stubGlobal(
      "URL",
      class extends NativeURL {
        static createObjectURL = vi.fn(() => "blob:selected-photo");
        static revokeObjectURL = vi.fn();
      },
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      <MemoryRouter initialEntries={["/pets/new?edit=pet-1"]}>
        <QueryClientProvider client={queryClient}>
          <PetsCreatePage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const firstPhoto = await screen.findByRole("button", {
      name: /full\s*screen.*uploaded pet photo 1/i,
    });
    fireEvent.click(firstPhoto);
    expect(
      screen.getByRole("dialog").querySelector("img")?.getAttribute("src"),
    ).toContain("/first.jpg");
    fireEvent.keyDown(window, { key: "Escape" });

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("Photo input not found");
    fireEvent.change(input, {
      target: {
        files: [new File(["image"], "photo.png", { type: "image/png" })],
      },
    });
    const selectedPhoto = await screen.findByRole("button", {
      name: /full\s*screen.*uploaded pet photo 3/i,
    });
    await waitFor(() =>
      expect(selectedPhoto.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(selectedPhoto);
    expect(
      screen.getByRole("dialog").querySelector("img")?.getAttribute("src"),
    ).toBe("blob:selected-photo");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /remove photo 3/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: /full\s*screen.*uploaded pet photo 3/i,
      }),
    ).toBeNull();
  });

  it("shows required fields and does not create an empty listing", async () => {
    renderForm();
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("petForm.submit") }),
    );
    await screen.findByText(i18n.t("petForm.nameRequired"));
    expect(screen.getByText(i18n.t("petForm.speciesRequired"))).toBeTruthy();
    expect(screen.getByText(i18n.t("petForm.locationRequired"))).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("requires two photos before creating a valid listing", async () => {
    renderForm();
    await fillValidListing();
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("petForm.submit") }),
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(i18n.t("petForm.photoMinimum", { count: 2 })),
      ).toHaveLength(2),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a listing with selected photos and chosen traits", async () => {
    mocks.create.mockResolvedValue({});
    const { container } = renderForm();
    await fillValidListing();
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("Photo input not found");
    const photos = [
      new File(["one"], "one.png", { type: "image/png" }),
      new File(["two"], "two.png", { type: "image/png" }),
    ];
    fireEvent.change(input, { target: { files: photos } });
    await screen.findByRole("button", { name: /remove photo 2/i });
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(i18n.t("pets.goodWithDogs")),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("petForm.submit") }),
    );
    await screen.findByText("Listings destination");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Milo",
        species: "Dog",
        location: "Budapest",
        goodWithDogs: true,
        photos,
      }),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates an existing listing without replacing its photos", async () => {
    mocks.update.mockResolvedValue({});
    renderForm("/pets/new?edit=pet-1");
    await screen.findByDisplayValue("Milo");
    fireEvent.change(screen.getByLabelText(i18n.t("petForm.name")), {
      target: { value: "Milo Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Listings destination");
    expect(mocks.update.mock.calls[0][0]).toBe("pet-1");
    expect(mocks.update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ name: "Milo Updated", photos: undefined }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
