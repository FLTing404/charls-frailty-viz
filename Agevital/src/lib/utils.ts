import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatPercent(p: number, digits = 1): string {
  if (!Number.isFinite(p)) return '—'
  return `${(p * 100).toFixed(digits)}%`
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
