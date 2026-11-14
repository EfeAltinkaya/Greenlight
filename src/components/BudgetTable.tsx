"use client";
import { useRef, useState } from "react";
import { ITEM_CATEGORIES, INELIGIBLE } from "@/data/rules";
import { money } from "@/lib/engine";
import type { Check, CheckLevel, LineItem } from "@/lib/types";
import { Spinner } from "./ui";

const order: CheckLevel[] = ["fail", "warn", "pass", "info"];
export function lineLevel(checks: Check[], id: string): CheckLevel | "off" {
  const mine = checks.filter((c) => c.itemId === id);
  for (const l of order) if (mine.some((c) => c.level === l)) return l;
  return "off";
}

const catLabel = (c: string) => (INELIGIBLE[c] ? INELIGIBLE[c].label + " (not fundable)" : c.replace(/_/g, " "));

type Props = {
  items: LineItem[];
  checks: Check[];
  editable?: boolean;
  onChange?: (items: LineItem[]) => void;
  onQuote?: (id: string, file: File) => Promise<void>;
};

export function BudgetTable({ items, checks, editable, onChange, onQuote }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  const set = (id: string, patch: Partial<LineItem>) =>
    onChange?.(
      items.map((i) => {
        if (i.id !== id) return i;
        const n = { ...i, ...patch };
        if ("quantity" in patch || "unitPrice" in patch) n.total = Math.round(n.quantity * n.unitPrice * 100) / 100;
        if ("total" in patch && n.quantity > 0) n.unitPrice = Math.round((n.total / n.quantity) * 100) / 100;
        if ("total" in patch || "unitPrice" in patch) n.estimate = false;
        return n;
      }),
    );
  const usg = items.filter((i) => !i.toSponsor);
  const sum = usg.reduce((s, i) => s + i.total, 0);
  const sponsor = items.filter((i) => i.toSponsor).reduce((s, i) => s + i.total, 0);

  return (
    <div className="tablewrap sheet">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          const id = target.current;
          e.target.value = "";
          if (!f || !id || !onQuote) return;
          setBusy(id);
          try { await onQuote(id, f); } finally { setBusy(null); }
        }}
      />
      <table className="ledger">
        <thead>
          <tr>
            <th className="lamp-cell" aria-label="Signal" />
            <th>Item</th>
            <th>Vendor</th>
            <th>Justification</th>
            <th className="num">Qty</th>
            <th className="num">Unit</th>
            <th className="num">Total (incl. tax)</th>
            <th>Order by</th>
            {editable && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const lvl = i.toSponsor ? "off" : lineLevel(checks, i.id);
            return (
              <tr key={i.id} className={i.toSponsor ? "moved" : ""}>
                <td className="lamp-cell"><span className={"lamp " + lvl} style={{ marginTop: 5 }} /></td>
                <td style={{ minWidth: 170 }}>
                  {editable ? (
                    <input className="input" value={i.item} onChange={(e) => set(i.id, { item: e.target.value })} aria-label="Item" />
                  ) : (
                    <strong>{i.item}</strong>
                  )}
                  <div className="row" style={{ marginTop: 6, gap: 6 }}>
                    {editable ? (
                      <select className="select" style={{ padding: "3px 6px", fontSize: 12, width: "auto" }} value={i.category} onChange={(e) => set(i.id, { category: e.target.value as LineItem["category"] })} aria-label="Category">
                        {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                      </select>
                    ) : (
                      <span className="chip">{catLabel(i.category)}</span>
                    )}
                    {i.toSponsor && <span className="chip info">Sponsor ask</span>}
                    {i.estimate && <span className="chip warn">Estimate</span>}
                    {i.quote && <span className={"chip " + (i.quote.matches ? "pass" : "fail")} title={i.quote.note}>Quote {i.quote.matches ? "matches" : "differs"}</span>}
                  </div>
                </td>
                <td style={{ minWidth: 140 }}>
                  {editable ? <input className="input" value={i.vendor} onChange={(e) => set(i.id, { vendor: e.target.value })} aria-label="Vendor" /> : i.vendor || <span className="faint">None</span>}
                </td>
                <td style={{ minWidth: 200 }}>
                  {editable ? <textarea className="textarea" style={{ minHeight: 40 }} rows={2} value={i.justification} onChange={(e) => set(i.id, { justification: e.target.value })} aria-label="Justification" /> : <span className="small muted">{i.justification}</span>}
                </td>
                <td className="num">
                  {editable ? <input className="input mono" style={{ width: 64, textAlign: "right" }} type="number" min={0} value={i.quantity} onChange={(e) => set(i.id, { quantity: Number(e.target.value) })} aria-label="Quantity" /> : i.quantity}
                </td>
                <td className="num">
                  {editable ? <input className="input mono" style={{ width: 84, textAlign: "right" }} type="number" min={0} step="0.01" value={i.unitPrice} onChange={(e) => set(i.id, { unitPrice: Number(e.target.value) })} aria-label="Unit price" /> : money(i.unitPrice)}
                </td>
                <td className="num">
                  {editable ? <input className="input mono" style={{ width: 96, textAlign: "right" }} type="number" min={0} step="0.01" value={i.total} onChange={(e) => set(i.id, { total: Number(e.target.value) })} aria-label="Total" /> : <span className="money">{money(i.total)}</span>}
                </td>
                <td>
                  {editable ? <input className="input mono" style={{ width: 140 }} type="date" value={i.orderBy} onChange={(e) => set(i.id, { orderBy: e.target.value })} aria-label="Order by" /> : <span className="mono small">{i.orderBy || "—"}</span>}
                </td>
                {editable && (
                  <td>
                    <div className="stack-sm" style={{ gap: 4 }}>
                      {onQuote && (
                        <button className="btn sm" disabled={busy === i.id} onClick={() => { target.current = i.id; fileRef.current?.click(); }}>
                          {busy === i.id ? <Spinner /> : null} {i.quote ? "Replace quote" : "Attach quote"}
                        </button>
                      )}
                      <button className="btn sm ghost" onClick={() => set(i.id, { toSponsor: !i.toSponsor })}>{i.toSponsor ? "Back to USG" : "To sponsor"}</button>
                      <button className="btn sm ghost stop" onClick={() => onChange?.(items.filter((x) => x.id !== i.id))}>Remove</button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td colSpan={5}>Requested from USG</td>
            <td className="num"><span className="money">{money(sum)}</span></td>
            <td colSpan={editable ? 2 : 1}>{sponsor > 0 && <span className="small muted">+ {money(sponsor)} for sponsors</span>}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
