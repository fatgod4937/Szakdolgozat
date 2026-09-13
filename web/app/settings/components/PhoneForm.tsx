import { useTranslation } from "react-i18next";
import {
  inputClassName,
  primaryButtonClassName,
  SettingsField,
} from "./form-primitives";

type Props = {
  phoneNumber: string;
  isSaving: boolean;
  onPhoneNumberChange: (value: string) => void;
  onSubmit: () => void;
};

export default function PhoneForm({
  phoneNumber,
  isSaving,
  onPhoneNumberChange,
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
      <SettingsField label={t("settings.phoneNumber")}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(event) => onPhoneNumberChange(event.target.value)}
          className={inputClassName}
          placeholder="+36 30 123 4567"
        />
      </SettingsField>
      <p className="text-sm text-black/60">{t("settings.clearPhone")}</p>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClassName}
      >
        {t("settings.savePhone")}
      </button>
    </form>
  );
}
