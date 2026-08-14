/** Local calendar day → unix seconds. Used by dashboard and NFS-e filters. */
export function dayStartUnix(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000);
}

export function dayEndUnix(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(new Date(year, month - 1, day, 23, 59, 59).getTime() / 1000);
}
