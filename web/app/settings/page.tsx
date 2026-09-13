"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clearAuthTokens } from "../utils/token-storage";
import { hashPassword } from "../utils/hash-password";
import {
  changeEmail,
  changePassword,
  changePhoneNumber,
  deleteCurrentAccount,
  getCurrentUser,
  updateCurrentUser,
  updateProfilePicture,
} from "../utils/auth-api";
import { showError, showSuccess } from "../utils/notification";
import { useTranslation } from "react-i18next";
import DeleteAccountForm from "./components/DeleteAccountForm";
import EmailForm from "./components/EmailForm";
import PasswordForm from "./components/PasswordForm";
import PhoneForm from "./components/PhoneForm";
import PictureForm from "./components/PictureForm";
import ProfileDetailsForm from "./components/ProfileDetailsForm";
import ProfileForm from "./components/ProfileForm";
import NotificationSettingsForm from "./components/NotificationSettingsForm";

type SettingsSection =
  | "profile"
  | "details"
  | "picture"
  | "notifications"
  | "email"
  | "password"
  | "phone"
  | "delete";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });
  const navigate = useNavigate();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [locationCoordinates, setLocationCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { t } = useTranslation();
  const sections: Array<{ id: SettingsSection; label: string; hint: string }> =
    [
      {
        id: "profile",
        label: t("settings.profile"),
        hint: t("settings.profileHint"),
      },
      {
        id: "details",
        label: t("settings.details"),
        hint: t("settings.detailsHint"),
      },
      {
        id: "picture",
        label: t("settings.profilePicture"),
        hint: t("settings.profilePictureHint"),
      },
      {
        id: "notifications",
        label: t("settings.notifications"),
        hint: t("settings.notificationsHint"),
      },
      {
        id: "email",
        label: t("settings.email"),
        hint: t("settings.emailHint"),
      },
      {
        id: "password",
        label: t("settings.password"),
        hint: t("settings.passwordHint"),
      },
      {
        id: "phone",
        label: t("settings.phone"),
        hint: t("settings.phoneHint"),
      },
      {
        id: "delete",
        label: t("settings.delete"),
        hint: t("settings.deleteHint"),
      },
    ];

  useEffect(() => {
    if (userQuery.data) {
      setFirstName(userQuery.data.firstName);
      setLastName(userQuery.data.lastName);
      setEmail(userQuery.data.email);
      setPhoneNumber(userQuery.data.phoneNumber ?? "");
      setBio(userQuery.data.bio ?? "");
      setLocation(userQuery.data.location ?? "");
      setLocationCoordinates(
        userQuery.data.latitude !== null &&
          userQuery.data.latitude !== undefined &&
          userQuery.data.longitude !== null &&
          userQuery.data.longitude !== undefined
          ? {
              latitude: userQuery.data.latitude,
              longitude: userQuery.data.longitude,
            }
          : null,
      );
    }
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
  const profilePictureMutation = useMutation({
    mutationFn: updateProfilePicture,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      showSuccess("Profile picture updated.");
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : "Could not upload profile picture.",
      ),
  });
  const passwordMutation = useMutation({
    mutationFn: async () =>
      changePassword({
        currentPasswordHash: await hashPassword(currentPassword),
        newPasswordHash: await hashPassword(newPassword),
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess(t("settings.passwordUpdated"));
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("settings.passwordChangeFailed"),
      ),
  });
  const emailMutation = useMutation({
    mutationFn: async () =>
      changeEmail({
        currentPasswordHash: await hashPassword(currentPassword),
        email,
      }),
    onSuccess: () => {
      clearAuthTokens();
      showSuccess(t("settings.emailUpdated"));
      navigate("/auth");
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("settings.emailChangeFailed"),
      ),
  });
  const phoneMutation = useMutation({
    mutationFn: () => changePhoneNumber(phoneNumber),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      showSuccess(t("settings.phoneUpdated"));
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : t("settings.phoneUpdateFailed"),
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: async () =>
      deleteCurrentAccount(await hashPassword(currentPassword)),
    onSuccess: () => {
      clearAuthTokens();
      showSuccess(t("settings.accountDeleted"));
      navigate("/");
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("settings.deleteFailed"),
      ),
  });

  const heading = sections.find((item) => item.id === section)!;
  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 sm:px-6 lg:px-10 [padding-top:calc(5rem+env(safe-area-inset-top))] sm:[padding-top:6rem]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("settings.account")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{t("settings.title")}</h1>
        <div className="mt-8 grid gap-8 border-t-2 border-[#fec8e9] pt-6 md:grid-cols-[14rem_minmax(0,1fr)]">
          <nav
            className="flex gap-2 overflow-x-auto md:flex-col"
            aria-label={t("settings.title")}
          >
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setCurrentPassword("");
                }}
                className={`w-44 shrink-0 rounded-lg px-4 py-3 text-left transition md:w-auto ${section === item.id ? "bg-black text-white" : item.id === "delete" ? "text-[#991b1b] hover:bg-[#fee2e2]" : "hover:bg-black/5"}`}
              >
                <span className="block text-sm font-semibold">
                  {item.label}
                </span>
                <span
                  className={`block whitespace-normal break-words text-xs ${section === item.id ? "text-white/65" : "text-black/50"}`}
                >
                  {item.hint}
                </span>
              </button>
            ))}
          </nav>
          <div className="border border-black/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold">{heading.label}</h2>
            <p className="mt-1 text-sm text-black/60">{heading.hint}</p>
            {section === "profile" ? (
              <ProfileForm
                firstName={firstName}
                lastName={lastName}
                email={userQuery.data?.email}
                isSaving={updateMutation.isPending}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onSubmit={() => updateMutation.mutate({ firstName, lastName })}
              />
            ) : null}
            {section === "details" ? (
              <ProfileDetailsForm
                bio={bio}
                location={location}
                isSaving={updateMutation.isPending}
                onBioChange={setBio}
                onLocationChange={(nextLocation, suggestion) => {
                  setLocation(nextLocation);
                  setLocationCoordinates(
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
                    latitude: locationCoordinates?.latitude ?? null,
                    longitude: locationCoordinates?.longitude ?? null,
                  })
                }
              />
            ) : null}
            {section === "picture" ? (
              <PictureForm
                firstName={firstName}
                profilePictureUrl={userQuery.data?.profilePictureUrl}
                isSaving={profilePictureMutation.isPending}
                onSubmit={(file) => profilePictureMutation.mutate(file)}
              />
            ) : null}
            {section === "notifications" ? <NotificationSettingsForm /> : null}
            {section === "email" ? (
              <EmailForm
                email={email}
                currentPassword={currentPassword}
                isSaving={emailMutation.isPending}
                onEmailChange={setEmail}
                onCurrentPasswordChange={setCurrentPassword}
                onSubmit={() => emailMutation.mutate()}
              />
            ) : null}
            {section === "password" ? (
              <PasswordForm
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                isSaving={passwordMutation.isPending}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSubmit={() => {
                  if (newPassword !== confirmPassword) {
                    showError(t("settings.passwordMismatch"));
                    return;
                  }
                  passwordMutation.mutate();
                }}
              />
            ) : null}
            {section === "phone" ? (
              <PhoneForm
                phoneNumber={phoneNumber}
                isSaving={phoneMutation.isPending}
                onPhoneNumberChange={setPhoneNumber}
                onSubmit={() => phoneMutation.mutate()}
              />
            ) : null}
            {section === "delete" ? (
              <DeleteAccountForm
                currentPassword={currentPassword}
                isDeleting={deleteMutation.isPending}
                onCurrentPasswordChange={setCurrentPassword}
                onSubmit={() => {
                  if (window.confirm(t("settings.confirmDelete"))) {
                    deleteMutation.mutate();
                  }
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
