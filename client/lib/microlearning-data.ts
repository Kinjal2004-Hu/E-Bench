export type LessonStatus = "completed" | "in-progress";
export type LessonDifficulty = "Beginner" | "Intermediate";

export type MicroLessonTopic = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  difficulty: LessonDifficulty;
};

export const microLessonTopics: MicroLessonTopic[] = [
  { id: "what-is-fir", title: "What is FIR", description: "Understand FIR basics, who can file it, and what details matter most.", minutes: 8, difficulty: "Beginner" },
  { id: "article-21-right-to-life", title: "Article 21 - Right to Life", description: "Learn how personal liberty is protected under the Constitution.", minutes: 8, difficulty: "Beginner" },
  { id: "bail-vs-anticipatory-bail", title: "Bail vs Anticipatory Bail", description: "Compare regular bail and anticipatory bail with practical examples.", minutes: 10, difficulty: "Intermediate" },
  { id: "elements-of-contract", title: "Elements of Contract", description: "Offer, acceptance, consideration, and intention explained simply.", minutes: 8, difficulty: "Beginner" },
  { id: "consumer-rights-basics", title: "Consumer Rights Basics", description: "Know your rights for refunds, defects, and unfair trade practices.", minutes: 8, difficulty: "Beginner" },
  { id: "civil-vs-criminal-case", title: "Civil vs Criminal Case", description: "Understand the difference between private disputes and offences.", minutes: 8, difficulty: "Beginner" },
  { id: "fundamental-rights-overview", title: "Fundamental Rights Overview", description: "A quick map of constitutional rights and when they apply.", minutes: 10, difficulty: "Intermediate" },
  { id: "legal-notice-explained", title: "Legal Notice Explained", description: "When to send legal notice and what must be included.", minutes: 8, difficulty: "Beginner" },
];

export const lessonOfTheDayId = "article-21-right-to-life";
