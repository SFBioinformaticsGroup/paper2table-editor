import type { TablesFile } from '../types';

export function withFilenameInMetadata(file: TablesFile, fileName: string): TablesFile {
  if (file.metadata && typeof file.metadata.filename === 'string') return file;
  return { ...file, metadata: { ...(file.metadata ?? {}), filename: fileName } };
}
