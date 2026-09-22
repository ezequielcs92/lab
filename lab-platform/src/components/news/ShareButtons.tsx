'use client'

import { useState, useCallback } from 'react'
import { MessageCircle, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  url: string
  title: string
  description?: string | null
  className?: string
}

export default function ShareButtons({ url, title, description, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const shareLinks = [
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: 'facebook',
      color: 'hover:bg-[#1877F2]/15 hover:text-[#1877F2] hover:border-[#1877F2]/40',
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: 'x',
      color: 'hover:bg-lab-white/10 hover:text-lab-white hover:border-lab-white/30',
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: 'whatsapp',
      color: 'hover:bg-[#25D366]/15 hover:text-[#25D366] hover:border-[#25D366]/40',
    },
  ]

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  return (
    <aside className={className} aria-label="Compartir noticia">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-condensed text-xs tracking-widest uppercase text-lab-muted mr-1">
          Compartir
        </span>
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Compartir en ${link.name}`}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-lab-border bg-lab-surface text-lab-muted transition-all ${link.color}`}
          >
            {link.icon === 'facebook' && <span aria-hidden="true" className="font-bold text-base leading-none">f</span>}
            {link.icon === 'x' && <span aria-hidden="true" className="font-semibold text-sm leading-none">X</span>}
            {link.icon === 'whatsapp' && <MessageCircle aria-hidden="true" className="w-4 h-4" />}
          </a>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
          aria-live="polite"
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
            copied
              ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400'
              : 'bg-lab-surface border-lab-border text-lab-muted hover:text-lab-gold hover:border-lab-gold/40'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        </button>
      </div>
      {description && (
        <p className="sr-only" role="note">
          {description}
        </p>
      )}
    </aside>
  )
}
