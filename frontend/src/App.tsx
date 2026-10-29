import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { PublicLayout } from '@/components/layout/public-layout'
import { AdminRoute, AppIndex, GuestOnly, ProtectedRoute, RedirectToApp } from '@/components/layout/route-guards'
import { LoadingState } from '@/components/shared/states'

const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })))
const TournamentsPage = lazy(() => import('@/pages/tournaments-page').then((module) => ({ default: module.TournamentsPage })))
const TournamentDetailPage = lazy(() => import('@/pages/tournament-detail-page').then((module) => ({ default: module.TournamentDetailPage })))
const TeamsPage = lazy(() => import('@/pages/teams-page').then((module) => ({ default: module.TeamsPage })))
const TeamDetailPage = lazy(() => import('@/pages/team-detail-page').then((module) => ({ default: module.TeamDetailPage })))
const PlayersPage = lazy(() => import('@/pages/players-page').then((module) => ({ default: module.PlayersPage })))
const PlayerDetailPage = lazy(() => import('@/pages/player-detail-page').then((module) => ({ default: module.PlayerDetailPage })))
const ContactPage = lazy(() => import('@/pages/contact-page').then((module) => ({ default: module.ContactPage })))
const MyTeamPage = lazy(() => import('@/pages/my-team-page').then((module) => ({ default: module.MyTeamPage })))
const AdminCreateTournamentPage = lazy(() => import('@/pages/admin-create-tournament-page').then((module) => ({ default: module.AdminCreateTournamentPage })))
const AdminHomePage = lazy(() => import('@/pages/admin-home-page').then((module) => ({ default: module.AdminHomePage })))
const AdminTournamentsPage = lazy(() => import('@/pages/admin-tournaments-page').then((module) => ({ default: module.AdminTournamentsPage })))
const AdminResultsPage = lazy(() => import('@/pages/admin-results-page').then((module) => ({ default: module.AdminResultsPage })))
const AdminContactsPage = lazy(() => import('@/pages/admin-contacts-page').then((module) => ({ default: module.AdminContactsPage })))
const LoginPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.RegisterPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })))

export default function App() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState label="Cargando vista" /></div>}>
      <Routes>
      {/* Sitio público: solo para visitantes. Con sesión iniciada se navega por el panel. */}
      <Route element={<PublicLayout />}>
        <Route index element={<GuestOnly to="/app"><HomePage /></GuestOnly>} />
        <Route path="contacto" element={<GuestOnly to="/app/contacto"><ContactPage /></GuestOnly>} />
      </Route>

      {/* Torneos y equipos viven en el panel; las direcciones viejas redirigen ahí */}
      <Route path="torneos/*" element={<RedirectToApp />} />
      <Route path="equipos/*" element={<RedirectToApp />} />

      <Route path="login" element={<LoginPage />} />
      <Route path="registro" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="app" element={<AppLayout />}>
          {/* Inicio del panel: el admin va a su inicio; el jugador, a Torneos */}
          <Route index element={<AppIndex player={<TournamentsPage />} />} />
          <Route path="torneos" element={<TournamentsPage />} />
          <Route path="torneos/:id" element={<TournamentDetailPage />} />
          <Route path="equipos" element={<TeamsPage />} />
          <Route path="equipos/:id" element={<TeamDetailPage />} />
          <Route path="jugadores" element={<PlayersPage />} />
          <Route path="jugadores/:id" element={<PlayerDetailPage />} />
          <Route path="mi-equipo" element={<MyTeamPage />} />
          <Route path="contacto" element={<ContactPage embedded />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminHomePage />} />
            <Route path="admin/torneos" element={<AdminTournamentsPage />} />
            <Route path="admin/torneos/nuevo" element={<AdminCreateTournamentPage />} />
            <Route path="admin/resultados" element={<AdminResultsPage />} />
            <Route path="admin/consultas" element={<AdminContactsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
