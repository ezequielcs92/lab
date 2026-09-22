import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SponsorsAdmin from '@/components/admin/SponsorsAdmin'

export default async function AdminSponsorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') redirect('/admin')

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('ubicacion')
    .order('orden')

  return <SponsorsAdmin sponsors={sponsors ?? []} />
}
