import type { DriverRecord, DriverRecordsPayload } from '@/types/data'

export function parseDriverRecords(payload: DriverRecordsPayload): DriverRecord[] {
  const idx = Object.fromEntries(payload.fields.map((f, i) => [f, i]))
  return payload.rows.map((row) => ({
    id: String(row[idx.id]),
    ace: Number(row[idx.ace]),
    sleep: Number(row[idx.sleep]),
    social: Number(row[idx.social]),
    depression: Number(row[idx.depression]),
    fi: Number(row[idx.fi]),
    frailty_cat: String(row[idx.frailty_cat]),
    alone: (Number(row[idx.alone]) === 1 ? 1 : 0) as 0 | 1,
    gender: (row[idx.gender] as DriverRecord['gender']) ?? null,
    rural: row[idx.rural] != null ? (Number(row[idx.rural]) as 0 | 1) : null,
  }))
}

export function filterRecordsByIds(records: DriverRecord[], ids: string[]): DriverRecord[] {
  if (!ids.length) return records
  const set = new Set(ids)
  return records.filter((r) => set.has(r.id))
}
