import { createClient } from '@/lib/supabase/server'
import StaffAdmin from '@/components/admin/StaffAdmin'
import type { StaffClub, Club, RolUsuario } from '@/lib/database.types'

export const metadata = { title: 'Cuerpo Técnico — Admin LAB' }

export default async function AdminStaffPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, club_id')
    .eq('id', user!.id)
    .single()

  const rol: RolUsuario = perfil?.rol ?? 'usuario'
  const userClubId: string | null = (perfil as any)?.club_id ?? null

  const [staffRes, clubesRes] = await Promise.all([
    supabase
      .from('staff_clubes')
      .select('*, clubes(nombre, nombre_corto)')
      .order('orden'),
    supabase
      .from('clubes')
      .select('id, nombre')
      .order('nombre'),
  ])

  const staff = (staffRes.data ?? []) as unknown as (StaffClub & { clubes: Pick<Club, 'nombre' | 'nombre_corto'> })[]
  const clubes = (clubesRes.data ?? []) as Pick<Club, 'id' | 'nombre'>[]

  return (
    <StaffAdmin
      staff={staff}
      clubes={clubes}
      rol={rol}
      userClubId={userClubId}
    />
  )
}
