"use client";

import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAccessToken, getAccessToken } from "../../utils/token-storage";
import { showWarning } from "../../utils/notification";
import useIsMobile from "../../hooks/use-is-mobile";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile("md");
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const syncAuthState = () => setHasAccessToken(Boolean(getAccessToken()));

    syncAuthState();

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("floofs-auth-changed", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("floofs-auth-changed", syncAuthState);
    };
  }, []);

  const handleLogout = () => {
    clearAccessToken();
    showWarning("You have been logged out.");
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleMobileNavigate = () => {
    setMobileMenuOpen(false);
  };

  const navLinkClass =
    "block rounded-full px-4 py-2 transition hover:bg-black/5";

  return (
    <div className="fixed left-0 top-0 z-[9999] w-full px-4 sm:px-6 lg:px-[100px]">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all duration-300 sm:px-5 ${
          scrolled
            ? "mt-2 rounded-full bg-white/80 shadow-md backdrop-blur-md"
            : "mt-4 rounded-full backdrop-blur-md"
        }`}
      >
        <Link to="/">
          <div
            style={{
              backgroundImage: `url('/images/logo.png')`,
            }}
            className="h-12 w-12 bg-cover bg-center"
          ></div>
        </Link>
        <div className="hidden items-center space-x-10 md:flex">
          <NavLink to="/" end>
            home
          </NavLink>
          <a href="/#services">services</a>
          <NavLink to="/download">download</NavLink>
          {hasAccessToken ? <NavLink to="/pets">pets</NavLink> : null}
          <a href="/#about">about</a>
          <a href="/#blog">blog</a>
        </div>

        <div className="hidden md:block">
          {hasAccessToken ? (
            <button
              type="button"
              onClick={handleLogout}
              className={`rounded-full px-3 py-1 transition-all duration-500 ${
                scrolled ? "bg-[#fec8e9]" : "bg-white"
              }`}
            >
              logout
            </button>
          ) : (
            <NavLink
              to="/auth"
              className={`rounded-full px-3 py-1 transition-all duration-500 ${
                scrolled ? "bg-[#fec8e9]" : "bg-white"
              }`}
            >
              Login
            </NavLink>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-sm transition hover:bg-black/5 md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="mt-2 rounded-[1.75rem] border border-black/10 bg-white/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col gap-2 text-sm">
            <NavLink
              className={navLinkClass}
              to="/"
              end
              onClick={handleMobileNavigate}
            >
              home
            </NavLink>
            <a
              className={navLinkClass}
              href="/#services"
              onClick={handleMobileNavigate}
            >
              services
            </a>
            <NavLink
              className={navLinkClass}
              to="/download"
              onClick={handleMobileNavigate}
            >
              download
            </NavLink>
            {hasAccessToken ? (
              <NavLink
                className={navLinkClass}
                to="/pets"
                onClick={handleMobileNavigate}
              >
                pets
              </NavLink>
            ) : null}
            <a
              className={navLinkClass}
              href="/#about"
              onClick={handleMobileNavigate}
            >
              about
            </a>
            <a
              className={navLinkClass}
              href="/#blog"
              onClick={handleMobileNavigate}
            >
              blog
            </a>
            <div className="pt-2">
              {hasAccessToken ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-full bg-[#fec8e9] px-4 py-3 font-medium text-black"
                >
                  logout
                </button>
              ) : (
                <NavLink
                  to="/auth"
                  onClick={handleMobileNavigate}
                  className="block w-full rounded-full bg-[#fec8e9] px-4 py-3 text-center font-medium text-black"
                >
                  Login
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
