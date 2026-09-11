import {
  deleteJson,
  getJson,
  patchFormData,
  postFormData,
  postJson,
} from "./api";

export type PetGender = "MALE" | "FEMALE" | "UNKNOWN";
export type PetSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
export type PetAdoptionStatus = "AVAILABLE" | "RESERVED" | "ADOPTED";

export type PetRecord = {
  id: string;
  name: string;
  species: string;
  speciesId?: string | null;
  speciesRecord?: SpeciesRecord | null;
  breedId?: string | null;
  breedRecord?: BreedRecord | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  gender: PetGender;
  size: PetSize;
  location: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  goodWithChildren: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
  vaccinated: boolean;
  neutered: boolean;
  houseTrained: boolean;
  adoptionStatus: PetAdoptionStatus;
  photoUrls: string[];
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "USER" | "ADMIN" | "SHELTER";
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type BreedRecord = {
  id: string;
  enName: string;
  huName: string;
  speciesId: string;
  species: { enName: string; huName: string };
};

export type SpeciesRecord = {
  id: string;
  enName: string;
  huName: string;
};

export type LocationSuggestion = {
  label: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

export function getLocalizedBreedName(
  breed: BreedRecord | null | undefined,
  language: string,
) {
  if (!breed) return null;
  return language.toLowerCase().startsWith("hu") ? breed.huName : breed.enName;
}

export function getLocalizedSpeciesName(
  species: SpeciesRecord,
  language: string,
) {
  return language.toLowerCase().startsWith("hu")
    ? species.huName
    : species.enName;
}

export type PaginatedPetsResponse = {
  items: PetRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PetListFilters = {
  search?: string;
  species?: string;
  breed?: string;
  breedId?: string;
  gender?: PetGender;
  size?: PetSize;
  adoptionStatus?: PetAdoptionStatus;
  location?: string;
  minAgeYears?: number;
  maxAgeYears?: number;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  vaccinated?: boolean;
  neutered?: boolean;
  houseTrained?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortByDistance?: boolean;
};

export type CreatePetRequest = {
  name: string;
  species: string;
  breedId?: string;
  ageYears?: string;
  ageMonths?: string;
  gender: PetGender;
  size: PetSize;
  location: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  goodWithChildren: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
  vaccinated: boolean;
  neutered: boolean;
  houseTrained: boolean;
  photos: File[];
};

export type UpdatePetRequest = Partial<Omit<CreatePetRequest, "photos">> & {
  photos?: File[];
  adoptionStatus?: PetAdoptionStatus;
};

function appendBoolean(formData: FormData, key: string, value: boolean) {
  formData.append(key, value ? "true" : "false");
}

function appendOptional(formData: FormData, key: string, value?: string) {
  if (value && value.trim().length > 0) {
    formData.append(key, value.trim());
  }
}

function toFormData(request: CreatePetRequest | UpdatePetRequest) {
  const formData = new FormData();

  appendOptional(formData, "name", request.name);
  appendOptional(formData, "species", request.species);
  appendOptional(formData, "breedId", request.breedId);
  appendOptional(formData, "ageYears", request.ageYears);
  appendOptional(formData, "ageMonths", request.ageMonths);
  appendOptional(formData, "gender", request.gender);
  appendOptional(formData, "size", request.size);
  appendOptional(formData, "location", request.location);
  appendOptional(formData, "city", request.city);
  if (typeof request.latitude === "number") {
    formData.append("latitude", String(request.latitude));
  }
  if (typeof request.longitude === "number") {
    formData.append("longitude", String(request.longitude));
  }
  appendOptional(formData, "description", request.description);

  if (typeof request.goodWithChildren === "boolean") {
    appendBoolean(formData, "goodWithChildren", request.goodWithChildren);
  }

  if (typeof request.goodWithDogs === "boolean") {
    appendBoolean(formData, "goodWithDogs", request.goodWithDogs);
  }

  if (typeof request.goodWithCats === "boolean") {
    appendBoolean(formData, "goodWithCats", request.goodWithCats);
  }

  if (typeof request.vaccinated === "boolean") {
    appendBoolean(formData, "vaccinated", request.vaccinated);
  }

  if (typeof request.neutered === "boolean") {
    appendBoolean(formData, "neutered", request.neutered);
  }

  if (typeof request.houseTrained === "boolean") {
    appendBoolean(formData, "houseTrained", request.houseTrained);
  }

  if ("adoptionStatus" in request && request.adoptionStatus) {
    appendOptional(formData, "adoptionStatus", request.adoptionStatus);
  }

  request.photos?.forEach((file) => {
    formData.append("photos", file);
  });

  return formData;
}

export function listPets(page = 1, limit = 10, filters: PetListFilters = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return getJson<PaginatedPetsResponse>(`/pets?${searchParams.toString()}`);
}

export function listBreeds(
  search: string,
  species?: string,
  limit = 12,
  locale?: string,
) {
  const searchParams = new URLSearchParams({ search, limit: String(limit) });

  if (species?.trim()) {
    searchParams.set("species", species.trim());
  }

  if (locale) {
    searchParams.set("locale", locale);
  }

  return getJson<BreedRecord[]>(`/pets/breeds?${searchParams.toString()}`);
}

export function listSpecies(search: string, limit = 12, locale?: string) {
  const searchParams = new URLSearchParams({ search, limit: String(limit) });

  if (locale) {
    searchParams.set("locale", locale);
  }

  return getJson<SpeciesRecord[]>(`/pets/species?${searchParams.toString()}`);
}

export function searchLocations(query: string) {
  return getJson<LocationSuggestion[]>(
    `/pets/locations?query=${encodeURIComponent(query)}`,
  );
}

export function getPet(id: string) {
  return getJson<PetRecord>(`/pets/${id}`);
}

export function listMyPets() {
  return getJson<PetRecord[]>("/pets/mine/listings");
}

export async function listFavoritePets() {
  const favorites = await getJson<PetRecord[] | PetRecord>(
    "/pets/mine/favorites",
  );

  return Array.isArray(favorites) ? favorites : [];
}

export function addFavoritePet(id: string) {
  return postJson<{ favorited: boolean }>(`/pets/${id}/favorite`, {}, true);
}

export function removeFavoritePet(id: string) {
  return deleteJson<{ favorited: boolean }>(`/pets/${id}/favorite`);
}

export function createPet(request: CreatePetRequest) {
  return postFormData<PetRecord>("/pets", toFormData(request));
}

export function updatePet(id: string, request: UpdatePetRequest) {
  return patchFormData<PetRecord>(`/pets/${id}`, toFormData(request));
}

export function deletePet(id: string) {
  return deleteJson<{ deleted: boolean }>(`/pets/${id}`);
}
