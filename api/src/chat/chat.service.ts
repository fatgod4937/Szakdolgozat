import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PetAdoptionStatus, UserRole } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationService } from './push-notification.service';

const participantSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  profilePictureUrl: true,
  bio: true,
  location: true,
} satisfies Prisma.UserSelect;

const petSummarySelect = {
  id: true,
  name: true,
  species: true,
  breedId: true,
  breedRecord: {
    select: {
      id: true,
      enName: true,
      huName: true,
      speciesId: true,
      species: { select: { enName: true, huName: true } },
    },
  },
  ageYears: true,
  ageMonths: true,
  gender: true,
  size: true,
  location: true,
  description: true,
  goodWithChildren: true,
  goodWithDogs: true,
  goodWithCats: true,
  vaccinated: true,
  neutered: true,
  houseTrained: true,
  adoptionStatus: true,
  photoUrls: true,
  ownerId: true,
  owner: {
    select: participantSelect,
  },
} satisfies Prisma.PetSelect;

const messageSelect = {
  id: true,
  threadId: true,
  senderId: true,
  content: true,
  ciphertext: true,
  nonce: true,
  senderDeviceId: true,
  keyEnvelopes: {
    select: {
      deviceId: true,
      ciphertext: true,
      nonce: true,
    },
  },
  createdAt: true,
  sender: {
    select: participantSelect,
  },
} satisfies Prisma.ChatMessageSelect;

const threadSelect = {
  id: true,
  petId: true,
  ownerId: true,
  adopterId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  pet: {
    select: petSummarySelect,
  },
  owner: {
    select: participantSelect,
  },
  adopter: {
    select: participantSelect,
  },
} satisfies Prisma.ChatThreadSelect;

type ThreadRecord = Prisma.ChatThreadGetPayload<{
  select: typeof threadSelect;
}>;
type MessageRecord = Prisma.ChatMessageGetPayload<{
  select: typeof messageSelect;
}>;

type EncryptedMessagePayload = {
  ciphertext: string;
  nonce: string;
  senderDeviceId: string;
  keyEnvelopes: Array<{
    deviceId: string;
    ciphertext: string;
    nonce: string;
  }>;
};

@Injectable()
export class ChatService {
  private supportKnowledgeBase?: Promise<string>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async answerSupportQuestion(question: string, language: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      throw new BadRequestException('A support question is required.');
    }

    if (trimmedQuestion.length > 800) {
      throw new BadRequestException(
        'A support question must be 800 characters or less.',
      );
    }

    const isHungarian = language.toLowerCase().startsWith('hu');
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const supportEmail = this.configService
      .get<string>('SUPPORT_EMAIL')
      ?.trim();

    if (!apiKey) {
      return { answer: this.getSupportFallback(isHungarian, supportEmail) };
    }

    const endpoint =
      this.configService.get<string>('AI_API_URL') ??
      'https://api.openai.com/v1/chat/completions';
    const model = this.configService.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
    const knowledgeBase = await this.getSupportKnowledgeBase();
    const systemMessage = [
      'You are the Floofs adoption app support assistant.',
      'Reply in the same language as the user question, even when it is not English or Hungarian. Translate documented answers faithfully when needed.',
      "Adapt to the user's tone while always remaining polite, respectful, concise, factual, and helpful.",
      'For greetings, small talk, or casual messages such as "hey", "hello", or "how are you", reply with a short friendly greeting and ask what Floofs-related question you can help with. Do not claim personal feelings or experiences.',
      'Answer only when the answer is supported by the knowledge base below. Do not infer, speculate, or invent product behavior, listing data, fees, policies, legal advice, account status, app-store links, or moderation decisions.',
      `If the answer is not present in the knowledge base, reply only that you cannot answer it and ask the user to contact Floofs support by email${supportEmail ? ` at ${supportEmail}` : ''}.`,
      'Never ask for passwords, verification tokens, payment details, or private keys.',
      'Knowledge base:',
      knowledgeBase,
    ].join('\n\n');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: trimmedQuestion },
          ],
          max_tokens: 220,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI provider responded with ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const answer = payload.choices?.[0]?.message?.content?.trim();

      return {
        answer: answer || this.getSupportFallback(isHungarian, supportEmail),
      };
    } catch {
      return { answer: this.getSupportFallback(isHungarian, supportEmail) };
    }
  }

  async listThreads(userId: string) {
    this.requireUserId(userId);

    const threads = await this.prismaService.chatThread.findMany({
      where: {
        OR: [{ ownerId: userId }, { adopterId: userId }],
      },
      select: threadSelect,
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    const [messages, readReceipts] = await Promise.all([
      Promise.all(threads.map((thread) => this.getMessages(thread.id, userId))),
      this.prismaService.chatThreadReadReceipt.findMany({
        where: { userId, threadId: { in: threads.map((thread) => thread.id) } },
      }),
    ]);
    const lastReadByThread = new Map(
      readReceipts.map((receipt) => [receipt.threadId, receipt.lastReadAt]),
    );

    return {
      threads: threads.map((thread, index) => ({
        ...thread,
        messages: messages[index].messages,
        unreadCount: messages[index].messages.filter(
          (message) =>
            message.senderId !== userId &&
            (!lastReadByThread.get(thread.id) ||
              message.createdAt > lastReadByThread.get(thread.id)!),
        ).length,
      })),
    };
  }

  private async getSupportKnowledgeBase() {
    this.supportKnowledgeBase ??= readFile(
      this.configService.get<string>('AI_SUPPORT_KNOWLEDGE_BASE_PATH') ??
        resolve(process.cwd(), 'knowledge', 'ai-support-knowledge-base.md'),
      'utf8',
    ).catch(
      () =>
        'The support knowledge base is unavailable. Escalate all questions to support by email.',
    );

    return this.supportKnowledgeBase;
  }

  private getSupportFallback(isHungarian: boolean, supportEmail?: string) {
    const emailSuffix = supportEmail ? `: ${supportEmail}` : '.';

    return isHungarian
      ? `Erre a kérdésre nem tudok válaszolni. Kérlek, vedd fel a kapcsolatot a Floofs ügyfélszolgálatával e-mailben${emailSuffix}`
      : `I cannot answer this question. Please contact Floofs support by email${emailSuffix}`;
  }

  async getThreadForPet(userId: string, petId: string) {
    this.requireUserId(userId);

    const pet = await this.prismaService.pet.findUnique({
      where: { id: petId },
      select: petSummarySelect,
    });

    if (!pet) {
      throw new NotFoundException(`Pet with id "${petId}" was not found`);
    }

    if (!pet.ownerId || !pet.owner) {
      throw new BadRequestException('This pet has no owner yet.');
    }

    const existingThread = await this.prismaService.chatThread.findFirst({
      where: {
        petId,
        OR: [{ ownerId: userId }, { adopterId: userId }],
      },
      select: threadSelect,
    });

    if (existingThread) {
      return {
        currentUserId: userId,
        pet,
        thread: existingThread,
        messages: await this.getThreadMessages(existingThread.id, userId),
      };
    }

    if (pet.ownerId === userId) {
      throw new ForbiddenException(
        'This pet has no active conversation for you yet.',
      );
    }

    const thread = await this.findOrCreateThread(petId, pet.ownerId, userId);

    return {
      currentUserId: userId,
      pet,
      thread,
      messages: await this.getThreadMessages(thread.id, userId),
    };
  }

  async getThreadById(threadId: string, userId: string) {
    this.requireUserId(userId);

    const thread = await this.prismaService.chatThread.findFirst({
      where: {
        id: threadId,
        OR: [{ ownerId: userId }, { adopterId: userId }],
      },
      select: threadSelect,
    });

    if (!thread) {
      throw new NotFoundException(
        `Chat thread with id "${threadId}" was not found`,
      );
    }

    return thread;
  }

  async getThreadConversation(userId: string, threadId: string) {
    const thread = await this.getThreadById(threadId, userId);

    return {
      currentUserId: userId,
      pet: thread.pet,
      thread,
      messages: await this.getThreadMessages(thread.id, userId),
    };
  }

  async getMessages(threadId: string, userId: string) {
    await this.getThreadById(threadId, userId);

    return {
      messages: await this.getThreadMessages(threadId, userId),
    };
  }

  async sendMessage(
    threadId: string,
    userId: string,
    payload: EncryptedMessagePayload,
  ) {
    const thread = await this.getThreadById(threadId, userId);
    this.validateEncryptedMessage(payload);

    const devices = await this.getThreadDevices(thread.id, userId);
    const deviceIds = new Set(devices.devices.map((device) => device.id));

    if (
      !deviceIds.has(payload.senderDeviceId) ||
      !payload.keyEnvelopes.every((envelope) =>
        deviceIds.has(envelope.deviceId),
      ) ||
      new Set(payload.keyEnvelopes.map((envelope) => envelope.deviceId))
        .size !== deviceIds.size
    ) {
      throw new BadRequestException(
        'A message key envelope is required for every participant device.',
      );
    }

    const senderDevice = devices.devices.find(
      (device) => device.id === payload.senderDeviceId,
    );

    if (senderDevice?.userId !== userId) {
      throw new ForbiddenException('The sender device does not belong to you.');
    }

    const message = await this.prismaService.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          threadId,
          senderId: userId,
          senderDeviceId: payload.senderDeviceId,
          ciphertext: payload.ciphertext,
          nonce: payload.nonce,
          keyEnvelopes: {
            create: payload.keyEnvelopes,
          },
        },
        select: messageSelect,
      });

      await tx.chatThread.update({
        where: {
          id: threadId,
        },
        data: {
          lastMessageAt: message.createdAt,
        },
      });

      return message;
    });

    const recipientId =
      thread.ownerId === userId ? thread.adopterId : thread.ownerId;
    await this.pushNotificationService.notifyNewChatMessage(
      recipientId,
      thread.pet.name,
      thread.id,
    );
    return message;
  }

  async markThreadRead(threadId: string, userId: string) {
    await this.getThreadById(threadId, userId);

    return this.prismaService.chatThreadReadReceipt.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId },
      update: { lastReadAt: new Date() },
      select: { lastReadAt: true },
    });
  }

  async savePushSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ) {
    this.requireUserId(userId);

    if (!endpoint || !p256dh || !auth) {
      throw new BadRequestException('A valid push subscription is required.');
    }

    return this.pushNotificationService.saveSubscription(userId, {
      endpoint,
      keys: { p256dh, auth },
    });
  }

  async removePushSubscription(userId: string, endpoint: string) {
    this.requireUserId(userId);

    if (!endpoint) {
      throw new BadRequestException(
        'A push subscription endpoint is required.',
      );
    }

    return this.pushNotificationService.removeSubscription(userId, endpoint);
  }

  async registerDevice(userId: string, deviceId: string, publicKey: string) {
    this.requireUserId(userId);

    if (
      !deviceId ||
      !publicKey ||
      deviceId.length > 128 ||
      publicKey.length > 128
    ) {
      throw new BadRequestException(
        'A valid device ID and public key are required.',
      );
    }

    const existingDevice = await this.prismaService.chatDevice.findUnique({
      where: { id: deviceId },
    });

    if (existingDevice && existingDevice.userId !== userId) {
      throw new ForbiddenException('This device belongs to another user.');
    }

    if (existingDevice && existingDevice.publicKey !== publicKey) {
      throw new BadRequestException('A device public key cannot be changed.');
    }

    return this.prismaService.chatDevice.upsert({
      where: { id: deviceId },
      create: { id: deviceId, userId, publicKey },
      update: {},
      select: { id: true, userId: true, publicKey: true },
    });
  }

  async getThreadDevices(threadId: string, userId: string) {
    const thread = await this.getThreadById(threadId, userId);

    return {
      devices: await this.prismaService.chatDevice.findMany({
        where: {
          userId: {
            in: [thread.ownerId, thread.adopterId],
          },
        },
        select: { id: true, userId: true, publicKey: true },
      }),
    };
  }

  async getKeyBackup(userId: string) {
    this.requireUserId(userId);

    return this.prismaService.chatKeyBackup.findUnique({
      where: { userId },
      select: {
        ciphertext: true,
        nonce: true,
        salt: true,
      },
    });
  }

  async saveKeyBackup(
    userId: string,
    ciphertext: string,
    nonce: string,
    salt: string,
  ) {
    this.requireUserId(userId);

    if (!ciphertext || !nonce || !salt) {
      throw new BadRequestException(
        'A valid encrypted chat key backup is required.',
      );
    }

    return this.prismaService.chatKeyBackup.upsert({
      where: { userId },
      create: { userId, ciphertext, nonce, salt },
      update: {},
      select: {
        ciphertext: true,
        nonce: true,
        salt: true,
      },
    });
  }

  private async findOrCreateThread(
    petId: string,
    ownerId: string,
    adopterId: string,
  ) {
    const existingThread = await this.prismaService.chatThread.findUnique({
      where: {
        petId_ownerId_adopterId: {
          petId,
          ownerId,
          adopterId,
        },
      },
      select: threadSelect,
    });

    if (existingThread) {
      return existingThread;
    }

    return this.prismaService.chatThread.create({
      data: {
        petId,
        ownerId,
        adopterId,
      },
      select: threadSelect,
    });
  }

  private async getThreadMessages(threadId: string, userId: string) {
    await this.getThreadById(threadId, userId);

    return this.prismaService.chatMessage.findMany({
      where: {
        threadId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: messageSelect,
    });
  }

  private requireUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException('User id is required.');
    }

    return userId;
  }

  private validateEncryptedMessage(payload: EncryptedMessagePayload) {
    if (
      !payload.ciphertext ||
      !payload.nonce ||
      !payload.senderDeviceId ||
      !Array.isArray(payload.keyEnvelopes) ||
      payload.keyEnvelopes.length === 0 ||
      payload.keyEnvelopes.some(
        (envelope) =>
          !envelope.deviceId || !envelope.ciphertext || !envelope.nonce,
      )
    ) {
      throw new BadRequestException('A valid encrypted message is required.');
    }
  }
}
