# PREREQUISITE: Contact & Company Enrichment Fix
### Must be completed before Persona Engine implementation
**Priority:** BLOCKING
**Repo:** `https://github.com/JasonLorraine/Jetnet-Insight-Summary`
**Replit:** `https://replit.com/@jlorraine76/Insight-Summary`

---

## Current State (What the app does today)

Based on the live app screenshots for N413AF (2024 Pilatus PC-12 NGX, S/N 2413):

| Feature | Status | Notes |
|---------|--------|-------|
| Aircraft profile (tail, model, year, serial) | Working | getRegNumber or getAircraftList |
| Operator name ("Alpha Flying, Inc.") | Working | Comes from getRegNumber flat response |
| Flight activity (500 flights, 76.0/month) | Working | getFlightDataPaged |
| For-sale status | Working | "No" |
| "Will it sell?" scoring | Working | 56 NEUTRAL, est 225 days |
| Owner Intelligence (archetype, cycle, loyalty) | Working | Derived from history data |
| Disposition Factors (7 scored factors) | Working | Deterministic scoring engine |
| **Contact Accessibility** | **3/10 — BROKEN** | **"No contact information available"** |
| Company details (address, phone, website) | **MISSING** | Not displayed anywhere |
| Contact names, titles, emails, phones | **MISSING** | Not displayed anywhere |
| Outreach actions (call, text, email) | **MISSING** | Cannot exist without contacts |
| Contact Pack (copy to clipboard) | **MISSING** | Cannot exist without contacts |
| Add to Contacts (iOS contact card) | **MISSING** | Cannot exist without contacts |

**Bottom line:** The app knows the Operator is "Alpha Flying, Inc." but has zero information about the people at that company. This makes the entire outreach workflow impossible and reduces every persona's value significantly.

---

## Root Cause

The app is getting the company NAME from the `getRegNumber` response (which includes flat `companyrelationships` with `companyname` and `companyrelation` fields), but it is NOT doing the follow-up calls needed to get:

1. **Full company details** (address, city, state, phone, website)
2. **Contacts at the company** (names, titles, emails, phones)
3. **Multiple relationship layers** (Owner vs Operator vs Manager — separate entities)

There are two paths to get this data. **Path A is recommended.**

---

## Path A: getRelationships (Recommended — Single Call)

This is the most efficient approach. One call returns all companies AND contacts AND relationship types for an aircraft.

### Endpoint

```
POST https://customer.jetnetconnect.com/api/Aircraft/getRelationships/{apiToken}
Authorization: Bearer {bearerToken}
Content-Type: application/json
```

### Request Body

```json
{
  "aircraftid": 211461,
  "aclist": [],
  "modlist": [],
  "actiondate": "",
  "showHistoricalAcRefs": false
}
```

**Important:** Use the `aircraftid` (ACID) you already have from the aircraft lookup. Set `aclist` to empty array (not omitted — empty means no filter, which is correct when using `aircraftid`).

### Response Structure

The response key is `relationships`. Each record contains:

```json
{
  "relationships": [
    {
      "aircraftid": 211461,
      "regnbr": "N413AF",
      "name": "Alpha Flying, Inc.",
      "relationtype": "Operator",
      "relationseqno": 1,
      "company": {
        "companyid": 12345,
        "companyname": "Alpha Flying, Inc.",
        "address1": "123 Aviation Way",
        "city": "White Plains",
        "state": "NY",
        "zip": "10604",
        "country": "USA",
        "phone": "+19145551234",
        "website": "www.alphaflying.com"
      },
      "contact": {
        "contactid": 67890,
        "firstname": "John",
        "lastname": "Smith",
        "title": "Chief Pilot",
        "email": "jsmith@alphaflying.com",
        "phone": "+19145555678",
        "mobile": "+19175551111"
      }
    }
  ],
  "aircraftcount": 1,
  "count": 4,
  "responsestatus": "SUCCESS"
}
```

### Critical Parsing Notes

1. **Multiple records per aircraft.** One aircraft may have 3-15 relationship records (Owner company + their contacts, Operator company + their contacts, Manager company + their contacts).
2. **Nested objects.** Unlike `getRegNumber` which uses flat prefixed fields (`companyname`, `contactfirstname`), `getRelationships` uses nested `company: {}` and `contact: {}` objects.
3. **Relation field name differs.** Use `relationtype` (not `companyrelation` — that is the getRegNumber flat field). This mismatch causes real bugs.
4. **Deduplication required.** The same company or contact may appear multiple times across relationship records. Dedupe by `companyid` and `contactid`.
5. **Empty relationships are not errors.** Some aircraft return 200 OK with an empty `relationships` array. This is valid — it means no relationships are on file. Do not treat as an error.
6. **Contact fields may be sparse.** Not every relationship record has a `contact` object. Some only have `company`. Not every contact has `email` or `mobile`. Handle all missing fields gracefully.

---

## Path B: getCompany + getContacts (Alternative — Multiple Calls)

If `getRelationships` doesn't return enough contact detail, you can supplement with:

### Get Company Details

```
GET https://customer.jetnetconnect.com/api/Company/getCompany/{companyId}/{apiToken}
Authorization: Bearer {bearerToken}
```

### Get Contacts for a Company

```
GET https://customer.jetnetconnect.com/api/Contact/getContacts/{companyId}/{apiToken}
Authorization: Bearer {bearerToken}
```

This returns ALL contacts at a company, not just those tied to the specific aircraft. More data, but requires filtering for relevance.

---

## Implementation Steps

### Step 1: Add getRelationships Call to the Fetch Pipeline

In the server, after the aircraft lookup resolves the ACID, add `getRelationships` to the parallel fetch group alongside flight data.

```typescript
// server/jetnet/fetch-pipeline.ts (or wherever your JETNET calls live)

async function fetchAircraftIntel(acid: number, bearerToken: string, apiToken: string) {
  // Step 1: Already exists — aircraft profile
  const aircraft = await getRegNumber(regNbr, apiToken, bearerToken);

  // Step 2: Parallel fetches — ADD getRelationships here
  const [relationships, flightData, pictures] = await Promise.all([
    getRelationships(acid, apiToken, bearerToken),    // NEW
    getFlightDataPaged(acid, apiToken, bearerToken),   // Already exists
    getPictures(acid, apiToken, bearerToken),           // Already exists (if wired)
  ]);

  return { aircraft, relationships, flightData, pictures };
}

async function getRelationships(acid: number, apiToken: string, bearerToken: string) {
  const response = await fetch(
    `https://customer.jetnetconnect.com/api/Aircraft/getRelationships/${apiToken}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aircraftid: acid,
        aclist: [],
        modlist: [],
        actiondate: '',
        showHistoricalAcRefs: false,
      }),
    }
  );

  const data = await response.json();

  // Check for JETNET error in response body (HTTP 200 does not mean success)
  if (data.responsestatus && data.responsestatus.toUpperCase().includes('ERROR')) {
    console.error('JETNET getRelationships error:', data.responsestatus);
    return { companies: [], contacts: [], edges: [] };
  }

  return normalizeRelationships(data.relationships || []);
}
```

### Step 2: Normalize the Relationships Response

Transform the raw JETNET response into a clean, deduplicated graph.

```typescript
interface NormalizedCompany {
  companyId: number;
  companyName: string;
  relationshipRole: string;  // Owner, Operator, Manager, etc.
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  website?: string;
}

interface NormalizedContact {
  contactId: number;
  companyId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  relationshipType: string;
  emails: string[];
  phones: {
    mobile?: string;
    work?: string;
  };
}

interface RelationshipEdge {
  aircraftId: number;
  companyId: number;
  contactId?: number;
  relationshipType: string;
}

function normalizeRelationships(raw: any[]): {
  companies: NormalizedCompany[];
  contacts: NormalizedContact[];
  edges: RelationshipEdge[];
} {
  const companiesMap = new Map<number, NormalizedCompany>();
  const contactsMap = new Map<number, NormalizedContact>();
  const edges: RelationshipEdge[] = [];

  for (const rel of raw) {
    // Extract company
    if (rel.company && rel.company.companyid) {
      const cid = rel.company.companyid;
      if (!companiesMap.has(cid)) {
        companiesMap.set(cid, {
          companyId: cid,
          companyName: rel.company.companyname || rel.name || '',
          relationshipRole: rel.relationtype || '',
          address: [rel.company.address1, rel.company.address2].filter(Boolean).join(', '),
          city: rel.company.city,
          state: rel.company.state,
          zip: rel.company.zip,
          country: rel.company.country,
          phone: rel.company.phone,
          website: rel.company.website,
        });
      }
    }

    // Extract contact
    if (rel.contact && rel.contact.contactid) {
      const ctid = rel.contact.contactid;
      if (!contactsMap.has(ctid)) {
        const firstName = rel.contact.firstname || '';
        const lastName = rel.contact.lastname || '';
        contactsMap.set(ctid, {
          contactId: ctid,
          companyId: rel.company?.companyid || 0,
          fullName: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          title: rel.contact.title || '',
          relationshipType: rel.relationtype || '',
          emails: [rel.contact.email, rel.contact.email2].filter(Boolean),
          phones: {
            mobile: rel.contact.mobile || undefined,
            work: rel.contact.phone || undefined,
          },
        });
      }
    }

    // Record edge
    edges.push({
      aircraftId: rel.aircraftid,
      companyId: rel.company?.companyid || 0,
      contactId: rel.contact?.contactid || undefined,
      relationshipType: rel.relationtype || '',
    });
  }

  return {
    companies: Array.from(companiesMap.values()),
    contacts: Array.from(contactsMap.values()),
    edges,
  };
}
```

### Step 3: Build the Contact Ranking Engine

Score each contact for display priority. This is deterministic and explainable.

```typescript
interface RankedContact extends NormalizedContact {
  tier: 'Primary' | 'Aviation Ops' | 'Finance/Admin' | 'Secondary';
  score: number;
  reasons: string[];
  preferredChannels: string[];
}

function rankContacts(contacts: NormalizedContact[], companies: NormalizedCompany[]): RankedContact[] {
  return contacts.map(contact => {
    let score = 0;
    const reasons: string[] = [];
    const channels: string[] = [];

    // Relationship type scoring
    const relType = contact.relationshipType.toLowerCase();
    if (relType.includes('owner')) { score += 30; reasons.push('Owner relationship'); }
    else if (relType.includes('operator')) { score += 25; reasons.push('Operator relationship'); }
    else if (relType.includes('manager')) { score += 20; reasons.push('Manager relationship'); }

    // Title scoring
    const title = contact.title.toLowerCase();
    if (title.includes('chief pilot')) { score += 15; reasons.push('Chief Pilot title'); }
    else if (title.includes('director') && title.includes('aviation')) { score += 15; reasons.push('Director of Aviation title'); }
    else if (title.includes('dom') || title.includes('director of maintenance')) { score += 15; reasons.push('DOM title'); }
    else if (title.includes('scheduler')) { score += 12; reasons.push('Scheduler title'); }
    else if (title.includes('cfo') || title.includes('chief financial')) { score += 12; reasons.push('CFO title'); }
    else if (title.includes('controller')) { score += 10; reasons.push('Controller title'); }
    else if (title.includes('vp') || title.includes('vice president')) { score += 10; reasons.push('VP-level title'); }

    // Reachability scoring
    if (contact.emails.length > 0) { score += 5; reasons.push('Email available'); channels.push('email'); }
    if (contact.phones.mobile) { score += 5; reasons.push('Mobile available'); channels.push('sms', 'call'); }
    if (contact.phones.work) { score += 3; channels.push('call'); }

    // Tier assignment
    let tier: RankedContact['tier'] = 'Secondary';
    if (['owner', 'operator', 'manager'].some(r => relType.includes(r))) {
      if (title && (title.includes('chief') || title.includes('director') || title.includes('cfo') || title.includes('vp'))) {
        tier = 'Primary';
      } else {
        tier = 'Primary';
      }
    } else if (title.includes('pilot') || title.includes('dom') || title.includes('scheduler') || title.includes('dispatch')) {
      tier = 'Aviation Ops';
    } else if (title.includes('cfo') || title.includes('controller') || title.includes('finance')) {
      tier = 'Finance/Admin';
    }

    return {
      ...contact,
      tier,
      score,
      reasons,
      preferredChannels: [...new Set(channels)],
    };
  }).sort((a, b) => b.score - a.score);
}
```

### Step 4: Update the UI — Contact Cards

Add a "Contacts" section to the Aircraft Profile screen, between "Owner Intelligence" and the Disposition Factors.

#### Contact Card Component

Each contact card should display:

```
┌─────────────────────────────────────────────┐
│  👤 John Smith                    PRIMARY    │
│  Chief Pilot · Alpha Flying, Inc.           │
│  Operator                                    │
│                                              │
│  📧 jsmith@alphaflying.com                  │
│  📱 (917) 555-1111                          │
│  ☎️  (914) 555-5678                          │
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  Call   │ │  Text  │ │ Email  │          │
│  └────────┘ └────────┘ └────────┘          │
│                                              │
│  [Add to Contacts]                           │
└─────────────────────────────────────────────┘
```

**Rules for action buttons:**
- **Call** button: Always show if ANY phone exists. Uses `tel:` link. Prefer mobile, fall back to work.
- **Text** button: ONLY show if `phones.mobile` exists. Uses `sms:` link.
- **Email** button: ONLY show if `emails` array has entries. Uses `mailto:` link with prefilled subject.
- **Add to Contacts**: Opens prefilled iOS contact card. User taps Save. Never auto-create.

#### Contact Section Layout

```
┌─────────────────────────────────────────────┐
│  👥 Who's associated with this aircraft?     │
│                                              │
│  3 contacts found across 2 companies        │
│                                              │
│  ┌─ PRIMARY ─────────────────────────────┐  │
│  │  [Contact Card 1]                     │  │
│  │  [Contact Card 2]                     │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌─ AVIATION OPS ────────────────────────┐  │
│  │  [Contact Card 3]                     │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  📋 Copy Contact Pack               │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Step 5: Wire Outreach Actions

Every action button opens the native composer. No auto-send.

```typescript
// components/outreach/OutreachActions.tsx

import { Linking } from 'react-native';

function handleCall(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

function handleText(mobile: string, regNbr: string) {
  const body = encodeURIComponent(
    `Hi — I am reaching out about ${regNbr}. Do you have a moment for a quick question?`
  );
  Linking.openURL(`sms:${mobile}&body=${body}`);
}

function handleEmail(email: string, regNbr: string, model: string, firstName: string) {
  const subject = encodeURIComponent(`Quick question on ${regNbr}`);
  const body = encodeURIComponent(
    `Hi ${firstName} — I am reaching out about ${regNbr} (${model}). Do you have 5 minutes this week for a quick question on the aircraft?\n\nThanks`
  );
  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
}
```

### Step 6: Implement Contact Pack (Copy to Clipboard)

One-tap copies a formatted text bundle:

```typescript
function generateContactPack(
  aircraft: AircraftProfile,
  companies: NormalizedCompany[],
  rankedContacts: RankedContact[]
): string {
  const lines: string[] = [];

  lines.push(`${aircraft.regNbr} — ${aircraft.model}`);
  lines.push('');

  // Companies
  lines.push('Companies');
  for (const company of companies) {
    lines.push(`  ${company.relationshipRole}: ${company.companyName}`);
    if (company.city && company.state) {
      lines.push(`    ${company.city}, ${company.state}`);
    }
    if (company.phone) {
      lines.push(`    Phone: ${company.phone}`);
    }
  }
  lines.push('');

  // Contacts
  lines.push('Top Contacts');
  for (let i = 0; i < Math.min(rankedContacts.length, 5); i++) {
    const c = rankedContacts[i];
    lines.push(`  ${i + 1}. ${c.fullName} — ${c.title} (${c.relationshipType})`);
    if (c.emails.length > 0) lines.push(`     Email: ${c.emails[0]}`);
    if (c.phones.mobile) lines.push(`     Mobile: ${c.phones.mobile}`);
    if (c.phones.work) lines.push(`     Work: ${c.phones.work}`);
  }
  lines.push('');
  lines.push('Source: JETNET Connect Relationships');

  return lines.filter(l => l !== undefined).join('\n');
}
```

### Step 7: Update Contact Accessibility Score

The existing Disposition Factors scoring engine already has a "Contact Accessibility" factor at 3/10 with "No contact information available." Update this to use the real contact data:

```typescript
function scoreContactAccessibility(contacts: RankedContact[]): {
  score: number;
  maxScore: number;
  detail: string;
} {
  if (contacts.length === 0) {
    return { score: 1, maxScore: 10, detail: 'No contact information available.' };
  }

  let score = 3; // Base: at least one contact found

  // Has email
  if (contacts.some(c => c.emails.length > 0)) score += 2;
  // Has mobile
  if (contacts.some(c => c.phones.mobile)) score += 2;
  // Has decision maker (Primary tier)
  if (contacts.some(c => c.tier === 'Primary')) score += 2;
  // Multiple contacts
  if (contacts.length >= 3) score += 1;

  const detail = `${contacts.length} contacts found. ` +
    `${contacts.filter(c => c.emails.length > 0).length} with email, ` +
    `${contacts.filter(c => c.phones.mobile).length} with mobile.`;

  return { score: Math.min(score, 10), maxScore: 10, detail };
}
```

---

## Updated Screen Flow (After Fix)

Here is what the Aircraft Profile screen should look like after this enrichment is wired:

```
┌─────────────────────────────────────────────┐
│  ← Aircraft Profile                         │
│                                              │
│  ✈️ N413AF                    56 NEUTRAL     │
│  2024 PILATUS PC-12 NGX                     │
│  S/N 2413                                   │
│  📍 White Plains, NY  (from operator addr)  │
│  🔗 Open in Evolution                       │
│                                              │
├─────────────────────────────────────────────┤
│  🔥 Will it sell?                            │
│  [56 gauge] NEUTRAL                         │
│  Est. time to sell: 225 days                │
│  [scoring factors...]                        │
│                                              │
├─────────────────────────────────────────────┤
│  👥 Who owns this?                           │  ← EXISTING
│  OPERATOR: Alpha Flying, Inc.               │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  👥 Contacts (NEW SECTION)                   │  ← NEW
│  3 contacts · 2 companies                   │
│                                              │
│  ┌─ PRIMARY ───────────────────────────┐    │
│  │ John Smith · Chief Pilot            │    │
│  │ Alpha Flying, Inc. · Operator       │    │
│  │ 📧 jsmith@alphaflying.com          │    │
│  │ 📱 (917) 555-1111                  │    │
│  │ [Call] [Text] [Email]              │    │
│  │ [Add to Contacts]                  │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌─ AVIATION OPS ─────────────────────┐    │
│  │ Jane Doe · Scheduler               │    │
│  │ Alpha Flying, Inc. · Operator       │    │
│  │ 📧 jdoe@alphaflying.com           │    │
│  │ [Call] [Email]                     │    │
│  │ [Add to Contacts]                  │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  [📋 Copy Contact Pack]                     │
│                                              │
├─────────────────────────────────────────────┤
│  📈 Is it active?                            │  ← EXISTING
│  FOR SALE: No                               │
│  TOTAL FLIGHTS: 500                         │
│  AVG/MONTH: 76.0                            │
│                                              │
├─────────────────────────────────────────────┤
│  🧠 Owner Intelligence                      │  ← EXISTING
│  [archetype, cycle, loyalty, sell prob...]   │
│                                              │
├─────────────────────────────────────────────┤
│  ✨ Generate AI Summary                      │  ← EXISTING
└─────────────────────────────────────────────┘
```

---

## Handling Empty Contacts Gracefully

When `getRelationships` returns companies but no contacts (this is common):

```
┌─────────────────────────────────────────────┐
│  👥 Contacts                                 │
│                                              │
│  No individual contacts on file for this     │
│  aircraft.                                   │
│                                              │
│  Companies associated:                       │
│  • Alpha Flying, Inc. (Operator)            │
│    White Plains, NY                          │
│    (914) 555-1234                            │
│    [Call Company]                            │
│                                              │
│  💡 Tip: Try calling the operator directly  │
│  to reach the chief pilot or scheduler.     │
└─────────────────────────────────────────────┘
```

When `getRelationships` returns NO relationships at all:

```
┌─────────────────────────────────────────────┐
│  👥 Contacts                                 │
│                                              │
│  No relationship data available for this     │
│  aircraft in JETNET.                        │
│                                              │
│  Contact Accessibility: 1/10                │
└─────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Search a tail number → verify `getRelationships` is called after ACID is resolved
- [ ] Verify response is parsed with nested `company` and `contact` objects (not flat fields)
- [ ] Verify deduplication works (same company appearing in multiple relationship records)
- [ ] Verify contacts are ranked and bucketed into tiers
- [ ] Verify Call button uses `tel:` and opens native dialer
- [ ] Verify Text button only appears when mobile exists, uses `sms:` with prefilled body
- [ ] Verify Email button only appears when email exists, uses `mailto:` with prefilled subject/body
- [ ] Verify Add to Contacts opens prefilled iOS contact card (user confirms save)
- [ ] Verify Copy Contact Pack copies clean formatted text to clipboard
- [ ] Verify Contact Accessibility score updates from 3/10 to reflect actual contact data
- [ ] Test with a tail that has NO relationships → graceful empty state
- [ ] Test with a tail that has companies but NO contacts → shows company info with call button
- [ ] Test with a tail that has multiple companies and contacts → proper dedup and ranking
- [ ] Verify no crash on JETNET error response (check `responsestatus` for "ERROR")

---

## Dependency for Persona Engine

This contact enrichment fix is **required** before the Persona Engine can be implemented. Every persona relies on contacts and companies to:

1. Rank contacts by persona-specific weights
2. Generate outreach drafts with real email/phone data
3. Populate the Contact Pack
4. Score Data Confidence accurately
5. Power the "Who to Contact First" AI recommendation

Without this data flowing, the persona engine would produce empty contact rankings and blank outreach drafts for every persona.

**Recommended order:**
1. Ship this contact enrichment fix (1-2 days)
2. Test with 10+ tail numbers to verify contact data quality
3. Begin Persona Engine implementation per `PERSONA_ENGINE_SPEC.md`

---

*End of Prerequisite Document*
