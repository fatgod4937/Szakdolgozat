import { deleteJson, getJson, patchJson } from "./api";
import type {
  PaginatedPetsResponse,
  PetAdoptionStatus,
  PetRecord,
} from "./pets-api";

export type ShelterRecord = {
  id: string;
  name: string;
  description?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SHELTER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deactivation?: { reason?: string | null; deactivatedAt: string } | null;
};

export function listAdminShelters() {
  return getJson<ShelterRecord[]>("/admin/shelters");
}

export function setShelterApproval(id: string, isVerified: boolean) {
  return patchJson<ShelterRecord>(`/admin/shelters/${id}/approval`, {
    isVerified,
  });
}

export function listAdminPets(page = 1, limit = 10, search = "") {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search.trim()) {
    searchParams.set("search", search.trim());
  }

  return getJson<PaginatedPetsResponse>(
    `/admin/pets?${searchParams.toString()}`,
  );
}

export function setAdminPetStatus(
  id: string,
  adoptionStatus: PetAdoptionStatus,
) {
  return patchJson<PetRecord>(`/admin/pets/${id}`, { adoptionStatus });
}

export function deleteAdminPet(id: string) {
  return deleteJson<{ deleted: boolean }>(`/admin/pets/${id}`);
}

export function listAdminUsers(search = "") {
  const searchParams = new URLSearchParams();

  if (search.trim()) {
    searchParams.set("search", search.trim());
  }

  const query = searchParams.toString();
  return getJson<AdminUserRecord[]>(`/admin/users${query ? `?${query}` : ""}`);
}

export function setAdminUserStatus(
  id: string,
  isActive: boolean,
  reason?: string,
) {
  return patchJson<AdminUserRecord>(`/admin/users/${id}/status`, {
    isActive,
    reason,
  });
}
