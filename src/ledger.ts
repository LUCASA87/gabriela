import { recipeCost } from './recipe'
import type { AppState, ExpenseCategory, ProductType } from './types'
import { inMonth } from './utils'

export interface TypeTotals {
  type: ProductType
  quantity: number
  revenue: number
  estimatedCost: number
  estimatedProfit: number
}

export interface ProductTotals {
  productId: string
  name: string
  type: ProductType
  quantity: number
  revenue: number
  estimatedCost: number
  estimatedProfit: number
}

export interface MonthSummary {
  revenue: number
  expenses: number
  profit: number
  margin: number
  quantity: number
  estimatedCost: number
  byType: TypeTotals[]
  byProduct: ProductTotals[]
  byExpenseCategory: { category: ExpenseCategory; amount: number }[]
}

export function monthSummary(state: AppState, month: string): MonthSummary {
  const sales = state.sales.filter((sale) => inMonth(sale.date, month))
  const expenses = state.expenses.filter((item) => inMonth(item.date, month))
  const purchases = state.purchases.filter((item) => inMonth(item.date, month))
  const productMap = new Map(state.products.map((p) => [p.id, p]))

  let revenue = 0
  let quantity = 0
  let estimatedCost = 0

  const typeMap = new Map<ProductType, TypeTotals>()
  const productTotals = new Map<string, ProductTotals>()

  for (const type of ['pao', 'cuca', 'outro'] as ProductType[]) {
    typeMap.set(type, {
      type,
      quantity: 0,
      revenue: 0,
      estimatedCost: 0,
      estimatedProfit: 0,
    })
  }

  for (const sale of sales) {
    const product = productMap.get(sale.productId)
    const lineRevenue = sale.quantity * sale.unitPrice
    const unitCost = recipeCost(state, sale.productId) ?? product?.unitCost ?? 0
    const lineCost = sale.quantity * unitCost
    const type = product?.type ?? 'outro'

    revenue += lineRevenue
    quantity += sale.quantity
    estimatedCost += lineCost

    const typeRow = typeMap.get(type)!
    typeRow.quantity += sale.quantity
    typeRow.revenue += lineRevenue
    typeRow.estimatedCost += lineCost
    typeRow.estimatedProfit = typeRow.revenue - typeRow.estimatedCost

    const key = sale.productId
    const existing = productTotals.get(key)
    if (existing) {
      existing.quantity += sale.quantity
      existing.revenue += lineRevenue
      existing.estimatedCost += lineCost
      existing.estimatedProfit = existing.revenue - existing.estimatedCost
    } else {
      productTotals.set(key, {
        productId: sale.productId,
        name: product?.name ?? 'Produto removido',
        type,
        quantity: sale.quantity,
        revenue: lineRevenue,
        estimatedCost: lineCost,
        estimatedProfit: lineRevenue - lineCost,
      })
    }
  }

  const purchaseTotal = purchases.reduce((sum, item) => sum + item.amount, 0)
  const expenseTotal =
    expenses.reduce((sum, item) => sum + item.amount, 0) + purchaseTotal
  const byExpense = new Map<ExpenseCategory, number>()
  for (const item of expenses) {
    byExpense.set(item.category, (byExpense.get(item.category) ?? 0) + item.amount)
  }
  if (purchaseTotal > 0) {
    byExpense.set('ingredientes', (byExpense.get('ingredientes') ?? 0) + purchaseTotal)
  }

  const profit = revenue - expenseTotal
  const margin = revenue === 0 ? 0 : (profit / revenue) * 100

  return {
    revenue,
    expenses: expenseTotal,
    profit,
    margin,
    quantity,
    estimatedCost,
    byType: [...typeMap.values()],
    byProduct: [...productTotals.values()].sort((a, b) => b.revenue - a.revenue),
    byExpenseCategory: [...byExpense.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}

export function lastMonths(state: AppState, current: string, count: number) {
  const [year, month] = current.split('-').map(Number)
  const rows = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1 - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const summary = monthSummary(state, key)
    rows.push({
      month: key,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', ''),
      revenue: summary.revenue,
      expenses: summary.expenses,
      profit: summary.profit,
    })
  }
  return rows
}
