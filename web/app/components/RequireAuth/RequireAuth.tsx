"use client";

import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import useAuthSession from "../../hooks/useAuthSession";
import { showError } from "../../utils/notification";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const hasShownAccessError = useRef(false);
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === "unauthenticated" && !hasShownAccessError.current) {
      showError("Log in before accessing pets.");
      hasShownAccessError.current = true;
    }
  }, [status]);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
