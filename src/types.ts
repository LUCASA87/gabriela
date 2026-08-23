export type ProductType = 'pao' | 'cuca' | 'outro'

export type ExpenseCategory =
  | 'ingredientes'
  | 'embalagem'
  | 'gas_energia'
  | 'transporte'
  | 'mao_de_obra'
  | 'outros'

export type IngredientUnit = 'g' | 'un'
export type PurchaseUnit = 'g' | 'kg' | 'un'

export interface Product {
  id: string
  name: string
  type: ProductType
  salePrice: number
  unitCost: number
}

export interface Sale {
  id: string
  date: string
  productId: string
  quantity: number
  unitPrice: number
  note: string
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
}

export interface RecipeIngredient {
  id: string
  name: string
  unit: IngredientUnit
  dough: number
  farofa: number
}

export interface Recipe {
  id: string
  name: string
  batchSize: number
  salePrice: number
  ingredients: RecipeIngredient[]
}

export interface Purchase {
  id: string
  date: string
  recipeId: string
  ingredientId: string
  quantity: number
  unit: PurchaseUnit
  amount: number
}

export interface AppState {
  products: Product[]
  sales: Sale[]
  expenses: Expense[]
  purchases: Purchase[]
  recipes: Recipe[]
  activeRecipeId: string
}

export type TabId = 'receita' | 'dashboard' | 'vendas' | 'gastos' | 'produtos'
