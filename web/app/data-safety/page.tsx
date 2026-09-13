import { useTranslation } from "react-i18next";

export default function DataSafetyPage() {
  const { t } = useTranslation();
  const sections = ["account", "data", "security", "choices"] as const;

  return (
    <section className="min-h-screen bg-[#fffdf9] px-4 pb-20 pt-28 sm:px-6 lg:px-10">
      <article className="mx-auto max-w-3xl border-t-2 border-[#fec8e9] pt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#aa2f75]">
          {t("dataSafety.eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-black">
          {t("dataSafety.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-black/70">
          {t("dataSafety.intro")}
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section}>
              <h2 className="text-xl font-semibold text-black">
                {t(`dataSafety.${section}.title`)}
              </h2>
              <p className="mt-2 leading-7 text-black/70">
                {t(`dataSafety.${section}.body`)}
              </p>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-black/10 pt-5 text-sm text-black/55">
          {t("dataSafety.updated")}
        </p>
      </article>
    </section>
  );
}
