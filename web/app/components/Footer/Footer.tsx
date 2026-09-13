import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer
      id="site-footer"
      className="mt-10 flex flex-col items-center justify-between gap-4 px-4 pb-8 sm:flex-row sm:px-6 lg:px-12"
    >
      <div
        style={{
          backgroundImage: `url('/images/logo.png')`,
        }}
        className="h-24 w-24 bg-cover bg-center sm:h-28 sm:w-28"
      ></div>
      <div className="flex flex-col items-center justify-center text-center sm:items-end sm:text-right">
        <Link to="/data-safety" className="text-gray-500 text-[0.8rem]">
          {t("footer.privacy")}
        </Link>
        <p className="text-gray-400 text-[0.8rem]">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
