import { useState } from 'react'
import { telechargerCartePostale } from '../lib/carteImage'

// Bouton « Télécharger ma carte postale » (image format story pour Instagram)
export default function BoutonCarte({ media, nomCampagne, className = 'tb-btn tb-btn--contour' }) {
  const [etat, setEtat] = useState('') // '' | 'encours' | 'erreur'

  async function lancer() {
    setEtat('encours')
    try {
      await telechargerCartePostale(media, nomCampagne)
      setEtat('')
    } catch (e) {
      console.error(e)
      setEtat('erreur')
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={lancer} disabled={etat === 'encours'}>
        {etat === 'encours' ? 'Préparation…' : 'Télécharger ma carte postale'}
      </button>
      {etat === 'erreur' && <span className="tb-erreur-courte" role="alert">Oups, réessaie dans un instant.</span>}
    </>
  )
}
