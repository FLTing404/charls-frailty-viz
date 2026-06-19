import type { DriverRecord, DriverRecordsPayload } from '@/types/data'

function safeNum(v: unknown): number {
  if (v == null) return NaN
  const n = Number(v)
  return Number.isNaN(n) ? NaN : n
}

export function parseDriverRecords(payload: DriverRecordsPayload): DriverRecord[] {
  const idx = Object.fromEntries(payload.fields.map((f, i) => [f, i]))
  return payload.rows.map((row) => ({
    id: String(row[idx.id]),
    ace: safeNum(row[idx.ace]),
    sleep: safeNum(row[idx.sleep]),
    social: safeNum(row[idx.social]),
    depression: safeNum(row[idx.depression]),
    fi: safeNum(row[idx.fi]),
    ses: safeNum(row[idx.ses]),
    healthcare: safeNum(row[idx.healthcare]),
    activity: safeNum(row[idx.activity]),
    scap: safeNum(row[idx.scap]),
    material: safeNum(row[idx.material]),
    frailty_cat: String(row[idx.frailty_cat]),
    alone: (Number(row[idx.alone]) === 1 ? 1 : 0) as 0 | 1,
    gender: (row[idx.gender] as DriverRecord['gender']) ?? null,
    rural: row[idx.rural] != null ? (Number(row[idx.rural]) as 0 | 1) : null,
    province: idx.province !== undefined ? (row[idx.province] as string | null) : null,
  }))
}

export function filterRecordsByIds(records: DriverRecord[], ids: string[]): DriverRecord[] {
  if (!ids.length) return records
  const set = new Set(ids)
  return records.filter((r) => set.has(r.id))
}
