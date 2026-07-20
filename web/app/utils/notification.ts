export type NotificationType = "warning" | "error" | "success";

export type NotificationPayload = {
  type: NotificationType;
  message: string;
};

export const NOTIFICATION_EVENT_NAME = "floofs-notification";

export function showNotification(message: string, type: NotificationType) {
  window.dispatchEvent(
    new CustomEvent<NotificationPayload>(NOTIFICATION_EVENT_NAME, {
      detail: { message, type },
    }),
  );
}

export function showWarning(message: string) {
  showNotification(message, "warning");
}

export function showError(message: string) {
  showNotification(message, "error");
}

export function showSuccess(message: string) {
  showNotification(message, "success");
}
