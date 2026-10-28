import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { Brand } from '@/components/shared/brand'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.email('Ingresá un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

const registerSchema = z.object({
  nombre: z.string().min(2, 'Ingresá tu nombre.'),
  email: z.email('Ingresá un email válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

function AuthFrame({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  return (
    <div className="grid min-h-screen min-w-0 overflow-x-hidden bg-base-100 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hero-grid relative hidden overflow-hidden border-r border-base-content/10 lg:block">
        <div className="pitch-lines absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(53,244,110,.2),transparent_30%),linear-gradient(180deg,rgba(6,17,11,.2),rgba(6,17,11,.96))]" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Brand />
          <div className="max-w-xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Gestión de torneos</p><h1 className="mt-5 font-display text-7xl font-black uppercase leading-[0.88]">Organizá el juego.<br />Viví cada partido.</h1><p className="mt-6 text-base leading-7 text-base-content/55">Torneos, equipos, planteles y llaves en un solo lugar.</p></div>
          <p className="font-mono text-[0.6rem] uppercase tracking-widest text-base-content/30">Temporada 2026</p>
        </div>
      </section>
      <section className="grid min-w-0 place-items-center p-4 sm:p-10">
        <Card className="min-w-0 w-full max-w-md overflow-hidden border-base-content/12 bg-base-200/70">
          <CardHeader><CardTitle>{title}</CardTitle><CardDescription className="break-words">{description}</CardDescription></CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </section>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  useEffect(() => {
    if (session) navigate('/app/torneos', { replace: true })
  }, [navigate, session])

  const submit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      toast.error(error.message)
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    navigate(from || '/app/torneos', { replace: true })
  })

  return (
    <AuthFrame title="Volvé a la cancha" description={'Ingresá como administrador o usuario\u00a0general.'}>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-3.5 size-4 text-base-content/30" /><Input id="email" type="email" autoComplete="email" className="pl-10" placeholder="tu@email.com" {...form.register('email')} /></div>{form.formState.errors.email && <p className="text-xs text-error">{form.formState.errors.email.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><div className="relative"><LockKeyhole className="absolute left-3 top-3.5 size-4 text-base-content/30" /><Input id="password" type="password" autoComplete="current-password" className="pl-10" placeholder="••••••" {...form.register('password')} /></div>{form.formState.errors.password && <p className="text-xs text-error">{form.formState.errors.password.message}</p>}</div>
        <Button type="submit" className="w-full px-3 text-xs sm:px-5 sm:text-sm" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'} <ArrowRight className="size-4" /></Button>
      </form>
      <div className="mt-6 flex min-w-0 flex-col items-center gap-1 border-t border-base-content/10 pt-5 text-center text-xs leading-5 text-base-content/50"><span>¿No tenés cuenta?</span><Link className="max-w-full break-words font-bold text-primary hover:underline" to="/registro">Registrate como <span className="inline-block">usuario general</span></Link></div>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { nombre: '', email: '', password: '', confirmPassword: '' } })

  useEffect(() => {
    if (session) navigate('/app/torneos', { replace: true })
  }, [navigate, session])

  const submit = form.handleSubmit(async ({ nombre, email, password }) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { nombre } } })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Cuenta general creada correctamente')
    navigate('/app/mi-equipo')
  })

  return (
    <AuthFrame title="Registro general" description="Creá una cuenta para formar tu equipo e inscribirte.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="nombre">Nombre</Label><div className="relative"><UserRound className="absolute left-3 top-3.5 size-4 text-base-content/30" /><Input id="nombre" className="pl-10" placeholder="Tu nombre" {...form.register('nombre')} /></div>{form.formState.errors.nombre && <p className="text-xs text-error">{form.formState.errors.nombre.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="register-email">Email</Label><Input id="register-email" type="email" autoComplete="email" placeholder="tu@email.com" {...form.register('email')} />{form.formState.errors.email && <p className="text-xs text-error">{form.formState.errors.email.message}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="register-password">Contraseña</Label><Input id="register-password" type="password" autoComplete="new-password" {...form.register('password')} />{form.formState.errors.password && <p className="text-xs text-error">{form.formState.errors.password.message}</p>}</div><div className="space-y-2"><Label htmlFor="confirm-password">Repetir</Label><Input id="confirm-password" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />{form.formState.errors.confirmPassword && <p className="text-xs text-error">{form.formState.errors.confirmPassword.message}</p>}</div></div>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-base-content/55"><CheckCircle2 className="mr-2 inline size-4 text-primary" />Tu cuenta se crea con rol general. Solo un admin puede cambiar roles.</div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creando cuenta...' : 'Crear cuenta general'}</Button>
      </form>
      <div className="mt-5 text-center text-xs text-base-content/50">¿Ya tenés cuenta? <Link className="font-bold text-primary" to="/login">Ingresar</Link></div>
    </AuthFrame>
  )
}
