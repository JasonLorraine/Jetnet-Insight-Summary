const EVOLUTION_BASE_URL =
  process.env.EVOLUTION_BASE_URL || "https://www.jetnetevolution.com";

export function buildEvolutionAircraftLink(
  aircraftId: number,
  securityToken: string,
  pageUrl?: string | null
): string {
  if (pageUrl && typeof pageUrl === "string" && pageUrl.startsWith("http")) {
    return pageUrl;
  }
  return `${EVOLUTION_BASE_URL}/DisplayAircraftDetail.aspx?acid=${aircraftId}&securityToken=${encodeURIComponent(securityToken)}`;
}

export function buildEvolutionCompanyLink(
  companyId: number,
  securityToken: string,
  pageUrl?: string | null
): string {
  if (pageUrl && typeof pageUrl === "string" && pageUrl.startsWith("http")) {
    return pageUrl;
  }
  return `${EVOLUTION_BASE_URL}/DisplayCompanyDetail.aspx?compid=${companyId}&securityToken=${encodeURIComponent(securityToken)}`;
}

export function buildEvolutionLink(aircraftId: number): string {
  return `${EVOLUTION_BASE_URL}/DisplayAircraftDetail.aspx?acid=${aircraftId}`;
}
