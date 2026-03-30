import { createClient } from '@/lib/supabase/server'
import NoticiasAdmin from '@/components/admin/NoticiasAdmin'

export default async function AdminNoticiasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, club_id')
    .eq('id', user!.id)
    .single()

  const rol = perfil?.rol ?? 'usuario'
  const userClubId = perfil?.club_id ?? null

  const noticiasQuery = supabase
    .from('noticias')
    .select('*, clubes(nombre)')
    .order('created_at', { ascending: false })

  if (rol === 'editor_club' && userClubId) {
    noticiasQuery.eq('club_id', userClubId)
  }

  const [{ data: noticias }, { data: clubes }] = await Promise.all([
    noticiasQuery,
    supabase.from('clubes').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <NoticiasAdmin
      noticias={(noticias ?? []) as any}
      clubes={clubes ?? []}
      rol={rol}
      userClubId={userClubId}
    />
  )
}
