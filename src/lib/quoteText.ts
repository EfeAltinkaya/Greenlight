// Offline PDF text extraction for vendor quotes (unpdf). Used when Claude is offline
// so officers still get a best-effort total from digital PDFs. Images still need the AI key.
import { extractText } from "unpdf";

export type OfflineQuoteParse = {
  vendor: string | null;
  total: number | null;
  lines: { description: string; amount: number }[];
  text: string;
};

/** Pull plain text from a PDF buffer. */
export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const result = await extractText(bytes, { mergePages: true });
  const text = result.text;
  if (Array.isArray(text)) return text.join("\n").trim();
  return String(text ?? "").trim();
}

/** Heuristic parse of a quote PDF's text: last money-like "total" and optional vendor line. */
export function parseQuoteText(text: string): OfflineQuoteParse {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const moneyRe = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g;
  let total: number | null = null;
  for (const line of lines) {
    if (/grand\s*total|amount\s*due|total\s*due|\btotal\b/i.test(line)) {
      const nums = [...line.matchAll(moneyRe)].map((m) => Number(m[1].replace(/,/g, "")));
      const last = nums.filter((n) => Number.isFinite(n)).pop();
      if (last != null) total = last;
    }
  }
  if (total == null) {
    const all = [...text.matchAll(moneyRe)].map((m) => Number(m[1].replace(/,/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
    if (all.length) total = Math.max(...all);
  }
  let vendor: string | null = null;
  for (const line of lines.slice(0, 12)) {
    if (/invoice|quote|estimate|bill\s*to|ship\s*to|date|page\s*\d/i.test(line)) continue;
    if (line.length >= 3 && line.length <= 80 && /[A-Za-z]/.test(line)) {
      vendor = line.replace(/^vendor\s*[:\-]\s*/i, "").slice(0, 80);
      break;
    }
  }
  return { vendor, total, lines: [], text };
}

export async function readQuotePdfOffline(data: ArrayBuffer | Uint8Array): Promise<OfflineQuoteParse | null> {
  try {
    const text = await extractPdfText(data);
    if (!text) return null;
    return parseQuoteText(text);
  } catch {
    return null;
  }
}
