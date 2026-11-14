// Sponsor candidates. Only public company facts; `uscTie` is filled in only where the team can
// point to a source (the AI@USC Hackathon 2026 sponsor list, or the team's Fall 2026 career fair contacts).
// Before real outreach, verify ties and find the company's university-relations contact.

export type Sponsor = {
  id: string;
  name: string;
  industry: string;
  hires: string[]; // majors they typically recruit
  la: string; // Southern California presence
  uscTie: string | null;
  inKind: string[]; // what they could plausibly cover in kind
};

export const SPONSORS: Sponsor[] = [
  { id: "aws", name: "Amazon Web Services", industry: "Cloud computing", hires: ["Computer Science", "Computer Engineering", "Data Science"], la: "Offices in Santa Monica and Irvine", uscTie: "Sponsor of the AI@USC Hackathon, Nov 2026", inKind: ["cloud credits", "speakers", "prizes", "food"] },
  { id: "google", name: "Google", industry: "Software and AI", hires: ["Computer Science", "Data Science", "Electrical Engineering"], la: "Offices in Playa Vista and Irvine", uscTie: "Sponsor of the AI@USC Hackathon, Nov 2026", inKind: ["cloud credits", "speakers", "swag"] },
  { id: "replit", name: "Replit", industry: "Developer tools", hires: ["Computer Science"], la: "Remote-first", uscTie: "Sponsor of the AI@USC Hackathon, Nov 2026", inKind: ["software credits", "prizes"] },
  { id: "k1", name: "K1 Investment Management", industry: "Enterprise software private equity", hires: ["Business Administration", "Economics", "Computer Science"], la: "Headquarters in Manhattan Beach", uscTie: "Sponsor of the AI@USC Hackathon, Nov 2026", inKind: ["speakers", "food", "prizes"] },
  { id: "inspective", name: "Inspective", industry: "AI startup", hires: ["Computer Science"], la: "Los Angeles", uscTie: "Sponsor of the AI@USC Hackathon, Nov 2026", inKind: ["speakers", "prizes"] },
  { id: "hatci", name: "Hyundai America Technical Center (HATCI)", industry: "Automotive engineering", hires: ["Mechanical Engineering", "Electrical Engineering"], la: "Design and tech centers in Southern California", uscTie: "Recruited at the USC career fair, Sep 30 2026 (team contact)", inKind: ["food", "speakers", "prizes"] },
  { id: "nswc", name: "Naval Surface Warfare Center Port Hueneme", industry: "Defense engineering (civilian)", hires: ["Mechanical Engineering", "Electrical Engineering", "Computer Science"], la: "Port Hueneme, Ventura County", uscTie: "Recruited at the USC career fair, Sep 30 2026 (team contact)", inKind: ["speakers", "site tours"] },
  { id: "spacex", name: "SpaceX", industry: "Aerospace", hires: ["Mechanical Engineering", "Aerospace Engineering", "Electrical Engineering"], la: "Headquarters in Hawthorne", uscTie: null, inKind: ["speakers", "site tours", "swag"] },
  { id: "northrop", name: "Northrop Grumman", industry: "Aerospace and defense", hires: ["Aerospace Engineering", "Electrical Engineering", "Computer Science"], la: "Sites across Los Angeles County", uscTie: null, inKind: ["food", "speakers", "prizes"] },
  { id: "boeing", name: "Boeing", industry: "Aerospace", hires: ["Aerospace Engineering", "Mechanical Engineering"], la: "El Segundo and Long Beach", uscTie: null, inKind: ["food", "speakers"] },
  { id: "rtx", name: "RTX (Raytheon)", industry: "Aerospace and defense", hires: ["Electrical Engineering", "Computer Engineering"], la: "El Segundo", uscTie: null, inKind: ["food", "speakers"] },
  { id: "anduril", name: "Anduril Industries", industry: "Defense technology", hires: ["Computer Science", "Mechanical Engineering", "Electrical Engineering"], la: "Headquarters in Costa Mesa", uscTie: null, inKind: ["speakers", "prizes", "swag"] },
  { id: "snap", name: "Snap Inc.", industry: "Consumer technology", hires: ["Computer Science", "Design", "Business Administration"], la: "Headquarters in Santa Monica", uscTie: null, inKind: ["food", "swag", "speakers"] },
  { id: "riot", name: "Riot Games", industry: "Video games", hires: ["Computer Science", "Interactive Media", "Design"], la: "Headquarters in West Los Angeles", uscTie: null, inKind: ["swag", "prizes", "speakers"] },
  { id: "disney", name: "The Walt Disney Company", industry: "Media and entertainment", hires: ["Cinematic Arts", "Computer Science", "Business Administration"], la: "Headquarters in Burbank", uscTie: null, inKind: ["speakers", "site tours"] },
  { id: "deloitte", name: "Deloitte", industry: "Consulting and accounting", hires: ["Accounting", "Business Administration", "Economics"], la: "Downtown Los Angeles office", uscTie: null, inKind: ["food", "speakers", "workshops"] },
  { id: "ey", name: "EY", industry: "Accounting and consulting", hires: ["Accounting", "Business Administration"], la: "Downtown Los Angeles office", uscTie: null, inKind: ["food", "workshops"] },
  { id: "kaiser", name: "Kaiser Permanente", industry: "Healthcare", hires: ["Biomedical Engineering", "Health Sciences", "Data Science"], la: "Headquarters for Southern California in Pasadena", uscTie: null, inKind: ["speakers", "health supplies"] },
  { id: "amgen", name: "Amgen", industry: "Biotechnology", hires: ["Biomedical Engineering", "Chemical Engineering", "Biology"], la: "Headquarters in Thousand Oaks", uscTie: null, inKind: ["speakers", "food"] },
  { id: "hulu", name: "Hulu", industry: "Streaming media", hires: ["Computer Science", "Business Administration"], la: "Santa Monica", uscTie: null, inKind: ["swag", "speakers"] },
];

export const SPONSOR_NOTE = "Demo list built from public company information. Verify each USC tie and contact before outreach.";
