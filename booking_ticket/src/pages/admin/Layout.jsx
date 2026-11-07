import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { AdminNavBar } from "../../components/admin/AdminNavBar";
import { AdminSideBar } from "../../components/admin/AdminSidebar";
import { AdminConfirmDialogProvider } from "../../components/admin/AdminConfirmDialog";

const sidebarStorageKey = "admin-sidebar-open";

function readSidebarOpen() {
  const stored = window.localStorage.getItem(sidebarStorageKey);
  if (stored === "true" || stored === "false") return stored === "true";
  return window.matchMedia("(min-width: 768px)").matches;
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    if (!mobileQuery.matches) return undefined;

    const previousOverflow = document.body.style.overflow;
    const sidebar = document.getElementById("admin-navigation");
    const focusableElements = () => Array.from(
      sidebar?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || [],
    );
    sidebar?.querySelector("a[href]")?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const focusable = focusableElements();
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <AdminConfirmDialogProvider>
      <div className="admin-shell">
        <AdminNavBar
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className={`admin-layout${sidebarOpen ? "" : " is-sidebar-closed"}`}>
          <AdminSideBar
            isOpen={sidebarOpen}
            onNavigate={() => {
              if (!window.matchMedia("(max-width: 767px)").matches) return;
              setSidebarOpen(false);
              menuButtonRef.current?.focus();
            }}
            onClose={() => {
              setSidebarOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminConfirmDialogProvider>
  );
}
