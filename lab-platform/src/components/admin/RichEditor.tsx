'use client'

import { Editor } from '@tinymce/tinymce-react'

const TINYMCE_API_KEY = process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? ''

interface Props {
  value: string
  onChange: (val: string) => void
  height?: number
  placeholder?: string
}

export default function RichEditor({ value, onChange, height = 280 }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-lab-border">
      <Editor
        apiKey={TINYMCE_API_KEY}
        value={value}
        onEditorChange={onChange}
        init={{
          height,
          menubar: 'edit insert format table tools',
          skin: 'oxide-dark',
          content_css: 'dark',
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'charmap',
            'searchreplace',
            'wordcount',
            'table',
            'code',
            'visualblocks',
            'fullscreen',
          ],
          toolbar:
            'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link unlink table | removeformat code fullscreen',
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 14px;
              line-height: 1.6;
              margin: 12px;
            }
          `,
          branding: false,
          promotion: false,
          statusbar: false,
        }}
      />
    </div>
  )
}
