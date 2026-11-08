import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "../locales/vi.json";
import en from "../locales/en.json";

export const LANG_STORAGE_KEY = "rophim.lang";
export const SUPPORTED_LANGS = ["vi", "en"];

// Lần đầu truy cập mặc định là Tiếng Việt.
const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
const initialLang = SUPPORTED_LANGS.includes(stored) ? stored : "vi";

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "vi",
  supportedLngs: SUPPORTED_LANGS,
  interpolation: { escapeValue: false },
});

// Lưu lựa chọn ngôn ngữ để giữ nguyên sau khi reload.
i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng);
    document.documentElement.lang = lng;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

export default i18n;
