/** Human-facing desk code shown in UI and in-world tooltips ("desk-dev-01" → "DEV-01"). */
export function deskCode(deskId: string): string {
  return deskId.replace(/^desk-/, '').toUpperCase();
}
