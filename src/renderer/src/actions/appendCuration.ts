import type { TablesFile, Curation } from '../types';


export function appendCuration(file: TablesFile, curation: Curation): TablesFile {
  const existingCurations = Array.isArray(file.metadata?.['curations'])
    ? (file.metadata!['curations'] as Curation[])
    : [];
  return {
    ...file,
    metadata: { ...(file.metadata ?? {}), curations: [...existingCurations, curation] }
  };
}
