import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";

const LANGS = [
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt", short: "VI" },
  { code: "en", flag: "🇬🇧", label: "English", short: "EN" },
];

export function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGS.find((lang) => lang.code === i18n.resolvedLanguage) || LANGS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition cursor-pointer"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="font-mono text-xs font-semibold text-gray-200">{current.short}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-1 z-50 text-sm animate-fadeIn">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition cursor-pointer ${
                lang.code === current.code
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{lang.flag}</span>
                {lang.label}
              </span>
              {lang.code === current.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
