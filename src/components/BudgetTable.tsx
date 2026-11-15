"use client";
import { useRef, useState } from "react";
import { ArrowLeftRight, FileUp, HandCoins, Trash2, Undo2 } from "lucide-react";
import { ITEM_CATEGORIES, INELIGIBLE } from "@/data/rules";
import { cateringSuggestions, deadlineSwitchHint, fmtDate, listedVendorsOfType, matchVendor, money } from "@/lib/engine";
import type { Check, CheckLevel, LineItem } from "@/lib/types";
import { LineModelHints } from "./LineModelHints";
import { LEVEL, Spinner } from "./ui";

const order: CheckLevel[] = ["fail", "warn", "pass", "info"];
export function lineLevel(checks: Check[], id: string): CheckLevel | "off" {
  const mine = checks.filter((c) => c.itemId === id);
  for (const l of order) if (mine.some((c) => c.level === l)) return l;
  return "off";
}
const catLabel = (c: string) => (INELIGIBLE[c] ? `${INELIGIBLE[c].label} (not fundable)` : c.replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase()));
const short = (n: string) => n.replace(/\s*[\[(].*$/, "");

type Props = {
  items: LineItem[];
  checks: Check[];
  editable?: boolean;
  onChange?: (items: LineItem[]) => void;
  onQuote?: (id: string, file: File) => Promise<void>;
  /** Event date so a vendor switch can show the 9-week vs 6-week deadline change. */
  eventDate?: string;
};

export function BudgetTable({ items, checks, editable, onChange, onQuote, eventDate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  const caterers = cateringSuggestions(8);
  const switchHint = eventDate ? deadlineSwitchHint(eventDate) : null;

  const set = (id: string, patch: Partial<LineItem>) =>
    onChange?.(
      items.map((i) => {
        if (i.id !== id) return i;
        const n = { ...i, ...patch };
        if ("quantity" in patch || "unitPrice" in patch) n.total = Math.round(n.quantity * n.unitPrice * 100) / 100;
        if ("total" in patch && n.quantity > 0) n.unitPrice = Math.round((n.total / n.quantity) * 100) / 100;
        if ("total" in patch || "unitPrice" in patch) n.estimate = false;
        if ("vendor" in patch) n.quote = undefined;
        return n;
      }),
    );
  // Swapping the caterer also updates the line name and any sponsor line split off the same order.
  const swapVendor = (line: LineItem, to: string) => {
    const from = line.vendor;
    onChange?.(items.map((x) => (x.id === line.id || (x.toSponsor && x.category === "food" && from && x.vendor === from) ? { ...x, vendor: to, item: from ? x.item.replace(from, to) : x.item, quote: undefined } : x)));
  };
  const usg = items.filter((i) => !i.toSponsor);
  const sum = usg.reduce((s, i) => s + i.total, 0);
  const sponsor = items.filter((i) => i.toSponsor).reduce((s, i) => s + i.total, 0);

  const picker = (
    <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden
      onChange={async (e) => {
        const f = e.target.files?.[0];
        const id = target.current;
        e.target.value = "";
        if (!f || !id || !onQuote) return;
        setBusy(id);
        try { await onQuote(id, f); } finally { setBusy(null); }
      }}
    />
  );

  // Editing: one card per line, so every field has room at any width.
  if (editable) {
    return (
      <div className="stack-sm">
        {picker}
        {items.map((i) => {
          const lvl = i.toSponsor ? "off" : lineLevel(checks, i.id);
          const vm = i.category === "food" && !i.toSponsor ? matchVendor(i.vendor, "food") : null;
          return (
            <div key={i.id} className="card" style={{ padding: 18, opacity: i.toSponsor ? 0.75 : 1, borderLeft: `4px solid ${lvl === "fail" ? "var(--fix)" : lvl === "warn" ? "#d99a00" : lvl === "off" ? "var(--gold)" : "var(--clear)"}` }}>
              <div className="stack-sm" style={{ gap: 12 }}>
                <div className="row" style={{ flexWrap: "nowrap", gap: 12 }}>
                  <input className="input" style={{ fontWeight: 600, fontSize: 15 }} value={i.item} onChange={(e) => set(i.id, { item: e.target.value })} aria-label="Item" />
                  <label className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <span className="small faint">$</span>
                    <input className="input num" style={{ width: 120, fontWeight: 600 }} type="number" min={0} step="0.01" value={i.total} onChange={(e) => set(i.id, { total: Number(e.target.value) })} aria-label="Total including tax" />
                  </label>
                </div>
                <div className="grid line-grid">
                  <label className="field"><span className="lbl">Vendor</span><input className="input" value={i.vendor} onChange={(e) => set(i.id, { vendor: e.target.value, vendorConfirmed: false })} placeholder="Vendor" /></label>
                  <label className="field"><span className="lbl">Quantity</span><input className="input num" type="number" min={0} value={i.quantity} onChange={(e) => set(i.id, { quantity: Number(e.target.value) })} /></label>
                  <label className="field"><span className="lbl">Unit price</span><input className="input num" type="number" min={0} step="0.01" value={i.unitPrice} onChange={(e) => set(i.id, { unitPrice: Number(e.target.value) })} /></label>
                  <label className="field"><span className="lbl">Type</span>
                    <select className="select" value={i.category} onChange={(e) => set(i.id, { category: e.target.value as LineItem["category"] })}>
                      {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </select>
                  </label>
                </div>
                {!i.toSponsor && (
                  <LineModelHints
                    itemId={i.id}
                    itemText={i.item}
                    vendorText={i.vendor}
                    category={i.category}
                    onCategory={(c) => set(i.id, { category: c })}
                    onVendor={(name) => set(i.id, { vendor: name, vendorConfirmed: false })}
                  />
                )}
                {vm?.kind === "not_listed" && (
                  <div className="inset stack-sm" style={{ padding: "10px 12px", gap: 8 }}>
                    <span className="small" style={{ color: "var(--fail)", fontWeight: 600 }}>{i.vendor || "This vendor"} is not on USG&apos;s Vendor List.</span>
                    {switchHint && (
                      <span className="tiny">
                        Switching to a listed vendor moves the deadline from {fmtDate(switchHint.from)}{switchHint.fromPassed ? " (passed)" : ""} to {fmtDate(switchHint.to)}{switchHint.toPassed ? " (passed)" : ""}
                        {switchHint.gainDays > 0 ? ` (${switchHint.gainDays} more days).` : "."}
                      </span>
                    )}
                    <select className="select" style={{ width: "auto", padding: "5px 10px", fontSize: 13 }} value="" onChange={(e) => e.target.value && swapVendor(i, e.target.value)} aria-label="Find a listed vendor of the same type">
                      <option value="">Find a listed vendor of the same type</option>
                      {listedVendorsOfType(i.vendor || i.item, 8).map((v) => <option key={v.name} value={short(v.name)}>{short(v.name)}{v.cuisine ? ` · ${v.cuisine}` : ""}</option>)}
                    </select>
                  </div>
                )}
                {!i.toSponsor && (
                  <textarea className="textarea" style={{ minHeight: 0, fontSize: 13.5 }} rows={2} placeholder="Why the event needs this (goes on USG's budget sheet)" value={i.justification} onChange={(e) => set(i.id, { justification: e.target.value })} aria-label="Justification" />
                )}
                <div className="between">
                  <div className="row" style={{ gap: 6 }}>
                    {i.toSponsor && <span className="pill pill-gold"><HandCoins />Sponsor ask</span>}
                    {i.estimate && <span className="pill pill-check">Price is an estimate</span>}
                    {i.quote && <span className={"pill " + (i.quote.matches ? "pill-clear" : "pill-fix")} title={i.quote.note}>Quote {i.quote.matches ? `matches · ${i.quote.fileName}` : "differs"}</span>}
                    {INELIGIBLE[i.category] && !i.toSponsor && <span className="pill pill-fix">Not fundable</span>}
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    {onQuote && !i.toSponsor && (
                      <button className="btn btn-sm" disabled={busy === i.id} onClick={() => { target.current = i.id; fileRef.current?.click(); }}>
                        {busy === i.id ? <><Spinner />Reading quote</> : <><FileUp />{i.quote ? "Replace quote" : "Attach quote"}</>}
                      </button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => set(i.id, { toSponsor: !i.toSponsor })}>{i.toSponsor ? <><Undo2 />Back to USG</> : <><ArrowLeftRight />To sponsor</>}</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: "var(--fix)" }} onClick={() => onChange?.(items.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.item}`}><Trash2 /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="between card" style={{ padding: "16px 18px" }}>
          <span><strong>Requested from USG</strong>{sponsor > 0 && <span className="small faint"> · {money(sponsor)} for sponsors</span>}</span>
          <span className="big-num" style={{ fontSize: 24 }}>{money(sum)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          const id = target.current;
          e.target.value = "";
          if (!f || !id || !onQuote) return;
          setBusy(id);
          try { await onQuote(id, f); } finally { setBusy(null); }
        }}
      />
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 28 }} aria-label="Status" />
            <th>Item</th>
            <th>Vendor</th>
            <th className="r">Qty</th>
            <th className="r">Unit</th>
            <th className="r">Total</th>
            {editable && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const lvl = i.toSponsor ? "off" : lineLevel(checks, i.id);
            const vm = i.category === "food" && !i.toSponsor ? matchVendor(i.vendor, "food") : null;
            return (
              <tr key={i.id} className={i.toSponsor ? "moved" : ""}>
                <td style={{ paddingRight: 0 }}>
                  <span className={"dot " + lvl} title={lvl === "off" ? "Not part of the USG request" : LEVEL[lvl].word} />
                </td>
                <td style={{ minWidth: 220 }}>
                  <div className="stack-xs" style={{ gap: 6 }}>
                    {editable ? <input id={`item-${i.id}`} className="input" value={i.item} onChange={(e) => set(i.id, { item: e.target.value })} aria-label="Item" /> : <strong>{i.item}</strong>}
                    {editable && !i.toSponsor ? (
                      <textarea className="textarea" style={{ minHeight: 0, fontSize: 13 }} rows={2} placeholder="Why the event needs this (goes on USG's sheet)" value={i.justification} onChange={(e) => set(i.id, { justification: e.target.value })} aria-label="Justification" />
                    ) : i.justification ? <span className="small muted">{i.justification}</span> : null}
                    <div className="row" style={{ gap: 6 }}>
                      {editable ? (
                        <select className="select" style={{ width: "auto", padding: "3px 8px", fontSize: 12.5 }} value={i.category} onChange={(e) => set(i.id, { category: e.target.value as LineItem["category"] })} aria-label="Category">
                          {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                        </select>
                      ) : <span className="pill">{catLabel(i.category)}</span>}
                      {i.toSponsor && <span className="pill pill-gold"><HandCoins />Sponsor ask</span>}
                      {i.estimate && <span className="pill pill-check">Estimate</span>}
                      {i.quote && <span className={"pill " + (i.quote.matches ? "pill-clear" : "pill-fix")} title={i.quote.note}>Quote {i.quote.matches ? "matches" : "differs"}</span>}
                    </div>
                  </div>
                </td>
                <td style={{ minWidth: 170 }}>
                  <div className="stack-xs" style={{ gap: 6 }}>
                    {editable ? <input className="input" value={i.vendor} onChange={(e) => set(i.id, { vendor: e.target.value, vendorConfirmed: false })} aria-label="Vendor" placeholder="Vendor" /> : <span>{i.vendor || <span className="faint">None</span>}</span>}
                    {editable && vm?.kind === "not_listed" && (
                      <label className="stack-xs">
                        <span className="tiny" style={{ color: "var(--fix)", fontWeight: 600 }}>Not on USG&apos;s Vendor List</span>
                        <select className="select" style={{ padding: "4px 8px", fontSize: 12.5 }} value="" onChange={(e) => e.target.value && swapVendor(i, e.target.value)} aria-label="Find a listed vendor of the same type">
                          <option value="">Find a listed vendor of the same type</option>
                          {listedVendorsOfType(i.vendor || i.item, 8).map((v) => <option key={v.name} value={short(v.name)}>{short(v.name)}{v.cuisine ? ` · ${v.cuisine}` : ""}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                </td>
                <td className="r">{editable ? <input className="input num" style={{ width: 70 }} type="number" min={0} value={i.quantity} onChange={(e) => set(i.id, { quantity: Number(e.target.value) })} aria-label={`Quantity for ${i.item}`} /> : i.quantity}</td>
                <td className="r">{editable ? <input className="input num" style={{ width: 90 }} type="number" min={0} step="0.01" value={i.unitPrice} onChange={(e) => set(i.id, { unitPrice: Number(e.target.value) })} aria-label="Unit price" /> : money(i.unitPrice)}</td>
                <td className="r">{editable ? <input className="input num" style={{ width: 104 }} type="number" min={0} step="0.01" value={i.total} onChange={(e) => set(i.id, { total: Number(e.target.value) })} aria-label="Total including tax" /> : <strong>{money(i.total)}</strong>}</td>
                {editable && (
                  <td>
                    <div className="stack-xs" style={{ gap: 4, justifyItems: "start" }}>
                      {onQuote && !i.toSponsor && (
                        <button className="btn btn-sm" disabled={busy === i.id} onClick={() => { target.current = i.id; fileRef.current?.click(); }}>
                          {busy === i.id ? <><Spinner />Reading</> : <><FileUp />{i.quote ? "Replace quote" : "Attach quote"}</>}
                        </button>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => set(i.id, { toSponsor: !i.toSponsor })}>{i.toSponsor ? <><Undo2 />Back to USG</> : <><ArrowLeftRight />To sponsor</>}</button>
                      <button className="btn btn-sm btn-ghost" style={{ color: "var(--fix)" }} onClick={() => onChange?.(items.filter((x) => x.id !== i.id))}><Trash2 />Remove</button>
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
            <td colSpan={4}>Requested from USG{sponsor > 0 && <span className="small faint" style={{ fontWeight: 400 }}> · {money(sponsor)} for sponsors</span>}</td>
            <td className="r" style={{ fontSize: 16 }}>{money(sum)}</td>
            {editable && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
