import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AppState } from '../types'
import { lastMonths, monthSummary } from '../ledger'
import { EXPENSE_CATEGORIES, formatMoney, monthLabel, PRODUCT_TYPES } from '../utils'

const COLORS = ['#4a2a18', '#c9a227', '#6b5a1a', '#8b5a2b', '#7a2432', '#b87333']

interface Props {
  state: AppState
  month: string
}

export function Dashboard({ state, month }: Props) {
  const summary = monthSummary(state, month)
  const history = lastMonths(state, month, 6)
  const profitClass = summary.profit >= 0 ? 'profit' : 'loss'

  return (
    <div className="grid">
      <div className="section-head">
        <h2>Resultado de {monthLabel(month)}</h2>
        <p className="muted hint">Receita das vendas menos compras da receita e outros gastos.</p>
      </div>
      <div className="grid kpis">
        <article className="card kpi">
          <div className="label">Receita do mês</div>
          <div className="value">{formatMoney(summary.revenue)}</div>
          <p className="muted hint">{summary.quantity} unidades vendidas</p>
        </article>
        <article className="card kpi">
          <div className="label">Gastos do mês</div>
          <div className="value">{formatMoney(summary.expenses)}</div>
          <p className="muted hint">Ingredientes, gás, embalagem e outros</p>
        </article>
        <article className={`card kpi ${profitClass}`}>
          <div className="label">Lucro líquido</div>
          <div className="value">{formatMoney(summary.profit)}</div>
          <p className="muted hint">Receita menos gastos reais</p>
        </article>
        <article className="card kpi">
          <div className="label">Margem</div>
          <div className="value">{summary.margin.toFixed(1)}%</div>
          <p className="muted hint">Custo estimado das vendas: {formatMoney(summary.estimatedCost)}</p>
        </article>
      </div>

      <div className="grid two">
        {summary.byType
          .filter((row) => row.type !== 'outro' || row.quantity > 0)
          .map((row) => {
            const meta = PRODUCT_TYPES.find((item) => item.id === row.type)!
            return (
              <article className="card product-type" key={row.type}>
                <header>
                  <h3>{meta.plural}</h3>
                  <span className="badge">{row.quantity} vendidos</span>
                </header>
                <p className="muted hint">
                  Receita {formatMoney(row.revenue)} · lucro estimado por produto{' '}
                  {formatMoney(row.estimatedProfit)}
                </p>
                <p className="hint">
                  O lucro dos itens com receita usa o custo calculado. O lucro do mês usa as compras e os outros gastos.
                </p>
              </article>
            )
          })}
      </div>

      <div className="grid split">
        <article className="card">
          <div className="section-head">
            <h3>Últimos 6 meses</h3>
            <div className="legend">
              <span><i className="dot" style={{ background: '#4a2a18' }} />Receita</span>
              <span><i className="dot" style={{ background: '#7a2432' }} />Gastos</span>
              <span><i className="dot" style={{ background: '#c9a227' }} />Lucro</span>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={history}>
                <CartesianGrid stroke="#d4b882" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b4428' }} />
                <YAxis tick={{ fill: '#6b4428' }} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Bar dataKey="revenue" name="Receita" fill="#4a2a18" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" name="Gastos" fill="#7a2432" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" name="Lucro" fill="#c9a227" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <h3>Gastos por categoria</h3>
          </div>
          {summary.byExpenseCategory.length === 0 ? (
            <p className="empty">Nenhum gasto em {monthLabel(month)}.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={summary.byExpenseCategory.map((row) => ({
                      ...row,
                      name:
                        EXPENSE_CATEGORIES.find((item) => item.id === row.category)?.label ??
                        row.category,
                    }))}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {summary.byExpenseCategory.map((row, index) => (
                      <Cell key={row.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <h3>Vendas por produto</h3>
        </div>
        {summary.byProduct.length === 0 ? (
          <p className="empty">Nenhuma venda neste mês. Lance as vendas na aba Vendas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th>Receita</th>
                  <th>Custo estimado</th>
                  <th>Lucro estimado</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProduct.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.name}</td>
                    <td>{PRODUCT_TYPES.find((item) => item.id === row.type)?.label}</td>
                    <td>{row.quantity}</td>
                    <td>{formatMoney(row.revenue)}</td>
                    <td>{formatMoney(row.estimatedCost)}</td>
                    <td>{formatMoney(row.estimatedProfit)}</td>
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
