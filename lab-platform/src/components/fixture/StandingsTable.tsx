import type { PosicionConClub } from '@/lib/database.types'

interface StandingsTableProps {
  posiciones: PosicionConClub[]
}

export default function StandingsTable({ posiciones }: StandingsTableProps) {
  const sorted = [...posiciones].sort((a, b) => b.pts - a.pts || b.dif - a.dif)

  return (
    <div className="table-responsive rounded-lg border border-lab-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-lab-surface-light">
            <th className="text-left px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold">#</th>
            <th className="text-left px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold">Club</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">PJ</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">PG</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">PP</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted hidden sm:table-cell">PE</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted hidden md:table-cell">CF</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted hidden md:table-cell">CC</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted hidden sm:table-cell">DIF</th>
            <th className="text-center px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold font-bold">PTS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos, idx) => (
            <tr
              key={pos.id}
              className={`border-t border-lab-border/50 transition-colors hover:bg-lab-surface ${idx === 0 ? 'bg-lab-gold/5' : ''}`}
            >
              <td className="px-3 py-2.5">
                <span className={`font-display text-lg ${idx === 0 ? 'text-lab-gold' : 'text-lab-muted'}`}>
                  {idx + 1}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-sm flex items-center justify-center font-display text-xs flex-shrink-0"
                    style={{
                      backgroundColor: pos.clubes.colores.primario,
                      color: pos.clubes.colores.secundario,
                    }}
                  >
                    {(pos.clubes.nombre_corto || pos.clubes.nombre)[0]}
                  </div>
                  <span className="font-condensed font-semibold text-lab-white tracking-wide truncate">
                    {pos.clubes.nombre_corto || pos.clubes.nombre}
                  </span>
                </div>
              </td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.pj}</td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.pg}</td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.pp}</td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray hidden sm:table-cell">{pos.pe}</td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray hidden md:table-cell">{pos.cf}</td>
              <td className="text-center px-2 py-2.5 font-condensed text-lab-gray hidden md:table-cell">{pos.cc}</td>
              <td className="text-center px-2 py-2.5 font-condensed hidden sm:table-cell">
                <span className={pos.dif > 0 ? 'text-green-400' : pos.dif < 0 ? 'text-lab-red-light' : 'text-lab-gray'}>
                  {pos.dif > 0 ? `+${pos.dif}` : pos.dif}
                </span>
              </td>
              <td className="text-center px-3 py-2.5">
                <span className={`font-display text-lg ${idx === 0 ? 'text-lab-gold' : 'text-lab-white'}`}>
                  {pos.pts}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
