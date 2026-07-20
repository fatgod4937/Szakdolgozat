"use client";

import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../../utils/token-storage";
import { showError } from "../../utils/notification";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const hasShownAccessError = useRef(false);

  useEffect(() => {
    const syncAuthState = () => setHasToken(Boolean(getAccessToken()));

    syncAuthState();

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("floofs-auth-changed", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("floofs-auth-changed", syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (hasToken === false && !hasShownAccessError.current) {
      showError("Log in before accessing pets.");
      hasShownAccessError.current = true;
    }
  }, [hasToken]);

  if (hasToken === null) {
    return null;
  }

  if (!hasToken) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
