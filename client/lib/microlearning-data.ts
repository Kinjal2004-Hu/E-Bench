export type LessonStatus = "completed" | "in-progress" | "locked";
export type LessonDifficulty = "Beginner" | "Intermediate";

export type MicroLesson = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  difficulty: LessonDifficulty;
  status: LessonStatus;
  lawText: string;
  simpleExplanation: string;
  importantCase: {
    name: string;
    summary: string;
  };
  scenario: {
    prompt: string;
    question: string;
  };
};

export const microLessons: MicroLesson[] = [
  {
    id: "what-is-fir",
    title: "What is FIR",
    description: "Understand FIR basics, who can file it, and what details matter most.",
    minutes: 3,
    difficulty: "Beginner",
    status: "completed",
    lawText:
      "Section 173 of the Bharatiya Nagarik Suraksha Sanhita (earlier CrPC framework) governs police report procedures after investigation.",
    simpleExplanation:
      "An FIR starts the formal criminal investigation process. A clear complaint with facts, time, and place helps authorities act quickly.",
    importantCase: {
      name: "Lalita Kumari v. Government of Uttar Pradesh (2013)",
      summary:
        "The Supreme Court held that registration of FIR is mandatory for cognizable offences when information discloses a prima facie case.",
    },
    scenario: {
      prompt: "A theft complaint is refused at the police station despite clear details.",
      question: "What legal step can the complainant take next to seek FIR registration?",
    },
  },
  {
    id: "article-21-right-to-life",
    title: "Article 21 - Right to Life",
    description: "Learn how personal liberty is protected under the Constitution.",
    minutes: 3,
    difficulty: "Beginner",
    status: "in-progress",
    lawText:
      "Article 21 of the Constitution of India: No person shall be deprived of his life or personal liberty except according to procedure established by law.",
    simpleExplanation:
      "This article protects life and personal freedom. The State must follow fair legal procedure before restricting liberty.",
    importantCase: {
      name: "Maneka Gandhi v. Union of India (1978)",
      summary:
        "The Court expanded Article 21 by requiring any procedure affecting liberty to be fair, just, and reasonable.",
    },
    scenario: {
      prompt: "A person is detained without being informed of grounds for arrest.",
      question: "Which constitutional protection may be violated?",
    },
  },
  {
    id: "bail-vs-anticipatory-bail",
    title: "Bail vs Anticipatory Bail",
    description: "Compare regular bail and anticipatory bail with practical examples.",
    minutes: 4,
    difficulty: "Intermediate",
    status: "locked",
    lawText:
      "Anticipatory bail is sought before arrest, while regular bail is sought after arrest through competent court procedure.",
    simpleExplanation:
      "Both remedies protect liberty, but they apply at different stages of criminal process.",
    importantCase: {
      name: "Gurbaksh Singh Sibbia v. State of Punjab (1980)",
      summary: "This case clarified broad principles for granting anticipatory bail and judicial discretion.",
    },
    scenario: {
      prompt: "A person fears arrest in a non-bailable offence based on a dispute.",
      question: "Which remedy is appropriate before arrest?",
    },
  },
  {
    id: "elements-of-contract",
    title: "Elements of Contract",
    description: "Offer, acceptance, consideration, and intention explained simply.",
    minutes: 4,
    difficulty: "Beginner",
    status: "completed",
    lawText:
      "A valid contract generally requires lawful offer, lawful acceptance, lawful consideration, and intention to create legal relations.",
    simpleExplanation:
      "If key elements are missing, agreement may not be enforceable in court.",
    importantCase: {
      name: "Carlill v. Carbolic Smoke Ball Co. (1893)",
      summary: "The judgment illustrates principles of offer, acceptance, and enforceability.",
    },
    scenario: {
      prompt: "A party signs a deal with no clear consideration exchanged.",
      question: "Can this agreement be challenged as invalid?",
    },
  },
  {
    id: "consumer-rights-basics",
    title: "Consumer Rights Basics",
    description: "Know your rights for refunds, defects, and unfair trade practices.",
    minutes: 3,
    difficulty: "Beginner",
    status: "in-progress",
    lawText:
      "Consumer protection laws provide remedies for defective goods, deficient services, unfair trade practices, and misleading advertisements.",
    simpleExplanation:
      "Consumers can seek refund, replacement, or compensation through formal grievance channels.",
    importantCase: {
      name: "Lucknow Development Authority v. M.K. Gupta (1994)",
      summary: "The Court recognized compensation claims for deficiency in service.",
    },
    scenario: {
      prompt: "An online platform refuses refund for a defective appliance delivered last week.",
      question: "What forum can the consumer approach for relief?",
    },
  },
  {
    id: "civil-vs-criminal-case",
    title: "Civil vs Criminal Case",
    description: "Understand the difference between private disputes and offences.",
    minutes: 3,
    difficulty: "Beginner",
    status: "locked",
    lawText:
      "Civil cases deal with private rights and compensation, while criminal cases address offences against state/public order.",
    simpleExplanation:
      "Relief in civil matters is usually compensation/injunction; criminal matters involve punishment.",
    importantCase: {
      name: "State of Haryana v. Bhajan Lal (1992)",
      summary: "The case is often cited for criminal process safeguards and abuse prevention.",
    },
    scenario: {
      prompt: "Two businesses dispute breach of payment terms.",
      question: "Is this primarily civil or criminal in nature?",
    },
  },
  {
    id: "fundamental-rights-overview",
    title: "Fundamental Rights Overview",
    description: "A quick map of constitutional rights and when they apply.",
    minutes: 5,
    difficulty: "Intermediate",
    status: "locked",
    lawText:
      "Part III of the Constitution guarantees enforceable rights including equality, freedom, protection in criminal law, and constitutional remedies.",
    simpleExplanation:
      "Fundamental rights protect citizens from arbitrary state action and can be enforced in courts.",
    importantCase: {
      name: "Kesavananda Bharati v. State of Kerala (1973)",
      summary: "Established the basic structure doctrine and strengthened constitutional safeguards.",
    },
    scenario: {
      prompt: "A policy appears to violate equality principles for a group of citizens.",
      question: "Which constitutional route may be used to challenge it?",
    },
  },
  {
    id: "legal-notice-explained",
    title: "Legal Notice Explained",
    description: "When to send legal notice and what must be included.",
    minutes: 3,
    difficulty: "Beginner",
    status: "completed",
    lawText:
      "A legal notice formally communicates grievance and intention to initiate legal action if dispute remains unresolved.",
    simpleExplanation:
      "It creates a documented pre-litigation record and can encourage settlement before court filing.",
    importantCase: {
      name: "State-level procedural precedents vary",
      summary: "Courts often treat proper notice as strong evidence of fair opportunity and intent.",
    },
    scenario: {
      prompt: "A landlord repeatedly ignores refund requests for security deposit.",
      question: "What key points should be included in a legal notice?",
    },
  },
];

export const lessonOfTheDayId = "article-21-right-to-life";
