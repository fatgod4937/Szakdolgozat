"use client";

import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import useAuthSession from "../../hooks/useAuthSession";
import { showError } from "../../utils/notification";
import { useTranslation } from "react-i18next";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const hasShownAccessError = useRef(false);
  const { status } = useAuthSession();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === "unauthenticated" && !hasShownAccessError.current) {
      showError(t("common.loginRequired"));
      hasShownAccessError.current = true;
    }
  }, [status, t]);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
