import { Outlet, useLocation } from "react-router";
import { NavBar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "react-hot-toast";
import { useWebsiteContent } from "./context/WebsiteContentContext";

function App() {
  const local = useLocation();
  const isAdminRoute = local.pathname.startsWith("/admin");
  const site = useWebsiteContent();
  const announcements = (site.announcements || []).filter(x => x.active && x.text);
  return (
    <>
      <Toaster />
      {!isAdminRoute && <NavBar />}
      {!isAdminRoute && announcements.map((item, i) => <div key={`${i}-${item.text}`} role="status" className={`px-6 py-3 text-center text-sm ${item.type === "emergency" ? "bg-red-900 text-white" : "bg-primary/20 text-white"}`}>{item.text}</div>)}
      <Outlet />
      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App;
