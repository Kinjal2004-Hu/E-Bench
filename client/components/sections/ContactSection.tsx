"use client";
import { useState } from "react";
import { useReveal } from "@/lib/useReveal";

const CONTACT_CARDS = [
  { icon:"✉️", label:"Email",    val:"hello@ebench.ai" },
  { icon:"📞", label:"Phone",    val:"+91 98765 43210" },
  { icon:"💻", label:"GitHub",   val:"github.com/e-bench" },
  { icon:"🔗", label:"LinkedIn", val:"linkedin.com/company/e-bench" },
];

export default function ContactSection() {
  const ref = useReveal();
  const [status, setStatus] = useState<"idle"|"sending"|"sent">("idle");

  const handleSubmit = () => {
    setStatus("sending");
    setTimeout(() => {
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 3000);
    }, 1200);
  };

  return (
    <section
      id="contact"
      ref={ref}
      className="home-contact"
      style={{ background:"var(--parchment2)", padding:"90px 60px" }}
    >
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div className="reveal-up" style={{ fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:24, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
          Reach Out
        </div>
        <h2 className="reveal-up delay-1 font-playfair" style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:700, color:"var(--navy)", marginBottom:16 }}>
          Get in Touch
        </h2>
        <p className="reveal-up delay-2 font-cormorant" style={{ fontSize:19, fontWeight:400, lineHeight:1.65, color:"var(--text-mid)", maxWidth:520 }}>
          Have questions or suggestions? We'd love to hear from you.
        </p>

        <div className="contact-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, marginTop:50, alignItems:"start" }}>
          {/* Info cards */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {CONTACT_CARDS.map((c, i) => (
              <div
                key={c.label}
                className={`reveal-up delay-${i + 2}`}
                style={{
                  background:"var(--warm-white)", border:"1px solid var(--border)",
                  borderRadius:8, padding:"16px 20px",
                  display:"flex", gap:14, alignItems:"center",
                  transition:"all 0.3s", cursor:"default",
                }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor="var(--gold-light)";el.style.transform="translateX(4px)";}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor="var(--border)";el.style.transform="";}}
              >
                <span style={{ fontSize:20 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"2px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:14, fontWeight:500, color:"var(--navy)" }}>{c.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="reveal-right delay-2" style={{ display:"flex", flexDirection:"column", gap:15 }}>
            <div className="contact-form-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:15 }}>
              {[
                { label:"Your Name", type:"text", placeholder:"Kinjal Shah" },
                { label:"Email Address", type:"email", placeholder:"you@example.com" },
              ].map((f) => (
                <div key={f.label} style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <label style={{ fontSize:10, letterSpacing:"2px", textTransform:"uppercase", color:"var(--gold-mid)" }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    style={{
                      background:"var(--warm-white)", border:"1px solid var(--border)",
                      borderRadius:6, color:"var(--navy)",
                      fontFamily:"'DM Sans',sans-serif", fontSize:14,
                      padding:"12px 15px", outline:"none",
                      transition:"all 0.3s",
                    }}
                    onFocus={e=>{(e.currentTarget as HTMLInputElement).style.borderColor="var(--gold-light)";(e.currentTarget as HTMLInputElement).style.boxShadow="0 0 0 3px rgba(139,105,20,0.08)";}}
                    onBlur={e=>{(e.currentTarget as HTMLInputElement).style.borderColor="var(--border)";(e.currentTarget as HTMLInputElement).style.boxShadow="";}}
                  />
                </div>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <label style={{ fontSize:10, letterSpacing:"2px", textTransform:"uppercase", color:"var(--gold-mid)" }}>Message</label>
              <textarea
                rows={5}
                placeholder="Tell us how we can help..."
                style={{
                  background:"var(--warm-white)", border:"1px solid var(--border)",
                  borderRadius:6, color:"var(--navy)",
                  fontFamily:"'DM Sans',sans-serif", fontSize:14,
                  padding:"12px 15px", outline:"none", resize:"none",
                  transition:"all 0.3s",
                }}
                onFocus={e=>{(e.currentTarget as HTMLTextAreaElement).style.borderColor="var(--gold-light)";(e.currentTarget as HTMLTextAreaElement).style.boxShadow="0 0 0 3px rgba(139,105,20,0.08)";}}
                onBlur={e=>{(e.currentTarget as HTMLTextAreaElement).style.borderColor="var(--border)";(e.currentTarget as HTMLTextAreaElement).style.boxShadow="";}}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={status !== "idle"}
              style={{
                background: status === "sent"
                  ? "linear-gradient(135deg,#2D7D46,#3A9E5C)"
                  : "linear-gradient(135deg,#8B6914,#C4963A)",
                color:"#fff", fontSize:14, fontWeight:500,
                padding:"13px 32px", borderRadius:6, border:"none",
                cursor: status !== "idle" ? "default" : "pointer",
                fontFamily:"'DM Sans',sans-serif",
                transition:"all 0.3s", alignSelf:"flex-start",
                boxShadow:"0 4px 16px rgba(139,105,20,0.3)",
                opacity: status === "sending" ? 0.75 : 1,
              }}
              onMouseEnter={e=>{if(status==="idle"){const el=e.currentTarget as HTMLButtonElement;el.style.transform="translateY(-2px)";el.style.boxShadow="0 8px 24px rgba(139,105,20,0.4)";}}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLButtonElement;el.style.transform="";el.style.boxShadow="0 4px 16px rgba(139,105,20,0.3)";}}
            >
              {status === "idle" ? "Send Message →" : status === "sending" ? "Sending..." : "✓ Message Sent!"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
