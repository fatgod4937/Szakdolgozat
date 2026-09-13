import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import NotificationBanner from "./components/NotificationBanner/NotificationBanner";
import AdminPage from "./admin/page";
import AuthPage from "./auth/page";
import PetChatPage from "./chat/page";
import ChatsPage from "./chats/page";
import DownloadPage from "./Download/page";
import MyListingsPage from "./my-listings/page";
import FavoritesPage from "./favorites/page";
import PetsBrowsePage from "./petsasd/page";
import PetsCreatePage from "./pets/page";
import Home from "./page";
import RequireAuth from "./components/RequireAuth/RequireAuth";
import QuickActions from "./components/QuickActions/QuickActions";
import SettingsPage from "./settings/page";
import VerifyEmailPage from "./verify-email/page";
import EmailVerificationPendingPage from "./email-verification-pending/page";
import NotFoundPage from "./not-found/page";
import DataSafetyPage from "./data-safety/page";
import AccountDeactivatedPage from "./account-deactivated/page";
import ForgotPasswordPage from "./forgot-password/page";
import OnboardingPage from "./onboarding/page";
import ResetPasswordPage from "./reset-password/page";
import useChatNotifications from "./hooks/useChatNotifications";

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  useChatNotifications();

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <NotificationBanner />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/email-verification-pending"
            element={<EmailVerificationPendingPage />}
          />
          <Route path="/data-safety" element={<DataSafetyPage />} />
          <Route
            path="/account-deactivated"
            element={<AccountDeactivatedPage />}
          />
          <Route
            path="/pets"
            element={
              <RequireAuth>
                <PetsBrowsePage />
              </RequireAuth>
            }
          />
          <Route
            path="/pets/new"
            element={
              <RequireAuth>
                <PetsCreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-listings"
            element={
              <RequireAuth>
                <MyListingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/favorites"
            element={
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chats"
            element={
              <RequireAuth>
                <ChatsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:petId"
            element={
              <RequireAuth>
                <PetChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/thread/:threadId"
            element={
              <RequireAuth>
                <PetChatPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <QuickActions />
      <Footer />
    </div>
  );
}
