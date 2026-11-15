// USG-ish budget / ledger workbook via exceljs. Complements exportLedgerCsv in ledger.ts.
import ExcelJS from "exceljs";
import { ledgerSourceLabel } from "@/lib/ledger";
import type { LedgerLine } from "@/lib/types";

export type LedgerExcelRow = {
  item: string;
  vendor: string;
  qty: number | "";
  unit: number | "";
  total: number;
  category: string;
  source: string;
  event?: string;
  status?: string;
};

/** Map ledger lines into USG-ish budget columns. Qty/Unit are blank when unknown (ledger stores totals). */
export function ledgerToExcelRows(lines: LedgerLine[]): LedgerExcelRow[] {
  return lines.map((l) => ({
    event: l.eventTitle,
    item: l.item,
    vendor: l.vendor || "",
    qty: "",
    unit: "",
    total: l.amount,
    category: l.category,
    source: ledgerSourceLabel(l.source),
    status: l.status,
  }));
}

export async function buildLedgerWorkbook(lines: LedgerLine[], clubName: string): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Greenlight";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Ledger", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Event", key: "event", width: 28 },
    { header: "Item", key: "item", width: 32 },
    { header: "Vendor", key: "vendor", width: 22 },
    { header: "Qty", key: "qty", width: 8 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Total", key: "total", width: 12 },
    { header: "Category", key: "category", width: 14 },
    { header: "Source", key: "source", width: 20 },
    { header: "Status", key: "status", width: 14 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF990000" } };
  for (const r of ledgerToExcelRows(lines)) {
    sheet.addRow({
      event: r.event,
      item: r.item,
      vendor: r.vendor,
      qty: r.qty,
      unit: r.unit,
      total: r.total,
      category: r.category,
      source: r.source,
      status: r.status,
    });
  }
  sheet.getColumn("total").numFmt = '"$"#,##0.00';
  const note = wb.addWorksheet("About");
  note.getCell("A1").value = `Greenlight ledger export for ${clubName}`;
  note.getCell("A2").value = "One line, one source. USG and sponsors pay vendors directly; the club never holds the money.";
  note.getCell("A3").value = "Qty and Unit are blank when the ledger only stores a line total (from a USG request or deal).";
  return wb.xlsx.writeBuffer();
}

/** Browser download of the ledger as .xlsx. */
export async function downloadLedgerXlsx(lines: LedgerLine[], clubName: string, fileName?: string) {
  const buf = await buildLedgerWorkbook(lines, clubName);
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName ?? `${clubName.replace(/\s+/g, "-").toLowerCase()}-ledger.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
