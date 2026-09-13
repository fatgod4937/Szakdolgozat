"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { showError, showSuccess } from "../utils/notification";
import {
  createPet,
  getPet,
  getLocalizedBreedName,
  getLocalizedSpeciesName,
  listBreeds,
  listSpecies,
  searchLocations,
  updatePet,
  type BreedRecord,
  type LocationSuggestion,
  type PetGender,
  type PetSize,
  type SpeciesRecord,
} from "../utils/pets-api";
import { useTranslation } from "react-i18next";

type PetFormValues = {
  name: string;
  species: string;
  breedId: string;
  ageYears: string;
  ageMonths: string;
  gender: PetGender;
  size: PetSize;
  location: string;
  description: string;
  adoptionStatus: "AVAILABLE" | "RESERVED" | "ADOPTED";
  goodWithChildren: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
  vaccinated: boolean;
  neutered: boolean;
  houseTrained: boolean;
};

const defaultValues: PetFormValues = {
  name: "",
  species: "",
  breedId: "",
  ageYears: "",
  ageMonths: "",
  gender: "UNKNOWN",
  size: "MEDIUM",
  location: "",
  description: "",
  adoptionStatus: "AVAILABLE",
  goodWithChildren: true,
  goodWithDogs: false,
  goodWithCats: false,
  vaccinated: true,
  neutered: false,
  houseTrained: false,
};

const photoLimit = 8;
const photoMinimum = 2;

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-[#fffdf9] px-4 py-3 outline-none transition placeholder:text-black/30 focus:border-black/25";

type ToggleField = {
  field: keyof Pick<
    PetFormValues,
    | "goodWithChildren"
    | "goodWithDogs"
    | "goodWithCats"
    | "vaccinated"
    | "neutered"
    | "houseTrained"
  >;
};

const toggleFields: ToggleField[] = [
  { field: "goodWithChildren" },
  { field: "goodWithDogs" },
  { field: "goodWithCats" },
  { field: "vaccinated" },
  { field: "neutered" },
  { field: "houseTrained" },
];

function buildFileUrls(files: File[]) {
  return files.map((file) => URL.createObjectURL(file));
}

function buildPetSummary(
  values: Pick<
    PetFormValues,
    "ageYears" | "ageMonths" | "gender" | "size" | "location"
  >,
) {
  const ageParts = [
    values.ageYears ? `${values.ageYears} év` : null,
    values.ageMonths ? `${values.ageMonths} hónap` : null,
  ].filter(Boolean);

  const ageLabel = ageParts.length > 0 ? ageParts.join(" · ") : "Fiatal";

  return `${ageLabel} · ${values.size} · ${values.gender} · ${values.location || "Location"}`;
}

export default function PetsCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const editingPetId = searchParams.get("edit");
  const isEditing = Boolean(editingPetId);
  const genderOptions: Array<{ value: PetGender; label: string }> = [
    { value: "UNKNOWN", label: t("petForm.unknown") },
    { value: "MALE", label: t("petForm.male") },
    { value: "FEMALE", label: t("petForm.female") },
  ];
  const sizeOptions: Array<{ value: PetSize; label: string }> = [
    { value: "SMALL", label: t("petForm.small") },
    { value: "MEDIUM", label: t("petForm.medium") },
    { value: "LARGE", label: t("petForm.large") },
    { value: "EXTRA_LARGE", label: t("petForm.extraLarge") },
  ];
  const statusOptions: Array<{
    value: PetFormValues["adoptionStatus"];
    label: string;
  }> = [
    { value: "AVAILABLE", label: t("status.available") },
    { value: "RESERVED", label: t("status.reserved") },
    { value: "ADOPTED", label: t("status.adopted") },
  ];
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [breedSearch, setBreedSearch] = useState("");
  const [breedOptions, setBreedOptions] = useState<BreedRecord[]>([]);
  const [isSearchingBreeds, setIsSearchingBreeds] = useState(false);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesRecord[]>([]);
  const [isSearchingSpecies, setIsSearchingSpecies] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationSuggestion[]>(
    [],
  );
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);

  const petForm = useForm<PetFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues,
  });

  const watchedValues = petForm.watch();
  const species = watchedValues.species;
  const breedId = watchedValues.breedId;
  const locationSearch = watchedValues.location;
  const existingPetQuery = useQuery({
    queryKey: ["pet", editingPetId],
    queryFn: () => getPet(editingPetId ?? ""),
    enabled: isEditing,
  });

  useEffect(() => {
    const pet = existingPetQuery.data;

    if (!pet) {
      return;
    }

    petForm.reset({
      name: pet.name,
      species: pet.species,
      breedId: pet.breedId ?? "",
      ageYears: pet.ageYears?.toString() ?? "",
      ageMonths: pet.ageMonths?.toString() ?? "",
      gender: pet.gender,
      size: pet.size,
      location: pet.location,
      description: pet.description,
      adoptionStatus: pet.adoptionStatus,
      goodWithChildren: pet.goodWithChildren,
      goodWithDogs: pet.goodWithDogs,
      goodWithCats: pet.goodWithCats,
      vaccinated: pet.vaccinated,
      neutered: pet.neutered,
      houseTrained: pet.houseTrained,
    });
    setBreedSearch(getLocalizedBreedName(pet.breedRecord, i18n.language) ?? "");
    setSpeciesSearch(
      pet.speciesRecord
        ? getLocalizedSpeciesName(pet.speciesRecord, i18n.language)
        : pet.species,
    );
    setSelectedLocation(
      pet.latitude !== null &&
        pet.latitude !== undefined &&
        pet.longitude !== null &&
        pet.longitude !== undefined
        ? {
            label: pet.location,
            city: pet.city ?? null,
            latitude: pet.latitude,
            longitude: pet.longitude,
          }
        : null,
    );
    setExistingPhotoUrls(pet.photoUrls ?? []);
  }, [existingPetQuery.data, i18n.language, petForm]);

  useEffect(() => {
    const search = speciesSearch.trim();

    if (species || search.length < 2) {
      setSpeciesOptions([]);
      setIsSearchingSpecies(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingSpecies(true);
      try {
        setSpeciesOptions(await listSpecies(search, 12, i18n.language));
      } catch {
        setSpeciesOptions([]);
      } finally {
        setIsSearchingSpecies(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [i18n.language, species, speciesSearch]);

  useEffect(() => {
    const search = breedSearch.trim();

    if (breedId || search.length < 2) {
      setBreedOptions([]);
      setIsSearchingBreeds(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearchingBreeds(true);

      try {
        setBreedOptions(await listBreeds(search, species, 12, i18n.language));
      } catch {
        setBreedOptions([]);
      } finally {
        setIsSearchingBreeds(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [breedId, breedSearch, i18n.language, species]);

  useEffect(() => {
    const search = locationSearch.trim();

    if (selectedLocation || search.length < 3) {
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
  }, [locationSearch, selectedLocation]);

  useEffect(() => {
    const urls = buildFileUrls(selectedPhotos);
    setPhotoPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedPhotos]);

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const saveMutation = useMutation({
    mutationFn: (values: Parameters<typeof createPet>[0]) =>
      isEditing
        ? updatePet(editingPetId ?? "", {
            ...values,
            photos: values.photos.length > 0 ? values.photos : undefined,
          })
        : createPet(values),
    onSuccess: async () => {
      showSuccess(isEditing ? "Pet listing updated." : t("petForm.created"));
      petForm.reset(defaultValues);
      setBreedSearch("");
      setBreedOptions([]);
      setSpeciesSearch("");
      setSpeciesOptions([]);
      setSelectedPhotos([]);
      setPhotoError(null);
      navigate("/my-listings");
    },
    onError: (error) => {
      showError(
        error instanceof Error ? error.message : t("petForm.createFailed"),
      );
    },
  });

  const handleSelectPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots =
      photoLimit - existingPhotoUrls.length - selectedPhotos.length;

    if (remainingSlots <= 0) {
      setPhotoError(t("petForm.photoLimit", { count: photoLimit }));
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const rejectedCount = files.length - acceptedFiles.length;

    setSelectedPhotos((current) => [...current, ...acceptedFiles]);
    setPhotoError(
      rejectedCount > 0
        ? t("petForm.remainingPhotos", { count: remainingSlots })
        : null,
    );
  };

  const removePhoto = (index: number) => {
    setPhotoError(null);
    setSelectedPhotos((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const renderPhotoSlot = (index: number) => {
    const existingPhotoUrl = existingPhotoUrls[index];
    const selectedPhotoIndex = index - existingPhotoUrls.length;
    const file = selectedPhotos[selectedPhotoIndex];
    const preview = photoPreviews[selectedPhotoIndex];

    if (existingPhotoUrl) {
      return (
        <div
          key={existingPhotoUrl}
          className="aspect-[4/4.8] overflow-hidden rounded-[1.5rem] border border-black/10 bg-black/5 shadow-sm"
        >
          <img
            src={`${import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")}${existingPhotoUrl}`}
            alt={t("petForm.uploadedPhoto", { index: index + 1 })}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    if (!file) {
      return (
        <button
          key={`empty-${index}`}
          type="button"
          onClick={openPhotoPicker}
          className="group flex aspect-[4/4.8] items-center justify-center rounded-[1.5rem] border border-dashed border-black/15 bg-[#fffdf9] text-black/35 transition hover:border-[#ff86c8] hover:bg-[#fff7fb]"
        >
          <span className="text-4xl font-light transition group-hover:text-[#ff86c8]">
            +
          </span>
        </button>
      );
    }

    return (
      <div
        key={`${file.name}-${file.lastModified}-${index}`}
        className="group relative aspect-[4/4.8] overflow-hidden rounded-[1.5rem] border border-black/10 bg-black/5 shadow-sm"
      >
        <img
          src={preview}
          alt={t("petForm.uploadedPhoto", { index: index + 1 })}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={() => removePhoto(index)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base font-semibold text-black shadow-md transition hover:bg-white"
          aria-label={t("petForm.removePhoto", { index: index + 1 })}
        >
          ×
        </button>
      </div>
    );
  };

  const toggleField = (field: ToggleField["field"]) => {
    const currentValue = petForm.getValues(field);

    petForm.setValue(field, !currentValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onSubmit = petForm.handleSubmit(async (values) => {
    const trimmedPhotos = selectedPhotos.slice(0, photoLimit);
    const totalPhotoCount = existingPhotoUrls.length + trimmedPhotos.length;

    if (totalPhotoCount < photoMinimum) {
      setPhotoError(t("petForm.photoMinimum", { count: photoMinimum }));
      return;
    }

    if (totalPhotoCount > photoLimit) {
      setPhotoError(t("petForm.photoLimit", { count: photoLimit }));
      return;
    }

    setPhotoError(null);

    await saveMutation.mutateAsync({
      ...values,
      ...(selectedLocation
        ? {
            city: selectedLocation.city ?? undefined,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }
        : {}),
      photos: trimmedPhotos,
    });
  });

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(254,200,233,0.28),_transparent_34%),radial-gradient(circle_at_85%_10%,_rgba(255,216,176,0.32),_transparent_30%),linear-gradient(180deg,_#fffdf9_0%,_#fff7ef_100%)] px-4 pb-16 pt-28 sm:px-6 lg:px-10">
      <Link
        to="/pets"
        className="absolute right-6 top-6 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-black shadow-sm backdrop-blur transition hover:bg-white"
      >
        {t("petForm.backToBrowse")}
      </Link>

      <div className="mx-auto grid w-full max-w-7xl gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
            {t("petForm.eyebrow")}
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {t("petForm.title")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/70">
              {t("petForm.description", {
                minimum: photoMinimum,
                maximum: photoLimit,
              })}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              t("petForm.guidancePhotos", {
                minimum: photoMinimum,
                maximum: photoLimit,
              }),
              t("petForm.guidanceDetails"),
              t("petForm.guidanceReview"),
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.75rem] border border-black/8 bg-white/80 p-4 text-sm leading-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-4 px-1 pt-1">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  {t("petForm.photos")}
                </h2>
                <p className="text-sm text-black/55">
                  {t("petForm.photosHint")}
                </p>
              </div>

              <button
                type="button"
                onClick={openPhotoPicker}
                className="rounded-full bg-[#fec8e9] px-4 py-2 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(254,200,233,0.45)] transition hover:bg-[#ffb9df]"
              >
                {t("petForm.addPhotos")}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: photoLimit }, (_, index) =>
                renderPhotoSlot(index),
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-black/8 bg-[#fffdf9] px-4 py-3 text-sm text-black/60">
              <span>
                {t("petForm.selectedPhotos", {
                  count: existingPhotoUrls.length + selectedPhotos.length,
                  maximum: photoLimit,
                })}
              </span>
              <span>{t("petForm.photoMinimum", { count: photoMinimum })}</span>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleSelectPhotos}
            />
          </div>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[2rem] border border-black/8 bg-white/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.1)] backdrop-blur md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-black/50">
                  {t("petForm.registration")}
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-black">
                  {t("petForm.newListing")}
                </h2>
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="relative block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.name")}
                  </span>
                  <input
                    className={inputClassName}
                    placeholder="Luna"
                    aria-invalid={Boolean(petForm.formState.errors.name)}
                    {...petForm.register("name", {
                      required: t("petForm.nameRequired"),
                    })}
                  />
                  {petForm.formState.errors.name ? (
                    <span className="text-sm text-[#b45309]">
                      {petForm.formState.errors.name.message}
                    </span>
                  ) : null}
                </label>

                <div className="relative space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.species")}
                  </span>
                  <input
                    className={inputClassName}
                    value={speciesSearch}
                    placeholder={t("pets.search")}
                    aria-invalid={Boolean(petForm.formState.errors.species)}
                    onChange={(event) => {
                      setSpeciesSearch(event.target.value);
                      petForm.setValue("species", "", { shouldDirty: true });
                      petForm.setValue("breedId", "", { shouldDirty: true });
                      setBreedSearch("");
                    }}
                  />
                  <input
                    type="hidden"
                    {...petForm.register("species", {
                      required: t("petForm.speciesRequired"),
                    })}
                  />
                  {speciesSearch.trim().length >= 2 && !species ? (
                    <div className="absolute z-10 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                      {isSearchingSpecies ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("common.loading")}
                        </p>
                      ) : null}
                      {!isSearchingSpecies && speciesOptions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("pets.none")}
                        </p>
                      ) : null}
                      {!isSearchingSpecies
                        ? speciesOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className="block w-full px-4 py-3 text-left text-sm text-black transition hover:bg-[#fff7fb]"
                              onClick={() => {
                                petForm.setValue("species", option.enName, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                petForm.setValue("breedId", "", {
                                  shouldDirty: true,
                                });
                                setSpeciesSearch(
                                  getLocalizedSpeciesName(
                                    option,
                                    i18n.language,
                                  ),
                                );
                                setBreedSearch("");
                                setSpeciesOptions([]);
                              }}
                            >
                              {getLocalizedSpeciesName(option, i18n.language)}
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                  {petForm.formState.errors.species ? (
                    <span className="text-sm text-[#b45309]">
                      {petForm.formState.errors.species.message}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.breed")}
                  </span>
                  <input
                    className={inputClassName}
                    value={breedSearch}
                    placeholder={t("pets.search")}
                    onChange={(event) => {
                      setBreedSearch(event.target.value);
                      petForm.setValue("breedId", "", { shouldDirty: true });
                    }}
                  />
                  <input type="hidden" {...petForm.register("breedId")} />
                  {breedSearch.trim().length >= 2 ? (
                    <div className="absolute z-10 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                      {isSearchingBreeds ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("common.loading")}
                        </p>
                      ) : null}
                      {!isSearchingBreeds && breedOptions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("pets.none")}
                        </p>
                      ) : null}
                      {!isSearchingBreeds
                        ? breedOptions.map((breed) => (
                            <button
                              key={breed.id}
                              type="button"
                              className="block w-full px-4 py-3 text-left text-sm text-black transition hover:bg-[#fff7fb]"
                              onClick={() => {
                                petForm.setValue("breedId", breed.id, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                setBreedSearch(
                                  getLocalizedBreedName(breed, i18n.language) ??
                                    "",
                                );
                                setBreedOptions([]);
                              }}
                            >
                              {getLocalizedBreedName(breed, i18n.language)}
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.location")}
                  </span>
                  <input
                    className={inputClassName}
                    placeholder="Budapest"
                    aria-invalid={Boolean(petForm.formState.errors.location)}
                    onFocus={() => setIsLocationFocused(true)}
                    {...petForm.register("location", {
                      required: t("petForm.locationRequired"),
                      onChange: () => {
                        setSelectedLocation(null);
                        setLocationOptions([]);
                      },
                    })}
                  />
                  {isLocationFocused && locationSearch.trim().length >= 3 ? (
                    <div className="absolute z-10 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                      {isSearchingLocations ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("common.loading")}
                        </p>
                      ) : null}
                      {!isSearchingLocations && locationOptions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-black/55">
                          {t("petForm.noLocations")}
                        </p>
                      ) : null}
                      {!isSearchingLocations
                        ? locationOptions.map((option) => (
                            <button
                              key={`${option.latitude}-${option.longitude}`}
                              type="button"
                              className="block w-full px-4 py-3 text-left text-sm text-black transition hover:bg-[#fff7fb]"
                              onClick={() => {
                                petForm.setValue("location", option.label, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                setSelectedLocation(option);
                                setIsLocationFocused(false);
                                setLocationOptions([]);
                              }}
                            >
                              <span className="block font-medium">
                                {option.label}
                              </span>
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                  {petForm.formState.errors.location ? (
                    <span className="text-sm text-[#b45309]">
                      {petForm.formState.errors.location.message}
                    </span>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.ageYears")}
                  </span>
                  <input
                    type="number"
                    min="0"
                    className={inputClassName}
                    placeholder="3"
                    {...petForm.register("ageYears")}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.ageMonths")}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    className={inputClassName}
                    placeholder="6"
                    {...petForm.register("ageMonths")}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.gender")}
                  </span>
                  <select
                    className={inputClassName}
                    {...petForm.register("gender")}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.size")}
                  </span>
                  <select
                    className={inputClassName}
                    {...petForm.register("size")}
                  >
                    {sizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-black/70">
                    {t("petForm.status")}
                  </span>
                  <select
                    className={inputClassName}
                    {...petForm.register("adoptionStatus")}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-black/70">
                  {t("petForm.descriptionLabel")}
                </span>
                <textarea
                  rows={5}
                  className={inputClassName}
                  placeholder={t("petForm.descriptionPlaceholder")}
                  aria-invalid={Boolean(petForm.formState.errors.description)}
                  {...petForm.register("description", {
                    required: t("petForm.descriptionRequired"),
                    minLength: {
                      value: 20,
                      message: t("petForm.descriptionMin", { count: 20 }),
                    },
                  })}
                />
                {petForm.formState.errors.description ? (
                  <span className="text-sm text-[#b45309]">
                    {petForm.formState.errors.description.message}
                  </span>
                ) : null}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {toggleFields.map((item) => {
                  const active = watchedValues[item.field];

                  return (
                    <button
                      key={item.field}
                      type="button"
                      onClick={() => toggleField(item.field)}
                      className={`flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-[#ff86c8] bg-[#fec8e9] text-black shadow-[0_16px_40px_rgba(254,200,233,0.55)]"
                          : "border-black/10 bg-[#fffdf9] text-black/70 hover:border-black/20 hover:bg-[#fff9fd]"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {t(`pets.${item.field}`)}
                        </span>
                        <span className="block text-xs opacity-70">
                          {t(`petForm.traitHints.${item.field}`)}
                        </span>
                      </span>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition ${
                          active
                            ? "border-black/15 bg-white text-black"
                            : "border-black/10 bg-white/70 text-black/50"
                        }`}
                      >
                        {active ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {photoError ? (
                <p className="text-sm text-[#b45309]">{photoError}</p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(254,200,233,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ffb9df] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? t("petForm.saving")
                  : isEditing
                    ? "Save changes"
                    : t("petForm.submit")}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
