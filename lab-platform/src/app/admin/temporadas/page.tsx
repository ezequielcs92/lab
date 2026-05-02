import { createClient } from '@/lib/supabase/server'
import TemporadasAdmin from '@/components/admin/TemporadasAdmin'

export default async function AdminTemporadasPage() {
  const supabase = await createClient()

  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('*')
    .order('anio', { ascending: false })

  return <TemporadasAdmin temporadas={temporadas ?? []} />
}
