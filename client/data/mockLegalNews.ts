export type LegalNewsItem = {
  id: number;
  headline: string;
  summary: string;
  date: string;
  category: string;
  tag: string;
  featured?: boolean;
};

export const mockLegalNews: LegalNewsItem[] = [
  {
    id: 1,
    headline: "Supreme Court upholds right to digital privacy in landmark ruling",
    summary:
      "In a unanimous decision, the Constitution Bench reaffirmed that digital privacy forms part of personal liberty and directed stronger safeguards around sensitive citizen data handling.",
    date: "Today, 10:45 AM",
    category: "Constitutional Law",
    tag: "Supreme Court",
    featured: true,
  },
  {
    id: 2,
    headline: "Parliament debates stricter penalties in major financial fraud matters",
    summary:
      "Lawmakers discussed enhanced punishment standards, tighter disclosure duties, and faster prosecution tracks for large-value fraud and deceptive financial practices.",
    date: "Today, 08:10 AM",
    category: "Criminal Law",
    tag: "Parliament",
  },
  {
    id: 3,
    headline: "New cyber dispute benches proposed for faster digital fraud hearings",
    summary:
      "A policy draft proposes specialised cyber benches to reduce pendency in phishing, account takeover, and online payment fraud disputes across major states.",
    date: "Yesterday",
    category: "Cyber Law",
    tag: "Ministry of IT",
  },
  {
    id: 4,
    headline: "High Court reviews arrest procedure compliance in custodial rights petition",
    summary:
      "The court sought status reports on arrest memo compliance, legal aid access, and family notification safeguards in a petition alleging procedural violations.",
    date: "Yesterday",
    category: "Criminal Procedure",
    tag: "High Court",
  },
  {
    id: 5,
    headline: "Consumer authority issues advisory on refund timelines for online marketplaces",
    summary:
      "Fresh compliance guidance asks platforms to make cancellation, return, and refund timelines clearer for consumers purchasing goods through e-commerce channels.",
    date: "2 days ago",
    category: "Consumer Law",
    tag: "Consumer Authority",
  },
  {
    id: 6,
    headline: "SEBI signals tighter disclosures for listed companies in governance review",
    summary:
      "The regulator indicated that corporate reporting standards may be updated to improve board accountability, disclosure precision, and investor transparency.",
    date: "3 days ago",
    category: "Corporate Law",
    tag: "SEBI",
  },
];

export const trendingLegalTopics = [
  "Supreme Court",
  "Digital Privacy",
  "Cyber Security",
  "Consumer Rights",
  "Corporate Governance",
  "Arrest Safeguards",
];