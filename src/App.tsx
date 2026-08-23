import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { Gastos } from './components/Gastos'
import { Produtos } from './components/Produtos'
import { Receita } from './components/Receita'
import { Vendas } from './components/Vendas'
import {
  defaultState,
  loadCachedState,
  loadFromDatabase,
  normalizeState,
  saveCachedState,
  saveToDatabase,
} from './storage'
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

type SyncStatus = 'loading' | 'saved' | 'saving' | 'error'

function syncMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/schema cache|does not exist|PGRST205|42P01/i.test(message)) {
    return 'As tabelas ainda não existem neste projeto do Supabase.'
  }
  return message || 'Não foi possível ligar o banco.'
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadCachedState())
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<TabId>('receita')
  const [sync, setSync] = useState<SyncStatus>('loading')
  const [syncError, setSyncError] = useState('')
  const ready = useRef(false)
  const timer = useRef<number>(0)

  useEffect(() => {
    let active = true

    async function start() {
      try {
        const remote = await loadFromDatabase()
        if (!active) return

        if (remote) {
          setState(remote)
          saveCachedState(remote)
        } else {
          const local = loadCachedState()
          const seed = local.recipes.length > 0 ? local : defaultState()
          setState(seed)
          await saveToDatabase(seed)
          saveCachedState(seed)
        }
        setSync('saved')
        setSyncError('')
        ready.current = true
      } catch (error) {
        ready.current = true
        setSync('error')
        setSyncError(syncMessage(error))
      }
    }

    void start()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!ready.current) return
    saveCachedState(state)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setSync('saving')
      void saveToDatabase(state)
        .then(() => {
          setSync('saved')
          setSyncError('')
        })
        .catch((error: unknown) => {
          setSync('error')
          setSyncError(syncMessage(error))
        })
    }, 450)
    return () => window.clearTimeout(timer.current)
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

  const syncLabel =
    sync === 'loading'
      ? 'Abrindo banco...'
      : sync === 'saving'
        ? 'Salvando no banco...'
        : sync === 'error'
          ? 'Erro no banco'
          : 'Salvo no banco'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Gabriela — Cucas e Pães" />
          <div>
            <small>Cucas e pães</small>
            <h1>Receita e balanço</h1>
            <p className={`sync-status ${sync}`}>{syncLabel}</p>
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

      {syncError ? (
        <p className="sync-error">
          {syncError} Se as tabelas ainda não existem, cole o arquivo <code>supabase/schema.sql</code> no SQL
          Editor do Supabase e recarregue a página.{' '}
          <button type="button" className="btn ghost" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </p>
      ) : null}

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
