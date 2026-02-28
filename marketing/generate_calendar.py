#!/usr/bin/env python3
"""Generate Henley Contracting content calendar as an Excel workbook."""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime, timedelta

wb = openpyxl.Workbook()

# ── Styles ──────────────────────────────────────────────────────────────
header_font = Font(name="Calibri", bold=True, size=12, color="FFFFFF")
subheader_font = Font(name="Calibri", bold=True, size=11)
body_font = Font(name="Calibri", size=11)
wrap = Alignment(wrap_text=True, vertical="top")
center_wrap = Alignment(wrap_text=True, vertical="top", horizontal="center")

dark_fill = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
light_blue = PatternFill(start_color="D6E4F0", end_color="D6E4F0", fill_type="solid")
light_green = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
light_orange = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
light_purple = PatternFill(start_color="E8D5F5", end_color="E8D5F5", fill_type="solid")
light_yellow = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")

thin_border = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin"),
)

platform_fills = {
    "LinkedIn": light_blue,
    "Instagram": light_orange,
    "Facebook": light_purple,
    "TikTok": light_yellow,
}


def style_header_row(ws, num_cols):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = dark_fill
        cell.alignment = center_wrap
        cell.border = thin_border


def style_data_rows(ws, start_row, end_row, num_cols):
    for row in range(start_row, end_row + 1):
        for col in range(1, num_cols + 1):
            cell = ws.cell(row=row, column=col)
            cell.font = body_font
            cell.alignment = wrap
            cell.border = thin_border


# ════════════════════════════════════════════════════════════════════════
# SHEET 1: Weekly Content Calendar (4 weeks starting March 3)
# ════════════════════════════════════════════════════════════════════════
ws1 = wb.active
ws1.title = "Content Calendar"

headers = ["Week", "Date", "Day", "Platform", "Pillar", "Format", "Topic / Hook", "Caption", "Hashtags", "Media Needed", "Status"]
for col, h in enumerate(headers, 1):
    ws1.cell(row=1, column=col, value=h)
style_header_row(ws1, len(headers))

start_date = datetime(2026, 3, 3)  # Monday March 3

calendar_data = [
    # ── WEEK 1 ──
    ("Week 1", 0, "Monday", "LinkedIn", "Builder's Perspective", "Story post",
     "The biggest misconception about custom home building",
     "Most people think building a custom home starts with a floor plan.\n\nIt doesn't.\n\nIt starts with a conversation about how your family actually lives.\n\nWhere do your kids do homework? Do you cook together or is the kitchen your space? Do you need a mudroom that can survive three kids and a dog in an Ontario winter?\n\nThose conversations are where great homes come from. Not Pinterest boards. Not magazine spreads. Real life.\n\nAt Henley Contracting, every build starts the same way — we sit down with a family and ask them to tell us about their life. Not their dream home. Their life.\n\nBecause when we understand how you live, we can build a home that fits.\n\nThat's the difference between a house that looks good and a home that works.\n\nWhat's the one thing about your home that doesn't work for how you actually live?",
     "#CustomHomeBuilder #OntarioBuilder #HenleyContracting #BuildGrowTogether #FamilyHome",
     "None needed (text post)", "Ready"),

    ("Week 1", 0, "Monday", "Instagram", "The Process", "Carousel (7 slides)",
     "How a Henley build actually works",
     "Building a custom home can feel overwhelming. But it doesn't have to be.\n\nHere's our process — the same one we follow on every project:\n\n1. We listen. Tell us about your family, your life, your goals.\n2. We plan. Design, budget, timeline — all nailed down before we break ground.\n3. We build. With full transparency, daily updates, and zero surprises.\n4. We walk it with you. Every milestone, you're on site seeing your home come to life.\n5. We hand you the keys. And watch your family walk into their new chapter.\n\nThat's it. No mystery. No drama. Just a process that works.\n\nThinking about building? Start the conversation — link in bio.",
     "#HenleyContracting #HenleyProcess #CustomHomeBuilder #OntarioBuilder #NewBuild #HowWeBuild #BuildGrowTogether #CustomHome #DreamHome #HomeConstruction",
     "7 carousel slides (Canva)", "Draft"),

    ("Week 1", 0, "Monday", "TikTok", "Educational", "Talking head (60s)",
     "Building in Ontario? Know this first.",
     "If you're building a custom home in Ontario, here's something nobody talks about — your lot can cost you way more than you think. I'm talking soil conditions, grading, setbacks, services. I've seen lots add $30K, $50K, even $100K to a budget before a single wall goes up. Get a site assessment early. Know what you're working with. It'll save you money and headaches. Follow for more real talk about building in Ontario.",
     "#OntarioBuilder #CustomHome #BuildingTips #HenleyContracting #NewBuild #HouseTok",
     "Film on job site, talking to camera", "To Film"),

    ("Week 1", 1, "Tuesday", "Instagram", "The Build", "Feed photo",
     "Progress shot — current project",
     "Another day on site. Another step closer to move-in day.\n\nThere's something about watching a home take shape that never gets old. Every beam, every wall, every detail — it's all leading somewhere.\n\nFor this family, it's leading home.",
     "#HenleyBuilds #HenleyContracting #CustomHomeBuild #OntarioBuilder #NewBuild #ConstructionLife #HomeBuilding #ResidentialConstruction #InProgress",
     "Photo from current job site", "Need Photo"),

    ("Week 1", 2, "Wednesday", "LinkedIn", "Behind the Business", "Story post",
     "Transparency isn't a buzzword for us. It's a tool.",
     "Every one of our clients has real-time access to their project.\n\nBudget. Schedule. Photos. Documents. Change orders. All of it.\n\nWe use BuilderTrend to give families full visibility into their build. Not because it's trendy — because building a home is probably the biggest investment of your life, and you deserve to know exactly where things stand.\n\nI've heard too many horror stories from families who went months without knowing if their project was on budget. That's not how we operate.\n\nHere's what our clients see:\n→ Daily photo updates from the site\n→ Real-time budget tracking\n→ Every change order documented and approved\n→ Full schedule with milestones\n→ Direct communication with our team\n\nIs it more work for us? Yes.\nIs it worth it? Every single time.\n\nBecause trust isn't built with promises. It's built with proof.\n\nHow important is transparency to you when choosing a contractor?",
     "#ConstructionManagement #BuilderTrend #Transparency #OntarioConstruction #HenleyContracting",
     "Optional: BuilderTrend screenshot", "Ready"),

    ("Week 1", 2, "Wednesday", "Instagram", "Personality", "Reel (15-30s)",
     "Things that just hit different on a job site",
     "Tell me this isn't satisfying.\n\nHappy hump day from the Henley crew.",
     "#HenleyContracting #Satisfying #ConstructionLife #BuilderLife #OntarioBuilder #SiteLife #Construction #Oddlysatisfying #JobSite #BuildGrowTogether",
     "Satisfying clip — concrete pour, nail gun, level check", "To Film"),

    ("Week 1", 2, "Wednesday", "TikTok", "Satisfying/Viral", "Clip (15s)",
     "No thoughts, just perfect [concrete/framing/tile]",
     "This is the content you didn't know you needed",
     "#Construction #Satisfying #BuilderLife #HenleyContracting #OntarioBuilder #HouseTok",
     "Same clip as IG Reel, trending audio", "To Film"),

    ("Week 1", 3, "Thursday", "Instagram", "The Build", "Before/After carousel",
     "Before → After transformation",
     "Before → After.\n\nThis family needed more space to grow. They came to us with a home that didn't fit their life anymore — too small, too cramped, no room for the kids to run.\n\nWe gave them new living space. A kitchen where everyone can gather. A backyard the kids actually use. A home that finally works.\n\nThis is what we do. We build spaces where families grow together.\n\nThinking about your own transformation? Let's talk. Link in bio.",
     "#HenleyContracting #BeforeAndAfter #HomeRenovation #HomeTransformation #OntarioBuilder #CustomHome #BuildGrowTogether #RenovationGoals #HomeAddition #GrowingFamily",
     "Before/after photos from a completed project", "Need Photo"),

    ("Week 1", 4, "Friday", "LinkedIn", "Family + Purpose", "Story post",
     "I'm a builder. But that's not why I wake up in the morning.",
     "I wake up because somewhere in Ontario, a family is about to walk into a home we built for them for the first time.\n\nA home with a kitchen big enough for Sunday dinners.\nA backyard where their kids will grow up.\nA space that finally fits the life they've been building together.\n\nI started Henley Contracting because I believe families deserve more than just a house. They deserve a space that grows with them.\n\nThat belief drives every decision we make.\nIt's why we obsess over the process.\nIt's why we're transparent about everything.\nIt's why we treat every build like it's our own home.\n\nWe're a family business building for families. That's not a tagline — it's the truth.\n\nIf you're a business owner, what's the deeper purpose behind what you do?",
     "#FamilyBusiness #WhyWeBuild #Purpose #HenleyContracting #BuildGrowTogether #OntarioBuilder",
     "Photo of Nick or team on site", "Ready"),

    ("Week 1", 4, "Friday", "Instagram", "The Why", "Feed photo",
     "Friday reminder: We don't just build homes.",
     "Friday reminder: We don't just build homes.\n\nWe build the kitchen where you'll have Saturday morning pancakes with your kids.\n\nThe backyard where they'll play until the streetlights come on.\n\nThe bedroom where you'll finally have space to breathe.\n\nThe front porch where you'll watch them grow up.\n\nThat's why we do this. Every nail, every board, every late night on a deadline — it's all for this.\n\nHave a great weekend, everyone.",
     "#HenleyContracting #WhyWeBuild #FamilyHome #BuildGrowTogether #FamilyFirst #OntarioBuilder #CustomHomeBuilder #FridayFeels #WeekendVibes #BuildingDreams",
     "Team photo or finished home exterior", "Need Photo"),

    ("Week 1", 4, "Friday", "TikTok", "Day in the Life", "Vlog (60-90s)",
     "Day in the life of running a construction company in Ontario",
     "The builder life in Ontario. Different day, same passion.",
     "#DayInTheLife #BuilderLife #ConstructionLife #HenleyContracting #Ontario #HouseTok #DITL",
     "Quick cuts through the day: coffee, drive, site, lunch, wrap up", "To Film"),

    # ── WEEK 2 ──
    ("Week 2", 7, "Monday", "LinkedIn", "Builder's Perspective", "Carousel",
     "5 things every family should know before building a custom home",
     "Carousel post — 7 slides:\n\nSlide 1: \"5 Things Every Family Should Know Before Building\"\nSlide 2: Your lot matters more than you think (soil, grading, services)\nSlide 3: Allowances can be a trap — nail down selections early\nSlide 4: HST is 13% on everything — budget for it\nSlide 5: The cheapest bid is rarely the best bid\nSlide 6: Your builder's process matters as much as their portfolio\nSlide 7: Save this. Share it with someone who's thinking about building.",
     "#CustomHomeTips #BuildingInOntario #OntarioBuilder #HenleyContracting #NewHomeBuild #HomeBuildingTips",
     "7 carousel slides (Canva)", "Draft"),

    ("Week 2", 7, "Monday", "Instagram", "The Process", "Reel (60-90s)",
     "What actually happens before we break ground",
     "Most people think construction starts when the excavator shows up. It doesn't.\n\nHere's everything that happens before we break ground: site assessment, soil testing, survey, permits, design finalization, trade scheduling, material ordering.\n\nThe boring stuff? It's actually the most important stuff.",
     "#HenleyContracting #HenleyProcess #NewBuild #OntarioBuilder #ConstructionLife #HowWeBuild #HomeBuilding",
     "Film walkthrough of pre-construction steps", "To Film"),

    ("Week 2", 9, "Wednesday", "LinkedIn", "Behind the Business", "Story post",
     "We lost a bid last week. Here's what I learned from it.",
     "We lost a bid last week.\n\nThe family went with another builder. Lower price.\n\nAnd honestly? I get it. Building is expensive. Every dollar matters.\n\nBut here's what I've learned after years of this:\n\nThe lowest bid often isn't the full picture. It might not include the same scope. It might have thin allowances. It might not account for the things that come up mid-build.\n\nI'm not bitter about it. Losing bids makes us sharper. It forces us to communicate our value better.\n\nBecause our job isn't just to win bids. It's to build trust. And sometimes that means being honest about what things actually cost — even when it's not the number someone wants to hear.\n\nTo the builders out there: how do you handle losing a bid?",
     "#ConstructionBusiness #BuilderLife #OntarioBuilder #HenleyContracting #LessonsLearned #BusinessOwner",
     "None needed (text post)", "Ready"),

    ("Week 2", 11, "Friday", "LinkedIn", "Family + Purpose", "Photo + insight",
     "My dad taught me something about building that has nothing to do with construction.",
     "My dad taught me something about building that has nothing to do with construction.\n\nHe said: \"People don't remember the house. They remember how you made them feel while you were building it.\"\n\nThat stuck with me.\n\nBecause he's right. The tile, the trim, the finishes — they matter. But what people remember is whether you answered their calls. Whether you showed up when you said you would. Whether they felt heard.\n\nThat's the foundation of everything we do at Henley. Not just building well — but building trust.\n\nWhat's the best advice you've ever received about your work?",
     "#FamilyBusiness #BuilderLife #Trust #HenleyContracting #BuildGrowTogether #LifeLessons",
     "Photo of Nick + family or team", "Need Photo"),

    # ── WEEK 3 ──
    ("Week 3", 14, "Monday", "LinkedIn", "Builder's Perspective", "Video (60-90s)",
     "The one question I ask every family before we start building",
     "Film on site, talking to camera:\n\n\"Before we draw a single line or talk about budgets, I ask every family the same question: How do you live?\n\nNot what style do you want. Not how many bedrooms. How do you actually live in your home every day?\n\nBecause a family that cooks together every night needs a different kitchen than a family that orders takeout.\n\nA family with three kids under 5 needs a different layout than empty nesters.\n\nThe answer to that one question shapes everything. And it's why every Henley home is different — because every family is different.\"",
     "#CustomHomeBuilder #OntarioBuilder #HenleyContracting #BuildGrowTogether #HomeDesign",
     "Film on job site, talking to camera", "To Film"),

    ("Week 3", 16, "Wednesday", "LinkedIn", "Behind the Business", "Story post",
     "Why I still walk every job site myself",
     "I could run this business from a desk.\n\nCheck reports. Review numbers. Take calls.\n\nBut every day, I walk the site.\n\nNot because I don't trust my team — I do, completely.\n\nI walk it because this is the work. This is where the real decisions happen. This is where I catch the small things before they become big things.\n\nAnd honestly? It's where I'm happiest. Concrete under my boots, coffee in my hand, watching a home take shape.\n\nThe day I stop walking sites is the day I stop being a builder.\n\nWho else here does the same thing — stays close to the actual work, even when you don't have to?",
     "#BuilderLife #ConstructionLife #OntarioBuilder #HenleyContracting #LeadershipLessons #SmallBusiness",
     "Photo from a site walk", "Need Photo"),

    # ── WEEK 4 ──
    ("Week 4", 21, "Monday", "LinkedIn", "Builder's Perspective", "Story post",
     "The real cost of building in Ontario (what nobody talks about)",
     "Everyone asks: \"What does it cost per square foot to build in Ontario?\"\n\nHere's the honest answer: it depends. And anyone who gives you a number without knowing your project is guessing.\n\nBut here's what I CAN tell you — the costs that surprise people:\n\n→ Site prep: $30-100K+ depending on your lot\n→ HST: 13% on everything (a $500K build = $65K in tax)\n→ Permit fees: Vary by municipality, can be $15-30K+\n→ Development charges: Can be $50K+ for new lots\n→ Utility connections: $10-25K depending on location\n\nThat's before a single wall goes up.\n\nI'm not saying this to scare anyone. I'm saying it because the worst surprise in construction is a financial one.\n\nA good builder walks you through ALL of this upfront. No hidden costs. No surprises at the end.\n\nThat's how we do it at Henley. Total transparency from day one.\n\nWhat costs surprised you most when you built or renovated?",
     "#BuildingCosts #OntarioBuilder #CustomHome #HenleyContracting #BuildingInOntario #HomeBuildingTips #RealTalk",
     "None needed (text post)", "Ready"),

    ("Week 4", 23, "Wednesday", "LinkedIn", "Behind the Business", "Carousel",
     "Our build process from first call to move-in day",
     "Carousel post — 8 slides:\n\nSlide 1: \"From First Call to Move-In Day — The Henley Process\"\nSlide 2: Discovery — We learn about your family and how you live\nSlide 3: Design — Floor plans, selections, and budgeting\nSlide 4: Pre-Construction — Permits, site prep, scheduling\nSlide 5: Foundation & Framing — Your home takes shape\nSlide 6: Mechanical & Finishing — The details that matter\nSlide 7: Walkthrough & Handover — We walk you through every inch\nSlide 8: Move-In Day — Welcome home. This is what it's all about.\n\nCTA: Building soon? Let's start the conversation. Link in bio.",
     "#HenleyProcess #CustomHomeBuilder #OntarioBuilder #HenleyContracting #HowWeBuild #BuildProcess",
     "8 carousel slides (Canva)", "Draft"),

    ("Week 4", 25, "Friday", "LinkedIn", "Family + Purpose", "Story post",
     "A month ago, a family moved into a home we built. Here's what they said.",
     "A month ago, a family moved into a home we built.\n\nThree bedrooms. Open kitchen. Finished basement. A mudroom that can handle two kids and a golden retriever in February.\n\nNothing crazy. Nothing over the top. Just a home that fits.\n\nLast week, the mom sent me a message. She said:\n\n\"Nick, for the first time in years, we're not tripping over each other. The kids have space. I have space. It finally feels like home.\"\n\nI read that message three times.\n\nBecause that's it. That's the whole point.\n\nNot the finishes. Not the square footage. The feeling.\n\nThe feeling of finally having enough room.\n\nThat's what we build for.\n\nHave a great weekend, everyone.",
     "#WhyWeBuild #FamilyHome #HenleyContracting #BuildGrowTogether #OntarioBuilder #WelcomeHome",
     "Photo of finished home or move-in", "Need Photo"),
]

row = 2
for entry in calendar_data:
    week, day_offset, day_name, platform, pillar, fmt, topic, caption, hashtags, media, status = entry
    date = start_date + timedelta(days=day_offset)
    ws1.cell(row=row, column=1, value=week)
    ws1.cell(row=row, column=2, value=date.strftime("%b %d"))
    ws1.cell(row=row, column=3, value=day_name)
    ws1.cell(row=row, column=4, value=platform)
    ws1.cell(row=row, column=5, value=pillar)
    ws1.cell(row=row, column=6, value=fmt)
    ws1.cell(row=row, column=7, value=topic)
    ws1.cell(row=row, column=8, value=caption)
    ws1.cell(row=row, column=9, value=hashtags)
    ws1.cell(row=row, column=10, value=media)
    ws1.cell(row=row, column=11, value=status)

    # Color-code by platform
    fill = platform_fills.get(platform)
    if fill:
        for col in range(1, len(headers) + 1):
            ws1.cell(row=row, column=col).fill = fill

    row += 1

style_data_rows(ws1, 2, row - 1, len(headers))

# Column widths
col_widths = [10, 10, 12, 12, 22, 20, 45, 70, 55, 35, 12]
for i, w in enumerate(col_widths, 1):
    ws1.column_dimensions[get_column_letter(i)].width = w

# Row heights for readability
for r in range(2, row):
    ws1.row_dimensions[r].height = 80


# ════════════════════════════════════════════════════════════════════════
# SHEET 2: Content Ideas Bank
# ════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("Content Ideas")
ideas_headers = ["#", "Platform", "Pillar", "Format", "Topic / Hook", "Notes", "Priority"]
for col, h in enumerate(ideas_headers, 1):
    ws2.cell(row=1, column=col, value=h)
style_header_row(ws2, len(ideas_headers))

ideas = [
    (1, "LinkedIn", "Builder's Perspective", "Story post", "Why I still answer my own phone", "Personal touch, trust", "High"),
    (2, "LinkedIn", "Builder's Perspective", "Video", "What I look for when hiring a new trade partner", "Expertise content", "High"),
    (3, "LinkedIn", "Behind the Business", "Story post", "Three years ago we were a crew of 4. Here's what changed.", "Growth story", "High"),
    (4, "LinkedIn", "Behind the Business", "Carousel", "The real cost breakdown of a custom home in Ontario", "Educational, save-worthy", "High"),
    (5, "LinkedIn", "Family + Purpose", "Story post", "My [family member] is on site with me every day. Here's why that matters.", "Family business angle", "High"),
    (6, "LinkedIn", "Builder's Perspective", "Carousel", "How to choose a builder — from a builder", "Save-worthy, share-worthy", "Medium"),
    (7, "LinkedIn", "Behind the Business", "Story post", "Hiring in construction right now. Here's what we're doing differently.", "Industry insight", "Medium"),
    (8, "LinkedIn", "Builder's Perspective", "Story post", "The question I get asked the most as a builder", "Engaging, relatable", "Medium"),
    (9, "Instagram", "The Build", "Reel", "Full project walkthrough — [Project Name]", "Need to pick a project from BuilderTrend", "High"),
    (10, "Instagram", "The Build", "Carousel", "The anatomy of a [kitchen/bathroom/basement]", "Detail-oriented, educational", "High"),
    (11, "Instagram", "The Process", "Reel", "What's behind your walls — insulation, vapour barrier, electrical", "Educational, trust-building", "High"),
    (12, "Instagram", "The Process", "Reel", "Pre-drywall walkthrough — what we show every client", "Process showcase", "High"),
    (13, "Instagram", "The Why", "Feed post", "Move-in day for the [Family Name]", "Need client permission", "High"),
    (14, "Instagram", "Personality", "Reel", "Ontario in February. Still building.", "Weather humour, relatable", "Medium"),
    (15, "Instagram", "Personality", "Reel", "Things Ontario builders understand", "Relatable humour", "Medium"),
    (16, "TikTok", "Educational", "Talking head", "What $500K gets you in Ontario construction", "Viral potential", "High"),
    (17, "TikTok", "Educational", "Talking head", "Why the cheapest quote is usually the most expensive", "Contrarian, engaging", "High"),
    (18, "TikTok", "Satisfying", "Clip", "Sounds of a job site (ASMR-style)", "Trending format", "Medium"),
    (19, "TikTok", "Personality", "Skit", "POV: A client says 'while you're at it...'", "Relatable humour", "Medium"),
    (20, "TikTok", "Educational", "Talking head", "Expectation vs. Reality: Building a custom home", "Side by side format", "Medium"),
    (21, "All", "The Build", "Video", "Full project showcase — mini documentary (3-5 min)", "Pull from BuilderTrend project data", "High"),
    (22, "Instagram", "The Process", "Carousel", "Trade partner spotlight — [Name]", "Relationship content", "Medium"),
    (23, "LinkedIn", "Builder's Perspective", "Story post", "A client asked me [question]. Here's what I told them.", "Repeatable format", "Medium"),
    (24, "LinkedIn", "Behind the Business", "Story post", "Why we use BuilderTrend and what it means for our clients", "Tech + transparency", "Medium"),
    (25, "Instagram", "The Build", "Reel", "Drone footage — [Project Name] from above", "Premium visual content", "Medium"),
]

for r, idea in enumerate(ideas, 2):
    for c, val in enumerate(idea, 1):
        ws2.cell(row=r, column=c, value=val)
    fill = platform_fills.get(idea[1])
    if fill:
        for c in range(1, len(ideas_headers) + 1):
            ws2.cell(row=r, column=c).fill = fill

style_data_rows(ws2, 2, len(ideas) + 1, len(ideas_headers))
idea_widths = [5, 12, 22, 18, 55, 40, 10]
for i, w in enumerate(idea_widths, 1):
    ws2.column_dimensions[get_column_letter(i)].width = w


# ════════════════════════════════════════════════════════════════════════
# SHEET 3: Hashtag Reference
# ════════════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("Hashtag Sets")
ht_headers = ["Set Name", "Use For", "Hashtags"]
for col, h in enumerate(ht_headers, 1):
    ws3.cell(row=1, column=col, value=h)
style_header_row(ws3, len(ht_headers))

hashtag_sets = [
    ("Set A — Project", "Finished projects, build progress",
     "#HenleyContracting #HenleyBuilds #CustomHome #CustomHomeBuilder #NewBuild #HomeConstruction #OntarioBuilder #DreamHome #CustomHomeBuild #ResidentialConstruction"),
    ("Set B — Process", "Behind the scenes, how we build",
     "#HenleyContracting #HenleyProcess #HowWeBuild #BuildProcess #ConstructionLife #HomeBuilding #BehindTheScenes #OntarioConstruction #BuilderLife #SiteLife"),
    ("Set C — Family", "Family moments, move-ins, purpose",
     "#HenleyContracting #BuildGrowTogether #FamilyHome #GrowingFamily #HomeDesign #DreamHomeBuilder #FamilyFirst #BuildingDreams #ForeverHome #OntarioHomes"),
    ("Set D — Renovation", "Before/after, renovations, additions",
     "#HenleyContracting #HomeRenovation #HomeAddition #BeforeAndAfter #RenovationProject #TransformYourHome #OntarioRenovation #HomeTransformation #RemodelGoals"),
    ("Set E — LinkedIn", "Nick's personal brand posts",
     "#CustomHomeBuilder #OntarioBuilder #HenleyContracting #BuildGrowTogether #FamilyBusiness #ConstructionBusiness #BuilderLife #OntarioConstruction #Leadership #SmallBusiness"),
    ("Set F — TikTok", "Short-form video content",
     "#HenleyContracting #HouseTok #Construction #BuilderLife #OntarioBuilder #CustomHome #Satisfying #DayInTheLife #ConstructionLife #BuildingTips"),
    ("Branded (always include)", "Every post",
     "#HenleyContracting #BuildGrowTogether #BuiltByHenley"),
]

for r, hs in enumerate(hashtag_sets, 2):
    for c, val in enumerate(hs, 1):
        ws3.cell(row=r, column=c, value=val)

style_data_rows(ws3, 2, len(hashtag_sets) + 1, len(ht_headers))
ht_widths = [25, 35, 120]
for i, w in enumerate(ht_widths, 1):
    ws3.column_dimensions[get_column_letter(i)].width = w
for r in range(2, len(hashtag_sets) + 2):
    ws3.row_dimensions[r].height = 30


# ════════════════════════════════════════════════════════════════════════
# SHEET 4: Posting Schedule Template (blank, reusable)
# ════════════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("Weekly Template")
template_headers = ["Day", "LinkedIn", "Instagram Feed", "Instagram Reel", "Instagram Story", "Facebook", "TikTok"]
for col, h in enumerate(template_headers, 1):
    ws4.cell(row=1, column=col, value=h)
style_header_row(ws4, len(template_headers))

days_template = [
    ("Monday", "Story post or video\n(Builder's Perspective)", "Carousel or photo\n(The Process)", "Optional", "Week preview", "Cross-post IG", "Educational tip\n(60s talking head)"),
    ("Tuesday", "Optional: reshare or comment", "Feed photo\n(The Build — progress shot)", "—", "Site update", "—", "—"),
    ("Wednesday", "Story post or carousel\n(Behind the Business)", "—", "Reel\n(Personality — satisfying clip)", "Poll or question", "Cross-post IG", "Satisfying clip\n(15-30s, trending audio)"),
    ("Thursday", "Optional: industry insight", "Carousel or photo\n(Before/After or detail)", "—", "Behind the scenes", "Client story or testimonial", "—"),
    ("Friday", "Story post\n(Family + Purpose)", "Feed photo\n(The Why — team or finished)", "—", "Week in review", "Cross-post IG", "Day-in-the-life\n(60-90s vlog)"),
    ("Saturday", "—", "—", "—", "Quick site clip", "—", "Optional bonus"),
    ("Sunday", "—", "—", "—", "—", "—", "—"),
]

for r, day in enumerate(days_template, 2):
    for c, val in enumerate(day, 1):
        ws4.cell(row=r, column=c, value=val)

style_data_rows(ws4, 2, len(days_template) + 1, len(template_headers))
template_widths = [12, 30, 30, 30, 20, 25, 30]
for i, w in enumerate(template_widths, 1):
    ws4.column_dimensions[get_column_letter(i)].width = w
for r in range(2, len(days_template) + 2):
    ws4.row_dimensions[r].height = 50


# ── Save ────────────────────────────────────────────────────────────────
output_path = "/home/user/my-project/marketing/henley-content-calendar.xlsx"
wb.save(output_path)
print(f"Saved to {output_path}")
