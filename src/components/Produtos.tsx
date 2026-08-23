import { useState, type FormEvent } from 'react'
import { recipeCost } from '../recipe'
import type { AppState, Product, ProductType } from '../types'
import { formatMoney, PRODUCT_TYPES, uid } from '../utils'

interface Props {
  state: AppState
  onChange: (state: AppState) => void
}

const emptyForm = {
  name: '',
  type: 'pao' as ProductType,
  salePrice: 0,
  unitCost: 0,
}

export function Produtos({ state, onChange }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  function isRecipeProduct(id: string) {
    return state.recipes.some((item) => item.id === id)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return

    if (editingId) {
      onChange({
        ...state,
        products: state.products.map((product) =>
          product.id === editingId
            ? {
                ...product,
                name: form.name.trim(),
                type: form.type,
                salePrice: form.salePrice,
                unitCost: form.unitCost,
              }
            : product,
        ),
      })
    } else {
      const product: Product = {
        id: uid(),
        name: form.name.trim(),
        type: form.type,
        salePrice: form.salePrice,
        unitCost: form.unitCost,
      }
      onChange({ ...state, products: [...state.products, product] })
    }

    setForm(emptyForm)
    setEditingId(null)
  }

  function edit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      type: product.type,
      salePrice: product.salePrice,
      unitCost: product.unitCost,
    })
  }

  function remove(id: string) {
    if (isRecipeProduct(id)) return
    const used = state.sales.some((sale) => sale.productId === id)
    if (used && !confirm('Este produto já tem vendas. Remover mesmo assim?')) return
    onChange({ ...state, products: state.products.filter((product) => product.id !== id) })
    if (editingId === id) {
      setEditingId(null)
      setForm(emptyForm)
    }
  }

  return (
    <div className="grid two">
      <article className="card">
        <div className="section-head">
          <h3>{editingId ? 'Editar produto' : 'Novo produto'}</h3>
        </div>
        <form className="form" onSubmit={submit}>
          <div className="form-row">
            <label className="field full">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pão caseiro, cuca de banana..."
                required
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}
              >
                {PRODUCT_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Preço de venda (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice || ''}
                onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
                required
              />
            </label>
            <label className="field">
              <span>Custo por unidade (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.unitCost || ''}
                onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="muted hint">
            O custo dos itens com receita sai das compras. Aqui você cadastra pães e outros itens.
          </p>
          <div className="actions">
            <button className="btn" type="submit">
              {editingId ? 'Salvar produto' : 'Cadastrar produto'}
            </button>
            {editingId ? (
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="card">
        <div className="section-head">
          <h3>Cardápio</h3>
        </div>
        {state.products.length === 0 ? (
          <p className="empty">Nenhum produto cadastrado.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Venda</th>
                  <th>Custo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{PRODUCT_TYPES.find((item) => item.id === product.type)?.label}</td>
                    <td>{formatMoney(product.salePrice)}</td>
                    <td>
                      {isRecipeProduct(product.id)
                        ? formatMoney(recipeCost(state, product.id) ?? 0)
                        : formatMoney(product.unitCost)}
                    </td>
                    <td>
                      {isRecipeProduct(product.id) ? (
                        <span className="muted">Custo pela receita</span>
                      ) : (
                        <div className="actions">
                          <button className="btn secondary" type="button" onClick={() => edit(product)}>
                            Editar
                          </button>
                          <button className="btn danger" type="button" onClick={() => remove(product.id)}>
                            Excluir
                          </button>
                        </div>
                      )}
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
