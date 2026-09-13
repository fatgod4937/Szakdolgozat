import { getJson, postJson } from "./api";
import type { BreedRecord } from "./pets-api";
import type {
  ChatDevice,
  EncryptedChatKeyBackup,
  EncryptedKeyEnvelope,
} from "./chat-crypto";

export type ChatParticipant = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SHELTER";
  profilePictureUrl?: string | null;
  bio?: string | null;
  location?: string | null;
};

export type ChatPetRecord = {
  id: string;
  name: string;
  species: string;
  breedId?: string | null;
  breedRecord?: BreedRecord | null;
  ageYears?: number | null;
  ageMonths?: number | null;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  size: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
  location: string;
  description: string;
  goodWithChildren: boolean;
  goodWithDogs: boolean;
  goodWithCats: boolean;
  vaccinated: boolean;
  neutered: boolean;
  houseTrained: boolean;
  adoptionStatus: "AVAILABLE" | "RESERVED" | "ADOPTED";
  photoUrls: string[];
  ownerId?: string | null;
  owner?: ChatParticipant | null;
};

export type ChatMessageRecord = {
  id: string;
  threadId: string;
  senderId: string;
  senderDeviceId?: string | null;
  content?: string | null;
  ciphertext?: string | null;
  nonce?: string | null;
  keyEnvelopes?: EncryptedKeyEnvelope[] | null;
  createdAt: string;
  sender: ChatParticipant;
};

export type ChatThreadRecord = {
  id: string;
  petId: string;
  ownerId: string;
  adopterId: string;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  pet: ChatPetRecord;
  owner: ChatParticipant;
  adopter: ChatParticipant;
};

export type PetConversationResponse = {
  currentUserId: string;
  pet: ChatPetRecord;
  thread: ChatThreadRecord;
  messages: ChatMessageRecord[];
};

export type ThreadListResponse = {
  threads: Array<ChatThreadRecord & { messages: ChatMessageRecord[] }>;
};

export function getPetConversation(petId: string) {
  return getJson<PetConversationResponse>(`/chat/pets/${petId}/thread`);
}

export function getThreadConversation(threadId: string) {
  return getJson<PetConversationResponse>(`/chat/threads/${threadId}`);
}

export function listChatThreads() {
  return getJson<ThreadListResponse>("/chat/threads");
}

export function markChatThreadRead(threadId: string) {
  return postJson<{ lastReadAt: string }>(
    `/chat/threads/${threadId}/read`,
    {},
    true,
  );
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return postJson<{ endpoint: string }>(
    "/chat/push-subscriptions",
    subscription,
    true,
  );
}

export function registerChatDevice(device: ChatDevice) {
  return postJson<ChatDevice>(
    "/chat/devices",
    {
      id: device.id,
      publicKey: device.publicKey,
    },
    true,
  );
}

export function getThreadChatDevices(threadId: string) {
  return getJson<{ devices: ChatDevice[] }>(
    `/chat/threads/${threadId}/devices`,
  );
}

export function getChatKeyBackup() {
  return getJson<{ backup: EncryptedChatKeyBackup | null }>("/chat/key-backup");
}

export function saveChatKeyBackup(backup: EncryptedChatKeyBackup) {
  return postJson<EncryptedChatKeyBackup>("/chat/key-backup", backup, true);
}

export function askSupportQuestion(question: string, language: string) {
  return postJson<{ answer: string }>(
    "/chat/support",
    { question, language },
    true,
  );
}
