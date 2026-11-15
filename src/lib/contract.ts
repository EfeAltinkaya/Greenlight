// Standard in-kind sponsorship agreement, filled from the deal. Plain text so it can be read,
// signed in the app and exported. A template to start from, not legal advice.
import { fmtDate, money } from "./engine";
import type { Deal, EventInfo } from "./types";

export function contractText(deal: Deal, clubName: string, event: EventInfo | null) {
  const when = event?.date ? fmtDate(event.date, { month: "long", day: "numeric", year: "numeric" }) : "the date in the event listing";
  return `IN-KIND SPONSORSHIP AGREEMENT

Between ${deal.sponsorName} ("Sponsor") and ${clubName}, a recognized student organization at the University of Southern California ("Club").

1. Event. ${event?.title ?? "Club event"}, on ${when}${event?.location ? ` at ${event.location}` : ""}, expected attendance about ${event?.attendance ?? "N/A"} students.

2. Support. Sponsor will cover: ${deal.covers}, up to ${money(deal.amount)}. Sponsor pays the vendor directly or provides the items in kind. No money is paid to the Club or to any student.

3. Recognition. In return the Club will provide: ${deal.deliverables.length ? deal.deliverables.join("; ") : "recognition agreed in writing"}.

4. Approvals. This agreement is subject to approval of the in-kind donation by USC Campus Activities. The Club will not use USC names or marks beyond what the USC Graphic Identity Program allows, and Sponsor will not use USC marks without written approval.

5. Student data. The Club will not share student contact information with Sponsor unless each student opts in.

6. Payment flow. The Club sends Sponsor the vendor's invoice. Sponsor pays the vendor by the invoice due date and confirms payment to the Club.

7. After the event. Within 10 days the Club sends Sponsor a short recap with attendance and photos.

8. Cancellation. Either side may cancel in writing before the vendor is paid. Costs already incurred by the vendor at Sponsor's request remain Sponsor's responsibility.

Signed for the Club: ____________________   Date: __________
Signed for Sponsor: _____________________   Date: __________`;
}
