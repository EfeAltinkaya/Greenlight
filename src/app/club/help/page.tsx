"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Building2, Clock, Copy, Landmark, Mail, Users } from "lucide-react";
import { BOARDS, type BoardId } from "@/data/rules";
import {
  formatOfficeTime,
  generalEmail,
  nextOfficeHours,
  outreachTeam,
  peopleForBoard,
  roleLabel,
  ROSTER_AS_OF,
  ROSTER_SOURCE,
  type Person,
} from "@/data/people";
import { todayISO } from "@/lib/engine";
import { requestIdOf } from "@/lib/requestId";
import { useCurrentClub, useStore } from "@/lib/store";
import { useToast } from "@/components/ui";

const QUESTIONS = [
  { id: "vendor", label: "Is my vendor OK?" },
  { id: "incomplete", label: "My application came back incomplete" },
  { id: "eligible", label: "Can USG fund this item?" },
  { id: "deadline", label: "I missed the deadline" },
  { id: "other-money", label: "Where else can I get money?" },
  { id: "reviewers", label: "Who reviews my board?" },
] as const;

type QuestionId = (typeof QUESTIONS)[number]["id"];

const BOARD_QUESTIONS: Set<QuestionId> = new Set(["vendor", "incomplete", "eligible", "deadline", "reviewers"]);

// The snapshot must be a stable value (a string), not a new URLSearchParams each call:
// a fresh object every render made React loop forever and the page never showed.
const subscribeSearch = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
function useSearch() {
  // Snapshot must be a stable primitive: a new URLSearchParams every read
  // fails Object.is and triggers React error #185 (maximum update depth).
  const search = useSyncExternalStore(subscribeSearch, () => window.location.search, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

function fmtNext(p: Person) {
  const n = nextOfficeHours(p, todayISO());
  if (n.kind === "none") return "No posted office hours";
  if (n.kind === "now") {
    return `In office now until ${formatOfficeTime(n.endsAt)} (${n.slot.day})`;
  }
  const d = new Date(n.startsAt);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  return `Next: ${n.slot.day} ${date}, ${formatOfficeTime(n.slot.start)} to ${formatOfficeTime(n.slot.end)}`;
}

function draftEmail(opts: {
  question: QuestionId;
  clubName: string;
  boardName: string;
  rid?: string;
  checkUrl?: string;
  to: string[];
}) {
  const { question, clubName, boardName, rid, checkUrl, to } = opts;
  const greeting = to.length === 1 ? `Hi ${to[0]?.split("@")[0]},` : "Hello,";
  const idLine = rid ? `\n\nRequest ID: ${rid}` : "";
  const checkLine = checkUrl ? `\nGreenlight Check: ${checkUrl}` : "";
  const sign = `\n\nThank you,\n[Your name]\n${clubName}`;

  const bodies: Record<QuestionId, string> = {
    vendor:
      `${greeting}\n\nI am checking whether a vendor on our ${boardName} application is acceptable under USG guidelines before we attach quotes.${idLine}${checkLine}\n\nCould you confirm whether this vendor works on our timeline, or if we need the 9-week deadline?${sign}`,
    incomplete:
      `${greeting}\n\nUSG returned our ${boardName} application as incomplete. I want to fix every item before resubmitting.${idLine}${checkLine}\n\nCan you confirm what is still missing from your side?${sign}`,
    eligible:
      `${greeting}\n\nWe have a budget line and are unsure whether USG can fund it under the ${boardName} guidelines.${idLine}${checkLine}\n\nCould you point us to the rule section, or tell us what to change?${sign}`,
    deadline:
      `${greeting}\n\nWe may have missed the USG deadline for our ${boardName} event and need guidance on next steps.${idLine}${checkLine}\n\nIs there any path to submit this cycle, or should we plan another date?${sign}`,
    "other-money":
      `${greeting}\n\nUSG may not cover all of our costs. We are looking for other USC funding sources and sponsor options.${idLine}${checkLine}\n\nWhat would you suggest we try first for this club?${sign}`,
    reviewers:
      `${greeting}\n\nWe want to confirm who reviews ${boardName} applications this semester and the best way to reach you with a quick question.${idLine}${checkLine}${sign}`,
  };
  return bodies[question];
}

function OfficeLine({ p }: { p: Person }) {
  return (
    <div className="row small" style={{ gap: 6, color: "var(--ink-2)" }}>
      <Clock style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{fmtNext(p)}</span>
    </div>
  );
}

export default function ClubHelp() {
  const params = useSearch();
  const { apps } = useStore();
  const club = useCurrentClub();
  const [toast, say] = useToast();
  const boardParam = params.get("board");
  const appParam = params.get("app");
  const qParam = params.get("q") as QuestionId | null;

  const [question, setQuestion] = useState<QuestionId>(qParam && QUESTIONS.some((x) => x.id === qParam) ? qParam : "reviewers");
  const [board, setBoard] = useState<BoardId>(
    boardParam && boardParam in BOARDS ? (boardParam as BoardId) : "social",
  );
  const [appId, setAppId] = useState(appParam ?? "");

  const myApps = apps.filter((a) => a.clubId === club.id);
  const selectedId = appId || appParam || "";
  const app = myApps.find((a) => a.id === selectedId) ?? null;
  const effectiveBoard = (app?.event.board ?? board) as BoardId;

  const contacts = useMemo(() => {
    if (question === "other-money") return outreachTeam();
    if (BOARD_QUESTIONS.has(question)) return peopleForBoard(effectiveBoard);
    return peopleForBoard(effectiveBoard);
  }, [question, effectiveBoard]);

  const toEmails = contacts.length ? contacts.map((p) => p.email) : [generalEmail];
  const rid = app ? requestIdOf(app) : undefined;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const checkUrl = app && origin ? `${origin}/club/app/${app.id}/check` : undefined;

  const draft = draftEmail({
    question,
    clubName: club.name,
    boardName: BOARDS[effectiveBoard].name,
    rid,
    checkUrl,
    to: toEmails,
  });

  function pickQuestion(id: QuestionId) {
    setQuestion(id);
    const u = new URL(window.location.href);
    u.searchParams.set("q", id);
    history.replaceState(null, "", u.toString());
  }

  function pickBoard(b: BoardId) {
    setBoard(b);
    const u = new URL(window.location.href);
    u.searchParams.set("board", b);
    history.replaceState(null, "", u.toString());
  }

  function pickApp(id: string) {
    setAppId(id);
    const u = new URL(window.location.href);
    if (id) u.searchParams.set("app", id);
    else u.searchParams.delete("app");
    history.replaceState(null, "", u.toString());
    const chosen = myApps.find((a) => a.id === id);
    if (chosen) pickBoard(chosen.event.board);
  }

  async function copyDraft() {
    try {
      const mailto = `mailto:${toEmails.join(",")}?subject=${encodeURIComponent(rid ? `[${rid}] Question for USG Funding` : "Question for USG Funding")}&body=${encodeURIComponent(draft)}`;
      await navigator.clipboard.writeText(draft);
      say("Draft copied");
      window.location.assign(mailto);
    } catch {
      say("Could not copy draft", "error");
    }
  }

  const hint: Record<QuestionId, string> = {
    vendor: "Your board reviewers know vendor list and timeline rules. For on-campus venues, work with Trojan Event Services.",
    incomplete: "Email the board that returned your application. Attach your Greenlight Check so they see what you already fixed.",
    eligible: "Board directors interpret the funding guidelines for specific line items.",
    deadline: "Ask your board reviewers if the event week can move or if you are outside the funded calendar.",
    "other-money": "RSO Outreach can point you to other USC sources. See Other funding in the sidebar for drafts.",
    reviewers: `${BOARDS[effectiveBoard].name} applications go to the director and associate director below.`,
  };

  return (
    <>
      {toast}
      <div className="page-head">
        <div>
          <span className="eyebrow">Ask a person</span>
          <h1>Ask a person</h1>
          <p className="lede">
            Fall 2026 Funding Department roster as of {ROSTER_AS_OF}. Pick a question and your board; Greenlight drafts a short email with your request ID when you attach an application.
          </p>
        </div>
        <a className="link small" href={ROSTER_SOURCE} target="_blank" rel="noreferrer">
          Roster source
        </a>
      </div>

      <section className="card card-pad stack" style={{ gap: 16 }}>
        <div className="stack-xs">
          <span className="lbl">What do you need?</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                className={"chip-btn" + (question === q.id ? " on" : "")}
                aria-pressed={question === q.id}
                onClick={() => pickQuestion(q.id)}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="small muted">{hint[question]}</p>
        </div>

        <div className="grid cols-2" style={{ gap: 16 }}>
          {!app && (
            <label className="field">
              <span className="lbl">Funding board</span>
              <select className="select" value={effectiveBoard} onChange={(e) => pickBoard(e.target.value as BoardId)}>
                {(Object.keys(BOARDS) as BoardId[]).map((b) => (
                  <option key={b} value={b}>
                    {BOARDS[b].name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="lbl">Attach a request (optional)</span>
            <select className="select" value={app?.id ?? ""} onChange={(e) => pickApp(e.target.value)}>
              <option value="">No request selected</option>
              {myApps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.event.title} ({requestIdOf(a)})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid cols-2" style={{ gap: 16, alignItems: "stretch" }}>
        <div className="card card-pad stack" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 8 }}>
            <Users style={{ width: 18, color: "var(--cardinal)" }} />
            <h2 style={{ fontSize: 18, margin: 0 }}>USG contacts</h2>
          </div>
          {contacts.length === 0 ? (
            <p className="small muted">
              No board match. Email <a href={`mailto:${generalEmail}`}>{generalEmail}</a>.
            </p>
          ) : (
            contacts.map((p) => (
              <div key={p.email} className="inset stack-xs" style={{ padding: 12 }}>
                <div className="between" style={{ alignItems: "flex-start", gap: 8 }}>
                  <div className="stack-xs">
                    <strong>{p.name}</strong>
                    <span className="tiny faint">{roleLabel(p)}</span>
                  </div>
                  <a className="link small row" style={{ gap: 4 }} href={`mailto:${p.email}`}>
                    <Mail style={{ width: 14 }} />
                    {p.email}
                  </a>
                </div>
                <OfficeLine p={p} />
              </div>
            ))
          )}
          {question !== "other-money" && (
            <p className="tiny faint">
              General inbox: <a href={`mailto:${generalEmail}`}>{generalEmail}</a> if no one is available.
            </p>
          )}
        </div>

        <div className="card card-pad stack" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 8 }}>
            <Building2 style={{ width: 18, color: "var(--gold-deep)" }} />
            <h2 style={{ fontSize: 18, margin: 0 }}>Outside USG Funding</h2>
          </div>
          <div className="stack-xs small">
            <p>
              <strong>Trojan Event Services</strong> for reserving and staffing USC venues (Bovard, Ground Zero, and similar).
            </p>
            <p>
              <strong>Campus Activities</strong> for UEPA numbers and approval before outside fundraising or in-kind sponsor donations.
            </p>
          </div>
          {question === "other-money" && (
            <Link href={app ? `/club/funding?app=${app.id}` : "/club/funding"} className="link small row" style={{ gap: 4 }}>
              <Landmark style={{ width: 14 }} />
              Open Other funding drafts
            </Link>
          )}
        </div>
      </section>

      <section className="card card-pad stack" style={{ gap: 12 }}>
        <div className="between">
          <h2 style={{ fontSize: 18, margin: 0 }}>Draft email</h2>
          <button type="button" className="btn btn-sm" onClick={copyDraft}>
            <Copy />
            Copy and open mail
          </button>
        </div>
        <p className="tiny faint">
          To: {toEmails.join(", ")}
          {rid ? ` · ${rid}` : ""}
        </p>
        <pre className="inset small" style={{ padding: 14, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
          {draft}
        </pre>
        {app && (
          <p className="tiny faint">
            Greenlight Check link is included.{" "}
            <Link href={`/club/app/${app.id}/check`} className="link">
              Preview check
            </Link>
          </p>
        )}
      </section>
    </>
  );
}