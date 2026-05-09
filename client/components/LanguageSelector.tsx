"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import GoogleTranslate from "./GoogleTranslate";

const languages = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
];

function switchLanguage(langCode: string) {
  if (langCode === "en") {
    document.cookie = "googtrans=; path=/; max-age=0";
  } else {
    document.cookie = `googtrans=/en/${langCode}`;
  }
  window.location.reload();
}

export default function LanguageSelector({ variant = "sidebar" }: { variant?: "sidebar" | "navbar" }) {
  const [isOpen, setIsOpen] = useState(false);

  const isDark = variant === "sidebar";

  return (
    <div style={{ position: "relative" }}>
      <GoogleTranslate />

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          width: variant === "navbar" ? 38 : undefined,
          height: variant === "navbar" ? 38 : undefined,
          padding: variant === "navbar" ? 0 : "8px 12px",
          background: isDark ? "transparent" : "var(--surface2)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.2)"
            : "1.5px solid var(--chip-bd)",
          borderRadius: variant === "navbar" ? "9px" : "6px",
          color: isDark ? "rgba(255,255,255,0.8)" : "var(--txt)",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (variant === "navbar") {
            e.currentTarget.style.background = "var(--gold)";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "var(--gold)";
          }
        }}
        onMouseLeave={(e) => {
          if (variant === "navbar") {
            e.currentTarget.style.background = "var(--surface2)";
            e.currentTarget.style.color = "var(--txt)";
            e.currentTarget.style.borderColor = "var(--chip-bd)";
          }
        }}
      >
        <Globe size={16} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            background: isDark ? "#1a1f2e" : "var(--surface)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.1)"
              : "1.5px solid var(--border)",
            borderRadius: "8px",
            padding: "4px",
            minWidth: "120px",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                switchLanguage(lang.code);
                setIsOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                color: isDark ? "rgba(255,255,255,0.8)" : "var(--txt)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.1)"
                  : "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {lang.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}