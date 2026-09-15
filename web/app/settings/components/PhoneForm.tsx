import { useState } from "react";
import { useTranslation } from "react-i18next";
import HungarianPhoneNumberInput from "../../components/HungarianPhoneNumberInput";
import { isValidHungarianPhoneNumber } from "../../utils/hungarian-phone-number";
import { primaryButtonClassName, SettingsField } from "./form-primitives";

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
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (phoneNumber && !isValidHungarianPhoneNumber(phoneNumber)) {
          setPhoneNumberError(t("auth.phoneInvalid"));
          return;
        }

        setPhoneNumberError(null);
        onSubmit();
      }}
    >
      <SettingsField label={t("settings.phoneNumber")}>
        <HungarianPhoneNumberInput
          value={phoneNumber}
          onChange={(value) => {
            setPhoneNumberError(null);
            onPhoneNumberChange(value);
          }}
          aria-label={t("settings.phoneNumber")}
        />
      </SettingsField>
      {phoneNumberError ? (
        <p className="text-sm text-[#b45309]">{phoneNumberError}</p>
      ) : null}
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
