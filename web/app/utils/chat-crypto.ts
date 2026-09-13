import nacl from "tweetnacl";
import { sha256 } from "js-sha256";

const CHAT_DEVICE_STORAGE_PREFIX = "floofs_chat_device_";

export type ChatDevice = {
  id: string;
  userId: string;
  publicKey: string;
};

type LocalChatDevice = ChatDevice & {
  privateKey: string;
};

export type EncryptedKeyEnvelope = {
  deviceId: string;
  ciphertext: string;
  nonce: string;
};

export type EncryptedChatPayload = {
  ciphertext: string;
  nonce: string;
  senderDeviceId: string;
  keyEnvelopes: EncryptedKeyEnvelope[];
};

export type EncryptedChatKeyBackup = {
  ciphertext: string;
  nonce: string;
  salt: string;
};

function toBase64(value: Uint8Array) {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getStorageKey(userId: string) {
  return `${CHAT_DEVICE_STORAGE_PREFIX}${userId}`;
}

export function getOrCreateChatDevice(userId: string): LocalChatDevice {
  const storageKey = getStorageKey(userId);
  const storedDevice = localStorage.getItem(storageKey);

  if (storedDevice) {
    try {
      return JSON.parse(storedDevice) as LocalChatDevice;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  const keyPair = nacl.box.keyPair();
  const device: LocalChatDevice = {
    id: toBase64(nacl.randomBytes(16)),
    userId,
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.secretKey),
  };

  localStorage.setItem(storageKey, JSON.stringify(device));
  return device;
}

export function getPublicChatDevice(device: LocalChatDevice): ChatDevice {
  return {
    id: device.id,
    userId: device.userId,
    publicKey: device.publicKey,
  };
}

export function encryptChatMessage(
  content: string,
  senderDevice: LocalChatDevice,
  recipientDevices: ChatDevice[],
): EncryptedChatPayload {
  const messageKey = nacl.randomBytes(nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const plaintext = new Uint8Array(new TextEncoder().encode(content));
  const ciphertext = nacl.secretbox(
    plaintext,
    nonce,
    messageKey,
  );
  const senderPrivateKey = fromBase64(senderDevice.privateKey);

  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(nonce),
    senderDeviceId: senderDevice.id,
    keyEnvelopes: recipientDevices.map((device) => {
      const envelopeNonce = nacl.randomBytes(nacl.box.nonceLength);
      const encryptedKey = nacl.box(
        messageKey,
        envelopeNonce,
        fromBase64(device.publicKey),
        senderPrivateKey,
      );

      return {
        deviceId: device.id,
        ciphertext: toBase64(encryptedKey),
        nonce: toBase64(envelopeNonce),
      };
    }),
  };
}

export function decryptChatMessage(
  message: EncryptedChatPayload,
  currentDevice: LocalChatDevice,
  devices: ChatDevice[],
) {
  const envelope = message.keyEnvelopes.find(
    ({ deviceId }) => deviceId === currentDevice.id,
  );
  const senderDevice = devices.find(
    ({ id }) => id === message.senderDeviceId,
  );

  if (!envelope || !senderDevice) {
    return null;
  }

  const messageKey = nacl.box.open(
    fromBase64(envelope.ciphertext),
    fromBase64(envelope.nonce),
    fromBase64(senderDevice.publicKey),
    fromBase64(currentDevice.privateKey),
  );

  if (!messageKey) {
    return null;
  }

  const plaintext = nacl.secretbox.open(
    fromBase64(message.ciphertext),
    fromBase64(message.nonce),
    messageKey,
  );

  return plaintext ? new TextDecoder().decode(plaintext) : null;
}

function deriveBackupKey(password: string, salt: string) {
  return new Uint8Array(sha256.array(`${password}:${salt}`));
}

export function createChatKeyBackup(
  device: LocalChatDevice,
  password: string,
): EncryptedChatKeyBackup {
  const salt = toBase64(nacl.randomBytes(16));
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const plaintext = new Uint8Array(
    new TextEncoder().encode(JSON.stringify(device)),
  );

  return {
    ciphertext: toBase64(
      nacl.secretbox(plaintext, nonce, deriveBackupKey(password, salt)),
    ),
    nonce: toBase64(nonce),
    salt,
  };
}

export function restoreChatKeyBackup(
  userId: string,
  password: string,
  backup: EncryptedChatKeyBackup,
) {
  try {
    const plaintext = nacl.secretbox.open(
      fromBase64(backup.ciphertext),
      fromBase64(backup.nonce),
      deriveBackupKey(password, backup.salt),
    );

    if (!plaintext) {
      return null;
    }

    const device = JSON.parse(new TextDecoder().decode(plaintext)) as LocalChatDevice;

    if (
      device.userId !== userId ||
      !device.id ||
      !device.publicKey ||
      !device.privateKey
    ) {
      return null;
    }

    localStorage.setItem(getStorageKey(userId), JSON.stringify(device));
    return device;
  } catch {
    return null;
  }
}