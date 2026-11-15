// Legislative Fund slide deck scaffold. Section titles mirror the six slides clubs need
// for a Legislative Branch vote of confidence (2025-26 guidelines linked from fundingSources).
import PptxGenJS from "pptxgenjs";
import { money, requestTotal } from "@/lib/engine";
import type { Application, Club } from "@/lib/types";

/** Six required deck sections from the Legislative Fund slide-deck requirement. */
export const LEG_FUND_SECTIONS = [
  "Organization and senator sponsor",
  "Event overview",
  "Itemized budget",
  "Contingency plan",
  "Student impact",
  "Timeline and ask",
] as const;

export type LegFundSection = (typeof LEG_FUND_SECTIONS)[number];

function bulletsFor(section: LegFundSection, app: Application, club: Club, amount: number): string[] {
  const e = app.event;
  switch (section) {
    case "Organization and senator sponsor":
      return [
        `${club.name} (${club.school})`,
        "Recognized student organization; senator or committee sponsor required for the bill",
        "Confirm your sponsoring senator before the feasibility meeting",
      ];
    case "Event overview":
      return [
        e.title || "Event title",
        e.date ? `Date: ${e.date}` : "Date: (set on the request)",
        e.location ? `Location: ${e.location}` : "Location: (set on the request)",
        `About ${e.attendance || "N/A"} students expected`,
        (app.answers.description || e.description || "Describe what students will do.").slice(0, 280),
      ];
    case "Itemized budget":
      return [
        `Ask from Legislative Fund: ${money(amount)}`,
        `Full event cost on the USG request: ${money(requestTotal(app))}`,
        ...app.items.filter((i) => !i.toSponsor).slice(0, 6).map((i) => `${i.item}${i.vendor ? ` (${i.vendor})` : ""}: ${money(i.total)}`),
        "Annual events capped at $2,000 (2025-26 Legislative Branch Guidelines)",
      ];
    case "Contingency plan":
      return [
        "Contingency line: at most 10% of the ask, and at most $350",
        `Suggested contingency: ${money(Math.min(350, Math.round(amount * 0.1)))}`,
        "Name what the contingency covers (vendor overtime, tax, delivery)",
        "If unused, contingency is not spent",
      ];
    case "Student impact":
      return [
        "Vote of confidence criteria 1-4 need 80% scores of 3 or 4",
        `Who benefits: about ${e.attendance || "N/A"} undergraduates`,
        e.openToAll ? "Open to all USC students" : "Audience: (state who can attend)",
        "Say how this fills a gap other campus funding does not cover",
      ];
    case "Timeline and ask":
      return [
        "Under $1,000: about 1 week with advisor / Speaker / VP / CDO / CFO",
        "Over $1,000: about 2 weeks, feasibility meeting, then vote of confidence (every other Tuesday 6-7 PM), then a Senate bill",
        `Specific ask: ${money(amount)} from the Legislative Fund for ${e.title || "this event"}`,
        "Attach quotes and the Greenlight Check when you present",
      ];
  }
}

export async function buildLegFundPptx(
  app: Application,
  club: Club,
  amount: number,
): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.author = "Greenlight";
  pptx.title = `Legislative Fund · ${app.event.title}`;
  pptx.subject = "Six-section deck scaffold from 2025-26 Legislative Branch Guidelines";

  const title = pptx.addSlide();
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "990000" } });
  title.addText("Greenlight", { x: 0.6, y: 1.4, w: 8.5, h: 0.4, fontSize: 14, color: "FFCC00", bold: true });
  title.addText("Legislative Fund deck", { x: 0.6, y: 1.9, w: 8.5, h: 0.7, fontSize: 32, color: "FFFFFF", bold: true });
  title.addText(`${club.name} · ${app.event.title}`, { x: 0.6, y: 2.7, w: 8.5, h: 0.4, fontSize: 16, color: "FFFFFF" });
  title.addText(`Ask: ${money(amount)} · Edit every slide before you present`, { x: 0.6, y: 3.3, w: 8.5, h: 0.35, fontSize: 13, color: "FFCC00" });

  for (const section of LEG_FUND_SECTIONS) {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.7, fill: { color: "990000" } });
    slide.addText(section, { x: 0.5, y: 0.18, w: 9, h: 0.4, fontSize: 18, color: "FFFFFF", bold: true });
    slide.addText(
      bulletsFor(section, app, club, amount).map((t) => ({ text: t, options: { bullet: true, breakLine: true } })),
      { x: 0.6, y: 1.1, w: 8.8, h: 4.2, fontSize: 15, color: "1C1917", paraSpaceAfter: 10 },
    );
    slide.addText("Greenlight scaffold · confirm against current Legislative Branch Guidelines", {
      x: 0.5, y: 5.1, w: 9, h: 0.3, fontSize: 10, color: "78716C",
    });
  }

  const out = await pptx.write({ outputType: "blob" });
  return out as Blob;
}

export async function downloadLegFundPptx(app: Application, club: Club, amount: number, fileName?: string) {
  const blob = await buildLegFundPptx(app, club, amount);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName ?? `${(app.event.title || "event").replace(/\W+/g, "")}_LegislativeFund.pptx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
