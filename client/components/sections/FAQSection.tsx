"use client";
import { useState } from "react";
import { useReveal } from "@/lib/useReveal";

const FAQS = [
  {
    q: "Is this platform a replacement for a lawyer?",
    a: "No. E-Bench provides legal insights and analysis to help you understand your situation, but does not replace professional legal advice. We empower you with knowledge so you can have more informed conversations with legal professionals.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "Our system uses verified legal datasets from trusted government sources and advanced AI models fine-tuned on Indian law. Accuracy is continuously improved through expert review and regular feedback loops.",
  },
  {
    q: "Who can use this platform?",
    a: "E-Bench is designed for students, researchers, legal professionals, businesses, and individuals who want to understand legal matters without deep legal expertise. Our interface is built to be intuitive for all experience levels.",
  },
  {
    q: "What types of documents can be analyzed?",
    a: "You can upload and analyze legal contracts, FIRs, case descriptions, court orders, chargesheets, affidavits, and most standard legal documents in PDF or text format.",
  },
  {
    q: "Is my data kept confidential?",
    a: "Yes. All documents you upload are processed securely and are not stored beyond your session unless you explicitly save them. We never share your data with third parties. Your privacy is our core commitment.",
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const ref = useReveal();

  return (
    <section
      id="faq"
      ref={ref}
      className="home-faq"
      style={{ background:"var(--parchment)", padding:"90px 60px" }}
    >
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="reveal-up" style={{ fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:24, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
          Common Questions
        </div>
        <h2 className="reveal-up delay-1 font-playfair" style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:700, color:"var(--navy)", marginBottom:0 }}>
          Frequently Asked Questions
        </h2>

        <div className="faq-list" style={{ maxWidth:760, marginTop:50 }}>
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className={`reveal-up delay-${i + 2}`}
                style={{ borderBottom:"1px solid var(--border)" }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width:"100%", textAlign:"left", background:"none", border:"none",
                    cursor:"pointer", padding:"22px 0",
                    display:"flex", justifyContent:"space-between", alignItems:"center", gap:20,
                    fontFamily:"'Playfair Display',serif",
                    fontSize:18, fontWeight:500,
                    color: isOpen ? "var(--gold-mid)" : "var(--navy)",
                    transition:"color 0.3s",
                  }}
                >
                  {faq.q}
                  <span style={{
                    width:28, height:28, borderRadius:"50%", flexShrink:0,
                    border:`1.5px solid ${isOpen ? "var(--gold-mid)" : "rgba(139,105,20,0.35)"}`,
                    background: isOpen ? "var(--gold-mid)" : "transparent",
                    color: isOpen ? "#fff" : "var(--gold-mid)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16,
                    transform: isOpen ? "rotate(45deg)" : "none",
                    transition:"all 0.35s cubic-bezier(0.23,1,0.32,1)",
                  }}>
                    +
                  </span>
                </button>

                <div style={{
                  maxHeight: isOpen ? 200 : 0,
                  overflow:"hidden",
                  transition:"max-height 0.45s cubic-bezier(0.23,1,0.32,1)",
                }}>
                  <p className="font-cormorant" style={{
                    padding:"0 0 24px",
                    fontSize:18, fontWeight:300, lineHeight:1.7,
                    color:"var(--text-mid)",
                  }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
