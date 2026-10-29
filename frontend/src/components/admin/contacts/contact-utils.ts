import type { Contacto } from '@/types/domain'
import { formatDate } from '@/lib/utils'

export const REPLY_SUBJECT = "Re: Tu consulta en Torneo 90'"

// Los programas de mail cortan los mailto muy largos: citamos hasta este largo
const MAX_QUOTE = 1500

// Primera línea con texto del mensaje, para la vista previa de la bandeja
export function firstLine(message: string) {
  return message.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''
}

export function shortDate(value: string) {
  return formatDate(value, "d 'de' MMM")
}

export function fullDate(value: string) {
  return formatDate(value, "EEEE d 'de' MMMM yyyy, HH:mm 'h'")
}

// Link para responder: abre el programa de mail con el destinatario, el asunto y la consulta citada
export function replyHref(contact: Contacto) {
  const original = contact.mensaje.length > MAX_QUOTE ? `${contact.mensaje.slice(0, MAX_QUOTE)}…` : contact.mensaje
  const quoted = original
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n')
  const body = `Hola ${contact.nombre},\n\n\n\n—\nEl ${fullDate(contact.creado_en)}, ${contact.nombre} <${contact.email}> escribió:\n${quoted}`
  return `mailto:${contact.email}?subject=${encodeURIComponent(REPLY_SUBJECT)}&body=${encodeURIComponent(body)}`
}
