"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { deletePet, listMyPets } from "../utils/pets-api";
import { showError, showSuccess } from "../utils/notification";
import { useTranslation } from "react-i18next";

export default function MyListingsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const listingsQuery = useQuery({
    queryKey: ["my-pet-listings"],
    queryFn: listMyPets,
  });
  const deleteMutation = useMutation({
    mutationFn: deletePet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-pet-listings"] });
      showSuccess(t("listings.removed"));
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("listings.removeFailed"),
      ),
  });
  const listings = listingsQuery.data ?? [];
  const imageBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6 sm:pt-24 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
              {t("settings.account")}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">
              {t("listings.title")}
            </h1>
          </div>
          <Link
            to="/pets/new"
            className="rounded-full bg-[#fec8e9] px-4 py-2 text-sm font-semibold"
          >
            {t("actions.addPet")}
          </Link>
        </div>
        <div className="mt-8 space-y-3 border-t-2 border-[#fec8e9] pt-5">
          {listings.map((pet) => (
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
                <h2 className="font-semibold">{pet.name}</h2>
                <p className="text-sm text-black/60">
                  {pet.species} · {pet.location} ·{" "}
                  {t(`status.${pet.adoptionStatus.toLowerCase()}`)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/pets/new?edit=${pet.id}`}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        t("listings.confirmRemove", { name: pet.name }),
                      )
                    )
                      deleteMutation.mutate(pet.id);
                  }}
                  className="rounded-full bg-[#fee2e2] px-4 py-2 text-sm font-semibold text-[#991b1b] disabled:opacity-50"
                >
                  {t("admin.remove")}
                </button>
              </div>
            </article>
          ))}
          {!listingsQuery.isLoading && listings.length === 0 ? (
            <p className="text-sm text-black/60">{t("listings.empty")}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
