import { createClient } from '@/lib/supabase/server'
import ClubesAdmin from '@/components/admin/ClubesAdmin'

export default async function AdminClubesPage() {
  const supabase = await createClient()

  const { data: clubes } = await supabase
    .from('clubes')
    .select('*')
    .order('nombre')

  return <ClubesAdmin clubes={clubes ?? []} />
}
