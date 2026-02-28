import type { ContactNode, CompanyNode, RelationshipEdge, RelationshipGraph, BrokerContact, BrokerTier } from "../../shared/types";

const OWNER_OPERATOR_MANAGER_TYPES = new Set(["owner", "operator", "manager"]);

const AVIATION_OPS_TITLES = [
  "chief pilot",
  "director of aviation",
  "dom",
  "director of maintenance",
  "scheduler",
];

const FINANCE_TITLES = [
  "cfo",
  "controller",
  "finance",
  "treasurer",
];

function titleContainsAny(title: string | null, keywords: string[]): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function computeScore(
  contact: ContactNode,
  company: CompanyNode | null,
  edge: RelationshipEdge,
  allEdges: RelationshipEdge[]
): number {
  let score = 0;

  const relType = edge.relationshipType?.toLowerCase() ?? "";
  if (OWNER_OPERATOR_MANAGER_TYPES.has(relType)) {
    score += 30;
  }

  if (titleContainsAny(contact.title, AVIATION_OPS_TITLES)) {
    score += 15;
  }

  if (titleContainsAny(contact.title, FINANCE_TITLES)) {
    score += 15;
  }

  if (contact.email) {
    score += 20;
  }

  if (contact.phoneMobile) {
    score += 10;
  }

  const hasDirectEdge = allEdges.some(
    (e) =>
      e.contactId === contact.contactId &&
      e.acid != null &&
      e.contactId != null
  );
  if (hasDirectEdge) {
    score += 10;
  }

  return Math.min(score, 100);
}

function classifyTier(
  score: number,
  relType: string,
  title: string | null
): BrokerTier {
  const rel = relType.toLowerCase();

  if (OWNER_OPERATOR_MANAGER_TYPES.has(rel) && score >= 40) {
    return "Primary";
  }

  if (titleContainsAny(title, AVIATION_OPS_TITLES)) {
    return "Aviation Ops";
  }

  if (titleContainsAny(title, FINANCE_TITLES)) {
    return "Finance/Admin";
  }

  if (score >= 20) {
    return "Secondary";
  }

  return "Historical";
}

function computeRoleBadge(relType: string, title: string | null): string {
  const rel = relType.toLowerCase();
  const t = (title ?? "").toLowerCase();

  if (rel === "owner") return "Owner Rep";
  if (rel === "operator") return "Operator";
  if (rel === "manager") return "Management";

  if (t.includes("dom") || t.includes("director of maintenance")) return "DOM";
  if (t.includes("chief pilot")) return "Chief Pilot";
  if (t.includes("scheduler")) return "Scheduler";
  if (t.includes("cfo") || t.includes("controller")) return "Controller/CFO";
  if (t.includes("director of aviation")) return "Director of Aviation";

  return relType || "Contact";
}

function computePreferredChannels(
  contact: ContactNode
): ("email" | "sms" | "call")[] {
  const channels: ("email" | "sms" | "call")[] = [];
  if (contact.email) channels.push("email");
  if (contact.phoneMobile) channels.push("sms");
  if (contact.phoneMobile || contact.phoneOffice) channels.push("call");
  return channels;
}

function computeReasons(
  contact: ContactNode,
  relType: string,
  tier: BrokerTier
): string[] {
  const reasons: string[] = [];
  const rel = relType.toLowerCase();

  if (OWNER_OPERATOR_MANAGER_TYPES.has(rel)) {
    reasons.push(`${relType} relationship — direct decision authority`);
  }

  if (titleContainsAny(contact.title, AVIATION_OPS_TITLES)) {
    reasons.push(`Title "${contact.title}" indicates aviation operations role`);
  }

  if (titleContainsAny(contact.title, FINANCE_TITLES)) {
    reasons.push(`Title "${contact.title}" indicates financial authority`);
  }

  if (contact.email) {
    reasons.push("Email available for outreach");
  }

  if (contact.phoneMobile) {
    reasons.push("Mobile phone available for direct contact");
  }

  if (reasons.length === 0) {
    reasons.push(`${tier} tier contact`);
  }

  return reasons;
}

export function rankContacts(
  graph: RelationshipGraph
): BrokerContact[] {
  const { companies, contacts, edges } = graph;

  const companyMap = new Map<number, CompanyNode>();
  for (const c of companies) {
    companyMap.set(c.companyId, c);
  }

  const contactMap = new Map<number | null, ContactNode>();
  for (const c of contacts) {
    contactMap.set(c.contactId, c);
  }

  const contactEdges = new Map<string, { contact: ContactNode; company: CompanyNode | null; edges: RelationshipEdge[] }>();

  for (const edge of edges) {
    const contact = contactMap.get(edge.contactId);
    if (!contact) continue;

    const key = `${edge.contactId ?? "null"}-${edge.companyId ?? "null"}`;
    if (!contactEdges.has(key)) {
      const company = edge.companyId != null ? companyMap.get(edge.companyId) ?? null : null;
      contactEdges.set(key, { contact, company, edges: [] });
    }
    contactEdges.get(key)!.edges.push(edge);
  }

  const seen = new Map<string, BrokerContact>();

  for (const [, { contact, company, edges: contactSpecificEdges }] of contactEdges) {
    const primaryEdge = contactSpecificEdges[0];
    const relType = primaryEdge.relationshipType ?? "";

    const score = computeScore(contact, company, primaryEdge, edges);
    const tier = classifyTier(score, relType, contact.title);
    const roleBadge = computeRoleBadge(relType, contact.title);
    const preferredChannels = computePreferredChannels(contact);
    const reasons = computeReasons(contact, relType, tier);

    const dedupKey = `${contact.contactId ?? ""}-${contact.firstName}-${contact.lastName}`.toLowerCase();

    const existing = seen.get(dedupKey);
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.tier = tier;
        existing.roleBadge = roleBadge;
        existing.reasons = reasons;
        existing.relationshipType = relType;
        existing.companyName = company?.companyName ?? existing.companyName;
        existing.companyId = company?.companyId ?? existing.companyId;
      }
      if (contact.email && !existing.emails.includes(contact.email)) {
        existing.emails.push(contact.email);
      }
      if (contact.phoneMobile && !existing.phones.mobile) {
        existing.phones.mobile = contact.phoneMobile;
      }
      if (contact.phoneOffice && !existing.phones.work) {
        existing.phones.work = contact.phoneOffice;
      }
      existing.preferredChannels = Array.from(
        new Set([...existing.preferredChannels, ...preferredChannels])
      ) as ("email" | "sms" | "call")[];
      continue;
    }

    const brokerContact: BrokerContact = {
      contactId: contact.contactId,
      companyId: company?.companyId ?? null,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      companyName: company?.companyName ?? "",
      relationshipType: relType,
      emails: contact.email ? [contact.email] : [],
      phones: {
        mobile: contact.phoneMobile ?? null,
        work: contact.phoneOffice ?? null,
      },
      tier,
      score,
      reasons,
      preferredChannels,
      roleBadge,
    };

    seen.set(dedupKey, brokerContact);
  }

  const results = Array.from(seen.values());

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
    const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return results;
}
