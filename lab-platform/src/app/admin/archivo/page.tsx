import { createClient } from '@/lib/supabase/server'
import ArchivoAdmin from '@/components/admin/ArchivoAdmin'

export default async function AdminArchivoPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('archivo_historico')
    .select('*')
    .order('fecha_hito', { ascending: false })

  return <ArchivoAdmin items={items ?? []} />
}
