import { Outlet, useLocation } from "react-router";
import { NavBar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Toaster } from "react-hot-toast";

function App() {
  const local = useLocation();
  const isAdminRoute = local.pathname.startsWith("/admin");
  return (
    <>
      <Toaster />
      {!isAdminRoute && <NavBar />}
      <Outlet />
      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App;
