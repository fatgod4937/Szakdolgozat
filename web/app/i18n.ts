import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hu from "./locales/hu.json";

const savedLanguage = localStorage.getItem("floofs-language");
const browserLanguage = navigator.language.toLowerCase().startsWith("hu")
  ? "hu"
  : "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hu: { translation: hu } },
  lng: savedLanguage ?? browserLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem("floofs-language", language);
  document.documentElement.lang = language;
});

document.documentElement.lang = i18n.language;

export default i18n;
