'use client'

import { Editor } from '@tinymce/tinymce-react'

const TINYMCE_API_KEY = 'vw1ypnbl6ql8xs11n5r66qpu9057j3z65jcc2xfufsx3auq7'

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
          menubar: false,
          skin: 'oxide-dark',
          content_css: 'dark',
          plugins: ['advlist', 'autolink', 'lists', 'link', 'charmap', 'searchreplace', 'wordcount'],
          toolbar:
            'bold italic underline | bullist numlist | link | removeformat',
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
