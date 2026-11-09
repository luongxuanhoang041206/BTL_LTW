import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function ErrorPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col justify-center items-center h-200">
      <h1 className="text-3xl">{t("errorPage.message")}</h1>
      <Link to="/home" className="underline text-primary text-2xl">
        {t("errorPage.goBack")}
      </Link>
    </div>
  );
}
