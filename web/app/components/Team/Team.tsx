import React from "react";
import { useTranslation } from "react-i18next";

const Team = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-center items-center mt-10 gap-8 mb-10 md:flex-row">
      <div className="flex flex-col md:w-1/2">
        <h2 className="text-xl font-bold">
          {t("home.process").split(" ")[0]}{" "}
          <span className="bg-[#fec8e9] px-3 py-1 rounded-full text-white">
            Floofs
          </span>{" "}
        </h2>
        <p className="mt-4 text-gray-600">{t("home.processText")}</p>
        <div className="mt-6 space-y-4">
          <div className="flex flex-row items-start space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
              ❤️
            </div>
            <div>
              <h3 className="font-semibold">{t("home.discover")}</h3>
              <p className="text-gray-500 text-[0.8rem]">
                {t("home.discoverText")}
              </p>
            </div>
          </div>
          <div className="flex flex-row items-start space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              🏡
            </div>
            <div>
              <h3 className="font-semibold">{t("home.connect")}</h3>
              <p className="text-gray-500 text-[0.8rem]">
                {t("home.connectText")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full md:w-1/2">
        <div
          className="h-[320px] w-full rounded-xl bg-cover bg-center"
          style={{ backgroundImage: "url('/images/3730286_73962.png')" }}
        />
      </div>
    </div>
  );
};

export default Team;
