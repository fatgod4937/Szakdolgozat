"use client";

import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuthTokens } from "../../utils/token-storage";
import { showWarning } from "../../utils/notification";
import useAuthSession from "../../hooks/useAuthSession";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../utils/auth-api";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import { useTranslation } from "react-i18next";
import useIsMobile from "../../hooks/useIsMobile";
import { MessageCircle } from "lucide-react";
import { listChatThreads } from "../../utils/chat-api";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuthSession();
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });
  const isAdmin = currentUserQuery.data?.role === "ADMIN";
  const chatThreadsQuery = useQuery({
    queryKey: ["chat-threads"],
    queryFn: listChatThreads,
    enabled: isAuthenticated,
  });
  const hasUnreadMessages = Boolean(
    chatThreadsQuery.data?.threads.some((thread) => thread.unreadCount > 0),
  );
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight / 16) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    clearAuthTokens();
    showWarning(t("nav.logout"));
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleMobileNavigate = () => {
    setMobileMenuOpen(false);
  };
  const handleHomeNavigation = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const isMobile = useIsMobile("lg");

  const getNavLinkClass = (isActive: boolean) =>
    `block rounded-full px-4 py-2 transition-all duration-200 hover:-translate-y-0.5 ${
      isActive ? "bg-black text-white shadow-sm" : "text-black hover:bg-black/5"
    }`;

  return (
    <div className="fixed left-0 top-0 z-[9999] w-full px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-[100px]">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all duration-300 sm:px-5 ${
          scrolled
            ? "mt-0.5 rounded-full bg-white/80 shadow-md backdrop-blur-md sm:mt-2"
            : "mt-1 rounded-full backdrop-blur-md sm:mt-4"
        }`}
      >
        <Link
          to={isAuthenticated ? "/pets" : "/"}
          className="block transition-transform duration-300 hover:scale-105 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          <div
            style={{
              backgroundImage: `url('/images/logo.png')`,
            }}
            className="h-12 w-12 bg-cover bg-center"
          ></div>
        </Link>
        <div className="hidden items-center space-x-10 md:flex">
          {isAuthenticated ? (
            <NavLink
              to="/pets"
              className={({ isActive }) => getNavLinkClass(isActive)}
            >
              {t("nav.pets")}
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/"
                end
                onClick={handleHomeNavigation}
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {t("nav.home")}
              </NavLink>
              <NavLink
                to="/download"
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {t("nav.download")}
              </NavLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSelector />
          </div>
          {isLoading ? null : isAuthenticated ? (
            <>
              <NavLink
                to="/chats"
                className={({ isActive }) =>
                  `relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 focus-visible:-translate-y-0.5 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "bg-white text-black hover:bg-black/5"
                  }`
                }
                aria-label={t("nav.chats")}
                title={t("nav.chats")}
              >
                <MessageCircle size={18} aria-hidden="true" />
                {hasUnreadMessages ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    !
                  </span>
                ) : null}
              </NavLink>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className={`rounded-full px-3 py-1 transition-all duration-500 ${
                  scrolled ? "bg-[#fec8e9]" : "bg-white"
                }`}
              >
                {t("nav.menu")}
              </button>
            </>
          ) : (
            <NavLink
              to="/auth"
              className={({ isActive }) =>
                `rounded-full px-3 py-1 transition-all duration-500 ${
                  isActive
                    ? "bg-black text-white"
                    : scrolled
                      ? "bg-[#fec8e9]"
                      : "bg-white"
                }`
              }
            >
              {t("nav.login")}
            </NavLink>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className={
            isAuthenticated
              ? "hidden"
              : "inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-sm transition hover:bg-black/5 md:hidden"
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? t("nav.menu") : t("nav.menu")}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="mt-2 ml-auto w-full max-w-xs animate-[floofs-menu-in_180ms_ease-out] rounded-[1.75rem] border border-black/10 bg-white/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-md motion-reduce:animate-none"
        >
          {isMobile ?? <LanguageSelector />}
          <div className="flex flex-col gap-2 text-sm">
            <NavLink
              className={({ isActive }) =>
                `${getNavLinkClass(isActive)} ${isAuthenticated ? "hidden" : ""}`
              }
              to="/"
              end
              onClick={handleHomeNavigation}
            >
              {t("nav.home")}
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${getNavLinkClass(isActive)} ${isAuthenticated ? "hidden" : ""}`
              }
              to="/download"
              onClick={handleMobileNavigate}
            >
              {t("nav.download")}
            </NavLink>
            {isAuthenticated ? (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/pets"
                onClick={handleMobileNavigate}
              >
                {t("nav.pets")}
              </NavLink>
            ) : null}
            {isAuthenticated ? (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/my-listings"
                onClick={handleMobileNavigate}
              >
                {t("nav.listings")}
              </NavLink>
            ) : null}
            {isAuthenticated ? (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/favorites"
                onClick={handleMobileNavigate}
              >
                {t("nav.favorites")}
              </NavLink>
            ) : null}
            {isAuthenticated ? (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/settings"
                onClick={handleMobileNavigate}
              >
                {t("nav.settings")}
              </NavLink>
            ) : null}
            {isAuthenticated ? (
              <NavLink
                className={({ isActive }) =>
                  `${getNavLinkClass(isActive)} flex items-center justify-between`
                }
                to="/chats"
                onClick={handleMobileNavigate}
              >
                <span>{t("nav.chats")}</span>
                {hasUnreadMessages ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    !
                  </span>
                ) : null}
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/admin"
                onClick={handleMobileNavigate}
              >
                {t("nav.admin")}
              </NavLink>
            ) : null}
            <div className="pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-full bg-[#fec8e9] px-4 py-3 font-medium text-black"
                >
                  {t("nav.logout")}
                </button>
              ) : (
                <NavLink
                  to="/auth"
                  onClick={handleMobileNavigate}
                  className="block w-full rounded-full bg-[#fec8e9] px-4 py-3 text-center font-medium text-black"
                >
                  {t("nav.login")}
                </NavLink>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Navbar;
