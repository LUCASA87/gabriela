import { CUCA_ID, defaultCucaRecipe } from './recipe'
import { supabase } from './supabase'
import type {
  AppState,
  Expense,
  ExpenseCategory,
  IngredientUnit,
  Product,
  ProductType,
  Purchase,
  PurchaseUnit,
  Recipe,
  RecipeIngredient,
  Sale,
} from './types'
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

export function loadCachedState(): AppState {
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

export function saveCachedState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function num(value: unknown): number {
  return Number(value ?? 0)
}

async function upsertRows(
  table: string,
  rows: Record<string, unknown>[],
  onConflict?: string,
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined)
  if (error) throw error
}

async function deleteMissing(
  table: string,
  keepIds: string[],
): Promise<void> {
  const { data: existing, error: readError } = await supabase.from(table).select('id')
  if (readError) throw readError

  const keep = new Set(keepIds)
  const remove = (existing ?? [])
    .map((row) => String((row as { id: string }).id))
    .filter((id) => !keep.has(id))

  if (remove.length === 0) return
  const { error } = await supabase.from(table).delete().in('id', remove)
  if (error) throw error
}

export async function loadFromDatabase(): Promise<AppState | null> {
  const [products, recipes, ingredients, sales, expenses, purchases, settings] =
    await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('recipes').select('*'),
      supabase.from('recipe_ingredients').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('purchases').select('*'),
      supabase.from('settings').select('*').eq('id', 'app').maybeSingle(),
    ])

  const firstError =
    products.error ||
    recipes.error ||
    ingredients.error ||
    sales.error ||
    expenses.error ||
    purchases.error ||
    settings.error

  if (firstError) throw firstError

  if ((recipes.data ?? []).length === 0 && (products.data ?? []).length === 0) {
    return null
  }

  const byRecipe = new Map<string, RecipeIngredient[]>()
  for (const row of ingredients.data ?? []) {
    const recipeId = String(row.recipe_id)
    const rawId = String(row.id)
    const key = String(
      row.ingredient_key ||
        (rawId.startsWith(`${recipeId}__`) ? rawId.slice(recipeId.length + 2) : rawId),
    )
    const item: RecipeIngredient = {
      id: key,
      name: row.name,
      unit: row.unit as IngredientUnit,
      dough: num(row.dough),
      farofa: num(row.farofa),
    }
    const list = byRecipe.get(row.recipe_id) ?? []
    list.push(item)
    byRecipe.set(row.recipe_id, list)
  }

  return normalizeState({
    products: (products.data ?? []).map(
      (row): Product => ({
        id: row.id,
        name: row.name,
        type: row.type as ProductType,
        salePrice: num(row.sale_price),
        unitCost: num(row.unit_cost),
      }),
    ),
    recipes: (recipes.data ?? []).map(
      (row): Recipe => ({
        id: row.id,
        name: row.name,
        batchSize: num(row.batch_size),
        salePrice: num(row.sale_price),
        ingredients: byRecipe.get(row.id) ?? [],
      }),
    ),
    sales: (sales.data ?? []).map(
      (row): Sale => ({
        id: row.id,
        date: row.date,
        productId: row.product_id,
        quantity: num(row.quantity),
        unitPrice: num(row.unit_price),
        note: row.note ?? '',
      }),
    ),
    expenses: (expenses.data ?? []).map(
      (row): Expense => ({
        id: row.id,
        date: row.date,
        category: row.category as ExpenseCategory,
        description: row.description,
        amount: num(row.amount),
      }),
    ),
    purchases: (purchases.data ?? []).map(
      (row): Purchase => ({
        id: row.id,
        date: row.date,
        recipeId: row.recipe_id,
        ingredientId: row.ingredient_id,
        quantity: num(row.quantity),
        unit: row.unit as PurchaseUnit,
        amount: num(row.amount),
      }),
    ),
    activeRecipeId: settings.data?.active_recipe_id ?? recipes.data?.[0]?.id ?? CUCA_ID,
  })
}

export async function saveToDatabase(state: AppState): Promise<void> {
  const recipeRows = state.recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    batch_size: recipe.batchSize,
    sale_price: recipe.salePrice,
  }))
  const ingredientRows = state.recipes.flatMap((recipe) =>
    recipe.ingredients.map((item) => ({
      id: `${recipe.id}__${item.id}`,
      recipe_id: recipe.id,
      ingredient_key: item.id,
      name: item.name,
      unit: item.unit,
      dough: item.dough,
      farofa: item.farofa,
    })),
  )
  const productRows = state.products.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.type,
    sale_price: product.salePrice,
    unit_cost: product.unitCost,
  }))
  const saleRows = state.sales.map((sale) => ({
    id: sale.id,
    date: sale.date,
    product_id: sale.productId,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
    note: sale.note,
  }))
  const expenseRows = state.expenses.map((item) => ({
    id: item.id,
    date: item.date,
    category: item.category,
    description: item.description,
    amount: item.amount,
  }))
  const purchaseRows = state.purchases.map((item) => ({
    id: item.id,
    date: item.date,
    recipe_id: item.recipeId,
    ingredient_id: item.ingredientId,
    quantity: item.quantity,
    unit: item.unit,
    amount: item.amount,
  }))

  await upsertRows('recipes', recipeRows)
  await upsertRows('recipe_ingredients', ingredientRows)
  await deleteMissing(
    'recipe_ingredients',
    ingredientRows.map((row) => row.id),
  )
  await deleteMissing(
    'recipes',
    recipeRows.map((row) => row.id),
  )

  await upsertRows('products', productRows)
  await upsertRows('sales', saleRows)
  await upsertRows('expenses', expenseRows)
  await upsertRows('purchases', purchaseRows)

  await deleteMissing(
    'purchases',
    purchaseRows.map((row) => row.id),
  )
  await deleteMissing(
    'sales',
    saleRows.map((row) => row.id),
  )
  await deleteMissing(
    'expenses',
    expenseRows.map((row) => row.id),
  )
  await deleteMissing(
    'products',
    productRows.map((row) => row.id),
  )

  const { error } = await supabase.from('settings').upsert({
    id: 'app',
    active_recipe_id: state.activeRecipeId,
  })
  if (error) throw error
}
