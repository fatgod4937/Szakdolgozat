import { useTranslation } from "react-i18next";
import {
  inputClassName,
  primaryButtonClassName,
  SettingsField,
} from "./form-primitives";

type Props = {
  email: string;
  currentPassword: string;
  isSaving: boolean;
  onEmailChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export default function EmailForm({
  email,
  currentPassword,
  isSaving,
  onEmailChange,
  onCurrentPasswordChange,
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
      <SettingsField label={t("settings.newEmail")}>
        <input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className={inputClassName}
          required
        />
      </SettingsField>
      <SettingsField label={t("settings.currentPassword")}>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
          className={inputClassName}
          required
        />
      </SettingsField>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClassName}
      >
        {t("settings.updateEmail")}
      </button>
    </form>
  );
}
