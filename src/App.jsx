import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/contexte'
import CampagnesProvider from './components/CampagnesProvider'
import Nav from './components/Nav'
import AccesReserve from './pages/AccesReserve'
import Connexion from './pages/Connexion'
import Accueil from './pages/Accueil'
import Galerie from './pages/Galerie'
import Deposer from './pages/Deposer'
import Top5 from './pages/Top5'
import MonCarnet from './pages/MonCarnet'
import CommentCaMarche from './pages/CommentCaMarche'
import Admin from './pages/Admin'
import DonneesPersonnelles from './pages/DonneesPersonnelles'
import PiedDePage from './components/PiedDePage'

function Chargement() {
  return <div className="tb-page-centre"><p className="tb-muted">Chargement du carnet…</p></div>
}

// Toute la partie étudiante demande un compte (l'Espace RI a sa propre connexion)
function Protege({ children }) {
  const { user, chargement, aAcces } = useAuth()
  const location = useLocation()
  if (chargement) return <Chargement />
  if (!user) return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />
  // Connecté, mais pas sur la liste des étudiants en échange
  if (!aAcces) return <AccesReserve />
  return children
}

function MiseEnPage() {
  return (
    <CampagnesProvider>
      <div className="tb-app">
        <Nav />
        <main className="tb-main">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/deposer" element={<Deposer />} />
            <Route path="/top5" element={<Top5 />} />
            <Route path="/mon-carnet" element={<MonCarnet />} />
            <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <PiedDePage />
      </div>
    </CampagnesProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          {/* Accessible sans être connecté (obligation d'information RGPD) */}
          <Route path="/donnees-personnelles" element={<DonneesPersonnelles />} />
          {/* Espace RI : porte d'entrée séparée, réservée au staff (email + mot de passe) */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/*" element={<Protege><MiseEnPage /></Protege>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
