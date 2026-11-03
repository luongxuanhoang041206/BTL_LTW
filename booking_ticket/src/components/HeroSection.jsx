import { ArrowRight, CalendarIcon } from "lucide-react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router";
import { useWebsiteContent } from "../context/WebsiteContentContext";

export function HeroSection({ cmsContent } = {}) {
  const contextSite = useWebsiteContent();
  const site = cmsContent || contextSite;
  const banner = site.banner || {};
  const navigate = useNavigate();
  if (banner.active === false) return null;
  return (
    <div style={{backgroundImage: banner.image ? `linear-gradient(#0007,#0007),url(${banner.image})` : undefined}} className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-[url("src/assets/backgroundImage.png")] bg-cover bg-center h-screen'>
      <img src={assets.marvelLogo} alt="" className="max-h-11 lg:h-11 mt-20" />
      <h1 className="text-5xl md:text-[70px] md:leading-[72px] font-semibold max-w-[440px]">
        {banner.title || <>Guardian of <br /> the galaxy</>}
      </h1>
      <div className="flex items-center gap-4 text-gray-300">
        <span>Action | Adventure | Sci-fi</span>
        <div className="flex items-center gap-1">
          <CalendarIcon className="w-4.5 h-4.5" /> <span>2018</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarIcon className="w-4.5 h-4.5" /> <span>2h 8m</span>
        </div>
      </div>
      <p className="max-w-md text-gray-300">
        {banner.description || "A group of unlikely heroes must overcome their differences and join forces to protect the galaxy from a powerful enemy."}
      </p>
      <button
        className="flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        onClick={() => /^https:\/\//i.test(banner.ctaLink || "") ? window.location.assign(banner.ctaLink) : navigate(banner.ctaLink || "/movies")}
      >
        {banner.ctaText || "Explore Movies"}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
