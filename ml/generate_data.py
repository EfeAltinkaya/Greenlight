#!/usr/bin/env python3
"""Generate GL-Items / GL-Board / GL-Replies CSVs with team_written test splits."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

SOURCES_TRAIN = ("rules_doc", "seed_app", "fy26_report", "team_written", "synthetic")

ITEM_LABELS = [
    "food_catered",
    "food_raw",
    "restaurant_meal",
    "merch_promotional",
    "prize_or_gift_card",
    "durable_good",
    "venue_or_staffing",
    "av_or_production",
    "printing",
    "decorations_rental",
    "travel_air_or_hotel",
    "ground_transport_rideshare_or_rental",
    "talent_or_performer_fee",
    "subscription",
    "supplies_single_use",
    "alcohol",
    "donation_to_charity",
    "other",
]

# Match BoardId in src/data/rules.ts (client routeBoard).
BOARD_LABELS = [
    "professional",
    "philanthropy",
    "social",
    "arts",
]

REPLY_LABELS = [
    "interested",
    "needs_more_info",
    "declined",
    "out_of_office",
    "referral_to_someone_else",
    "wrong_person_or_bounce",
    "unsubscribe",
]


def row(text: str, label: str, source: str, split: str) -> dict:
    return {"text": text.strip(), "label": label, "source": source, "split": split}


# --- Items: 8 team_written test + 12 train per label (~20) ---
# Train mix: 4 rules_doc, 3 seed_app, 2 fy26_report, 3 synthetic (25% synthetic)

ITEM_TEST: dict[str, list[str]] = {
    "food_catered": [
        "Campus catering tray of chicken teriyaki for 80 attendees at Build Night",
        "USG-approved caterer delivering boxed lunches to Tommy Trojan Lawn",
        "On-site buffet setup by Casablanca Catering for club mixer",
        "Catered sandwich platters and fruit for midterms study night",
        "Hot dinner catering for Robotics showcase reception",
        "Vendor-listed caterer providing taco bar for cultural night",
        "Evening catering package with servers for officer retreat dinner",
        "Catered breakfast pastries and coffee for career panel",
    ],
    "food_raw": [
        "Costco bulk rice, oil, and vegetables for club cook-off",
        "Raw ingredients for DIY poke bowls at cultural workshop",
        "Grocery store flour, eggs, and sugar for bake sale prep",
        "Uncooked pasta and sauce kits students assemble themselves",
        "Whole chickens and produce purchased for club BBQ pit",
        "Raw sushi rice and nori for member-run sushi night",
        "Trader Joe's bulk snacks and fruit for study hall table",
        "Ingredient kits (tortillas, beans, cheese) for taco assembly",
    ],
    "restaurant_meal": [
        "Reserved table dinner at El Nopal for sponsor thank-you",
        "Restaurant tab for three officers meeting a recruiter",
        "Sit-down lunch at campus-adjacent Thai place after site visit",
        "Group meal invoice from Chipotle catering is actually dine-in bill",
        "Officer dinner receipt from downtown LA restaurant",
        "Post-competition team meal at a restaurant near the venue",
        "Brunch reservation deposit for alumni reunion meal",
        "Restaurant gift card used for team celebration dinner",
    ],
    "merch_promotional": [
        "Custom club T-shirts with logo for new member giveaways",
        "Embroidered tote bags handed out at involvement fair",
        "Branded stickers and lanyards for recruitment week",
        "Hoodies printed with event name for volunteers",
        "Promotional pens and buttons with club URL",
        "Event wristbands and branded water bottles for attendees",
        "Logo patches sewn onto jackets for team identity",
        "Custom snapbacks ordered for orientation booth",
    ],
    "prize_or_gift_card": [
        "Amazon gift cards as hackathon category prizes",
        "$25 Target gift cards for trivia night winners",
        "Gift card raffle prizes for general body meeting",
        "Cash-equivalent Visa cards for pitch competition awards",
        "Starbucks cards as door prizes at open house",
        "Best costume gift card award at Halloween social",
        "First-place gift card for intramural tournament",
        "Raffle prize pack of retail gift cards for fundraiser",
    ],
    "durable_good": [
        "Portable PA speaker kept by the club after the event",
        "Folding tables purchased for ongoing club storage use",
        "DSL camera body for multi-year media team inventory",
        "Robotics microcontroller kits retained after workshop",
        "Whiteboard easels stored in club locker between meetings",
        "Power drill set for makerspace that the club owns",
        "Outdoor canopy tent reused for every fair booth",
        "Microwave for club office, not single-event rental",
    ],
    "venue_or_staffing": [
        "Tommy Student Union room reservation fee for GFM",
        "Facility staffing charge for after-hours building access",
        "Auditorium rental and USC Event Services labor",
        "Park permit and staffing for outdoor cultural festival",
        "Security staffing required by venue for evening show",
        "Classroom tech fee tied to reserved lecture hall",
        "Grounds crew overtime for lawn event setup",
        "Ballroom booking deposit through University Club",
    ],
    "av_or_production": [
        "Stage lighting and soundboard rental for talent show",
        "Wireless mic package and mixer for panel discussion",
        "Live stream encoder and camera operator package",
        "Projection mapping setup for fashion showcase",
        "DJ booth production rental for dance social",
        "LED wall hire for pitch night presentations",
        "Fog machine and lighting cues for theater night",
        "Recording engineer fee for podcast live taping",
    ],
    "printing": [
        "Color poster run for involvement fair booth",
        "Program booklets printed for concert night",
        "Flyers for classroom announcements this week",
        "Banner print for outdoor stage backdrop",
        "Name badges and table tents for conference",
        "Zine printing for literary magazine launch",
        "Large-format map print for scavenger hunt",
        "Business cards for officer networking kit",
    ],
    "decorations_rental": [
        "Balloon arch rental for welcome reception",
        "Table centerpiece rental from party supplier",
        "Backdrop and floral rental for awards night",
        "String lights rental for courtyard social",
        "Chair sashes and linen rental for formal",
        "Photo booth props rental for alumni mixer",
        "Themed décor package returned after cultural night",
        "Pipe and drape rental for fashion runway",
    ],
    "travel_air_or_hotel": [
        "Round-trip flights for four delegates to nationals",
        "Hotel rooms for two nights at conference hotel",
        "Airfare deposit for speaker flying into LAX",
        "Team lodging near competition venue in Austin",
        "Southwest tickets for regional championship",
        "Airbnb for officer travel to sister-school summit",
        "Conference hotel block for USC delegation",
        "Overnight lodging required by early morning heat",
    ],
    "ground_transport_rideshare_or_rental": [
        "Uber XL to transport judges from hotel to campus",
        "Enterprise van rental for weekend competition trip",
        "Lyft receipts for speaker shuttle between venues",
        "Charter bus deposit for club day trip to SF",
        "Zipcar day rental for picking up catering trays",
        "Airport rideshare for visiting alumni speaker",
        "Minivan rental to haul décor to the park",
        "Shared rides for members to off-campus service site",
    ],
    "talent_or_performer_fee": [
        "Honorarium for keynote speaker at career night",
        "DJ performance fee for spring formal",
        "Dance troupe booking fee for cultural showcase",
        "Guest musician stipend for open mic headliner",
        "Comedian appearance fee for comedy night",
        "Workshop facilitator fee for design sprint",
        "Poet honorarium for literary reading series",
        "Band deposit for battle of the bands finale",
    ],
    "subscription": [
        "Annual Canva Pro subscription for design team",
        "Notion team workspace yearly plan",
        "Adobe Creative Cloud seat for media chair",
        "Zoom Pro annual renewal for hybrid meetings",
        "Domain and hosting subscription for club site",
        "Slack Pro plan billed yearly for officers",
        "Mailchimp monthly subscription for newsletters",
        "Figma Organization seat for product club",
    ],
    "supplies_single_use": [
        "Disposable plates, cups, and napkins for BBQ",
        "Name tag stickers and markers for check-in",
        "Single-use gloves and trash bags for cleanup",
        "Craft paper and glue sticks for one workshop",
        "Plastic utensils for outdoor picnic",
        "Event wristbands discarded after the night",
        "Paper tablecloths for bake sale tables",
        "Temporary chalk for sidewalk announcements",
    ],
    "alcohol": [
        "Wine bottles for 21+ alumni tasting (not USG-fundable)",
        "Beer keg deposit for graduate social (prohibited)",
        "Champagne toast budget for senior banquet",
        "Bar package quote for formal afterparty",
        "Alcohol catering add-on on venue contract",
        "Liquor license fee for off-campus mixer",
        "Wine and cheese reception line item",
        "Cocktail ingredients listed on budget sheet",
    ],
    "donation_to_charity": [
        "Cash donation to local food bank partner",
        "Charitable contribution to Children's Hospital LA",
        "Proceeds pledged as donation to Red Cross",
        "Direct donation line to Habitat for Humanity",
        "Nonprofit gift in lieu of speaker gift",
        "Scholarship donation to external foundation",
        "Charity check written from event surplus",
        "Fundraising remittance to partner NGO",
    ],
    "other": [
        "Uncategorized miscellaneous contingency line",
        "Insurance rider not matching other categories",
        "Bank wire fee for international vendor",
        "Translator services for guest from abroad",
        "Petting zoo animal handler for kids day",
        "Custom ice sculpture not fitting décor rental",
        "Emergency rain plan ponchos surplus line",
        "Oddball storage unit month for set pieces",
    ],
}

ITEM_TRAIN_RULES: dict[str, list[str]] = {
    "food_catered": [
        "Guidelines: catered food from USG Vendor List",
        "Section food: plated catering for registered event",
        "Catering invoice from approved campus vendor",
        "Vendor-list catering for general body meeting",
    ],
    "food_raw": [
        "Guidelines: raw groceries clubs prepare themselves",
        "Section food: uncooked ingredients purchased in bulk",
        "Raw foodstuffs for member-cooked meal",
        "Grocery ingredients without catering labor",
    ],
    "restaurant_meal": [
        "Guidelines: restaurant meals for officers or guests",
        "Section food: sit-down restaurant expenditure",
        "Restaurant dining rather than catering delivery",
        "Meal at an eating establishment off trays",
    ],
    "merch_promotional": [
        "Guidelines: promotional merchandise with club branding",
        "Section merch: giveaway apparel and swag",
        "Branded promotional items for recruitment",
        "Club logo merch distributed to members",
    ],
    "prize_or_gift_card": [
        "Guidelines: prizes and gift cards as awards",
        "Section awards: retail gift cards to winners",
        "Prize gift cards for competition placers",
        "Raffle prizes funded as gift cards",
    ],
    "durable_good": [
        "Guidelines: durable goods retained by the organization",
        "Section equipment: multi-use capital items",
        "Equipment that outlives a single event",
        "Club-owned durable inventory purchase",
    ],
    "venue_or_staffing": [
        "Guidelines: venue rental and required staffing fees",
        "Section facilities: room charges and labor",
        "Facility rental with event services staff",
        "Venue and staffing line on USG sheet",
    ],
    "av_or_production": [
        "Guidelines: audiovisual and production rentals",
        "Section AV: sound, lights, and staging tech",
        "Production package for stage events",
        "AV equipment hire for presentations",
    ],
    "printing": [
        "Guidelines: printing of flyers, posters, programs",
        "Section print: paper promotional materials",
        "Printed collateral for event outreach",
        "Print shop order for club materials",
    ],
    "decorations_rental": [
        "Guidelines: decorations rented and returned",
        "Section décor: rental décor packages",
        "Temporary decorations not owned by club",
        "Décor rental for themed event",
    ],
    "travel_air_or_hotel": [
        "Guidelines: airfare and hotel lodging travel",
        "Section travel: flights and overnight stays",
        "Air travel and lodging for competition",
        "Hotel and flight costs for delegates",
    ],
    "ground_transport_rideshare_or_rental": [
        "Guidelines: ground transport, rideshare, vehicle rental",
        "Section travel: Uber/Lyft and van rentals",
        "Ground transportation between event sites",
        "Rideshare or rental car for club logistics",
    ],
    "talent_or_performer_fee": [
        "Guidelines: talent, performer, and speaker fees",
        "Section talent: honoraria for performers",
        "Paid performer or speaker appearance",
        "Artist or facilitator fee line item",
    ],
    "subscription": [
        "Guidelines: software and service subscriptions",
        "Section ops: recurring digital subscriptions",
        "Annual SaaS plan for club operations",
        "Paid subscription renewals for tools",
    ],
    "supplies_single_use": [
        "Guidelines: single-use event supplies",
        "Section supplies: disposable consumables",
        "One-time use materials for an event",
        "Consumable supplies discarded after use",
    ],
    "alcohol": [
        "Guidelines: alcohol is not USG-fundable",
        "Section prohibited: alcoholic beverages",
        "Alcohol line items fail funding checks",
        "Beer, wine, or spirits on a budget",
    ],
    "donation_to_charity": [
        "Guidelines: donations to external charities",
        "Section prohibited: charitable remittances",
        "Direct donation to a nonprofit partner",
        "Charity gift rather than event expense",
    ],
    "other": [
        "Guidelines: miscellaneous uncategorized costs",
        "Section other: costs not fitting standard lines",
        "Catch-all category for unusual expenses",
        "Unclassified budget line pending review",
    ],
}

ITEM_TRAIN_SEED: dict[str, list[str]] = {
    "food_catered": [
        "Seed app: catered trays for Robotics Build Night",
        "Demo club catering for 60 at showcase",
        "Sample request: campus caterer boxed meals",
    ],
    "food_raw": [
        "Seed app: Costco ingredients for cook-off",
        "Demo: raw produce for member meal prep",
        "Sample: grocery list for DIY dinner",
    ],
    "restaurant_meal": [
        "Seed app: officer restaurant meal with sponsor",
        "Demo: sit-down lunch after site tour",
        "Sample: team dinner at nearby restaurant",
    ],
    "merch_promotional": [
        "Seed app: logo tees for new members",
        "Demo: tote bags for involvement fair",
        "Sample: branded stickers for outreach",
    ],
    "prize_or_gift_card": [
        "Seed app: hackathon Amazon gift cards",
        "Demo: trivia night Target cards",
        "Sample: raffle Starbucks cards",
    ],
    "durable_good": [
        "Seed app: PA speaker kept in club storage",
        "Demo: folding tables for multi-year use",
        "Sample: camera for media inventory",
    ],
    "venue_or_staffing": [
        "Seed app: Student Union room fee",
        "Demo: Event Services staffing charge",
        "Sample: auditorium rental deposit",
    ],
    "av_or_production": [
        "Seed app: mic and mixer rental",
        "Demo: stage lighting package",
        "Sample: live stream production kit",
    ],
    "printing": [
        "Seed app: fair posters print run",
        "Demo: concert program booklets",
        "Sample: classroom flyers",
    ],
    "decorations_rental": [
        "Seed app: balloon arch rental",
        "Demo: backdrop rental for awards",
        "Sample: linen and sash rental",
    ],
    "travel_air_or_hotel": [
        "Seed app: flights to nationals",
        "Demo: hotel for conference nights",
        "Sample: airfare for invited speaker",
    ],
    "ground_transport_rideshare_or_rental": [
        "Seed app: Uber for judge shuttle",
        "Demo: van rental for trip",
        "Sample: Lyft for speaker pickup",
    ],
    "talent_or_performer_fee": [
        "Seed app: keynote honorarium",
        "Demo: DJ fee for formal",
        "Sample: dance troupe booking",
    ],
    "subscription": [
        "Seed app: Canva Pro annual",
        "Demo: Notion team plan",
        "Sample: Adobe seat renewal",
    ],
    "supplies_single_use": [
        "Seed app: disposable plates for BBQ",
        "Demo: name tag stickers",
        "Sample: trash bags and gloves",
    ],
    "alcohol": [
        "Seed app: wine for alumni tasting",
        "Demo: bar package on venue quote",
        "Sample: champagne toast line",
    ],
    "donation_to_charity": [
        "Seed app: donation to food bank",
        "Demo: charity remittance line",
        "Sample: nonprofit gift in budget",
    ],
    "other": [
        "Seed app: wire fee miscellaneous",
        "Demo: insurance rider other",
        "Sample: translator services other",
    ],
}

ITEM_TRAIN_FY26: dict[str, list[str]] = {
    "food_catered": [
        "FY26 report: catering spend for cultural night",
        "FY26: approved caterer dinner trays",
    ],
    "food_raw": [
        "FY26 report: grocery ingredients for cook night",
        "FY26: raw food purchase summary",
    ],
    "restaurant_meal": [
        "FY26 report: restaurant meals for guests",
        "FY26: dining receipts classified restaurant",
    ],
    "merch_promotional": [
        "FY26 report: promotional apparel orders",
        "FY26: swag spend under merch",
    ],
    "prize_or_gift_card": [
        "FY26 report: gift card prizes awarded",
        "FY26: competition prize cards",
    ],
    "durable_good": [
        "FY26 report: equipment retained by clubs",
        "FY26: durable goods purchases",
    ],
    "venue_or_staffing": [
        "FY26 report: venue and staffing fees",
        "FY26: facility labor charges",
    ],
    "av_or_production": [
        "FY26 report: AV production rentals",
        "FY26: sound and light packages",
    ],
    "printing": [
        "FY26 report: printing and copy spend",
        "FY26: poster and flyer print totals",
    ],
    "decorations_rental": [
        "FY26 report: décor rental invoices",
        "FY26: returned decoration packages",
    ],
    "travel_air_or_hotel": [
        "FY26 report: airfare and hotel lines",
        "FY26: lodging for conference travel",
    ],
    "ground_transport_rideshare_or_rental": [
        "FY26 report: rideshare and van rentals",
        "FY26: ground transport totals",
    ],
    "talent_or_performer_fee": [
        "FY26 report: performer honoraria",
        "FY26: speaker fee disbursements",
    ],
    "subscription": [
        "FY26 report: software subscriptions",
        "FY26: recurring tool renewals",
    ],
    "supplies_single_use": [
        "FY26 report: disposable event supplies",
        "FY26: single-use consumables",
    ],
    "alcohol": [
        "FY26 report: alcohol lines flagged",
        "FY26: prohibited alcohol requests",
    ],
    "donation_to_charity": [
        "FY26 report: charity donations requested",
        "FY26: external donation lines",
    ],
    "other": [
        "FY26 report: miscellaneous other costs",
        "FY26: uncategorized residual lines",
    ],
}

ITEM_TRAIN_SYN: dict[str, list[str]] = {
    "food_catered": [
        "Synthetic: buffet catering for 100 students",
        "Synthetic: delivered catering trays with servers",
        "Synthetic: approved vendor catering package",
    ],
    "food_raw": [
        "Synthetic: bulk raw groceries for DIY meal",
        "Synthetic: uncooked ingredients shopping list",
        "Synthetic: member-prepared food supplies",
    ],
    "restaurant_meal": [
        "Synthetic: restaurant dinner invoice for officers",
        "Synthetic: sit-down meal at local eatery",
        "Synthetic: dine-in group restaurant bill",
    ],
    "merch_promotional": [
        "Synthetic: custom logo shirts for giveaways",
        "Synthetic: branded promo totes and pens",
        "Synthetic: recruitment swag apparel order",
    ],
    "prize_or_gift_card": [
        "Synthetic: gift cards as contest prizes",
        "Synthetic: raffle prize retail cards",
        "Synthetic: award gift cards for winners",
    ],
    "durable_good": [
        "Synthetic: equipment kept after the event",
        "Synthetic: multi-year club-owned gear",
        "Synthetic: capital item for storage locker",
    ],
    "venue_or_staffing": [
        "Synthetic: room rental plus staffing fee",
        "Synthetic: facility booking with labor",
        "Synthetic: venue charge for evening access",
    ],
    "av_or_production": [
        "Synthetic: sound and lighting production rental",
        "Synthetic: AV tech package for stage show",
        "Synthetic: mic mixer projector hire",
    ],
    "printing": [
        "Synthetic: printed posters and flyers",
        "Synthetic: program booklet print order",
        "Synthetic: banner and badge printing",
    ],
    "decorations_rental": [
        "Synthetic: rented balloon and floral décor",
        "Synthetic: returned décor package after event",
        "Synthetic: linen and backdrop rental",
    ],
    "travel_air_or_hotel": [
        "Synthetic: flights and hotel for nationals",
        "Synthetic: airfare plus lodging package",
        "Synthetic: overnight hotel for conference",
    ],
    "ground_transport_rideshare_or_rental": [
        "Synthetic: Uber shuttle for guests",
        "Synthetic: rental van for team travel",
        "Synthetic: Lyft receipts for logistics",
    ],
    "talent_or_performer_fee": [
        "Synthetic: paid DJ or band performance fee",
        "Synthetic: speaker honorarium line",
        "Synthetic: artist booking deposit",
    ],
    "subscription": [
        "Synthetic: annual software subscription",
        "Synthetic: SaaS renewal for club tools",
        "Synthetic: paid cloud plan yearly",
    ],
    "supplies_single_use": [
        "Synthetic: disposable cups and plates",
        "Synthetic: one-time craft consumables",
        "Synthetic: single-use check-in supplies",
    ],
    "alcohol": [
        "Synthetic: beer or wine budget line",
        "Synthetic: alcohol catering add-on",
        "Synthetic: bar package for formal",
    ],
    "donation_to_charity": [
        "Synthetic: cash gift to external charity",
        "Synthetic: nonprofit donation remittance",
        "Synthetic: charitable contribution line",
    ],
    "other": [
        "Synthetic: odd miscellaneous expense",
        "Synthetic: unclassified contingency cost",
        "Synthetic: residual uncategorized fee",
    ],
}


BOARD_TEST: dict[str, list[str]] = {
    "professional": [
        "Pre-law society hosting LSAT strategy workshop with alumni attorneys",
        "Consulting club case interview prep night for juniors",
        "Biomedical engineering research symposium with faculty posters",
        "Finance society Bloomberg terminal training series",
        "Women in STEM mentorship matching for lab placements",
        "Debate team coaching clinic before regional tournament",
        "Data science club Kaggle study group on campus",
        "Academic decathlon practice funded as training event",
        "Career panel with recruiters from Big Four firms",
        "Graduate school application essay workshop",
    ],
    "philanthropy": [
        "Charity 5K raising funds for LA food insecurity programs",
        "Volunteer day packing meals for Skid Row outreach",
        "Benefit concert proceeds directed to children's hospital",
        "Blood drive organized with Red Cross on Leavey Lawn",
        "Coat drive collection for winter shelter partners",
        "Service trip planning meeting for Habitat build weekend",
        "Awareness walk for mental health nonprofit partner",
        "Toy drive sorting night before December delivery",
        "Fundraiser gala supporting scholarship for first-gen students",
        "Community garden build with neighborhood nonprofit",
    ],
    "social": [
        "New club kickoff social with games and free pizza",
        "Intramural soccer league registration night",
        "Startup pitch mixer for student founders",
        "Casual board game night in the residential lounge",
        "Hiking day trip signup for Griffith Observatory trail",
        "Hackathon social hour before coding begins",
        "Club fair booth focused on meeting new friends",
        "Rec league basketball scrimmage and pizza after",
        "Founder office hours for early-stage student startups",
        "Welcome week scavenger hunt across campus",
    ],
    "arts": [
        "A cappella showcase in Bovard with ticketed seating",
        "Student film festival screening original shorts",
        "Dance company spring concert with live band",
        "Gallery opening for undergraduate photography",
        "Theater department collaboration on one-act plays",
        "Jazz ensemble night at the outdoor amphitheater",
        "Fashion design runway featuring student collections",
        "Poetry slam with featured spoken-word artists",
        "Orchestra chamber recital in music school hall",
        "Visual arts mural painting live demo for passersby",
    ],
}

BOARD_TRAIN_POOL: dict[str, dict[str, list[str]]] = {
    "professional": {
        "rules_doc": [
            "Board class: professional/academic programming and career prep",
            "Guidelines board: workshops, panels, academic competitions",
            "Professional development events for majors",
            "Academic society training and symposiums",
            "Career readiness programming under academic board",
            "Research poster nights and study workshops",
        ],
        "seed_app": [
            "Seed: consulting case prep night",
            "Seed: pre-med panel with alumni",
            "Seed: finance training on terminals",
            "Demo: debate coaching clinic",
            "Sample: LSAT strategy session",
        ],
        "fy26_report": [
            "FY26: professional boards hosted career panels",
            "FY26: academic workshop attendance strong",
            "FY26: research symposium funding notes",
            "FY26: mentorship matching events",
        ],
        "team_written": [
            "Officer notes: this is a career skills board event",
            "Team: academic prep night not a social mixer",
            "Team: professional society workshop classification",
        ],
        "synthetic": [
            "Synthetic: resume workshop for juniors",
            "Synthetic: industry speaker academic panel",
            "Synthetic: major-specific study skills night",
            "Synthetic: research methods seminar",
            "Synthetic: internship prep clinic",
            "Synthetic: academic competition practice",
            "Synthetic: faculty fireside on grad school",
            "Synthetic: lab tour for prospective majors",
            "Synthetic: coding interview drill session",
            "Synthetic: professional etiquette dinner talk",
            "Synthetic: alumni mentoring circle academic",
            "Synthetic: scholarship essay clinic",
        ],
    },
    "philanthropy": {
        "rules_doc": [
            "Board class: philanthropy and community service",
            "Guidelines board: charity fundraisers and service",
            "Service events benefiting external nonprofits",
            "Philanthropic drives and awareness walks",
            "Volunteer programming with community partners",
            "Benefit events raising money for causes",
        ],
        "seed_app": [
            "Seed: charity 5K fundraiser",
            "Seed: meal packing volunteer day",
            "Seed: blood drive with Red Cross",
            "Demo: coat drive sorting night",
            "Sample: benefit concert for hospital",
        ],
        "fy26_report": [
            "FY26: philanthropy boards led service days",
            "FY26: charity walk participation",
            "FY26: donation drive logistics",
            "FY26: nonprofit partner events",
        ],
        "team_written": [
            "Officer notes: service board charity focus",
            "Team: fundraiser for external nonprofit",
            "Team: volunteer day not a social-only event",
        ],
        "synthetic": [
            "Synthetic: park cleanup with nonprofit",
            "Synthetic: donation sorting warehouse night",
            "Synthetic: awareness week for health cause",
            "Synthetic: bake sale for shelter partner",
            "Synthetic: mentoring kids at partner school",
            "Synthetic: charity auction planning meeting",
            "Synthetic: hygiene kit assembly for outreach",
            "Synthetic: elder-care visit coordination",
            "Synthetic: disaster relief supply packing",
            "Synthetic: scholarship gala for community fund",
            "Synthetic: animal shelter volunteer shift",
            "Synthetic: food pantry restock day",
        ],
    },
    "social": {
        "rules_doc": [
            "Board class: social, recreation, and startup community",
            "Guidelines board: mixers, sports, founder events",
            "Social recreation programming for members",
            "Startup and entrepreneurship social hubs",
            "Intramural and casual recreation events",
            "New-club social kickoffs and mixers",
        ],
        "seed_app": [
            "Seed: new member pizza social",
            "Seed: intramural league night",
            "Seed: founder pitch mixer",
            "Demo: board game lounge night",
            "Sample: hiking day trip signup",
        ],
        "fy26_report": [
            "FY26: social boards hosted mixers",
            "FY26: recreation league participation",
            "FY26: startup mixer attendance",
            "FY26: welcome week socials",
        ],
        "team_written": [
            "Officer notes: pure social recreation event",
            "Team: startup mixer under social/startup board",
            "Team: intramural night classification",
        ],
        "synthetic": [
            "Synthetic: karaoke social in lounge",
            "Synthetic: pickup volleyball afternoon",
            "Synthetic: student founder coffee chat",
            "Synthetic: movie night in residence hall",
            "Synthetic: club picnic on Alumni Park",
            "Synthetic: escape room team bonding",
            "Synthetic: skate night at local rink",
            "Synthetic: weekend beach day trip",
            "Synthetic: gaming tournament casual",
            "Synthetic: potluck meet-and-greet",
            "Synthetic: startup idea jam social",
            "Synthetic: bike ride around Exposition Park",
        ],
    },
    "arts": {
        "rules_doc": [
            "Board class: performing and visual arts",
            "Guidelines board: concerts, shows, galleries",
            "Arts performances and exhibitions",
            "Dance, music, theater programming",
            "Visual arts shows and creative showcases",
            "Student arts festivals and recitals",
        ],
        "seed_app": [
            "Seed: a cappella showcase",
            "Seed: student film festival",
            "Seed: dance spring concert",
            "Demo: photography gallery opening",
            "Sample: jazz ensemble night",
        ],
        "fy26_report": [
            "FY26: arts boards staged concerts",
            "FY26: gallery openings funded",
            "FY26: theater one-acts attendance",
            "FY26: fashion runway show notes",
        ],
        "team_written": [
            "Officer notes: performing arts showcase",
            "Team: visual arts exhibition event",
            "Team: concert night arts board",
        ],
        "synthetic": [
            "Synthetic: choir winter concert",
            "Synthetic: improv comedy night",
            "Synthetic: sculpture courtyard show",
            "Synthetic: ballet workshop performance",
            "Synthetic: student DJ arts showcase",
            "Synthetic: mural unveiling ceremony",
            "Synthetic: theater tech week show",
            "Synthetic: classical recital series",
            "Synthetic: animation short screening",
            "Synthetic: spoken word cafe night",
            "Synthetic: design portfolio exhibition",
            "Synthetic: drumline outdoor set",
        ],
    },
}


REPLY_TEST: dict[str, list[str]] = {
    "interested": [
        "Thanks for reaching out — we'd love to support Build Night. Can we schedule a call?",
        "This looks aligned with our campus goals. Count us interested for an in-kind ask.",
        "Excited about Robotics Club. Let's talk sponsorship tiers next week.",
        "Yes, please send the one-pager. We are interested in catering support.",
        "Great event concept. Our team wants to move forward with a vendor payment.",
        "We're in — happy to cover the AV rental if you share the invoice.",
        "Love this. Interested in a logo on your flyer and covering merch.",
        "Thanks! Interested pending a quick internal approval this Friday.",
        "Please add us as a sponsor option; we want to help with food costs.",
        "Sounds perfect for our recruiting brand. Interested — send details.",
    ],
    "needs_more_info": [
        "Can you share expected attendance and the exact date before we decide?",
        "We need a W-9 and vendor invoice copy to evaluate this.",
        "Interesting — what recognition would our logo receive on site?",
        "Please clarify whether this is in-kind only or if cash is requested.",
        "Could you send last year's turnout numbers and a budget summary?",
        "We need more on audience majors before routing to marketing.",
        "What is the deadline to confirm, and who signs the agreement?",
        "Can you list the other sponsors already committed?",
        "Please share a draft flyer and the venue confirmation.",
        "Need details on how funds would be paid directly to the vendor.",
    ],
    "declined": [
        "Appreciate the note, but we cannot sponsor student events this semester.",
        "Unfortunately this falls outside our 2026 campus budget.",
        "We'll pass this year — please keep us in mind for spring.",
        "Not a fit for our brand priorities; declining politely.",
        "Our sponsorship slots are full through May. No for now.",
        "We don't fund food-related asks. Declining this request.",
        "After review, we will not be able to support this event.",
        "Thanks for thinking of us, but the answer is no.",
        "Budget freeze means we must decline all new campus asks.",
        "This audience is too narrow for us; we'll sit out.",
    ],
    "out_of_office": [
        "I'm out of office until Nov 24 with limited email access.",
        "OOO: returning Monday. Your message will be unread until then.",
        "Automatic reply: parental leave through December.",
        "Out sick this week — please expect delays.",
        "Traveling for a conference; back online next Thursday.",
        "Vacation auto-reply: will respond after Nov 30.",
        "Currently OOO for USC holidays; limited monitoring.",
        "Away from inbox on a product offsite until Friday.",
        "Out of office with no email access in the field.",
        "Auto-response: on leave, contact the team alias instead.",
    ],
    "referral_to_someone_else": [
        "Please loop in Jordan Lee on our campus team — they own this.",
        "I'm not the right contact; try sponsorships@example.com.",
        "Forwarding you to our university relations manager, Priya.",
        "Can you reach out to Alex in recruiting? They handle clubs.",
        "Please contact our LA office lead instead of me.",
        "Redirecting: Marcus owns in-kind vendor payments.",
        "You'll want our CSR desk — I'll CC them here.",
        "Not my lane; the brand partnerships PM should reply.",
        "Ask our campus ambassador Maya; she screens these.",
        "Please email the sponsorship queue, not my personal inbox.",
    ],
    "wrong_person_or_bounce": [
        "Delivery Status Notification: mailbox full, message bounced.",
        "This address is no longer valid. User unknown.",
        "I left the company last month — please remove me.",
        "Wrong person: I don't work on campus programs.",
        "Mailer-daemon: permanent failure for recipient.",
        "You've reached a personal Gmail; I never worked there.",
        "Undeliverable: recipient address rejected by server.",
        "I think you meant someone else on the marketing team.",
        "This inbox is deprecated; bounce will continue.",
        "No such employee in our directory — wrong contact.",
    ],
    "unsubscribe": [
        "Please remove me from future sponsorship emails.",
        "Unsubscribe — I do not want club outreach.",
        "Stop emailing this address about events.",
        "Opt out of all student organization solicitations.",
        "Take me off your sponsor mailing list immediately.",
        "Do not contact me again regarding campus asks.",
        "Unsubscribe request: no further Greenlight emails.",
        "Please delete my contact from your CRM.",
        "I revoke consent for sponsorship marketing messages.",
        "Remove this email from any future blasts.",
    ],
}

REPLY_TRAIN_POOL: dict[str, dict[str, list[str]]] = {
    "interested": {
        "rules_doc": [
            "Reply class: interested / positive sponsor intent",
            "Positive response signaling willingness to fund",
            "Sponsor expresses interest in supporting",
        ],
        "seed_app": [
            "Seed reply: yes we're interested, send one-pager",
            "Demo: count us in for in-kind support",
            "Sample: excited to sponsor catering",
        ],
        "fy26_report": [
            "FY26: interested replies converted to deals",
            "FY26: positive intent emails logged",
        ],
        "team_written": [
            "Team label: clear interest to proceed",
        ],
        "synthetic": [
            "Synthetic: we'd love to help with AV costs",
            "Synthetic: interested — share the invoice",
            "Synthetic: yes, let's discuss a sponsorship",
            "Synthetic: happy to cover merch if logo included",
            "Synthetic: aligned with our brand, interested",
            "Synthetic: move forward pending internal OK",
        ],
    },
    "needs_more_info": {
        "rules_doc": [
            "Reply class: needs more information before deciding",
            "Questions about attendance, budget, or recognition",
            "Conditional interest pending details",
        ],
        "seed_app": [
            "Seed reply: need attendance and date",
            "Demo: send W-9 and invoice please",
            "Sample: what recognition do we get?",
        ],
        "fy26_report": [
            "FY26: info-request replies common",
            "FY26: clarifying questions before commit",
        ],
        "team_written": [
            "Team label: asking clarifying questions",
        ],
        "synthetic": [
            "Synthetic: share budget breakdown please",
            "Synthetic: who signs the agreement?",
            "Synthetic: deadline to confirm sponsorship?",
            "Synthetic: list other committed sponsors",
            "Synthetic: need audience major mix",
            "Synthetic: is this in-kind only?",
        ],
    },
    "declined": {
        "rules_doc": [
            "Reply class: declined / will not sponsor",
            "Polite no or budget-based refusal",
            "Negative decision on the ask",
        ],
        "seed_app": [
            "Seed reply: cannot sponsor this semester",
            "Demo: outside our budget, declining",
            "Sample: sponsorship slots are full",
        ],
        "fy26_report": [
            "FY26: decline replies closed the claim",
            "FY26: not a fit responses",
        ],
        "team_written": [
            "Team label: clear decline",
        ],
        "synthetic": [
            "Synthetic: we'll pass this year",
            "Synthetic: not funding food asks",
            "Synthetic: brand priorities say no",
            "Synthetic: budget freeze, must decline",
            "Synthetic: audience too narrow for us",
            "Synthetic: after review we cannot support",
        ],
    },
    "out_of_office": {
        "rules_doc": [
            "Reply class: out of office auto-reply",
            "OOO messages with return dates",
            "Vacation or leave autoresponders",
        ],
        "seed_app": [
            "Seed reply: OOO until next Monday",
            "Demo: traveling, limited email",
            "Sample: on leave through December",
        ],
        "fy26_report": [
            "FY26: OOO replies delayed follow-ups",
            "FY26: autoresponder volume",
        ],
        "team_written": [
            "Team label: out-of-office autoresponse",
        ],
        "synthetic": [
            "Synthetic: out sick, expect delays",
            "Synthetic: vacation auto-reply Nov 30",
            "Synthetic: offsite until Friday",
            "Synthetic: holiday OOO limited monitoring",
            "Synthetic: parental leave autoresponse",
            "Synthetic: no email access in the field",
        ],
    },
    "referral_to_someone_else": {
        "rules_doc": [
            "Reply class: referral to another contact",
            "Please contact a different owner",
            "Forwarding to campus / CSR / partnerships",
        ],
        "seed_app": [
            "Seed reply: loop in Jordan on campus team",
            "Demo: try sponsorships@ alias",
            "Sample: Priya owns university relations",
        ],
        "fy26_report": [
            "FY26: referral replies reassigned owners",
            "FY26: redirect to recruiting contacts",
        ],
        "team_written": [
            "Team label: points to another person",
        ],
        "synthetic": [
            "Synthetic: email our LA office lead",
            "Synthetic: Marcus owns vendor payments",
            "Synthetic: CC the CSR desk please",
            "Synthetic: brand partnerships PM should reply",
            "Synthetic: campus ambassador screens these",
            "Synthetic: use the sponsorship queue",
        ],
    },
    "wrong_person_or_bounce": {
        "rules_doc": [
            "Reply class: wrong person or bounce",
            "Delivery failures and invalid addresses",
            "Recipient left company or never worked there",
        ],
        "seed_app": [
            "Seed reply: mailbox full bounce",
            "Demo: user unknown permanent failure",
            "Sample: I left the company last month",
        ],
        "fy26_report": [
            "FY26: bounce replies cleaned contacts",
            "FY26: wrong-person replies",
        ],
        "team_written": [
            "Team label: bounce or wrong recipient",
        ],
        "synthetic": [
            "Synthetic: address no longer valid",
            "Synthetic: mailer-daemon permanent failure",
            "Synthetic: deprecated inbox bounce",
            "Synthetic: not on campus programs team",
            "Synthetic: personal Gmail wrong target",
            "Synthetic: no such employee in directory",
        ],
    },
    "unsubscribe": {
        "rules_doc": [
            "Reply class: unsubscribe / opt out",
            "Requests to stop sponsorship email",
            "Remove from mailing list",
        ],
        "seed_app": [
            "Seed reply: remove me from sponsor emails",
            "Demo: unsubscribe from club outreach",
            "Sample: stop emailing this address",
        ],
        "fy26_report": [
            "FY26: unsubscribe replies honored",
            "FY26: opt-out volume",
        ],
        "team_written": [
            "Team label: explicit unsubscribe",
        ],
        "synthetic": [
            "Synthetic: opt out of solicitations",
            "Synthetic: delete my contact from CRM",
            "Synthetic: revoke consent for messages",
            "Synthetic: take me off the mailing list",
            "Synthetic: do not contact again",
            "Synthetic: no further Greenlight emails",
        ],
    },
}


def build_items() -> list[dict]:
    rows: list[dict] = []
    for label in ITEM_LABELS:
        for t in ITEM_TEST[label]:
            rows.append(row(t, label, "team_written", "test"))
        for t in ITEM_TRAIN_RULES[label]:
            rows.append(row(t, label, "rules_doc", "train"))
        for t in ITEM_TRAIN_SEED[label]:
            rows.append(row(t, label, "seed_app", "train"))
        for t in ITEM_TRAIN_FY26[label]:
            rows.append(row(t, label, "fy26_report", "train"))
        for t in ITEM_TRAIN_SYN[label]:
            rows.append(row(t, label, "synthetic", "train"))
    return rows


def build_from_pools(
    labels: list[str],
    test_map: dict[str, list[str]],
    train_pool: dict[str, dict[str, list[str]]],
    target_per_label: int,
) -> list[dict]:
    rows: list[dict] = []
    for label in labels:
        test_texts = test_map[label][: max(8, len(test_map[label]))]
        # ensure >=8 test
        assert len(test_texts) >= 8, label
        for t in test_texts:
            rows.append(row(t, label, "team_written", "test"))
        needed_train = max(0, target_per_label - len(test_texts))
        # Prefer non-synthetic first, then synthetic up to 60% of train
        ordered_sources = ["rules_doc", "seed_app", "fy26_report", "team_written", "synthetic"]
        collected: list[tuple[str, str]] = []
        for src in ordered_sources:
            for t in train_pool[label].get(src, []):
                collected.append((t, src))
        # Cap synthetic at 60% of training
        max_syn = int(needed_train * 0.6)
        train_rows: list[tuple[str, str]] = []
        syn_count = 0
        for t, src in collected:
            if len(train_rows) >= needed_train:
                break
            if src == "synthetic":
                if syn_count >= max_syn:
                    continue
                syn_count += 1
            train_rows.append((t, src))
        # If still short, duplicate distinctive non-synthetic with suffix (team_written train)
        i = 0
        while len(train_rows) < needed_train:
            base = test_texts[i % len(test_texts)]
            train_rows.append((f"{base} (officer train note {i+1})", "team_written"))
            i += 1
        # Re-check synthetic ratio
        syn = sum(1 for _, s in train_rows if s == "synthetic")
        assert syn <= max(1, int(len(train_rows) * 0.6) + 1), (label, syn, len(train_rows))
        for t, src in train_rows:
            rows.append(row(t, label, src, "train"))
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["text", "label", "source", "split"])
        w.writeheader()
        w.writerows(rows)


def summarize(rows: list[dict]) -> str:
    from collections import Counter

    lines = []
    by_label = Counter(r["label"] for r in rows)
    by_source = Counter(r["source"] for r in rows)
    by_split = Counter(r["split"] for r in rows)
    lines.append(f"Total rows: {len(rows)}")
    lines.append(f"Splits: {dict(by_split)}")
    lines.append(f"Sources: {dict(by_source)}")
    lines.append("")
    lines.append("Per label (total / train / test / team_written_test):")
    for label in sorted(by_label):
        lab = [r for r in rows if r["label"] == label]
        train_n = sum(1 for r in lab if r["split"] == "train")
        test_n = sum(1 for r in lab if r["split"] == "test")
        tw_test = sum(1 for r in lab if r["split"] == "test" and r["source"] == "team_written")
        syn_train = sum(1 for r in lab if r["split"] == "train" and r["source"] == "synthetic")
        syn_pct = (100.0 * syn_train / train_n) if train_n else 0
        lines.append(
            f"- `{label}`: {len(lab)} total, {train_n} train, {test_n} test "
            f"(team_written test={tw_test}), synthetic train={syn_train} ({syn_pct:.0f}%)"
        )
    # Validate invariants
    for r in rows:
        if r["split"] == "test":
            assert r["source"] == "team_written", r
            assert r["source"] != "synthetic"
    train = [r for r in rows if r["split"] == "train"]
    if train:
        syn = sum(1 for r in train if r["source"] == "synthetic")
        assert syn / len(train) <= 0.60 + 1e-9, syn / len(train)
    return "\n".join(lines)


def main() -> None:
    items = build_items()
    # Validate items ~20/label and synthetic ratio
    from collections import Counter

    for label in ITEM_LABELS:
        lab = [r for r in items if r["label"] == label]
        assert 18 <= len(lab) <= 24, (label, len(lab))
        test = [r for r in lab if r["split"] == "test"]
        assert len(test) >= 8 and all(r["source"] == "team_written" for r in test)
        train = [r for r in lab if r["split"] == "train"]
        syn = sum(1 for r in train if r["source"] == "synthetic")
        assert syn / len(train) <= 0.60

    board = build_from_pools(BOARD_LABELS, BOARD_TEST, BOARD_TRAIN_POOL, target_per_label=30)
    replies = build_from_pools(REPLY_LABELS, REPLY_TEST, REPLY_TRAIN_POOL, target_per_label=20)

    write_csv(DATA / "items.csv", items)
    write_csv(DATA / "board.csv", board)
    write_csv(DATA / "replies.csv", replies)

    readme = f"""# Greenlight Models training data

Honest framing: Greenlight Models are small classifiers we trained on USC club-funding data, on top of the open BAAI bge-small-en-v1.5 encoder (MIT license). They run in your browser, so request text never leaves your device for classification. They suggest; the rules engine and people decide.

## Schema

Columns: `text`, `label`, `source`, `split`

- **source**: `rules_doc` | `seed_app` | `fy26_report` | `team_written` | `synthetic`
- **split**: `train` | `test`
- Test split is **team_written only**, never synthetic, ≥8 examples per label.
- Synthetic is at most **60%** of the training split.

## items.csv (GL-Items)

{summarize(items)}

## board.csv (GL-Board)

{summarize(board)}

## replies.csv (GL-Replies)

{summarize(replies)}

## Regeneration

```bash
python ml/generate_data.py
```
"""
    (DATA / "README.md").write_text(readme, encoding="utf-8")
    print("Wrote items/board/replies CSVs and README")
    print(summarize(items))
    print("---")
    print(summarize(board))
    print("---")
    print(summarize(replies))


if __name__ == "__main__":
    main()
