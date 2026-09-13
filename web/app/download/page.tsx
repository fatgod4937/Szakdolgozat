import { useTranslation } from "react-i18next";

export default function DownloadPage() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fffdf9] via-white to-[#fef8f4] pt-24">
      <div className="absolute left-[-5rem] top-10 h-64 w-64 rounded-full bg-[#fec8e9]/30 blur-3xl" />
      <div className="absolute right-[-5rem] top-32 h-72 w-72 rounded-full bg-[#ffd8b0]/35 blur-3xl" />

      <div className="mx-auto min-h-[calc(100vh-6rem)] w-full max-w-7xl px-6 py-12 lg:px-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
            {t("download.eyebrow")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            {t("download.title")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-black/70">
            {t("download.description")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-black/8 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur md:p-8">
            <h2 className="text-2xl font-semibold text-black">
              {t("download.android")}
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-black/70">
              <li>{t("download.androidStep1")}</li>
              <li>{t("download.androidStep2")}</li>
              <li>{t("download.androidStep3")}</li>
            </ol>
          </article>

          <article className="rounded-[2rem] border border-black/8 bg-white/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur md:p-8">
            <h2 className="text-2xl font-semibold text-black">
              {t("download.ios")}
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-black/70">
              <li>{t("download.iosStep1")}</li>
              <li>{t("download.iosStep2")}</li>
              <li>{t("download.iosStep3")}</li>
            </ol>
          </article>
        </div>

        <div className="mt-10 rounded-[2rem] border border-black/8 bg-black px-6 py-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.14)] md:px-8">
          <h2 className="text-2xl font-semibold">{t("download.whyTitle")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
            {t("download.whyDescription")}
          </p>
        </div>
      </div>
    </section>
  );
}
