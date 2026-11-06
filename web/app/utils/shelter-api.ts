import { getJson, patchJson } from "./api";

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
