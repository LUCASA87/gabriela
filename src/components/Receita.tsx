import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  activeRecipe,
  analyzeRecipe,
  defaultCucaRecipe,
  emptyRecipe,
  formatQty,
  ingredientOf,
} from '../recipe'
import type {
  AppState,
  IngredientUnit,
  Purchase,
  PurchaseUnit,
  Recipe,
} from '../types'
import {
  dateForMonth,
  formatDate,
  formatMoney,
  slugify,
  uid,
  uniqueId,
} from '../utils'

interface Props {
  state: AppState
  month: string
  onChange: (state: AppState) => void
}

export function Receita({ state, month, onChange }: Props) {
  const recipe = activeRecipe(state)
  const analysis = useMemo(
    () => analyzeRecipe(state, recipe.id),
    [state, recipe.id],
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(() => dateForMonth(month))
  const [ingredientId, setIngredientId] = useState(recipe.ingredients[0]?.id ?? '')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState<PurchaseUnit>('kg')
  const [amount, setAmount] = useState(0)
  const [newRecipeName, setNewRecipeName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState<IngredientUnit>('g')
  const formCardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!editingId) setDate(dateForMonth(month))
  }, [month, editingId])

  useEffect(() => {
    if (!recipe.ingredients.some((item) => item.id === ingredientId)) {
      setIngredientId(recipe.ingredients[0]?.id ?? '')
      setUnit(recipe.ingredients[0]?.unit === 'un' ? 'un' : 'kg')
    }
  }, [recipe, ingredientId])

  const purchases = useMemo(
    () =>
      state.purchases
        .filter((item) => item.recipeId === recipe.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.purchases, recipe.id],
  )

  const currentIngredient = ingredientOf(recipe, ingredientId)
  const units: PurchaseUnit[] = currentIngredient?.unit === 'un' ? ['un'] : ['kg', 'g']

  function setRecipes(recipes: Recipe[], activeRecipeId = recipe.id) {
    const current = recipes.find((item) => item.id === activeRecipeId) ?? recipes[0]
    onChange({
      ...state,
      recipes,
      activeRecipeId: current?.id ?? activeRecipeId,
      products: current
        ? state.products.map((product) =>
            product.id === current.id
              ? { ...product, name: current.name, salePrice: current.salePrice }
              : product,
          )
        : state.products,
    })
  }

  function updateRecipe(next: Recipe) {
    setRecipes(
      state.recipes.map((item) => (item.id === next.id ? next : item)),
      next.id,
    )
  }

  function resetForm() {
    setEditingId(null)
    setDate(dateForMonth(month))
    setIngredientId(recipe.ingredients[0]?.id ?? '')
    setQuantity(0)
    setUnit(recipe.ingredients[0]?.unit === 'un' ? 'un' : 'kg')
    setAmount(0)
  }

  function applyIngredient(id: string) {
    setIngredientId(id)
    const meta = ingredientOf(recipe, id)
    if (meta?.unit === 'un') setUnit('un')
    else if (unit === 'un') setUnit('kg')
  }

  function savePurchase(event: FormEvent) {
    event.preventDefault()
    if (!ingredientId || quantity <= 0 || amount <= 0) return

    const purchase: Purchase = {
      id: editingId ?? uid('c'),
      date,
      recipeId: recipe.id,
      ingredientId,
      quantity,
      unit,
      amount,
    }

    onChange({
      ...state,
      purchases: editingId
        ? state.purchases.map((item) => (item.id === editingId ? purchase : item))
        : [purchase, ...state.purchases],
    })
    resetForm()
  }

  function editPurchase(item: Purchase) {
    setEditingId(item.id)
    setDate(item.date)
    setIngredientId(item.ingredientId)
    setQuantity(item.quantity)
    setUnit(item.unit)
    setAmount(item.amount)
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function editIngredient(id: string) {
    const latest = purchases
      .filter((item) => item.ingredientId === id)
      .sort((a, b) => b.date.localeCompare(a.date))[0]

    if (latest) {
      editPurchase(latest)
      return
    }

    setEditingId(null)
    setDate(dateForMonth(month))
    setIngredientId(id)
    setQuantity(0)
    setUnit(ingredientOf(recipe, id)?.unit === 'un' ? 'un' : 'kg')
    setAmount(0)
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function removePurchase(id: string) {
    onChange({
      ...state,
      purchases: state.purchases.filter((item) => item.id !== id),
    })
    if (editingId === id) resetForm()
  }

  function addRecipe(event: FormEvent) {
    event.preventDefault()
    const name = newRecipeName.trim()
    if (!name) return
    const created = emptyRecipe(
      uniqueId(slugify(name), state.recipes.map((item) => item.id)),
      name,
    )
    onChange({
      ...state,
      recipes: [...state.recipes, created],
      activeRecipeId: created.id,
    })
    setNewRecipeName('')
    setIngredientId('')
  }

  function addItem(event: FormEvent) {
    event.preventDefault()
    const name = newItemName.trim()
    if (!name) return
    updateRecipe({
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        {
          id: uniqueId(
            slugify(name),
            recipe.ingredients.map((item) => item.id),
          ),
          name,
          unit: newItemUnit,
          dough: 0,
          farofa: 0,
        },
      ],
    })
    setNewItemName('')
  }

  function removeItem(id: string) {
    updateRecipe({
      ...recipe,
      ingredients: recipe.ingredients.filter((item) => item.id !== id),
    })
  }

  const profitClass = analysis.profitPerItem >= 0 ? 'profit' : 'loss'
  const missing = analysis.ingredients.filter((row) => row.missingForNext > 0)
  const editingIngredient = editingId
    ? state.purchases.find((item) => item.id === editingId)?.ingredientId
    : undefined
  const itemLabel = recipe.name

  return (
    <div className="grid">
      <div className="section-head">
        <h2>Receita de {itemLabel}</h2>
        <p className="muted hint">
          Crie uma receita, dê o nome do item e acrescente os ingredientes. A massa rende{' '}
          {recipe.batchSize} unidades.
        </p>
      </div>

      <article className="card">
        <div className="section-head">
          <h3>Receitas</h3>
        </div>
        <form className="form" onSubmit={addRecipe}>
          <div className="form-row wide">
            <label className="field">
              <span>Receita atual</span>
              <select
                value={recipe.id}
                onChange={(e) =>
                  onChange({ ...state, activeRecipeId: e.target.value })
                }
              >
                {state.recipes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nome da nova receita</span>
              <input
                value={newRecipeName}
                onChange={(e) => setNewRecipeName(e.target.value)}
                placeholder="Cuca de banana, pão caseiro..."
              />
            </label>
            <div className="actions">
              <button className="btn" type="submit">
                Adicionar receita
              </button>
            </div>
          </div>
        </form>
      </article>

      <div className="grid kpis">
        <article className="card kpi">
          <div className="label">{itemLabel} com o estoque</div>
          <div className="value">{analysis.maxItems}</div>
          <p className="muted hint">já vendidas {analysis.itemsSold}</p>
        </article>
        <article className="card kpi">
          <div className="label">Custo de cada {itemLabel.toLowerCase()}</div>
          <div className="value">{formatMoney(analysis.costPerItem)}</div>
          <p className="muted hint">
            {analysis.completeCost
              ? 'Com o preço médio das compras'
              : 'Falta lançar o valor de algum item'}
          </p>
        </article>
        <article className="card kpi">
          <div className="label">Preço de venda</div>
          <div className="value">{formatMoney(analysis.salePrice)}</div>
          <p className="muted hint">Definido em Editar receita</p>
        </article>
        <article className={`card kpi ${profitClass}`}>
          <div className="label">Lucro por {itemLabel.toLowerCase()}</div>
          <div className="value">{formatMoney(analysis.profitPerItem)}</div>
          <p className="muted hint">
            Se vender as {analysis.maxItems}: {formatMoney(analysis.potentialProfit)}
          </p>
        </article>
      </div>

      <article className="card" ref={formCardRef}>
        <div className="section-head">
          <h3>{editingId ? 'Editar item comprado' : 'Lançar compra'}</h3>
        </div>
        {recipe.ingredients.length === 0 ? (
          <p className="empty">Adicione um item na receita para lançar compras.</p>
        ) : (
          <form className="form" onSubmit={savePurchase}>
            <div className="form-row wide">
              <label className="field">
                <span>Data</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label className="field">
                <span>Item da receita</span>
                <select value={ingredientId} onChange={(e) => applyIngredient(e.target.value)}>
                  {recipe.ingredients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Peso ou quantidade</span>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder={unit === 'un' ? 'Ex.: 10' : 'Ex.: 3'}
                  required
                />
              </label>
              <label className="field">
                <span>Medida</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value as PurchaseUnit)}>
                  {units.map((item) => (
                    <option key={item} value={item}>
                      {item === 'un' ? 'unidades' : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Valor pago (R$)</span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Quanto pagou"
                  required
                />
              </label>
              <div className="actions">
                <button className="btn" type="submit">
                  {editingId ? 'Salvar' : 'Lançar'}
                </button>
                {editingId ? (
                  <button className="btn ghost" type="button" onClick={resetForm}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        )}
      </article>

      <article className="card">
        <div className="section-head">
          <h3>Estoque, rendimento e sobra</h3>
        </div>
        <p className="muted hint">Clique no nome do item para corrigir peso e valor da compra.</p>
        {analysis.ingredients.length === 0 ? (
          <p className="empty">Nenhum item nesta receita.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Estoque</th>
                  <th>Por unidade</th>
                  <th>Dá para</th>
                  <th>Usa em {analysis.maxItems}</th>
                  <th>Sobra</th>
                  <th>Custo</th>
                </tr>
              </thead>
              <tbody>
                {analysis.ingredients.map((row) => {
                  const isLimit =
                    purchases.length > 0 && analysis.limiting.includes(row.id)
                  const isEditing = editingIngredient === row.id
                  return (
                    <tr
                      key={row.id}
                      className={[
                        'click-row',
                        isEditing ? 'editing-row' : isLimit ? 'limit-row' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => editIngredient(row.id)}
                    >
                      <td>
                        <span className="item-name">{row.label}</span>
                        {isLimit ? <div className="badge">Limita o rendimento</div> : null}
                      </td>
                      <td>{formatQty(row.stock, row.unit)}</td>
                      <td>{formatQty(row.perItem, row.unit)}</td>
                      <td>{row.perItem > 0 ? `${row.yield} un` : 'Não usa'}</td>
                      <td>{formatQty(row.usedIfBake, row.unit)}</td>
                      <td>{formatQty(row.leftover, row.unit)}</td>
                      <td>{row.hasPrice ? formatMoney(row.costInItem) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {analysis.maxItems === 0 ? (
          <p className="hint">
            Ainda não dá para fechar uma unidade. Lance o peso e o valor de cada item comprado.
          </p>
        ) : missing.length > 0 ? (
          <p className="hint">
            Para fazer mais 1 {itemLabel.toLowerCase()} falta:{' '}
            {missing
              .map((row) => `${formatQty(row.missingForNext, row.unit)} de ${row.label.toLowerCase()}`)
              .join(', ')}
            .
          </p>
        ) : null}
      </article>

      <article className="card">
        <div className="section-head">
          <h3>Editar receita</h3>
          {recipe.id === 'cuca' ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => updateRecipe(defaultCucaRecipe())}
            >
              Restaurar original
            </button>
          ) : null}
        </div>
        <div className="form-row">
          <label className="field">
            <span>Nome do item</span>
            <input
              value={recipe.name}
              onChange={(e) => updateRecipe({ ...recipe, name: e.target.value })}
              placeholder="Cuca, pão, cuca de banana..."
            />
          </label>
          <label className="field">
            <span>Massa rende quantas unidades</span>
            <input
              type="number"
              min={1}
              step={1}
              value={recipe.batchSize}
              onChange={(e) =>
                updateRecipe({ ...recipe, batchSize: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
          <label className="field">
            <span>Preço de venda (R$)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={recipe.salePrice}
              onChange={(e) =>
                updateRecipe({ ...recipe, salePrice: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
        </div>
        <form className="form" onSubmit={addItem}>
          <div className="form-row wide">
            <label className="field">
              <span>Nome do item da receita</span>
              <input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Farinha, fermento, canela, uva passa..."
              />
            </label>
            <label className="field">
              <span>Medida</span>
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value as IngredientUnit)}
              >
                <option value="g">gramas</option>
                <option value="un">unidades</option>
              </select>
            </label>
            <div className="actions">
              <button className="btn" type="submit">
                Adicionar item
              </button>
            </div>
          </div>
        </form>
      </article>

      <div className="grid two">
        <article className="card">
          <div className="section-head">
            <h3>Massa — rende {recipe.batchSize}</h3>
          </div>
          {recipe.ingredients.length === 0 ? (
            <p className="empty">Adicione um item na receita.</p>
          ) : (
            <ul className="recipe-list">
              {recipe.ingredients.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <label className="recipe-input">
                    <input
                      type="number"
                      min={0}
                      step={item.unit === 'un' ? 1 : 'any'}
                      value={item.dough || ''}
                      onChange={(e) =>
                        updateRecipe({
                          ...recipe,
                          ingredients: recipe.ingredients.map((row) =>
                            row.id === item.id
                              ? { ...row, dough: Math.max(0, Number(e.target.value) || 0) }
                              : row,
                          ),
                        })
                      }
                    />
                    <span>{item.unit === 'un' ? 'un' : 'g'}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="card">
          <div className="section-head">
            <h3>Farofa — por unidade</h3>
          </div>
          {recipe.ingredients.length === 0 ? (
            <p className="empty">Adicione um item na receita.</p>
          ) : (
            <ul className="recipe-list">
              {recipe.ingredients.map((item) => (
                <li key={item.id}>
                  <div>
                    <span>{item.name}</span>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      Tirar
                    </button>
                  </div>
                  <label className="recipe-input">
                    <input
                      type="number"
                      min={0}
                      step={item.unit === 'un' ? 1 : 'any'}
                      value={item.farofa || ''}
                      onChange={(e) =>
                        updateRecipe({
                          ...recipe,
                          ingredients: recipe.ingredients.map((row) =>
                            row.id === item.id
                              ? { ...row, farofa: Math.max(0, Number(e.target.value) || 0) }
                              : row,
                          ),
                        })
                      }
                    />
                    <span>{item.unit === 'un' ? 'un' : 'g'}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <h3>Itens lançados</h3>
        </div>
        {purchases.length === 0 ? (
          <p className="empty">Nenhum item lançado nesta receita.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Item</th>
                  <th>Quantidade</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((item) => (
                  <tr
                    key={item.id}
                    className={['click-row', editingId === item.id ? 'editing-row' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => editPurchase(item)}
                  >
                    <td>{formatDate(item.date)}</td>
                    <td>
                      <span className="item-name">
                        {ingredientOf(recipe, item.ingredientId)?.name ?? 'Item'}
                      </span>
                    </td>
                    <td>
                      {item.quantity.toLocaleString('pt-BR')} {item.unit === 'un' ? 'un' : item.unit}
                    </td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          removePurchase(item.id)
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  )
}
