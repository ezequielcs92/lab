import { redirect } from 'next/navigation'
import BallclubzImportAdmin from '@/components/admin/BallclubzImportAdmin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminImportacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') redirect('/admin')
  return <BallclubzImportAdmin />
}
