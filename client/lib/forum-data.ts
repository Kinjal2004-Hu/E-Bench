export type ForumCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  postCount: number;
};

export type ForumPost = {
  id: string;
  title: string;
  category: string;
  author: string;
  authorRole: "member" | "lawyer";
  replies: number;
  upvotes: number;
  timestamp: string;
  solved: boolean;
  tags: string[];
  content: string;
};

export type ForumReply = {
  id: string;
  postId: string;
  user: string;
  role: "member" | "lawyer";
  avatar: string;
  text: string;
  timestamp: string;
  upvotes: number;
  isBestAnswer?: boolean;
};

export const forumCategories: ForumCategory[] = [
  {
    id: "criminal-law",
    name: "Criminal Law",
    description: "FIR, bail, arrests, evidence and trial procedures.",
    icon: "Scale",
    postCount: 184,
  },
  {
    id: "family-law",
    name: "Family Law",
    description: "Marriage, divorce, custody, maintenance and family rights.",
    icon: "Users",
    postCount: 143,
  },
  {
    id: "property-law",
    name: "Property Law",
    description: "Ownership disputes, registration, transfer and tenancy.",
    icon: "Building2",
    postCount: 128,
  },
  {
    id: "cyber-law",
    name: "Cyber Law",
    description: "Online frauds, privacy, harassment and digital evidence.",
    icon: "Shield",
    postCount: 95,
  },
  {
    id: "consumer-rights",
    name: "Consumer Rights",
    description: "Defective products, refunds, service issues and claims.",
    icon: "BadgeCheck",
    postCount: 111,
  },
  {
    id: "corporate-law",
    name: "Corporate Law",
    description: "Contracts, compliance, governance and startup legal basics.",
    icon: "BriefcaseBusiness",
    postCount: 89,
  },
];

export const forumPosts: ForumPost[] = [
  {
    id: "1",
    title: "Can an FIR be withdrawn after a settlement in a minor assault case?",
    category: "Criminal Law",
    author: "Riya S.",
    authorRole: "member",
    replies: 14,
    upvotes: 62,
    timestamp: "2h ago",
    solved: true,
    tags: ["FIR", "Settlement", "IPC"],
    content:
      "A local dispute led to an FIR under minor sections. Both parties now want to settle. What is the legal process for quashing or withdrawal, and where should we file the request?",
  },
  {
    id: "2",
    title: "How to verify title chain before buying inherited land?",
    category: "Property Law",
    author: "Mohan K.",
    authorRole: "member",
    replies: 8,
    upvotes: 47,
    timestamp: "5h ago",
    solved: false,
    tags: ["Land", "Title", "Registration"],
    content:
      "I am planning to buy agricultural land that was inherited by the seller. What documents should I ask for to avoid future title disputes?",
  },
  {
    id: "3",
    title: "Employer denied maternity leave despite one year of service",
    category: "Corporate Law",
    author: "Ananya P.",
    authorRole: "member",
    replies: 19,
    upvotes: 88,
    timestamp: "1d ago",
    solved: true,
    tags: ["Employment", "Maternity", "Benefits"],
    content:
      "My company says I am not eligible for maternity benefits because my role is contractual. I have worked continuously for one year. What options do I have?",
  },
  {
    id: "4",
    title: "Online shopping platform refusing refund for defective phone",
    category: "Consumer Rights",
    author: "Nitin A.",
    authorRole: "member",
    replies: 11,
    upvotes: 54,
    timestamp: "2d ago",
    solved: false,
    tags: ["Refund", "Ecommerce", "Defect"],
    content:
      "I reported a hardware defect within 48 hours, but the platform only offers repair. Can I demand replacement or refund under consumer law?",
  },
  {
    id: "5",
    title: "What immediate steps should I take after a UPI fraud complaint?",
    category: "Cyber Law",
    author: "Dheeraj M.",
    authorRole: "member",
    replies: 27,
    upvotes: 102,
    timestamp: "3d ago",
    solved: true,
    tags: ["UPI", "Fraud", "Cybercrime"],
    content:
      "An unauthorized UPI transfer happened from my account. I blocked the account and raised a complaint. What legal and procedural steps should I take next?",
  },
  {
    id: "6",
    title: "Shared custody rights when one parent relocates to another city",
    category: "Family Law",
    author: "Sneha V.",
    authorRole: "member",
    replies: 9,
    upvotes: 36,
    timestamp: "4d ago",
    solved: false,
    tags: ["Custody", "Relocation", "Family Court"],
    content:
      "My ex-spouse plans to move cities with our child. We currently have a shared custody arrangement. What can I do to preserve my visitation and decision-making rights?",
  },
];

export const forumReplies: ForumReply[] = [
  {
    id: "r1",
    postId: "1",
    user: "Adv. Karan Mehta",
    role: "lawyer",
    avatar: "KM",
    text:
      "In compoundable matters, parties can settle and file the compromise memo before the trial court. For non-compoundable sections, you generally approach the High Court for quashing under Section 482 CrPC with settlement documents and affidavits.",
    timestamp: "1h ago",
    upvotes: 41,
    isBestAnswer: true,
  },
  {
    id: "r2",
    postId: "1",
    user: "Asha R.",
    role: "member",
    avatar: "AR",
    text:
      "Please also keep signed settlement terms and identity proofs ready. It helped us avoid delays in court filing.",
    timestamp: "58m ago",
    upvotes: 9,
  },
  {
    id: "r3",
    postId: "5",
    user: "Adv. Nidhi Prasad",
    role: "lawyer",
    avatar: "NP",
    text:
      "Report to cybercrime helpline 1930 immediately, preserve transaction screenshots, and submit written complaint to bank nodal officer. If unresolved, file with cyber police and banking ombudsman.",
    timestamp: "2d ago",
    upvotes: 52,
    isBestAnswer: true,
  },
  {
    id: "r4",
    postId: "5",
    user: "Raghav T.",
    role: "member",
    avatar: "RT",
    text:
      "I got partial recovery by escalating within 24 hours. Keep your complaint reference number handy for follow-up.",
    timestamp: "2d ago",
    upvotes: 17,
  },
];

export const topContributors = [
  { name: "Adv. Karan Mehta", points: 1480 },
  { name: "Adv. Nidhi Prasad", points: 1335 },
  { name: "Ananya P.", points: 920 },
  { name: "Mohan K.", points: 870 },
];

export const trendingTopics = [
  "Cyber fraud recovery timelines",
  "Tenant eviction notice format",
  "Employee maternity entitlement",
  "Domestic violence emergency orders",
];

export const recentlySolved = [
  "FIR quashing after settlement",
  "UPI fraud first-response checklist",
  "Legal notice for refund claims",
];

export const beginnerGuides = [
  {
    title: "How to file an FIR: step-by-step",
    readTime: "6 min",
  },
  {
    title: "Consumer complaint format for beginners",
    readTime: "5 min",
  },
  {
    title: "Understanding bail terms in simple language",
    readTime: "7 min",
  },
];

export function toRelativeTimestamp(input: string | Date) {
  const source = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(source.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - source.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}m ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }

  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
}
