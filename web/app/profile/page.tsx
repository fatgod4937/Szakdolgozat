import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { showError, showSuccess } from "../utils/notification";
import { getCurrentUser } from "../utils/auth-api";
import {
  createDonationCheckout,
  type DonationCurrency,
} from "../utils/donations-api";
import {
  createProfileComment,
  disputeProfileComment,
  getShelterProfile,
  getUserProfile,
  listProfileComments,
  type ProfileComment,
  type ProfilePetRecord,
  type ShelterProfile,
  type UserProfile,
} from "../utils/profiles-api";

function getImageBaseUrl() {
  const apiUrl =
    import.meta.env.VITE_API_URL ?? "https://192.168.0.100:3000/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

function getPetImageUrl(photoUrl: string) {
  return photoUrl.startsWith("http://") || photoUrl.startsWith("https://")
    ? photoUrl
    : `${getImageBaseUrl()}${photoUrl}`;
}

const DONATION_PRESETS: Record<DonationCurrency, number[]> = {
  huf: [1000, 2500, 5000, 10000],
  eur: [5, 10, 25, 50],
};

function DonationBox({
  shelterId,
  shelterName,
}: {
  shelterId: string;
  shelterName: string;
}) {
  const [searchParams] = useSearchParams();
  const [currency, setCurrency] = useState<DonationCurrency>("huf");
  const [amount, setAmount] = useState("2500");
  const [message, setMessage] = useState("");
  const donationResult = searchParams.get("donation");
  const mutation = useMutation({
    mutationFn: () =>
      createDonationCheckout(shelterId, {
        amount: Number(amount),
        currency,
        message: message.trim() || undefined,
      }),
    onSuccess: (data) => {
      if (data.url) {
        window.location.assign(data.url);
      }
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : "Could not start the donation.",
      ),
  });

  const [open, setOpen] = useState(false);
  const [thanksOpen, setThanksOpen] = useState(donationResult === "success");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {thanksOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setThanksOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-4xl">🐾</p>
            <h2 className="mt-2 text-xl font-semibold">Thank you!</h2>
            <p className="mt-2 text-sm leading-6 text-black/65">
              Your donation to {shelterName} was received. It may take a moment
              to appear in their list. You're helping animals find a home.
            </p>
            <button
              type="button"
              onClick={() => setThanksOpen(false)}
              className="mt-4 rounded-full bg-[#fec8e9] px-6 py-2 text-sm font-semibold"
            >
              Close
            </button>
          </section>
        </div>
      ) : null}      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[#fec8e9] px-5 py-2 text-sm font-semibold"
      >
        Donate
      </button>
      {donationResult === "cancelled" ? (
        <span className="rounded-full bg-black/5 px-3 py-1 text-sm">
          Donation cancelled. You were not charged.
        </span>
      ) : null}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Support {shelterName}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-black/50"
                aria-label="Close"
              >
                Ã—
              </button>
            </div>
            <p className="mt-1 text-xs leading-5 text-black/60">
              Pay by card on Stripe's secure page. Floofs never sees your card
              details.
            </p>
            <form
              className="mt-3 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="flex flex-wrap gap-2">
                {DONATION_PRESETS[currency].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      amount === String(preset)
                        ? "border-black bg-black text-white"
                        : "border-black/15 bg-white"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-black/35"
                  aria-label="Donation amount"
                />
                <select
                  value={currency}
                  onChange={(event) => {
                    const next = event.target.value as DonationCurrency;
                    setCurrency(next);
                    setAmount(String(DONATION_PRESETS[next][1]));
                  }}
                  className="rounded-xl border border-black/10 px-2"
                  aria-label="Currency"
                >
                  <option value="huf">HUF</option>
                  <option value="eur">EUR</option>
                </select>
              </div>
              <input
                maxLength={300}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional message"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/35"
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-full bg-[#fec8e9] px-5 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {mutation.isPending ? "Redirecting to Stripe..." : "Donate by card"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PetList({
  title,
  pets,
}: {
  title: string;
  pets: ProfilePetRecord[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-black">{title}</h2>
      {pets.length === 0 ? (
        <p className="mt-3 text-sm text-black/60">No pets to show yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <article
              key={pet.id}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
            >
              <div className="aspect-[4/3] bg-black/5">
                {pet.photoUrls[0] ? (
                  <img
                    src={getPetImageUrl(pet.photoUrls[0])}
                    alt={pet.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{pet.name}</h3>
                <p className="mt-1 text-sm text-black/60">{pet.location}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Comments({
  targetType,
  targetId,
  isProfileOwner,
}: {
  targetType: "USER" | "SHELTER";
  targetId: string;
  isProfileOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const commentsQuery = useQuery({
    queryKey: ["profile-comments", targetType, targetId],
    queryFn: () => listProfileComments(targetType, targetId),
  });
  const refreshComments = () =>
    void queryClient.invalidateQueries({
      queryKey: ["profile-comments", targetType, targetId],
    });
  const commentMutation = useMutation({
    mutationFn: ({
      text,
      parentId,
    }: {
      text: string;
      parentId?: string;
    }) => createProfileComment(targetType, targetId, text, parentId),
    onSuccess: () => {
      setContent("");
      setReplyContent("");
      setReplyingTo(null);
      refreshComments();
    },
    onError: (error) =>
      showError(error instanceof Error ? error.message : "Could not post comment."),
  });
  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      disputeProfileComment(id, reason),
    onSuccess: () => {
      showSuccess("Comment submitted for administrator review.");
      refreshComments();
    },
    onError: (error) =>
      showError(error instanceof Error ? error.message : "Could not dispute comment."),
  });
  const comments = commentsQuery.data ?? [];

  const renderComment = (comment: ProfileComment, isReply = false) => (
    <article
      key={comment.id}
      className={`rounded-xl border border-black/10 bg-white p-4 ${isReply ? "ml-4 mt-3 sm:ml-8" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {comment.author.firstName} {comment.author.lastName}
          </p>
          <p className="text-xs text-black/50">
            {new Date(comment.createdAt).toLocaleDateString()}
          </p>
        </div>
        {!isReply ? (
          <button
            type="button"
            onClick={() => setReplyingTo(comment.id)}
            className="text-sm font-medium text-[#aa2f75] hover:underline"
          >
            Reply
          </button>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black/80">
        {comment.content}
      </p>
      {isProfileOwner && !isReply && comment.disputeStatus !== "OPEN" ? (
        <button
          type="button"
          onClick={() => {
            const reason = window.prompt("Why should this comment be reviewed?");
            if (reason?.trim()) {
              disputeMutation.mutate({ id: comment.id, reason });
            }
          }}
          className="mt-3 text-sm text-black/60 hover:text-black hover:underline"
        >
          Dispute comment
        </button>
      ) : null}
      {comment.disputeStatus === "OPEN" ? (
        <p className="mt-3 text-xs font-medium text-[#aa2f75]">
          Under administrator review
        </p>
      ) : null}
      {!isReply && replyingTo === comment.id ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            commentMutation.mutate({ text: replyContent, parentId: comment.id });
          }}
        >
          <textarea
            required
            maxLength={1000}
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-black/10 p-3 text-sm"
            placeholder="Write a reply"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={commentMutation.isPending}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="rounded-full border border-black/15 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {!isReply ? comment.replies.map((reply) => renderComment({ ...reply, replies: [] }, true)) : null}
    </article>
  );

  return (
    <section className="border-t border-black/10 pt-8">
      <h2 className="text-2xl font-semibold text-black">Comments</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          commentMutation.mutate({ text: content });
        }}
      >
        <textarea
          required
          maxLength={1000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-24 w-full rounded-xl border border-black/10 bg-white p-3 text-sm"
          placeholder="Write a comment"
        />
        <button
          type="submit"
          disabled={commentMutation.isPending}
          className="rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          Post comment
        </button>
      </form>
      <div className="mt-6 space-y-4">
        {comments.map((comment) => renderComment(comment))}
        {!commentsQuery.isPending && comments.length === 0 ? (
          <p className="text-sm text-black/60">No comments yet.</p>
        ) : null}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { type, id } = useParams<{ type: "user" | "shelter"; id: string }>();
  const targetType = type === "shelter" ? "SHELTER" : "USER";
  const profileQuery = useQuery<UserProfile | ShelterProfile>({
    queryKey: ["profile", targetType, id],
    queryFn: () =>
      targetType === "SHELTER" ? getShelterProfile(id ?? "") : getUserProfile(id ?? ""),
    enabled: Boolean(id),
  });
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  if (profileQuery.isPending) return null;
  if (profileQuery.isError || !profileQuery.data || !id) {
    return <p className="px-6 pt-32 text-center">Profile could not be loaded.</p>;
  }

  const isShelter = targetType === "SHELTER";
  const profile = profileQuery.data;
  const shelterProfile = isShelter ? (profile as ShelterProfile) : null;
  const userProfile = !isShelter ? (profile as UserProfile) : null;
  const displayName = shelterProfile
    ? shelterProfile.name
    : `${userProfile!.firstName} ${userProfile!.lastName}`;
  const bio = shelterProfile
    ? shelterProfile.description ?? shelterProfile.owner?.bio
    : userProfile!.bio;
  const location = shelterProfile
    ? shelterProfile.city ?? shelterProfile.owner?.location
    : userProfile!.location;
  const photo = shelterProfile
    ? shelterProfile.owner?.profilePictureUrl
    : userProfile!.profilePictureUrl;
  const email = shelterProfile
    ? shelterProfile.contactEmail ?? shelterProfile.owner?.email
    : userProfile!.email;
  const phone = shelterProfile
    ? shelterProfile.owner?.phoneNumber
    : userProfile!.phoneNumber;
  const isProfileOwner = isShelter
    ? currentUserQuery.data?.id === shelterProfile?.owner?.id
    : currentUserQuery.data?.id === userProfile?.id;

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/pets" className="text-sm font-medium text-[#aa2f75] hover:underline">
          Back to listings
        </Link>
        <header className="mt-5 flex flex-col gap-5 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          {photo ? (
            <img src={getPetImageUrl(photo)} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fec8e9] text-3xl font-semibold">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold">{displayName}</h1>
            {shelterProfile?.isVerified ? (
              <p className="mt-1 text-sm font-medium text-[#aa2f75]">Verified shelter</p>
            ) : null}
            {bio ? <p className="mt-3 max-w-3xl whitespace-pre-wrap text-black/70">{bio}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/65">
              {location ? <span>{location}</span> : null}
              {email ? <a href={`mailto:${email}`} className="hover:underline">{email}</a> : null}
              {phone ? <a href={`tel:${phone}`} className="hover:underline">{phone}</a> : null}
              {shelterProfile?.websiteUrl ? <a href={shelterProfile.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline">{shelterProfile.websiteUrl}</a> : null}
            </div>
          </div>
        </header>
        <div className="mt-10 space-y-10">
          {shelterProfile?.stripeChargesEnabled && !isProfileOwner ? (
            <DonationBox shelterId={id} shelterName={displayName} />
          ) : null}
          <PetList title="Current listings" pets={profile.currentListings} />
          <PetList title="Previous pets" pets={profile.previousPets} />
          <Comments targetType={targetType} targetId={id} isProfileOwner={isProfileOwner} />
        </div>
      </div>
    </section>
  );
}
