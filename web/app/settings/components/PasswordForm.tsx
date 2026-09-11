import { useTranslation } from "react-i18next";
import {
  inputClassName,
  primaryButtonClassName,
  SettingsField,
} from "./form-primitives";

type Props = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSaving: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export default function PasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  isSaving,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <SettingsField label={t("settings.currentPassword")}>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
          className={inputClassName}
          required
        />
      </SettingsField>
      <SettingsField label={t("settings.newPassword")}>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
          className={inputClassName}
          minLength={8}
          required
        />
      </SettingsField>
      <SettingsField label={t("settings.confirmPassword")}>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          className={inputClassName}
          minLength={8}
          required
        />
      </SettingsField>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClassName}
      >
        {t("settings.changePassword")}
      </button>
    </form>
  );
}
