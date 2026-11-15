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

export type Sponsor = {
  id: string;
  name: string;
  industry: string;
  hires: Major[];
  la: string; // Southern California presence
  tie: string | null;
  tieSource: string | null;
  inKind: ("food" | "swag" | "prizes" | "speakers" | "credits" | "venue" | "tours" | "workshops" | "supplies")[];
  custom?: boolean;
};

const VITERBI_2026 = "https://viterbischool.usc.edu/news/2026/05/from-usc-to-big-tech-apple-amazon-nvidia-among-top-employers-of-usc-engineering-alumni-new-data-shows/";
const VITERBI_PARTNERS = "https://viterbigradadmission.usc.edu/partners/";
const HACKATHON = "https://ai-usc.devpost.com/";

export const SPONSORS: Sponsor[] = [
  { id: "amazon", name: "Amazon", industry: "Technology and retail", hires: ["Computer Science", "Computer Engineering", "Data Science", "Business"], la: "Offices in Santa Monica, Culver City and Irvine", tie: "Top employer of USC computer science alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["credits", "speakers", "swag", "food"] },
  { id: "aws", name: "Amazon Web Services", industry: "Cloud computing", hires: ["Computer Science", "Computer Engineering", "Data Science"], la: "Offices in Santa Monica and Irvine", tie: "Sponsor of the AI@USC Hackathon, November 2026", tieSource: HACKATHON, inKind: ["credits", "speakers", "prizes", "food"] },
  { id: "google", name: "Google", industry: "Software and AI", hires: ["Computer Science", "Electrical Engineering", "Data Science"], la: "Offices in Playa Vista and Irvine", tie: "Top-5 employer of USC CS and ECE alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["credits", "speakers", "swag"] },
  { id: "meta", name: "Meta", industry: "Social media and VR", hires: ["Computer Science", "Data Science", "Design"], la: "Offices in Los Angeles (Playa Vista) and Burbank", tie: "Top-5 employer of USC computer science alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["speakers", "swag"] },
  { id: "microsoft", name: "Microsoft", industry: "Software", hires: ["Computer Science", "Computer Engineering", "Business"], la: "Offices in Irvine and Los Angeles", tie: "Top-5 employer of USC computer science alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["credits", "speakers", "prizes"] },
  { id: "apple", name: "Apple", industry: "Consumer hardware", hires: ["Electrical Engineering", "Computer Engineering", "Computer Science", "Design"], la: "Offices in Culver City and Irvine", tie: "Top employer of USC electrical and computer engineering alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["speakers", "prizes"] },
  { id: "nvidia", name: "Nvidia", industry: "Semiconductors and AI", hires: ["Electrical Engineering", "Computer Engineering", "Computer Science"], la: "Offices in Southern California", tie: "Top-5 employer of USC ECE alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["credits", "speakers", "prizes"] },
  { id: "intel", name: "Intel", industry: "Semiconductors", hires: ["Electrical Engineering", "Computer Engineering"], la: "Offices in Southern California", tie: "Top-5 employer of USC ECE alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["speakers", "prizes"] },
  { id: "northrop", name: "Northrop Grumman", industry: "Aerospace and defense", hires: ["Aerospace Engineering", "Electrical Engineering", "Mechanical Engineering", "Computer Science"], la: "Sites across Los Angeles County", tie: "Top-5 employer of USC ECE alumni (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["food", "speakers", "prizes", "tours"] },
  { id: "boeing", name: "Boeing", industry: "Aerospace", hires: ["Aerospace Engineering", "Mechanical Engineering", "Computer Science"], la: "El Segundo and Long Beach", tie: "Sponsors an Accelerated Leadership Program for USC students (USC Viterbi, May 2026)", tieSource: VITERBI_2026, inKind: ["food", "speakers"] },
  { id: "aerospace-corp", name: "The Aerospace Corporation", industry: "Space systems research", hires: ["Aerospace Engineering", "Electrical Engineering", "Mechanical Engineering"], la: "Headquarters in El Segundo", tie: "Listed as a USC Viterbi corporate partner", tieSource: VITERBI_PARTNERS, inKind: ["speakers", "tours"] },
  { id: "amgen", name: "Amgen", industry: "Biotechnology", hires: ["Biomedical Engineering", "Chemical Engineering", "Health and Biology"], la: "Headquarters in Thousand Oaks", tie: "Listed as a USC Viterbi corporate partner", tieSource: VITERBI_PARTNERS, inKind: ["speakers", "food"] },
  { id: "abbott", name: "Abbott", industry: "Medical devices", hires: ["Biomedical Engineering", "Computer Engineering", "Health and Biology"], la: "Sites in Southern California", tie: "Abbott Vascular listed as a USC Viterbi corporate partner", tieSource: VITERBI_PARTNERS, inKind: ["speakers", "supplies"] },
  { id: "chevron", name: "Chevron", industry: "Energy", hires: ["Chemical Engineering", "Mechanical Engineering"], la: "El Segundo refinery", tie: "Listed as a USC Viterbi corporate partner", tieSource: VITERBI_PARTNERS, inKind: ["food", "speakers"] },
  { id: "broadcom", name: "Broadcom", industry: "Semiconductors", hires: ["Electrical Engineering", "Computer Engineering"], la: "Offices in Irvine", tie: "Listed as a USC Viterbi corporate partner", tieSource: VITERBI_PARTNERS, inKind: ["speakers", "prizes"] },
  { id: "k1", name: "K1 Investment Management", industry: "Software private equity", hires: ["Business", "Economics", "Computer Science"], la: "Headquarters in Manhattan Beach", tie: "Sponsor of the AI@USC Hackathon, November 2026", tieSource: HACKATHON, inKind: ["speakers", "food", "prizes"] },
  { id: "replit", name: "Replit", industry: "Developer tools", hires: ["Computer Science"], la: "Remote-first", tie: "Sponsor of the AI@USC Hackathon, November 2026", tieSource: HACKATHON, inKind: ["credits", "prizes"] },
  { id: "spacex", name: "SpaceX", industry: "Aerospace", hires: ["Aerospace Engineering", "Mechanical Engineering", "Electrical Engineering"], la: "Headquarters in Hawthorne", tie: null, tieSource: null, inKind: ["speakers", "tours", "swag"] },
  { id: "snap", name: "Snap Inc.", industry: "Consumer technology", hires: ["Computer Science", "Design", "Business"], la: "Headquarters in Santa Monica", tie: null, tieSource: null, inKind: ["food", "swag", "speakers"] },
  { id: "riot", name: "Riot Games", industry: "Video games", hires: ["Computer Science", "Design", "Cinematic Arts"], la: "Headquarters in West Los Angeles", tie: null, tieSource: null, inKind: ["swag", "prizes", "speakers"] },
  { id: "disney", name: "The Walt Disney Company", industry: "Media and entertainment", hires: ["Cinematic Arts", "Computer Science", "Business", "Communication"], la: "Headquarters in Burbank", tie: null, tieSource: null, inKind: ["speakers", "tours"] },
  { id: "netflix", name: "Netflix", industry: "Streaming and film", hires: ["Cinematic Arts", "Computer Science", "Communication", "Business"], la: "Offices in Hollywood", tie: null, tieSource: null, inKind: ["speakers", "tours"] },
  { id: "sony-pictures", name: "Sony Pictures Entertainment", industry: "Film and television", hires: ["Cinematic Arts", "Communication", "Music and Dance"], la: "Studio lot in Culver City", tie: null, tieSource: null, inKind: ["tours", "speakers"] },
  { id: "deloitte", name: "Deloitte", industry: "Consulting and accounting", hires: ["Accounting", "Business", "Economics", "Data Science"], la: "Downtown Los Angeles office", tie: null, tieSource: null, inKind: ["food", "speakers", "workshops"] },
  { id: "ey", name: "EY", industry: "Accounting and consulting", hires: ["Accounting", "Business", "Economics"], la: "Downtown Los Angeles office", tie: null, tieSource: null, inKind: ["food", "workshops"] },
  { id: "kaiser", name: "Kaiser Permanente", industry: "Healthcare", hires: ["Health and Biology", "Biomedical Engineering", "Data Science"], la: "Southern California headquarters in Pasadena", tie: null, tieSource: null, inKind: ["speakers", "supplies"] },
];

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
