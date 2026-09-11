"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PetCard } from "../petsasd/page";
import { listFavoritePets } from "../utils/pets-api";

export default function FavoritesPage() {
  const { t } = useTranslation();
  const favoritesQuery = useQuery({
    queryKey: ["favorite-pets"],
    queryFn: listFavoritePets,
  });
  const favorites = favoritesQuery.data ?? [];

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-28 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-black">
              {t("pets.favoritesTitle")}
            </h1>
          </div>
          <Link
            to="/pets"
            className="rounded-full bg-[#fec8e9] px-4 py-2 text-sm font-semibold text-black"
          >
            {t("nav.pets")}
          </Link>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {favorites.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
        {!favoritesQuery.isLoading && favorites.length === 0 ? (
          <p className="mt-8 text-sm text-black/60">
            {t("pets.favoritesEmpty")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
