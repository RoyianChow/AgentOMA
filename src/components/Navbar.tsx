"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or system preference on mount
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark-theme");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark-theme");
      setIsDarkMode(false);
    }
  }, []);

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
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: "url(#brand-grad)" }}
          >
            <defs>
              <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>AgentOMA</span>
        </Link>

        <div className="navbar-links">
          <Link
            href="/"
            className={`navbar-link ${pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            href="/assessment"
            className={`navbar-link ${pathname === "/assessment" ? "active" : ""}`}
          >
            Assessment
          </Link>
          <Link
            href="/pharmacist"
            className={`navbar-link ${pathname === "/pharmacist" ? "active" : ""}`}
          >
            Pharmacist Portal
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
          <Link href="/assessment" className="btn btn-primary btn-sm">
            Start Triage
          </Link>
        </div>
      </div>
    </nav>
  );
}
