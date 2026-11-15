// Every Claude call in the product. Each function has one job, a fixed output schema, and an
// offline fallback so the demo still works without a key or Wi-Fi (results are marked `offline`).
// Rule decisions never happen here: the model reads and writes language; engine.ts decides.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODELS, hasKey } from "./claude";
import { GUIDELINES_TEXT } from "@/data/guidelines";
import { BOARDS, ITEM_CATEGORIES, INELIGIBLE, type BoardId } from "@/data/rules";
import { SPONSORS, type Major, type Sponsor } from "@/data/sponsors";
import { needsFrom, rankSponsors } from "./sponsorMatch";
import type { Application, Check, EventInfo, LineItem, SponsorPackage, SponsorPick } from "./types";
import { decisionEmailText, emailProblems, type DecisionFacts } from "./decisionGuard";
import { outreachProblems, type EmailFacts } from "./outreachGuard";
import { fmtDate, money } from "./engine";
export { buildPackages } from "./ai-shared";

const SYSTEM = [
  {
    type: "text" as const,
    text:
      "You help USC student organization officers prepare funding requests for the Undergraduate Student Government (USG) Funding Department, and help USG reviewers. " +
      "You never decide whether money is approved; code checks the rules and humans decide. Never invent facts, prices, rules or contacts. Write plainly, without hype.\n\n" +
      GUIDELINES_TEXT,
    cache_control: { type: "ephemeral" as const },
  },
];

type Out<T> = { data: T; offline: boolean };

async function parse<T extends z.ZodType>(model: string, schema: T, content: Anthropic_Content, maxTokens = 4000): Promise<z.infer<T> | null> {
  const res = await claude.messages.parse({
    model,
    max_tokens: maxTokens,
    system: SYSTEM,
    output_config: { format: zodOutputFormat(schema) },
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) return null;
  return res.parsed_output as z.infer<T>;
}
type Anthropic_Content = Parameters<typeof claude.messages.create>[0]["messages"][number]["content"];

// ---------- 1. Intake: plain words -> event card + budget rows ----------

const ItemSchema = z.object({
  item: z.string(),
  vendor: z.string().describe("Vendor or store name, empty if not given"),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number().describe("Total cost of this line in dollars"),
  category: z.enum(ITEM_CATEGORIES),
  estimate: z.boolean().describe("true when the officer gave no price and you estimated it"),
  justification: z.string().describe("One sentence in the club's voice on why the event needs this line, for USG's budget sheet. Never mention rules, limits or eligibility."),
});

const IntakeSchema = z.object({
  event: z.object({
    title: z.string(),
    type: z.string(),
    date: z.string().describe("YYYY-MM-DD, empty if unknown"),
    location: z.string(),
    onCampus: z.boolean(),
    attendance: z.number(),
    openToAll: z.boolean(),
    ticketed: z.boolean(),
    privateResidence: z.boolean(),
    travel: z.boolean(),
    international: z.boolean(),
    food: z.boolean(),
    description: z.string().describe("Two sentences describing the event itself (what, who, why). No funding or rule commentary."),
  }),
  board: z.enum(["professional", "philanthropy", "social", "arts"]),
  boardReason: z.string().describe("One sentence: why this board fits, referring to the board's description"),
  items: z.array(ItemSchema),
});
export type Intake = { event: Omit<EventInfo, "board" | "boardReason">; board: BoardId; boardReason: string; items: Omit<LineItem, "id" | "link" | "orderBy" | "toSponsor">[] };

export async function intake(text: string, today: string): Promise<Out<Intake>> {
  if (hasKey()) {
    try {
      const r = await parse(
        MODELS.fast,
        IntakeSchema,
        `Today is ${today}. An officer described an event they want USG funding for. Turn it into the event card and budget rows.
- Dates without a year are the next upcoming one after today.
- Split the budget into separate lines. Use the officer's prices; if a line has no price, estimate a typical Los Angeles price and set estimate=true.
- Food and per-person items: quantity = number of people (the attendance unless stated), unitPrice = total / quantity. Other items: quantity 1 unless a count is given.
- category: pick the most specific. Use the ineligible categories exactly when they apply (gift cards or prizes bought as gift cards = "gift", performers or DJs = "performer", alcohol = "alcohol", Uber/Lyft/car rental = "rideshare", reusable equipment or uniforms = "durable"). Catered meals = "food". Shirts = "tshirt". Swag, stickers, banners and other branded giveaways = "promo_merch".
- openToAll is true unless the officer says members only. onCampus is true for USC buildings.
- Only extract and describe. Do not judge eligibility or mention rules anywhere; the app checks rules separately.

Officer's description:
"""${text}"""`,
      );
      if (r) return { data: r, offline: false };
    } catch (e) {
      console.error("intake failed, using offline parser", e);
    }
  }
  return { data: offlineIntake(text, today), offline: true };
}

// A plain parser for demos without a key. Handles sentences like
// "Hackathon for 120 students in Ginsburg on Feb 18. Catering $5,400, Amazon swag $600."
export function offlineIntake(text: string, today: string): Intake {
  const t = text.replace(/\s+/g, " ");
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let date = "";
  const m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (m) {
    const mo = months.indexOf(m[1].toLowerCase()) + 1;
    let y = Number(today.slice(0, 4));
    const cand = `${y}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    if (cand < today) y++;
    date = `${y}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  const att = Number(t.match(/(\d{2,4})\s*(students|people|attendees|guests|members)/i)?.[1] ?? 50);
  const loc = t.match(/\b(?:in|at)\s+([A-Z][\w']*(?:\s+[A-Z][\w']*)*(?:\s+Hall|\s+Center|\s+Auditorium)?)/)?.[1] ?? "";
  const title = t.split(/\s+(?:for|with|in|at|on)\s+/i)[0].replace(/^(we want to host|hosting|host)\s+(an?\s+)?/i, "").trim().slice(0, 60) || "Club event";
  const cat = (s: string): (typeof ITEM_CATEGORIES)[number] => {
    const x = s.toLowerCase();
    if (/gift ?card|giftcard/.test(x)) return "gift";
    if (/dj|performer|band|talent/.test(x)) return "performer";
    if (/alcohol|beer|wine/.test(x)) return "alcohol";
    if (/uber|lyft|rideshare|car rental/.test(x)) return "rideshare";
    if (/cater|lunch|dinner|food|pizza|snack|breakfast|chipotle|panda/.test(x)) return "food";
    if (/hotel|lodging/.test(x)) return "lodging";
    if (/flight|airfare/.test(x)) return "airfare";
    if (/shirt|tee/.test(x)) return "tshirt";
    if (/swag|sticker|banner|merch/.test(x)) return "promo_merch";
    if (/print|poster|flyer/.test(x)) return "printing";
    if (/venue|room|auditorium|hall rental|bovard/.test(x)) return "venue";
    if (/registration|ticket to/.test(x)) return "registration";
    return "supplies";
  };
  const items: Intake["items"] = [];
  const re = /([A-Za-z][A-Za-z' &-]{2,40}?)\s*(?:from\s+([A-Z][\w' ]+?)\s*)?\$\s?([\d,]+(?:\.\d\d)?)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(t))) {
    const label = mm[1].replace(/^(and|with|plus|also|,|\.)\s+/i, "").trim();
    const total = Number(mm[3].replace(/,/g, ""));
    const category = cat(label);
    const vendor = mm[2]?.trim() || (label.match(/^(Amazon|Chipotle|Panda Catering|Costco|Target)/i)?.[1] ?? "");
    const quantity = category === "food" ? att : 1;
    items.push({ item: label.replace(new RegExp("^" + vendor + "\\s*", "i"), "").replace(/^\w/, (c) => c.toUpperCase()) || label, vendor, quantity, unitPrice: Math.round((total / quantity) * 100) / 100, total, category, estimate: false, justification: "" });
  }
  // Price first: "$600 in gift cards for winners"
  const re2 = /\$\s?([\d,]+(?:\.\d\d)?)\s+(?:in|of|on|for)\s+([a-z][a-z' -]{2,30}?)(?=\s+(?:for|from|to)\b|[.,;]|$)/gi;
  while ((mm = re2.exec(t))) {
    const total = Number(mm[1].replace(/,/g, ""));
    const label = mm[2].trim();
    if (items.some((i) => i.total === total && t.indexOf(i.item) > -1 && Math.abs(t.indexOf("$" + mm![1]) - t.toLowerCase().indexOf(i.item.toLowerCase())) < 30)) continue;
    const category = cat(label);
    const quantity = category === "food" ? att : 1;
    items.push({ item: label.replace(/^\w/, (c) => c.toUpperCase()), vendor: "", quantity, unitPrice: Math.round((total / quantity) * 100) / 100, total, category, estimate: false, justification: "" });
  }
  const lower = t.toLowerCase();
  const board: BoardId = /clean ?up|volunteer|service|donation drive|tutor/.test(lower) ? "philanthropy" : /showcase|concert|dance|art|film|theater|performance/.test(lower) ? "arts" : /hackathon|workshop|conference|career|networking|speaker|panel|research|competition/.test(lower) ? "professional" : "social";
  return {
    event: {
      title: title.replace(/^\w/, (c) => c.toUpperCase()),
      type: title.toLowerCase(),
      date,
      location: loc,
      onCampus: /ginsburg|tutor|bovard|ronald|leavey|village|ucc|campus|hall|center/i.test(loc || t),
      attendance: att,
      openToAll: !/members only|members-only/i.test(t),
      ticketed: /tickets? (sold|sales)|sell tickets/i.test(t),
      privateResidence: /house party|apartment|someone's house/i.test(t),
      travel: /flight|hotel|travel|conference in/i.test(t),
      international: /international|abroad|mexico|canada|london/i.test(t),
      food: items.some((i) => i.category === "food") || /food|lunch|dinner|catering/i.test(t),
      description: t.slice(0, 280),
    },
    board,
    boardReason: `Matched on the event type; ${BOARDS[board].name} covers events like this.`,
    items,
  };
}

// ---------- 2. Quote reading (PDF or image) ----------

const QuoteSchema = z.object({
  vendor: z.string().nullable(),
  total: z.number().nullable().describe("Grand total including tax and fees"),
  lines: z.array(z.object({ description: z.string(), amount: z.number() })),
});

export async function readQuote(base64: string, mediaType: string): Promise<Out<z.infer<typeof QuoteSchema>> | null> {
  if (!hasKey()) return null;
  const block =
    mediaType === "application/pdf"
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: base64 } };
  const r = await parse(MODELS.fast, QuoteSchema, [block, { type: "text", text: "This is a vendor quote, invoice or cart screenshot. Read the vendor name, each line and the grand total including tax and fees. Use null when a value is not visible." }], 2000);
  return r ? { data: r, offline: false } : null;
}

// ---------- 3. Application answers ----------

const AnswersSchema = z.object({ description: z.string(), missionFit: z.string(), otherSources: z.string() });

export async function draftAnswers(app: Application, clubName: string, mission = ""): Promise<Out<z.infer<typeof AnswersSchema>>> {
  const items = app.items.filter((i) => !i.toSponsor);
  if (hasKey()) {
    try {
      const r = await parse(
        MODELS.write,
        AnswersSchema,
        `Draft three answers for USG's funding form for "${clubName}". Use only the facts below. 60 to 110 words each for the first two; plain, specific, no hype. Describe the event and its value to students; do not discuss funding rules, limits or per-person costs (the budget sheet covers money).
1. description: "Description of event"
2. missionFit: "How does the event align with your mission/vision/goals?"
3. otherSources: always return an empty string. The club answers this one itself, because a wrong answer is a published denial reason.
Club mission, in the club's own words: ${mission || "not given; describe the event's value to students without inventing a mission"}
Event: ${JSON.stringify(app.event)}
Budget lines sent to USG: ${items.map((i) => `${i.item} (${i.vendor}) ${money(i.total)}`).join("; ")}
Items for sponsors: ${app.items.filter((i) => i.toSponsor).map((i) => i.item).join("; ") || "none"}`,
        2000,
      );
      if (r) return { data: { ...r, otherSources: "" }, offline: false };
    } catch (e) {
      console.error("draftAnswers failed", e);
    }
  }
  const e = app.event;
  return {
    offline: true,
    data: {
      description: `${clubName} will host ${e.title} on ${e.date ? fmtDate(e.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "a date to be set"} at ${e.location || "a campus venue"} for about ${e.attendance} students. ${e.description}`.trim(),
      missionFit: mission ? `${clubName}'s mission is ${mission.replace(/\.$/, "")}. ${e.title} serves it directly: ${e.description || "it is free and open to all USC students"}` : `${e.title} is free and open to all USC students. [Add how it serves your club's mission.]`,
      otherSources: "",
    },
  };
}

// ---------- 4. Reviewer comments (one per check) ----------

const CommentsSchema = z.object({ comments: z.array(z.object({ checkId: z.string(), text: z.string().describe("One or two sentences for the reviewer: what to look at and a suggested action") })) });

export async function reviewComments(app: Application, checks: Check[]): Promise<Out<{ checkId: string; text: string }[]>> {
  const relevant = checks.filter((c) => c.level !== "pass" || c.ruleId === "food-per-person" || c.ruleId === "annual-cap");
  if (hasKey()) {
    try {
      const r = await parse(
        MODELS.write,
        CommentsSchema,
        `You are drafting comments for a USG funding director reviewing this application. Write one comment per check below (use its id). Say what matters and suggest an action (approve the line, fund part, ask for a document, deny the line). Do not restate the rule text; the app shows it.
Application: ${JSON.stringify({ event: app.event, items: app.items.filter((i) => !i.toSponsor).map(({ item, vendor, total, category }) => ({ item, vendor, total, category })), answers: app.answers })}
Checks: ${JSON.stringify(relevant.map(({ id, level, title, detail }) => ({ id, level, title, detail })))}`,
        3000,
      );
      if (r) return { data: r.comments.filter((c) => relevant.some((x) => x.id === c.checkId)), offline: false };
    } catch (e) {
      console.error("reviewComments failed", e);
    }
  }
  const act = (c: Check) => (c.level === "fail" ? "Suggest: do not fund this as submitted." : c.level === "warn" ? "Suggest: confirm before approving." : "Suggest: fine as submitted.");
  return { offline: true, data: relevant.map((c) => ({ checkId: c.id, text: `${c.title}. ${act(c)}` })) };
}

// ---------- 5. Decision email ----------

export async function decisionEmail(f: DecisionFacts): Promise<Out<string>> {
  // The email is built in code from the decision data. The model may only smooth the wording,
  // and any draft that contradicts the data (amount, excluded lines, invented steps) is thrown away.
  const base = decisionEmailText(f);
  if (hasKey()) {
    try {
      const r = await parse(
        MODELS.write,
        z.object({ email: z.string() }),
        `Polish this email from the USG Funding Department so it reads clearly and kindly. Keep every fact, dollar amount, line item and section reference exactly as written. Do not add rules, dates, deadlines, next steps or promises that are not in it. Do not say anything was or was not excluded beyond what it lists. No placeholders in square brackets. Under 180 words.

${base}`,
        1500,
      );
      if (r && emailProblems(r.email, f).length === 0) return { data: r.email, offline: false };
      if (r) console.warn("decisionEmail: AI draft rejected", emailProblems(r.email, f));
    } catch (e) {
      console.error("decisionEmail failed", e);
    }
  }
  return { offline: true, data: base };
}

// ---------- 6. Sponsor match and outreach emails ----------
// Code ranks the companies (sponsorMatch.ts). The model only explains the top candidates and writes emails,
// using the facts given, so it cannot invent a USC tie.

const PickSchema = z.object({
  picks: z.array(z.object({ sponsorId: z.string(), reason: z.string().describe("One sentence using only the facts given"), packageTitle: z.string(), score: z.number().describe("0-100 fit") })),
});
const EmailSchema = z.object({ subject: z.string(), body: z.string() });

type EmailInput = { sponsor: Sponsor; pkg: SponsorPackage; event: EventInfo; clubName: string; contactName?: string };

export function outreachTemplate({ sponsor, pkg, event, clubName, contactName }: EmailInput) {
  const when = event.date ? fmtDate(event.date, { month: "long", day: "numeric" }) : "an upcoming date";
  return {
    subject: `${event.title} ask`,
    body: `Hi ${contactName || `${sponsor.name} team`},\n\nI'm the outreach lead for ${clubName} at USC. On ${when} we're hosting ${event.title} for about ${event.attendance} students.${sponsor.tie ? ` We're writing to ${sponsor.name} because ${sponsor.tie.replace(/\s*\(.*\)$/, "").replace(/^\w/, (c) => c.toLowerCase())}.` : ""}\n\nWould ${sponsor.name} cover ${pkg.covers.toLowerCase()} (about ${money(pkg.amount)})? Payment would go straight to the vendor, or the support can be in kind.\n\nIn return: ${pkg.offer.join("; ").toLowerCase()}.\n\nCould we set up a 15-minute call this week?\n\nThank you,\n[Your name]\n${clubName}`,
  };
}

export async function outreachEmail(input: EmailInput): Promise<Out<{ subject: string; body: string }>> {
  if (hasKey()) {
    try {
      const { sponsor, pkg, event, clubName, contactName } = input;
      const r = await parse(
        MODELS.write,
        EmailSchema,
        `Write a short sponsorship email (under 150 words) from the outreach lead of ${clubName}, a USC student club, to ${contactName ? contactName + " at " : ""}${sponsor.name}.
Facts you may use and nothing else:
- Event: ${JSON.stringify({ title: event.title, date: event.date, location: event.location, attendance: event.attendance, description: event.description })}
- The ask: ${pkg.covers}, about ${money(pkg.amount)}, paid directly to the vendor or given in kind (the club never receives cash).
- What the company gets: ${pkg.offer.join("; ")}.
- Company: ${sponsor.name}, ${sponsor.industry}, hires ${sponsor.hires.join(", ")}.${sponsor.tie ? ` USC tie: ${sponsor.tie}.` : " No known USC tie: do not claim one."}
One specific ask, one call to action (a 15-minute call), plain and warm, no hype. Sign as [Your name], ${clubName}.`,
        1200,
      );
      // Chancery's rule: instructions ask, validators enforce. A draft that fails the checks is dropped.
      if (r) {
        const problems = outreachProblems(r, outreachFacts(input));
        if (!problems.length) return { data: r, offline: false };
        console.warn("outreachEmail: AI draft rejected", problems);
      }
    } catch (e) {
      console.error("outreachEmail failed", e);
    }
  }
  return { data: outreachTemplate(input), offline: true };
}

export const outreachFacts = ({ sponsor, pkg, event }: EmailInput): EmailFacts => ({ sponsorName: sponsor.name, eventTitle: event.title, amounts: [pkg.amount], hasTie: Boolean(sponsor.tie) });

/** One short nudge after silence. Only offered while the company is still at Emailed, so it never follows a reply. */
export async function followUpEmail(input: EmailInput & { firstSubject: string }): Promise<Out<{ subject: string; body: string }>> {
  const { sponsor, pkg, event, clubName, contactName, firstSubject } = input;
  const when = event.date ? fmtDate(event.date, { month: "long", day: "numeric" }) : "our upcoming event";
  const base = {
    subject: firstSubject.toLowerCase().startsWith("re:") ? firstSubject : `Re: ${firstSubject}`,
    body: `Hi ${contactName || `${sponsor.name} team`},

A short follow-up on my note about ${event.title} on ${when}. We are still looking for a company to cover ${pkg.covers.toLowerCase()} (about ${money(pkg.amount)}), paid to the vendor or given in kind.

If ${sponsor.name} is not the right fit this time, a one-line reply helps us plan. If someone else handles student events, I would be glad to write to them instead.

Thank you,
[Your name]
${clubName}`,
  };
  if (!hasKey()) return { data: base, offline: true };
  try {
    const r = await parse(MODELS.write, EmailSchema, `Rewrite this follow-up so it reads naturally. Keep it under 90 words, keep every fact and amount, add nothing new, no exclamation marks, no filler such as "circle back" or "touch base". Keep the subject as given.

Subject: ${base.subject}

${base.body}`, 800);
    if (r && !outreachProblems(r, { ...outreachFacts(input), maxWords: 110 }).length) return { data: r, offline: false };
  } catch (e) {
    console.error("followUpEmail failed", e);
  }
  return { data: base, offline: true };
}

/** Chancery's "minimal in, finished out": the officer's shorthand carries the intent; the model never adds a commitment they did not make. */
export async function replyEmail(input: EmailInput & { theirMessage: string; note: string; firstSubject: string }): Promise<Out<{ subject: string; body: string }>> {
  const { sponsor, clubName, contactName, theirMessage, note, firstSubject } = input;
  const subject = firstSubject.toLowerCase().startsWith("re:") ? firstSubject : `Re: ${firstSubject}`;
  const base = { subject, body: `Hi ${contactName || `${sponsor.name} team`},

Thank you for getting back to me. ${note.trim().replace(/^\w/, (c) => c.toUpperCase())}${/[.?!]$/.test(note.trim()) ? "" : "."}

Thank you,
[Your name]
${clubName}` };
  if (!hasKey()) return { data: base, offline: true };
  try {
    const r = await parse(
      MODELS.write,
      EmailSchema,
      `You turn a student club officer's shorthand into a finished email reply to a company contact.
Their message:
"""${theirMessage.slice(0, 3000)}"""
The officer's instruction (substance and stance, not draft text): "${note}"
Rules: answer everything they asked; match their length and register; never invent a commitment, date, time, number or fact the officer did not give (if timing is unstated, say "shortly"); no throat-clearing such as "Thanks for reaching out"; no filler; 40 to 110 words; sign as [Your name], ${clubName}. Subject: "${subject}".`,
      900,
    );
    if (r && !outreachProblems(r, { ...outreachFacts(input), eventTitle: "", given: `${note} ${theirMessage}`, maxWords: 140 }).length) return { data: r, offline: false };
  } catch (e) {
    console.error("replyEmail failed", e);
  }
  return { data: base, offline: true };
}

export async function sponsorMatch(app: Application, clubName: string, packages: SponsorPackage[], majors: Major[], extra: Sponsor[] = []): Promise<Out<{ picks: SponsorPick[]; email: { to: string; subject: string; body: string } | null }>> {
  const pool = [...SPONSORS, ...extra];
  const ranked = rankSponsors(pool, majors, needsFrom(packages.map((p) => p.covers))).slice(0, 8);
  const pkg = packages[0];
  let picks: SponsorPick[] = ranked.slice(0, 4).map((m) => ({ sponsorId: m.sponsor.id, name: m.sponsor.name, score: m.score, packageTitle: pkg?.title ?? "", reason: [m.sponsor.tie, m.reasons.filter((x) => x !== "USC tie on record").join(". ")].filter(Boolean).join(". ") + "." }));
  let offline = true;
  if (hasKey() && packages.length) {
    try {
      const r = await parse(
        MODELS.write,
        PickSchema,
        `These companies were pre-ranked for a USC club event. Pick the best 4, assign each the package it fits best, and give one sentence on why, using only the facts listed (never claim a USC tie that is not in "tie").
Event: ${JSON.stringify({ title: app.event.title, type: app.event.type, attendance: app.event.attendance, description: app.event.description })}
Audience majors: ${majors.join(", ") || "not given"}
Packages: ${JSON.stringify(packages.map((p) => ({ title: p.title, amount: p.amount })))}
Companies: ${JSON.stringify(ranked.map((m) => ({ id: m.sponsor.id, name: m.sponsor.name, industry: m.sponsor.industry, hires: m.sponsor.hires, canGive: m.sponsor.inKind, tie: m.sponsor.tie, codeScore: m.score })))}`,
        1500,
      );
      const valid = r?.picks.filter((p) => ranked.some((m) => m.sponsor.id === p.sponsorId) && packages.some((k) => k.title === p.packageTitle)).slice(0, 4);
      if (valid?.length) {
        picks = valid.map((p) => ({ ...p, name: pool.find((s) => s.id === p.sponsorId)!.name }));
        offline = false;
      }
    } catch (e) {
      console.error("sponsorMatch failed", e);
    }
  }
  const top = pool.find((s) => s.id === picks[0]?.sponsorId);
  const topPkg = packages.find((p) => p.title === picks[0]?.packageTitle) ?? pkg;
  let email: { to: string; subject: string; body: string } | null = null;
  if (top && topPkg) {
    const e = await outreachEmail({ sponsor: top, pkg: topPkg, event: app.event, clubName });
    email = { to: `${top.name} university recruiting`, ...e.data };
    offline = offline && e.offline;
  }
  return { offline, data: { picks, email } };
}

export const INELIGIBLE_LABELS = INELIGIBLE;

// ---------- 7. Post-event recap for a sponsor ----------
export async function recapEmail({ sponsor, pkg, event, clubName }: EmailInput): Promise<Out<{ subject: string; body: string }>> {
  const fallback = {
    subject: `Thank you from ${clubName}`,
    body: `Hi ${sponsor.name} team,\n\nThank you for covering ${pkg.covers.toLowerCase()} for ${event.title}. About ${event.attendance || "our"} students came, and your support made that part of the event possible.\n\nAs agreed, we included: ${pkg.offer.join("; ").toLowerCase()}. Photos are attached.\n\nWe hope to work with you again next semester.\n\nThank you,\n[Your name]\n${clubName}`,
  };
  if (!hasKey()) return { data: fallback, offline: true };
  try {
    const r = await parse(
      MODELS.write,
      EmailSchema,
      `Write a short thank-you recap (under 130 words) from ${clubName}, a USC student club, to ${sponsor.name} after the event. Facts only: event ${JSON.stringify({ title: event.title, date: event.date, attendance: event.attendance, description: event.description })}; the sponsor covered ${pkg.covers} (${money(pkg.amount)}); recognition given: ${pkg.offer.join("; ")}. Leave [number] placeholders for anything not given (for example final attendance). Mention photos are attached. Sign as [Your name], ${clubName}.`,
      900,
    );
    if (r) return { data: r, offline: false };
  } catch (e) {
    console.error("recapEmail failed", e);
  }
  return { data: fallback, offline: true };
}
