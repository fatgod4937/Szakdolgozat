"use client";

import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthSession from "../hooks/useAuthSession";
import { listChatThreads, type ChatMessageRecord } from "../utils/chat-api";
import { getCurrentUserId } from "../utils/token-storage";
import { useTranslation } from "react-i18next";

function getDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
  unknownLabel: string,
) {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || unknownLabel;
}

function getLatestMessage(
  messages: ChatMessageRecord[],
): ChatMessageRecord | null {
  if (!messages.length) {
    return null;
  }

  return messages[messages.length - 1];
}

function formatThreadDate(
  value: string | null | undefined,
  locale: string,
  newLabel: string,
) {
  if (!value) {
    return newLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ChatsPage() {
  const { isLoading, isAuthenticated } = useAuthSession();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US";

  const threadsQuery = useQuery({
    queryKey: ["chat-threads"],
    queryFn: listChatThreads,
    enabled: isAuthenticated,
  });

  const threads = threadsQuery.data?.threads ?? [];
  const currentUserId = getCurrentUserId();

  const sortedThreads = useMemo(
    () =>
      [...threads].sort((left, right) => {
        const leftDate = new Date(
          left.lastMessageAt ?? left.createdAt,
        ).getTime();
        const rightDate = new Date(
          right.lastMessageAt ?? right.createdAt,
        ).getTime();
        return rightDate - leftDate;
      }),
    [threads],
  );

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] pt-[calc(5rem+env(safe-area-inset-top))] sm:pt-24">
      <div className="mx-auto w-full max-w-6xl px-6 pb-12 lg:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/45">
              {t("chats.inbox")}
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-black">
              {t("chats.title")}
            </h1>
          </div>

          <Link
            to="/pets"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white"
          >
            {t("chats.browsePets")}
          </Link>
        </div>

        {threadsQuery.isLoading ? (
          <div className="rounded-[2rem] border border-black/10 bg-white/80 p-8 text-sm text-black/60">
            {t("chats.loading")}
          </div>
        ) : null}

        {!threadsQuery.isLoading && sortedThreads.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/80 p-10 text-center text-sm text-black/60">
            {t("chats.empty")}
          </div>
        ) : null}

        <div className="space-y-4">
          {sortedThreads.map((thread) => {
            const peer =
              thread.ownerId === currentUserId ? thread.adopter : thread.owner;
            const latestMessage = getLatestMessage(thread.messages ?? []);
            const hasUnreadMessages = thread.unreadCount > 0;

            return (
              <Link
                key={thread.id}
                to={`/chat/thread/${thread.id}`}
                className="block rounded-[2rem] border border-black/8 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {thread.pet.photoUrls[0] ? (
                      <img
                        src={
                          thread.pet.photoUrls[0].startsWith("http")
                            ? thread.pet.photoUrls[0]
                            : `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ?? "http://192.168.0.100:3000"}${thread.pet.photoUrls[0]}`
                        }
                        alt={thread.pet.name}
                        className="h-16 w-16 rounded-[1.25rem] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#fff3fa] text-xs font-semibold text-black/60">
                        PET
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold text-black">
                          {thread.pet.name}
                        </p>
                        {hasUnreadMessages ? (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
                            aria-label="New message"
                          >
                            !
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-black/60">
                        {t("chats.with", {
                          name: getDisplayName(
                            peer?.firstName,
                            peer?.lastName,
                            t("chats.unknownUser"),
                          ),
                        })}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`text-left text-sm sm:text-right ${hasUnreadMessages ? "font-semibold text-red-700" : "text-black/50"}`}
                  >
                    <p>
                      {formatThreadDate(
                        thread.lastMessageAt ?? thread.createdAt,
                        locale,
                        t("chats.new"),
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.25rem] bg-[#fffdf9] p-4">
                  <p className="text-sm leading-7 text-black/70 line-clamp-2">
                    {latestMessage?.content ??
                      (latestMessage
                        ? hasUnreadMessages
                          ? t("chats.encryptedMessage")
                          : t("chats.noNewMessages")
                        : t("chats.noMessages"))}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
