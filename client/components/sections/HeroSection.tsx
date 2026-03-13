"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from 'next/image';

export default function HeroSection() {
  const imageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const animatedProgressRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const [targetProgress, setTargetProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const brandScale = useMemo(() => {
    const start = isMobile ? 1.08 : 1.55;
    const end = 1;
    return start - (start - end) * scrollProgress;
  }, [isMobile, scrollProgress]);

  const logoTop = useMemo(() => {
    const start = isMobile ? 72 : 92;
    const end = 16;
    return start - (start - end) * scrollProgress;
  }, [isMobile, scrollProgress]);

  useEffect(() => {
    const tick = () => {
      const delta = targetProgress - animatedProgressRef.current;

      if (Math.abs(delta) < 0.001) {
        animatedProgressRef.current = targetProgress;
      } else {
        animatedProgressRef.current += delta * 0.16;
      }

      setScrollProgress(animatedProgressRef.current);
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetProgress]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);

    const onScroll = () => {
      const progress = Math.min(window.scrollY / 180, 1);
      setTargetProgress(progress);

      if (imageRef.current) {
        if (window.innerWidth < 960) {
          imageRef.current.style.transform = "none";
          return;
        }
        imageRef.current.style.transform = `translateY(${window.scrollY * 0.05}px)`;
      }
    };

    onResize();
    onScroll();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: logoTop,
          left: isMobile ? "50%" : 330,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 10,
          transform: `translateX(-50%) scale(${brandScale})`,
          transformOrigin: "center top",
          zIndex: 1101,
          pointerEvents: "none",
          opacity: 1 - scrollProgress,
          transition: "none",
        }}
      >
        <Image src="/logo.png" alt="E - Bench Icon" width={50} height={50} priority />
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: isMobile ? 22 : 50,
            fontWeight: 1000,
            color: "#3f3b20",
            letterSpacing: 1,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          - Bench
        </div>
      </div>
      <section
        id="hero"
        className="home-hero"
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "var(--cream)",
          display: "flex",
          alignItems: "center",
          padding: "100px 60px 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 65% 55% at 70% 50%, rgba(196,150,58,0.07) 0%, transparent 70%), radial-gradient(ellipse 35% 35% at 10% 80%, rgba(26,44,66,0.04) 0%, transparent 60%)",
        }}
      />

      {/* LEFT TEXT CONTENT */}
      <div className="home-hero-content" style={{ flex: 1, maxWidth: 540, position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* Badge */}
        {/* <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(139,105,20,0.08)",
            border: "1px solid rgba(139,105,20,0.25)",
            borderRadius: 100,
            padding: "5px 14px",
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#A07820",
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#C4963A",
              display: "inline-block",
            }}
          />
   
        </div> */}

        {/* Heading */}
        <h2
          className="font-playfair"
          style={{
            fontSize: "clamp(34px,4.2vw,58px)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "var(--navy)",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          A simple way to{" "}
          <em style={{ fontStyle: "italic", color: "var(--gold-mid)" }}>
         Learn Implement Understand
          </em> BharatiyaNyaya Process{" "}
        </h2>

        {/* Tagline */}
        {/* <p
          className="font-cormorant"
          style={{
            fontSize: 19,
            fontWeight: 400,
            lineHeight: 1.7,
            color: "var(--text-mid)",
            marginBottom: 12,
          }}
        >
         A simple way to Learn , Implement , Understand BharatiyaNyaya Process
        </p> */}

        {/* Description */}
        {/* <p
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: "var(--text-light)",
            marginBottom: 40,
          }}
        >
          Our platform combines artificial intelligence with verified legal
          databases to help users analyze cases, detect risky contract clauses,
          and stay updated with the latest laws — no legal degree required.
        </p> */}
        {/* Buttons */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
          <a
            href="/auth"
            style={{
              background: "linear-gradient(135deg,#8B6914,#C4963A)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 500,
              padding: "13px 30px",
              borderRadius: 6,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(139,105,20,0.35)",
              transition: "all 0.3s",
            }}
          >
            Get Started →
          </a>

          <a
            href="#purpose"
            style={{
              background: "transparent",
              color: "var(--navy)",
              fontSize: 14,
              fontWeight: 500,
              padding: "13px 30px",
              borderRadius: 6,
              border: "1.5px solid rgba(26,44,66,0.25)",
              textDecoration: "none",
            }}
          >
            Explore More →
          </a>
        </div>
      </div>

      {/* RIGHT IMAGE SECTION */}
      <div
        className="home-hero-visual"
        ref={imageRef}
        style={{
          flex: "0 0 460px",
          height: 500,
          position: "relative",
          zIndex: 2,
          marginLeft: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* glow behind image */}
        <div
          className="home-hero-glow"
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(196,150,58,0.25) 0%, rgba(196,150,58,0.08) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

<Image
  className="home-hero-image"
  src="/legal-balance.png"
  alt="Legal Balance"
  width={500}
  height={500} // Provide the original aspect ratio height
  priority // Use this if the image is "above the fold" (visible on load)
  style={{
    height: "auto",
    objectFit: "contain",
    position: "absolute",
    right: "-50px",
    zIndex: 2,
    filter: "drop-shadow(0 25px 60px rgba(26,44,66,0.35))",
  }}
/>
      </div>
      </section>
    </>
  );
}