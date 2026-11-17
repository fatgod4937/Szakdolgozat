import { getJson, patchJson, postFormData } from "./api";

export type ShelterDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

export type ShelterApplication = {
  id: string;
  name: string;
  description?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  applicationStatus: "PENDING" | "APPROVED" | "DECLINED";
  reviewNote?: string | null;
  reviewedAt?: string | null;
  documents: ShelterDocument[];
};

export type ShelterDonationSettings = {
  id: string;
  donationIban?: string | null;
  paypalDonationUrl?: string | null;
  donationUrl?: string | null;
  donationUrlLabel?: string | null;
};

export function getMyDonationSettings() {
  return getJson<ShelterDonationSettings>("/shelters/me/donation-settings");
}

export function updateMyDonationSettings(
  settings: Omit<ShelterDonationSettings, "id">,
) {
  return patchJson<ShelterDonationSettings>(
    "/shelters/me/donation-settings",
    settings,
  );
}

export function getMyShelterApplication() {
  return getJson<ShelterApplication>("/shelters/me/application");
}

export function registerShelter(
  account: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    acceptDataSafety: boolean;
  },
  details: {
    name: string;
    description: string;
    city: string;
    contactEmail: string;
    websiteUrl: string;
  },
  documents: File[],
) {
  const formData = new FormData();
  Object.entries({ ...account, ...details }).forEach(([key, value]) =>
    formData.append(key, String(value)),
  );
  documents.forEach((document) => formData.append("documents", document));
  return postFormData<{ message: string }>(
    "/shelter-registrations",
    formData,
    false,
  );
}

export function submitShelterApplication(
  details: {
    name: string;
    description: string;
    city: string;
    contactEmail: string;
    websiteUrl: string;
  },
  documents: File[],
) {
  const formData = new FormData();
  Object.entries(details).forEach(([key, value]) => formData.append(key, value));
  documents.forEach((document) => formData.append("documents", document));
  return postFormData<ShelterApplication>("/shelters/me/application", formData);
}
