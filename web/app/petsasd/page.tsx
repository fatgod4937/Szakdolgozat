"use client";

import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import {
  listBreeds,
  listPets,
  addFavoritePet,
  getLocalizedBreedName,
  listFavoritePets,
  removeFavoritePet,
  searchLocations,
  type BreedRecord,
  type LocationSuggestion,
  type PetListFilters,
  type PetRecord,
} from "../utils/pets-api";
import { getCurrentUserId } from "../utils/token-storage";
import { getCurrentUser } from "../utils/auth-api";
import { showError, showSuccess } from "../utils/notification";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useDebounce } from "../hooks/useDebounce";

const speciesOptions = [
  "Dog",
  "Cat",
  "Reptile",
  "Rabbit",
  "Bird",
  "Hamster",
  "Guinea Pig",
  "Turtle",
  "Parrot",
  "Ferret",
  "Horse",
  "Chinchilla",
  "Fish",
  "Hedgehog",
  "Other",
];

function buildPetSummary(pet: PetRecord, t: TFunction) {
  const ageParts = [
    pet.ageYears !== null && pet.ageYears !== undefined
      ? t("pets.years", { count: pet.ageYears })
      : null,
    pet.ageMonths !== null && pet.ageMonths !== undefined
      ? t("pets.months", { count: pet.ageMonths })
      : null,
  ].filter(Boolean);

  return ageParts.length > 0 ? ageParts.join(" · ") : t("pets.young");
}

function getImageBaseUrl() {
  const apiUrl =
    import.meta.env.VITE_API_URL ?? "https://192.168.0.100:3000/api";

  return apiUrl.replace(/\/api\/?$/, "");
}

function getPetImageUrl(photoUrl: string) {
  const baseUrl = getImageBaseUrl();

  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  return `${baseUrl}${photoUrl}`;
}

function getStatusLabel(status: PetRecord["adoptionStatus"], t: TFunction) {
  return t(`status.${status.toLowerCase()}`);
}

export function PetCard({ pet }: { pet: PetRecord }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({
    queryKey: ["favorite-pets"],
    queryFn: listFavoritePets,
  });
  const favorites = Array.isArray(favoritesQuery.data)
    ? favoritesQuery.data
    : [];
  const isFavorite = favorites.some((favorite) => favorite.id === pet.id);
  const favoriteMutation = useMutation({
    mutationFn: () =>
      isFavorite ? removeFavoritePet(pet.id) : addFavoritePet(pet.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorite-pets"] });
      showSuccess(t(isFavorite ? "pets.removeFavorite" : "pets.favorite"));
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("pets.favoriteFailed"),
      ),
  });
  const photoUrls = pet.photoUrls ?? [];
  const currentUserId = getCurrentUserId();
  const canMessageOwner = Boolean(pet.owner && pet.owner.id !== currentUserId);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerHasMoved = useRef(false);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [photoUrls.length, pet.id]);

  const hasMultiplePhotos = photoUrls.length > 1;
  const activePhotoUrl = photoUrls[activePhotoIndex];

  const goToPreviousPhoto = () => {
    if (photoUrls.length <= 1) {
      return;
    }

    setActivePhotoIndex((current) =>
      current === 0 ? photoUrls.length - 1 : current - 1,
    );
  };

  const goToNextPhoto = () => {
    if (photoUrls.length <= 1) {
      return;
    }

    setActivePhotoIndex((current) =>
      current === photoUrls.length - 1 ? 0 : current + 1,
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX;
    pointerStartY.current = event.clientY;
    pointerHasMoved.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || pointerStartY.current === null) {
      return;
    }

    const deltaX = Math.abs(event.clientX - pointerStartX.current);
    const deltaY = Math.abs(event.clientY - pointerStartY.current);

    if (deltaX > 12 || deltaY > 12) {
      pointerHasMoved.current = true;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null || pointerStartY.current === null) {
      return;
    }

    const deltaX = event.clientX - pointerStartX.current;
    const deltaY = event.clientY - pointerStartY.current;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goToNextPhoto();
      } else {
        goToPreviousPhoto();
      }
    }

    pointerStartX.current = null;
    pointerStartY.current = null;
    pointerHasMoved.current = false;
  };

  const traits = [
    { label: t("pets.goodWithChildren"), value: pet.goodWithChildren },
    { label: t("pets.goodWithDogs"), value: pet.goodWithDogs },
    { label: t("pets.goodWithCats"), value: pet.goodWithCats },
    { label: t("pets.vaccinated"), value: pet.vaccinated },
    { label: t("pets.neutered"), value: pet.neutered },
    { label: t("pets.houseTrained"), value: pet.houseTrained },
  ];

  return (
    <article className="group overflow-hidden rounded-[2.5rem] border border-black/8 bg-white/90 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1">
      <div
        className="relative h-[22rem] overflow-hidden bg-gradient-to-br from-[#ffd8b0] to-[#fec8e9]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) {
            return;
          }

          const bounds = event.currentTarget.getBoundingClientRect();
          const clickX = event.clientX - bounds.left;

          if (hasMultiplePhotos && !pointerHasMoved.current) {
            if (clickX < bounds.width / 2) {
              goToPreviousPhoto();
              return;
            }

            if (clickX > bounds.width / 2) {
              goToNextPhoto();
              return;
            }
          }
        }}
      >
        {hasMultiplePhotos && activePhotoUrl ? (
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activePhotoIndex * 100}%)` }}
          >
            {photoUrls.map((photoUrl, index) => (
              <img
                key={`${pet.id}-${photoUrl}-${index}`}
                src={getPetImageUrl(photoUrl)}
                alt={t("pets.photoOf", { name: pet.name, index: index + 1 })}
                className="h-full w-full shrink-0 object-cover"
                draggable={false}
              />
            ))}
          </div>
        ) : activePhotoUrl ? (
          <img
            src={getPetImageUrl(activePhotoUrl)}
            alt={pet.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-start justify-between p-6">
            <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-black shadow-sm">
              {pet.adoptionStatus === "AVAILABLE"
                ? getStatusLabel(pet.adoptionStatus, t)
                : getStatusLabel(pet.adoptionStatus, t)}
            </span>
            <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-black/70 backdrop-blur">
              {t("pets.browseReady")}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-black/0 to-black/10 opacity-80" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-black shadow-sm backdrop-blur">
            {pet.adoptionStatus === "AVAILABLE"
              ? getStatusLabel(pet.adoptionStatus, t)
              : getStatusLabel(pet.adoptionStatus, t)}
          </span>

          {hasMultiplePhotos ? (
            <span className="rounded-full bg-black/18 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              {activePhotoIndex + 1} / {photoUrls.length}
            </span>
          ) : (
            <span className="rounded-full bg-black/18 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
              {t("pets.browseReady")}
            </span>
          )}
        </div>

        {hasMultiplePhotos ? (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 px-5">
            {photoUrls.map((_, index) => (
              <button
                key={`${pet.id}-indicator-${index}`}
                type="button"
                aria-label={t("pets.showPhoto", {
                  index: index + 1,
                  name: pet.name,
                })}
                onClick={(event) => {
                  event.stopPropagation();
                  setActivePhotoIndex(index);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === activePhotoIndex
                    ? "w-8 bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
                    : "w-2.5 bg-white/65"
                }`}
              />
            ))}
          </div>
        ) : null}

        <button
          type="button"
          disabled={favoriteMutation.isPending}
          onClick={() => favoriteMutation.mutate()}
          className={`absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${
            isFavorite
              ? "bg-[#fec8e9] text-[#aa2f75]"
              : "bg-white/85 text-black hover:bg-white"
          }`}
          aria-label={t(isFavorite ? "pets.removeFavorite" : "pets.favorite")}
          title={t(isFavorite ? "pets.removeFavorite" : "pets.favorite")}
        >
          <Heart
            className="h-5 w-5"
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>

        {canMessageOwner ? (
          <Link
            to={`/chat/${pet.id}`}
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:scale-105 hover:bg-black/85"
            aria-label={t("pets.messageOwner")}
            title={t("pets.messageOwner")}
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
        ) : null}

        {hasMultiplePhotos ? (
          <>
            <button
              type="button"
              aria-label={t("pets.previousPhoto", { name: pet.name })}
              onClick={(event) => {
                event.stopPropagation();
                goToPreviousPhoto();
              }}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold text-black shadow-lg backdrop-blur transition hover:bg-white md:block"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t("pets.nextPhoto", { name: pet.name })}
              onClick={(event) => {
                event.stopPropagation();
                goToNextPhoto();
              }}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold text-black shadow-lg backdrop-blur transition hover:bg-white md:block"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-5 p-6">
        <div>
          <h2 className="text-3xl font-semibold text-black">{pet.name}</h2>
          <p className="text-sm text-black/60">
            {pet.species} ·{" "}
            {getLocalizedBreedName(pet.breedRecord, i18n.language) ||
              t("pets.mixed")}
          </p>
          <p className="mt-1 text-sm text-black/60">
            {pet.city ?? pet.location}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-black/70">
          <span>{buildPetSummary(pet, t)}</span>
          <span>{t("pets.adoptionCompanion")}</span>
        </div>

        <p className="text-sm leading-6 text-black/65 line-clamp-4">
          {pet.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {traits
            .filter((trait) => trait.value)
            .map((trait) => (
              <span
                key={trait.label}
                className="rounded-full bg-[#ffedf7] px-3 py-1.5 text-xs font-semibold text-[#aa2f75]"
              >
                {trait.label}
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}

export default function PetsBrowsePage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [adoptionStatus, setAdoptionStatus] =
    useState<PetListFilters["adoptionStatus"]>("AVAILABLE");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [breedId, setBreedId] = useState("");
  const [gender, setGender] = useState<PetListFilters["gender"]>();
  const [size, setSize] = useState<PetListFilters["size"]>();
  const [location, setLocation] = useState("");
  const [nearbyLocation, setNearbyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const hasInitializedUserLocation = useRef(false);
  const [radiusKm, setRadiusKm] = useState("25");
  const [locationOptions, setLocationOptions] = useState<LocationSuggestion[]>(
    [],
  );
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });
  const [ageGroup, setAgeGroup] = useState("");
  const [traits, setTraits] = useState<
    Pick<
      PetListFilters,
      | "goodWithChildren"
      | "goodWithDogs"
      | "goodWithCats"
      | "vaccinated"
      | "neutered"
      | "houseTrained"
    >
  >({});
  const [breedOptions, setBreedOptions] = useState<BreedRecord[]>([]);
  const [isSearchingBreeds, setIsSearchingBreeds] = useState(false);
  const debouncedSearch = useDebounce(search, 600);
  const debouncedBreed = useDebounce(breed, 600);
  const debouncedLocation = useDebounce(location, 600);
  const pageSize = 10;
  useEffect(() => {
    const user = currentUserQuery.data;
    if (
      hasInitializedUserLocation.current ||
      !user?.location ||
      user.latitude === null ||
      user.latitude === undefined ||
      user.longitude === null ||
      user.longitude === undefined
    ) {
      return;
    }

    hasInitializedUserLocation.current = true;
    setLocation(user.location);
    setNearbyLocation({ latitude: user.latitude, longitude: user.longitude });
  }, [currentUserQuery.data]);
  const petFilters: PetListFilters = {
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(adoptionStatus ? { adoptionStatus } : {}),
    ...(species ? { species } : {}),
    ...(breedId
      ? { breedId }
      : debouncedBreed.trim()
        ? { breed: debouncedBreed.trim() }
        : {}),
    ...(gender ? { gender } : {}),
    ...(size ? { size } : {}),
    ...(!nearbyLocation && debouncedLocation.trim()
      ? { location: debouncedLocation.trim() }
      : {}),
    ...(nearbyLocation
      ? {
          latitude: nearbyLocation.latitude,
          longitude: nearbyLocation.longitude,
          radiusKm: Number(radiusKm) || 25,
          sortByDistance: true,
        }
      : {}),
    ...(ageGroup === "YOUNG" ? { maxAgeYears: 2 } : {}),
    ...(ageGroup === "ADULT" ? { minAgeYears: 3, maxAgeYears: 7 } : {}),
    ...(ageGroup === "SENIOR" ? { minAgeYears: 8 } : {}),
    ...traits,
  };

  useEffect(() => {
    const normalizedBreed = breed.trim();

    if (normalizedBreed.length < 2) {
      setBreedOptions([]);
      setIsSearchingBreeds(false);
      return;
    }

    let isCurrent = true;
    setIsSearchingBreeds(true);

    void listBreeds(normalizedBreed, species, 12, i18n.language)
      .then(
        (options) => {
          if (isCurrent) {
            setBreedOptions(options);
          }
        },
        () => {
          if (isCurrent) {
            setBreedOptions([]);
          }
        },
      )
      .finally(() => {
        if (isCurrent) {
          setIsSearchingBreeds(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [breed, i18n.language, species]);

  useEffect(() => {
    const search = location.trim();

    if (nearbyLocation || search.length < 3) {
      setLocationOptions([]);
      setIsSearchingLocations(false);
      return;
    }

    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingLocations(true);
      try {
        const options = await searchLocations(search);
        if (isCurrent) setLocationOptions(options);
      } catch {
        if (isCurrent) setLocationOptions([]);
      } finally {
        if (isCurrent) setIsSearchingLocations(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [location, nearbyLocation]);

  const petsQuery = useQuery({
    queryKey: ["pets", page, petFilters],
    queryFn: () => listPets(page, pageSize, petFilters),
  });

  const petCards = petsQuery.data?.items ?? [];
  const totalPages = petsQuery.data?.totalPages ?? 1;
  const totalPets = petsQuery.data?.total ?? 0;
  const startItem = totalPets === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalPets);

  return (
    <section className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] pb-24 pt-32">
      <div className="absolute left-[-5rem] top-10 h-64 w-64 rounded-full bg-[#fec8e9]/30 blur-3xl" />
      <div className="absolute right-[-5rem] top-32 h-72 w-72 rounded-full bg-[#ffd8b0]/35 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-6rem)] w-full max-w-7xl px-6 py-12 lg:px-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
            {t("pets.eyebrow")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            {t("pets.title")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-black/70">
            {t("pets.description")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-black/8 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("pets.search")}
            className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          />
        </div>

        <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-black/8 bg-white/80 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={species}
            onChange={(event) => {
              setSpecies(event.target.value);
              setBreedId("");
              setPage(1);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="">{t("pets.allSpecies")}</option>
            {speciesOptions.map((option) => (
              <option key={option} value={option}>
                {t(`pets.species.${option}`)}
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              value={breed}
              onChange={(event) => {
                setBreed(event.target.value);
                setBreedId("");
                setPage(1);
              }}
              placeholder={t("pets.breed")}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
            />
            {breed.trim().length >= 2 ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                {isSearchingBreeds ? (
                  <p className="px-4 py-2 text-sm text-black/55">
                    {t("pets.searchingBreeds")}
                  </p>
                ) : null}
                {!isSearchingBreeds && breedOptions.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-black/55">
                    {t("pets.noMatchingBreeds")}
                  </p>
                ) : null}
                {breedOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setBreed(
                        getLocalizedBreedName(option, i18n.language) ?? "",
                      );
                      setBreedId(option.id);
                      setBreedOptions([]);
                      setPage(1);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-[#fff7fb]"
                  >
                    {getLocalizedBreedName(option, i18n.language)}
                    <span className="ml-2 text-black/45">
                      {i18n.language.toLowerCase().startsWith("hu")
                        ? option.species.huName
                        : option.species.enName}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            value={gender ?? ""}
            onChange={(event) => {
              setGender(
                (event.target.value || undefined) as PetListFilters["gender"],
              );
              setPage(1);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="">{t("pets.allGenders")}</option>
            <option value="MALE">{t("petForm.male")}</option>
            <option value="FEMALE">{t("petForm.female")}</option>
            <option value="UNKNOWN">{t("petForm.unknown")}</option>
          </select>
          <select
            value={size ?? ""}
            onChange={(event) => {
              setSize(
                (event.target.value || undefined) as PetListFilters["size"],
              );
              setPage(1);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="">{t("pets.allSizes")}</option>
            <option value="SMALL">{t("petForm.small")}</option>
            <option value="MEDIUM">{t("petForm.medium")}</option>
            <option value="LARGE">{t("petForm.large")}</option>
            <option value="EXTRA_LARGE">{t("petForm.extraLarge")}</option>
          </select>
          <div className="relative">
            <input
              value={location}
              onFocus={() => setIsLocationFocused(true)}
              onChange={(event) => {
                setLocation(event.target.value);
                setNearbyLocation(null);
                setPage(1);
              }}
              placeholder={t("pets.location")}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
            />
            {isLocationFocused && location.trim().length >= 3 ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                {isSearchingLocations ? (
                  <p className="px-4 py-2 text-sm text-black/55">
                    {t("common.loading")}
                  </p>
                ) : null}
                {!isSearchingLocations && locationOptions.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-black/55">
                    {t("petForm.noLocations")}
                  </p>
                ) : null}
                {!isSearchingLocations
                  ? locationOptions.map((option) => (
                      <button
                        key={`${option.latitude}-${option.longitude}`}
                        type="button"
                        onClick={() => {
                          setLocation(option.label);
                          setNearbyLocation({
                            latitude: option.latitude,
                            longitude: option.longitude,
                          });
                          setIsLocationFocused(false);
                          setLocationOptions([]);
                          setPage(1);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-[#fff7fb]"
                      >
                        <span className="block font-medium">
                          {option.label}
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
          <select
            value={radiusKm}
            onChange={(event) => {
              setRadiusKm(event.target.value);
              setPage(1);
            }}
            aria-label={t("pets.radius")}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="5">{t("pets.withinKm", { count: 5 })}</option>
            <option value="10">{t("pets.withinKm", { count: 10 })}</option>
            <option value="25">{t("pets.withinKm", { count: 25 })}</option>
            <option value="50">{t("pets.withinKm", { count: 50 })}</option>
            <option value="100">{t("pets.withinKm", { count: 100 })}</option>
          </select>
          <select
            value={ageGroup}
            onChange={(event) => {
              setAgeGroup(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="">{t("pets.allAges")}</option>
            <option value="YOUNG">{t("pets.ageGroups.young")}</option>
            <option value="ADULT">{t("pets.ageGroups.adult")}</option>
            <option value="SENIOR">{t("pets.ageGroups.senior")}</option>
          </select>
          <select
            value={adoptionStatus ?? ""}
            onChange={(event) => {
              setAdoptionStatus(
                (event.target.value as PetListFilters["adoptionStatus"]) ||
                  undefined,
              );
              setPage(1);
            }}
            className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/35"
          >
            <option value="">{t("pets.allStatuses")}</option>
            <option value="AVAILABLE">{t("status.available")}</option>
            <option value="RESERVED">{t("status.reserved")}</option>
            <option value="ADOPTED">{t("status.adopted")}</option>
          </select>
          <div className="col-span-full flex flex-wrap gap-2">
            {(
              [
                ["goodWithChildren", t("pets.goodWithChildren")],
                ["goodWithDogs", t("pets.goodWithDogs")],
                ["goodWithCats", t("pets.goodWithCats")],
                ["vaccinated", t("pets.vaccinated")],
                ["neutered", t("pets.neutered")],
                ["houseTrained", t("pets.houseTrained")],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={traits[key] === true}
                  onChange={(event) => {
                    setTraits((current) => ({
                      ...current,
                      [key]: event.target.checked || undefined,
                    }));
                    setPage(1);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 rounded-[2rem] border border-black/8 bg-white/80 px-5 py-4 text-sm text-black/70 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            {totalPets > 0
              ? t("pets.results", {
                  start: startItem,
                  end: endItem,
                  count: totalPets,
                })
              : t("pets.none")}
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-black/10 bg-white px-4 py-2 font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("pets.previous")}
            </button>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-black px-4 py-2 font-medium text-white shadow-sm">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="rounded-full border border-black/10 bg-white px-4 py-2 font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("pets.next")}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2">
          {petCards.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}

          {petCards.length === 0 ? (
            <div className="rounded-[2rem] border border-black/10 bg-white/80 p-8 text-sm text-black/60 md:col-span-2 xl:col-span-2 2xl:col-span-2">
              {t("pets.empty")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
