import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { showError } from "../../utils/notification";

type Props = {
  firstName: string;
  profilePictureUrl?: string | null;
  isSaving: boolean;
  onSubmit: (file: File) => void;
};

export default function PictureForm({
  firstName,
  profilePictureUrl,
  isSaving,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "");
  const selectedPictureUrl = useMemo(
    () => (profilePicture ? URL.createObjectURL(profilePicture) : null),
    [profilePicture],
  );
  const previewPictureUrl =
    selectedPictureUrl ??
    (profilePictureUrl ? `${apiBaseUrl}${profilePictureUrl}` : null);
  useEffect(
    () => () => {
      if (selectedPictureUrl) URL.revokeObjectURL(selectedPictureUrl);
    },
    [selectedPictureUrl],
  );
  const selectPicture = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError(t("settings.profilePictureInvalid"));
      return;
    }
    setProfilePicture(file);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDropTarget(false);
    selectPicture(event.dataTransfer.files[0]);
  };
  return (
    <div className="mt-7 grid gap-8 lg:grid-cols-2">
      <div className="flex min-h-64 flex-col border border-black/10 bg-[#fffdf9] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("settings.bubblePreview")}
        </p>
        <div className="mt-7 flex items-end gap-3">
          {previewPictureUrl ? (
            <img
              src={previewPictureUrl}
              alt=""
              className="h-14 w-14 shrink-0 aspect-square rounded-full object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 aspect-square items-center justify-center rounded-full bg-[#fec8e9] text-lg font-semibold">
              {firstName[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className="min-w-0 rounded-[1.5rem] rounded-bl-md bg-[#fff3fa] px-4 py-3 text-sm shadow-sm">
            {t("settings.bubbleMessage")}
          </div>
        </div>
        <p className="mt-auto pt-5 text-sm leading-6 text-black/60">
          {t("settings.bubblePreviewHint")}
        </p>
      </div>
      <div className="flex min-h-64 flex-col">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => selectPicture(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDropTarget(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDropTarget(false)}
          onDrop={handleDrop}
          className={`flex flex-1 flex-col items-center justify-center border-2 border-dashed px-6 text-center transition ${isDropTarget ? "border-[#aa2f75] bg-[#ffedf7]" : "border-black/15 bg-[#fffdf9] hover:border-black/35"}`}
        >
          <span className="text-base font-semibold">
            {t("settings.dropProfilePicture")}
          </span>
          <span className="mt-2 text-sm text-black/55">
            {profilePicture?.name ?? t("settings.dropProfilePictureHint")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => profilePicture && onSubmit(profilePicture)}
          disabled={!profilePicture || isSaving}
          className="mt-4 w-full rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {isSaving
            ? t("settings.uploadingPicture")
            : t("settings.saveProfilePicture")}
        </button>
      </div>
    </div>
  );
}
