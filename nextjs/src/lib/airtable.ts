// lib/airtable.ts
import 'server-only';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const token = process.env.AIRTABLE_TOKEN!;
const baseId = process.env.AIRTABLE_ADVICE_BASE_ID!;
const table = process.env.AIRTABLE_ADVICE_TABLE!;

export type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  createdTime: string;
  fields: T;
};

export type AirtableListResponse<T> = {
  records: AirtableRecord<T>[];
  offset?: string; // for pagination
};

type Sort = { field: string; direction?: 'asc' | 'desc' };

export async function listRecords<T>(
  opts: {
    view?: string;
    maxRecords?: number;
    offset?: string;
    filterByFormula?: string;
    sort?: Sort[];
    pageSize?: number; // up to 100
  } = {},
  revalidate?: number // seconds; omit to disable cache
): Promise<AirtableListResponse<T>> {
  if (!token || !baseId || !table) {
    throw new Error('Missing Airtable env vars');
  }

  const url = new URL(`${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(table)}`);
  const sp = new URLSearchParams();

  if (opts.view) sp.set('view', opts.view);
  if (opts.maxRecords) sp.set('maxRecords', String(opts.maxRecords));
  if (opts.pageSize) sp.set('pageSize', String(opts.pageSize));
  if (opts.offset) sp.set('offset', opts.offset);
  if (opts.filterByFormula) sp.set('filterByFormula', opts.filterByFormula);
  if (opts.sort) {
    opts.sort.forEach((s, i) => {
      sp.set(`sort[${i}][field]`, s.field);
      if (s.direction) sp.set(`sort[${i}][direction]`, s.direction);
    });
  }
  url.search = sp.toString();

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    // Use Next.js caching if you want ISR:
    ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return (await res.json()) as AirtableListResponse<T>;
}
