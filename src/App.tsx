import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Croissant, Download, Upload } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { Gastos } from './components/Gastos'
import { Produtos } from './components/Produtos'
import { Receita } from './components/Receita'
import { Vendas } from './components/Vendas'
import { loadState, normalizeState, saveState } from './storage'
import type { AppState, TabId } from './types'
import {
  currentMonth,
  downloadJson,
  isAppState,
  monthLabel,
  shiftMonth,
} from './utils'

const TABS: { id: TabId; label: string }[] = [
  { id: 'receita', label: 'Receita' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'dashboard', label: 'Balanço' },
  { id: 'gastos', label: 'Outros gastos' },
  { id: 'produtos', label: 'Produtos' },
]

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<TabId>('receita')

  useEffect(() => {
    saveState(state)
  }, [state])

  function exportData() {
    downloadJson(`balanco-paes-cucas-${month}.json`, state)
  }

  function importData(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isAppState(parsed)) {
          alert('Arquivo inválido.')
          return
        }
        setState(normalizeState(parsed))
      } catch {
        alert('Não foi possível ler o arquivo.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Croissant size={28} />
          </div>
          <div>
            <small>Pães e cucas</small>
            <h1>Receita e balanço</h1>
          </div>
        </div>

        <div className="actions">
          <div className="month-nav">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label={monthLabel(month)}
            />
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="backup">
            <button className="btn secondary" type="button" onClick={exportData}>
              <Download size={16} /> Backup
            </button>
            <label className="btn ghost">
              <Upload size={16} /> Importar
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importData(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'active' : ''}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'receita' ? <Receita state={state} month={month} onChange={setState} /> : null}
      {tab === 'dashboard' ? <Dashboard state={state} month={month} /> : null}
      {tab === 'vendas' ? <Vendas state={state} month={month} onChange={setState} /> : null}
      {tab === 'gastos' ? <Gastos state={state} month={month} onChange={setState} /> : null}
      {tab === 'produtos' ? <Produtos state={state} onChange={setState} /> : null}
    </div>
  )
}
