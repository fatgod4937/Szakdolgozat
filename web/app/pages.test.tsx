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
import i18n from "./i18n";
import Home from "./page";
import DownloadPage from "./download/page";
import DataSafetyPage from "./data-safety/page";
import AuthPage from "./auth/page";
import AdminPage from "./admin/page";
import FavoritesPage from "./favorites/page";
import PetsBrowsePage from "./petsasd/page";
import MyListingsPage from "./my-listings/page";
import ChatsPage from "./chats/page";
import PetChatPage from "./chat/page";
import OnboardingPage from "./onboarding/page";
import ProfilePage from "./profile/page";
import SettingsPage from "./settings/page";
import ShelterApplicationPage from "./shelter-application/page";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  updateUser: vi.fn(),
  login: vi.fn(),
  landing: vi.fn(),
  favorites: vi.fn(),
  listPets: vi.fn(),
  listings: vi.fn(),
  deletePet: vi.fn(),
  shelterApplication: vi.fn(),
  submitApplication: vi.fn(),
  profile: vi.fn(),
  comments: vi.fn(),
  createComment: vi.fn(),
  threads: vi.fn(),
  conversation: vi.fn(),
  authSession: vi.fn(),
  adminShelters: vi.fn(),
  adminPets: vi.fn(),
  adminUsers: vi.fn(),
  adminDisputes: vi.fn(),
  reviewShelter: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("./utils/auth-api", async (original) => ({
  ...(await original<typeof import("./utils/auth-api")>()),
  getCurrentUser: mocks.user,
  updateCurrentUser: mocks.updateUser,
  login: mocks.login,
}));
vi.mock("./utils/pets-api", async (original) => ({
  ...(await original<typeof import("./utils/pets-api")>()),
  listLandingPets: mocks.landing,
  listFavoritePets: mocks.favorites,
  listPets: mocks.listPets,
  listMyPets: mocks.listings,
  deletePet: mocks.deletePet,
}));
vi.mock("./utils/shelter-api", async (original) => ({
  ...(await original<typeof import("./utils/shelter-api")>()),
  getMyShelterApplication: mocks.shelterApplication,
  submitShelterApplication: mocks.submitApplication,
}));
vi.mock("./utils/profiles-api", async (original) => ({
  ...(await original<typeof import("./utils/profiles-api")>()),
  getUserProfile: mocks.profile,
  getShelterProfile: mocks.profile,
  listProfileComments: mocks.comments,
  createProfileComment: mocks.createComment,
  listDisputedProfileComments: mocks.adminDisputes,
}));
vi.mock("./utils/admin-api", async (original) => ({
  ...(await original<typeof import("./utils/admin-api")>()),
  listAdminShelters: mocks.adminShelters,
  listAdminPets: mocks.adminPets,
  listAdminUsers: mocks.adminUsers,
  reviewShelterApplication: mocks.reviewShelter,
}));
vi.mock("./utils/chat-api", async (original) => ({
  ...(await original<typeof import("./utils/chat-api")>()),
  listChatThreads: mocks.threads,
  getPetConversation: mocks.conversation,
  getThreadConversation: mocks.conversation,
}));
vi.mock("./hooks/useAuthSession", () => ({ default: mocks.authSession }));
vi.mock("./utils/notification", () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
  subscribeNotifications: vi.fn(() => () => {}),
}));

function renderPage(path: string, route: string, element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/pets" element={<p>Pets destination</p>} />
          <Route path="/auth" element={<p>Auth destination</p>} />
          <Route
            path="/shelter-application"
            element={<p>Shelter destination</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("VITE_API_URL", "https://example.test/api");
  await i18n.changeLanguage("en");
  mocks.user.mockResolvedValue({
    id: "user-1",
    firstName: "Ada",
    lastName: "Example",
    email: "ada@example.test",
    role: "USER",
    identityVerificationStatus: "NOT_STARTED",
  });
  mocks.authSession.mockReturnValue({
    isLoading: false,
    isAuthenticated: true,
    status: "authenticated",
  });
  mocks.landing.mockResolvedValue([]);
  mocks.favorites.mockResolvedValue([]);
  mocks.listPets.mockResolvedValue({ items: [], total: 0, totalPages: 1 });
  mocks.listings.mockResolvedValue([]);
  mocks.comments.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("page behavior", () => {
  it("shows featured pets and expands a question on the home page", async () => {
    mocks.landing.mockResolvedValue([
      {
        id: "pet-1",
        name: "Milo",
        location: "Budapest",
        photoUrls: ["/milo.jpg"],
      },
    ]);
    renderPage("/", "/", <Home />);
    expect(await screen.findByRole("img", { name: "Milo" })).toBeTruthy();
    const answer = screen.getByText(i18n.t("actions.adoptAnswer"));
    expect(answer.parentElement?.classList.contains("invisible")).toBe(true);
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          i18n.t("actions.adopt").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      }),
    );
    expect(answer.parentElement?.classList.contains("invisible")).toBe(false);
    expect(answer.parentElement?.classList.contains("visible")).toBe(true);
  });

  it("provides Android and iOS installation instructions", () => {
    renderPage("/download", "/download", <DownloadPage />);
    expect(screen.getByText(i18n.t("download.androidStep1"))).toBeTruthy();
    expect(screen.getByText(i18n.t("download.iosStep1"))).toBeTruthy();
  });

  it("shows all privacy information sections", () => {
    renderPage("/data-safety", "/data-safety", <DataSafetyPage />);
    for (const section of ["account", "data", "security", "choices"]) {
      expect(
        screen.getByText(i18n.t(`dataSafety.${section}.body`)),
      ).toBeTruthy();
    }
  });

  it("switches from login to registration on the auth page", () => {
    renderPage("/auth", "/auth", <AuthPage />);
    expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("auth.register") }),
    );
    expect(screen.getByLabelText(i18n.t("auth.firstName"))).toBeTruthy();
  });

  it("redirects non-administrators away from administration", async () => {
    renderPage("/admin", "/admin", <AdminPage />);
    await screen.findByText("Pets destination");
  });

  it("allows an administrator to approve a shelter", async () => {
    mocks.user.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.adminShelters.mockResolvedValue([
      { id: "shelter-1", name: "Shelter", applicationStatus: "PENDING" },
    ]);
    mocks.adminPets.mockResolvedValue({ items: [], total: 0 });
    mocks.adminUsers.mockResolvedValue([]);
    mocks.adminDisputes.mockResolvedValue([]);
    mocks.reviewShelter.mockResolvedValue({});
    renderPage("/admin", "/admin", <AdminPage />);
    await screen.findByText("Shelter");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(mocks.reviewShelter).toHaveBeenCalledWith(
        "shelter-1",
        "APPROVED",
        undefined,
      ),
    );
  });

  it("shows the empty favorites state", async () => {
    renderPage("/favorites", "/favorites", <FavoritesPage />);
    await screen.findByText(i18n.t("pets.favoritesEmpty"));
    expect(mocks.favorites).toHaveBeenCalled();
  });

  it("applies the species filter on the browse page", async () => {
    renderPage("/pets", "/pets", <PetsBrowsePage />);
    await waitFor(() => expect(mocks.listPets).toHaveBeenCalled());
    const option = screen.getByRole("option", {
      name: i18n.t("pets.allSpecies"),
    });
    const select = option.closest("select");
    if (!select) throw new Error("Species filter not found");
    fireEvent.change(select, { target: { value: "Dog" } });
    await waitFor(() =>
      expect(mocks.listPets).toHaveBeenCalledWith(
        1,
        10,
        expect.objectContaining({ species: "Dog" }),
      ),
    );
  });

  it("removes a confirmed listing and refreshes the list", async () => {
    mocks.listings
      .mockResolvedValueOnce([
        {
          id: "pet-1",
          name: "Milo",
          species: "Dog",
          location: "Budapest",
          adoptionStatus: "AVAILABLE",
          photoUrls: [],
        },
      ])
      .mockResolvedValue([]);
    mocks.deletePet.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage("/my-listings", "/my-listings", <MyListingsPage />);
    await screen.findByText("Milo");
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("admin.remove") }),
    );
    await screen.findByText(i18n.t("listings.empty"));
    expect(mocks.deletePet.mock.calls[0][0]).toBe("pet-1");
  });

  it("shows an empty chat inbox and a link to browse", async () => {
    mocks.threads.mockResolvedValue({ threads: [] });
    renderPage("/chats", "/chats", <ChatsPage />);
    await screen.findByText(i18n.t("chats.empty"));
    expect(
      screen
        .getByRole("link", { name: i18n.t("chats.browsePets") })
        .getAttribute("href"),
    ).toBe("/pets");
  });

  it("shows a conversation loading failure", async () => {
    mocks.conversation.mockRejectedValue(new Error("Conversation unavailable"));
    renderPage("/chat/pet-1", "/chat/:petId", <PetChatPage />);
    await screen.findByText("Conversation unavailable");
    expect(mocks.conversation).toHaveBeenCalledWith("pet-1");
  });

  it("redirects an approved adopter from onboarding to pets", async () => {
    mocks.user.mockResolvedValue({
      id: "user-1",
      firstName: "Ada",
      lastName: "Example",
      email: "ada@example.test",
      role: "USER",
      identityVerificationStatus: "APPROVED",
    });
    renderPage("/onboarding", "/onboarding", <OnboardingPage />);
    await screen.findByText("Pets destination");
  });

  it("updates the account profile from settings", async () => {
    mocks.updateUser.mockResolvedValue({});
    renderPage("/settings", "/settings", <SettingsPage />);
    const firstName = await screen.findByLabelText(
      i18n.t("settings.firstName"),
    );
    await waitFor(() =>
      expect((firstName as HTMLInputElement).value).toBe("Ada"),
    );
    fireEvent.change(firstName, { target: { value: "Grace" } });
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("settings.save") }),
    );
    await waitFor(() =>
      expect(mocks.updateUser.mock.calls[0][0]).toEqual(
        expect.objectContaining({ firstName: "Grace", lastName: "Example" }),
      ),
    );
  });

  it("posts a comment on a user profile", async () => {
    mocks.profile.mockResolvedValue({
      id: "user-2",
      firstName: "Grace",
      lastName: "Example",
      email: "grace@example.test",
      currentListings: [],
      previousPets: [],
    });
    mocks.createComment.mockResolvedValue({});
    renderPage("/profiles/user/user-2", "/profiles/:type/:id", <ProfilePage />);
    await screen.findByRole("heading", { name: "Grace Example" });
    fireEvent.change(
      screen.getByPlaceholderText(i18n.t("profilePage.writeComment")),
      { target: { value: "Hello!" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("profilePage.postComment") }),
    );
    await waitFor(() =>
      expect(mocks.createComment).toHaveBeenCalledWith(
        "USER",
        "user-2",
        "Hello!",
        undefined,
      ),
    );
  });

  it("displays the review state of a pending shelter application", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", role: "SHELTER" });
    mocks.shelterApplication.mockResolvedValue({
      name: "Shelter",
      applicationStatus: "PENDING",
    });
    renderPage(
      "/shelter-application",
      "/shelter-application",
      <ShelterApplicationPage />,
    );
    await screen.findByRole("heading", { name: "Application under review" });
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).toBeNull();
  });
});
