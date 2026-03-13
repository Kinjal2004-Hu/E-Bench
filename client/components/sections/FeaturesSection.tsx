"use client";
import { useReveal } from "@/lib/useReveal";

const FEATURES = [
  {
    num:"01", icon:"⚖️", badge:"Case Intelligence",
    name:"AI Case Analyzer",
    desc:"Upload or describe a case and instantly identify applicable legal sections and relevant past judgments from verified databases.",
    wide: false,
  },
  {
    num:"02", icon:"📋", badge:"Risk Detection",
    name:"Contract Risk Analyzer",
    desc:"Detect hidden risks, unfair clauses, and legal loopholes using advanced AI. Get a clear risk score and plain-English explanation for every clause — before you sign anything.",
    wide: true,
  },
  {
    num:"03", icon:"📄", badge:"Document Processing",
    name:"Case File Summarizer",
    desc:"Convert long legal documents such as FIRs, chargesheets, and court orders into clear structured summaries. Understand complex filings in minutes, not hours.",
    wide: true,
  },
  {
    num:"04", icon:"📰", badge:"Stay Updated",
    name:"Daily Law Awareness",
    desc:"Stay updated with the latest legal developments, rights, and government notifications — curated daily.",
    wide: false,
  },
  {
    num:"05", icon:"🎯", badge:"Personalized",
    name:"Lawyer Consultation",
    desc:"Book one-to-one consultations with verified lawyers, share your case details securely, and get practical guidance tailored to your legal situation.",
    wide: false,
  },
    {
    num:"05", icon:"🎯", badge:"Personalized",
    name:"AI chat Bot",
    desc:"Ask legal questions in plain language and get instant AI-guided answers, relevant sections, and step-by-step clarity for common legal situations.",
    wide: false,
  },
    {
    num:"06", icon:"🎯", badge:"Personalized",
    name:"Legal Forum & Community",
    desc:"Join moderated discussions with learners and legal professionals, share experiences, and get peer support on legal topics and procedures.",
    wide: false,
  },
    {
    num:"07", icon:"🎯", badge:"Personalized",
    name:"Micro-Learning Modules",
    desc:"Learn core legal concepts through short bite-sized lessons, quick examples, and practical explainers designed for everyday understanding.",
    wide: false,
  },
    {
    num:"08", icon:"🎯", badge:"Personalized",
    name:"Case Summarizer",
    desc:"Turn long case records and court filings into structured key-point summaries with facts, issues, arguments, and outcomes in minutes.",
    wide: false,
  },
    {
    num:"09", icon:"🎯", badge:"Personalized",
    name:"Legal News Feed",
    desc:"Track latest judgments, policy updates, and legal developments through a clean feed with quick takeaways and category filters.",
    wide: false,
  },

];

export default function FeaturesSection() {
  const ref = useReveal();

  return (
    <section
      id="features"
      ref={ref}
      className="home-features"
      style={{ background:"var(--parchment)", padding:"90px 60px" }}
    >
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="reveal-up" style={{ fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:24, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
          What We Offer
        </div>
        <h2 className="reveal-up delay-1 font-playfair" style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:700, color:"var(--navy)", marginBottom:16 }}>
          Core Features
        </h2>
        <p className="reveal-up delay-2 font-cormorant" style={{ fontSize:19, fontWeight:400, lineHeight:1.65, color:"var(--text-mid)", maxWidth:520 }}>
          Five powerful AI tools built for legal intelligence — from case analysis to personalized law awareness.
        </p>

        <div className="features-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginTop:50 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.num} feature={f} delay={i + 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay }: { feature: typeof FEATURES[0]; delay: number }) {
  return (
    <div
      className={`reveal-up delay-${delay} feature-card`}
      style={{
        background:"var(--warm-white)",
        border:"1px solid var(--border)",
        borderRadius:10,
        padding:"30px 26px",
        position:"relative",
        overflow:"hidden",
        cursor:"default",
        gridColumn: feature.wide ? "span 2" : "span 1",
        transition:"all 0.4s cubic-bezier(0.23,1,0.32,1)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-6px)";
        el.style.boxShadow = "0 16px 48px rgba(26,44,66,0.1)";
        el.style.borderColor = "rgba(139,105,20,0.32)";
        const bar = el.querySelector(".top-bar") as HTMLElement;
        if (bar) bar.style.transform = "scaleX(1)";
        const icon = el.querySelector(".feat-icon-el") as HTMLElement;
        if (icon) icon.style.transform = "scale(1.08) rotate(-3deg)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = "var(--border)";
        const bar = el.querySelector(".top-bar") as HTMLElement;
        if (bar) bar.style.transform = "scaleX(0)";
        const icon = el.querySelector(".feat-icon-el") as HTMLElement;
        if (icon) icon.style.transform = "";
      }}
    >
      {/* Gold top bar */}
      <div className="top-bar" style={{
        position:"absolute", top:0, left:0, right:0, height:3,
        background:"linear-gradient(90deg,#8B6914,#D4AF6B)",
        transform:"scaleX(0)", transformOrigin:"left",
        transition:"transform 0.4s",
      }} />

      {/* BG number */}
      <div className="font-playfair" style={{
        position:"absolute", bottom:10, right:18,
        fontSize:68, fontWeight:900, color:"rgba(26,44,66,0.04)",
        userSelect:"none", lineHeight:1,
      }}>
        {feature.num}
      </div>

      {/* Icon */}
      <div className="feat-icon-el" style={{
        width:52, height:52, marginBottom:18,
        background:"linear-gradient(135deg,rgba(139,105,20,0.1),rgba(139,105,20,0.04))",
        border:"1px solid rgba(139,105,20,0.22)", borderRadius:10,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:24, transition:"transform 0.3s",
      }}>
        {feature.icon}
      </div>

      <div style={{ fontSize:9, letterSpacing:"2px", textTransform:"uppercase", color:"var(--gold-mid)", marginBottom:9, fontWeight:500 }}>
        {feature.badge}
      </div>
      <div className="font-playfair" style={{ fontSize:20, fontWeight:600, color:"var(--navy)", marginBottom:11 }}>
        {feature.name}
      </div>
      <p style={{ fontSize:14, lineHeight:1.75, color:"var(--text-light)" }}>{feature.desc}</p>
    </div>
  );
}
