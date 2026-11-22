import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type ImageLightboxProps = {
  images: string[];
  startIndex?: number;
  alt: string;
  onClose: () => void;
};

export default function ImageLightbox({
  images,
  startIndex = 0,
  alt,
  onClose,
}: ImageLightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(startIndex);
  const hasMultiple = images.length > 1;

  const previous = () =>
    setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  const next = () =>
    setIndex((current) => (current === images.length - 1 ? 0 : current + 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) previous();
      if (event.key === "ArrowRight" && images.length > 1) next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("pets.closeFullscreen")}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
      >
        <X className="h-6 w-6" />
      </button>
      {hasMultiple ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            previous();
          }}
          aria-label={t("pets.previousPhoto")}
          className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : null}
      <img
        src={images[index]}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              next();
            }}
            aria-label={t("pets.nextPhoto")}
            className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </span>
        </>
      ) : null}
    </div>
  );
}
