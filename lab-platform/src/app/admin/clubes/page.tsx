import { createClient } from '@/lib/supabase/server'
import ClubesAdmin from '@/components/admin/ClubesAdmin'

export default async function AdminClubesPage() {
  const supabase = await createClient()

  const [{ data: clubes }, { data: galeria }] = await Promise.all([
    supabase
      .from('clubes')
      .select('*')
      .order('nombre'),
    supabase
      .from('galeria_clubes')
      .select('*')
      .order('orden'),
  ])

  return <ClubesAdmin clubes={clubes ?? []} galeria={galeria ?? []} />
}
