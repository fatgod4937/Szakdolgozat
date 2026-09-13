import { describe, expect, it } from "vitest";
import {
  createChatKeyBackup,
  decryptChatMessage,
  encryptChatMessage,
  getOrCreateChatDevice,
  getPublicChatDevice,
  restoreChatKeyBackup,
} from "./chat-crypto";

describe("chat encryption", () => {
  it("decrypts a message on every registered recipient device", () => {
    const senderDevice = getOrCreateChatDevice("sender");
    const recipientPhone = getOrCreateChatDevice("recipient-phone");
    const recipientLaptop = getOrCreateChatDevice("recipient-laptop");
    const devices = [senderDevice, recipientPhone, recipientLaptop].map(
      getPublicChatDevice,
    );
    const encryptedMessage = encryptChatMessage(
      "Encrypted chat message",
      senderDevice,
      devices,
    );

    expect(decryptChatMessage(encryptedMessage, senderDevice, devices)).toBe(
      "Encrypted chat message",
    );
    expect(decryptChatMessage(encryptedMessage, recipientPhone, devices)).toBe(
      "Encrypted chat message",
    );
    expect(decryptChatMessage(encryptedMessage, recipientLaptop, devices)).toBe(
      "Encrypted chat message",
    );
  });

  it("restores a backed-up identity so a new device can decrypt history", () => {
    const originalDevice = getOrCreateChatDevice("account");
    const senderDevice = getOrCreateChatDevice("sender");
    const devices = [originalDevice, senderDevice].map(getPublicChatDevice);
    const encryptedMessage = encryptChatMessage(
      "A message from before the device switch",
      senderDevice,
      devices,
    );
    const backup = createChatKeyBackup(originalDevice, "correct-password");

    localStorage.removeItem("floofs_chat_device_account");

    const restoredDevice = restoreChatKeyBackup(
      "account",
      "correct-password",
      backup,
    );

    expect(restoredDevice).not.toBeNull();
    expect(
      decryptChatMessage(encryptedMessage, restoredDevice!, devices),
    ).toBe("A message from before the device switch");
    expect(
      restoreChatKeyBackup("account", "wrong-password", backup),
    ).toBeNull();
  });
});