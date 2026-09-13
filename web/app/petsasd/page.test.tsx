import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PetCard } from "./page";

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

describe("PetCard", () => {
  it("renders the favorite control directly on the listing without a details modal", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <PetCard pet={petFixture} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /favorite/i })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
