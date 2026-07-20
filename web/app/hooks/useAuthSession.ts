"use client";

import { useEffect, useRef, useState } from "react";
import { refresh } from "../utils/auth-api";
import {
  clearAuthTokens,
  getAccessToken,
  getAccessTokenExpiry,
  getRefreshToken,
  hasValidAccessToken,
  isAccessTokenNearExpiry,
  setAuthTokens,
} from "../utils/token-storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const REFRESH_BUFFER_MS = 30_000;

export default function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const clearRefreshTimer = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    const scheduleRefresh = (
      accessToken: string,
      shouldRefreshEarly: boolean,
    ) => {
      clearRefreshTimer();

      const accessTokenExpiry = getAccessTokenExpiry(accessToken);

      if (!accessTokenExpiry) {
        return;
      }

      const delay = Math.max(
        accessTokenExpiry -
          Date.now() -
          (shouldRefreshEarly ? REFRESH_BUFFER_MS : 0),
        0,
      );

      refreshTimerRef.current = window.setTimeout(() => {
        void syncSession();
      }, delay);
    };

    const syncSession = async () => {
      const currentAccessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (
        currentAccessToken &&
        hasValidAccessToken(currentAccessToken) &&
        !isAccessTokenNearExpiry(currentAccessToken, REFRESH_BUFFER_MS)
      ) {
        scheduleRefresh(currentAccessToken, Boolean(refreshToken));

        if (active) {
          setStatus("authenticated");
        }

        return;
      }

      if (currentAccessToken && hasValidAccessToken(currentAccessToken)) {
        if (refreshToken) {
          try {
            const data = await refresh({ refreshToken });

            if (!active) {
              return;
            }

            if (data.accessToken && data.refreshToken) {
              setAuthTokens(data.accessToken, data.refreshToken);
              scheduleRefresh(data.accessToken, true);
              setStatus("authenticated");
              return;
            }
          } catch {
            // Fall through and clear below.
          }
        }

        scheduleRefresh(currentAccessToken, false);

        if (active) {
          setStatus("authenticated");
        }

        return;
      }

      if (!refreshToken) {
        if (currentAccessToken) {
          clearAuthTokens();
        }

        if (active) {
          setStatus("unauthenticated");
        }

        return;
      }

      try {
        const data = await refresh({ refreshToken });

        if (!active) {
          return;
        }

        if (data.accessToken && data.refreshToken) {
          setAuthTokens(data.accessToken, data.refreshToken);
          scheduleRefresh(data.accessToken, true);
          setStatus("authenticated");
          return;
        }

        if (currentAccessToken || refreshToken) {
          clearAuthTokens();
        }
        setStatus("unauthenticated");
      } catch {
        if (!active) {
          return;
        }

        if (currentAccessToken || refreshToken) {
          clearAuthTokens();
        }
        setStatus("unauthenticated");
      }
    };

    void syncSession();

    const handleAuthChange = () => {
      void syncSession();
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("floofs-auth-changed", handleAuthChange);

    return () => {
      active = false;
      clearRefreshTimer();
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("floofs-auth-changed", handleAuthChange);
    };
  }, []);

  return {
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
