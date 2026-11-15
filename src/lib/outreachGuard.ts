// Checks every sponsor email before a club sees it. Adapted from Chancery's drafting gates
// (github.com/JainamTJain/chancery-public): prompt rules ask, these validators enforce.
// A draft that fails falls back to the plain template, which always passes.

/** Phrases that make a cold email read as mass mail or AI filler (from Chancery's banned list, trimmed for clubs). */
export const BANNED = [
  "i wanted to reach out", "reach out", "reaching out", "touch base", "circle back", "synergy", "synergies", "leverage",
  "excited to", "thrilled to", "passionate about", "world-class", "cutting-edge", "state-of-the-art", "pick your brain",
  "at your earliest convenience", "game changer", "game-changer", "delve", "tap into", "moreover", "revolutionize",
  "dear sir", "dear madam", "win-win", "align our missions", "i'm impressed", "i am impressed", "caught my attention",
  "i came across", "your impressive", "as a leader in", "mutual benefit", "partnership opportunity",
  "i know you're busy", "sorry to bother", "we'd love to", "we would love", "it would be our pleasure",
  "highlights your", "reflects your commitment", "this demonstrates", "this shows that",
];

export type EmailFacts = {
  sponsorName: string;
  eventTitle: string;
  /** Dollar amounts the email may mention (the ask, the event budget). */
  amounts: number[];
  /** Words or numbers the sender gave that may appear (dates, times, figures from a reply). */
  given?: string;
  hasTie: boolean;
  /** Placeholders the club fills in by hand, like [Your name]. */
  placeholders?: string[];
  maxWords?: number;
};

const DATE_WORDS = /\b(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}\b|\b\d{1,2}(:\d{2})? ?(am|pm)\b|\btomorrow\b|\bnext week\b|\bby (the )?end of\b/gi;

export function outreachProblems(email: { subject: string; body: string }, f: EmailFacts): string[] {
  const p: string[] = [];
  const body = email.body ?? "";
  const all = `${email.subject}\n${body}`;
  const low = all.toLowerCase();
  if (!email.subject.trim()) p.push("The subject is empty.");
  if (email.subject.split(/\s+/).filter(Boolean).length > 12) p.push("The subject is a sentence, not a subject line.");
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > (f.maxWords ?? 170)) p.push(`It is ${words} words; keep it under ${f.maxWords ?? 170}.`);
  if (words < 25) p.push("It is too short to say who you are and what you are asking for.");
  const hits = BANNED.filter((b) => low.includes(b));
  if (hits.length) p.push(`Filler phrasing: ${hits.slice(0, 4).map((h) => `"${h}"`).join(", ")}.`);
  if (/[–—]/.test(all)) p.push("It uses dashes as connectors; use commas or periods.");
  if ((body.match(/!/g) ?? []).length > 1) p.push("More than one exclamation mark.");
  const allowed = new Set((f.placeholders ?? ["[Your name]"]).map((x) => x.toLowerCase()));
  const brackets = [...all.matchAll(/\[[^\]]{1,40}\]/g)].map((m) => m[0]).filter((m) => !allowed.has(m.toLowerCase()));
  if (brackets.length) p.push(`Unfilled placeholder: ${brackets[0]}.`);
  if (!low.includes(f.sponsorName.replace(/^Sample:\s*/, "").toLowerCase().split(" ")[0])) p.push(`It never names ${f.sponsorName}; a generic email reads as a mass mailing.`);
  if (f.eventTitle && !low.includes(f.eventTitle.toLowerCase().slice(0, 18))) p.push("It never names the event.");
  const ok = new Set(f.amounts.map((n) => Math.round(n)));
  const given = (f.given ?? "").toLowerCase();
  for (const m of all.replace(/,/g, "").matchAll(/\$(\d+(?:\.\d+)?)/g)) {
    const n = Math.round(Number(m[1]));
    if (!ok.has(n) && !given.includes(String(n))) { p.push(`It mentions $${m[1]}, which you did not give.`); break; }
  }
  if (f.given !== undefined) {
    for (const m of body.matchAll(DATE_WORDS)) {
      if (!given.includes(m[0].toLowerCase().slice(0, 3))) { p.push(`It commits to "${m[0]}", which you did not say.`); break; }
    }
  }
  if (!f.hasTie && /\b(alum(ni|nus|na)?|trojan family|usc (tie|connection|partner))\b/i.test(body)) p.push("It claims a USC connection that is not on record.");
  return p;
}

/** Follow-ups go only to companies that were emailed and have not answered. Never after a reply. */
export function followUpAllowed(status: string, followUp: string, today: string) {
  return status === "emailed" && Boolean(followUp) && followUp <= today;
}
