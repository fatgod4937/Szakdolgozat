"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  deleteAdminPet,
  listAdminPets,
  listAdminShelters,
  listAdminUsers,
  setAdminPetStatus,
  setAdminUserStatus,
  setShelterApproval,
  type ShelterRecord,
} from "../utils/admin-api";
import { getCurrentUser } from "../utils/auth-api";
import { showError, showSuccess } from "../utils/notification";
import type { PetAdoptionStatus } from "../utils/pets-api";
import { useDebounce } from "../hooks/useDebounce";
import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [petSearch, setPetSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedShelter, setSelectedShelter] = useState<ShelterRecord | null>(
    null,
  );
  const debouncedPetSearch = useDebounce(petSearch, 600);
  const debouncedUserSearch = useDebounce(userSearch, 600);
  const statuses: Array<{ value: PetAdoptionStatus; label: string }> = [
    { value: "AVAILABLE", label: t("status.available") },
    { value: "RESERVED", label: t("status.reserved") },
    { value: "ADOPTED", label: t("status.adopted") },
  ];
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });
  const isAdmin = userQuery.data?.role === "ADMIN";
  const sheltersQuery = useQuery({
    queryKey: ["admin", "shelters"],
    queryFn: listAdminShelters,
    enabled: isAdmin,
  });
  const petsQuery = useQuery({
    queryKey: ["admin", "pets", debouncedPetSearch],
    queryFn: () => listAdminPets(1, 50, debouncedPetSearch),
    enabled: isAdmin,
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users", debouncedUserSearch],
    queryFn: () => listAdminUsers(debouncedUserSearch),
    enabled: isAdmin,
  });
  const refreshAdminData = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  const approvalMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      setShelterApproval(id, isVerified),
    onSuccess: () => {
      showSuccess(t("admin.approvalUpdated"));
      refreshAdminData();
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("admin.shelterUpdateFailed"),
      ),
  });
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      adoptionStatus,
    }: {
      id: string;
      adoptionStatus: PetAdoptionStatus;
    }) => setAdminPetStatus(id, adoptionStatus),
    onSuccess: () => {
      showSuccess(t("admin.statusUpdated"));
      refreshAdminData();
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("admin.petUpdateFailed"),
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAdminPet,
    onSuccess: () => {
      showSuccess(t("admin.listingRemoved"));
      refreshAdminData();
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("admin.petRemoveFailed"),
      ),
  });
  const userStatusMutation = useMutation({
    mutationFn: ({
      id,
      isActive,
      reason,
    }: {
      id: string;
      isActive: boolean;
      reason?: string;
    }) => setAdminUserStatus(id, isActive, reason),
    onSuccess: () => {
      showSuccess("User profile updated.");
      refreshAdminData();
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : "Could not update user profile.",
      ),
  });

  if (userQuery.isPending) return null;
  if (!isAdmin) return <Navigate to="/pets" replace />;

  const shelters = sheltersQuery.data ?? [];
  const pets = petsQuery.data?.items ?? [];
  const pendingShelters = shelters.filter((shelter) => !shelter.isVerified);
  const imageBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6 sm:pt-24 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("admin.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-black">
          {t("admin.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-black/65">{t("admin.description")}</p>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="border-t-2 border-[#fec8e9] pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold">Users</h2>
              <span className="text-sm text-black/55">
                {usersQuery.data?.length ?? 0} shown
              </span>
            </div>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users by name or email"
              className="mt-4 w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {(usersQuery.data ?? []).map((user) => (
                <article
                  key={user.id}
                  className="border border-black/10 bg-white p-4 shadow-sm"
                >
                  <h3 className="font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="mt-1 break-all text-sm text-black/60">
                    {user.email}
                  </p>
                  <p className="mt-2 text-xs font-medium text-black/50">
                    {user.role} · {user.isActive ? "Active" : "Inactive"}
                  </p>
                  {!user.isActive && user.deactivation ? (
                    <p className="mt-2 text-xs text-black/55">
                      Deactivated{" "}
                      {new Date(
                        user.deactivation.deactivatedAt,
                      ).toLocaleDateString()}{" "}
                      {user.deactivation.reason
                        ? `· ${user.deactivation.reason}`
                        : ""}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={userStatusMutation.isPending}
                    onClick={() => {
                      const reason = user.isActive
                        ? window.prompt("Reason for deactivation (optional):") ??
                          undefined
                        : undefined;
                      if (!user.isActive || reason !== null)
                        userStatusMutation.mutate({
                          id: user.id,
                          isActive: !user.isActive,
                          reason,
                        });
                    }}
                    className={`mt-4 rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-50 ${user.isActive ? "bg-[#fee2e2] text-[#991b1b]" : "bg-[#fec8e9] text-black"}`}
                  >
                    {user.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </article>
              ))}
              {!usersQuery.isPending && (usersQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-black/60">No matching users.</p>
              ) : null}
            </div>
          </section>
          <section className="border-t-2 border-[#ffd8b0] pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold">{t("admin.listings")}</h2>
              <span className="text-sm text-black/55">
                {t("admin.total", { count: petsQuery.data?.total ?? 0 })}
              </span>
            </div>
            <input
              value={petSearch}
              onChange={(event) => setPetSearch(event.target.value)}
              placeholder="Search pets, breeds, locations, or owners"
              className="mt-4 w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {pets.map((pet) => (
                <article
                  key={pet.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-black/10 bg-white p-4 shadow-sm"
                >
                  {pet.photoUrls[0] ? (
                    <img
                      src={
                        pet.photoUrls[0].startsWith("http")
                          ? pet.photoUrls[0]
                          : `${imageBaseUrl}${pet.photoUrls[0]}`
                      }
                      alt={pet.name}
                      className="h-20 w-20 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{pet.name}</h3>
                    <p className="text-sm text-black/60">
                      {pet.species} · {pet.location} ·{" "}
                      {pet.owner
                        ? `${pet.owner.firstName} ${pet.owner.lastName}`
                        : t("admin.noOwner")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={pet.adoptionStatus}
                      onChange={(event) =>
                        statusMutation.mutate({
                          id: pet.id,
                          adoptionStatus: event.target
                            .value as PetAdoptionStatus,
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            t("admin.confirmRemove", { name: pet.name }),
                          )
                        )
                          deleteMutation.mutate(pet.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-full bg-[#fee2e2] px-3 py-2 text-sm font-semibold text-[#991b1b] disabled:opacity-50"
                    >
                      {t("admin.remove")}
                    </button>
                  </div>
                </article>
              ))}
              {!petsQuery.isPending && pets.length === 0 ? (
                <p className="text-sm text-black/60">{t("admin.noPets")}</p>
              ) : null}
            </div>
          </section>
          <section className="border-t-2 border-[#dce9f0] pt-5 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold">{t("admin.shelters")}</h2>
              <span className="text-sm text-black/55">
                {t("admin.pending", { count: pendingShelters.length })}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {shelters.map((shelter) => (
                <article
                  key={shelter.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-black/10 bg-white p-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold">{shelter.name}</h3>
                    <p className="text-sm text-black/60">
                      {[shelter.city, shelter.contactEmail]
                        .filter(Boolean)
                        .join(" · ") || t("admin.noContact")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedShelter(shelter)}
                      className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                    >
                      View application
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        approvalMutation.mutate({
                          id: shelter.id,
                          isVerified: !shelter.isVerified,
                        })
                      }
                      disabled={approvalMutation.isPending}
                      className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${shelter.isVerified ? "bg-black/5 text-black/70" : "bg-[#fec8e9] text-black"}`}
                    >
                      {shelter.isVerified
                        ? t("admin.revoke")
                        : t("admin.approve")}
                    </button>
                  </div>
                </article>
              ))}
              {!sheltersQuery.isPending && shelters.length === 0 ? (
                <p className="text-sm text-black/60">{t("admin.noShelters")}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
      {selectedShelter ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedShelter(null)}
        >
          <article
            className="w-full max-w-lg bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#aa2f75]">
                  Shelter application
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {selectedShelter.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShelter(null)}
                className="text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-black/65">
                  {selectedShelter.description || "No description supplied."}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Location</dt>
                <dd className="mt-1 text-black/65">
                  {selectedShelter.city || "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Contact email</dt>
                <dd className="mt-1 text-black/65">
                  {selectedShelter.contactEmail || "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Website</dt>
                <dd className="mt-1 text-black/65">
                  {selectedShelter.websiteUrl || "Not supplied"}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      ) : null}
    </section>
  );
}
