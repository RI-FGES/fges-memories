import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth, nomDepuisEmail } from '../auth/contexte'
import { lireDerniereVisite, estNouveau } from '../lib/nouveautes'

function initiales(email) {
  const nom = nomDepuisEmail(email)
  const parts = nom.split(' ').filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

// Nombre de souvenirs publiés ou refusés depuis la dernière visite de « Mon carnet »
async function compterNouveautes(uid) {
  const snap = await getDocs(query(collection(db, 'medias'), where('uid', '==', uid)))
  const vu = lireDerniereVisite(uid)
  return snap.docs.filter(d => estNouveau(d.data(), vu)).length
}

export default function Nav() {
  const { user, isAdmin } = useAuth()
  const { pathname } = useLocation()
  const [nouveautes, setNouveautes] = useState(0)
  const classe = ({ isActive }) => `tb-nav__lien ${isActive ? 'is-actif' : ''}`
  const surCarnet = pathname.startsWith('/mon-carnet')

  // Vérifié à chaque changement de page (quelques lectures seulement : les dépôts de l'étudiant)
  useEffect(() => {
    if (!user?.uid || surCarnet) return
    let annule = false
    compterNouveautes(user.uid)
      .then(n => { if (!annule) setNouveautes(n) })
      .catch(() => {})
    return () => { annule = true }
  }, [user?.uid, pathname, surCarnet])

  const pastille = surCarnet ? 0 : nouveautes

  return (
    <header className="tb-nav">
      <Link to="/" className="tb-nav__logo">
        <span className="tb-nav__sceau">FGES</span>
        <span className="tb-nav__nom">Memories</span>
      </Link>
      <nav className="tb-nav__liens" aria-label="Navigation principale">
        <NavLink to="/" end className={classe}>Accueil</NavLink>
        <NavLink to="/galerie" className={classe}>Galerie</NavLink>
        <NavLink to="/top5" className={classe}>Lauréats</NavLink>
        <NavLink to="/comment-ca-marche" className={classe}>Comment ça marche</NavLink>
        {isAdmin && <NavLink to="/admin" className={classe}>Espace RI</NavLink>}
        <NavLink to="/deposer" className="tb-btn tb-btn--corail tb-btn--pilule">Déposer un souvenir</NavLink>
        <NavLink
          to="/mon-carnet"
          className="tb-nav__avatar"
          aria-label={pastille > 0 ? `Mon carnet : ${pastille} nouveauté${pastille > 1 ? 's' : ''}` : 'Mon carnet'}
          title="Mon carnet"
        >
          {initiales(user?.email)}
          {pastille > 0 && <span className="tb-pastille" aria-hidden="true">{pastille}</span>}
        </NavLink>
      </nav>
    </header>
  )
}
