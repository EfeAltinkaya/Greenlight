// Sponsor candidates. Only public company facts. A `tie` is filled in only when a source says so,
// and its `tieSource` is shown in the app so anyone can check it.
// People are never stored here: the app links to LinkedIn searches so officers find the right contact themselves.

export const MAJORS = [
  "Computer Science",
  "Electrical Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Biomedical Engineering",
  "Chemical Engineering",
  "Data Science",
  "Business",
  "Accounting",
  "Economics",
  "Cinematic Arts",
  "Design",
  "Music and Dance",
  "Communication",
  "Health and Biology",
] as const;
export type Major = (typeof MAJORS)[number];

export type TieKind = "viterbi-top-employer" | "viterbi-career-partner" | "aiusc-sponsor" | "usc-careers-recruiter";

export type Tie = { label: string; source: string; date: string; kind: TieKind };

export type Sponsor = {
  id: string;
  name: string;
  industry: string;
  hires: Major[];
  la: string | null; // Southern California presence, null unless sourced
  /** Newest entry of `ties`, kept for UI that still reads one tie. */
  tie: string | null;
  tieSource: string | null;
  ties?: Tie[];
  inKind: ("food" | "swag" | "prizes" | "speakers" | "credits" | "venue" | "tours" | "workshops" | "supplies")[];
  custom?: boolean;
};

const VITERBI_2026 = "https://viterbischool.usc.edu/news/2026/05/from-usc-to-big-tech-apple-amazon-nvidia-among-top-employers-of-usc-engineering-alumni-new-data-shows/";
const CAREER_CONNECTIONS = "https://viterbicareers.usc.edu/employers/partner-program/";
const AIUSC = "https://aiusc.org";
const WHO_RECRUITS = "https://careers.usc.edu/about/who-recruits-at-usc/";

const D_AIUSC = "2026-11";
const D_PARTNER = "2026-10-21";
const D_VITERBI = "2026-05-13";
const D_RECRUIT = "2026-05";

const topEmployer = (label: string): Tie => ({ label: `${label} (USC Viterbi, May 2026)`, source: VITERBI_2026, date: D_VITERBI, kind: "viterbi-top-employer" });
const careerPartner = (level: "Platinum" | "Gold" | "Cardinal"): Tie => ({ label: `Viterbi Career Connections partner, 2026-27 (${level})`, source: CAREER_CONNECTIONS, date: D_PARTNER, kind: "viterbi-career-partner" });
const aiusc: Tie = { label: "Sponsor of the AI@USC Hackathon, November 2026", source: AIUSC, date: D_AIUSC, kind: "aiusc-sponsor" };
const recruits: Tie = { label: "Recruited at USC, Fall 2025 to Spring 2026 (USC Career Center)", source: WHO_RECRUITS, date: D_RECRUIT, kind: "usc-careers-recruiter" };

type RawSponsor = Omit<Sponsor, "tie" | "tieSource" | "ties"> & { ties: Tie[] };

const RAW_SPONSORS: RawSponsor[] = [
  { id: "amazon", name: "Amazon", industry: "Technology and retail", hires: ["Computer Science", "Computer Engineering", "Data Science", "Business"], la: "Offices in Santa Monica, Culver City and Irvine", ties: [topEmployer("Top employer of USC computer science alumni"), recruits], inKind: ["credits", "speakers", "swag", "food"] },
  { id: "aws", name: "Amazon Web Services", industry: "Cloud computing", hires: ["Computer Science", "Computer Engineering", "Data Science"], la: "Offices in Santa Monica and Irvine", ties: [topEmployer("Top-5 employer of USC computer science alumni"), aiusc], inKind: ["credits", "speakers", "prizes", "food"] },
  { id: "google", name: "Google", industry: "Software and AI", hires: ["Computer Science", "Electrical Engineering", "Data Science"], la: "Offices in Playa Vista and Irvine", ties: [topEmployer("Top-5 employer of USC CS and ECE alumni"), recruits, aiusc], inKind: ["credits", "speakers", "swag"] },
  { id: "meta", name: "Meta", industry: "Social media and VR", hires: ["Computer Science", "Data Science", "Design"], la: "Offices in Los Angeles (Playa Vista) and Burbank", ties: [topEmployer("Top-5 employer of USC computer science alumni")], inKind: ["speakers", "swag"] },
  { id: "microsoft", name: "Microsoft", industry: "Software", hires: ["Computer Science", "Computer Engineering", "Business"], la: "Offices in Irvine and Los Angeles", ties: [topEmployer("Top-5 employer of USC computer science alumni"), careerPartner("Cardinal")], inKind: ["credits", "speakers", "prizes"] },
  { id: "apple", name: "Apple", industry: "Consumer hardware", hires: ["Electrical Engineering", "Computer Engineering", "Computer Science", "Design"], la: "Offices in Culver City and Irvine", ties: [topEmployer("Top employer of USC electrical and computer engineering alumni"), recruits], inKind: ["speakers", "prizes"] },
  { id: "nvidia", name: "Nvidia", industry: "Semiconductors and AI", hires: ["Electrical Engineering", "Computer Engineering", "Computer Science"], la: "Offices in Southern California", ties: [topEmployer("Top-5 employer of USC ECE alumni")], inKind: ["credits", "speakers", "prizes"] },
  { id: "intel", name: "Intel", industry: "Semiconductors", hires: ["Electrical Engineering", "Computer Engineering"], la: "Offices in Southern California", ties: [topEmployer("Top-5 employer of USC ECE alumni")], inKind: ["speakers", "prizes"] },
  { id: "northrop", name: "Northrop Grumman", industry: "Aerospace and defense", hires: ["Aerospace Engineering", "Electrical Engineering", "Mechanical Engineering", "Computer Science"], la: "Sites across Los Angeles County", ties: [topEmployer("Top-5 employer of USC ECE alumni"), recruits], inKind: ["food", "speakers", "prizes", "tours"] },
  { id: "boeing", name: "Boeing", industry: "Aerospace", hires: ["Aerospace Engineering", "Mechanical Engineering", "Computer Science"], la: "El Segundo and Long Beach", ties: [topEmployer("Sponsors an Accelerated Leadership Program for USC students"), recruits], inKind: ["food", "speakers"] },
  { id: "aerospace-corp", name: "The Aerospace Corporation", industry: "Space systems research", hires: ["Aerospace Engineering", "Electrical Engineering", "Mechanical Engineering"], la: "Headquarters in El Segundo", ties: [], inKind: ["speakers", "tours"] },
  { id: "amgen", name: "Amgen", industry: "Biotechnology", hires: ["Biomedical Engineering", "Chemical Engineering", "Health and Biology"], la: "Headquarters in Thousand Oaks", ties: [recruits], inKind: ["speakers", "food"] },
  { id: "abbott", name: "Abbott", industry: "Medical devices", hires: ["Biomedical Engineering", "Computer Engineering", "Health and Biology"], la: "Sites in Southern California", ties: [recruits, careerPartner("Platinum")], inKind: ["speakers", "supplies"] },
  { id: "chevron", name: "Chevron", industry: "Energy", hires: ["Chemical Engineering", "Mechanical Engineering"], la: "El Segundo refinery", ties: [], inKind: ["food", "speakers"] },
  { id: "broadcom", name: "Broadcom", industry: "Semiconductors", hires: ["Electrical Engineering", "Computer Engineering"], la: "Offices in Irvine", ties: [], inKind: ["speakers", "prizes"] },
  { id: "k1", name: "K1 Investment Management", industry: "Software private equity", hires: ["Business", "Economics", "Computer Science"], la: "Headquarters in Manhattan Beach", ties: [recruits, aiusc], inKind: ["speakers", "food", "prizes"] },
  { id: "replit", name: "Replit", industry: "Developer tools", hires: ["Computer Science"], la: "Remote-first", ties: [aiusc], inKind: ["credits", "prizes"] },
  { id: "lockheed", name: "Lockheed Martin", industry: "Aerospace and defense", hires: ["Aerospace Engineering", "Mechanical Engineering", "Electrical Engineering", "Computer Science"], la: null, ties: [recruits, careerPartner("Gold")], inKind: ["speakers"] },
  { id: "qualcomm", name: "Qualcomm", industry: "Semiconductors and wireless", hires: ["Electrical Engineering", "Computer Engineering", "Computer Science"], la: null, ties: [recruits, careerPartner("Gold")], inKind: ["speakers"] },
  { id: "visa", name: "Visa", industry: "Payments", hires: ["Computer Science", "Data Science", "Business"], la: null, ties: [recruits, careerPartner("Gold")], inKind: ["speakers"] },
  { id: "bloomberg", name: "Bloomberg", industry: "Financial data and media", hires: ["Computer Science", "Data Science", "Business", "Economics"], la: null, ties: [recruits, careerPartner("Cardinal")], inKind: ["speakers"] },
  { id: "inspective", name: "Inspective", industry: "Not verified", hires: [], la: null, ties: [aiusc], inKind: [] },
  { id: "spacex", name: "SpaceX", industry: "Aerospace", hires: ["Aerospace Engineering", "Mechanical Engineering", "Electrical Engineering"], la: "Headquarters in Hawthorne", ties: [recruits], inKind: ["speakers", "tours", "swag"] },
  { id: "snap", name: "Snap Inc.", industry: "Consumer technology", hires: ["Computer Science", "Design", "Business"], la: "Headquarters in Santa Monica", ties: [recruits], inKind: ["food", "swag", "speakers"] },
  { id: "riot", name: "Riot Games", industry: "Video games", hires: ["Computer Science", "Design", "Cinematic Arts"], la: "Headquarters in West Los Angeles", ties: [recruits], inKind: ["swag", "prizes", "speakers"] },
  { id: "disney", name: "The Walt Disney Company", industry: "Media and entertainment", hires: ["Cinematic Arts", "Computer Science", "Business", "Communication"], la: "Headquarters in Burbank", ties: [recruits], inKind: ["speakers", "tours"] },
  { id: "netflix", name: "Netflix", industry: "Streaming and film", hires: ["Cinematic Arts", "Computer Science", "Communication", "Business"], la: "Offices in Hollywood", ties: [], inKind: ["speakers", "tours"] },
  { id: "sony-pictures", name: "Sony Pictures Entertainment", industry: "Film and television", hires: ["Cinematic Arts", "Communication", "Music and Dance"], la: "Studio lot in Culver City", ties: [], inKind: ["tours", "speakers"] },
  { id: "deloitte", name: "Deloitte", industry: "Consulting and accounting", hires: ["Accounting", "Business", "Economics", "Data Science"], la: "Downtown Los Angeles office", ties: [recruits], inKind: ["food", "speakers", "workshops"] },
  { id: "ey", name: "EY", industry: "Accounting and consulting", hires: ["Accounting", "Business", "Economics"], la: "Downtown Los Angeles office", ties: [recruits], inKind: ["food", "workshops"] },
  { id: "kaiser", name: "Kaiser Permanente", industry: "Healthcare", hires: ["Health and Biology", "Biomedical Engineering", "Data Science"], la: "Southern California headquarters in Pasadena", ties: [recruits], inKind: ["speakers", "supplies"] },
];

export const SPONSORS: Sponsor[] = RAW_SPONSORS.map(({ ties, ...s }) => {
  const sorted = [...ties].sort((a, b) => a.date.localeCompare(b.date));
  const newest = sorted[sorted.length - 1];
  return { ...s, ties: sorted, tie: newest?.label ?? null, tieSource: newest?.source ?? null };
});

/** Majors a club's audience likely studies, as a starting point the officer can change. */
export const SCHOOL_MAJORS: Record<string, Major[]> = {
  Viterbi: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Computer Engineering"],
  Marshall: ["Business", "Accounting", "Economics"],
  Dornsife: ["Health and Biology", "Economics", "Communication"],
  Other: [],
};

export const linkedInRecruiters = (company: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`university recruiting ${company}`)}`;
export const linkedInAlumni = (company: string) =>
  `https://www.linkedin.com/school/university-of-southern-california/people/?keywords=${encodeURIComponent(company)}`;
export const universityPage = (company: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${company} university recruiting students`)}`;

export const SPONSOR_NOTE = "Company facts are public. USC ties link to their source. Contacts come from your own LinkedIn search.";
