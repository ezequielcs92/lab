import type { PosicionEfectivaConClub } from '@/lib/database.types'
import Image from 'next/image'
import { getClubLogoUrl } from '@/lib/club-logo'
import { sortStandings } from '@/lib/standings'

interface StandingsTableProps {
  posiciones: PosicionEfectivaConClub[]
}

export default function StandingsTable({ posiciones }: StandingsTableProps) {
  const sorted = sortStandings(posiciones)

  return (
    <div className="table-responsive rounded-lg border border-lab-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-lab-surface-light">
            <th className="text-left px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold">#</th>
            <th className="text-left px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold">Club</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">JJ</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">JG</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">JP</th>
            <th className="text-center px-2 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted hidden sm:table-cell">PCT</th>
            <th className="text-center px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-gold font-bold hidden sm:table-cell">GB</th>
            <th className="text-center px-3 py-2.5 font-condensed text-xs tracking-widest uppercase text-lab-muted">Racha</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos, idx) => {
            const clubLogoUrl = getClubLogoUrl(pos.clubes)
            const pct = pos.pct.toFixed(3)
            const gb = pos.gb === 0 ? '—' : pos.gb.toFixed(1)

            return (
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
                      className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: clubLogoUrl ? 'transparent' : pos.clubes.colores.primario }}
                    >
                      {clubLogoUrl ? (
                        <Image src={clubLogoUrl} alt={pos.clubes.nombre} width={24} height={24} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="font-display text-xs" style={{ color: pos.clubes.colores.secundario }}>
                          {(pos.clubes.nombre_corto || pos.clubes.nombre)[0]}
                        </span>
                      )}
                    </div>
                    <span className="font-condensed font-semibold text-lab-white tracking-wide truncate">
                      {pos.clubes.nombre_corto || pos.clubes.nombre}
                    </span>
                  </div>
                </td>
                <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.jj}</td>
                <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.jg}</td>
                <td className="text-center px-2 py-2.5 font-condensed text-lab-gray">{pos.jp}</td>
                <td className="text-center px-2 py-2.5 font-condensed text-lab-gray hidden sm:table-cell">{pct}</td>
                <td className="text-center px-3 py-2.5 font-condensed text-lab-gray hidden sm:table-cell">{gb}</td>
                <td className="text-center px-3 py-2.5 font-condensed text-lab-gray">{pos.racha ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
