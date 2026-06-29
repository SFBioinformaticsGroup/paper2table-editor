

export function uniqueName(desired: string, existing: Set<string>): string {
  if (!existing.has(desired)) return desired
  let i = 2
  while (existing.has(`${desired}_${i}`)) i++
  return `${desired}_${i}`
}
