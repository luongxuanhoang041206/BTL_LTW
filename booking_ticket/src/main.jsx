import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { RouterProvider } from "react-router";
import { route } from "./Route";
import { AuthProvider } from "./context/AuthContext";
import { WebsiteContentProvider } from "./context/WebsiteContentContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WebsiteContentProvider>
      <AuthProvider><RouterProvider router={route} /></AuthProvider>
    </WebsiteContentProvider>
  </StrictMode>,
);
