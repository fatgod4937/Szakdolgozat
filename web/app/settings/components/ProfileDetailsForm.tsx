import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { searchLocations, type LocationSuggestion } from "../../utils/pets-api";

type Props = {
  bio: string;
  location: string;
  isSaving: boolean;
  onBioChange: (value: string) => void;
  onLocationChange: (
    location: string,
    coordinates?: LocationSuggestion,
  ) => void;
  onSubmit: () => void;
};
const inputClassName =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-black/35";

export default function ProfileDetailsForm({
  bio,
  location,
  isSaving,
  onBioChange,
  onLocationChange,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<LocationSuggestion[]>([]);
  useEffect(() => {
    if (location.trim().length < 3) {
      setOptions([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void searchLocations(location).then(setOptions, () => setOptions([]));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [location]);
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("settings.bio")}</span>
        <textarea
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          className={inputClassName}
          rows={4}
          maxLength={500}
        />
      </label>
      <div className="relative space-y-2">
        <label className="block text-sm font-medium" htmlFor="profile-location">
          {t("settings.location")}
        </label>
        <input
          id="profile-location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          className={inputClassName}
          autoComplete="off"
        />
        {options.length > 0 ? (
          <ul className="absolute z-10 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
            {options.map((option) => (
              <li key={`${option.latitude}-${option.longitude}`}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm hover:bg-[#fff3fa]"
                  onClick={() => {
                    onLocationChange(option.label, option);
                    setOptions([]);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="text-sm text-black/60">{t("settings.locationHint")}</p>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {t("settings.save")}
      </button>
    </form>
  );
}
