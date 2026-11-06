import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDonationSettings,
  updateMyDonationSettings,
} from "../../utils/shelter-api";
import { showError, showSuccess } from "../../utils/notification";

export default function DonationSettingsForm() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["my-shelter-donation-settings"],
    queryFn: getMyDonationSettings,
  });
  const [donationIban, setDonationIban] = useState("");
  const [paypalDonationUrl, setPaypalDonationUrl] = useState("");
  const [donationUrl, setDonationUrl] = useState("");
  const [donationUrlLabel, setDonationUrlLabel] = useState("");

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setDonationIban(settingsQuery.data.donationIban ?? "");
    setPaypalDonationUrl(settingsQuery.data.paypalDonationUrl ?? "");
    setDonationUrl(settingsQuery.data.donationUrl ?? "");
    setDonationUrlLabel(settingsQuery.data.donationUrlLabel ?? "");
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: updateMyDonationSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["my-shelter-donation-settings"],
      });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      showSuccess("Donation settings saved.");
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : "Could not save donation settings.",
      ),
  });

  if (settingsQuery.isPending) {
    return null;
  }

  if (settingsQuery.isError) {
    return (
      <p className="mt-6 text-sm leading-6 text-red-700">
        This shelter account is not linked to a shelter profile yet.
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({
          donationIban,
          paypalDonationUrl,
          donationUrl,
          donationUrlLabel,
        });
      }}
    >
      <p className="text-sm leading-6 text-black/60">
        Floofs only displays these details. Donations are completed directly
        with your bank or chosen provider; no payment credentials are stored.
      </p>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Bank-transfer IBAN</span>
        <input
          value={donationIban}
          onChange={(event) => setDonationIban(event.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35"
          placeholder="HU12 1234 1234 1234 1234 1234 1234"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">PayPal donation URL</span>
        <input
          type="url"
          value={paypalDonationUrl}
          onChange={(event) => setPaypalDonationUrl(event.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35"
          placeholder="https://paypal.me/your-shelter"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Other donation URL</span>
        <input
          type="url"
          value={donationUrl}
          onChange={(event) => setDonationUrl(event.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35"
          placeholder="https://example.org/donate"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Other donation link label</span>
        <input
          maxLength={80}
          value={donationUrlLabel}
          onChange={(event) => setDonationUrlLabel(event.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35"
          placeholder="Donate through our campaign"
        />
      </label>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        Save donation settings
      </button>
    </form>
  );
}
