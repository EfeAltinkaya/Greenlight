// Greenlight Check PDF via @react-pdf/renderer. Built from engine checks only (no AI prose).
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { BOARDS } from "@/data/rules";
import { fmtDate, lookupDeadline, matchVendor, money, needsNineWeeks, nineWeekReason, requestItems, requestTotal, runChecks, vendorStatus } from "@/lib/engine";
import { requestIdOf } from "@/lib/requestId";
import { RULES_VERSION, greenlightVerdict } from "@/lib/verdict";
import type { Application, Check, Club } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#990000", marginBottom: 4 },
  slogan: { fontSize: 9, color: "#78716c", marginBottom: 16 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: "#990000" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 90, color: "#78716c" },
  value: { flex: 1 },
  check: { marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  mark: { width: 42, fontFamily: "Helvetica-Bold" },
  fail: { color: "#b91c1c" },
  warn: { color: "#a16207" },
  pass: { color: "#15803d" },
  note: { color: "#57534e" },
  quote: { fontSize: 8, color: "#57534e", marginTop: 2, fontStyle: "italic" },
  foot: { marginTop: 18, fontSize: 8, color: "#a8a29e" },
});

function markStyle(level: Check["level"]) {
  if (level === "fail") return styles.fail;
  if (level === "warn") return styles.warn;
  if (level === "pass") return styles.pass;
  return styles.note;
}

function CheckDoc({ app, club }: { app: Application; club: Club }) {
  const checks = runChecks(app, club);
  const v = greenlightVerdict(checks);
  const rid = requestIdOf(app);
  const needsNine = needsNineWeeks(app);
  const dl = lookupDeadline(app.event.date, needsNine, app.submittedAt ?? undefined);
  let deadline = "None";
  if (dl.kind === "ok") {
    deadline = `${fmtDate(dl.deadline, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} (${dl.uses === "nine" ? "9-week" : "6-week"})`;
    if (dl.uses === "nine") deadline += `: ${nineWeekReason(app) || "travel or unlisted vendor"}`;
  } else if (dl.kind === "blackout") deadline = `Blackout: ${dl.reason}`;
  else deadline = dl.reason;

  return (
    <Document title={`Greenlight Check ${rid}`} author="Greenlight">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>Greenlight</Text>
        <Text style={styles.slogan}>Your Highway to Capital · Greenlight Check</Text>
        <Text style={styles.h1}>{app.event.title}</Text>
        <View style={styles.row}><Text style={styles.label}>Request ID</Text><Text style={styles.value}>{rid}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Club</Text><Text style={styles.value}>{club.name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Board</Text><Text style={styles.value}>{BOARDS[app.event.board].name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Requested</Text><Text style={styles.value}>{money(requestTotal(app))}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Verdict</Text><Text style={styles.value}>{v.clubLabel}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Rules</Text><Text style={styles.value}>{RULES_VERSION}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Deadline</Text><Text style={styles.value}>{deadline}</Text></View>
        <View style={styles.row}>
          <Text style={styles.label}>Summary</Text>
          <Text style={styles.value}>{app.answers.description.trim() || app.event.description.trim() || "(none yet)"}</Text>
        </View>

        <Text style={styles.h2}>Each rule checked</Text>
        {[...checks]
          .sort((a, b) => "fwpi".indexOf(a.level[0]) - "fwpi".indexOf(b.level[0]))
          .map((c) => (
            <View key={c.id} style={styles.check} wrap={false}>
              <View style={styles.row}>
                <Text style={[styles.mark, markStyle(c.level)]}>{c.level.toUpperCase()}</Text>
                <Text style={styles.value}>{c.title}</Text>
              </View>
              <Text style={styles.quote}>{c.section}: "{c.quote}"</Text>
              {c.detail ? <Text style={styles.quote}>{c.detail}</Text> : null}
              {c.section.startsWith("Greenlight") ? <Text style={styles.quote}>Greenlight check, not a USG rule</Text> : null}
            </View>
          ))}

        <Text style={styles.h2}>Vendor status</Text>
        {requestItems(app).map((i) => {
          let status = "No vendor named";
          if (i.category === "food" && i.vendor) {
            const m = matchVendor(i.vendor, "food");
            status = m.kind === "listed" ? vendorStatus(m.vendor) : "Not on USG's Vendor List";
          } else if (i.vendor) {
            status = i.vendorConfirmed ? "Club confirmed approved" : "Needs confirmation";
          }
          return (
            <View key={i.id} style={styles.row}>
              <Text style={styles.value}>{i.item} · {i.vendor || "none"} · {status}</Text>
            </View>
          );
        })}

        <Text style={styles.foot}>Generated by Greenlight. The AI never decides money; this check is from the rules engine.</Text>
      </Page>
    </Document>
  );
}

/** Build a PDF blob for the Greenlight Check on an application. */
export async function buildCheckPdfBlob(app: Application, club: Club): Promise<Blob> {
  return pdf(<CheckDoc app={app} club={club} />).toBlob();
}

/** Trigger a browser download of the Greenlight Check PDF. */
export async function downloadCheckPdf(app: Application, club: Club, fileName?: string) {
  const blob = await buildCheckPdfBlob(app, club);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName ?? `${requestIdOf(app)}_GreenlightCheck.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
