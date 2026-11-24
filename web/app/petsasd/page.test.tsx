import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";
import type { PetRecord } from "../utils/pets-api";
import { PetCard } from "./page";

const mocks = vi.hoisted(() => ({
  listFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  userId: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock("../utils/pets-api", async (original) => ({
  ...(await original<typeof import("../utils/pets-api")>()),
  listFavoritePets: mocks.listFavorites,
  addFavoritePet: mocks.addFavorite,
  removeFavoritePet: mocks.removeFavorite,
}));
vi.mock("../utils/token-storage", async (original) => ({
  ...(await original<typeof import("../utils/token-storage")>()),
  getCurrentUserId: mocks.userId,
}));
vi.mock("../utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

const petFixture = {
  id: "pet-1",
  name: "Milo",
  species: "Dog",
  breed: "Labrador",
  ageYears: 3,
  ageMonths: 2,
  gender: "MALE" as const,
  size: "MEDIUM" as const,
  location: "Budapest",
  description: "Milo is a cheerful and gentle dog who loves long walks.",
  goodWithChildren: true,
  goodWithDogs: true,
  goodWithCats: false,
  vaccinated: true,
  neutered: true,
  houseTrained: true,
  adoptionStatus: "AVAILABLE" as const,
  photoUrls: ["/pets/milo.jpg"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function renderCard(pet: PetRecord = petFixture) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <PetCard pet={pet} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
  mocks.listFavorites.mockResolvedValue([]);
  mocks.userId.mockReturnValue("user-1");
});
afterEach(cleanup);

describe("PetCard", () => {
  it("renders the favorite control directly on the listing without a details modal", () => {
    renderCard();

    expect(screen.getByRole("button", { name: /favorite/i })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("adds a favorite and refreshes the control", async () => {
    let favorites: (typeof petFixture)[] = [];
    mocks.listFavorites.mockImplementation(async () => favorites);
    mocks.addFavorite.mockImplementation(async () => {
      favorites = [petFixture];
    });
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: i18n.t("pets.favorite") }),
    );
    await screen.findByRole("button", { name: i18n.t("pets.removeFavorite") });
    expect(mocks.addFavorite).toHaveBeenCalledWith("pet-1");
    expect(mocks.removeFavorite).not.toHaveBeenCalled();
  });

  it("removes a favorite and refreshes the control", async () => {
    let favorites = [petFixture];
    mocks.listFavorites.mockImplementation(async () => favorites);
    mocks.removeFavorite.mockImplementation(async () => {
      favorites = [];
    });
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", {
        name: i18n.t("pets.removeFavorite"),
      }),
    );
    await screen.findByRole("button", { name: i18n.t("pets.favorite") });
    expect(mocks.removeFavorite).toHaveBeenCalledWith("pet-1");
  });

  it("shows favorite failures without marking the pet as saved", async () => {
    mocks.addFavorite.mockRejectedValue(new Error("Cannot save favorite"));
    renderCard();
    fireEvent.click(
      await screen.findByRole("button", { name: i18n.t("pets.favorite") }),
    );
    await waitFor(() =>
      expect(mocks.showError).toHaveBeenCalledWith("Cannot save favorite"),
    );
    expect(
      screen.queryByRole("button", { name: i18n.t("pets.removeFavorite") }),
    ).toBeNull();
  });

  it("opens the selected picture in fullscreen and closes with Escape", async () => {
    renderCard({ ...petFixture, photoUrls: ["/first.jpg", "/second.jpg"] });
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("pets.showPhoto", { index: 2, name: "Milo" }),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("pets.fullscreen") }),
    );
    expect(
      screen.getByRole("dialog").querySelector("img")?.getAttribute("src"),
    ).toContain("/second.jpg");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers a chat link for another user's listing but not for one's own", () => {
    const owner = {
      id: "owner-1",
      email: "owner@example.test",
      firstName: "Ada",
      lastName: "Example",
      role: "USER" as const,
    };
    const first = renderCard({ ...petFixture, owner });
    expect(
      screen
        .getByRole("link", { name: i18n.t("pets.messageOwner") })
        .getAttribute("href"),
    ).toBe("/chat/pet-1");
    first.unmount();
    mocks.userId.mockReturnValue("owner-1");
    renderCard({ ...petFixture, owner });
    expect(
      screen.queryByRole("link", { name: i18n.t("pets.messageOwner") }),
    ).toBeNull();
  });
});
