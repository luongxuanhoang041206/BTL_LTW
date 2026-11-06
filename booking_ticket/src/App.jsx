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
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            borderRadius: "0.75rem",
            color: "var(--admin-text)",
          },
          success: {
            iconTheme: { primary: "#34d399", secondary: "#0f172a" },
          },
          error: {
            iconTheme: { primary: "#fb7185", secondary: "#0f172a" },
          },
        }}
      />
      {!isAdminRoute && <NavBar />}
      {!isAdminRoute && announcements.map((item, i) => <div key={`${i}-${item.text}`} role="status" className={`px-6 py-3 text-center text-sm ${item.type === "emergency" ? "bg-red-900 text-white" : "bg-primary/20 text-white"}`}>{item.text}</div>)}
      <Outlet />
      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App;
