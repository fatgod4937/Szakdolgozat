import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../i18n";
import HeroSection from "./HeroSection";

afterEach(() => {
  cleanup();
  void i18n.changeLanguage("en");
});

describe("HeroSection", () => {
  it("updates the hero text and registration link when the language changes", async () => {
    await i18n.changeLanguage("en");
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(screen.getByText("Adopt a life")).toBeTruthy();
    expect(screen.getByText(/Give a loving home to a pet in need/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get started" }).getAttribute("href"))
      .toBe("/auth?mode=register");

    await act(() => i18n.changeLanguage("hu"));

    expect(screen.getByText("Fogadj örökbe egy életet")).toBeTruthy();
    expect(screen.getByText(/Adj egy szerető otthont egy rászoruló kisállatnak/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kezdjük" }).getAttribute("href"))
      .toBe("/auth?mode=register");
  });
});
