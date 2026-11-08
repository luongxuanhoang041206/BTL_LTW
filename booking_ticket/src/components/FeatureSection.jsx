import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { BlurCicle } from "./BlurCircle";
import { dummyShowsData } from "../assets/assets";
import { MovieCard } from "./MovieCard";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useWebsiteContent } from "../context/WebsiteContentContext";

export function FeatureSection({ cmsContent } = {}) {
  const contextSite = useWebsiteContent();
  const site = cmsContent || contextSite;
  const section = site.sections?.find(x => x.key === "nowShowing") || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await api.get("/api/movies/now-showing");
        if (data && data.length > 0) {
          setMovies(data);
        } else {
          setMovies(dummyShowsData);
        }
      } catch {
        setMovies(dummyShowsData);
      }
    };
    fetchMovies();
  }, []);

  return (
    section.visible === false ? null : <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="relative flex items-center justify-between pt-20 pb-10">
        <BlurCicle top="0" right="-80px" />
        <div><p className="text-gray-200 font-semibold text-xl">{section.title || t("home.nowShowingTitle")}</p>{section.description && <p className="mt-1 text-sm text-gray-400">{section.description}</p>}</div>
        <button
          onClick={() => {
            navigate("/movies");
            scrollTo(0, 0);
          }}
          className="group flex items-center gap-2 text-sm text-primary hover:text-primary-dull transition cursor-pointer font-medium"
        >
          {t("home.viewAll")}{" "}
          <ArrowRight className="group-hover:translate-x-1 transition w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap max-sm:justify-center mt-4 gap-8">
        {(movies.length > 0 ? movies.slice(0, 8) : dummyShowsData.slice(0, 4)).map((movie) => (
          <MovieCard key={movie.id || movie._id} movie={movie} />
        ))}
      </div>

      <div className="flex justify-center mt-16">
        <button
          onClick={() => {
            navigate("/movies");
            scrollTo(0, 0);
          }}
          className="px-8 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer shadow-lg shadow-primary/20 active:scale-95 text-white"
        >
          {t("home.exploreMoreMovies")}
        </button>
      </div>
    </div>
  );
}
