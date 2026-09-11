import { useTranslation } from "react-i18next";
import {
  inputClassName,
  primaryButtonClassName,
  SettingsField,
} from "./form-primitives";

type Props = {
  firstName: string;
  lastName: string;
  email?: string;
  isSaving: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ProfileForm({
  firstName,
  lastName,
  email,
  isSaving,
  onFirstNameChange,
  onLastNameChange,
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
      <SettingsField label={t("settings.firstName")}>
        <input
          value={firstName}
          onChange={(event) => onFirstNameChange(event.target.value)}
          className={inputClassName}
          required
        />
      </SettingsField>
      <SettingsField label={t("settings.lastName")}>
        <input
          value={lastName}
          onChange={(event) => onLastNameChange(event.target.value)}
          className={inputClassName}
          required
        />
      </SettingsField>
      <p className="text-sm text-black/60">{email}</p>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClassName}
      >
        {t("settings.save")}
      </button>
    </form>
  );
}
