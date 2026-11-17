import { deleteJson, getJson, patchJson } from "./api";
import { getAccessToken } from "./token-storage";
import type {
  PaginatedPetsResponse,
  PetAdoptionStatus,
  PetRecord,
} from "./pets-api";
import type { ShelterApplication } from "./shelter-api";

export type ShelterRecord = ShelterApplication & {
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

export function reviewShelterApplication(
  id: string,
  status: "APPROVED" | "DECLINED",
  reviewNote?: string,
) {
  return patchJson<ShelterRecord>(`/admin/shelters/${id}/review`, {
    status,
    reviewNote,
  });
}

export async function getAdminShelterDocument(documentId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/shelter-documents/${documentId}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken() ?? ""}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Could not open the shelter document.");
  }

  return response.blob();
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
