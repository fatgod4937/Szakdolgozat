import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  getStripeStatus,
  listReceivedDonations,
  openStripeDashboard,
  startStripeOnboarding,
} from "../../utils/donations-api";
import { showError } from "../../utils/notification";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function DonationSettingsForm() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const statusQuery = useQuery({
    queryKey: ["stripe-status"],
    queryFn: getStripeStatus,
    retry: false,
  });
  const receivedQuery = useQuery({
    queryKey: ["received-donations"],
    queryFn: listReceivedDonations,
    enabled: statusQuery.data?.chargesEnabled === true,
  });

  // Coming back from Stripe: refresh the status from the API.
  useEffect(() => {
    if (searchParams.get("stripe")) {
      void queryClient.invalidateQueries({ queryKey: ["stripe-status"] });
    }
  }, [queryClient, searchParams]);

  const onError = (error: unknown) =>
    showError(
      error instanceof Error ? error.message : "Something went wrong.",
    );
  const onboardingMutation = useMutation({
    mutationFn: startStripeOnboarding,
    onSuccess: (data) => window.location.assign(data.url),
    onError,
  });
  const dashboardMutation = useMutation({
    mutationFn: openStripeDashboard,
    onSuccess: (data) => window.open(data.url, "_blank", "noopener"),
    onError,
  });

  if (statusQuery.isPending) {
    return null;
  }

  if (statusQuery.isError) {
    return (
      <p className="mt-6 text-sm leading-6 text-red-700">
        {statusQuery.error instanceof Error
          ? statusQuery.error.message
          : "Could not load donation settings."}
      </p>
    );
  }

  const status = statusQuery.data;
  const buttonClass =
    "rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm leading-6 text-black/60">
        Accept card donations through Stripe. Donors pay on Stripe's secure
        page and the money goes to your Stripe account. Floofs never sees or
        stores card details.
      </p>

      {!status.configured ? (
        <p className="rounded-2xl border border-black/10 bg-black/5 p-4 text-sm">
          Card donations are not enabled on this server yet.
        </p>
      ) : !status.isVerified ? (
        <p className="rounded-2xl border border-black/10 bg-black/5 p-4 text-sm">
          Your shelter must be approved by an administrator before you can
          accept donations.
        </p>
      ) : status.chargesEnabled ? (
        <div className="space-y-4">
          <p className="rounded-2xl border border-green-700/25 bg-green-50 p-4 text-sm text-green-900">
            Your Stripe account is active. Donors can now give from your
            shelter profile.
          </p>
          <button
            type="button"
            className={buttonClass}
            disabled={dashboardMutation.isPending}
            onClick={() => dashboardMutation.mutate()}
          >
            Open Stripe dashboard (payouts)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="rounded-2xl border border-[#aa2f75]/30 bg-[#fff3f8] p-4 text-sm">
            {status.connected
              ? status.detailsSubmitted
                ? "Stripe is still reviewing your details. Check back in a little while."
                : "Your Stripe setup is not finished yet. Continue where you left off."
              : "Connect a Stripe account to start accepting donations."}
          </p>
          <button
            type="button"
            className={buttonClass}
            disabled={onboardingMutation.isPending}
            onClick={() => onboardingMutation.mutate()}
          >
            {status.connected ? "Continue Stripe setup" : "Set up donations"}
          </button>
        </div>
      )}

      {status.chargesEnabled ? (
        <section>
          <h3 className="font-semibold">Recent donations</h3>
          {receivedQuery.data && receivedQuery.data.length > 0 ? (
            <ul className="mt-3 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
              {receivedQuery.data.map((donation) => (
                <li key={donation.id} className="p-4 text-sm">
                  <span className="font-semibold">
                    {formatAmount(donation.amount, donation.currency)}
                  </span>{" "}
                  from {donation.donor?.firstName ?? "an anonymous donor"}
                  {donation.paidAt
                    ? ` · ${new Date(donation.paidAt).toLocaleDateString()}`
                    : ""}
                  {donation.message ? (
                    <p className="mt-1 text-black/60">“{donation.message}”</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-black/60">No donations yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
