"use client";
import { useReveal } from "@/lib/useReveal";

const SOURCES = [
  { icon:"🏛️", name:"Supreme Court of India", type:"Official Judgments" },
  { icon:"⚖️", name:"Indian Kanoon", type:"Legal Case Repository" },
  { icon:"📊", name:"National Judicial Data Grid", type:"Court Statistics" },
  { icon:"📢", name:"Press Information Bureau", type:"Govt. Notifications" },
  { icon:"📜", name:"Ministry of Law & Justice", type:"Official Resources" },
];

// doubled for seamless loop
const ALL_SOURCES = [...SOURCES, ...SOURCES];

export default function SourcesSection() {
  const ref = useReveal();

  return (
    <section
      id="sources"
      ref={ref}
      className="home-sources"
      style={{ background:"var(--parchment2)", padding:"90px 0" }}
    >
      <div className="sources-header" style={{ maxWidth:900, margin:"0 auto", textAlign:"center", padding:"0 60px" }}>
        <div className="reveal-up" style={{
          fontSize:10, letterSpacing:"3px", textTransform:"uppercase", color:"var(--gold-mid)",
          marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        }}>
          <span style={{ width:22, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
          Verified Data
          <span style={{ width:22, height:1, background:"var(--gold-mid)", display:"inline-block" }} />
        </div>
        <h2 className="reveal-up delay-1 font-playfair" style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:700, color:"var(--navy)", marginBottom:16 }}>
          Trusted Legal Sources
        </h2>
        <p className="reveal-up delay-2 font-cormorant" style={{ fontSize:18, color:"var(--text-mid)", lineHeight:1.65 }}>
          Verified Legal Databases and Government Resources. Our platform uses only authoritative, publicly available legal data.
        </p>
      </div>

      {/* Marquee */}
      <div className="marquee-wrap" style={{ marginTop:50 }}>
        <div className="marquee-track">
          {ALL_SOURCES.map((s, i) => (
            <div
              key={i}
              style={{
                background:"var(--warm-white)", border:"1px solid var(--border)",
                borderRadius:10, padding:"16px 24px",
                display:"flex", alignItems:"center", gap:14,
                minWidth:210, whiteSpace:"nowrap",
                transition:"all 0.3s", cursor:"default",
              }}
              onMouseEnter={e=>{
                const el=e.currentTarget as HTMLDivElement;
                el.style.borderColor="var(--gold-light)";
                el.style.transform="translateY(-2px)";
              }}
              onMouseLeave={e=>{
                const el=e.currentTarget as HTMLDivElement;
                el.style.borderColor="var(--border)";
                el.style.transform="";
              }}
            >
              <div style={{
                width:38, height:38, borderRadius:8,
                background:"linear-gradient(135deg,#1A2C42,#243552)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:17, flexShrink:0,
              }}>
                {s.icon}
              </div>
              <div>
                <div className="font-playfair" style={{ fontSize:14, fontWeight:600, color:"var(--navy)" }}>{s.name}</div>
                <div style={{ fontSize:11, color:"var(--text-light)", marginTop:2 }}>{s.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
