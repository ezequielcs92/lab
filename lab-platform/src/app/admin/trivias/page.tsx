import { createClient } from '@/lib/supabase/server'
import TriviasAdmin from '@/components/admin/TriviasAdmin'

export default async function AdminTriviasPage() {
  const supabase = await createClient()

  const { data: trivias } = await supabase
    .from('trivias')
    .select('*')
    .order('created_at', { ascending: false })

  return <TriviasAdmin trivias={trivias ?? []} />
}
