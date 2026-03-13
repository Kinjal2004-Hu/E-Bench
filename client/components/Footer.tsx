const PLATFORM_LINKS = [
  { label:"AI Case Analyzer", href:"#features" },
  { label:"Contract Analyzer", href:"#features" },
  { label:"Case Summarizer",  href:"#features" },
  { label:"Legal News Feed",  href:"#features" },
];
const COMPANY_LINKS = [
  { label:"About Us", href:"#purpose" },
  { label:"Sources",  href:"#sources" },
  { label:"FAQ",      href:"#faq" },
  { label:"Contact",  href:"#contact" },
];
const LEGAL_LINKS = [
  { label:"Privacy Policy", href:"#" },
  { label:"Terms of Use",   href:"#" },
  { label:"Disclaimer",     href:"#" },
  { label:"Cookie Policy",  href:"#" },
];

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{ fontSize:10, letterSpacing:"2.5px", textTransform:"uppercase", color:"#D4AF6B", marginBottom:16 }}>{title}</div>
      <ul style={{ listStyle:"none" }}>
        {links.map((l) => (
          <li key={l.label} style={{ marginBottom:10 }}>
            <a
              href={l.href}
              style={{ color:"rgba(245,241,230,0.42)", textDecoration:"none", fontSize:13, transition:"color 0.3s" }}
              onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.color="#D4AF6B"}
              onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.color="rgba(245,241,230,0.42)"}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="home-footer" style={{ background:"#1A2C42", color:"rgba(245,241,230,0.48)", padding:"52px 60px 30px" }}>
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="footer-grid" style={{ display:"grid", gridTemplateColumns:"2.2fr 1fr 1fr 1fr", gap:52, paddingBottom:38, borderBottom:"1px solid rgba(139,105,20,0.18)", marginBottom:26 }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:"#F7F3E8", letterSpacing:2, marginBottom:4 }}>
              E-Bench
            </div>
            <div style={{ fontSize:9, letterSpacing:"3px", textTransform:"uppercase", color:"#D4AF6B", marginBottom:14 }}>
              Digital Justice
            </div>
            <p style={{ fontSize:13, lineHeight:1.75, maxWidth:258, marginBottom:18 }}>
              AI-powered legal intelligence platform combining advanced AI with trusted Indian legal databases to make legal knowledge accessible to all.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              {["💻","🔗","✉️"].map((icon) => (
                <span
                  key={icon}
                  style={{
                    width:30, height:30, borderRadius:6,
                    border:"1px solid rgba(139,105,20,0.28)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:13, cursor:"pointer", transition:"border-color 0.3s",
                  }}
                  onMouseEnter={e=>(e.currentTarget as HTMLSpanElement).style.borderColor="#D4AF6B"}
                  onMouseLeave={e=>(e.currentTarget as HTMLSpanElement).style.borderColor="rgba(139,105,20,0.28)"}
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>

          <FooterCol title="Platform" links={PLATFORM_LINKS} />
          <FooterCol title="Company"  links={COMPANY_LINKS} />
          <FooterCol title="Legal"    links={LEGAL_LINKS} />
        </div>

        <div className="footer-bottom" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12 }}>
          <span>© 2026 Legal AI Platform. All rights reserved.</span>
          <div style={{ display:"flex", gap:18 }}>
            {["Privacy","Terms","Ministry of Law Platform"].map((l) => (
              <a
                key={l} href="#"
                style={{ color:"rgba(245,241,230,0.28)", textDecoration:"none", fontSize:12, transition:"color 0.3s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.color="#D4AF6B"}
                onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.color="rgba(245,241,230,0.28)"}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
