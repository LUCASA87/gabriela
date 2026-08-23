import { CUCA_ID, defaultCucaRecipe } from './recipe'
import type { AppState, Purchase, Recipe } from './types'
import { uid } from './utils'

const KEY = 'forno-gabriela-v3'
const LEGACY_KEYS = ['forno-gabriela-v2', 'forno-gabriela-v1']

export function defaultState(): AppState {
  const recipe = defaultCucaRecipe()
  return {
    products: [
      {
        id: recipe.id,
        name: recipe.name,
        type: 'cuca',
        salePrice: recipe.salePrice,
        unitCost: 0,
      },
      {
        id: uid(),
        name: 'Pão caseiro',
        type: 'pao',
        salePrice: 8,
        unitCost: 3.5,
      },
      {
        id: uid(),
        name: 'Pão francês',
        type: 'pao',
        salePrice: 1.2,
        unitCost: 0.45,
      },
    ],
    sales: [],
    expenses: [],
    purchases: [],
    recipes: [recipe],
    activeRecipeId: recipe.id,
  }
}

function migratePurchases(raw: unknown[], recipeId: string): Purchase[] {
  return raw.map((item) => {
    const buy = item as Purchase & { recipeId?: string }
    return {
      id: buy.id,
      date: buy.date,
      recipeId: buy.recipeId ?? recipeId,
      ingredientId: buy.ingredientId,
      quantity: buy.quantity,
      unit: buy.unit,
      amount: buy.amount,
    }
  })
}

function migrateRecipes(parsed: Partial<AppState> & { recipe?: unknown }): Recipe[] {
  if (Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
    return parsed.recipes
  }
  const old = parsed.recipe as
    | {
        batchSize?: number
        salePrice?: number
        dough?: Record<string, number>
        farofa?: Record<string, number>
      }
    | undefined
  const base = defaultCucaRecipe()
  if (!old) return [base]
  return [
    {
      ...base,
      batchSize: old.batchSize ?? base.batchSize,
      salePrice: old.salePrice ?? base.salePrice,
      ingredients: base.ingredients.map((item) => ({
        ...item,
        dough: old.dough?.[item.id] ?? item.dough,
        farofa: old.farofa?.[item.id] ?? item.farofa,
      })),
    },
  ]
}

function withDefaults(parsed: Partial<AppState> & { recipe?: unknown }): AppState {
  const recipes = migrateRecipes(parsed)
  const activeRecipeId =
    recipes.some((item) => item.id === parsed.activeRecipeId) && parsed.activeRecipeId
      ? parsed.activeRecipeId
      : recipes[0].id
  const purchases = migratePurchases(parsed.purchases ?? [], CUCA_ID)
  const products = parsed.products ?? []
  const synced = recipes.reduce((list, recipe) => {
    const exists = list.some((product) => product.id === recipe.id)
    if (exists) {
      return list.map((product) =>
        product.id === recipe.id
          ? { ...product, name: recipe.name, salePrice: recipe.salePrice }
          : product,
      )
    }
    return [
      {
        id: recipe.id,
        name: recipe.name,
        type: 'cuca' as const,
        salePrice: recipe.salePrice,
        unitCost: 0,
      },
      ...list,
    ]
  }, products)

  return {
    products: synced,
    sales: parsed.sales ?? [],
    expenses: parsed.expenses ?? [],
    purchases,
    recipes,
    activeRecipeId,
  }
}

export function normalizeState(parsed: Partial<AppState> & { recipe?: unknown }): AppState {
  return withDefaults(parsed)
}

export function loadState(): AppState {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      for (const legacy of LEGACY_KEYS) {
        raw = localStorage.getItem(legacy)
        if (raw) break
      }
    }
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed.products || !parsed.sales || !parsed.expenses) {
      return defaultState()
    }
    return withDefaults(parsed)
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}
