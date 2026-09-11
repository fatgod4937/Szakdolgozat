import React from "react";
import { useTranslation } from "react-i18next";

const AboutUs = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col mt-20 px-1 sm:px-0" id="about">
      <h2 className="text-2xl font-bold">{t("home.about")}</h2>
      <p className="max-w-prose text-gray-500">{t("home.aboutText")}</p>
    </div>
  );
};

export default AboutUs;
