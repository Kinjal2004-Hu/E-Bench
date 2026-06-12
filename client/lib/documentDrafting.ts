import { jsPDF } from "jspdf";
import { savePdfDownload } from "@/lib/downloadHistory";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocCategory = "tenant" | "legal_notice" | "affidavit" | "rent_agreement" | "custom";

export type DraftQuestion = {
  id: string;
  type: "text" | "textarea" | "date" | "select" | "yesno";
  label: string;
  hint?: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

export type DocTemplate = {
  id: string;
  category: DocCategory;
  label: string;
  description: string;
  icon: string;
  questions: DraftQuestion[];
  generate: (answers: Record<string, string>) => string;
  legalRefs?: string[];
};

export type DraftAnswers = Record<string, string>;

export type DraftSession = {
  category: DocCategory | null;
  answers: DraftAnswers;
  currentStep: number;
  phase: "select" | "interview" | "preview";
};

// ── Question sets per category ───────────────────────────────────────────────

const TENANT_QUESTIONS: DraftQuestion[] = [
  { id: "tenant_name", type: "text", label: "Your full name", required: true },
  { id: "landlord_name", type: "text", label: "Landlord's full name", required: true },
  { id: "property_address", type: "textarea", label: "Rented property address", required: true, placeholder: "Full address of the rented premises" },
  { id: "tenancy_start", type: "date", label: "Tenancy start date", required: true, hint: "When did your tenancy begin?" },
  { id: "tenancy_end", type: "date", label: "Tenancy end date (as per agreement)", hint: "Leave blank if month-to-month" },
  { id: "monthly_rent", type: "text", label: "Monthly rent amount", required: true, placeholder: "e.g. ₹15,000" },
  { id: "illegal_act", type: "select", label: "What did the landlord do?", required: true, options: ["Changed locks / locked me out", "Cut off electricity/water supply", "Threatened or intimidated me", "Served an illegal eviction notice", "Entered without permission / removed belongings", "Multiple of the above"] },
  { id: "act_date", type: "date", label: "When did this happen?", required: true },
  { id: "police_complaint", type: "yesno", label: "Have you filed a police complaint?", hint: "If yes, provide details in the next field" },
  { id: "police_details", type: "textarea", label: "Police complaint details (FIR number, station, date)", hint: "If you filed a complaint" },
  { id: "desired_outcome", type: "textarea", label: "What outcome do you want?", required: true, placeholder: "e.g. Stop harassment, continue tenancy, compensation for damages" },
];

const LEGAL_NOTICE_QUESTIONS: DraftQuestion[] = [
  { id: "sender_name", type: "text", label: "Sender's full name", required: true },
  { id: "sender_address", type: "textarea", label: "Sender's address", required: true },
  { id: "recipient_name", type: "text", label: "Recipient's full name", required: true },
  { id: "recipient_address", type: "textarea", label: "Recipient's address", required: true },
  { id: "notice_subject", type: "text", label: "Subject of the notice", required: true, placeholder: "e.g. Legal notice for recovery of dues" },
  { id: "facts_summary", type: "textarea", label: "Summary of facts giving rise to the notice", required: true, hint: "Describe the key facts chronologically" },
  { id: "legal_grounds", type: "textarea", label: "Legal grounds / sections of law relied upon", hint: "e.g. Section 73 of Indian Contract Act, 1872" },
  { id: "relief_sought", type: "textarea", label: "Specific relief / demands", required: true, placeholder: "What do you want the recipient to do?" },
  { id: "response_deadline", type: "text", label: "Response deadline (days)", required: true, placeholder: "e.g. 15 days" },
  { id: "jurisdiction", type: "text", label: "Place of jurisdiction", required: true, placeholder: "e.g. Courts at Mumbai" },
  { id: "advocate_name", type: "text", label: "Advocate's name (if applicable)", hint: "Leave blank if sending personally" },
];

const AFFIDAVIT_QUESTIONS: DraftQuestion[] = [
  { id: "deponent_name", type: "text", label: "Deponent's full name", required: true },
  { id: "deponent_age", type: "text", label: "Deponent's age", required: true },
  { id: "deponent_occupation", type: "text", label: "Deponent's occupation", required: true },
  { id: "deponent_address", type: "textarea", label: "Deponent's address", required: true },
  { id: "sworn_facts", type: "textarea", label: "Facts being sworn to", required: true, hint: "State the facts clearly in first person. Each fact on a new line." },
  { id: "place_of_swearing", type: "text", label: "Place of swearing", required: true, placeholder: "e.g. New Delhi" },
  { id: "date_of_swearing", type: "date", label: "Date of swearing", required: true },
  { id: "language", type: "select", label: "Language", required: true, options: ["English", "Hindi", "Marathi", "Other"] },
];

const RENT_AGREEMENT_QUESTIONS: DraftQuestion[] = [
  { id: "landlord_name_ag", type: "text", label: "Landlord's full name (Lessor)", required: true },
  { id: "landlord_address_ag", type: "textarea", label: "Landlord's address", required: true },
  { id: "tenant_name_ag", type: "text", label: "Tenant's full name (Lessee)", required: true },
  { id: "tenant_address_ag", type: "textarea", label: "Tenant's address", required: true },
  { id: "property_ag", type: "textarea", label: "Property address being rented", required: true },
  { id: "rent_amount_ag", type: "text", label: "Monthly rent amount", required: true, placeholder: "e.g. ₹20,000" },
  { id: "deposit_amount_ag", type: "text", label: "Security deposit amount", required: true, placeholder: "e.g. ₹40,000" },
  { id: "duration_months", type: "text", label: "Duration of lease (months)", required: true, placeholder: "e.g. 11" },
  { id: "start_date_ag", type: "date", label: "Lease start date", required: true },
  { id: "end_date_ag", type: "date", label: "Lease end date", required: true },
  { id: "notice_period_ag", type: "text", label: "Notice period (days)", required: true, placeholder: "e.g. 30" },
  { id: "maintenance_included", type: "yesno", label: "Is maintenance included in rent?", hint: "e.g. society charges, repairs" },
];

const CUSTOM_QUESTIONS: DraftQuestion[] = [
  { id: "doc_title", type: "text", label: "Document title", required: true, placeholder: "e.g. Letter of Complaint, Notice of Termination" },
  { id: "recipient_custom", type: "text", label: "Addressee (To)", required: true, placeholder: "Name and designation" },
  { id: "subject_custom", type: "text", label: "Subject line", required: true },
  { id: "body_custom", type: "textarea", label: "Document body", required: true, hint: "Write the full content of the document" },
  { id: "closing_remarks", type: "textarea", label: "Closing remarks / signature block", required: true, placeholder: "e.g. Yours faithfully,\n[Your Name]" },
];

// ── Template registry ─────────────────────────────────────────────────────────

export const TEMPLATES: Record<DocCategory, DocTemplate> = {
  tenant: {
    id: "tenant-eviction",
    category: "tenant",
    label: "Tenant / Landlord Letter",
    description: "Respond to illegal eviction attempts, lockouts, utility cuts, or harassment by your landlord",
    icon: "🏠",
    questions: TENANT_QUESTIONS,
    generate: (a) => generateTenantLetter(a),
    legalRefs: [
      "Transfer of Property Act, 1882 — Section 108 (Rights of lessee)",
      "Indian Contract Act, 1872 — Sections 73, 74 (Damages for breach)",
      "Specific Relief Act, 1963 — Sections 9, 38 (Injunction, recovery)",
      "Bharatiya Nyaya Sanhita, 2023 — Sections 303, 324, 351",
    ],
  },
  legal_notice: {
    id: "legal-notice",
    category: "legal_notice",
    label: "Legal Notice",
    description: "Formal legal notice demanding action, payment, or compliance before filing a lawsuit",
    icon: "⚖️",
    questions: LEGAL_NOTICE_QUESTIONS,
    generate: (a) => generateLegalNotice(a),
    legalRefs: [
      "Indian Contract Act, 1872 — Section 73 (Compensation for loss)",
      "Code of Civil Procedure, 1908 — Order VII Rule 1 (Plaint requirements)",
      "Limitation Act, 1963 — Applicable limitation periods",
    ],
  },
  affidavit: {
    id: "affidavit",
    category: "affidavit",
    label: "Affidavit / Declaration",
    description: "Sworn statement of facts for legal proceedings, court filings, or official purposes",
    icon: "📜",
    questions: AFFIDAVIT_QUESTIONS,
    generate: (a) => generateAffidavit(a),
    legalRefs: [
      "Oaths Act, 1969 — Forms of oaths and affirmations",
      "Bharatiya Sakshya Adhiniyam, 2023 — Sections 130-132 (Witnesses, affirmations)",
    ],
  },
  rent_agreement: {
    id: "rent-agreement",
    category: "rent_agreement",
    label: "Rent / Lease Agreement",
    description: "Standard rental agreement or leave-and-license contract between landlord and tenant",
    icon: "📋",
    questions: RENT_AGREEMENT_QUESTIONS,
    generate: (a) => generateRentAgreement(a),
    legalRefs: [
      "Transfer of Property Act, 1882 — Section 105 (Lease defined)",
      "Registration Act, 1908 — Section 17 (Registration requirements)",
      "Indian Stamp Act, 1899 — Stamp duty requirements",
    ],
  },
  custom: {
    id: "custom-letter",
    category: "custom",
    label: "Custom Legal Letter",
    description: "Create any custom legal correspondence from scratch",
    icon: "✍️",
    questions: CUSTOM_QUESTIONS,
    generate: (a) => generateCustomDocument(a),
    legalRefs: [],
  },
};

// ── Document generators ───────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "[Date]";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

function generateTenantLetter(a: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(a.tenant_name || "[Your Name]");
  lines.push(a.property_address || "[Property Address]");
  lines.push("");
  lines.push("Date: " + formatDate(a.act_date || ""));
  lines.push("");
  lines.push("To,");
  lines.push(a.landlord_name || "[Landlord's Name]");
  lines.push(a.property_address ? "Through: " + a.property_address : "[Landlord's Address]");
  lines.push("");
  lines.push("Subject: Formal Notice Regarding Illegal Eviction Attempt from Premises at " + (a.property_address || "[Property Address]"));
  lines.push("");
  lines.push("Dear " + (a.landlord_name || "Sir/Madam") + ",");
  lines.push("");
  lines.push("I am writing to formally address your recent actions concerning the premises mentioned above, which I have been lawfully occupying as a tenant since " + formatDate(a.tenancy_start) + "." + (a.tenancy_end ? " My tenancy term is scheduled to continue until " + formatDate(a.tenancy_end) + "." : " The tenancy is on a month-to-month basis.") + " I have been paying a monthly rent of " + (a.monthly_rent || "[rent]") + ".");
  lines.push("");
  lines.push("It has come to my attention that you have taken the following illegal action(s):");
  lines.push("");
  lines.push("  \u2022 " + (a.illegal_act || "[describe the illegal action]"));
  if (a.act_date) lines.push("    Occurred on: " + formatDate(a.act_date));
  lines.push("");
  lines.push("These actions constitute an illegal attempt to evict me without due process of law. Under Indian law, a landlord cannot terminate a tenancy or recover possession through self-help measures. Such actions are unlawful and actionable.");
  lines.push("");
  lines.push("My Legal Position:");
  lines.push("1. I am a lawful tenant in possession of the premises with a right to quiet enjoyment.");
  lines.push("2. Self-help eviction (lockouts, utility cuts, intimidation) is strictly prohibited under law.");
  lines.push("3. Any eviction must follow due process under the applicable Rent Control Act / Transfer of Property Act, 1882 through a competent court.");
  lines.push("4. Your actions expose you to civil and criminal liability including damages for breach of contract, criminal trespass, and criminal intimidation.");
  lines.push("");
  if (a.police_complaint === "yes" && a.police_details) {
    lines.push("I have already filed a complaint with the police regarding this matter (" + a.police_details + ").");
    lines.push("");
  }
  lines.push("You are hereby demanded to:");
  lines.push("1. Immediately cease all illegal acts intended to deprive me of possession.");
  lines.push("2. Restore full access to the premises and reconnect all essential services.");
  lines.push("3. Refrain from any further harassment or illegal eviction attempts.");
  lines.push("4. Communicate any legitimate concerns only through legal channels.");
  lines.push("");
  lines.push("Kindly comply within 48 hours of receiving this notice. Failure to do so will leave me with no option but to approach the competent court for an injunction and recovery of damages, and to pursue criminal remedies for the offences committed.");
  lines.push("");
  lines.push("I trust you will act promptly to rectify this unlawful situation.");
  lines.push("");
  lines.push("Yours faithfully,");
  lines.push("");
  lines.push("(" + (a.tenant_name || "[Your Name]") + ")");
  lines.push("Tenant in Possession");
  lines.push("");
  lines.push("Enclosures: Copy of rent agreement (if available), rent receipts");
  return lines.join("\n");
}

function generateLegalNotice(a: Record<string, string>): string {
  const lines: string[] = [];
  const advocate = a.advocate_name || a.sender_name || "[Sender]";
  if (a.advocate_name) {
    lines.push("Through: " + a.advocate_name);
    lines.push("Advocate, [Bar Council Enrollment No.]");
    lines.push("[Chamber Address]");
    lines.push("");
    lines.push("On behalf of our client:");
  }
  lines.push(a.sender_name || "[Sender's Name]");
  lines.push(a.sender_address || "[Sender's Address]");
  lines.push("");
  lines.push("Date: " + formatDate(new Date().toISOString()));
  lines.push("");
  lines.push("To,");
  lines.push(a.recipient_name || "[Recipient's Name]");
  lines.push(a.recipient_address || "[Recipient's Address]");
  lines.push("");
  lines.push("Subject: " + (a.notice_subject || "[Subject of the notice]"));
  lines.push("");
  lines.push("Dear " + (a.recipient_name || "Sir/Madam") + ",");
  lines.push("");
  lines.push("1. Our client, " + (a.sender_name || "[Sender]") + ", has instructed us to address this legal notice to you regarding the following matter.");
  lines.push("");
  lines.push("2. " + (a.facts_summary || "[Brief facts of the case]"));
  lines.push("");
  if (a.legal_grounds) {
    lines.push("3. Under the applicable law, including " + a.legal_grounds + ", our client is entitled to the relief sought herein.");
    lines.push("");
  }
  lines.push("4. By this notice, our client calls upon you to:");
  lines.push("   " + (a.relief_sought || "[Specify the relief demanded]"));
  lines.push("");
  lines.push("5. You are hereby given " + (a.response_deadline || "15") + " days from the date of receipt of this notice to comply with the above demands. Please take note that if you fail to comply within the stipulated period, our client shall be constrained to initiate appropriate legal proceedings against you before the " + (a.jurisdiction || "competent court of law") + " at your own risk as to costs and consequences.");
  lines.push("");
  lines.push("6. This notice is being sent without prejudice to our client's rights and remedies, all of which are strictly reserved.");
  lines.push("");
  lines.push("Yours faithfully,");
  lines.push("");
  lines.push("(" + advocate + ")");
  if (a.advocate_name) lines.push("Advocate for the Notice");
  return lines.join("\n");
}

function generateAffidavit(a: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("AFFIDAVIT");
  lines.push("");
  lines.push("I, " + (a.deponent_name || "[Name]") + ", son/daughter of _________, aged about " + (a.deponent_age || "__") + " years, by occupation " + (a.deponent_occupation || "__") + ", resident of " + (a.deponent_address || "[Address]") + ", do hereby solemnly affirm and state as follows:");
  lines.push("");
  lines.push("1. I am the Deponent herein and am fully conversant with the facts of this case.");
  lines.push("");
  const facts = (a.sworn_facts || "[State the facts]").split("\n").filter(Boolean);
  facts.forEach((fact, i) => {
    lines.push((i + 2) + ". " + fact);
    lines.push("");
  });
  lines.push("");
  const paraNum = facts.length + 2;
  lines.push(paraNum + ". I state that the contents of the above paragraphs are true and correct to my knowledge and belief, and nothing material has been concealed therefrom.");
  lines.push("");
  lines.push(paraNum + 1 + ". This affidavit is filed in " + (a.language || "English") + ", which I understand and have voluntarily signed.");
  lines.push("");
  lines.push("DEPONENT");
  lines.push("");
  lines.push("");
  lines.push("VERIFICATION");
  lines.push("");
  lines.push("I, the above-named Deponent, do hereby verify that the contents of paragraphs 1 to " + (paraNum + 1) + " are true and correct to my knowledge and belief. No part of it is false and nothing material has been concealed.");
  lines.push("");
  lines.push("Verified at " + (a.place_of_swearing || "[Place]") + " on this " + formatDate(a.date_of_swearing || ""));
  lines.push("");
  lines.push("DEPONENT");
  lines.push("");
  lines.push("");
  lines.push("IDENTIFIED BY:");
  lines.push("");
  lines.push("");
  lines.push("Before me,");
  lines.push("");
  lines.push("NOTARY PUBLIC / OATH COMMISSIONER");
  return lines.join("\n");
}

function generateRentAgreement(a: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("RENT AGREEMENT / LEAVE AND LICENSE");
  lines.push("");
  lines.push("This Agreement is made on " + formatDate(a.start_date_ag || "") + " at " + (a.landlord_address_ag?.split(",").pop()?.trim() || "[City]") + ".");
  lines.push("");
  lines.push("BETWEEN");
  lines.push("");
  lines.push(a.landlord_name_ag || "[Landlord's Name]");
  lines.push("Son/Daughter/Wife of _________, residing at " + (a.landlord_address_ag || "[Address]") + " (hereinafter called the 'LESSOR' which expression shall mean and include their heirs, successors, and assigns) of the ONE PART;");
  lines.push("");
  lines.push("AND");
  lines.push("");
  lines.push(a.tenant_name_ag || "[Tenant's Name]");
  lines.push("Son/Daughter/Wife of _________, residing at " + (a.tenant_address_ag || "[Address]") + " (hereinafter called the 'LESSEE' which expression shall mean and include their heirs, successors, and assigns) of the OTHER PART;");
  lines.push("");
  lines.push("WHEREAS the Lessor is the absolute owner and landlord of the premises situated at " + (a.property_ag || "[Property Address]") + " (hereinafter called the 'DEMISED PREMISES');");
  lines.push("");
  lines.push("NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:");
  lines.push("");
  const clauses = [
    "The Lessor hereby agrees to let out and the Lessee agrees to take on lease the Demised Premises for a period of " + (a.duration_months || "__") + " months commencing from " + formatDate(a.start_date_ag || "") + " and ending on " + formatDate(a.end_date_ag || "") + ".",
    "The Lessee shall pay a monthly rent of " + (a.rent_amount_ag || "[rent]") + " which shall be payable on or before the 7th day of every English calendar month.",
    "The Lessee has paid a refundable security deposit of " + (a.deposit_amount_ag || "[deposit]") + " to the Lessor by __________ (mode of payment), which shall be refunded at the time of vacating the premises, subject to deductions for any damages beyond normal wear and tear.",
    (a.maintenance_included === "yes" ? "The monthly rent includes maintenance charges / society fees." : "Maintenance charges / society fees shall be paid separately by the Lessee."),
    "The Lessee shall use the Demised Premises only for residential purposes and shall not cause any nuisance or disturbance to neighbors.",
    "The Lessee shall not sub-let, assign, or part with possession of the Demised Premises or any part thereof without the prior written consent of the Lessor.",
    "Either party may terminate this Agreement by giving " + (a.notice_period_ag || "30") + " days' written notice to the other party.",
    "The Lessee shall keep the Demised Premises in good condition and shall hand over vacant possession at the end of the tenancy period or upon termination, whichever is earlier.",
    "Any dispute arising out of this Agreement shall be subject to the jurisdiction of courts at " + (a.landlord_address_ag?.split(",").pop()?.trim() || "[City]") + ".",
  ];
  clauses.forEach((clause, i) => {
    lines.push((i + 1) + ". " + clause);
    lines.push("");
  });
  lines.push("IN WITNESS WHEREOF, the parties hereto have signed this Agreement on the date and place first mentioned above.");
  lines.push("");
  lines.push("");
  lines.push("_______________________            _______________________");
  lines.push("  LESSOR / LANDLORD                  LESSEE / TENANT");
  lines.push("");
  lines.push("");
  lines.push("WITNESSES:");
  lines.push("1. _____________________  2. _____________________");
  return lines.join("\n");
}

function generateCustomDocument(a: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(a.doc_title || "[Document Title]");
  lines.push("");
  lines.push("Date: " + formatDate(new Date().toISOString()));
  lines.push("");
  lines.push("To,");
  lines.push(a.recipient_custom || "[Recipient]");
  lines.push("");
  lines.push((a.subject_custom ? "Subject: " + a.subject_custom : ""));
  lines.push("");
  lines.push(a.body_custom || "[Document body]");
  lines.push("");
  lines.push(a.closing_remarks || "[Closing]");
  return lines.join("\n");
}

// ── PDF Generation ────────────────────────────────────────────────────────────

export function generateStyledLegalPdf(
  fileName: string,
  title: string,
  bodyText: string,
  legalRefs?: string[],
  category?: DocCategory,
): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 50;

  let y = margin;

  // ── Letterhead ──
  doc.setFillColor(196, 154, 16);
  doc.rect(margin, y, pw - margin * 2, 2, "F");
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(28, 35, 51);
  doc.text("E-BENCH", pw / 2, y, { align: "center" });
  y += 14;

  doc.setFontSize(8);
  doc.setTextColor(136, 136, 136);
  doc.text("Digital Justice Platform — Legal Document Drafting", pw / 2, y, { align: "center" });
  y += 6;

  doc.setFillColor(196, 154, 16);
  doc.rect(margin, y, pw - margin * 2, 1, "F");
  y += 16;

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(28, 35, 51);
  const titleLines = doc.splitTextToSize(title, pw - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 18 + 8;

  // ── Divider ──
  doc.setDrawColor(196, 154, 16);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 14;

  // ── Body ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const paragraphs = bodyText.split("\n");
  for (const para of paragraphs) {
    if (y > ph - margin - 20) {
      doc.addPage();
      y = margin;
    }

    if (para.trim() === "") {
      y += 8;
      continue;
    }

    // Check if it's a heading (all caps, short, or numbered with bold prefix)
    const isHeading = /^\d+\.\s+[A-Z\s]+$/.test(para.trim()) || /^[A-Z\s]{4,}$/.test(para.trim());
    const isNumbered = /^\d+\./.test(para.trim());
    const isBullet = /^[\s]*[•\-]/.test(para);

    if (isHeading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(28, 35, 51);
      const lines = doc.splitTextToSize(para, pw - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 15 + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
    } else if (isNumbered) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(28, 35, 51);
      const firstDot = para.indexOf(".");
      const numPart = para.slice(0, firstDot + 1);
      const restPart = para.slice(firstDot + 1).trim();
      doc.text(numPart, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      if (restPart) {
        const restLines = doc.splitTextToSize(restPart, pw - margin * 2 - 20);
        doc.text(restLines, margin + 16, y);
        y += restLines.length * 14 + 2;
      } else {
        y += 15;
      }
    } else if (isBullet) {
      const bullet = para.trim();
      const bulletLines = doc.splitTextToSize(bullet, pw - margin * 2);
      doc.text(bulletLines, margin + 8, y);
      y += bulletLines.length * 14 + 2;
    } else {
      const textLines = doc.splitTextToSize(para, pw - margin * 2);
      doc.text(textLines, margin, y);
      y += textLines.length * 14 + 2;
    }
  }

  // ── Legal References ──
  if (legalRefs && legalRefs.length > 0) {
    y += 12;
    if (y > ph - margin - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(196, 154, 16);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(28, 35, 51);
    doc.text("Legal References:", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    for (const ref of legalRefs) {
      if (y > ph - margin - 10) {
        doc.addPage();
        y = margin;
      }
      doc.text("\u2022 " + ref, margin + 8, y);
      y += 11;
    }
  }

  // ── Footer ──
  const footerY = ph - 20;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "italic");
  doc.text("Generated by E-Bench Digital Justice Platform \u00b7 This is a draft document and does not constitute legal advice.", pw / 2, footerY, { align: "center" });

  // ── Save and return ──
  const dataUri = doc.output("datauristring");
  savePdfDownload({ fileName, title, dataUri });
  return doc.output("bloburl") as unknown as string;
}

// ── Session helpers ───────────────────────────────────────────────────────────

export const CATEGORIES: { category: DocCategory; label: string; description: string; icon: string }[] = [
  { category: "tenant", label: "Tenant / Landlord Letter", description: "Respond to illegal eviction, lockouts, utility cuts, or harassment", icon: "\u{1F3E0}" },
  { category: "legal_notice", label: "Legal Notice", description: "Formal notice demanding action, payment, or compliance", icon: "\u2696\uFE0F" },
  { category: "affidavit", label: "Affidavit / Declaration", description: "Sworn statement of facts for court or official use", icon: "\uD83D\uDCDC" },
  { category: "rent_agreement", label: "Rent / Lease Agreement", description: "Standard rental or leave-and-license contract", icon: "\uD83D\uDCCB" },
  { category: "custom", label: "Custom Legal Letter", description: "Create any custom legal correspondence from scratch", icon: "\u270D\uFE0F" },
];

export function createEmptySession(): DraftSession {
  return { category: null, answers: {}, currentStep: 0, phase: "select" };
}

export function getTemplateForCategory(cat: DocCategory): DocTemplate {
  return TEMPLATES[cat];
}
