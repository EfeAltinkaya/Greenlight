// In-kind sponsorship agreement as a .docx, from the same text as contract.ts.
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { contractText } from "@/lib/contract";
import type { Deal, EventInfo } from "@/lib/types";

export async function buildAgreementDocx(
  deal: Deal,
  clubName: string,
  event: EventInfo | null,
): Promise<Blob> {
  const raw = deal.contract?.text ?? contractText(deal, clubName, event);
  const blocks = raw.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  const children: Paragraph[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const isTitle = /^IN-KIND SPONSORSHIP AGREEMENT$/i.test(lines[0] ?? "");
    if (isTitle) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: lines[0], bold: true, font: "Calibri", size: 28 })],
        }),
      );
      for (const line of lines.slice(1)) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: line, font: "Calibri", size: 22 })],
          }),
        );
      }
      continue;
    }
    for (const line of lines) {
      children.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [new TextRun({ text: line, font: "Calibri", size: 22 })],
        }),
      );
    }
  }
  children.push(
    new Paragraph({
      spacing: { before: 280 },
      children: [
        new TextRun({
          text: "A standard Greenlight template, not legal advice. Campus Activities approves in-kind donations.",
          italics: true,
          size: 18,
          color: "78716C",
          font: "Calibri",
        }),
      ],
    }),
  );
  const doc = new Document({
    creator: "Greenlight",
    title: `In-kind agreement · ${deal.sponsorName} · ${clubName}`,
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(doc);
}

export async function downloadAgreementDocx(deal: Deal, clubName: string, event: EventInfo | null, fileName?: string) {
  const blob = await buildAgreementDocx(deal, clubName, event);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safe = `${deal.sponsorName}-${clubName}`.replace(/\W+/g, "_").slice(0, 60);
  a.download = fileName ?? `${safe}_agreement.docx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
