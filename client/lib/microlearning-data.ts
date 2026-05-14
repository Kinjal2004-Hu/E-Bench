export type LessonStatus = "completed" | "in-progress" | "locked";
export type LessonDifficulty = "Beginner" | "Intermediate";

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
};

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
  quiz: QuizQuestion[];
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
    quiz: [
      {
        id: "q1",
        question: "What did the Supreme Court hold in Lalita Kumari v. Government of Uttar Pradesh?",
        options: [
          { id: "a", label: "FIR registration is mandatory for cognizable offences" },
          { id: "b", label: "FIR registration is optional for all offences" },
          { id: "c", label: "Only the victim can file an FIR" },
          { id: "d", label: "FIR requires prior court approval" },
        ],
        correctOptionId: "a",
        explanation: "The Supreme Court held that FIR registration is mandatory when information discloses a cognizable offence.",
      },
      {
        id: "q2",
        question: "What is the primary purpose of filing an FIR?",
        options: [
          { id: "a", label: "To start the formal criminal investigation process" },
          { id: "b", label: "To file a civil lawsuit for damages" },
          { id: "c", label: "To register a property dispute" },
          { id: "d", label: "To directly apply for bail" },
        ],
        correctOptionId: "a",
        explanation: "An FIR sets the criminal investigation in motion by recording the complaint with law enforcement.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "What did Maneka Gandhi v. Union of India establish about Article 21?",
        options: [
          { id: "a", label: "Procedure must be fair, just and reasonable" },
          { id: "b", label: "Article 21 only protects the right to life" },
          { id: "c", label: "Personal liberty can never be restricted" },
          { id: "d", label: "Only citizens have protection under Article 21" },
        ],
        correctOptionId: "a",
        explanation: "The Supreme Court expanded Article 21 to require that any procedure depriving liberty must be fair, just and reasonable.",
      },
      {
        id: "q2",
        question: "Article 21 allows deprivation of life or liberty only by:",
        options: [
          { id: "a", label: "Procedure established by law" },
          { id: "b", label: "Executive order or notification" },
          { id: "c", label: "Police officer's discretion" },
          { id: "d", label: "Any administrative action" },
        ],
        correctOptionId: "a",
        explanation: "The text of Article 21 explicitly requires 'procedure established by law' for any deprivation of life or liberty.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "When is anticipatory bail sought?",
        options: [
          { id: "a", label: "Before arrest, when arrest is feared" },
          { id: "b", label: "Only after arrest and production before magistrate" },
          { id: "c", label: "After conviction by a trial court" },
          { id: "d", label: "Only during the appeal process" },
        ],
        correctOptionId: "a",
        explanation: "Anticipatory bail is a pre-arrest remedy sought when a person reasonably fears arrest.",
      },
      {
        id: "q2",
        question: "What did Gurbaksh Singh Sibbia v. State of Punjab primarily clarify?",
        options: [
          { id: "a", label: "Principles and discretion for granting anticipatory bail" },
          { id: "b", label: "Definition of regular bail after arrest" },
          { id: "c", label: "That bail is an absolute fundamental right" },
          { id: "d", label: "That anticipatory bail cannot be granted for any offence" },
        ],
        correctOptionId: "a",
        explanation: "The case established broad guidelines for courts to exercise discretion when granting anticipatory bail.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "Which of the following is NOT an essential element of a valid contract?",
        options: [
          { id: "a", label: "Registration with a government authority" },
          { id: "b", label: "Lawful offer and acceptance" },
          { id: "c", label: "Lawful consideration" },
          { id: "d", label: "Intention to create legal relations" },
        ],
        correctOptionId: "a",
        explanation: "Registration is not required for a valid contract — offer, acceptance, consideration, and intention are the essential elements.",
      },
      {
        id: "q2",
        question: "What legal principle did Carlill v. Carbolic Smoke Ball Co. establish?",
        options: [
          { id: "a", label: "An advertisement can constitute a binding offer" },
          { id: "b", label: "All contracts must be in writing" },
          { id: "c", label: "Consideration is optional in contracts" },
          { id: "d", label: "Only written agreements are enforceable" },
        ],
        correctOptionId: "a",
        explanation: "The case established that a unilateral offer made to the world (via advertisement) can become a binding contract upon performance.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "Which remedies are available to consumers under consumer protection laws?",
        options: [
          { id: "a", label: "Refund, replacement, and compensation" },
          { id: "b", label: "Only a full refund" },
          { id: "c", label: "Only replacement of the product" },
          { id: "d", label: "Only monetary compensation" },
        ],
        correctOptionId: "a",
        explanation: "Consumer protection laws provide multiple remedies including refund, replacement, and compensation for damages.",
      },
      {
        id: "q2",
        question: "What did Lucknow Development Authority v. M.K. Gupta establish?",
        options: [
          { id: "a", label: "Consumers can claim compensation for deficiency in service" },
          { id: "b", label: "Government authorities are exempt from consumer law" },
          { id: "c", label: "Only goods are covered under consumer law" },
          { id: "d", label: "Compensation cannot exceed the product price" },
        ],
        correctOptionId: "a",
        explanation: "The Supreme Court recognized that deficiency in service, even by public authorities, entitles consumers to compensation.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "Civil cases primarily deal with:",
        options: [
          { id: "a", label: "Private rights, disputes, and compensation" },
          { id: "b", label: "Offences against the state" },
          { id: "c", label: "Criminal punishment and sentencing" },
          { id: "d", label: "Police investigation procedures" },
        ],
        correctOptionId: "a",
        explanation: "Civil law governs private disputes between individuals/organizations, typically seeking compensation or injunctions.",
      },
      {
        id: "q2",
        question: "What is the primary purpose of criminal law?",
        options: [
          { id: "a", label: "To address offences against state and public order" },
          { id: "b", label: "To resolve private contract disputes" },
          { id: "c", label: "To register property transactions" },
          { id: "d", label: "To handle family inheritance matters" },
        ],
        correctOptionId: "a",
        explanation: "Criminal law addresses conduct that is considered harmful to public order and the state, with punishment as the primary remedy.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "Which Part of the Indian Constitution contains the Fundamental Rights?",
        options: [
          { id: "a", label: "Part III" },
          { id: "b", label: "Part II" },
          { id: "c", label: "Part IV" },
          { id: "d", label: "Part I" },
        ],
        correctOptionId: "a",
        explanation: "Fundamental Rights are enshrined in Part III of the Constitution, covering Articles 12 to 35.",
      },
      {
        id: "q2",
        question: "What did Kesavananda Bharati v. State of Kerala establish?",
        options: [
          { id: "a", label: "The basic structure doctrine limits Parliament's amending power" },
          { id: "b", label: "Fundamental Rights are absolute and cannot be restricted" },
          { id: "c", label: "Parliament can amend any part of the Constitution" },
          { id: "d", label: "Fundamental Rights cannot be enforced in courts" },
        ],
        correctOptionId: "a",
        explanation: "The landmark case established that Parliament cannot alter the 'basic structure' of the Constitution through amendments.",
      },
    ],
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
    quiz: [
      {
        id: "q1",
        question: "What is the primary purpose of sending a legal notice?",
        options: [
          { id: "a", label: "To formally communicate grievance before initiating legal action" },
          { id: "b", label: "To directly file a lawsuit in court" },
          { id: "c", label: "To request police to register an FIR" },
          { id: "d", label: "To apply for bail or anticipatory bail" },
        ],
        correctOptionId: "a",
        explanation: "A legal notice serves as a formal pre-litigation communication giving the other party an opportunity to resolve the dispute.",
      },
      {
        id: "q2",
        question: "A properly drafted legal notice serves as:",
        options: [
          { id: "a", label: "Strong evidence of fair opportunity and intent in court" },
          { id: "b", label: "A binding court judgment against the recipient" },
          { id: "c", label: "An automatic police complaint" },
          { id: "d", label: "An arrest warrant if ignored" },
        ],
        correctOptionId: "a",
        explanation: "Courts treat a proper legal notice as evidence that the sender gave fair opportunity for resolution before litigation.",
      },
    ],
  },
];

export const lessonOfTheDayId = "article-21-right-to-life";
