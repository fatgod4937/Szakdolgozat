"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PictureForm from "../settings/components/PictureForm";
import ProfileDetailsForm from "../settings/components/ProfileDetailsForm";
import {
  getCurrentUser,
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
      navigate("/pets");
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
  if (userQuery.isLoading || !userQuery.data) return null;
  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("onboarding.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{t("onboarding.title")}</h1>
        <p className="mt-3 max-w-2xl text-black/65">
          {t("onboarding.description")}
        </p>
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
