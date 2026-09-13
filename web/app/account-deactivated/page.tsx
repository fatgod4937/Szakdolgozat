import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "../utils/api";

type DeactivationStatus = {
  deactivated: boolean;
  reason?: string | null;
  deactivatedAt?: string;
};

export default function AccountDeactivatedPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const statusQuery = useQuery({
    queryKey: ["deactivation-status", email],
    queryFn: () =>
      getJson<DeactivationStatus>(
        `/auth/deactivation-status?email=${encodeURIComponent(email)}`,
        false,
      ),
    enabled: Boolean(email),
  });
  const status = statusQuery.data;

  return (
    <section className="min-h-screen bg-[#fffdf9] px-6 pb-20 pt-32">
      <div className="mx-auto max-w-xl border border-[#fec8e9] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          Account status
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Your profile has been deactivated
        </h1>
        <p className="mt-4 leading-7 text-black/65">
          You cannot sign in or use Floofs while your profile is deactivated.
        </p>
        {status?.deactivatedAt ? (
          <p className="mt-5 text-sm">
            <strong>Deactivated:</strong>{" "}
            {new Date(status.deactivatedAt).toLocaleDateString()}
          </p>
        ) : null}
        {status?.reason ? (
          <p className="mt-3 text-sm">
            <strong>Reason:</strong> {status.reason}
          </p>
        ) : null}
        <Link
          to="/auth"
          className="mt-8 inline-block rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold"
        >
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
