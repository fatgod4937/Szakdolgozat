import React from "react";
import { useTranslation } from "react-i18next";

const Philosophy = () => {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col rounded-2xl bg-pink-200 p-5 sm:p-6">
      <h2 className="mb-4 text-center text-2xl font-semibold">
        {t("home.values")}
      </h2>
      <div className="flex w-full flex-col gap-6 md:flex-row md:justify-between">
        <div className="flex flex-col md:w-1/3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-white rounded-lg px-2 py-1">❤️</div>
            <span className="text-sm font-semibold">{t("home.care")}</span>
          </div>
          <p className="max-w-prose text-[0.8rem] text-gray-700">
            {t("home.careText")}
          </p>
        </div>
        <div className="flex flex-col md:w-1/3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-white rounded-lg px-2 py-1">🐾</div>
            <span className="text-sm font-semibold">{t("home.adoption")}</span>
          </div>
          <p className="max-w-prose text-[0.8rem] text-gray-700">
            {t("home.adoptionText")}
          </p>
        </div>
        <div className="flex flex-col md:w-1/3">
          <p className=" font-semibold text-gray-900 h-full max-h-full">
            {t("home.community")}
          </p>
          <p className="mt-2 max-w-prose text-[0.8rem] text-gray-700">
            {t("home.communityText")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Philosophy;
