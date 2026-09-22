'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isValidBaseballInnings } from '@/lib/baseball'
import type {
  Club,
  Database,
  JugadorConClub,
  LiderConfig,
  Partido,
  PosicionConClub,
} from '@/lib/database.types'
import { Check, AlertCircle, Plus, Trash2, Save, Trophy, BarChart3, Table2, Loader2, Sheet } from 'lucide-react'

type Tab = 'stats' | 'posiciones' | 'lideres' | 'sheets'
type StatType = 'bateo' | 'pitcheo' | 'fildeo'
type Side = 'local' | 'visitante'
type StatInsert =
  | Database['public']['Tables']['estadisticas_bateo']['Insert']
  | Database['public']['Tables']['estadisticas_pitcheo']['Insert']
  | Database['public']['Tables']['estadisticas_fildeo']['Insert']
type StatPayload = Record<string, string | number | boolean> & {
  partido_id: string
  jugador_id: string
  temporada_id: string
  club_id: string
}
type StatRow = Record<string, unknown> & {
  id: string
  jugadores?: { nombre: string }
  clubes?: { nombre: string; nombre_corto: string | null }
}

const VALID_METRICS: Record<StatType, string[]> = {
  bateo: ['ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp', 'avg', 'obp', 'slg', 'ops'],
  pitcheo: ['ip', 'h', 'r', 'er', 'bb', 'so', 'hr', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'era', 'so_pct', 'whip'],
  fildeo: ['po', 'a', 'e', 'dp', 'fld_pct'],
}

interface Props {
  temporada: { id: string; nombre: string } | null
  partidos: (Partido & {
    local: Pick<Club, 'id' | 'nombre' | 'nombre_corto'>
    visitante: Pick<Club, 'id' | 'nombre' | 'nombre_corto'>
  })[]
  posiciones: PosicionConClub[]
  automaticPositions: PosicionConClub[]
  configs: LiderConfig[]
  jugadores: JugadorConClub[]
}

const STAT_FIELDS: Record<
  StatType,
  { name: string; label: string; type?: 'number' | 'boolean' | 'float' }[]
> = {
  bateo: [
    { name: 'ab', label: 'AB' },
    { name: 'r', label: 'R' },
    { name: 'h', label: 'H' },
    { name: 'doble', label: '2B' },
    { name: 'triple', label: '3B' },
    { name: 'hr', label: 'HR' },
    { name: 'rbi', label: 'RBI' },
    { name: 'bb', label: 'BB' },
    { name: 'so', label: 'SO' },
    { name: 'sb', label: 'SB' },
    { name: 'cs', label: 'CS' },
    { name: 'sf', label: 'SF' },
    { name: 'hbp', label: 'HBP' },
    { name: 'orden_bateo', label: 'Orden' },
  ],
  pitcheo: [
    { name: 'ip', label: 'IP', type: 'float' },
    { name: 'h', label: 'H' },
    { name: 'r', label: 'R' },
    { name: 'er', label: 'ER' },
    { name: 'bb', label: 'BB' },
    { name: 'so', label: 'SO' },
    { name: 'hr', label: 'HR' },
    { name: 'wp', label: 'WP' },
    { name: 'bk', label: 'BK' },
    { name: 'bf', label: 'BF' },
    { name: 'hld', label: 'HLD' },
    { name: 'w', label: 'W', type: 'boolean' },
    { name: 'l', label: 'L', type: 'boolean' },
    { name: 'sv', label: 'SV', type: 'boolean' },
  ],
  fildeo: [
    { name: 'po', label: 'PO' },
    { name: 'a', label: 'A' },
    { name: 'e', label: 'E' },
    { name: 'dp', label: 'DP' },
  ],
}

export default function EstadisticasAdmin({
  temporada,
  partidos,
  posiciones,
  automaticPositions,
  configs,
  jugadores,
}: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const [selectedPartidoId, setSelectedPartidoId] = useState<string>('')
  const [statType, setStatType] = useState<StatType>('bateo')
  const [rows, setRows] = useState<StatRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sheetLoteId, setSheetLoteId] = useState<string | null>(null)

  const [standings, setStandings] = useState<PosicionConClub[]>(posiciones)
  const [adjustmentReason, setAdjustmentReason] = useState('Corrección manual desde el panel LAB')
  const [leaderConfigs, setLeaderConfigs] = useState<LiderConfig[]>(configs)

  const selectedPartido = partidos.find((p) => p.id === selectedPartidoId) as
    | (Partido & { local: Club; visitante: Club })
    | undefined

  const jugadoresLocal = useMemo(
    () => jugadores.filter((j) => j.club_id === selectedPartido?.local_id),
    [jugadores, selectedPartido]
  )
  const jugadoresVisitante = useMemo(
    () => jugadores.filter((j) => j.club_id === selectedPartido?.visitante_id),
    [jugadores, selectedPartido]
  )

  useEffect(() => {
    setRows([])
    if (!selectedPartidoId) return

    const supabase = createClient()
    const table =
      statType === 'bateo'
        ? 'estadisticas_bateo'
        : statType === 'pitcheo'
        ? 'estadisticas_pitcheo'
        : 'estadisticas_fildeo'

    setLoading(true)
    supabase
      .from(table)
      .select('*, jugadores(*), clubes(*)')
      .eq('partido_id', selectedPartidoId)
      .then(({ data }) => {
        setRows((data ?? []) as StatRow[])
        setLoading(false)
      })
  }, [selectedPartidoId, statType])

  function notifySuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleStatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!temporada || !selectedPartido) {
      setError('Seleccioná una temporada y un partido')
      return
    }

    const fd = new FormData(e.currentTarget)
    const jugador_id = fd.get('jugador_id') as string
    const jugador = jugadores.find((j) => j.id === jugador_id)
    if (!jugador) {
      setError('Jugador no encontrado')
      return
    }

    const table =
      statType === 'bateo'
        ? 'estadisticas_bateo'
        : statType === 'pitcheo'
        ? 'estadisticas_pitcheo'
        : 'estadisticas_fildeo'

    const base = {
      partido_id: selectedPartido.id,
      jugador_id,
      temporada_id: temporada.id,
      club_id: jugador.club_id,
    }

    const payload: StatPayload = { ...base }
    STAT_FIELDS[statType].forEach((f) => {
      const raw = fd.get(f.name)
      if (f.type === 'boolean') {
        payload[f.name] = raw === 'on'
      } else if (f.type === 'float') {
        payload[f.name] = raw && raw !== '' ? Number(raw) : 0
      } else {
        payload[f.name] = raw && raw !== '' ? Number(raw) : 0
      }
    })
    if (statType === 'pitcheo') {
      const ip = Number(payload.ip)
      if (!isValidBaseballInnings(ip)) {
        setError('IP debe terminar en .0, .1 o .2 según los outs lanzados')
        return
      }
    }
    if (STAT_FIELDS[statType].some((field) => {
      const value = payload[field.name]
      return typeof value === 'number' && (!Number.isFinite(value) || value < 0)
    })) {
      setError('Las estadísticas no pueden ser negativas')
      return
    }

    const supabase = createClient()
    const { error: err } = await supabase.from(table).upsert(payload as StatInsert, {
      onConflict: 'partido_id,jugador_id',
    })

    if (err) {
      setError(err.message)
      return
    }

    notifySuccess('Estadistica guardada')
    e.currentTarget.reset()
    const { data } = await supabase
      .from(table)
      .select('*, jugadores(*), clubes(*)')
      .eq('partido_id', selectedPartido.id)
    setRows((data ?? []) as StatRow[])
  }

  async function handleDeleteStat(row: StatRow) {
    if (!confirm('¿Eliminar esta estadística?')) return
    const table =
      statType === 'bateo'
        ? 'estadisticas_bateo'
        : statType === 'pitcheo'
        ? 'estadisticas_pitcheo'
        : 'estadisticas_fildeo'
    const supabase = createClient()
    const { error: err } = await supabase.from(table).delete().eq('id', row.id)
    if (err) {
      setError(err.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    notifySuccess('Estadistica eliminada')
  }

  async function handleSaveStandings() {
    setError(null)
    if (standings.some((s) => s.jj < 0 || s.jg < 0 || s.jp < 0 || s.jg + s.jp > s.jj || s.pct < 0 || s.pct > 1 || s.gb < 0)) {
      setError('Revisá las posiciones: los valores deben ser válidos y JG + JP no puede superar JJ')
      return
    }
    if (!temporada || !adjustmentReason.trim()) {
      setError('Indicá el motivo del ajuste manual')
      return
    }
    const supabase = createClient()
    const upserts = standings.map((s) => ({
      temporada_id: s.temporada_id,
      club_id: s.club_id,
      division_id: null,
      jj: s.jj,
      jg: s.jg,
      jp: s.jp,
      pct: s.pct,
      gb: s.gb,
      racha: s.racha,
      motivo: adjustmentReason.trim(),
    }))

    const { error: err } = await supabase.from('posiciones_ajustes').upsert(upserts, {
      onConflict: 'temporada_id,club_id,scope_key',
    })
    if (err) {
      setError(err.message)
      return
    }
    notifySuccess('Posiciones guardadas')
  }

  async function handleResetStandings() {
    if (!temporada || !confirm('¿Restablecer todos los valores automáticos de la tabla general?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('posiciones_ajustes').delete().eq('temporada_id', temporada.id).is('division_id', null)
    if (err) {
      setError(err.message)
      return
    }
    setStandings(automaticPositions)
    notifySuccess('Se restablecieron los valores automáticos')
  }

  async function handleSheetSetup() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/sheets/setup', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'No se pudo verificar la planilla')
        return
      }
      notifySuccess('Google Sheets está conectado y la plantilla es válida')
    } catch {
      setError('No se pudo conectar con Google Sheets')
    } finally {
      setLoading(false)
    }
  }

  async function handleSheetPreview() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/sheets/preview', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'No se pudo analizar la planilla')
        return
      }
      setSheetLoteId(result.lote?.id ?? null)
      const conflicts = Object.values(result.sheets as Record<string, { cambios: number }>).reduce((total, sheet) => total + sheet.cambios, 0)
      notifySuccess(`Preview creado sin aplicar cambios${conflicts ? ` · ${conflicts} conflictos para revisar` : ''}`)
    } catch {
      setError('No se pudo analizar Google Sheets')
    } finally {
      setLoading(false)
    }
  }

  async function handleSheetApply() {
    if (!sheetLoteId) return
    if (!confirm('¿Aplicar las filas aprobadas del lote? Las filas con conflicto conservado en LAB se omitirán.')) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/sheets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lote_id: sheetLoteId }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'No se pudo aplicar el lote')
        return
      }
      notifySuccess(`Lote aplicado · ${result.appliedRows ?? 0} filas sincronizadas`)
      setSheetLoteId(null)
    } catch {
      setError('No se pudo aplicar el lote')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!temporada) {
      setError('No hay temporada activa')
      return
    }

    const fd = new FormData(e.currentTarget)
    const id = fd.get('id') as string
    const scope = fd.get('scope') as StatType
    const metrica = (fd.get('metrica') as string).trim()
    const limite = fd.get('limite') ? Number(fd.get('limite')) : 10
    if (!VALID_METRICS[scope]?.includes(metrica)) {
      setError('La métrica no es válida para el tipo seleccionado')
      return
    }
    if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
      setError('El límite debe ser un entero entre 1 y 100')
      return
    }
    const payload: Database['public']['Tables']['lideres_config']['Insert'] = {
      temporada_id: temporada.id,
      categoria: (fd.get('categoria') as string).trim(),
      etiqueta: (fd.get('etiqueta') as string).trim(),
      scope,
      metrica,
      orden: fd.get('orden') ? Number(fd.get('orden')) : 0,
      limite,
      activo: fd.get('activo') === 'on',
    }
    if (id) payload.id = id

    const supabase = createClient()
    const { error: err } = await supabase.from('lideres_config').upsert(payload)
    if (err) {
      setError(err.message)
      return
    }

    notifySuccess(id ? 'Configuración actualizada' : 'Categoría creada')
    e.currentTarget.reset()
    const { data: refreshed } = await supabase
      .from('lideres_config')
      .select('*')
      .order('orden', { ascending: true })
    setLeaderConfigs((refreshed ?? []) as LiderConfig[])
  }

  async function handleDeleteLeader(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('lideres_config').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    setLeaderConfigs((prev) => prev.filter((c) => c.id !== id))
    notifySuccess('Categoría eliminada')
  }

  function updateStanding(id: string, field: keyof PosicionConClub, value: number | string) {
    setStandings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">ESTADISTICAS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {temporada?.nombre ?? 'Sin temporada activa'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 mb-4 text-lab-red text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-2.5 mb-4 text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-lab-surface border border-lab-border rounded-lg p-1 w-fit">
        {[
          { id: 'stats' as Tab, label: 'Cargar stats', icon: BarChart3 },
          { id: 'posiciones' as Tab, label: 'Posiciones', icon: Table2 },
          { id: 'lideres' as Tab, label: 'Líderes', icon: Trophy },
          { id: 'sheets' as Tab, label: 'Google Sheets', icon: Sheet },
        ].map((t) => (
           <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-condensed text-sm tracking-wider transition-all ${
              tab === t.id
                ? 'bg-lab-gold text-lab-accent-fg font-bold'
                : 'text-lab-muted hover:text-lab-white'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-lab-surface rounded-lg border border-lab-border p-5">
            <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">
              Partido
            </label>
            <select
              value={selectedPartidoId}
              onChange={(e) => setSelectedPartidoId(e.target.value)}
              className="w-full md:w-96 bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50"
            >
              <option value="">Seleccionar partido...</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.local.nombre_corto ?? p.local.nombre} vs {p.visitante.nombre_corto ?? p.visitante.nombre} ·{' '}
                  {new Date(p.fecha_hora).toLocaleDateString('es-AR')}
                </option>
              ))}
            </select>
          </div>

          {selectedPartido && (
            <>
              <div className="flex gap-1 bg-lab-surface border border-lab-border rounded-lg p-1 w-fit">
                {(['bateo', 'pitcheo', 'fildeo'] as StatType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStatType(t)}
                    className={`px-4 py-2 rounded font-condensed text-sm tracking-wider uppercase transition-all ${
                      statType === t
                        ? 'bg-lab-gold text-lab-accent-fg font-bold'
                        : 'text-lab-muted hover:text-lab-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatForm
                  side="local"
                  team={selectedPartido.local}
                  statType={statType}
                  jugadores={jugadoresLocal}
                  onSubmit={handleStatSubmit}
                />
                <StatForm
                  side="visitante"
                  team={selectedPartido.visitante}
                  statType={statType}
                  jugadores={jugadoresVisitante}
                  onSubmit={handleStatSubmit}
                />
              </div>

              <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
                <div className="px-5 py-3 border-b border-lab-border bg-lab-surface-light">
                  <h3 className="font-display text-base tracking-wider text-lab-white uppercase">
                    {statType} cargado
                  </h3>
                </div>
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-lab-gold mx-auto" />
                  </div>
                ) : rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-lab-border">
                          <th className="px-4 py-2 text-left font-condensed text-[10px] uppercase text-lab-muted">Jugador</th>
                          <th className="px-4 py-2 text-left font-condensed text-[10px] uppercase text-lab-muted">Equipo</th>
                          {STAT_FIELDS[statType].map((f) => (
                            <th key={f.name} className="px-2 py-2 text-center font-condensed text-[10px] uppercase text-lab-muted">
                              {f.label}
                            </th>
                          ))}
                          <th className="px-4 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-t border-lab-border/50">
                            <td className="px-4 py-2 font-condensed text-lab-white">{row.jugadores?.nombre}</td>
                            <td className="px-4 py-2 font-condensed text-lab-muted">{row.clubes?.nombre_corto ?? row.clubes?.nombre}</td>
                            {STAT_FIELDS[statType].map((f) => (
                              <td key={f.name} className="px-2 py-2 text-center font-condensed text-lab-gray">
                                {f.type === 'boolean' ? (row[f.name] ? 'Sí' : '') : String(row[f.name] ?? '')}
                              </td>
                            ))}
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleDeleteStat(row)}
                                className="text-lab-muted hover:text-lab-red transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center font-condensed text-lab-muted tracking-wider">
                    Sin estadísticas cargadas para este partido
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'posiciones' && (
        <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lab-border bg-lab-surface-light">
                  <th className="px-4 py-3 text-left font-condensed text-[11px] uppercase text-lab-muted">Club</th>
                  <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">JJ</th>
                  <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">JG</th>
                  <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">JP</th>
                  <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">PCT</th>
                   <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">GB</th>
                   <th className="px-3 py-3 text-center font-condensed text-[11px] uppercase text-lab-muted">Racha</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.id} className="border-t border-lab-border/50">
                    <td className="px-4 py-2 font-condensed text-lab-white">{s.clubes.nombre_corto ?? s.clubes.nombre}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={s.jj}
                        onChange={(e) => updateStanding(s.id, 'jj', Number(e.target.value))}
                        className="w-16 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={s.jg}
                        onChange={(e) => updateStanding(s.id, 'jg', Number(e.target.value))}
                        className="w-16 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={s.jp}
                        onChange={(e) => updateStanding(s.id, 'jp', Number(e.target.value))}
                        className="w-16 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.001"
                        value={s.pct}
                        onChange={(e) => updateStanding(s.id, 'pct', Number(e.target.value))}
                        className="w-20 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.5"
                        value={s.gb}
                        onChange={(e) => updateStanding(s.id, 'gb', Number(e.target.value))}
                        className="w-16 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                      />
                     </td>
                     <td className="px-3 py-2">
                       <input
                         value={s.racha ?? ''}
                         onChange={(e) => updateStanding(s.id, 'racha', e.target.value)}
                         placeholder="G3"
                         className="w-16 bg-lab-navy border border-lab-border rounded px-2 py-1 text-center text-sm text-lab-white"
                       />
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-lab-border space-y-3">
            <p className="font-condensed text-xs text-lab-muted">Estos valores reemplazan la tabla automática hasta que se restablezcan.</p>
            <input
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Motivo del ajuste"
              className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-sm text-lab-white"
            />
            <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveStandings}
              className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
            >
              <Save className="w-4 h-4" /> GUARDAR POSICIONES
            </button>
            <button
              onClick={handleResetStandings}
              className="font-condensed text-sm tracking-wider px-4 py-2 rounded-lg border border-lab-border text-lab-muted hover:text-lab-white transition-colors"
            >
              RESTABLECER AUTOMÁTICO
            </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'lideres' && (
        <div className="space-y-6">
          <div className="bg-lab-surface rounded-lg border border-lab-border p-5">
            <h3 className="font-display text-base tracking-wider text-lab-gold mb-4">NUEVA CATEGORIA</h3>
            <form onSubmit={handleLeaderSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <Field label="Categoría (ID)" name="categoria" placeholder="bateo_avg" required />
              <Field label="Etiqueta" name="etiqueta" placeholder="Promedio de bateo" required />
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Scope</label>
                <select name="scope" required className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white">
                  <option value="bateo">Bateo</option>
                  <option value="pitcheo">Pitcheo</option>
                  <option value="fildeo">Fildeo</option>
                </select>
              </div>
              <Field label="Métrica" name="metrica" placeholder="avg / era / fld_pct" required />
              <Field label="Orden" name="orden" type="number" defaultValue="0" />
               <Field label="Límite" name="limite" type="number" defaultValue="10" />
              <div className="flex items-center gap-2 h-10">
                <input id="activo" name="activo" type="checkbox" defaultChecked className="w-4 h-4 accent-lab-gold" />
                <label htmlFor="activo" className="font-condensed text-sm text-lab-gray">Activo</label>
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors"
              >
                <Plus className="w-4 h-4" /> AGREGAR
              </button>
            </form>
          </div>

          <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
            <div className="px-5 py-3 border-b border-lab-border bg-lab-surface-light">
              <h3 className="font-display text-base tracking-wider text-lab-white">CATEGORIAS CONFIGURADAS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lab-border">
                    <th className="px-4 py-2 text-left font-condensed text-[11px] uppercase text-lab-muted">Etiqueta</th>
                    <th className="px-4 py-2 text-left font-condensed text-[11px] uppercase text-lab-muted">Scope</th>
                    <th className="px-4 py-2 text-left font-condensed text-[11px] uppercase text-lab-muted">Métrica</th>
                    <th className="px-4 py-2 text-center font-condensed text-[11px] uppercase text-lab-muted">Orden</th>
                    <th className="px-4 py-2 text-center font-condensed text-[11px] uppercase text-lab-muted">Límite</th>
                    <th className="px-4 py-2 text-center font-condensed text-[11px] uppercase text-lab-muted">Activo</th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {leaderConfigs.map((cfg) => (
                    <tr key={cfg.id} className="border-t border-lab-border/50">
                      <td className="px-4 py-2 font-condensed text-lab-white">{cfg.etiqueta}</td>
                      <td className="px-4 py-2 font-condensed text-lab-muted capitalize">{cfg.scope}</td>
                      <td className="px-4 py-2 font-condensed text-lab-muted">{cfg.metrica}</td>
                      <td className="px-4 py-2 text-center font-condensed text-lab-gray">{cfg.orden}</td>
                      <td className="px-4 py-2 text-center font-condensed text-lab-gray">{cfg.limite}</td>
                      <td className="px-4 py-2 text-center font-condensed text-lab-gray">{cfg.activo ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteLeader(cfg.id)}
                          className="text-lab-muted hover:text-lab-red transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'sheets' && (
        <div className="bg-lab-surface rounded-lg border border-lab-border p-6 max-w-2xl">
          <h2 className="font-display text-xl tracking-widest text-lab-gold mb-3">GOOGLE SHEETS</h2>
          <p className="font-condensed text-sm text-lab-gray mb-5">
            Verifica la cuenta de servicio y las pestañas Partidos, Bateo, Pitcheo y Fildeo. Si están vacías, crea únicamente sus cabeceras; nunca sobrescribe filas existentes.
          </p>
          <button
            onClick={handleSheetSetup}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2.5 rounded-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
             VERIFICAR Y PREPARAR PLANILLA
           </button>
           <button
             onClick={handleSheetPreview}
             disabled={loading}
             className="inline-flex items-center gap-2 border border-lab-border text-lab-white font-condensed font-semibold text-sm tracking-wider px-4 py-2.5 rounded-lg disabled:opacity-50 ml-2"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
             ANALIZAR CAMBIOS
           </button>
           {sheetLoteId && (
             <button
               onClick={handleSheetApply}
               disabled={loading}
               className="inline-flex items-center gap-2 bg-emerald-500 text-white font-condensed font-semibold text-sm tracking-wider px-4 py-2.5 rounded-lg disabled:opacity-50 ml-2"
             >
               APLICAR LOTE APROBADO
             </button>
           )}
           <p className="font-condensed text-xs text-lab-muted mt-4">
             El análisis crea un lote auditable y nunca aplica cambios automáticamente. Los conflictos quedan pendientes de revisión.
           </p>
        </div>
      )}
    </div>
  )
}

function StatForm({
  side,
  team,
  statType,
  jugadores,
  onSubmit,
}: {
  side: Side
  team: Club
  statType: StatType
  jugadores: JugadorConClub[]
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border p-5">
      <h3 className="font-display text-base tracking-wider text-lab-gold mb-4">
        {side === 'local' ? 'LOCAL' : 'VISITANTE'} · {team.nombre_corto ?? team.nombre}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Jugador</label>
          <select
            name="jugador_id"
            required
            className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50"
          >
            <option value="">Seleccionar...</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>
                #{j.numero_camiseta ?? '—'} {j.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {STAT_FIELDS[statType].map((f) => (
            <div key={f.name}>
              <label className="block font-condensed text-[10px] tracking-wider text-lab-muted uppercase mb-1">
                {f.label}
              </label>
              {f.type === 'boolean' ? (
                <input
                  name={f.name}
                  type="checkbox"
                  className="w-5 h-5 accent-lab-gold"
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type === 'float' ? 'number' : 'number'}
                  step={f.type === 'float' ? '0.1' : '1'}
                  defaultValue={0}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-2 py-2 text-sm text-lab-white text-center"
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Save className="w-4 h-4" /> GUARDAR {statType.toUpperCase()}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50"
      />
    </div>
  )
}
