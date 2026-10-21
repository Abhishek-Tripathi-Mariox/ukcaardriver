import type { DriverDocument } from '../services/api';

/** Carry successful uploads between registration steps without waiting for a cached profile read. */
export function mergeRegistrationDocuments(existing: DriverDocument[] = [], uploaded: Record<string, string | null>): DriverDocument[] {
  const documents = new Map(existing.map(document => [document.type, document]));
  for (const [type, url] of Object.entries(uploaded)) {
    if (!url || documents.get(type)?.url === url) continue;
    documents.set(type, { type, url, status: 'pending' });
  }
  return [...documents.values()];
}
