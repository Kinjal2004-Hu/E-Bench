"use client";
import { useState } from "react";
import { useReveal } from "@/lib/useReveal";

const INITIAL_TESTIMONIALS = [
  {
    name: "Aarav Mehta",
    role: "Law Student",
    quote:
      "E-Bench helped me break down complex case material in minutes. The explanations are clear, structured, and easy to remember.",
    rating: 5,
  },
  {
    name: "Nisha Sharma",
    role: "Startup Founder",
    quote:
      "The contract risk analysis pointed out clauses I would have missed. It made my legal review process much faster.",
    rating: 5,
  },
  {
    name: "Rohan Kulkarni",
    role: "Litigation Intern",
    quote:
      "Case summaries and legal references are extremely practical. It feels like having a legal research assistant on demand.",
    rating: 4,
  },
  {
    name: "Priya Nair",
    role: "HR Manager",
    quote:
      "The platform helped me quickly understand employment-law implications in our internal policy drafts before legal review.",
    rating: 5,
  },
  {
    name: "Vikram Desai",
    role: "Independent Advocate",
    quote:
      "For preliminary case screening, E-Bench gives a fast and useful legal direction, especially for urgent client consultations.",
    rating: 5,
  },
  {
    name: "Sneha Patil",
    role: "Judiciary Aspirant",
    quote:
      "Micro-learning modules and concise summaries made revision much easier. The legal language is clear and exam-friendly.",
    rating: 4,
  },
  {
    name: "Imran Sheikh",
    role: "SME Business Owner",
    quote:
      "Contract checks highlighted risky terms in vendor agreements and gave me confidence before signing important documents.",
    rating: 5,
  },
  {
    name: "Kavya Rao",
    role: "Compliance Associate",
    quote:
      "The tool is great for first-pass compliance understanding. It reduces time spent on repetitive legal clarification tasks.",
    rating: 4,
  },
];

function stars(count: number) {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export default function TestimonialsSection() {
  const ref = useReveal();
  const [testimonials, setTestimonials] = useState(INITIAL_TESTIMONIALS);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [added, setAdded] = useState(false);

  const addReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !quote.trim()) return;

    setTestimonials((prev) => [
      {
        name: name.trim(),
        role: role.trim(),
        quote: quote.trim(),
        rating,
      },
      ...prev,
    ]);

    setName("");
    setRole("");
    setQuote("");
    setRating(5);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <section
      id="testimonials"
      ref={ref}
      className="home-testimonials"
      style={{ background: "var(--parchment2)", padding: "90px 60px" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          className="reveal-up"
          style={{
            fontSize: 10,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "var(--gold-mid)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ width: 24, height: 1, background: "var(--gold-mid)", display: "inline-block" }} />
          Reviews & Testimonials
        </div>

        <h2
          className="reveal-up delay-1 font-playfair"
          style={{
            fontSize: "clamp(28px,3vw,44px)",
            fontWeight: 700,
            color: "var(--navy)",
            marginBottom: 16,
          }}
        >
          Trusted by Learners and Legal Professionals
        </h2>

        <p
          className="reveal-up delay-2 font-cormorant"
          style={{ fontSize: 19, fontWeight: 400, lineHeight: 1.65, color: "var(--text-mid)", maxWidth: 640 }}
        >
          Real feedback from people using E-Bench for legal study, research, and practical document analysis.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
            marginTop: 46,
          }}
          className="testimonials-grid"
        >
          {testimonials.map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className={`reveal-up delay-${i + 2}`}
              style={{
                background: "var(--warm-white)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "24px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                minHeight: 250,
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = "0 14px 36px rgba(26,44,66,0.09)";
                el.style.borderColor = "rgba(139,105,20,0.28)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "";
                el.style.boxShadow = "";
                el.style.borderColor = "var(--border)";
              }}
            >
              <div style={{ fontSize: 14, color: "var(--gold-mid)", letterSpacing: "1px" }}>{stars(t.rating)}</div>
              <p className="font-cormorant" style={{ fontSize: 19, lineHeight: 1.65, color: "var(--text-mid)" }}>
                "{t.quote}"
              </p>
              <div style={{ marginTop: "auto" }}>
                <div className="font-playfair" style={{ fontSize: 18, color: "var(--navy)", fontWeight: 600 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold-mid)", marginTop: 4 }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}

          <form
            className="reveal-up delay-4"
            onSubmit={addReview}
            style={{
              background: "var(--warm-white)",
              border: "1px dashed rgba(139,105,20,0.45)",
              borderRadius: 10,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 250,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold-mid)" }}>
              Add Your Review
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "9px 10px",
                background: "#fff",
                color: "var(--navy)",
                fontSize: 13,
                outline: "none",
              }}
            />

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g. Student, Advocate)"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "9px 10px",
                background: "#fff",
                color: "var(--navy)",
                fontSize: 13,
                outline: "none",
              }}
            />

            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "9px 10px",
                background: "#fff",
                color: "var(--navy)",
                fontSize: 13,
                lineHeight: 1.5,
                resize: "none",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: "auto" }}>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  background: "#fff",
                  color: "var(--navy)",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>

              <button
                type="submit"
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 14px",
                  background: "linear-gradient(135deg,#8B6914,#C4963A)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add Review
              </button>
            </div>

            {added ? (
              <div style={{ fontSize: 11, color: "#2f7a42" }}>Thanks! Your review has been added.</div>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
