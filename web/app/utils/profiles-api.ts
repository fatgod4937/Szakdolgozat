import { deleteJson, getJson, postJson } from "./api";
import type { LandingPetRecord } from "./pets-api";

export type ProfilePetRecord = LandingPetRecord & {
  adoptionStatus: "AVAILABLE" | "RESERVED" | "ADOPTED";
};

export type ProfileComment = {
  id: string;
  content: string;
  isRemoved?: boolean;
  disputeStatus?: "NONE" | "OPEN" | "RESOLVED";
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string | null;
  };
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: ProfileComment["author"];
  }>;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: "USER" | "ADMIN" | "SHELTER";
  profilePictureUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  shelter?: { id: string; name: string } | null;
  currentListings: ProfilePetRecord[];
  previousPets: ProfilePetRecord[];
};

export type ShelterProfile = {
  id: string;
  name: string;
  description?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  isVerified: boolean;
  owner?: {
    id: string;
    email: string;
    phoneNumber?: string | null;
    profilePictureUrl?: string | null;
    bio?: string | null;
    location?: string | null;
  } | null;
  currentListings: ProfilePetRecord[];
  previousPets: ProfilePetRecord[];
};

export type DisputedProfileComment = {
  id: string;
  targetType: "USER" | "SHELTER";
  targetId: string;
  content: string;
  disputeReason?: string | null;
  disputedAt?: string | null;
  createdAt: string;
  author: ProfileComment["author"];
};

export function getUserProfile(id: string) {
  return getJson<UserProfile>(`/profiles/users/${id}`);
}

export function getShelterProfile(id: string) {
  return getJson<ShelterProfile>(`/profiles/shelters/${id}`);
}

export function listProfileComments(targetType: "USER" | "SHELTER", targetId: string) {
  return getJson<ProfileComment[]>(`/profiles/${targetType}/${targetId}/comments`);
}

export function createProfileComment(
  targetType: "USER" | "SHELTER",
  targetId: string,
  content: string,
  parentId?: string,
) {
  return postJson<ProfileComment>(`/profiles/${targetType}/${targetId}/comments`, {
    content,
    parentId,
  }, true);
}

export function disputeProfileComment(id: string, reason: string) {
  return postJson<{ id: string; disputeStatus: "OPEN" }>(
    `/profiles/comments/${id}/dispute`,
    { reason },
    true,
  );
}

export function listDisputedProfileComments() {
  return getJson<DisputedProfileComment[]>("/admin/profile-comments/disputes");
}

export function removeProfileComment(id: string) {
  return deleteJson<{ id: string; isRemoved: boolean }>(
    `/admin/profile-comments/${id}`,
  );
}
