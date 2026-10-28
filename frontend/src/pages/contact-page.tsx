import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, MapPin, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendContact } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

const schema = z.object({
  nombre: z.string().min(2, 'Ingresá tu nombre.'),
  email: z.email('Ingresá un email válido.'),
  mensaje: z.string().min(10, 'La consulta debe tener al menos 10 caracteres.'),
})

type ContactValues = z.infer<typeof schema>

export function ContactPage() {
  const form = useForm<ContactValues>({ resolver: zodResolver(schema), defaultValues: { nombre: '', email: '', mensaje: '' } })
  const submit = form.handleSubmit(async (values) => {
    try {
      await sendContact(values)
      toast.success('Consulta enviada. Te responderemos por email.')
      form.reset()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="max-w-2xl"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Contacto</p><h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-6xl">Hablemos de fútbol</h1><p className="mt-3 text-sm leading-relaxed text-base-content/55">Escribinos por torneos, inscripciones o administración de equipos. El equipo organizador recibirá tu consulta y podrá responderte por email.</p></div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader><CardTitle>Enviá tu consulta</CardTitle><CardDescription>Completá los tres datos requeridos.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="contact-name">Nombre</Label><Input id="contact-name" placeholder="Tu nombre" {...form.register('nombre')} />{form.formState.errors.nombre && <p className="text-xs text-error">{form.formState.errors.nombre.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="contact-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-3.5 size-4 text-base-content/30" /><Input id="contact-email" type="email" className="pl-10" placeholder="tu@email.com" {...form.register('email')} /></div>{form.formState.errors.email && <p className="text-xs text-error">{form.formState.errors.email.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="contact-message">Mensaje</Label><Textarea id="contact-message" placeholder="Contanos en qué podemos ayudarte..." {...form.register('mensaje')} />{form.formState.errors.mensaje && <p className="text-xs text-error">{form.formState.errors.mensaje.message}</p>}</div>
              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Enviando...' : 'Enviar consulta'} <Send className="size-4" /></Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <iframe
            title="Mapa del Estadio Más Monumental"
            src="https://maps.google.com/maps?q=Estadio%20Mas%20Monumental%20Buenos%20Aires&t=&z=15&ie=UTF8&iwloc=&output=embed"
            className="h-[410px] w-full border-0 grayscale-[.1]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="flex flex-col gap-4 border-t border-base-content/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-5" /></span><div><h2 className="font-display text-xl font-bold uppercase">Estadio Más Monumental</h2><p className="text-xs text-base-content/45">Av. Pres. Figueroa Alcorta 7597, CABA</p></div></div>
            <Button asChild variant="outline" size="sm"><a href="https://www.google.com/maps/search/?api=1&query=Estadio+M%C3%A1s+Monumental+Buenos+Aires" target="_blank" rel="noreferrer">Cómo llegar</a></Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
