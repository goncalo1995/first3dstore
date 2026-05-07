'use client'

import { MessageCircle } from 'lucide-react'
import { WHATSAPP_NUMBER } from '@/data/constants'

interface WhatsAppButtonProps {
  message?: string
  className?: string
  variant?: 'floating' | 'inline' | 'full'
  label?: string
}

export function WhatsAppButton({ 
  message = 'Olá! Estou interessado nos vossos produtos de golfe.',
  className = '',
  variant = 'floating',
  label = 'Encomendar via WhatsApp'
}: WhatsAppButtonProps) {
  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`

  if (variant === 'floating') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BD5A] text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${className}`}
        aria-label="Contacte-nos no WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </a>
    )
  }

  if (variant === 'full') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 ${className}`}
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        {label}
      </a>
    )
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium py-3 px-6 rounded-lg transition-colors ${className}`}
    >
      <MessageCircle className="w-5 h-5 fill-current" />
      {label}
    </a>
  )
}
