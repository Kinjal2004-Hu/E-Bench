"use client";
import { useReveal } from "@/lib/useReveal";

const PROBLEMS = [
  { icon:"📜", title:"Legal Language is Complex", desc:"Dense legalese creates barriers that prevent people from understanding their own rights and obligations." },
  { icon:"⏳", title:"Case Research Takes Hours", desc:"Finding relevant precedents and applicable sections from thousands of judgments is exhausting." },
  { icon:"⚠️", title:"Contracts Contain Hidden Risks", desc:"Unfair clauses and loopholes buried in contracts cost individuals and businesses dearly." },
  { icon:"🔍", title:"Legal Awareness is Limited", desc:"Most people lack access to timely legal information that directly affects their daily lives." },
];

const STATS = [
  { num:"85%", lbl:"Faster case resolution with AI" },
  { num:"3×",  lbl:"Faster contract review" },
  { num:"10K+",lbl:"Documents analyzed" },
  { num:"99%", lbl:"Accuracy on verified sources" },
];

export default function PurposeSection() {
  const ref = useReveal();

  return (
    <section
      id="purpose"
      ref={ref}
      className="home-purpose"
      style={{ background:"var(--parchment2)", padding:"90px 60px" }}
    >
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="reveal-up" style={{ fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:24, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
          Why We Built This
        </div>
        <h2 className="reveal-up delay-1 font-playfair" style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:700, color:"var(--navy)", marginBottom:16, lineHeight:1.2 }}>
          The Problem We're Solving
        </h2>
        <p className="reveal-up delay-2 font-cormorant" style={{ fontSize:19, fontWeight:400, lineHeight:1.65, color:"var(--text-mid)", maxWidth:520 }}>
          {/* Understanding laws and legal documents is difficult for most people. Legal texts are complex, lengthy, and inaccessible to non-experts. */}
        </p>

        <div className="purpose-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:68, marginTop:52, alignItems:"start" }}>
          {/* Problems */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {PROBLEMS.map((p, i) => (
              <div
                key={p.title}
                className={`reveal-up delay-${i + 2}`}
                style={{
                  display:"flex", alignItems:"flex-start", gap:16,
                  padding:"20px 22px",
                  background:"var(--warm-white)", border:"1px solid var(--border)", borderRadius:8,
                  transition:"all 0.35s cubic-bezier(0.23,1,0.32,1)",
                  cursor:"default",
                }}
                onMouseEnter={e=>{
                  const el=e.currentTarget as HTMLDivElement;
                  el.style.transform="translateX(6px)";
                  el.style.borderColor="var(--gold-light)";
                  el.style.boxShadow="0 4px 20px rgba(139,105,20,0.1)";
                }}
                onMouseLeave={e=>{
                  const el=e.currentTarget as HTMLDivElement;
                  el.style.transform="";
                  el.style.borderColor="var(--border)";
                  el.style.boxShadow="";
                }}
              >
                <div style={{
                  width:42, height:42, flexShrink:0,
                  background:"linear-gradient(135deg,rgba(139,105,20,0.1),rgba(139,105,20,0.04))",
                  border:"1px solid rgba(139,105,20,0.2)", borderRadius:8,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
                }}>
                  {p.icon}
                </div>
                <div>
                  <h4 className="font-playfair" style={{ fontSize:16, fontWeight:600, color:"var(--navy)", marginBottom:4 }}>{p.title}</h4>
                  <p style={{ fontSize:13, color:"var(--text-light)", lineHeight:1.6 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div
            className="reveal-right"
            style={{
              background:"linear-gradient(155deg,#1A2C42,#243552)",
              borderRadius:12, padding:36, position:"relative", overflow:"hidden",
            }}
          >
            <div className="dot-pattern" style={{ position:"absolute", inset:0 }} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, position:"relative", zIndex:1 }}>
              {STATS.map((s) => (
                <div key={s.num} style={{
                  padding:"28px 22px", textAlign:"center",
                  border:"1px solid rgba(139,105,20,0.14)",
                  background:"rgba(255,255,255,0.03)",
                }}>
                  <div className="font-playfair" style={{ fontSize:42, fontWeight:700, color:"#D4AF6B", lineHeight:1 }}>{s.num}</div>
                  <div style={{ fontSize:11, color:"rgba(245,241,230,0.45)", marginTop:8, letterSpacing:"0.5px" }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ position:"relative", zIndex:1, marginTop:24, padding:"18px 22px", borderLeft:"2px solid #C4963A", background:"rgba(255,255,255,0.04)" }}>
              <p className="font-cormorant" style={{ fontSize:16, fontStyle:"italic", color:"rgba(245,241,230,0.62)", lineHeight:1.6 }}>
                "Making legal knowledge accessible to every citizen is the first step toward true digital justice."
              </p>
              <cite style={{ fontSize:10, color:"#D4AF6B", letterSpacing:"1px", textTransform:"uppercase", marginTop:8, display:"block", fontStyle:"normal" }}>
                — E-Bench Mission Statement
              </cite>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
