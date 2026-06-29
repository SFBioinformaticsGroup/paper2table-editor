export function sortByPinnedAndArchived(fileNames: string[], pinnedPapers: string[], archivedPapers: string[]): string[] {
  const pinnedSet = new Set(pinnedPapers)
  const archivedSet = new Set(archivedPapers)
  return [
    ...fileNames.filter((f) => pinnedSet.has(f)),
    ...fileNames.filter((f) => !pinnedSet.has(f) && !archivedSet.has(f)),
    ...fileNames.filter((f) => archivedSet.has(f))
  ]
}

export function togglePinned(pinnedPapers: string[], fileName: string): string[] {
  return pinnedPapers.includes(fileName)
    ? pinnedPapers.filter((f) => f !== fileName)
    : [...pinnedPapers, fileName]
}

export function toggleArchived(archivedPapers: string[], fileName: string): string[] {
  return archivedPapers.includes(fileName)
    ? archivedPapers.filter((f) => f !== fileName)
    : [...archivedPapers, fileName]
}
