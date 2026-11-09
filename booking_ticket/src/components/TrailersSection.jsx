import { useState } from "react";
import { dummyTrailers } from "../assets/assets";
import ReactPlayer from "react-player";
import { BlurCicle } from "./BlurCircle";
import { PlayCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWebsiteContent } from "../context/WebsiteContentContext";

export function TrailersSection({ cmsContent } = {}) {
  const contextSite = useWebsiteContent();
  const site = cmsContent || contextSite;
  const section = site.sections?.find(x => x.key === "trailers") || {};
  const { t } = useTranslation();
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);

  return (
    section.visible === false ? null : <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden">
      <div className="max-w-[960px] mx-auto"><p className="text-gray-300 font-medium text-lg">{section.title || t("home.trailersTitle")}</p>{section.description && <p className="mt-1 text-sm text-gray-400">{section.description}</p>}</div>

      <div className="relative mt-6">
        <BlurCicle top="-100px" right="-100px" />
        <div className="mx-auto aspect-video w-full max-w-[960px] overflow-hidden rounded-xl">
          <ReactPlayer
            src={currentTrailer.videoUrl}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      <div className="group grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-8 mt-8 max-w-3xl mx-auto">
        {dummyTrailers.map((trailer) => (
          <div
            key={trailer.image}
            className="relative aspect-video group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition cursor-pointer"
          >
            <img
              src={trailer.image}
              alt={t("home.trailerImageAlt")}
              className="rounded-lg w-full h-full object-cover brightness-75"
              onClick={() => setCurrentTrailer(trailer)}
            />
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-5 md:w-8 h-5 md:h-12 transform -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
