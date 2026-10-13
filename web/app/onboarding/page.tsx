"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PictureForm from "../settings/components/PictureForm";
import ProfileDetailsForm from "../settings/components/ProfileDetailsForm";
import {
  getCurrentUser,
  createDiditVerificationSession,
  updateCurrentUser,
  updateProfilePicture,
} from "../utils/auth-api";
import { showError, showSuccess } from "../utils/notification";

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    refetchInterval: (query) =>
      query.state.data?.identityVerificationStatus === "APPROVED"
        ? false
        : 5_000,
  });
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  useEffect(() => {
    const user = userQuery.data;
    if (!user) return;
    setBio(user.bio ?? "");
    setLocation(user.location ?? "");
    setCoordinates(
      user.latitude != null && user.longitude != null
        ? { latitude: user.latitude, longitude: user.longitude }
        : null,
    );
  }, [userQuery.data]);
  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      showSuccess(t("settings.profileUpdated"));
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("settings.profileUpdateFailed"),
      ),
  });
  const pictureMutation = useMutation({
    mutationFn: updateProfilePicture,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      showSuccess(t("settings.saveProfilePicture"));
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("settings.profilePictureInvalid"),
      ),
  });
  const diditSessionMutation = useMutation({
    mutationFn: createDiditVerificationSession,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("onboarding.verificationStartFailed"),
      ),
  });

  useEffect(() => {
    if (
      userQuery.data?.identityVerificationStatus === "APPROVED"
    ) {
      navigate("/pets", { replace: true });
    }
  }, [navigate, userQuery.data?.identityVerificationStatus]);

  if (userQuery.isLoading || !userQuery.data) return null;
  const verificationStatus = userQuery.data.identityVerificationStatus;
  const canStartVerification =
    verificationStatus === "NOT_STARTED" ||
    verificationStatus === "DECLINED" ||
    verificationStatus === "ABANDONED" ||
    verificationStatus === "EXPIRED" ||
    verificationStatus === "KYC_EXPIRED";

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 [padding-top:calc(5rem+env(safe-area-inset-top))] sm:px-6 sm:[padding-top:6rem]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("onboarding.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{t("onboarding.title")}</h1>
        <p className="mt-3 max-w-2xl text-black/65">
          {t("onboarding.description")}
        </p>
        <div className="mt-8 border border-[#aa2f75]/30 bg-[#fff3f8] p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
            {t("onboarding.identityVerification.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {t("onboarding.identityVerification.title")}
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-black/65">
            {t("onboarding.identityVerification.description")}
          </p>
          {verificationStatus === "IN_REVIEW" ? (
            <p className="mt-4 text-sm font-medium text-black/75">
              {t("onboarding.identityVerification.inReview")}
            </p>
          ) : verificationStatus === "IN_PROGRESS" ||
            verificationStatus === "RESUBMITTED" ? (
            <p className="mt-4 text-sm font-medium text-black/75">
              {t("onboarding.identityVerification.inProgress")}
            </p>
          ) : canStartVerification ? (
            <button
              type="button"
              onClick={() => diditSessionMutation.mutate()}
              disabled={diditSessionMutation.isPending}
              className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {diditSessionMutation.isPending
                ? t("onboarding.identityVerification.starting")
                : t("onboarding.identityVerification.start")}
            </button>
          ) : null}
        </div>
        <div className="mt-8 border border-black/10 bg-white p-5 shadow-sm sm:p-7">
          <PictureForm
            firstName={userQuery.data.firstName}
            profilePictureUrl={userQuery.data.profilePictureUrl}
            isSaving={pictureMutation.isPending}
            onSubmit={(file) => pictureMutation.mutate(file)}
          />
          <div className="mt-10 border-t border-black/10 pt-7">
            <h2 className="text-2xl font-semibold">
              {t("onboarding.details")}
            </h2>
            <ProfileDetailsForm
              bio={bio}
              location={location}
              isSaving={updateMutation.isPending}
              onBioChange={setBio}
              onLocationChange={(nextLocation, suggestion) => {
                setLocation(nextLocation);
                setCoordinates(
                  suggestion
                    ? {
                        latitude: suggestion.latitude,
                        longitude: suggestion.longitude,
                      }
                    : null,
                );
              }}
              onSubmit={() =>
                updateMutation.mutate({
                  bio,
                  location,
                  latitude: coordinates?.latitude ?? null,
                  longitude: coordinates?.longitude ?? null,
                })
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
