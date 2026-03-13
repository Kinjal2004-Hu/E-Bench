// ─── Types ──────────────────────────────────────────────────────────────────

export type ConsultationStatus = "pending" | "accepted" | "rejected";

export type ConsultationRequest = {
  id: string;
  clientName: string;
  legalCategory: string;
  requestedDate: string;
  message: string;
  status: ConsultationStatus;
};

export type AppointmentStatus = "confirmed" | "rescheduled" | "pending";

export type Appointment = {
  id: string;
  clientName: string;
  consultationType: "Chat" | "Video" | "Office Meeting" | "Phone Call";
  caseType: string;
  date: string;
  time: string;
  status: AppointmentStatus;
};

export type ChatMessage = {
  id: string;
  sender: "client" | "lawyer";
  text: string;
  time: string;
};

export type ClientChat = {
  id: string;
  clientName: string;
  topic: string;
  lastSeen: string;
  unread: number;
  messages: ChatMessage[];
};

export type CaseFile = {
  id: string;
  fileName: string;
  clientName: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
};

export type LawyerProfile = {
  name: string;
  photoUrl: string;
  specialization: string;
  experience: string;
  languages: string;
  consultationFee: string;
  availability: string;
  bio: string;
};

export type DashboardStats = {
  todaysAppointments: number;
  pendingRequests: number;
  totalClients: number;
  totalEarnings: number;
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export const dashboardStats: DashboardStats = {
  todaysAppointments: 5,
  pendingRequests: 7,
  totalClients: 128,
  totalEarnings: 245000,
};

// ─── Consultation Requests ───────────────────────────────────────────────────

export const consultationRequests: ConsultationRequest[] = [
  {
    id: "cr-101",
    clientName: "Rohan Deshmukh",
    legalCategory: "Corporate Compliance",
    requestedDate: "2026-03-13",
    message: "Need guidance on director liability under Companies Act 2013.",
    status: "pending",
  },
  {
    id: "cr-102",
    clientName: "Aditi Sharma",
    legalCategory: "Criminal Defense",
    requestedDate: "2026-03-14",
    message: "Seeking advice on anticipatory bail process under BNSS 2023.",
    status: "pending",
  },
  {
    id: "cr-103",
    clientName: "Vikram Patil",
    legalCategory: "Property Dispute",
    requestedDate: "2026-03-15",
    message: "Boundary dispute with neighboring property owner.",
    status: "accepted",
  },
  {
    id: "cr-104",
    clientName: "Neha Joshi",
    legalCategory: "Contract Review",
    requestedDate: "2026-03-15",
    message: "Need review of software services agreement before signing.",
    status: "pending",
  },
  {
    id: "cr-105",
    clientName: "Sanjay Kulkarni",
    legalCategory: "Family Law",
    requestedDate: "2026-03-16",
    message: "Divorce proceedings and custody arrangement guidance needed.",
    status: "pending",
  },
  {
    id: "cr-106",
    clientName: "Priyanka Verma",
    legalCategory: "Labour Law",
    requestedDate: "2026-03-16",
    message: "Wrongful termination case under Industrial Disputes Act.",
    status: "rejected",
  },
];

// ─── Appointments ────────────────────────────────────────────────────────────

export const appointments: Appointment[] = [
  {
    id: "ap-201",
    clientName: "Rohan Deshmukh",
    consultationType: "Video",
    caseType: "Corporate Compliance",
    date: "2026-03-13",
    time: "10:30 AM",
    status: "confirmed",
  },
  {
    id: "ap-202",
    clientName: "Aditi Sharma",
    consultationType: "Office Meeting",
    caseType: "Criminal Defense",
    date: "2026-03-13",
    time: "12:00 PM",
    status: "pending",
  },
  {
    id: "ap-203",
    clientName: "Manish Rao",
    consultationType: "Phone Call",
    caseType: "Civil Dispute",
    date: "2026-03-13",
    time: "03:45 PM",
    status: "rescheduled",
  },
  {
    id: "ap-204",
    clientName: "Priya Mehta",
    consultationType: "Video",
    caseType: "Family Law",
    date: "2026-03-14",
    time: "11:15 AM",
    status: "confirmed",
  },
  {
    id: "ap-205",
    clientName: "Sanjay Kulkarni",
    consultationType: "Chat",
    caseType: "Family Law",
    date: "2026-03-14",
    time: "02:00 PM",
    status: "pending",
  },
];

// ─── Client Chats ─────────────────────────────────────────────────────────────

export const clientChats: ClientChat[] = [
  {
    id: "chat-301",
    clientName: "Aditi Sharma",
    topic: "Anticipatory Bail",
    lastSeen: "2m ago",
    unread: 2,
    messages: [
      { id: "m1", sender: "client", text: "Hello, can we file anticipatory bail this week?", time: "10:12" },
      { id: "m2", sender: "lawyer", text: "Yes, please share the FIR copy and prior notice details.", time: "10:14" },
      { id: "m3", sender: "client", text: "I will upload the documents by this evening.", time: "10:15" },
      { id: "m4", sender: "lawyer", text: "Perfect. Also attach any previous court orders if available.", time: "10:17" },
    ],
  },
  {
    id: "chat-302",
    clientName: "Rohan Deshmukh",
    topic: "Director Liability",
    lastSeen: "12m ago",
    unread: 0,
    messages: [
      { id: "m5", sender: "client", text: "Is Section 447 of Companies Act applicable in our situation?", time: "09:48" },
      { id: "m6", sender: "lawyer", text: "Potentially yes. I need the board resolutions and audit notes first.", time: "09:51" },
      { id: "m7", sender: "client", text: "I will courier the physical documents today.", time: "09:55" },
    ],
  },
  {
    id: "chat-303",
    clientName: "Neha Joshi",
    topic: "SaaS Agreement Review",
    lastSeen: "1h ago",
    unread: 1,
    messages: [
      { id: "m8", sender: "client", text: "Please check the indemnity and limitation of liability clauses.", time: "08:22" },
      { id: "m9", sender: "lawyer", text: "Sure, I will send detailed markups by tonight.", time: "08:30" },
    ],
  },
  {
    id: "chat-304",
    clientName: "Vikram Patil",
    topic: "Property Boundary Dispute",
    lastSeen: "3h ago",
    unread: 0,
    messages: [
      { id: "m10", sender: "client", text: "The neighbor has constructed a wall 2 feet into our plot.", time: "07:10" },
      { id: "m11", sender: "lawyer", text: "We should get a surveyor report first and then proceed.", time: "07:25" },
    ],
  },
];

// ─── Case Files ───────────────────────────────────────────────────────────────

export const caseFiles: CaseFile[] = [
  {
    id: "cf-401",
    fileName: "FIR_Copy_AditiSharma.pdf",
    clientName: "Aditi Sharma",
    uploadDate: "2026-03-11",
    fileSize: "1.8 MB",
    fileType: "PDF",
  },
  {
    id: "cf-402",
    fileName: "NDA_Review_NehaJoshi.docx",
    clientName: "Neha Joshi",
    uploadDate: "2026-03-10",
    fileSize: "640 KB",
    fileType: "DOCX",
  },
  {
    id: "cf-403",
    fileName: "Audit_Report_RohanDeshmukh.pdf",
    clientName: "Rohan Deshmukh",
    uploadDate: "2026-03-09",
    fileSize: "2.4 MB",
    fileType: "PDF",
  },
  {
    id: "cf-404",
    fileName: "Property_Survey_VikramPatil.pdf",
    clientName: "Vikram Patil",
    uploadDate: "2026-03-08",
    fileSize: "3.1 MB",
    fileType: "PDF",
  },
  {
    id: "cf-405",
    fileName: "Employment_Contract_PriyankVerma.docx",
    clientName: "Priyanka Verma",
    uploadDate: "2026-03-07",
    fileSize: "420 KB",
    fileType: "DOCX",
  },
];

// ─── Lawyer Profile ───────────────────────────────────────────────────────────

export const lawyerProfile: LawyerProfile = {
  name: "Adv. Kinjal Ojha",
  photoUrl: "",
  specialization: "Corporate Law, Contract Drafting, Criminal Litigation",
  experience: "11",
  languages: "English, Hindi, Marathi",
  consultationFee: "3500",
  availability: "Mon–Fri, 9:00 AM – 6:00 PM",
  bio: "Senior legal practitioner focused on risk-aware advisory, dispute strategy, and practical litigation outcomes for startups and enterprise clients across Maharashtra.",
};
