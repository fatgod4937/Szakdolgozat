"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import useAuthSession from "../hooks/useAuthSession";
import { showError } from "../utils/notification";
import {
  decryptChatMessage,
  encryptChatMessage,
  getOrCreateChatDevice,
  getPublicChatDevice,
  restoreChatKeyBackup,
  type ChatDevice,
} from "../utils/chat-crypto";
import {
  getPetConversation,
  getChatKeyBackup,
  getThreadConversation,
  getThreadChatDevices,
  markChatThreadRead,
  registerChatDevice,
  type ChatMessageRecord,
  type ChatParticipant,
} from "../utils/chat-api";
import { getAccessToken } from "../utils/token-storage";
import { useTranslation } from "react-i18next";
import { getLocalizedBreedName } from "../utils/pets-api";

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;

  return apiUrl.replace(/\/api\/?$/, "");
}

function getDisplayName(
  participant: ChatParticipant | null | undefined,
  unknownLabel: string,
) {
  if (!participant) {
    return unknownLabel;
  }

  return `${participant.firstName} ${participant.lastName}`.trim();
}

function getProfilePictureUrl(profilePictureUrl?: string | null) {
  if (!profilePictureUrl) return null;
  return profilePictureUrl.startsWith("http")
    ? profilePictureUrl
    : `${getSocketBaseUrl()}${profilePictureUrl}`;
}

function getMessageDateLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

type DisplayChatMessage = ChatMessageRecord & {
  plaintext: string;
};

function getMessagePlaintext(
  message: ChatMessageRecord,
  currentUserId: string,
  devices: ChatDevice[],
  labels: { legacy: string; beforeDevice: string; unableToDecrypt: string },
) {
  if (
    !message.ciphertext ||
    !message.nonce ||
    !message.senderDeviceId ||
    !message.keyEnvelopes
  ) {
    return message.content ?? labels.legacy;
  }

  try {
    const currentDevice = getOrCreateChatDevice(currentUserId);
    const hasDeviceEnvelope = message.keyEnvelopes.some(
      (envelope) => envelope.deviceId === currentDevice.id,
    );

    if (!hasDeviceEnvelope) {
      return labels.beforeDevice;
    }

    return (
      decryptChatMessage(
        {
          ciphertext: message.ciphertext,
          nonce: message.nonce,
          senderDeviceId: message.senderDeviceId,
          keyEnvelopes: message.keyEnvelopes,
        },
        currentDevice,
        devices,
      ) ?? labels.unableToDecrypt
    );
  } catch {
    return labels.unableToDecrypt;
  }
}

export default function PetChatPage() {
  const { petId, threadId } = useParams();
  const { isLoading, isAuthenticated } = useAuthSession();
  const socketRef = useRef<Socket | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<DisplayChatMessage[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [chatKeyRevision, setChatKeyRevision] = useState(0);
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US";
  const messageLabels = useMemo(
    () => ({
      legacy: t("chat.legacyUnavailable"),
      beforeDevice: t("chat.beforeDevice"),
      unableToDecrypt: t("chat.unableToDecrypt"),
    }),
    [t],
  );

  const conversationQuery = useQuery({
    queryKey: ["pet-conversation", petId, threadId],
    queryFn: () =>
      threadId
        ? getThreadConversation(threadId)
        : getPetConversation(petId ?? ""),
    enabled: Boolean(petId || threadId) && isAuthenticated,
  });

  const thread = conversationQuery.data?.thread;
  const pet = conversationQuery.data?.pet;
  const currentUserId = conversationQuery.data?.currentUserId;
  const currentDevice = currentUserId
    ? getOrCreateChatDevice(currentUserId)
    : null;

  const devicesQuery = useQuery({
    queryKey: ["chat-devices", thread?.id, currentUserId],
    queryFn: async () => {
      if (!thread?.id || !currentUserId) {
        throw new Error("Unable to initialize encrypted chat.");
      }

      return getThreadChatDevices(thread.id);
    },
    enabled: Boolean(thread?.id && currentUserId),
  });

  const deviceRegistrationMutation = useMutation({
    mutationFn: (device: NonNullable<typeof currentDevice>) =>
      registerChatDevice(getPublicChatDevice(device)),
    onSuccess: () => {
      void devicesQuery.refetch();
    },
  });
  const recoverChatKeyMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !recoveryPassword) {
        throw new Error(t("chat.recoveryPasswordRequired"));
      }

      const { backup } = await getChatKeyBackup();
      if (!backup) {
        throw new Error(t("chat.recoveryBackupMissing"));
      }

      const restoredDevice = restoreChatKeyBackup(
        currentUserId,
        recoveryPassword,
        backup,
      );
      if (!restoredDevice) {
        throw new Error(t("chat.recoveryFailed"));
      }

      await registerChatDevice(getPublicChatDevice(restoredDevice));
    },
    onSuccess: async () => {
      setRecoveryPassword("");
      setChatKeyRevision((value) => value + 1);
      await Promise.all([devicesQuery.refetch(), conversationQuery.refetch()]);
    },
    onError: (error) =>
      showError(
        error instanceof Error ? error.message : t("chat.recoveryFailed"),
      ),
  });

  useEffect(() => {
    if (
      !currentDevice ||
      deviceRegistrationMutation.isPending ||
      deviceRegistrationMutation.isSuccess
    ) {
      return;
    }

    deviceRegistrationMutation.mutate(currentDevice);
  }, [currentDevice?.id, deviceRegistrationMutation, currentDevice]);

  const chatDevices = devicesQuery.data?.devices ?? [];
  const hasMessagesAwaitingKeyRecovery = messages.some(
    (message) => message.plaintext === messageLabels.beforeDevice,
  );
  const otherParticipant = useMemo(() => {
    if (!conversationQuery.data || !currentUserId) {
      return null;
    }

    return thread?.ownerId === currentUserId ? thread.adopter : thread?.owner;
  }, [conversationQuery.data, currentUserId, thread]);

  useEffect(() => {
    if (!thread?.id || !currentUserId) {
      return;
    }

    void markChatThreadRead(thread.id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    });
  }, [currentUserId, queryClient, thread?.id]);

  useEffect(() => {
    if (!currentUserId || chatDevices.length === 0) {
      return;
    }

    setMessages(
      (conversationQuery.data?.messages ?? []).map((message) => ({
        ...message,
        plaintext: getMessagePlaintext(
          message,
          currentUserId,
          chatDevices,
          messageLabels,
        ),
      })),
    );
  }, [chatDevices, conversationQuery.data?.messages, currentUserId]);

  useEffect(() => {
    if (!thread?.id || !currentUserId || chatDevices.length === 0) {
      return undefined;
    }

    const token = getAccessToken();

    if (!token) {
      return undefined;
    }

    const socket = io(`${getSocketBaseUrl()}/chat`, {
      auth: {
        token,
      },
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      socket.emit(
        "join_thread",
        {
          threadId: thread.id,
        },
        (response: { ok?: boolean; message?: string }) => {
          if (response?.ok === false && response.message) {
            showError(response.message);
          }
        },
      );
    });

    socket.on("message_created", (message: ChatMessageRecord) => {
      const plaintext = getMessagePlaintext(
        message,
        currentUserId,
        chatDevices,
        messageLabels,
      );

      setMessages((current) => {
        if (
          current.some((existingMessage) => existingMessage.id === message.id)
        ) {
          return current;
        }

        return [...current, { ...message, plaintext }].sort(
          (leftMessage, rightMessage) =>
            new Date(leftMessage.createdAt).getTime() -
            new Date(rightMessage.createdAt).getTime(),
        );
      });

      if (message.senderId !== currentUserId) {
        void markChatThreadRead(thread.id).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        });
      }
    });

    socket.on("connect_error", () => {
      setIsSocketConnected(false);
      showError(t("chat.connectionOpenFailed"));
    });

    return () => {
      setIsSocketConnected(false);
      socket.off("message_created");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatDevices, currentUserId, thread?.id, messageLabels, t]);

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !thread?.id) {
      return;
    }

    const socket = socketRef.current;

    if (!socket) {
      showError(t("chat.connectionNotReady"));
      return;
    }

    if (!currentUserId || !currentDevice || chatDevices.length === 0) {
      showError(t("chat.encryptionInitializing"));
      return;
    }

    const encryptedMessage = encryptChatMessage(
      content,
      currentDevice,
      chatDevices,
    );

    socket.emit(
      "send_message",
      {
        threadId: thread.id,
        ...encryptedMessage,
      },
      (response: { ok?: boolean; message?: string }) => {
        if (response?.ok === false && response.message) {
          showError(response.message);
          return;
        }

        setDraft("");
      },
    );
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!petId && !threadId) {
    return <Navigate to="/pets" replace />;
  }

  if (conversationQuery.isLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] px-6 pb-12 pt-32">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-black/10 bg-white/90 p-8 text-sm text-black/60 shadow-sm">
          {t("chat.loading")}
        </div>
      </section>
    );
  }

  if (conversationQuery.isError) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] px-6 pt-28">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-black/10 bg-white/90 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.25em] text-black/45">
            {t("chat.label")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-black">
            {t("chat.openFailed")}
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/65">
            {conversationQuery.error instanceof Error
              ? conversationQuery.error.message
              : t("chat.loadFailed")}
          </p>
          <Link
            to="/pets"
            className="mt-8 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/85"
          >
            {t("chat.backToPets")}
          </Link>
        </div>
      </section>
    );
  }

  if (!conversationQuery.data || !thread || !pet) {
    return null;
  }

  const activePhotoUrl = pet.photoUrls[activePhotoIndex];
  const petTraits = [
    { label: t("pets.goodWithChildren"), value: pet.goodWithChildren },
    { label: t("pets.goodWithDogs"), value: pet.goodWithDogs },
    { label: t("pets.goodWithCats"), value: pet.goodWithCats },
    { label: t("pets.vaccinated"), value: pet.vaccinated },
    { label: t("pets.neutered"), value: pet.neutered },
    { label: t("pets.houseTrained"), value: pet.houseTrained },
  ];
  const changePhoto = (direction: -1 | 1) => {
    setActivePhotoIndex(
      (current) =>
        (current + direction + pet.photoUrls.length) % pet.photoUrls.length,
    );
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] pb-12 pt-32">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-12 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-black/8 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/45">
              {t("chat.adoptionChat")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-black">
              {pet.name} ·{" "}
              {getDisplayName(otherParticipant, t("chats.unknownUser"))}
            </h1>
          </div>

          <Link
            to="/pets"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white"
          >
            {t("chat.backToPets")}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-3 rounded-[1.25rem] border border-black/8 bg-white/90 p-3 shadow-sm sm:space-y-5 sm:rounded-[2rem] sm:p-6">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#ffd8b0] to-[#fec8e9] sm:rounded-[1.5rem]">
              {activePhotoUrl ? (
                <img
                  src={
                    activePhotoUrl.startsWith("http")
                      ? activePhotoUrl
                      : `${getSocketBaseUrl()}${activePhotoUrl}`
                  }
                  alt={pet.name}
                  className="h-24 w-full object-cover sm:h-64"
                />
              ) : (
                <div className="flex h-24 items-center justify-center text-sm font-semibold text-black/55 sm:h-64 sm:text-lg">
                  {t("chat.noPreview")}
                </div>
              )}
              {pet.photoUrls.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => changePhoto(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg shadow-sm"
                    aria-label={t("pets.previousPhoto", { name: pet.name })}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => changePhoto(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg shadow-sm"
                    aria-label={t("pets.nextPhoto", { name: pet.name })}
                  >
                    ›
                  </button>
                  <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                    {pet.photoUrls.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActivePhotoIndex(index)}
                        className={`h-2 w-2 rounded-full ${index === activePhotoIndex ? "bg-white" : "bg-white/55"}`}
                        aria-label={t("pets.showPhoto", {
                          index: index + 1,
                          name: pet.name,
                        })}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-1 sm:space-y-2">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-black/45 sm:block">
                {t("chat.owner")}
              </p>
              <p className="text-base font-semibold text-black sm:text-lg">
                {getDisplayName(thread.owner, t("chats.unknownUser"))}
              </p>
              <p className="hidden text-sm text-black/60 sm:block">
                {otherParticipant?.email}
              </p>
              {otherParticipant?.bio ? (
                <p className="text-sm leading-6 text-black/65">
                  {otherParticipant.bio}
                </p>
              ) : null}
            </div>

            <div className="space-y-1 rounded-xl bg-[#fffdf9] p-3 sm:space-y-2 sm:rounded-[1.25rem] sm:p-4">
              <p className="hidden text-sm font-semibold text-black sm:block">
                {t("chat.aboutPet")}
              </p>
              <p className="text-sm text-black/65 sm:leading-7">
                {pet.species}
                {getLocalizedBreedName(pet.breedRecord, i18n.language)
                  ? ` · ${getLocalizedBreedName(pet.breedRecord, i18n.language)}`
                  : ""}
              </p>
              <p className="text-xs text-black/65 sm:text-sm sm:leading-7">
                {t("chat.status")}:{" "}
                {t(`status.${pet.adoptionStatus.toLowerCase()}`)}
              </p>
              <p className="hidden text-sm leading-7 text-black/65 sm:block">
                {pet.description}
              </p>
              <div className="hidden flex-wrap gap-2 sm:flex">
                {petTraits
                  .filter((trait) => trait.value)
                  .map((trait) => (
                    <span
                      key={trait.label}
                      className="rounded-full bg-[#ffedf7] px-3 py-1.5 text-xs font-semibold text-[#aa2f75]"
                    >
                      {trait.label}
                    </span>
                  ))}
              </div>
            </div>
          </aside>

          <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[2rem] border border-black/8 bg-white/90 shadow-sm">
            <div className="border-b border-black/8 px-6 py-4">
              <p className="text-sm font-semibold text-black">
                {t("chat.messages")}
              </p>
              <p className="text-sm text-black/60">
                {t("chat.conversationHint")}
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {hasMessagesAwaitingKeyRecovery ? (
                <form
                  className="border border-[#fec8e9] bg-[#fff3fa] p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    recoverChatKeyMutation.mutate();
                  }}
                >
                  <p className="font-semibold">{t("chat.recoverMessages")}</p>
                  <p className="mt-1 text-sm leading-6 text-black/60">
                    {t("chat.recoverMessagesHint")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="password"
                      value={recoveryPassword}
                      onChange={(event) =>
                        setRecoveryPassword(event.target.value)
                      }
                      placeholder={t("chat.recoveryPassword")}
                      className="min-w-0 flex-1 border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/35"
                      required
                    />
                    <button
                      type="submit"
                      disabled={recoverChatKeyMutation.isPending}
                      className="rounded-full bg-[#fec8e9] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {recoverChatKeyMutation.isPending
                        ? t("chat.recoveringMessages")
                        : t("chat.restoreChatKey")}
                    </button>
                  </div>
                </form>
              ) : null}
              {messages.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[#fffdf9] p-6 text-sm text-black/55">
                  {t("chat.empty")}
                </div>
              ) : null}

              {messages.map((message) => {
                const isOwnMessage = message.senderId === currentUserId;
                const avatarUrl = getProfilePictureUrl(
                  message.sender.profilePictureUrl,
                );
                const initial =
                  message.sender.firstName?.[0]?.toUpperCase() ?? "?";

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    {!isOwnMessage &&
                      (avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fec8e9] text-xs font-semibold">
                          {initial}
                        </span>
                      ))}
                    <div
                      className={`max-w-[80%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
                        isOwnMessage
                          ? "rounded-br-md bg-black text-white"
                          : "rounded-bl-md bg-[#fff3fa] text-black"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <span>
                          {getDisplayName(
                            message.sender,
                            t("chats.unknownUser"),
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          {getMessageDateLabel(message.createdAt, locale)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                        {message.plaintext}
                      </p>
                    </div>
                    {isOwnMessage &&
                      (avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fec8e9] text-xs font-semibold">
                          {initial}
                        </span>
                      ))}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="border-t border-black/8 bg-[#fffdf9] p-4"
            >
              <div className="flex items-end gap-3 rounded-[1.5rem] border border-black/10 bg-white p-3 shadow-sm">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t("chat.writeTo", {
                    name: getDisplayName(thread.owner, t("chats.unknownUser")),
                  })}
                  rows={3}
                  className="min-h-[4.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-black outline-none placeholder:text-black/35"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb9df]"
                  disabled={
                    devicesQuery.isLoading ||
                    devicesQuery.isError ||
                    deviceRegistrationMutation.isPending ||
                    deviceRegistrationMutation.isError ||
                    !isSocketConnected
                  }
                >
                  {devicesQuery.isLoading ||
                  deviceRegistrationMutation.isPending
                    ? t("chat.securing")
                    : devicesQuery.isError || deviceRegistrationMutation.isError
                      ? t("chat.encryptionUnavailable")
                      : !isSocketConnected
                        ? t("chat.connecting")
                        : t("actions.send")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
