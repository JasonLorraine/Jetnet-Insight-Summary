import type { ContactNode, CompanyNode, RelationshipEdge, RelationshipGraph, BrokerContact, BrokerTier } from "../../shared/types";
import type { PersonaId } from "../../shared/types/persona";
import { CONTACT_WEIGHTS, type ContactSignal } from "../../constants/contact-weights";

const TITLE_SIGNAL_MAP: Array<{ keywords: string[]; signal: ContactSignal }> = [
  { keywords: ["chief pilot"], signal: "chief_pilot" },
  { keywords: ["dom", "director of maintenance"], signal: "dom" },
  { keywords: ["scheduler"], signal: "scheduler" },
  { keywords: ["dispatch"], signal: "dispatch" },
  { keywords: ["cfo"], signal: "cfo" },
  { keywords: ["controller"], signal: "controller" },
  { keywords: ["director of aviation"], signal: "director_aviation" },
  { keywords: ["executive assistant", "assistant to"], signal: "executive_assistant" },
];

const REL_SIGNAL_MAP: Record<string, ContactSignal> = {
  owner: "owner",
  operator: "operator",
  manager: "manager",
};

function detectTitleSignals(title: string | null): ContactSignal[] {
  if (!title) return [];
  const lower = title.toLowerCase();
  const signals: ContactSignal[] = [];
  for (const { keywords, signal } of TITLE_SIGNAL_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      signals.push(signal);
    }
  }
  return signals;
}

function computePersonaScore(
  personaId: PersonaId,
  contact: ContactNode,
  relType: string,
  allEdges: RelationshipEdge[]
): number {
  const weights = CONTACT_WEIGHTS[personaId];
  let score = 0;

  const relSignal = REL_SIGNAL_MAP[relType.toLowerCase()];
  if (relSignal && weights[relSignal]) {
    score += weights[relSignal];
  }

  const titleSignals = detectTitleSignals(contact.title);
  for (const signal of titleSignals) {
    if (weights[signal]) {
      score += weights[signal];
    }
  }

  if (contact.email && weights.email_available) {
    score += weights.email_available;
  }

  if (contact.phoneMobile && weights.mobile_available) {
    score += weights.mobile_available;
  }

  return Math.min(score, 100);
}

function classifyTier(score: number, relType: string, title: string | null): BrokerTier {
  const rel = relType.toLowerCase();
  if (["owner", "operator", "manager"].includes(rel) && score >= 40) return "Primary";
  const titleSignals = detectTitleSignals(title);
  if (titleSignals.some((s) => ["chief_pilot", "dom", "scheduler", "dispatch", "director_aviation"].includes(s))) return "Aviation Ops";
  if (titleSignals.some((s) => ["cfo", "controller"].includes(s))) return "Finance/Admin";
  if (titleSignals.some((s) => s === "executive_assistant")) return "Secondary";
  if (score >= 20) return "Secondary";
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
  if (t.includes("dispatch")) return "Dispatch";
  if (t.includes("cfo") || t.includes("controller")) return "Controller/CFO";
  if (t.includes("director of aviation")) return "Director of Aviation";
  if (t.includes("executive assistant") || t.includes("assistant to")) return "Executive Assistant";
  return relType || "Contact";
}

function computePreferredChannels(contact: ContactNode): ("email" | "sms" | "call")[] {
  const channels: ("email" | "sms" | "call")[] = [];
  if (contact.email) channels.push("email");
  if (contact.phoneMobile) channels.push("sms");
  if (contact.phoneMobile || contact.phoneOffice) channels.push("call");
  return channels;
}

function computeReasons(contact: ContactNode, relType: string, tier: BrokerTier): string[] {
  const reasons: string[] = [];
  const rel = relType.toLowerCase();
  if (["owner", "operator", "manager"].includes(rel)) {
    reasons.push(`${relType} relationship — direct decision authority`);
  }
  const titleSignals = detectTitleSignals(contact.title);
  if (titleSignals.length > 0) {
    reasons.push(`Title "${contact.title}" indicates relevant operational role`);
  }
  if (contact.email) reasons.push("Email available for outreach");
  if (contact.phoneMobile) reasons.push("Mobile phone available for direct contact");
  if (reasons.length === 0) reasons.push(`${tier} tier contact`);
  return reasons;
}

export function rankContactsForPersona(
  personaId: PersonaId,
  graph: RelationshipGraph
): BrokerContact[] {
  const { companies, contacts, edges } = graph;

  const companyMap = new Map<number, CompanyNode>();
  for (const c of companies) companyMap.set(c.companyId, c);

  const contactMap = new Map<number | null, ContactNode>();
  for (const c of contacts) contactMap.set(c.contactId, c);

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
    const score = computePersonaScore(personaId, contact, relType, edges);
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
      if (contact.email && !existing.emails.includes(contact.email)) existing.emails.push(contact.email);
      if (contact.phoneMobile && !existing.phones.mobile) existing.phones.mobile = contact.phoneMobile;
      if (contact.phoneOffice && !existing.phones.work) existing.phones.work = contact.phoneOffice;
      existing.preferredChannels = Array.from(new Set([...existing.preferredChannels, ...preferredChannels])) as ("email" | "sms" | "call")[];
      continue;
    }

    seen.set(dedupKey, {
      contactId: contact.contactId,
      companyId: company?.companyId ?? null,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      companyName: company?.companyName ?? "",
      relationshipType: relType,
      emails: contact.email ? [contact.email] : [],
      phones: { mobile: contact.phoneMobile ?? null, work: contact.phoneOffice ?? null },
      tier, score, reasons, preferredChannels, roleBadge,
    });
  }

  const results = Array.from(seen.values());
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return `${a.lastName} ${a.firstName}`.toLowerCase().localeCompare(`${b.lastName} ${b.firstName}`.toLowerCase());
  });

  return results;
}
