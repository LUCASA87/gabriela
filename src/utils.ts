import type { AppState, ExpenseCategory, ProductType } from './types'

export const PRODUCT_TYPES: { id: ProductType; label: string; plural: string }[] = [
  { id: 'pao', label: 'Pão', plural: 'Pães' },
  { id: 'cuca', label: 'Cuca', plural: 'Cucas' },
  { id: 'outro', label: 'Outro', plural: 'Outros' },
]

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'embalagem', label: 'Embalagem' },
  { id: 'gas_energia', label: 'Gás e energia' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'mao_de_obra', label: 'Mão de obra' },
  { id: 'outros', label: 'Outros' },
]

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatMoney(value: number): string {
  return money.format(value)
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function dateForMonth(month: string): string {
  return todayISO().startsWith(month) ? todayISO() : `${month}-01`
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1, 1)
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function inMonth(date: string, month: string): boolean {
  return date.startsWith(month)
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'item'
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function uid(prefix = 'id'): string {
  const n = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${n}`
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const data = value as AppState
  return (
    Array.isArray(data.products) &&
    Array.isArray(data.sales) &&
    Array.isArray(data.expenses) &&
    (data.purchases === undefined || Array.isArray(data.purchases))
  )
}
