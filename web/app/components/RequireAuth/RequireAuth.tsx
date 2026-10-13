"use client";

import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthSession from "../../hooks/useAuthSession";
import { showError } from "../../utils/notification";
import { useTranslation } from "react-i18next";
import { getCurrentUser } from "../../utils/auth-api";

type RequireAuthProps = {
  children: React.ReactNode;
  allowUnverified?: boolean;
};

export default function RequireAuth({
  children,
  allowUnverified = false,
}: RequireAuthProps) {
  const hasShownAccessError = useRef(false);
  const { status } = useAuthSession();
  const { t } = useTranslation();
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: status === "authenticated" && !allowUnverified,
  });

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

  if (!allowUnverified) {
    if (userQuery.isLoading || !userQuery.data) {
      return null;
    }

    if (
      userQuery.data.role !== "ADMIN" &&
      userQuery.data.identityVerificationStatus !== "APPROVED"
    ) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return children;
}
