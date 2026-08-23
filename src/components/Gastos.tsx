import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AppState, Expense, ExpenseCategory } from '../types'
import { dateForMonth, EXPENSE_CATEGORIES, formatDate, formatMoney, inMonth, uid } from '../utils'

interface Props {
  state: AppState
  month: string
  onChange: (state: AppState) => void
}

export function Gastos({ state, month, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(() => dateForMonth(month))
  const [category, setCategory] = useState<ExpenseCategory>('gas_energia')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (!editingId) setDate(dateForMonth(month))
  }, [month, editingId])

  const expenses = useMemo(
    () =>
      state.expenses
        .filter((item) => inMonth(item.date, month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses, month],
  )

  function resetForm() {
    setEditingId(null)
    setDate(dateForMonth(month))
    setCategory('gas_energia')
    setDescription('')
    setAmount(0)
  }

  function saveExpense(event: FormEvent) {
    event.preventDefault()
    if (!description.trim() || amount <= 0) return

    const expense: Expense = {
      id: editingId ?? uid(),
      date,
      category,
      description: description.trim(),
      amount,
    }

    onChange({
      ...state,
      expenses: editingId
        ? state.expenses.map((item) => (item.id === editingId ? expense : item))
        : [expense, ...state.expenses],
    })
    resetForm()
  }

  function editExpense(item: Expense) {
    setEditingId(item.id)
    setDate(item.date)
    setCategory(item.category)
    setDescription(item.description)
    setAmount(item.amount)
  }

  function removeExpense(id: string) {
    onChange({
      ...state,
      expenses: state.expenses.filter((item) => item.id !== id),
    })
    if (editingId === id) resetForm()
  }

  return (
    <div className="grid two">
      <article className="card">
        <div className="section-head">
          <h3>{editingId ? 'Editar gasto' : 'Novo gasto'}</h3>
        </div>
        <form className="form" onSubmit={saveExpense}>
          <div className="form-row">
            <label className="field">
              <span>Data</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>Categoria</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              <span>Descrição</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Gás, saquinhos, transporte..."
                required
              />
            </label>
            <label className="field">
              <span>Valor (R$)</span>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <div className="actions">
            <button className="btn" type="submit">
              {editingId ? 'Salvar alteração' : 'Lançar gasto'}
            </button>
            {editingId ? (
              <button className="btn ghost" type="button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
          <p className="muted hint">
            Farinha, fermento, açúcar, ovos e os outros itens da cuca entram na aba Receita, com peso e valor.
          </p>
        </form>
      </article>

      <article className="card">
        <div className="section-head">
          <h3>Gastos do mês</h3>
        </div>
        {expenses.length === 0 ? (
          <p className="empty">Nenhum gasto lançado neste mês.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id} className={editingId === item.id ? 'editing-row' : undefined}>
                    <td>{formatDate(item.date)}</td>
                    <td>
                      {EXPENSE_CATEGORIES.find((cat) => cat.id === item.category)?.label}
                    </td>
                    <td>{item.description}</td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary" type="button" onClick={() => editExpense(item)}>
                          Editar
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => removeExpense(item.id)}
                        >
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
