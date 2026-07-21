"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check local storage or system preference on mount
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark =
      savedTheme === "dark" || (!savedTheme && systemPrefersDark);

    if (shouldUseDark) {
      document.documentElement.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
    }

    // State updates scheduled from the effect avoid a synchronous render
    // cascade while keeping the icon aligned with the DOM-applied theme.
    const frame = requestAnimationFrame(() => setIsDarkMode(shouldUseDark));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Collapse the mobile menu after a navigation choice.
  const closeMenu = () => setMenuOpen(false);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark-theme");
      document.documentElement.classList.add("light-theme");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="navbar-logo">
          <Image
            src="/logo.png"
            alt="AgentOMA"
            width={28}
            height={28}
            priority
            style={{ objectFit: "contain" }}
          />
          <span>AgentOMA</span>
        </Link>

        <div
          id="navbar-menu"
          className={`navbar-links ${menuOpen ? "open" : ""}`}
        >
          <Link
            href="/"
            onClick={closeMenu}
            className={`navbar-link ${pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/assessment"
            onClick={closeMenu}
            className={`navbar-link ${pathname === "/assessment" ? "active" : ""}`}
          >
            Assessment
          </Link>
          <Link
            href="/pharmacist"
            onClick={closeMenu}
            className={`navbar-link ${pathname === "/pharmacist" ? "active" : ""}`}
          >
            Pharmacist Portal
          </Link>
          <Link
            href="/assessment"
            onClick={closeMenu}
            className="btn btn-primary btn-sm navbar-menu-cta"
          >
            Start Triage
          </Link>
        </div>

        <div className="navbar-actions">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle Theme"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
          <Link href="/assessment" className="btn btn-primary btn-sm navbar-cta">
            Start Triage
          </Link>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="navbar-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="navbar-menu"
          >
            {menuOpen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
