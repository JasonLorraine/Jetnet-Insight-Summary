import type {
  RelationshipGraph,
  CompanyNode,
  ContactNode,
  RelationshipEdge,
} from "../../shared/types";

export function normalizeRelationships(raw: Record<string, unknown>): RelationshipGraph {
  const companiesMap = new Map<number, CompanyNode>();
  const contactsMap = new Map<string, ContactNode>();
  const edgesSet = new Set<string>();
  const edges: RelationshipEdge[] = [];

  const items =
    (raw as any)?.aircraftrelationshipresult ||
    (raw as any)?.relationships ||
    [];

  if (!Array.isArray(items)) {
    return { companies: [], contacts: [], edges: [] };
  }

  for (const item of items) {
    const acid: number = item.aircraftid || item.aircraftId || 0;
    const rels = item.companyrelationships || item.relationships || [item];
    const relList = Array.isArray(rels) ? rels : [rels];

    for (const rel of relList) {
      const companyId: number | null = rel.companyid || rel.companyId || null;
      const companyName: string =
        rel.name || rel.companyname || rel.companyName || "Unknown";
      const relationshipType: string =
        rel.relationtype ||
        rel.companyrelation ||
        rel.relationType ||
        "Unknown";

      if (companyId != null && !companiesMap.has(companyId)) {
        companiesMap.set(companyId, {
          companyId,
          companyName,
          role: relationshipType,
          city: rel.city || null,
          state: rel.state || null,
          country: rel.country || null,
        });
      }

      const firstName: string =
        rel.contactfirstname || rel.owrfname || rel.firstname || "";
      const lastName: string =
        rel.contactlastname || rel.owrlname || rel.lastname || "";

      if (!firstName && !lastName) {
        if (companyId != null && acid) {
          const edgeKey = `${acid}|${companyId}|null|${relationshipType}`;
          if (!edgesSet.has(edgeKey)) {
            edgesSet.add(edgeKey);
            edges.push({ acid, companyId, contactId: null, relationshipType });
          }
        }
        continue;
      }

      const contactIdRaw = rel.contactid || rel.contactId || null;
      const contactId: number | null =
        contactIdRaw != null ? Number(contactIdRaw) : null;
      const email: string | null = rel.email || rel.contactemail || null;
      const mobile: string | null = rel.mobile || rel.mobilephone || rel.cellphone || null;
      const office: string | null = rel.office || rel.phone || rel.officephone || rel.directphone || null;
      const title: string | null = rel.title || rel.contacttitle || null;

      const contactKey =
        contactId != null ? String(contactId) : `name:${firstName}|${lastName}`;

      if (contactsMap.has(contactKey)) {
        const existing = contactsMap.get(contactKey)!;
        if (!existing.email && email) existing.email = email;
        if (!existing.phoneMobile && mobile) existing.phoneMobile = mobile;
        if (!existing.phoneOffice && office) existing.phoneOffice = office;
        if (!existing.title && title) existing.title = title;
      } else {
        contactsMap.set(contactKey, {
          contactId,
          firstName,
          lastName,
          title,
          email,
          phoneMobile: mobile,
          phoneOffice: office,
        });
      }

      if (acid) {
        const edgeKey = `${acid}|${companyId}|${contactKey}|${relationshipType}`;
        if (!edgesSet.has(edgeKey)) {
          edgesSet.add(edgeKey);
          edges.push({
            acid,
            companyId,
            contactId,
            relationshipType,
          });
        }
      }
    }
  }

  return {
    companies: Array.from(companiesMap.values()),
    contacts: Array.from(contactsMap.values()),
    edges,
  };
}
