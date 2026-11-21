import { getJson, postJson } from "./api";

export type DonationCurrency = "huf" | "eur";

export type StripeStatus = {
  configured: boolean;
  isVerified: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
};

export type ReceivedDonation = {
  id: string;
  amount: number;
  currency: string;
  message?: string | null;
  paidAt?: string | null;
  donor?: { firstName: string } | null;
};

export function getStripeStatus() {
  return getJson<StripeStatus>("/donations/shelter/status");
}

export function startStripeOnboarding() {
  return postJson<{ url: string }>("/donations/shelter/onboarding", {}, true);
}

export function openStripeDashboard() {
  return postJson<{ url: string }>("/donations/shelter/dashboard", {}, true);
}

export function listReceivedDonations() {
  return getJson<ReceivedDonation[]>("/donations/shelter/received");
}

export function createDonationCheckout(
  shelterId: string,
  donation: { amount: number; currency: DonationCurrency; message?: string },
) {
  return postJson<{ url: string | null }>(
    `/donations/shelters/${shelterId}/checkout`,
    donation,
    true,
  );
}
