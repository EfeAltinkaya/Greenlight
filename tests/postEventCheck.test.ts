import { test } from "node:test";
import assert from "node:assert/strict";
import { postEventConsistency } from "../src/lib/postEventCheck";
import type { Application } from "../src/lib/types";

const app = (over: Partial<Application> = {}): Application => ({
  id: "a1", clubId: "c1", sample: true, createdAt: "", submittedAt: "2026-10-01", status: "post_event_due", history: [], aiComments: [],
  decision: { outcome: "approved", amount: 1000, reasonCode: "complete", email: "ok", sentAt: "2026-10-05" },
  sponsorPlan: null, uepa: "A12345", docs: {}, answers: { description: "", missionFit: "", otherSources: "N/A" },
  event: { title: "Build Night", type: "workshop", date: "2026-11-10", location: "RTH", onCampus: true, attendance: 80, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "", board: "professional", boardReason: "" },
  items: [
    { id: "i1", item: "Dinner", vendor: "Panda Catering", link: "https://x", justification: "", quantity: 80, unitPrice: 12.5, total: 1000, orderBy: "", category: "food", estimate: false, toSponsor: false },
  ],
  ...over,
});

test("post-event: flags missing photos, invoices, title mismatch, and amount drift", () => {
  const issues = postEventConsistency(app({
    postEvent: { photos: false, invoices: true, notes: "", reportTitle: "Wrong Title", lineInvoices: { i1: { amount: 800, fileName: "inv.pdf" } } },
  }), "2026-11-12");
  assert.ok(issues.some((x) => x.id === "photos-missing"));
  assert.ok(issues.some((x) => x.id === "title-mismatch"));
  assert.ok(issues.some((x) => x.id === "amount-i1"));
});

test("post-event: clean when Section 9 items match", () => {
  const issues = postEventConsistency(app({
    postEvent: { photos: true, invoices: true, notes: "", reportTitle: "Build Night", lineInvoices: { i1: { amount: 1000, fileName: "inv.pdf" } } },
  }), "2026-11-11");
  assert.equal(issues.filter((x) => x.level === "fail").length, 0);
});
