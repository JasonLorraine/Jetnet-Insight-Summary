const EVOLUTION_BASE_URL =
  process.env.EVOLUTION_BASE_URL || "https://evolution.jetnet.com";

export function buildEvolutionLink(aircraftId: number): string {
  return `${EVOLUTION_BASE_URL}/aircraft/${aircraftId}`;
}
