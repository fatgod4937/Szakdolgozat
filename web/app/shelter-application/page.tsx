"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../utils/auth-api";
import {
  getMyShelterApplication,
  submitShelterApplication,
} from "../utils/shelter-api";
import { showError, showSuccess } from "../utils/notification";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function ShelterApplicationPage() {
  const queryClient = useQueryClient();
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });
  const applicationQuery = useQuery({
    queryKey: ["my-shelter-application"],
    queryFn: getMyShelterApplication,
    enabled: currentUserQuery.data?.role === "SHELTER",
    retry: false,
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    const application = applicationQuery.data;
    if (!application) {
      return;
    }

    setName(application.name);
    setDescription(application.description ?? "");
    setCity(application.city ?? "");
    setContactEmail(application.contactEmail ?? "");
    setWebsiteUrl(application.websiteUrl ?? "");
  }, [applicationQuery.data]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitShelterApplication(
        { name, description, city, contactEmail, websiteUrl },
        documents,
      ),
    onSuccess: () => {
      setDocuments([]);
      void queryClient.invalidateQueries({
        queryKey: ["my-shelter-application"],
      });
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      showSuccess("Your shelter application has been submitted for review.");
    },
    onError: (error) =>
      showError(
        error instanceof Error
          ? error.message
          : "Could not submit the shelter application.",
      ),
  });

  if (currentUserQuery.isPending) {
    return null;
  }

  if (currentUserQuery.data?.role !== "SHELTER") {
    return <Navigate to="/pets" replace />;
  }

  const application = applicationQuery.data;
  const isApproved = application?.applicationStatus === "APPROVED";
  const canResubmit =
    !application || application.applicationStatus === "DECLINED";

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          Shelter application
        </p>
        <h1 className="mt-2 text-4xl font-semibold">
          Verify your shelter
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-black/65">
          Provide your shelter details and 1–5 documents. An administrator
          manually reviews each application before the shelter can publish pet
          listings.
        </p>

        {application?.applicationStatus === "PENDING" ? (
          <div className="mt-8 rounded-2xl border border-[#aa2f75]/30 bg-[#fff3f8] p-5">
            <h2 className="font-semibold">Application under review</h2>
            <p className="mt-2 text-sm leading-6 text-black/65">
              Your documents have been submitted. We will notify you through
              the application status when the review is complete.
            </p>
          </div>
        ) : null}
        {isApproved ? (
          <div className="mt-8 rounded-2xl border border-green-700/25 bg-green-50 p-5">
            <h2 className="font-semibold text-green-900">
              Shelter application approved
            </h2>
            <p className="mt-2 text-sm leading-6 text-green-900/75">
              Your shelter is verified and can now create pet listings.
            </p>
          </div>
        ) : null}
        {application?.applicationStatus === "DECLINED" ? (
          <div className="mt-8 rounded-2xl border border-red-700/25 bg-red-50 p-5">
            <h2 className="font-semibold text-red-900">
              Changes are required
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-900/75">
              {application.reviewNote || "Please correct your application and resubmit it."}
            </p>
          </div>
        ) : null}

        {canResubmit ? (
          <form
            className="mt-8 space-y-5 rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              if (documents.length < 1 || documents.length > 5) {
                showError("Upload between 1 and 5 documents.");
                return;
              }
              submitMutation.mutate();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">Shelter name</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/35"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/35"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">City</span>
                <input
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/35"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Contact email</span>
                <input
                  required
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/35"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Website (optional, HTTPS)
              </span>
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black/35"
                placeholder="https://example.org"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Verification documents
              </span>
              <input
                required
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                multiple
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  const invalidFile = selectedFiles.find(
                    (file) =>
                      !ACCEPTED_TYPES.includes(file.type) ||
                      file.size > MAX_FILE_SIZE_BYTES,
                  );
                  if (invalidFile) {
                    showError("Documents must be PDF, PNG, JPG, or JPEG files up to 10 MB.");
                    event.target.value = "";
                    setDocuments([]);
                    return;
                  }
                  setDocuments(selectedFiles);
                }}
                className="block w-full text-sm"
              />
              <span className="block text-xs leading-5 text-black/55">
                Upload 1–5 PDF, PNG, JPG, or JPEG documents. Maximum 10 MB per
                document.
              </span>
            </label>
            {documents.length > 0 ? (
              <ul className="space-y-1 text-sm text-black/70">
                {documents.map((document) => (
                  <li key={`${document.name}-${document.lastModified}`}>
                    {document.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {submitMutation.isPending
                ? "Submitting application..."
                : "Submit for review"}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
