import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { TextesContext, TEXTES_DEFAUT, valeurTexte, refTextes } from '../lib/textes'

async function lireTextes() {
  const snap = await getDoc(refTextes())
  return snap.exists() ? snap.data() : {}
}

export default function TextesProvider({ children }) {
  const [modifies, setModifies] = useState({})

  useEffect(() => {
    lireTextes()
      .then(setModifies)
      .catch(e => console.warn('Textes personnalisés indisponibles, textes d’origine affichés', e))
  }, [])

  const recharger = useCallback(() => lireTextes().then(setModifies).catch(console.error), [])

  const valeur = useMemo(() => ({
    // textes affichés : modifiés si présents, sinon ceux d'origine
    textes: Object.fromEntries(Object.keys(TEXTES_DEFAUT).map(cle => [cle, valeurTexte(modifies, cle)])),
    modifies,
    recharger,
  }), [modifies, recharger])

  return <TextesContext.Provider value={valeur}>{children}</TextesContext.Provider>
}
