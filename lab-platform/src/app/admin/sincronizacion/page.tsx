import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SyncConflictsAdmin from '@/components/admin/SyncConflictsAdmin'
import type { SyncConflicto } from '@/lib/database.types'

export default async function AdminSyncPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') redirect('/admin')

  const { data: conflicts, error } = await supabase
    .from('sync_conflictos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  return <SyncConflictsAdmin conflicts={(conflicts ?? []) as SyncConflicto[]} />
}
