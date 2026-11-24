# FISHGATE DESIGN CONSTITUTION v1.0
## MASTER EXPERIENCE SYSTEM

This document is the single source of truth for all user experience, interface design, product behavior, navigation, workflows, components, and future redesigns across FishGate (EstatesPro).

This document supersedes individual page preferences.
Every page, workflow, component, interaction, and feature must inherit from this constitution.
No future redesign may violate these principles unless explicitly approved through a platform-wide architecture review.

---

## 1. MISSION
FishGate exists to help property managers confidently manage properties, residents, finances, and operations with clarity and minimal effort.
- The platform should reduce stress.
- The platform should reduce complexity.
- The platform should increase confidence.

Users should always feel:
- **In control**
- **Informed**
- **Guided**
- **Professional**

The experience should feel calm, structured, intelligent, and trustworthy.
Not overwhelming. Not technical. Not AI-driven.

---

## 2. PRODUCT POSITIONING
FishGate is:
- A professional property management platform
- A daily operational workspace
- A decision-support system

FishGate is NOT:
- An ERP
- An analytics laboratory
- An AI showcase
- A database management interface
- A reporting application

The product must prioritize operational workflows over feature exposure.

---

## 3. EXPERIENCE PRINCIPLES

### Principle 1: Human Before AI
- AI exists to assist users.
- AI is never the destination.
- AI should remain invisible whenever possible.

### Principle 2: Clarity Before Density
- Less information shown well is better than more information shown poorly.
- Remove noise aggressively.

### Principle 3: Tasks Before Features
- Users come to complete work, not explore functionality.
- Every screen should prioritize task completion.

### Principle 4: Context Before Data
- Show users why something matters.
- Do not dump information without context.

### Principle 5: Calm Before Excitement
- Avoid unnecessary visual stimulation.
- Avoid excessive colors.
- Avoid dashboard overload.
- Avoid excessive metrics.

### Principle 6: Consistency Before Creativity
- Every page must feel like part of a unified platform.
- Individual pages may not invent new visual languages.

---

## 4. AI GOVERNANCE
The platform must never feel AI-centric.

### Prohibited:
- "AI Dashboard"
- "AI Center"
- "AI Hub"
- "AI Assistant Panels"
- "AI Scorecards"
- AI Branding Everywhere
- ChatGPT-style clutter

### Allowed:
- Recommendations
- Suggested Actions
- Portfolio Observations
- Smart Summaries
- Risk Detection
- Workflow Assistance

AI should behave like a skilled operations manager, never like a chatbot. AI outputs must feel human.

**Examples:**
- **GOOD:** *"Three leases require renewal discussions."*
- **GOOD:** *"Maintenance costs increased this month at Kigali Heights."*
- **BAD:** *"AI has detected portfolio optimization opportunities."*

---

## 5. GLOBAL PAGE ARCHITECTURE
Every page must follow this structure:
1. **HEADER** — Purpose, title, and context.
2. **CONTEXT SUMMARY** — Reassuring, conversational operational summary.
3. **PRIMARY WORKSPACE** — Core tasks and immediate focus.
4. **SUPPORTING DATA** — Secondary analytics and metrics.
5. **RECENT ACTIVITY** — Chronological human-centered event stream.
6. **RECOMMENDED ACTIONS** — Next best steps.

---

## 6. NAVIGATION PRINCIPLES
Navigation should expose destinations, not system architecture, database entities, or developer concepts.
- Hierarchy depth: **Strictly 2 levels**.
- 8 Primary Domains:
  1. `Dashboard` (`Overview`, `Activity`, `Reports`)
  2. `Properties` (`Portfolio`, `Properties`, `Units`, `Occupancy`)
  3. `Residents` (`Tenants`, `Leases`, `Communications`)
  4. `Finance` (`Rent Collection`, `Payments`, `Expenses`, `Transactions`)
  5. `Operations` (`Maintenance`, `Work Orders`, `Inspections`, `Tasks`)
  6. `Growth` (`Leads`, `CRM`, `Marketing`)
  7. `Insights` (`Revenue Insights`, `Analytics`, `Forecasts`)
  8. `Administration` (`Users`, `Billing`, `Roles`, `Settings`)

---

## 7. COMPONENT SYSTEM
- **Cards**: Summarize. Never overload cards. Maximum one primary message. 24–32px internal padding, 16px radius, soft shadow, subtle border.
- **Tables**: Secondary review and management. Never use tables as landing experiences.
- **Drawers**: Quick detail inspection without breaking context or forcing page transitions.
- **Modals**: Simple, single-step actions. Avoid multi-step workflows.
- **Search**: Global, fast, available everywhere.
- **Filters**: Consistent placement, styling, and behavior.
- **Timelines**: Human-centered language (*"John paid rent for Unit B204"*, not *"Transaction processed"*).
- **Empty States**: Reassuring and positive (*"✅ Everything looks good. No overdue rent payments."* Never *"No Data"* or *"0 Results"*).

---

## 8. VISUAL DESIGN SYSTEM
Hybrid of **Microsoft 365, Linear, Stripe, Notion, and Google Workspace**.
- **Primary Color:** `#2563EB`
- **Neutral Palette:** `#FFFFFF`, `#FAFAFA`, `#F5F5F5`, `#E5E7EB`, `#6B7280`, `#111827`
- **Status Colors:** Success `#16A34A`, Warning `#F59E0B`, Error `#DC2626`
- **Typography:** Inter (Weights 400, 500, 600, 700)
- **Spacing Grid:** `4, 8, 12, 16, 24, 32, 48, 64px` only

---

## 9. CORE PAGE EXPERIENCE SPECIFICATIONS

### Property Page
- **Top Section:** Property Hero (Image, Name, Address, Occupancy, Revenue, Quick Actions)
- **Middle Section:** Health Metrics (Occupancy, Revenue, Collections, Open Issues)
- **Bottom Section:** Tabs for `Units`, `Tenants`, `Maintenance`, `Transactions`

### Tenant Page
- Treat tenants as people, not database rows.
- Profile Layout: Photo, Name, Contact Details, Lease, Payment Status, Communication History, Maintenance Requests Timeline (HubSpot CRM feel).

### Maintenance Page
- Linear-inspired Kanban workflow: `Requested` &rarr; `Assigned` &rarr; `In Review` &rarr; `In Progress` &rarr; `Completed` &rarr; `Closed`.
- Prioritize workflow visibility and task movement over large metric walls.

---

## 10. SUCCESS CRITERIA
- Understand portfolio health within **3 seconds**.
- Identify priorities within **10 seconds**.
- Complete primary workflows within **30 seconds**.
- Successfully navigate without training.
