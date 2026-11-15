// The team behind Greenlight, shown on the landing page.
// Placeholders until each person confirms their own line: no invented roles, schools or links.

export type TeamMember = {
  name: string;
  role: string | null;
  school: string | null;
  link: string | null;
  confirmed: boolean;
};

export const TEAM: TeamMember[] = [
  { name: "Ashwin", role: "[role]", school: null, link: null, confirmed: false },
  { name: "Efe", role: "[role]", school: null, link: null, confirmed: false },
  { name: "Jainam", role: "[role]", school: null, link: null, confirmed: false },
  { name: "Nathan", role: "[role]", school: null, link: null, confirmed: false },
];

/** One-line placeholders until each person writes their own. */
export const TEAM_LINES: Record<string, string> = {
  Ashwin: "[line]",
  Efe: "[line]",
  Jainam: "[line]",
  Nathan: "[line]",
};

/**
 * "Why it's called Greenlight" on the landing page.
 * This is our paraphrase of a talk ("told a story"), not a quotation.
 * Do not put words in Musk's or Askari's mouth.
 */
export const FOUNDER_STORY = {
  confirmed: false,
  paragraphs: [
    "At the AI@USC kickoff, Hasan Askari, co-founder and Managing Partner of K1 Investment Management, told a story Elon Musk likes to tell about driving from SpaceX in Hawthorne to Malibu: imagine hitting every light green. How far would you get, and how much more would you attempt, if nothing stopped you? We had spent the morning talking to the people who move money for USC clubs. Clubs were stopping at red lights they could not see: a caterer that is not on a list, a deadline that passed two weeks before they knew it existed, an item that cannot be funded, a sponsor nobody had asked. Greenlight is our attempt to turn those lights green before a club reaches them.",
  ],
};
