// The team behind Greenlight, shown on the landing page.
// Photo order (left to right): Jainam, Nathan, Efe, Ashwin.

export type TeamMember = {
  name: string;
  role: string | null;
  school: string | null;
  link: string | null;
  confirmed: boolean;
};

/** Left to right as in /team.jpg. */
export const TEAM: TeamMember[] = [
  { name: "Jainam", role: null, school: null, link: "https://www.linkedin.com/in/jainamtjain/", confirmed: true },
  { name: "Nathan", role: null, school: null, link: "https://www.linkedin.com/in/nathan-choi-a88709430/", confirmed: true },
  { name: "Efe", role: null, school: null, link: "https://www.linkedin.com/in/efe-altinkaya-731a34376/", confirmed: true },
  { name: "Ashwin", role: null, school: null, link: "https://www.linkedin.com/in/ashwinkren/", confirmed: true },
];

export const TEAM_PHOTO = {
  src: "/team.jpg",
  alt: "Greenlight team at the AI@USC Hackathon, left to right: Jainam, Nathan, Efe, Ashwin",
  caption: "Left to right: Jainam, Nathan, Efe, Ashwin",
};

/** One-line placeholders until each person writes their own. */
export const TEAM_LINES: Record<string, string> = {
  Jainam: "",
  Nathan: "",
  Efe: "",
  Ashwin: "",
};

/**
 * "Why it's called Greenlight" on the landing page.
 * This is our paraphrase of a talk ("told a story"), not a quotation.
 * Do not put words in Musk's or Askari's mouth.
 */
export const FOUNDER_STORY = {
  confirmed: false,
  paragraphs: [
    "At the AI@USC kickoff, Hasan Askari of K1 Investment Management shared a story Elon Musk tells: imagine hitting every light green on the drive home. USC clubs keep stopping at red lights they can't see. Greenlight turns them green first.",
  ],
};
