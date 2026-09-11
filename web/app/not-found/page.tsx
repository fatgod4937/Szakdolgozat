import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-xl items-center px-6 py-24">
      <div className="w-full text-center">
        <p className="text-sm font-semibold text-black/45">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-black">
          {t("notFound.title")}
        </h1>
        <p className="mt-4 text-black/65">{t("notFound.description")}</p>
        <Link
          to="/"
          className="mt-7 inline-flex rounded-full bg-[#fec8e9] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb9df]"
        >
          {t("notFound.home")}
        </Link>
      </div>
    </section>
  );
}
