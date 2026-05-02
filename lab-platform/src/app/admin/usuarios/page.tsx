import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UsuariosAdmin from '@/components/admin/UsuariosAdmin'
import type { UsuarioRow } from '@/components/admin/UsuariosAdmin'
import type { RolUsuario, Club } from '@/lib/database.types'

export const metadata = { title: 'Usuarios — Admin LAB' }

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only admin_liga can access this page
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') redirect('/admin')

  const admin = createAdminClient()

  // Fetch all auth users + perfiles with club name
  const [{ data: authUsers }, { data: perfiles }, { data: clubes }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('perfiles').select('id, nombre, rol, club_id, clubes(nombre)'),
    admin.from('clubes').select('id, nombre').order('nombre'),
  ])

  const perfilesMap = new Map(
    (perfiles ?? []).map((p) => [p.id, p])
  )

  const usuarios: UsuarioRow[] = (authUsers?.users ?? []).map((u) => {
    const p = perfilesMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      nombre: p?.nombre ?? null,
      rol: (p?.rol ?? 'usuario') as RolUsuario,
      club_id: p?.club_id ?? null,
      club_nombre: (p?.clubes as any)?.nombre ?? null,
      created_at: u.created_at,
    }
  })

  return (
    <UsuariosAdmin
      usuarios={usuarios}
      clubes={(clubes ?? []) as Pick<Club, 'id' | 'nombre'>[]}
      currentUserId={user.id}
    />
  )
}
