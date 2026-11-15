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
  { name: "Ashwin", role: null, school: null, link: null, confirmed: false },
  { name: "Efe", role: null, school: null, link: null, confirmed: false },
  { name: "Jainam", role: null, school: null, link: null, confirmed: false },
  { name: "Nathan", role: null, school: null, link: null, confirmed: false },
];

/** "Why it's called Greenlight" on the landing page. Replace with the team's confirmed founder copy. */
export const FOUNDER_STORY = {
  confirmed: false,
  paragraphs: [
    "In film, a greenlight is the yes that lets a project get made. On the street, it means go.",
    "Club officers at USC spend their evenings on budget sheets, vendor lists and deadline tables instead of on the event itself. Most of the red lights they hit are rules nobody told them about until it was too late.",
    "We wanted every officer to see what a reviewer would see before they press submit: each line checked, each rule quoted, nothing left to guess. When every light is green, the only thing left is the event.",
  ],
};
