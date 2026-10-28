import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { PublicLayout } from '@/components/layout/public-layout'
import { AdminRoute, ProtectedRoute } from '@/components/layout/route-guards'
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
const LoginPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.RegisterPage })))

export default function App() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState label="Cargando vista" /></div>}>
      <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="contacto" element={<ContactPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="torneos" element={<TournamentsPage />} />
          <Route path="torneos/:id" element={<TournamentDetailPage />} />
          <Route path="equipos" element={<TeamsPage />} />
          <Route path="equipos/:id" element={<TeamDetailPage />} />
        </Route>
      </Route>

      <Route path="login" element={<LoginPage />} />
      <Route path="registro" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="app" element={<AppLayout />}>
          <Route index element={<TournamentsPage />} />
          <Route path="torneos" element={<TournamentsPage />} />
          <Route path="torneos/:id" element={<TournamentDetailPage />} />
          <Route path="equipos" element={<TeamsPage />} />
          <Route path="equipos/:id" element={<TeamDetailPage />} />
          <Route path="jugadores" element={<PlayersPage />} />
          <Route path="jugadores/:id" element={<PlayerDetailPage />} />
          <Route path="mi-equipo" element={<MyTeamPage />} />
          <Route element={<AdminRoute />}>
            <Route path="admin/torneos/nuevo" element={<AdminCreateTournamentPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
