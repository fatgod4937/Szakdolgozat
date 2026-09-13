"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { showError, showSuccess } from "../../utils/notification";
import {
  enablePushNotifications,
  getPushNotificationSupportIssue,
  supportsPushNotifications,
} from "../../utils/push-notifications";
import { primaryButtonClassName } from "./form-primitives";

export default function NotificationSettingsForm() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const isSupported = supportsPushNotifications();
  const supportIssue = getPushNotificationSupportIssue();

  useEffect(() => {
    setPermission(isSupported ? Notification.permission : null);
  }, [isSupported]);

  const handleEnable = async () => {
    setIsEnabling(true);

    try {
      await enablePushNotifications();
      setPermission(Notification.permission);
      showSuccess(t("settings.notificationsEnabled"));
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : t("settings.notificationsFailed"),
      );
    } finally {
      setIsEnabling(false);
    }
  };

  if (!isSupported) {
    const supportMessage =
      supportIssue === "insecure"
        ? t("settings.notificationsRequiresHttps")
        : supportIssue === "iosNotInstalled"
          ? t("settings.notificationsRequiresIosInstall")
          : t("settings.notificationsUnsupported");

    return (
      <p className="mt-6 text-sm leading-6 text-black/60">{supportMessage}</p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm leading-6 text-black/60">
        {permission === "granted"
          ? t("settings.notificationsActive")
          : t("settings.notificationsDescription")}
      </p>
      <button
        type="button"
        onClick={() => void handleEnable()}
        disabled={isEnabling || permission === "denied"}
        className={primaryButtonClassName}
      >
        <Bell size={17} aria-hidden="true" />
        {isEnabling
          ? t("settings.notificationsEnabling")
          : permission === "granted"
            ? t("settings.notificationsRefresh")
            : t("settings.notificationsEnable")}
      </button>
      {permission === "denied" ? (
        <p className="text-sm leading-6 text-red-700">
          {t("settings.notificationsBlocked")}
        </p>
      ) : null}
    </div>
  );
}
