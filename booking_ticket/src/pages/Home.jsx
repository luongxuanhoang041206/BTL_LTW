import { FeatureSection } from "../components/FeatureSection";
import { HeroSection } from "../components/HeroSection";
import { TrailersSection } from "../components/TrailersSection";
import { useWebsiteContent } from "../context/WebsiteContentContext";

export function Home() {
  const site = useWebsiteContent();
  const components = { nowShowing: <FeatureSection key="nowShowing" />, trailers: <TrailersSection key="trailers" /> };
  const sections = [...(site.sections || [])].sort((a,b)=>(a.order || 0)-(b.order || 0));
  return (
    <>
      <HeroSection />
      {sections.map(section => components[section.key])}
    </>
  );
}
