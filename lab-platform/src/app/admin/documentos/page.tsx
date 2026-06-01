import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentosAdmin from '@/components/admin/DocumentosAdmin'

export default async function AdminDocumentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') redirect('/admin')

  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .order('fecha_documento', { ascending: false })

  return <DocumentosAdmin documentos={documentos ?? []} />
}
