/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const WebsiteContentContext = createContext(null);
const defaults = {
  banner: { image: "", title: "Guardian of the galaxy", description: "A group of unlikely heroes must overcome their differences and join forces to protect the galaxy from a powerful enemy.", ctaText: "Explore Movies", ctaLink: "/movies", active: true, order: 1 },
  sections: [{ key: "nowShowing", title: "Phim Đang Chiếu", description: "", visible: true, order: 1 }, { key: "trailers", title: "Trailers", description: "", visible: true, order: 2 }],
  header: { links: [{ text: "Trang chủ", href: "/home" }, { text: "Phim đang chiếu", href: "/movies" }, { text: "Vé của tôi", href: "/booking" }, { text: "Yêu thích", href: "/favourite" }] },
  footer: { feedback: "Please let me know your opinion!", copyright: "© 2025 prebuiltUI Design", links: [] },
  announcements: []
};

export function WebsiteContentProvider({ children }) {
  const [content, setContent] = useState(defaults);
  useEffect(() => { api.get("/api/website-content").then((data) => { if (data) setContent((current) => ({ ...current, ...data })); }).catch(() => {}); }, []);
  return <WebsiteContentContext.Provider value={content}>{children}</WebsiteContentContext.Provider>;
}
export const useWebsiteContent = () => useContext(WebsiteContentContext) || defaults;
export { defaults as defaultWebsiteContent };
