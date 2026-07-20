"use client";

import { useEffect, useState } from "react";
import {
  NOTIFICATION_EVENT_NAME,
  type NotificationPayload,
} from "../../utils/notification";

const notificationStyles: Record<
  NotificationPayload["type"],
  { background: string; text: string; accent: string }
> = {
  warning: {
    background: "bg-[#f4b942]",
    text: "text-black",
    accent: "border-black/10",
  },
  error: {
    background: "bg-[#ef4444]",
    text: "text-white",
    accent: "border-white/15",
  },
  success: {
    background: "bg-[#22c55e]",
    text: "text-white",
    accent: "border-white/15",
  },
};

export default function NotificationBanner() {
  const [notification, setNotification] = useState<NotificationPayload | null>(
    null,
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationPayload>;

      if (!customEvent.detail?.message) {
        return;
      }

      setNotification(customEvent.detail);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setNotification(null);
      }, 3200);
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, handleNotification);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENT_NAME, handleNotification);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!notification) {
    return null;
  }

  const styles = notificationStyles[notification.type];

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-[10000] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 px-4 sm:top-6">
      <div
        className={`pointer-events-auto rounded-2xl border ${styles.accent} ${styles.background} ${styles.text} shadow-[0_18px_50px_rgba(0,0,0,0.18)]`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <p className="flex-1 text-sm leading-6">{notification.message}</p>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded-full px-2 py-1 text-xs font-medium opacity-80 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
