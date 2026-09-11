import { useTranslation } from "react-i18next";
import { inputClassName, SettingsField } from "./form-primitives";

type Props = {
  currentPassword: string;
  isDeleting: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export default function DeleteAccountForm({
  currentPassword,
  isDeleting,
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
      <p className="rounded-lg bg-[#fee2e2] p-4 text-sm leading-6 text-[#991b1b]">
        {t("settings.deleteWarning")}
      </p>
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
        disabled={isDeleting}
        className="rounded-full bg-[#b91c1c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t("settings.deleteButton")}
      </button>
    </form>
  );
}
