import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { CampagnesContext, choisirCampagneActive, trierCampagnes } from '../lib/campagnes'

async function lireCampagnes() {
  const snap = await getDocs(collection(db, 'campagnes'))
  return trierCampagnes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

export default function CampagnesProvider({ children }) {
  const [campagnes, setCampagnes] = useState([])
  const [chargement, setChargement] = useState(true)

  const recharger = useCallback(() => lireCampagnes()
    .then(setCampagnes)
    .catch(e => console.error('Chargement des campagnes impossible', e))
    .finally(() => setChargement(false)), [])

  useEffect(() => {
    lireCampagnes()
      .then(setCampagnes)
      .catch(e => console.error('Chargement des campagnes impossible', e))
      .finally(() => setChargement(false))
  }, [])

  const valeur = {
    campagnes,
    active: choisirCampagneActive(campagnes),
    chargement,
    recharger,
  }
  return <CampagnesContext.Provider value={valeur}>{children}</CampagnesContext.Provider>
}
