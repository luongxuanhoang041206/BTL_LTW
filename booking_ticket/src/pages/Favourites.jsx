import { useTranslation } from "react-i18next";
import { dummyShowsData } from "../assets/assets";
import { BlurCicle } from "../components/BlurCircle";
import { MovieCard } from "../components/MovieCard";

export function Favourite() {
  const { t } = useTranslation();
  return dummyShowsData.length > 0 ? (
    <div className="relative my-20 mb-28 md:my-40 md:mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCicle top="100px" left="0" />
      <BlurCicle bottom="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">{t("favourite.title")}</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {dummyShowsData.map((movie) => (
          <MovieCard movie={movie} key={movie._id} />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">{t("favourite.empty")}</h1>
    </div>
  );
}
