"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Search, BarChart3, Tag, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change (escape key or resize)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="header-logo">
            <span className="header-logo-icon">
              <Bookmark size={16} />
            </span>
            Saved
          </Link>

          <nav className="header-nav">
            <Link href="/">Collections</Link>
            <Link href="/search">Search</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/tags">Tags</Link>
          </nav>

          <div className="header-actions">
            <Link
              href="/search"
              className="theme-toggle"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>
            <ThemeToggle />
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      <div
        className={`mobile-nav-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile navigation drawer */}
      <nav className={`mobile-nav-drawer ${mobileOpen ? "open" : ""}`}>
        <button
          className="mobile-menu-btn mobile-nav-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          style={{ display: "grid" }}
        >
          <X size={20} />
        </button>

        <Link href="/" onClick={() => setMobileOpen(false)}>
          <Bookmark size={18} />
          Collections
        </Link>
        <Link href="/search" onClick={() => setMobileOpen(false)}>
          <Search size={18} />
          Search
        </Link>
        <Link href="/insights" onClick={() => setMobileOpen(false)}>
          <BarChart3 size={18} />
          Insights
        </Link>
        <Link href="/tags" onClick={() => setMobileOpen(false)}>
          <Tag size={18} />
          Tags
        </Link>
      </nav>
    </>
  );
}
