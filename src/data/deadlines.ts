// USG "EDITED 26-27 Funding Application Deadlines" sheet, copied row by row.
// Each row: the Monday-Friday week the event falls in, and the Wednesday by which the
// application must be submitted (6 weeks = approved vendors, 9 weeks = travel or new vendors).
// null = USG lists no deadline (too early in the semester, a break, or no funding that week).

export type DeadlineRow = { weekStart: string; weekEnd: string; six: string | null; nine: string | null };

export const DEADLINES: DeadlineRow[] = [
  { weekStart: "2026-08-24", weekEnd: "2026-10-02", six: null, nine: null }, // first six weeks of fall: N/A
  { weekStart: "2026-10-05", weekEnd: "2026-10-09", six: "2026-08-26", nine: null },
  { weekStart: "2026-10-12", weekEnd: "2026-10-16", six: "2026-09-02", nine: null },
  { weekStart: "2026-10-19", weekEnd: "2026-10-23", six: "2026-09-09", nine: null },
  { weekStart: "2026-10-26", weekEnd: "2026-10-30", six: "2026-09-16", nine: "2026-08-26" },
  { weekStart: "2026-11-02", weekEnd: "2026-11-06", six: "2026-09-23", nine: "2026-09-02" },
  { weekStart: "2026-11-09", weekEnd: "2026-11-13", six: "2026-09-30", nine: "2026-09-09" },
  { weekStart: "2026-11-16", weekEnd: "2026-11-20", six: "2026-10-07", nine: "2026-09-16" },
  { weekStart: "2026-11-23", weekEnd: "2026-11-27", six: "2026-10-14", nine: "2026-09-23" },
  { weekStart: "2026-11-30", weekEnd: "2026-12-04", six: "2026-10-21", nine: "2026-09-30" },
  { weekStart: "2026-12-07", weekEnd: "2027-01-10", six: null, nine: null }, // winter break: no funding
  { weekStart: "2027-01-11", weekEnd: "2027-01-15", six: "2026-11-11", nine: "2026-11-11" },
  { weekStart: "2027-01-18", weekEnd: "2027-01-22", six: "2026-11-11", nine: "2026-11-11" },
  { weekStart: "2027-01-25", weekEnd: "2027-01-29", six: "2026-11-11", nine: "2026-11-11" },
  { weekStart: "2027-02-01", weekEnd: "2027-02-05", six: "2026-11-18", nine: "2026-11-11" },
  { weekStart: "2027-02-08", weekEnd: "2027-02-12", six: "2026-11-18", nine: "2026-11-11" },
  { weekStart: "2027-02-15", weekEnd: "2027-02-19", six: "2026-11-18", nine: "2026-11-11" },
  { weekStart: "2027-02-22", weekEnd: "2027-02-26", six: "2027-01-13", nine: "2026-11-18" },
  { weekStart: "2027-03-01", weekEnd: "2027-03-05", six: "2027-01-20", nine: "2026-11-18" },
  { weekStart: "2027-03-08", weekEnd: "2027-03-12", six: "2027-01-27", nine: "2026-11-18" },
  { weekStart: "2027-03-15", weekEnd: "2027-03-19", six: null, nine: null }, // spring break
  { weekStart: "2027-03-22", weekEnd: "2027-03-26", six: "2027-02-03", nine: "2027-01-20" },
  { weekStart: "2027-03-29", weekEnd: "2027-04-02", six: "2027-02-10", nine: "2027-01-27" },
  { weekStart: "2027-04-05", weekEnd: "2027-04-09", six: "2027-02-17", nine: "2027-02-03" },
  { weekStart: "2027-04-12", weekEnd: "2027-04-16", six: "2027-02-24", nine: "2027-02-10" },
  { weekStart: "2027-04-19", weekEnd: "2027-04-23", six: "2027-03-03", nine: "2027-02-17" },
  { weekStart: "2027-04-26", weekEnd: "2027-04-30", six: "2027-03-10", nine: "2027-02-24" },
];

export const DEADLINES_URL =
  "https://docs.google.com/spreadsheets/d/1M8FHvuw6f7ErnHnrQIR_ijjVmaKVXZp5-5fxrrJ7e68/edit";
