import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TriviasAdmin from '@/components/admin/TriviasAdmin'
import { redirect } from 'next/navigation'

export default async function AdminTriviasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') redirect('/admin')

  const { data: trivias } = await createAdminClient()
    .from('trivias')
    .select('*')
    .order('created_at', { ascending: false })

  return <TriviasAdmin trivias={trivias ?? []} />
}
