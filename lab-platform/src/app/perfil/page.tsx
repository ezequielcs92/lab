import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilForm from '@/components/perfil/PerfilForm'
import type { RolUsuario } from '@/lib/database.types'

export const metadata = { title: 'Mi perfil' }

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/perfil')
  const { data: perfil } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).maybeSingle()
  return <PerfilForm email={user.email ?? ''} nombre={perfil?.nombre ?? null} rol={(perfil?.rol ?? 'usuario') as RolUsuario} />
}
