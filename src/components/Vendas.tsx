import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { analyzeRecipe } from '../recipe'
import type { AppState, Sale } from '../types'
import { dateForMonth, formatDate, formatMoney, inMonth, uid } from '../utils'

interface Props {
  state: AppState
  month: string
  onChange: (state: AppState) => void
}

export function Vendas({ state, month, onChange }: Props) {
  const defaultProduct =
    state.products.find((item) => item.id === state.activeRecipeId) ?? state.products[0]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(() => dateForMonth(month))
  const [productId, setProductId] = useState(defaultProduct?.id ?? '')
  const analysis = useMemo(() => analyzeRecipe(state, productId), [state, productId])
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(defaultProduct?.salePrice ?? analysis.salePrice)
  const [note, setNote] = useState('')
  const [warning, setWarning] = useState('')

  useEffect(() => {
    if (!editingId) setDate(dateForMonth(month))
  }, [month, editingId])

  const sales = useMemo(
    () =>
      state.sales
        .filter((sale) => inMonth(sale.date, month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.sales, month],
  )

  function isRecipeProduct(id: string) {
    return state.recipes.some((item) => item.id === id)
  }

  function resetForm() {
    setEditingId(null)
    setDate(dateForMonth(month))
    setProductId(defaultProduct?.id ?? '')
    setQuantity(1)
    setUnitPrice(defaultProduct?.salePrice ?? analysis.salePrice)
    setNote('')
    setWarning('')
  }

  function applyProduct(id: string) {
    setProductId(id)
    const product = state.products.find((item) => item.id === id)
    if (product) setUnitPrice(product.salePrice)
  }

  function saveSale(event: FormEvent) {
    event.preventDefault()
    if (!productId || quantity <= 0 || unitPrice < 0) return

    const current = editingId ? state.sales.find((sale) => sale.id === editingId) : undefined
    const extra = current && isRecipeProduct(current.productId) ? current.quantity : 0
    const available = analysis.maxItems + extra

    if (isRecipeProduct(productId) && quantity > available) {
      setWarning(
        `O estoque dá para ${available} un. Lance as compras na Receita ou diminua a quantidade.`,
      )
      return
    }

    const sale: Sale = {
      id: editingId ?? uid(),
      date,
      productId,
      quantity,
      unitPrice,
      note: note.trim(),
    }

    onChange({
      ...state,
      sales: editingId
        ? state.sales.map((item) => (item.id === editingId ? sale : item))
        : [sale, ...state.sales],
    })
    resetForm()
  }

  function editSale(sale: Sale) {
    setEditingId(sale.id)
    setDate(sale.date)
    setProductId(sale.productId)
    setQuantity(sale.quantity)
    setUnitPrice(sale.unitPrice)
    setNote(sale.note)
    setWarning('')
  }

  function removeSale(id: string) {
    onChange({ ...state, sales: state.sales.filter((sale) => sale.id !== id) })
    if (editingId === id) resetForm()
  }

  const productName = (id: string) =>
    state.products.find((item) => item.id === id)?.name ?? 'Produto removido'

  return (
    <div className="grid two">
      <article className="card">
        <div className="section-head">
          <h3>{editingId ? 'Editar venda' : 'Nova venda'}</h3>
        </div>
        {state.products.length === 0 ? (
          <p className="empty">Cadastre um produto antes de lançar vendas.</p>
        ) : (
          <form className="form" onSubmit={saveSale}>
            <div className="form-row">
              <label className="field">
                <span>Data</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label className="field">
                <span>Produto</span>
                <select value={productId} onChange={(e) => applyProduct(e.target.value)}>
                  {state.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Quantidade</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Preço unitário (R$)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  required
                />
              </label>
              <label className="field full">
                <span>Observação</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Cliente, encomenda, feira..."
                />
              </label>
            </div>
            <div className="actions">
              <button className="btn" type="submit">
                {editingId ? 'Salvar alteração' : 'Lançar venda'} · {formatMoney(quantity * unitPrice)}
              </button>
              {editingId ? (
                <button className="btn ghost" type="button" onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
            </div>
            {isRecipeProduct(productId) ? (
              <p className="muted hint">
                {analysis.recipe.name} a {formatMoney(analysis.salePrice)}. Custo atual{' '}
                {formatMoney(analysis.costPerItem)} · lucro{' '}
                {formatMoney(analysis.salePrice - analysis.costPerItem)} · estoque dá para{' '}
                {analysis.maxItems} un.
              </p>
            ) : null}
            {warning ? <p className="warn-text">{warning}</p> : null}
          </form>
        )}
      </article>

      <article className="card">
        <div className="section-head">
          <h3>Vendas do mês</h3>
        </div>
        {sales.length === 0 ? (
          <p className="empty">Nenhuma venda lançada neste mês.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className={editingId === sale.id ? 'editing-row' : undefined}>
                    <td>{formatDate(sale.date)}</td>
                    <td>
                      {productName(sale.productId)}
                      {sale.note ? <div className="muted">{sale.note}</div> : null}
                    </td>
                    <td>{sale.quantity}</td>
                    <td>{formatMoney(sale.quantity * sale.unitPrice)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary" type="button" onClick={() => editSale(sale)}>
                          Editar
                        </button>
                        <button className="btn danger" type="button" onClick={() => removeSale(sale.id)}>
                          Excluir
                        </button>
                      </div>
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
