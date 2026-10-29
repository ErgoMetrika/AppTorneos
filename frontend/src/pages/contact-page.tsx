import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Mail, MapPin, Navigation, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { ContactStyles, CornerFlagScene, GoalCelebration } from '@/components/contact/contact-art'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PitchLines } from '@/components/visuals/art'
import { sendContact } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'

const schema = z.object({
  nombre: z.string().min(2, 'Ingresá tu nombre.'),
  email: z.email('Ingresá un email válido.'),
  mensaje: z.string().min(10, 'La consulta debe tener al menos 10 caracteres.'),
})

type ContactValues = z.infer<typeof schema>

const CARD = 'rounded-2xl border border-base-content/10 bg-[linear-gradient(180deg,rgba(16,39,26,.9),rgba(11,27,18,.95))] shadow-[0_16px_40px_rgba(0,0,0,0.4)]'

// embedded: se muestra dentro del panel (sin el margen del sitio público)
export function ContactPage({ embedded = false }: { embedded?: boolean }) {
  const form = useForm<ContactValues>({ resolver: zodResolver(schema), defaultValues: { nombre: '', email: '', mensaje: '' } })
  // Después de un envío exitoso se muestra el festejo en lugar del formulario
  const [sent, setSent] = useState(false)
  const { errors, isSubmitting } = form.formState
  const submit = form.handleSubmit(async (values) => {
    try {
      await sendContact(values)
      toast.success('Consulta enviada. Te responderemos por email.')
      form.reset()
      setSent(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <div className={embedded ? '' : 'container-shell py-12 sm:py-16'}>
      <ContactStyles />

      {/* Portada */}
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_12%_50%,rgba(53,244,110,.18),transparent_40%),linear-gradient(120deg,rgba(53,244,110,.08),rgba(11,27,18,.95)_58%)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:flex-row sm:items-center sm:justify-between md:p-8">
        <PitchLines className="absolute -right-16 -top-6 hidden h-[340px] w-[520px] opacity-[0.12] md:block" />
        <div className="relative max-w-xl">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Contacto</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.95] sm:text-6xl">Hablemos de fútbol</h1>
          <p className="mt-3 text-sm leading-relaxed text-base-content/75">Escribinos por torneos, inscripciones o administración de equipos. El equipo organizador recibirá tu consulta y podrá responderte por email.</p>
          <ul className="mt-5 flex flex-wrap gap-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.1em] text-base-content/80">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100/60 px-3 py-1.5"><Mail className="size-3.5 text-primary" aria-hidden="true" />Respuesta por email</li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100/60 px-3 py-1.5"><Clock className="size-3.5 text-primary" aria-hidden="true" />Torneos · Equipos · Inscripciones</li>
          </ul>
        </div>
        <CornerFlagScene className="relative mx-auto h-36 w-44 shrink-0 sm:mx-0 sm:h-44 sm:w-56" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Formulario */}
        <section className={cn(CARD, 'relative overflow-hidden p-6 sm:p-7')} aria-labelledby="contact-form-title">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#35f46e,rgba(53,244,110,0))]" />
          {sent ? (
            <div role="status" aria-live="polite" className="flex min-h-[380px] flex-col items-center justify-center gap-5 text-center">
              <GoalCelebration />
              <div className="t90-aparece">
                <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Golazo</p>
                <h2 id="contact-form-title" className="mt-1 font-display text-4xl font-black uppercase">¡Mensaje enviado!</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-base-content/75">Recibimos tu consulta. Te vamos a responder al email que nos dejaste.</p>
                <Button className="mt-5" variant="outline" type="button" onClick={() => setSent(false)}>Enviar otra consulta</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25" aria-hidden="true"><Send className="size-5" /></span>
                <div>
                  <h2 id="contact-form-title" className="font-display text-2xl font-bold uppercase tracking-tight">Enviá tu consulta</h2>
                  <p className="text-sm text-base-content/70">Completá los tres datos requeridos.</p>
                </div>
              </div>
              <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Nombre</Label>
                  <Input id="contact-name" placeholder="Tu nombre" autoComplete="name" aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? 'contact-name-error' : undefined} {...form.register('nombre')} />
                  {errors.nombre && <p id="contact-name-error" className="text-xs text-error">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-base-content/40" aria-hidden="true" />
                    <Input id="contact-email" type="email" className="pl-10" placeholder="tu@email.com" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'contact-email-error' : undefined} {...form.register('email')} />
                  </div>
                  {errors.email && <p id="contact-email-error" className="text-xs text-error">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Mensaje</Label>
                  <Textarea id="contact-message" placeholder="Contanos en qué podemos ayudarte..." aria-invalid={!!errors.mensaje} aria-describedby={errors.mensaje ? 'contact-message-error' : undefined} {...form.register('mensaje')} />
                  {errors.mensaje && <p id="contact-message-error" className="text-xs text-error">{errors.mensaje.message}</p>}
                </div>
                <Button className="w-full shadow-[0_8px_24px_rgba(53,244,110,0.25)]" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar consulta'} <Send className="size-4" /></Button>
              </form>
            </>
          )}
        </section>

        {/* Estadio y mapa */}
        <section className={cn(CARD, 'flex flex-col overflow-hidden p-3 sm:p-4')} aria-labelledby="contact-stadium-title">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-base-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]">
            <iframe
              title="Mapa del Estadio Más Monumental"
              src="https://maps.google.com/maps?q=Estadio%20Mas%20Monumental%20Buenos%20Aires&t=&z=15&ie=UTF8&iwloc=&output=embed"
              // Mapa real de Google pasado a modo oscuro: se invierten los colores y se giran
              // los tonos para que el fondo quede oscuro y el agua/parques sigan reconocibles
              className="block h-[300px] w-full border-0 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.55)_brightness(0.92)_contrast(0.95)] sm:h-[380px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {/* Etiqueta sobre el mapa (no bloquea los clics) */}
            <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-[#06110b]/90 px-3 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#f4f8f5] shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />Sede del torneo
            </div>
            {/* Tinte verde suave encima del mapa oscuro, para que combine con la paleta */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#35f46e]/10 mix-blend-soft-light" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_40px_rgba(6,17,11,0.55)]" />
          </div>
          <div className="flex flex-col gap-4 px-2 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25" aria-hidden="true"><MapPin className="size-5" /></span>
              <div>
                <h2 id="contact-stadium-title" className="font-display text-xl font-bold uppercase">Estadio Más Monumental</h2>
                <p className="text-xs text-base-content/70">Av. Pres. Figueroa Alcorta 7597, CABA</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm"><a href="https://www.google.com/maps/search/?api=1&query=Estadio+M%C3%A1s+Monumental+Buenos+Aires" target="_blank" rel="noreferrer"><Navigation className="size-4" aria-hidden="true" />Cómo llegar</a></Button>
          </div>
        </section>
      </div>
    </div>
  )
}
