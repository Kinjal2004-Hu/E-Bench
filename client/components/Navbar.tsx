"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "Purpose", href: "#purpose" },
  { label: "Features", href: "#features" },
  { label: "Sources", href: "#sources" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [active, setActive] = useState("hero");
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 960;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setIsMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowNavbar(window.scrollY > 120);

      const sections = NAV_LINKS.map((l) => l.href.replace("#", ""));
      let current = "hero";

      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 200) {
          current = id;
        }
      });

      setActive(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <nav
      className="home-navbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "rgba(253,250,243,0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(139,105,20,0.2)",
        padding: isMobile ? "0 14px" : "0 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
        transition: "box-shadow 0.4s, opacity 0.35s, transform 0.35s",
        boxShadow: scrolled ? "0 4px 24px rgba(26,44,66,0.08)" : "none",
        opacity: showNavbar ? 1 : 0,
        transform: showNavbar ? "translateY(0)" : "translateY(-14px)",
        pointerEvents: showNavbar ? "auto" : "none",
      }}
    >
      {/* Logo */}
      <a
        href="#hero"
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 10,
          textDecoration: "none",
        }}
        onClick={closeMobileMenu}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          <Image src="/logo.png" alt="E-Bench Logo" width={30} height={30} />
        </div>

        <div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 28,
              fontWeight: 1000,
              color: "#3f3b20",
              letterSpacing: 1,
            }}
          >
            Bench
          </div>

          {/* <div
            style={{
              fontSize: 9,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              color: "#A07820",
            }}
          >
            Digital Justice
          </div> */}
        </div>
      </a>

      {isMobile ? (
        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: "1px solid rgba(139,105,20,0.35)",
            background: "rgba(255,255,255,0.68)",
            color: "#1A2C42",
            fontSize: 21,
            cursor: "pointer",
          }}
        >
          {isMenuOpen ? "\u00d7" : "\u2630"}
        </button>
      ) : (
        <>
          {/* Navigation Links */}
          <ul style={{ display: "flex", gap: 34, listStyle: "none" }}>
            {NAV_LINKS.map(({ label, href }) => {
              const id = href.replace("#", "");
              const isActive = active === id;

              return (
                <li key={href}>
                  <a
                    href={href}
                    style={{
                      fontSize: 18,
                      fontWeight: isActive ? 500 : 700,
                      color: isActive ? "#1A2C42" : "#4A5568",
                      textDecoration: "none",
                      position: "relative",
                      paddingBottom: 2,
                      transition: "color 0.3s",
                    }}
                  >
                    {label}

                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#C4963A",
                        transform: isActive ? "scaleX(1)" : "scaleX(0)",
                        transformOrigin: "left",
                        transition: "transform 0.3s",
                        display: "block",
                      }}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Login / Get Started Button */}
          <Link
            href="/auth"
            style={{
              background: "linear-gradient(135deg,#8B6914,#C4963A)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              padding: "9px 22px",
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: "0.3px",
              boxShadow: "0 2px 12px rgba(139,105,20,0.3)",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 6px 20px rgba(139,105,20,0.4)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = "";
              el.style.boxShadow = "0 2px 12px rgba(139,105,20,0.3)";
            }}
          >
            Login / Register
          </Link>
        </>
      )}

      {isMobile && isMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(253,250,243,0.98)",
            borderBottom: "1px solid rgba(139,105,20,0.24)",
            boxShadow: "0 12px 30px rgba(26,44,66,0.12)",
            padding: "10px 14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {NAV_LINKS.map(({ label, href }) => {
            const id = href.replace("#", "");
            const isActive = active === id;

            return (
              <a
                key={href}
                href={href}
                onClick={closeMobileMenu}
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#1A2C42" : "#4A5568",
                  textDecoration: "none",
                  padding: "10px 6px",
                  borderBottom: "1px solid rgba(139,105,20,0.12)",
                }}
              >
                {label}
              </a>
            );
          })}

          <Link
            href="/auth"
            onClick={closeMobileMenu}
            style={{
              marginTop: 6,
              background: "linear-gradient(135deg,#8B6914,#C4963A)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              padding: "11px 14px",
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: "0.3px",
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(139,105,20,0.3)",
            }}
          >
            Login / Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
