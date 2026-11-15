// Other USC funding sources, from USG's "Final Funding Sources" list (linked from usg.usc.edu/branches/funding)
// and each source's own page. Used when USG denies or only partly funds a request.
import type { Club } from "@/lib/types";

export type FundingSource = {
  id: string;
  name: string;
  who: string; // plain-language eligibility
  eligible: (club: Club) => boolean;
  lead: string; // how far ahead to apply
  how: string;
  url: string;
  note?: string;
};

export const FUNDING_SOURCES: FundingSource[] = [
  {
    id: "legislative-fund",
    name: "Legislative Fund",
    who: "Recognized student organizations with a senator or committee sponsor",
    eligible: () => true,
    lead: "Under $1,000: 1 week with advisor, Speaker, VP, CDO, or CFO. Over $1,000: 2 weeks, feasibility meeting, then Legislative Branch vote of confidence (every other Tuesday 6-7 PM; criteria 1-4 need 80% scores of 3 or 4), then a Senate bill.",
    how: "Slide deck required. Annual events capped at $2,000. Contingency line 10% maximum $350. Your club needs a senator or committee to sponsor the bill.",
    url: "https://docs.google.com/document/d/1hC3oxctqxv7w1QUXugIA2nTCc2iwQD83GSRMwlt2a8Y/edit",
    note: "2025-26 guidelines; 2026-27 not yet posted.",
  },
  {
    id: "vfb", name: "Viterbi Funding Board (VFB)", who: "Viterbi-affiliated student organizations",
    eligible: (c) => c.school === "Viterbi", lead: "Meets weekly during the semester until funds run out",
    how: "Complete application with all supporting documents; organization must be in good standing with the Viterbi Presidents Council and have filed its annual report.",
    url: "https://engage.usc.edu/viterbi/vfb/", note: "Gift cards and prizes are not funded.",
  },
  {
    id: "viterbi-sos", name: "Viterbi Student Organization Support (SOS)", who: "Viterbi-affiliated student organizations",
    eligible: (c) => c.school === "Viterbi", lead: "Apply after other sources",
    how: "Request through Viterbi Admission & Student Engagement. SOS supplements other funding and should be the last place a club asks.",
    url: "https://viterbiundergrad.usc.edu/studentorganizationleaders/sos/",
  },
  {
    id: "marshall", name: "Marshall / Leventhal RSO funding", who: "Marshall-affiliated student organizations",
    eligible: (c) => c.school === "Marshall", lead: "Review Marshall's funding criteria before applying",
    how: "Submit Marshall's RSO funding request form.",
    url: "https://usc.qualtrics.com/jfe/form/SV_dpw9wBhxEIm5aDz",
  },
  {
    id: "gsg", name: "Graduate Student Government (GSG) funding", who: "Any RSO whose event is open to graduate students",
    eligible: () => true, lead: "Submit through EngageSC; check GSG's deadline calendar",
    how: "Complete the GSG Finance Orientation video and Finance Assessment first, then apply in EngageSC. Only USC-authorized vendors.",
    url: "https://gsg.usc.edu/gsg-funding/",
  },
  {
    id: "ignite", name: "IgniteSC crowdfunding", who: "Any recognized student organization",
    eligible: () => true, lead: "Apply to launch a campaign",
    how: "USC's own crowdfunding platform: alumni, parents and friends give directly to the club's campaign.",
    url: "https://forms.usc.edu/ignite-application/",
  },
  {
    id: "assemblies", name: "Co-sponsorship with a USG programming assembly", who: "Any RSO with an event that serves an assembly's community",
    eligible: () => true, lead: "Reach out well before the event",
    how: "USG has 19 programming assemblies. Ask the one closest to your event's audience to co-sponsor.",
    url: "https://usg.usc.edu/branches/programming/",
    note: "For FY27, membership organizations moved to the Funding Department (Daily Trojan). Confirm eligibility with the assembly first.",
  },
  {
    id: "price", name: "Price School student organization funding", who: "Price-affiliated student organizations",
    eligible: (c) => c.school === "Price", lead: "10 business days ahead under $850; 30 calendar days ahead above",
    how: "Price Student Organization Purchase Request form; permits must already be approved.",
    url: "https://priceschool.usc.edu/",
  },
  {
    id: "departments", name: "Your academic department", who: "Clubs whose event fits a department's subject",
    eligible: () => true, lead: "Ask early; budgets are set per semester",
    how: "Email the department's student services office with the event, audience and the exact amount you need.",
    url: "https://undergrad.usc.edu/experience/research/",
  },
];

export const eligibleSources = (club: Club) => FUNDING_SOURCES.filter((s) => s.eligible(club));
