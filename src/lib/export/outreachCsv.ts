import type { Outreach } from "@/lib/types";
import { SPONSORS } from "@/data/sponsors";

/** Outreach history as CSV for board handoff. */
export function exportOutreachCsv(rows: Outreach[]): string {
  const header = ["Company", "Status", "Package", "Amount", "Contact", "Contact info", "Follow-up", "Updated", "App ID"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const nameOf = (id: string) => SPONSORS.find((s) => s.id === id)?.name ?? id;
  const lines = rows.map((o) =>
    [
      nameOf(o.sponsorId),
      o.status,
      o.packageTitle ?? "",
      String(o.amount ?? ""),
      o.contactName ?? "",
      o.contactInfo ?? "",
      o.followUp ?? "",
      o.updatedAt ?? "",
      o.appId ?? "",
    ]
      .map((c) => escape(String(c)))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
