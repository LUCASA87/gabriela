import type {
  AppState,
  IngredientUnit,
  ProductType,
  PurchaseUnit,
  Recipe,
  RecipeIngredient,
} from './types'

export const CUCA_ID = 'cuca'
export const CUCA_PRICE = 18
export const BATCH_SIZE = 10

const DEFAULT_ITEMS: Omit<RecipeIngredient, 'dough' | 'farofa'>[] = [
  { id: 'farinha', name: 'Farinha de trigo', unit: 'g' },
  { id: 'fermento', name: 'Fermento em pó', unit: 'g' },
  { id: 'acucar', name: 'Açúcar', unit: 'g' },
  { id: 'sal', name: 'Sal', unit: 'g' },
  { id: 'margarina', name: 'Margarina', unit: 'g' },
  { id: 'ovos', name: 'Ovos', unit: 'un' },
  { id: 'leite_po', name: 'Leite em pó', unit: 'g' },
]

const DEFAULT_DOUGH: Record<string, number> = {
  farinha: 3000,
  fermento: 250,
  acucar: 100,
  sal: 60,
  margarina: 200,
  ovos: 10,
  leite_po: 80,
}

const DEFAULT_FAROFA: Record<string, number> = {
  farinha: 250,
  fermento: 0,
  acucar: 250,
  sal: 0,
  margarina: 60,
  ovos: 0,
  leite_po: 0,
}

export function defaultCucaRecipe(): Recipe {
  return {
    id: CUCA_ID,
    name: 'Cuca',
    batchSize: BATCH_SIZE,
    salePrice: CUCA_PRICE,
    readyStock: 0,
    ingredients: DEFAULT_ITEMS.map((item) => ({
      ...item,
      dough: DEFAULT_DOUGH[item.id] ?? 0,
      farofa: DEFAULT_FAROFA[item.id] ?? 0,
    })),
  }
}

export function emptyRecipe(id: string, name: string): Recipe {
  return {
    id,
    name,
    batchSize: 10,
    salePrice: 0,
    readyStock: 0,
    ingredients: [],
  }
}

export function recipeType(name: string): ProductType {
  const value = name.toLowerCase()
  if (value.includes('cuca')) return 'cuca'
  if (value.includes('pão') || value.includes('pao')) return 'pao'
  return 'outro'
}

export function activeRecipe(state: AppState): Recipe {
  return (
    state.recipes.find((item) => item.id === state.activeRecipeId) ??
    state.recipes[0] ??
    defaultCucaRecipe()
  )
}

export function recipeById(state: AppState, id: string): Recipe | undefined {
  return state.recipes.find((item) => item.id === id)
}

export function adjustReadyStock(state: AppState, productId: string, delta: number): AppState {
  if (!state.recipes.some((item) => item.id === productId)) return state
  return {
    ...state,
    recipes: state.recipes.map((recipe) =>
      recipe.id === productId
        ? { ...recipe, readyStock: Math.max(0, (recipe.readyStock ?? 0) + delta) }
        : recipe,
    ),
  }
}

export function ingredientOf(recipe: Recipe, id: string): RecipeIngredient | undefined {
  return recipe.ingredients.find((item) => item.id === id)
}

export function amountsPerItem(recipe: Recipe): Record<string, number> {
  const batch = Math.max(1, recipe.batchSize)
  const map: Record<string, number> = {}
  for (const item of recipe.ingredients) {
    map[item.id] = item.dough / batch + item.farofa
  }
  return map
}

export function toBaseQuantity(
  quantity: number,
  unit: PurchaseUnit,
  ingredientUnit: IngredientUnit,
): number {
  if (ingredientUnit === 'un') return quantity
  if (unit === 'kg') return quantity * 1000
  return quantity
}

export function formatQty(amount: number, unit: IngredientUnit): string {
  const safe = Math.max(0, amount)
  if (unit === 'un') {
    const rounded = Math.round(safe * 10) / 10
    return `${rounded.toLocaleString('pt-BR')} un`
  }
  if (safe >= 1000) {
    return `${(safe / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
  }
  return `${safe.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} g`
}

export function itemsSold(state: AppState, recipeId: string): number {
  return state.sales
    .filter((sale) => sale.productId === recipeId)
    .reduce((sum, sale) => sum + sale.quantity, 0)
}

export interface IngredientAnalysis {
  id: string
  label: string
  unit: IngredientUnit
  purchased: number
  consumed: number
  stock: number
  perItem: number
  doughPerItem: number
  farofaPerItem: number
  yield: number
  leftover: number
  usedIfBake: number
  unitCost: number
  costInItem: number
  hasPrice: boolean
  missingForNext: number
}

export interface RecipeAnalysis {
  recipe: Recipe
  ingredients: IngredientAnalysis[]
  maxItems: number
  limiting: string[]
  costPerItem: number
  salePrice: number
  profitPerItem: number
  potentialRevenue: number
  potentialProfit: number
  itemsSold: number
  completeCost: boolean
}

export function analyzeRecipe(state: AppState, recipeId = state.activeRecipeId): RecipeAnalysis {
  const recipe = recipeById(state, recipeId) ?? activeRecipe(state)
  const perItemMap = amountsPerItem(recipe)
  const purchased: Record<string, number> = {}
  const spent: Record<string, number> = {}

  for (const item of recipe.ingredients) {
    purchased[item.id] = 0
    spent[item.id] = 0
  }

  for (const buy of state.purchases) {
    if (buy.recipeId !== recipe.id) continue
    const meta = ingredientOf(recipe, buy.ingredientId)
    if (!meta) continue
    purchased[buy.ingredientId] =
      (purchased[buy.ingredientId] ?? 0) + toBaseQuantity(buy.quantity, buy.unit, meta.unit)
    spent[buy.ingredientId] = (spent[buy.ingredientId] ?? 0) + buy.amount
  }

  const sold = itemsSold(state, recipe.id)

  const rows: IngredientAnalysis[] = recipe.ingredients.map((item) => {
    const perItem = perItemMap[item.id] ?? 0
    const stock = (purchased[item.id] ?? 0) - sold * perItem
    const yieldCount = perItem > 0 ? Math.floor(Math.max(0, stock) / perItem) : Number.POSITIVE_INFINITY
    const bought = purchased[item.id] ?? 0
    const paid = spent[item.id] ?? 0
    const hasPrice = bought > 0 && paid > 0
    const unitCost = bought > 0 ? paid / bought : 0

    return {
      id: item.id,
      label: item.name,
      unit: item.unit,
      purchased: bought,
      consumed: sold * perItem,
      stock,
      perItem,
      doughPerItem: item.dough / Math.max(1, recipe.batchSize),
      farofaPerItem: item.farofa,
      yield: Number.isFinite(yieldCount) ? yieldCount : Number.POSITIVE_INFINITY,
      leftover: 0,
      usedIfBake: 0,
      unitCost,
      costInItem: perItem * unitCost,
      hasPrice,
      missingForNext: 0,
    }
  })

  const usedRows = rows.filter((row) => row.perItem > 0)
  const maxItems = usedRows.length === 0 ? 0 : Math.min(...usedRows.map((row) => row.yield))
  const limiting = usedRows.filter((row) => row.yield === maxItems).map((row) => row.id)

  for (const row of rows) {
    row.usedIfBake = maxItems * row.perItem
    row.leftover = Math.max(0, row.stock - row.usedIfBake)
    row.missingForNext = Math.max(0, row.perItem * (maxItems + 1) - row.stock)
  }

  const costPerItem = rows.reduce((sum, row) => sum + row.costInItem, 0)
  const profitPerItem = recipe.salePrice - costPerItem
  const onHand = Math.max(0, recipe.readyStock ?? 0)

  return {
    recipe,
    ingredients: rows,
    maxItems: Number.isFinite(maxItems) ? maxItems : 0,
    limiting,
    costPerItem,
    salePrice: recipe.salePrice,
    profitPerItem,
    potentialRevenue: onHand * recipe.salePrice,
    potentialProfit: onHand * profitPerItem,
    itemsSold: sold,
    completeCost: usedRows.length > 0 && usedRows.every((row) => row.hasPrice),
  }
}

export function recipeCost(state: AppState, productId: string): number | undefined {
  if (!state.recipes.some((item) => item.id === productId)) return undefined
  return analyzeRecipe(state, productId).costPerItem
}
