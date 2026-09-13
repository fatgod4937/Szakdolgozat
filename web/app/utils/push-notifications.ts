import { savePushSubscription } from "./chat-api";

export type PushNotificationSupportIssue =
  | "insecure"
  | "iosNotInstalled"
  | "unsupported"
  | null;

function urlBase64ToUint8Array(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = window.atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalledIosWebApp() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };

  return (
    standaloneNavigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function getPushNotificationSupportIssue(): PushNotificationSupportIssue {
  if (!window.isSecureContext) {
    return "insecure";
  }

  if (isIosDevice() && !isInstalledIosWebApp()) {
    return "iosNotInstalled";
  }

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  return null;
}

export function supportsPushNotifications() {
  return getPushNotificationSupportIssue() === null;
}

export async function enablePushNotifications() {
  if (!supportsPushNotifications()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    throw new Error("Push notifications are not configured yet.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const subscriptionJson = subscription.toJSON();

  if (
    !subscriptionJson.endpoint ||
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys.auth
  ) {
    throw new Error("Could not create a valid push subscription.");
  }

  await savePushSubscription(subscriptionJson);
}
